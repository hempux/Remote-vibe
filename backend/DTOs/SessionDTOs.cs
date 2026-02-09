namespace RemoteVibe.Backend.DTOs;

public class StartSessionRequest
{
    public string RepositoryOwner { get; set; } = string.Empty;
    public string RepositoryName { get; set; } = string.Empty;
    public string? TaskDescription { get; set; }
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
    public string RepositoryOwner { get; set; } = string.Empty;
    public string RepositoryName { get; set; } = string.Empty;
    public string? TaskDescription { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? LastActivityAt { get; set; }
    public int MessageCount { get; set; }
    public int PendingQuestionCount { get; set; }
}

public class GitHubDeviceCodeResponse
{
    public string DeviceCode { get; set; } = string.Empty;
    public string UserCode { get; set; } = string.Empty;
    public string VerificationUri { get; set; } = string.Empty;
    public int ExpiresIn { get; set; }
    public int Interval { get; set; }
}

public class GitHubAuthStatusResponse
{
    public bool IsAuthenticated { get; set; }
    public string? Username { get; set; }
    public string? AvatarUrl { get; set; }
}

public class GitHubRepositoryResponse
{
    public string Owner { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Language { get; set; }
    public bool IsPrivate { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string DefaultBranch { get; set; } = "main";
}

public class CopilotAuthRequest
{
    public string GitHubToken { get; set; } = string.Empty;
}

public class CopilotAuthStatusResponse
{
    public bool IsAuthenticated { get; set; }
    public string? Username { get; set; }
    public bool RequiresAdditionalAuth { get; set; }
    public string? AuthUrl { get; set; }
}

public class UsageQuotaResponse
{
    public int PremiumRequestsUsed { get; set; }
    public int PremiumRequestsLimit { get; set; }
    public int PercentageUsed { get; set; }
    public DateTime ResetDate { get; set; }
}

public class RegisterDeviceRequest
{
    public string DeviceToken { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
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
