namespace RemoteVibe.Backend.Models;

public class Notification
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public NotificationPriority Priority { get; set; }
}

public enum NotificationType
{
    QuestionPending,
    TaskCompleted,
    TaskFailed,
    SessionStarted,
    SessionStopped
}

public enum NotificationPriority
{
    Low,
    Normal,
    High
}
