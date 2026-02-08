using RemoteVibe.Backend.DTOs;

namespace RemoteVibe.Backend.Services;

public interface IGitHubService
{
    Task SetTokenAsync(string token, CancellationToken ct = default);
    Task<GitHubAuthStatusResponse> GetAuthStatusAsync(CancellationToken ct = default);
    Task<IEnumerable<GitHubRepositoryResponse>> GetRepositoriesAsync(CancellationToken ct = default);
    bool HasToken { get; }
}
