namespace RemoteVibe.Backend.DTOs;

public class StartSessionRequest
{
    public string RepositoryPath { get; set; } = string.Empty;
}

public class SendCommandRequest
{
    public string Command { get; set; } = string.Empty;
}

public class RespondToQuestionRequest
{
    public string QuestionId { get; set; } = string.Empty;
    public string Response { get; set; } = string.Empty;
}

public class SessionStatusResponse
{
    public string SessionId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? LastActivityAt { get; set; }
    public int MessageCount { get; set; }
    public int PendingQuestionCount { get; set; }
}

// DTOs for parsing rich responses from the standalone VS Code server

public class VsCodeCommandResponse
{
    public bool Success { get; set; }
    public List<VsCodeMessage>? Messages { get; set; }
    public List<VsCodeQuestion>? Questions { get; set; }
    public string? StatusChange { get; set; }
}

public class VsCodeMessage
{
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

public class VsCodeQuestion
{
    public string Id { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public List<string>? Options { get; set; }
}
