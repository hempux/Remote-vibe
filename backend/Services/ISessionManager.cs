using RemoteVibe.Backend.Models;

namespace RemoteVibe.Backend.Services;

public interface ISessionManager
{
    Task<Session> StartSessionAsync(string repositoryPath, CancellationToken ct = default);
    Task<IEnumerable<Session>> GetAllSessionsAsync(CancellationToken ct = default);
    Task<Session?> GetCurrentSessionAsync(CancellationToken ct = default);
    Task<Session?> GetSessionAsync(string sessionId, CancellationToken ct = default);
    Task UpdateSessionStatusAsync(string sessionId, SessionStatus status, CancellationToken ct = default);
    Task AddMessageAsync(string sessionId, ConversationMessage message, CancellationToken ct = default);
    Task<PendingQuestion?> AddPendingQuestionAsync(string sessionId, string question, QuestionType type, List<string>? options = null, CancellationToken ct = default);
    Task<PendingQuestion?> GetPendingQuestionAsync(string sessionId, string questionId, CancellationToken ct = default);
    Task RemovePendingQuestionAsync(string sessionId, string questionId, CancellationToken ct = default);
    Task StopSessionAsync(string sessionId, CancellationToken ct = default);
}
