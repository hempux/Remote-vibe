using RemoteVibe.Backend.Models;

namespace RemoteVibe.Backend.Services;

public interface INotificationService
{
    Task SendNotificationAsync(string sessionId, Notification notification, CancellationToken ct = default);
    Task<bool> RegisterDeviceTokenAsync(string deviceToken, string platform, CancellationToken ct = default);
    Task<bool> UnregisterDeviceTokenAsync(string deviceToken, CancellationToken ct = default);
}
