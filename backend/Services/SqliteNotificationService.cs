using Microsoft.Data.Sqlite;
using RemoteVibe.Backend.Models;

namespace RemoteVibe.Backend.Services;

public class SqliteNotificationService : INotificationService, IDisposable
{
    private readonly ILogger<SqliteNotificationService> _logger;
    private readonly SqliteConnection _connection;

    public SqliteNotificationService(ILogger<SqliteNotificationService> logger, IConfiguration configuration)
    {
        _logger = logger;

        var dbPath = configuration["Database:Path"] ?? "data/remotevibe.db";
        var dir = Path.GetDirectoryName(dbPath);
        if (!string.IsNullOrEmpty(dir))
            Directory.CreateDirectory(dir);

        _connection = new SqliteConnection($"Data Source={dbPath}");
        _connection.Open();

        InitializeDatabase();
    }

    private void InitializeDatabase()
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = @"
            CREATE TABLE IF NOT EXISTS DeviceTokens (
                Token TEXT PRIMARY KEY,
                Platform TEXT NOT NULL,
                RegisteredAt TEXT NOT NULL
            );

            PRAGMA journal_mode=WAL;
        ";
        cmd.ExecuteNonQuery();
    }

    public Task SendNotificationAsync(string sessionId, Notification notification, CancellationToken ct = default)
    {
        _logger.LogInformation(
            "Sending {NotificationType} notification for session {SessionId}: {Title}",
            notification.Type,
            sessionId,
            notification.Title);

        // TODO: Implement FCM/APNS integration
        return Task.CompletedTask;
    }

    public Task<bool> RegisterDeviceTokenAsync(string deviceToken, string platform, CancellationToken ct = default)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = @"
            INSERT OR REPLACE INTO DeviceTokens (Token, Platform, RegisteredAt)
            VALUES ($token, $platform, $now)";
        cmd.Parameters.AddWithValue("$token", deviceToken);
        cmd.Parameters.AddWithValue("$platform", platform);
        cmd.Parameters.AddWithValue("$now", DateTime.UtcNow.ToString("O"));
        cmd.ExecuteNonQuery();

        _logger.LogInformation("Registered device token for {Platform}", platform);
        return Task.FromResult(true);
    }

    public Task<bool> UnregisterDeviceTokenAsync(string deviceToken, CancellationToken ct = default)
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = "DELETE FROM DeviceTokens WHERE Token = $token";
        cmd.Parameters.AddWithValue("$token", deviceToken);
        var rows = cmd.ExecuteNonQuery();

        if (rows > 0)
        {
            _logger.LogInformation("Unregistered device token");
        }
        return Task.FromResult(rows > 0);
    }

    public void Dispose()
    {
        _connection?.Dispose();
    }
}
