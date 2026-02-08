namespace RemoteVibe.Backend.Models;

public class ConversationMessage
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public MessageType Type { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? Metadata { get; set; }
}

public enum MessageType
{
    UserCommand,
    CopilotResponse,
    SystemInfo,
    Error
}
