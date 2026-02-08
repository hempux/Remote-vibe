using System.Text.Json;
using RemoteVibe.Backend.DTOs;
using RemoteVibe.Backend.Models;
using Microsoft.AspNetCore.SignalR;
using RemoteVibe.Backend.Hubs;

namespace RemoteVibe.Backend.Services;

public class CopilotCliService : ICopilotCliService
{
    private readonly ILogger<CopilotCliService> _logger;
    private readonly ISessionManager _sessionManager;
    private readonly IHubContext<CopilotHub> _hubContext;
    private readonly HttpClient _httpClient;
    private readonly string _vscodeServerUrl;
    private readonly string _authToken;
    private readonly JsonSerializerOptions _jsonOptions;

    public CopilotCliService(
        ILogger<CopilotCliService> logger,
        ISessionManager sessionManager,
        IHubContext<CopilotHub> hubContext,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _logger = logger;
        _sessionManager = sessionManager;
        _hubContext = hubContext;
        _httpClient = httpClientFactory.CreateClient();
        _vscodeServerUrl = configuration["VscodeServerUrl"] ?? "http://vscode-server:5000";
        _authToken = configuration["VscodeServerAuthToken"] ?? "remote-vibe-internal-token";
        _jsonOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
    }

    public async Task<string> StartSessionAsync(string sessionId, string repositoryPath, CancellationToken ct = default)
    {
        try
        {
            _logger.LogInformation("Proxying session start to VS Code Server at {Url}", _vscodeServerUrl);

            var requestBody = new { sessionId, repositoryPath };
            var requestMessage = new HttpRequestMessage(HttpMethod.Post, $"{_vscodeServerUrl}/extension/session/start")
            {
                Content = JsonContent.Create(requestBody)
            };
            requestMessage.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _authToken);

            var response = await _httpClient.SendAsync(requestMessage, ct);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("VS Code Server returned {StatusCode}: {Error}", response.StatusCode, errorContent);
                throw new InvalidOperationException($"VS Code Server returned {response.StatusCode}: {errorContent}");
            }

            _logger.LogInformation("VS Code Server started session {SessionId} successfully", sessionId);
            return sessionId;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start session via VS Code Server for session {SessionId}", sessionId);
            throw;
        }
    }

    public async Task<VsCodeCommandResponse> SendCommandAsync(string sessionId, string command, CancellationToken ct = default)
    {
        try
        {
            _logger.LogInformation("Proxying command to VS Code Server for session {SessionId}: {Command}", sessionId, command);

            var requestBody = new { sessionId, command, context = new { } };
            var requestMessage = new HttpRequestMessage(HttpMethod.Post, $"{_vscodeServerUrl}/extension/command")
            {
                Content = JsonContent.Create(requestBody)
            };
            requestMessage.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _authToken);

            var response = await _httpClient.SendAsync(requestMessage, ct);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("VS Code Server returned {StatusCode}: {Error}", response.StatusCode, errorContent);
                throw new InvalidOperationException($"VS Code Server returned {response.StatusCode}: {errorContent}");
            }

            var result = await response.Content.ReadFromJsonAsync<VsCodeCommandResponse>(_jsonOptions, ct);
            _logger.LogInformation("Command response: {MessageCount} messages, {QuestionCount} questions, statusChange={StatusChange}",
                result?.Messages?.Count ?? 0, result?.Questions?.Count ?? 0, result?.StatusChange);

            return result ?? new VsCodeCommandResponse { Success = true };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send command via VS Code Server for session {SessionId}", sessionId);
            throw;
        }
    }

    public async Task<VsCodeCommandResponse> SendResponseAsync(string sessionId, string questionId, string response, CancellationToken ct = default)
    {
        try
        {
            _logger.LogInformation("Proxying response to VS Code Server for session {SessionId}, question {QuestionId}", sessionId, questionId);

            var requestBody = new { sessionId, questionId, response };
            var requestMessage = new HttpRequestMessage(HttpMethod.Post, $"{_vscodeServerUrl}/extension/respond")
            {
                Content = JsonContent.Create(requestBody)
            };
            requestMessage.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _authToken);

            var httpResponse = await _httpClient.SendAsync(requestMessage, ct);

            if (!httpResponse.IsSuccessStatusCode)
            {
                var errorContent = await httpResponse.Content.ReadAsStringAsync(ct);
                _logger.LogError("VS Code Server returned {StatusCode}: {Error}", httpResponse.StatusCode, errorContent);
                throw new InvalidOperationException($"VS Code Server returned {httpResponse.StatusCode}: {errorContent}");
            }

            var result = await httpResponse.Content.ReadFromJsonAsync<VsCodeCommandResponse>(_jsonOptions, ct);
            _logger.LogInformation("Response result: {MessageCount} messages, {QuestionCount} questions, statusChange={StatusChange}",
                result?.Messages?.Count ?? 0, result?.Questions?.Count ?? 0, result?.StatusChange);

            return result ?? new VsCodeCommandResponse { Success = true };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send response via VS Code Server for session {SessionId}", sessionId);
            throw;
        }
    }

    public async Task StopSessionAsync(string sessionId, CancellationToken ct = default)
    {
        try
        {
            _logger.LogInformation("Proxying session stop to VS Code Server for session {SessionId}", sessionId);

            var requestMessage = new HttpRequestMessage(HttpMethod.Delete, $"{_vscodeServerUrl}/extension/session/{sessionId}");
            requestMessage.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _authToken);

            var response = await _httpClient.SendAsync(requestMessage, ct);

            if (!response.IsSuccessStatusCode && response.StatusCode != System.Net.HttpStatusCode.NotFound)
            {
                var errorContent = await response.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("VS Code Server returned {StatusCode} when stopping session: {Error}",
                    response.StatusCode, errorContent);
            }

            _logger.LogInformation("Session {SessionId} stop request sent to VS Code Server", sessionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to stop session via VS Code Server for session {SessionId}", sessionId);
            throw;
        }
    }

    public bool IsSessionActive(string sessionId)
    {
        var session = _sessionManager.GetSessionAsync(sessionId).GetAwaiter().GetResult();
        return session != null && session.Status != SessionStatus.Completed && session.Status != SessionStatus.Error;
    }

    public async Task<CopilotAuthStatusResponse> SetCopilotAuthAsync(string gitHubToken, CancellationToken ct = default)
    {
        try
        {
            _logger.LogInformation("Setting Copilot auth via VS Code Server");

            var requestBody = new { gitHubToken };
            var requestMessage = new HttpRequestMessage(HttpMethod.Post, $"{_vscodeServerUrl}/extension/auth")
            {
                Content = JsonContent.Create(requestBody)
            };
            requestMessage.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _authToken);

            var response = await _httpClient.SendAsync(requestMessage, ct);

            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<CopilotAuthStatusResponse>(_jsonOptions, ct);
                return result ?? new CopilotAuthStatusResponse { IsAuthenticated = true };
            }

            var errorContent = await response.Content.ReadAsStringAsync(ct);
            _logger.LogWarning("VS Code Server returned {StatusCode} for auth: {Error}", response.StatusCode, errorContent);

            // If the extension server doesn't support this endpoint yet, report status based on health check
            return new CopilotAuthStatusResponse
            {
                IsAuthenticated = false,
                RequiresAdditionalAuth = true,
                AuthUrl = null
            };
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Cannot reach VS Code Server for Copilot auth - server may not support auth endpoint yet");
            return new CopilotAuthStatusResponse
            {
                IsAuthenticated = false,
                RequiresAdditionalAuth = true
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to set Copilot auth");
            throw;
        }
    }

    public async Task<CopilotAuthStatusResponse> GetCopilotAuthStatusAsync(CancellationToken ct = default)
    {
        try
        {
            _logger.LogInformation("Getting Copilot auth status from VS Code Server");

            var requestMessage = new HttpRequestMessage(HttpMethod.Get, $"{_vscodeServerUrl}/extension/auth/status");
            requestMessage.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _authToken);

            var response = await _httpClient.SendAsync(requestMessage, ct);

            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<CopilotAuthStatusResponse>(_jsonOptions, ct);
                return result ?? new CopilotAuthStatusResponse { IsAuthenticated = false };
            }

            // If the extension server doesn't support this endpoint, check health
            var healthMessage = new HttpRequestMessage(HttpMethod.Get, $"{_vscodeServerUrl}/extension/health");
            healthMessage.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _authToken);

            var healthResponse = await _httpClient.SendAsync(healthMessage, ct);

            return new CopilotAuthStatusResponse
            {
                IsAuthenticated = healthResponse.IsSuccessStatusCode,
                Username = healthResponse.IsSuccessStatusCode ? "copilot" : null,
            };
        }
        catch (HttpRequestException)
        {
            return new CopilotAuthStatusResponse { IsAuthenticated = false };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get Copilot auth status");
            throw;
        }
    }

    public async Task<UsageQuotaResponse> GetUsageQuotaAsync(CancellationToken ct = default)
    {
        try
        {
            _logger.LogInformation("Getting usage quota from VS Code Server");

            var requestMessage = new HttpRequestMessage(HttpMethod.Get, $"{_vscodeServerUrl}/extension/quota");
            requestMessage.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _authToken);

            var response = await _httpClient.SendAsync(requestMessage, ct);

            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<UsageQuotaResponse>(_jsonOptions, ct);
                return result ?? GetDefaultQuota();
            }

            // If the extension doesn't support quota yet, return defaults
            return GetDefaultQuota();
        }
        catch (HttpRequestException)
        {
            return GetDefaultQuota();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get usage quota");
            throw;
        }
    }

    private static UsageQuotaResponse GetDefaultQuota()
    {
        return new UsageQuotaResponse
        {
            PremiumRequestsUsed = 0,
            PremiumRequestsLimit = 0,
            PercentageUsed = 0,
            ResetDate = DateTime.UtcNow.AddDays(30)
        };
    }
}
