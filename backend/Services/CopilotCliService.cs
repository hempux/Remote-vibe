using System.Text.Json;
using RemoteVibe.Backend.DTOs;
using RemoteVibe.Backend.Models;
using Microsoft.AspNetCore.SignalR;
using RemoteVibe.Backend.Hubs;

namespace RemoteVibe.Backend.Services;

public class CopilotCliService : ICopilotCliService
{
    private readonly ILogger<CopilotCliService> _logger;
    private readonly ISessionManager _sessionManager;
    private readonly IHubContext<CopilotHub> _hubContext;
    private readonly HttpClient _httpClient;
    private readonly string _vscodeServerUrl;
    private readonly string _authToken;
    private readonly JsonSerializerOptions _jsonOptions;

    public CopilotCliService(
        ILogger<CopilotCliService> logger,
        ISessionManager sessionManager,
        IHubContext<CopilotHub> hubContext,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _logger = logger;
        _sessionManager = sessionManager;
        _hubContext = hubContext;
        _httpClient = httpClientFactory.CreateClient();
        _vscodeServerUrl = configuration["VscodeServerUrl"] ?? "http://vscode-server:5000";
        _authToken = configuration["VscodeServerAuthToken"] ?? "remote-vibe-internal-token";
        _jsonOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
    }

    public async Task<string> StartSessionAsync(string sessionId, string repositoryPath, CancellationToken ct = default)
    {
        try
        {
            _logger.LogInformation("Proxying session start to VS Code Server at {Url}", _vscodeServerUrl);

            var requestBody = new { sessionId, repositoryPath };
            var requestMessage = new HttpRequestMessage(HttpMethod.Post, $"{_vscodeServerUrl}/extension/session/start")
            {
                Content = JsonContent.Create(requestBody)
            };
            requestMessage.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _authToken);

            var response = await _httpClient.SendAsync(requestMessage, ct);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("VS Code Server returned {StatusCode}: {Error}", response.StatusCode, errorContent);
                throw new InvalidOperationException($"VS Code Server returned {response.StatusCode}: {errorContent}");
            }

            _logger.LogInformation("VS Code Server started session {SessionId} successfully", sessionId);
            return sessionId;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start session via VS Code Server for session {SessionId}", sessionId);
            throw;
        }
    }

    public async Task<VsCodeCommandResponse> SendCommandAsync(string sessionId, string command, CancellationToken ct = default)
    {
        try
        {
            _logger.LogInformation("Proxying command to VS Code Server for session {SessionId}: {Command}", sessionId, command);

            var requestBody = new { sessionId, command, context = new { } };
            var requestMessage = new HttpRequestMessage(HttpMethod.Post, $"{_vscodeServerUrl}/extension/command")
            {
                Content = JsonContent.Create(requestBody)
            };
            requestMessage.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _authToken);

            var response = await _httpClient.SendAsync(requestMessage, ct);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("VS Code Server returned {StatusCode}: {Error}", response.StatusCode, errorContent);
                throw new InvalidOperationException($"VS Code Server returned {response.StatusCode}: {errorContent}");
            }

            var result = await response.Content.ReadFromJsonAsync<VsCodeCommandResponse>(_jsonOptions, ct);
            _logger.LogInformation("Command response: {MessageCount} messages, {QuestionCount} questions, statusChange={StatusChange}",
                result?.Messages?.Count ?? 0, result?.Questions?.Count ?? 0, result?.StatusChange);

            return result ?? new VsCodeCommandResponse { Success = true };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send command via VS Code Server for session {SessionId}", sessionId);
            throw;
        }
    }

    public async Task<VsCodeCommandResponse> SendResponseAsync(string sessionId, string questionId, string response, CancellationToken ct = default)
    {
        try
        {
            _logger.LogInformation("Proxying response to VS Code Server for session {SessionId}, question {QuestionId}", sessionId, questionId);

            var requestBody = new { sessionId, questionId, response };
            var requestMessage = new HttpRequestMessage(HttpMethod.Post, $"{_vscodeServerUrl}/extension/respond")
            {
                Content = JsonContent.Create(requestBody)
            };
            requestMessage.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _authToken);

            var httpResponse = await _httpClient.SendAsync(requestMessage, ct);

            if (!httpResponse.IsSuccessStatusCode)
            {
                var errorContent = await httpResponse.Content.ReadAsStringAsync(ct);
                _logger.LogError("VS Code Server returned {StatusCode}: {Error}", httpResponse.StatusCode, errorContent);
                throw new InvalidOperationException($"VS Code Server returned {httpResponse.StatusCode}: {errorContent}");
            }

            var result = await httpResponse.Content.ReadFromJsonAsync<VsCodeCommandResponse>(_jsonOptions, ct);
            _logger.LogInformation("Response result: {MessageCount} messages, {QuestionCount} questions, statusChange={StatusChange}",
                result?.Messages?.Count ?? 0, result?.Questions?.Count ?? 0, result?.StatusChange);

            return result ?? new VsCodeCommandResponse { Success = true };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send response via VS Code Server for session {SessionId}", sessionId);
            throw;
        }
    }

    public async Task StopSessionAsync(string sessionId, CancellationToken ct = default)
    {
        try
        {
            _logger.LogInformation("Proxying session stop to VS Code Server for session {SessionId}", sessionId);

            var requestMessage = new HttpRequestMessage(HttpMethod.Delete, $"{_vscodeServerUrl}/extension/session/{sessionId}");
            requestMessage.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _authToken);

            var response = await _httpClient.SendAsync(requestMessage, ct);

            if (!response.IsSuccessStatusCode && response.StatusCode != System.Net.HttpStatusCode.NotFound)
            {
                var errorContent = await response.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("VS Code Server returned {StatusCode} when stopping session: {Error}",
                    response.StatusCode, errorContent);
            }

            _logger.LogInformation("Session {SessionId} stop request sent to VS Code Server", sessionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to stop session via VS Code Server for session {SessionId}", sessionId);
            throw;
        }
    }

    public bool IsSessionActive(string sessionId)
    {
        var session = _sessionManager.GetSessionAsync(sessionId).GetAwaiter().GetResult();
        return session != null && session.Status != SessionStatus.Completed && session.Status != SessionStatus.Error;
    }
}
