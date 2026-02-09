using RemoteVibe.Backend.Models;

namespace RemoteVibe.Backend.Services;

public class SessionManager : ISessionManager
{
    private readonly Dictionary<string, Session> _sessions = new();
    private readonly SemaphoreSlim _lock = new(1, 1);
    private readonly ILogger<SessionManager> _logger;

    public SessionManager(ILogger<SessionManager> logger)
    {
        _logger = logger;
    }

    public async Task<Session> StartSessionAsync(string repositoryOwner, string repositoryName, string? taskDescription = null, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var repoPath = $"{repositoryOwner}/{repositoryName}";
            var session = new Session
            {
                RepositoryOwner = repositoryOwner,
                RepositoryName = repositoryName,
                RepositoryPath = repoPath,
                TaskDescription = taskDescription,
                Status = SessionStatus.Idle,
                StartedAt = DateTime.UtcNow
            };

            _sessions[session.Id] = session;
            _logger.LogInformation("Started session {SessionId} for repository {RepositoryOwner}/{RepositoryName}",
                session.Id, repositoryOwner, repositoryName);

            return session;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<Session?> GetCurrentSessionAsync(CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            return _sessions.Values
                .OrderByDescending(s => s.StartedAt)
                .FirstOrDefault(s => s.Status != SessionStatus.Completed && s.Status != SessionStatus.Error);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<IEnumerable<Session>> GetAllSessionsAsync(CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            return _sessions.Values.OrderByDescending(s => s.StartedAt).ToList();
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<Session?> GetSessionAsync(string sessionId, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            return _sessions.TryGetValue(sessionId, out var session) ? session : null;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task UpdateSessionStatusAsync(string sessionId, SessionStatus status, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            if (_sessions.TryGetValue(sessionId, out var session))
            {
                session.Status = status;
                session.LastActivityAt = DateTime.UtcNow;
                _logger.LogInformation("Session {SessionId} status updated to {Status}", sessionId, status);
            }
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task AddMessageAsync(string sessionId, ConversationMessage message, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            if (_sessions.TryGetValue(sessionId, out var session))
            {
                session.History.Add(message);
                session.LastActivityAt = DateTime.UtcNow;
                _logger.LogDebug("Added message to session {SessionId}: {MessageType}", sessionId, message.Type);
            }
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<PendingQuestion?> AddPendingQuestionAsync(string sessionId, string question, QuestionType type, List<string>? options = null, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            if (_sessions.TryGetValue(sessionId, out var session))
            {
                var pendingQuestion = new PendingQuestion
                {
                    Question = question,
                    Type = type,
                    Options = options
                };

                session.PendingQuestions.Enqueue(pendingQuestion);
                session.Status = SessionStatus.WaitingForInput;
                session.LastActivityAt = DateTime.UtcNow;

                _logger.LogInformation("Added pending question to session {SessionId}: {Question}", sessionId, question);
                return pendingQuestion;
            }
            return null;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<PendingQuestion?> GetPendingQuestionAsync(string sessionId, string questionId, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            if (_sessions.TryGetValue(sessionId, out var session))
            {
                return session.PendingQuestions.FirstOrDefault(q => q.Id == questionId);
            }
            return null;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task RemovePendingQuestionAsync(string sessionId, string questionId, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            if (_sessions.TryGetValue(sessionId, out var session))
            {
                var question = session.PendingQuestions.FirstOrDefault(q => q.Id == questionId);
                if (question != null)
                {
                    var newQueue = new Queue<PendingQuestion>(session.PendingQuestions.Where(q => q.Id != questionId));
                    session.PendingQuestions = newQueue;

                    if (!session.PendingQuestions.Any())
                    {
                        session.Status = SessionStatus.Processing;
                    }

                    session.LastActivityAt = DateTime.UtcNow;
                    _logger.LogInformation("Removed pending question {QuestionId} from session {SessionId}", questionId, sessionId);
                }
            }
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task StopSessionAsync(string sessionId, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            if (_sessions.Remove(sessionId))
            {
                _logger.LogInformation("Stopped and removed session {SessionId}", sessionId);
            }
        }
        finally
        {
            _lock.Release();
        }
    }
}
