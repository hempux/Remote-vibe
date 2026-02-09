namespace RemoteVibe.Backend.Models;

public class Session
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string RepositoryOwner { get; set; } = string.Empty;
    public string RepositoryName { get; set; } = string.Empty;
    public string RepositoryPath { get; set; } = string.Empty;
    public string? TaskDescription { get; set; }
    public SessionStatus Status { get; set; } = SessionStatus.Idle;
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastActivityAt { get; set; }
    public List<ConversationMessage> History { get; set; } = new();
    public Queue<PendingQuestion> PendingQuestions { get; set; } = new();
    public string? CurrentCommand { get; set; }
}

public enum SessionStatus
{
    Idle,
    Processing,
    WaitingForInput,
    Completed,
    Error
}
