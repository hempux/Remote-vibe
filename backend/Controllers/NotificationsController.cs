using Microsoft.AspNetCore.Mvc;
using RemoteVibe.Backend.DTOs;
using RemoteVibe.Backend.Services;

namespace RemoteVibe.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly ILogger<NotificationsController> _logger;
    private readonly INotificationService _notificationService;

    public NotificationsController(ILogger<NotificationsController> logger, INotificationService notificationService)
    {
        _logger = logger;
        _notificationService = notificationService;
    }

    [HttpPost("register")]
    public async Task<ActionResult> RegisterDevice([FromBody] RegisterDeviceRequest request, CancellationToken ct)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.DeviceToken) || string.IsNullOrWhiteSpace(request.Platform))
            {
                return BadRequest("Device token and platform are required");
            }

            var result = await _notificationService.RegisterDeviceTokenAsync(request.DeviceToken, request.Platform, ct);
            return result ? Ok() : StatusCode(500, "Failed to register device");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to register device");
            return StatusCode(500, "Failed to register device");
        }
    }

    [HttpDelete("unregister/{deviceToken}")]
    public async Task<ActionResult> UnregisterDevice(string deviceToken, CancellationToken ct)
    {
        try
        {
            await _notificationService.UnregisterDeviceTokenAsync(deviceToken, ct);
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to unregister device");
            return StatusCode(500, "Failed to unregister device");
        }
    }
}
