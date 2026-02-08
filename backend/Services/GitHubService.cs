using System.Net.Http.Headers;
using System.Text.Json;
using RemoteVibe.Backend.DTOs;

namespace RemoteVibe.Backend.Services;

public class GitHubService : IGitHubService
{
    private readonly ILogger<GitHubService> _logger;
    private readonly HttpClient _httpClient;
    private string? _token;
    private GitHubAuthStatusResponse? _cachedStatus;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public GitHubService(ILogger<GitHubService> logger, IHttpClientFactory httpClientFactory)
    {
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient();
        _httpClient.BaseAddress = new Uri("https://api.github.com");
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "RemoteVibe-Backend");
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    public bool HasToken => !string.IsNullOrEmpty(_token);

    public Task SetTokenAsync(string token, CancellationToken ct = default)
    {
        _token = token;
        _cachedStatus = null;
        // GitHub API accepts both 'Bearer' and 'token' schemes for PATs,
        // but 'token' is the recommended scheme per GitHub documentation
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("token", token);
        _logger.LogInformation("GitHub token updated");
        return Task.CompletedTask;
    }

    public async Task<GitHubAuthStatusResponse> GetAuthStatusAsync(CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_token))
        {
            return new GitHubAuthStatusResponse { IsAuthenticated = false };
        }

        try
        {
            var response = await _httpClient.GetAsync("/user", ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("GitHub auth check failed with status {StatusCode}", response.StatusCode);
                return new GitHubAuthStatusResponse { IsAuthenticated = false };
            }

            var json = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            _cachedStatus = new GitHubAuthStatusResponse
            {
                IsAuthenticated = true,
                Username = root.TryGetProperty("login", out var login) ? login.GetString() : null,
                AvatarUrl = root.TryGetProperty("avatar_url", out var avatar) ? avatar.GetString() : null,
            };

            return _cachedStatus;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to check GitHub auth status");
            return new GitHubAuthStatusResponse { IsAuthenticated = false };
        }
    }

    public async Task<IEnumerable<GitHubRepositoryResponse>> GetRepositoriesAsync(CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_token))
        {
            return Enumerable.Empty<GitHubRepositoryResponse>();
        }

        try
        {
            var repos = new List<GitHubRepositoryResponse>();
            var page = 1;
            const int perPage = 100;

            while (true)
            {
                var response = await _httpClient.GetAsync(
                    $"/user/repos?sort=updated&direction=desc&per_page={perPage}&page={page}&type=all", ct);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("GitHub repos fetch failed with status {StatusCode}", response.StatusCode);
                    break;
                }

                var json = await response.Content.ReadAsStringAsync(ct);
                using var doc = JsonDocument.Parse(json);
                var array = doc.RootElement;

                if (array.GetArrayLength() == 0)
                    break;

                foreach (var repo in array.EnumerateArray())
                {
                    repos.Add(new GitHubRepositoryResponse
                    {
                        Owner = repo.TryGetProperty("owner", out var owner) && owner.TryGetProperty("login", out var ownerLogin)
                            ? ownerLogin.GetString() ?? "" : "",
                        Name = repo.TryGetProperty("name", out var name) ? name.GetString() ?? "" : "",
                        FullName = repo.TryGetProperty("full_name", out var fullName) ? fullName.GetString() ?? "" : "",
                        Description = repo.TryGetProperty("description", out var desc) && desc.ValueKind != JsonValueKind.Null
                            ? desc.GetString() : null,
                        Language = repo.TryGetProperty("language", out var lang) && lang.ValueKind != JsonValueKind.Null
                            ? lang.GetString() : null,
                        IsPrivate = repo.TryGetProperty("private", out var priv) && priv.GetBoolean(),
                        UpdatedAt = repo.TryGetProperty("updated_at", out var updated)
                            ? updated.GetDateTime() : DateTime.UtcNow,
                        DefaultBranch = repo.TryGetProperty("default_branch", out var branch)
                            ? branch.GetString() ?? "main" : "main",
                    });
                }

                if (array.GetArrayLength() < perPage)
                    break;

                page++;

                // Cap at 10 pages (1000 repos) to prevent excessive API calls
                // for accounts with very large numbers of repositories
                if (page > 10)
                    break;
            }

            _logger.LogInformation("Fetched {Count} repositories from GitHub", repos.Count);
            return repos;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch GitHub repositories");
            return Enumerable.Empty<GitHubRepositoryResponse>();
        }
    }
}
