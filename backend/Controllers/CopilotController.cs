using Microsoft.AspNetCore.Mvc;
using RemoteVibe.Backend.DTOs;
using RemoteVibe.Backend.Services;

namespace RemoteVibe.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CopilotController : ControllerBase
{
    private readonly ILogger<CopilotController> _logger;
    private readonly ICopilotCliService _copilotCliService;

    public CopilotController(ILogger<CopilotController> logger, ICopilotCliService copilotCliService)
    {
        _logger = logger;
        _copilotCliService = copilotCliService;
    }

    [HttpPost("auth")]
    public async Task<ActionResult<CopilotAuthStatusResponse>> SetAuth([FromBody] CopilotAuthRequest request, CancellationToken ct)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.GitHubToken))
            {
                return BadRequest("GitHub token is required");
            }

            var result = await _copilotCliService.SetCopilotAuthAsync(request.GitHubToken, ct);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to set Copilot auth");
            return StatusCode(500, "Failed to set Copilot authentication");
        }
    }

    [HttpGet("auth/status")]
    public async Task<ActionResult<CopilotAuthStatusResponse>> GetAuthStatus(CancellationToken ct)
    {
        try
        {
            var result = await _copilotCliService.GetCopilotAuthStatusAsync(ct);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get Copilot auth status");
            return StatusCode(500, "Failed to get Copilot auth status");
        }
    }

    [HttpGet("quota")]
    public async Task<ActionResult<UsageQuotaResponse>> GetQuota(CancellationToken ct)
    {
        try
        {
            var result = await _copilotCliService.GetUsageQuotaAsync(ct);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get usage quota");
            return StatusCode(500, "Failed to get usage quota");
        }
    }
}
