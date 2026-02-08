using RemoteVibe.Backend.DTOs;

namespace RemoteVibe.Backend.Services;

public interface ICopilotCliService
{
    Task<string> StartSessionAsync(string sessionId, string repositoryPath, CancellationToken ct = default);
    Task<VsCodeCommandResponse> SendCommandAsync(string sessionId, string command, CancellationToken ct = default);
    Task<VsCodeCommandResponse> SendResponseAsync(string sessionId, string questionId, string response, CancellationToken ct = default);
    Task StopSessionAsync(string sessionId, CancellationToken ct = default);
    bool IsSessionActive(string sessionId);
    Task<CopilotAuthStatusResponse> SetCopilotAuthAsync(string gitHubToken, CancellationToken ct = default);
    Task<CopilotAuthStatusResponse> GetCopilotAuthStatusAsync(CancellationToken ct = default);
    Task<UsageQuotaResponse> GetUsageQuotaAsync(CancellationToken ct = default);
}
