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

    [HttpPost("auth")]
    public async Task<ActionResult<GitHubAuthStatusResponse>> SetToken([FromBody] GitHubAuthRequest request, CancellationToken ct)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Token))
            {
                return BadRequest("Token is required");
            }

            await _gitHubService.SetTokenAsync(request.Token, ct);
            var status = await _gitHubService.GetAuthStatusAsync(ct);

            if (!status.IsAuthenticated)
            {
                return Unauthorized(new GitHubAuthStatusResponse { IsAuthenticated = false });
            }

            return Ok(status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to set GitHub token");
            return StatusCode(500, "Failed to authenticate with GitHub");
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

    [HttpGet("repositories")]
    public async Task<ActionResult<IEnumerable<GitHubRepositoryResponse>>> GetRepositories(CancellationToken ct)
    {
        try
        {
            if (!_gitHubService.HasToken)
            {
                return Unauthorized("GitHub token not configured. Please set a token first.");
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
