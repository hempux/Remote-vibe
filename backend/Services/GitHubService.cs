using System.Net.Http.Headers;
using System.Text.Json;
using RemoteVibe.Backend.DTOs;

namespace RemoteVibe.Backend.Services;

public class GitHubService : IGitHubService
{
    private readonly ILogger<GitHubService> _logger;
    private readonly HttpClient _httpClient;
    private readonly string _clientId;
    private string? _accessToken;
    private GitHubAuthStatusResponse? _cachedStatus;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public GitHubService(ILogger<GitHubService> logger, IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient();
        _httpClient.BaseAddress = new Uri("https://api.github.com");
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "RemoteVibe-Backend");
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        _clientId = configuration["GitHub:ClientId"] ?? "";
    }

    public bool HasToken => !string.IsNullOrEmpty(_accessToken);

    public async Task<GitHubDeviceCodeResponse> InitiateDeviceFlowAsync(CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_clientId))
        {
            throw new InvalidOperationException("GitHub OAuth Client ID is not configured. Set GitHub:ClientId in appsettings.");
        }

        var requestBody = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("client_id", _clientId),
            new KeyValuePair<string, string>("scope", "repo read:user")
        });

        var request = new HttpRequestMessage(HttpMethod.Post, "https://github.com/login/device/code")
        {
            Content = requestBody
        };
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var response = await _httpClient.SendAsync(request, ct);
        var json = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("GitHub device flow initiation failed: {StatusCode} {Body}", response.StatusCode, json);
            throw new InvalidOperationException($"GitHub device flow failed: {response.StatusCode}");
        }

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        var result = new GitHubDeviceCodeResponse
        {
            DeviceCode = root.GetProperty("device_code").GetString() ?? "",
            UserCode = root.GetProperty("user_code").GetString() ?? "",
            VerificationUri = root.GetProperty("verification_uri").GetString() ?? "",
            ExpiresIn = root.GetProperty("expires_in").GetInt32(),
            Interval = root.GetProperty("interval").GetInt32(),
        };

        _logger.LogInformation("GitHub device flow initiated, user code: {UserCode}", result.UserCode);
        return result;
    }

    public async Task<GitHubAuthStatusResponse> PollDeviceFlowAsync(string deviceCode, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_clientId))
        {
            throw new InvalidOperationException("GitHub OAuth Client ID is not configured.");
        }

        var requestBody = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("client_id", _clientId),
            new KeyValuePair<string, string>("device_code", deviceCode),
            new KeyValuePair<string, string>("grant_type", "urn:ietf:params:oauth:grant-type:device_code")
        });

        var request = new HttpRequestMessage(HttpMethod.Post, "https://github.com/login/oauth/access_token")
        {
            Content = requestBody
        };
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var response = await _httpClient.SendAsync(request, ct);
        var json = await response.Content.ReadAsStringAsync(ct);

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        // Check for error (authorization_pending, slow_down, etc.)
        if (root.TryGetProperty("error", out var errorProp))
        {
            var error = errorProp.GetString();
            if (error == "authorization_pending" || error == "slow_down")
            {
                return new GitHubAuthStatusResponse { IsAuthenticated = false };
            }

            _logger.LogWarning("GitHub OAuth poll error: {Error}", error);
            throw new InvalidOperationException($"GitHub OAuth error: {error}");
        }

        // Success: we got an access token
        if (root.TryGetProperty("access_token", out var tokenProp))
        {
            _accessToken = tokenProp.GetString();
            _cachedStatus = null;
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);

            _logger.LogInformation("GitHub OAuth device flow completed successfully");

            // Fetch user info to return
            return await GetAuthStatusAsync(ct);
        }

        return new GitHubAuthStatusResponse { IsAuthenticated = false };
    }

    public Task LogoutAsync(CancellationToken ct = default)
    {
        _accessToken = null;
        _cachedStatus = null;
        _httpClient.DefaultRequestHeaders.Authorization = null;
        _logger.LogInformation("GitHub session cleared");
        return Task.CompletedTask;
    }

    public async Task<GitHubAuthStatusResponse> GetAuthStatusAsync(CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_accessToken))
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
        if (string.IsNullOrEmpty(_accessToken))
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
