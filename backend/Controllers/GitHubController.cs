using Microsoft.AspNetCore.Mvc;
using RemoteVibe.Backend.DTOs;
using RemoteVibe.Backend.Services;

namespace RemoteVibe.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GitHubController : ControllerBase
{
    private readonly ILogger<GitHubController> _logger;
    private readonly IGitHubService _gitHubService;

    public GitHubController(ILogger<GitHubController> logger, IGitHubService gitHubService)
    {
        _logger = logger;
        _gitHubService = gitHubService;
    }

    [HttpPost("auth/device")]
    public async Task<ActionResult<GitHubDeviceCodeResponse>> InitiateDeviceFlow(CancellationToken ct)
    {
        try
        {
            var result = await _gitHubService.InitiateDeviceFlowAsync(ct);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError(ex, "Failed to initiate GitHub device flow");
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initiate GitHub device flow");
            return StatusCode(500, "Failed to initiate GitHub authentication");
        }
    }

    [HttpPost("auth/device/complete")]
    public async Task<ActionResult<GitHubAuthStatusResponse>> CompleteDeviceFlow([FromBody] DeviceCodeRequest request, CancellationToken ct)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.DeviceCode))
            {
                return BadRequest("Device code is required");
            }

            var status = await _gitHubService.PollDeviceFlowAsync(request.DeviceCode, ct);
            return Ok(status);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "GitHub device flow poll failed");
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to complete GitHub device flow");
            return StatusCode(500, "Failed to complete GitHub authentication");
        }
    }

    [HttpGet("auth/status")]
    public async Task<ActionResult<GitHubAuthStatusResponse>> GetAuthStatus(CancellationToken ct)
    {
        try
        {
            var status = await _gitHubService.GetAuthStatusAsync(ct);
            return Ok(status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get GitHub auth status");
            return StatusCode(500, "Failed to get auth status");
        }
    }

    [HttpDelete("auth/logout")]
    public async Task<ActionResult> Logout(CancellationToken ct)
    {
        try
        {
            await _gitHubService.LogoutAsync(ct);
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to logout from GitHub");
            return StatusCode(500, "Failed to logout");
        }
    }

    [HttpGet("repositories")]
    public async Task<ActionResult<IEnumerable<GitHubRepositoryResponse>>> GetRepositories(CancellationToken ct)
    {
        try
        {
            if (!_gitHubService.HasToken)
            {
                return Unauthorized(new GitHubAuthStatusResponse { IsAuthenticated = false });
            }

            var repos = await _gitHubService.GetRepositoriesAsync(ct);
            return Ok(repos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get repositories");
            return StatusCode(500, "Failed to get repositories");
        }
    }
}

public class DeviceCodeRequest
{
    public string DeviceCode { get; set; } = string.Empty;
}
