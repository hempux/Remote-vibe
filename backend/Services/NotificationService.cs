using RemoteVibe.Backend.Models;

namespace RemoteVibe.Backend.Services;

public class NotificationService : INotificationService
{
    private readonly ILogger<NotificationService> _logger;
    private readonly Dictionary<string, DeviceToken> _deviceTokens = new();

    public NotificationService(ILogger<NotificationService> logger)
    {
        _logger = logger;
    }

    public Task SendNotificationAsync(string sessionId, Notification notification, CancellationToken ct = default)
    {
        _logger.LogInformation(
            "Sending {NotificationType} notification for session {SessionId}: {Title}",
            notification.Type,
            sessionId,
            notification.Title);

        // TODO: Implement FCM/APNS integration
        // For MVP, just log the notification
        return Task.CompletedTask;
    }

    public Task<bool> RegisterDeviceTokenAsync(string deviceToken, string platform, CancellationToken ct = default)
    {
        _deviceTokens[deviceToken] = new DeviceToken
        {
            Token = deviceToken,
            Platform = platform,
            RegisteredAt = DateTime.UtcNow
        };

        _logger.LogInformation("Registered device token for {Platform}", platform);
        return Task.FromResult(true);
    }

    public Task<bool> UnregisterDeviceTokenAsync(string deviceToken, CancellationToken ct = default)
    {
        var removed = _deviceTokens.Remove(deviceToken);
        if (removed)
        {
            _logger.LogInformation("Unregistered device token");
        }
        return Task.FromResult(removed);
    }

    private class DeviceToken
    {
        public required string Token { get; set; }
        public required string Platform { get; set; }
        public DateTime RegisteredAt { get; set; }
    }
}
