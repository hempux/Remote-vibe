using RemoteVibe.Backend.DTOs;

namespace RemoteVibe.Backend.Services;

public interface IGitHubService
{
    Task<GitHubDeviceCodeResponse> InitiateDeviceFlowAsync(CancellationToken ct = default);
    Task<GitHubAuthStatusResponse> PollDeviceFlowAsync(string deviceCode, CancellationToken ct = default);
    Task<GitHubAuthStatusResponse> GetAuthStatusAsync(CancellationToken ct = default);
    Task<IEnumerable<GitHubRepositoryResponse>> GetRepositoriesAsync(CancellationToken ct = default);
    Task LogoutAsync(CancellationToken ct = default);
    bool HasToken { get; }
}
