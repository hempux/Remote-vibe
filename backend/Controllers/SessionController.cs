using Microsoft.AspNetCore.Mvc;
using RemoteVibe.Backend.DTOs;
using RemoteVibe.Backend.Models;
using RemoteVibe.Backend.Services;
using Microsoft.AspNetCore.SignalR;
using RemoteVibe.Backend.Hubs;

namespace RemoteVibe.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SessionController : ControllerBase
{
    private readonly ILogger<SessionController> _logger;
    private readonly ISessionManager _sessionManager;
    private readonly ICopilotCliService _copilotCliService;
    private readonly INotificationService _notificationService;
    private readonly IHubContext<CopilotHub> _hubContext;

    public SessionController(
        ILogger<SessionController> logger,
        ISessionManager sessionManager,
        ICopilotCliService copilotCliService,
        INotificationService notificationService,
        IHubContext<CopilotHub> hubContext)
    {
        _logger = logger;
        _sessionManager = sessionManager;
        _copilotCliService = copilotCliService;
        _notificationService = notificationService;
        _hubContext = hubContext;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SessionStatusResponse>>> GetAllSessions(CancellationToken ct)
    {
        try
        {
            var sessions = await _sessionManager.GetAllSessionsAsync(ct);
            var responses = sessions.Select(MapToStatusResponse);
            return Ok(responses);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get all sessions");
            return StatusCode(500, "Failed to get sessions");
        }
    }

    [HttpPost("start")]
    public async Task<ActionResult<SessionStatusResponse>> StartSession([FromBody] StartSessionRequest request, CancellationToken ct)
    {
        try
        {
            _logger.LogInformation("Starting session for repository: {Owner}/{Name}", request.RepositoryOwner, request.RepositoryName);

            if (string.IsNullOrWhiteSpace(request.RepositoryOwner) || string.IsNullOrWhiteSpace(request.RepositoryName))
            {
                _logger.LogWarning("Repository owner or name is empty");
                return BadRequest("Repository owner and name are required");
            }

            var session = await _sessionManager.StartSessionAsync(
                request.RepositoryOwner, request.RepositoryName, request.TaskDescription, ct);
            _logger.LogInformation("Session {SessionId} created", session.Id);

            var repositoryPath = $"{request.RepositoryOwner}/{request.RepositoryName}";
            await _copilotCliService.StartSessionAsync(session.Id, repositoryPath, ct);

            var response = MapToStatusResponse(session);

            await _notificationService.SendNotificationAsync(session.Id, new Notification
            {
                Type = NotificationType.SessionStarted,
                Title = "Session Started",
                Message = $"Session started for {repositoryPath}",
                Priority = NotificationPriority.Low
            }, ct);

            await BroadcastSessionStatus(session, ct);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start session");
            return StatusCode(500, "Failed to start session");
        }
    }

    [HttpPost("{id}/command")]
    public async Task<ActionResult> SendCommand(string id, [FromBody] SendCommandRequest request, CancellationToken ct)
    {
        try
        {
            _logger.LogInformation("Sending command to session {SessionId}: {Command}", id, request.Command);

            var session = await _sessionManager.GetSessionAsync(id, ct);
            if (session == null)
            {
                _logger.LogWarning("Session {SessionId} not found", id);
                return NotFound("Session not found");
            }

            if (string.IsNullOrWhiteSpace(request.Command))
            {
                _logger.LogWarning("Command is empty for session {SessionId}", id);
                return BadRequest("Command is required");
            }

            // Store user's command as a message
            var userMessage = new ConversationMessage
            {
                Type = MessageType.UserCommand,
                Content = request.Command
            };
            await _sessionManager.AddMessageAsync(id, userMessage, ct);
            await BroadcastMessage(id, userMessage, ct);

            // Update status to processing
            await _sessionManager.UpdateSessionStatusAsync(id, SessionStatus.Processing, ct);
            session = await _sessionManager.GetSessionAsync(id, ct);
            await BroadcastSessionStatus(session!, ct);

            // Send to standalone server and get rich response
            var vsResponse = await _copilotCliService.SendCommandAsync(id, request.Command, ct);

            // Process the rich response
            await ProcessVsCodeResponse(id, vsResponse, ct);

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send command to session {SessionId}", id);
            return StatusCode(500, "Failed to send command");
        }
    }

    [HttpPost("{id}/respond")]
    public async Task<ActionResult> RespondToQuestion(string id, [FromBody] RespondToQuestionRequest request, CancellationToken ct)
    {
        try
        {
            var session = await _sessionManager.GetSessionAsync(id, ct);
            if (session == null)
            {
                return NotFound("Session not found");
            }

            var question = await _sessionManager.GetPendingQuestionAsync(id, request.QuestionId, ct);
            if (question == null)
            {
                return NotFound("Question not found");
            }

            // Remove the answered question
            await _sessionManager.RemovePendingQuestionAsync(id, request.QuestionId, ct);

            // Store user's answer as a message with the original question for context
            // Format: "Q: {question}\n\nA: {answer}"
            // Note: This format is parsed by the mobile app's ChatBubble component
            var userMessage = new ConversationMessage
            {
                Type = MessageType.UserCommand,
                Content = $"Q: {question.Question}\n\nA: {request.Response}"
            };
            await _sessionManager.AddMessageAsync(id, userMessage, ct);
            await BroadcastMessage(id, userMessage, ct);

            // Send to standalone server and get rich response
            var vsResponse = await _copilotCliService.SendResponseAsync(id, request.QuestionId, request.Response, ct);

            // Process the rich response
            await ProcessVsCodeResponse(id, vsResponse, ct);

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to respond to question in session {SessionId}", id);
            return StatusCode(500, "Failed to respond to question");
        }
    }

    [HttpGet("{id}/status")]
    public async Task<ActionResult<SessionStatusResponse>> GetStatus(string id, CancellationToken ct)
    {
        try
        {
            var session = await _sessionManager.GetSessionAsync(id, ct);
            if (session == null)
            {
                return NotFound("Session not found");
            }

            var response = MapToStatusResponse(session);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get status for session {SessionId}", id);
            return StatusCode(500, "Failed to get session status");
        }
    }

    [HttpGet("{id}/history")]
    public async Task<ActionResult<IEnumerable<object>>> GetHistory(string id, CancellationToken ct)
    {
        try
        {
            var session = await _sessionManager.GetSessionAsync(id, ct);
            if (session == null)
            {
                return NotFound("Session not found");
            }

            var messages = session.History.Select(m => new
            {
                id = m.Id,
                sessionId = id,
                role = m.Type switch
                {
                    MessageType.UserCommand => "User",
                    MessageType.CopilotResponse => "Assistant",
                    MessageType.SystemInfo => "System",
                    MessageType.Error => "System",
                    _ => "System"
                },
                content = m.Content,
                timestamp = m.Timestamp,
                metadata = (object?)null
            });

            return Ok(messages);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get history for session {SessionId}", id);
            return StatusCode(500, "Failed to get session history");
        }
    }

    [HttpGet("{id}/questions")]
    public async Task<ActionResult<IEnumerable<object>>> GetPendingQuestions(string id, CancellationToken ct)
    {
        try
        {
            var session = await _sessionManager.GetSessionAsync(id, ct);
            if (session == null)
            {
                return NotFound("Session not found");
            }

            var questions = session.PendingQuestions.Select(q => new
            {
                id = q.Id,
                sessionId = id,
                question = q.Question,
                questionType = q.Type.ToString(),
                options = q.Options,
                timestamp = q.AskedAt
            });

            return Ok(questions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get pending questions for session {SessionId}", id);
            return StatusCode(500, "Failed to get pending questions");
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> StopSession(string id, CancellationToken ct)
    {
        try
        {
            var session = await _sessionManager.GetSessionAsync(id, ct);
            if (session == null)
            {
                return NotFound("Session not found");
            }

            await _copilotCliService.StopSessionAsync(id, ct);
            await _sessionManager.StopSessionAsync(id, ct);

            await _notificationService.SendNotificationAsync(id, new Notification
            {
                Type = NotificationType.SessionStopped,
                Title = "Session Stopped",
                Message = "Session has been stopped",
                Priority = NotificationPriority.Low
            }, ct);

            await BroadcastSessionStatus(session, ct);

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to stop session {SessionId}", id);
            return StatusCode(500, "Failed to stop session");
        }
    }

    private async Task ProcessVsCodeResponse(string sessionId, VsCodeCommandResponse vsResponse, CancellationToken ct)
    {
        if (vsResponse.Messages != null)
        {
            foreach (var msg in vsResponse.Messages)
            {
                var messageType = msg.Role?.ToLowerInvariant() switch
                {
                    "assistant" => MessageType.CopilotResponse,
                    "system" => MessageType.SystemInfo,
                    _ => MessageType.CopilotResponse
                };

                var message = new ConversationMessage
                {
                    Type = messageType,
                    Content = msg.Content
                };

                await _sessionManager.AddMessageAsync(sessionId, message, ct);
                await BroadcastMessage(sessionId, message, ct);
            }
        }

        if (vsResponse.Questions != null)
        {
            foreach (var q in vsResponse.Questions)
            {
                var questionType = q.Type?.ToLowerInvariant() switch
                {
                    "yesno" => QuestionType.YesNo,
                    "multiplechoice" => QuestionType.MultipleChoice,
                    "freetext" => QuestionType.FreeText,
                    _ => QuestionType.FreeText
                };

                var pendingQuestion = await _sessionManager.AddPendingQuestionAsync(
                    sessionId, q.Question, questionType, q.Options, ct);

                if (pendingQuestion != null)
                {
                    await BroadcastQuestion(sessionId, pendingQuestion, ct);
                }
            }
        }

        if (!string.IsNullOrEmpty(vsResponse.StatusChange))
        {
            var status = vsResponse.StatusChange switch
            {
                "WaitingForInput" => SessionStatus.WaitingForInput,
                "Processing" => SessionStatus.Processing,
                "Completed" => SessionStatus.Completed,
                "Error" => SessionStatus.Error,
                _ => (SessionStatus?)null
            };

            if (status.HasValue)
            {
                await _sessionManager.UpdateSessionStatusAsync(sessionId, status.Value, ct);
                var session = await _sessionManager.GetSessionAsync(sessionId, ct);
                if (session != null)
                {
                    await BroadcastSessionStatus(session, ct);
                }
            }
        }
    }

    private async Task BroadcastMessage(string sessionId, ConversationMessage message, CancellationToken ct)
    {
        var role = message.Type switch
        {
            MessageType.UserCommand => "User",
            MessageType.CopilotResponse => "Assistant",
            MessageType.SystemInfo => "System",
            MessageType.Error => "System",
            _ => "System"
        };

        var payload = new
        {
            id = message.Id,
            sessionId,
            role,
            content = message.Content,
            timestamp = message.Timestamp,
            metadata = (object?)null
        };

        await _hubContext.Clients.Group(sessionId).SendAsync("OnMessageReceived", payload, ct);
    }

    private async Task BroadcastQuestion(string sessionId, PendingQuestion question, CancellationToken ct)
    {
        var payload = new
        {
            id = question.Id,
            sessionId,
            question = question.Question,
            questionType = question.Type.ToString(),
            options = question.Options,
            timestamp = question.AskedAt
        };

        await _hubContext.Clients.Group(sessionId).SendAsync("OnQuestionPending", payload, ct);
    }

    private async Task BroadcastSessionStatus(Session session, CancellationToken ct)
    {
        var payload = new
        {
            sessionId = session.Id,
            repositoryOwner = session.RepositoryOwner,
            repositoryName = session.RepositoryName,
            repositoryPath = session.RepositoryPath,
            taskDescription = session.TaskDescription,
            status = session.Status.ToString(),
            startedAt = session.StartedAt,
            lastActivityAt = session.LastActivityAt,
            currentCommand = session.CurrentCommand
        };

        await _hubContext.Clients.Group(session.Id).SendAsync("OnSessionStatusChanged", payload, ct);
    }

    private static SessionStatusResponse MapToStatusResponse(Session session)
    {
        return new SessionStatusResponse
        {
            SessionId = session.Id,
            RepositoryOwner = session.RepositoryOwner,
            RepositoryName = session.RepositoryName,
            TaskDescription = session.TaskDescription,
            Status = session.Status.ToString(),
            StartedAt = session.StartedAt,
            LastActivityAt = session.LastActivityAt,
            MessageCount = session.History.Count,
            PendingQuestionCount = session.PendingQuestions.Count
        };
    }
}
