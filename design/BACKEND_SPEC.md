# Backend Service Specification

## Project Overview

**Project Name:** RemoteVibe.Backend  
**Language:** C# 12
**Framework:** ASP.NET Core 10  
**Purpose:** Bridge between mobile app and VS Code extension, handle real-time communication, push notifications

### Core Responsibilities

1. Expose REST API for mobile app
2. Communicate with VS Code Extension via HTTP
3. Manage SignalR hub for real-time mobile updates
4. Handle push notifications (FCM/APNS)
5. Session state coordination
6. Authentication and security

---

## Technology Stack

- **.NET 10** SDK
- **ASP.NET Core 10** Web API
- **SignalR** for real-time communication
- **HttpClient** for extension communication
- **FirebaseAdmin** SDK for FCM
- **APNs** client for iOS notifications
- **Serilog** for structured logging

---

## Project Structure

```
RemoteVibe.Backend/
├── Controllers/
│   ├── SessionController.cs         # Session management endpoints
│   ├── HealthController.cs          # Health check
│   └── NotificationController.cs    # Device registration
├── Hubs/
│   └── RemoteVibeHub.cs            # SignalR hub
├── Services/
│   ├── IExtensionClient.cs         # Interface for extension communication
│   ├── ExtensionClient.cs          # HTTP client to extension
│   ├── INotificationService.cs     # Interface for push notifications
│   ├── NotificationService.cs      # FCM/APNS implementation
│   ├── ISessionCoordinator.cs      # Interface for session coordination
│   └── SessionCoordinator.cs       # Coordinate extension + mobile
├── Models/
│   ├── Session.cs
│   ├── ConversationMessage.cs
│   ├── PendingQuestion.cs
│   └── DeviceRegistration.cs
├── DTOs/
│   ├── Requests/
│   │   ├── StartSessionRequest.cs
│   │   ├── SendCommandRequest.cs
│   │   └── RespondToQuestionRequest.cs
│   └── Responses/
│       ├── SessionStatusResponse.cs
│       └── CommandResponse.cs
├── Middleware/
│   ├── AuthenticationMiddleware.cs
│   └── ErrorHandlingMiddleware.cs
├── Configuration/
│   ├── ExtensionSettings.cs
│   └── NotificationSettings.cs
├── Program.cs
└── appsettings.json
```

---

## API Endpoints

### Session Management

#### POST /api/session/start

**Purpose:** Start new AI session

**Request:**
```csharp
public record StartSessionRequest(string RepositoryPath);
```

**Implementation:**
```csharp
[HttpPost("start")]
public async Task<IActionResult> StartSession([FromBody] StartSessionRequest request)
{
    // Validate repository path
    if (string.IsNullOrWhiteSpace(request.RepositoryPath))
    {
        return BadRequest(new ErrorResponse("Invalid repository path", "INVALID_PATH"));
    }
    
    // Call extension to start session
    var session = await _extensionClient.StartSessionAsync(request.RepositoryPath);
    
    // Store session reference
    await _sessionCoordinator.RegisterSessionAsync(session);
    
    return Created($"/api/session/{session.Id}", new
    {
        SessionId = session.Id,
        Status = "started",
        Session = session
    });
}
```

**Response:** 201 Created
```json
{
    "sessionId": "uuid",
    "status": "started",
    "session": { ... }
}
```

---

#### POST /api/session/{sessionId}/command

**Purpose:** Send command to AI

**Request:**
```csharp
public record SendCommandRequest(
    string Command,
    CommandContext? Context = null
);
```

**Implementation:**
```csharp
[HttpPost("{sessionId}/command")]
public async Task<IActionResult> SendCommand(
    string sessionId,
    [FromBody] SendCommandRequest request)
{
    // Forward to extension
    var response = await _extensionClient.SendCommandAsync(sessionId, request);
    
    // Notify mobile clients via SignalR
    await _hub.Clients.Group(sessionId).SendAsync("OnCommandAccepted", response);
    
    return Ok(response);
}
```

---

#### POST /api/session/{sessionId}/respond

**Purpose:** Answer pending question

**Implementation:**
```csharp
[HttpPost("{sessionId}/respond")]
public async Task<IActionResult> RespondToQuestion(
    string sessionId,
    [FromBody] RespondToQuestionRequest request)
{
    // Forward answer to extension
    await _extensionClient.SubmitAnswerAsync(request.QuestionId, request.Answer);
    
    // Notify mobile clients
    await _hub.Clients.Group(sessionId).SendAsync("OnAnswerSubmitted", request);
    
    return Ok(new { Success = true });
}
```

---

#### GET /api/session/{sessionId}/status

**Purpose:** Get current session status

**Implementation:**
```csharp
[HttpGet("{sessionId}/status")]
public async Task<IActionResult> GetSessionStatus(string sessionId)
{
    var status = await _extensionClient.GetSessionStatusAsync(sessionId);
    return Ok(status);
}
```

---

#### GET /api/session/{sessionId}/messages

**Purpose:** Get conversation history

**Implementation:**
```csharp
[HttpGet("{sessionId}/messages")]
public async Task<IActionResult> GetMessages(
    string sessionId,
    [FromQuery] int skip = 0,
    [FromQuery] int take = 50)
{
    var messages = await _extensionClient.GetMessagesAsync(sessionId);
    
    var paged = messages.Skip(skip).Take(take).ToList();
    
    return Ok(new
    {
        Messages = paged,
        Total = messages.Count,
        HasMore = skip + take < messages.Count
    });
}
```

---

#### DELETE /api/session/{sessionId}

**Purpose:** Stop session

**Implementation:**
```csharp
[HttpDelete("{sessionId}")]
public async Task<IActionResult> StopSession(string sessionId)
{
    await _extensionClient.StopSessionAsync(sessionId);
    await _sessionCoordinator.UnregisterSessionAsync(sessionId);
    
    return Ok(new { Success = true });
}
```

---

### Notifications

#### POST /api/notifications/register

**Purpose:** Register device for push notifications

**Implementation:**
```csharp
[HttpPost("register")]
public async Task<IActionResult> RegisterDevice([FromBody] DeviceRegistration registration)
{
    await _notificationService.RegisterDeviceAsync(registration);
    return Ok(new { Success = true, Registered = true });
}
```

---

### Health Check

#### GET /api/health

**Purpose:** Check backend and extension health

**Implementation:**
```csharp
[HttpGet]
public async Task<IActionResult> GetHealth()
{
    var extensionHealthy = await _extensionClient.CheckHealthAsync();
    var activeSession = await _sessionCoordinator.GetActiveSessionAsync();
    
    return Ok(new
    {
        Status = extensionHealthy ? "healthy" : "degraded",
        ExtensionConnected = extensionHealthy,
        ExtensionUrl = _config.ExtensionUrl,
        ActiveSession = activeSession?.Id
    });
}
```

---

## SignalR Hub

**Hub URL:** `/hubs/remotevibe`

### Implementation

```csharp
public class RemoteVibeHub : Hub
{
    private readonly ILogger<RemoteVibeHub> _logger;
    private readonly ISessionCoordinator _sessionCoordinator;
    
    public RemoteVibeHub(
        ILogger<RemoteVibeHub> logger,
        ISessionCoordinator sessionCoordinator)
    {
        _logger = logger;
        _sessionCoordinator = sessionCoordinator;
    }
    
    public async Task JoinSession(string sessionId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);
        _logger.LogInformation("Client {ConnectionId} joined session {SessionId}",
            Context.ConnectionId, sessionId);
    }
    
    public async Task LeaveSession(string sessionId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, sessionId);
        _logger.LogInformation("Client {ConnectionId} left session {SessionId}",
            Context.ConnectionId, sessionId);
    }
    
    public async Task SendHeartbeat()
    {
        // Update last seen timestamp
        await _sessionCoordinator.UpdateClientHeartbeatAsync(Context.ConnectionId);
    }
    
    public async Task RequestSync()
    {
        // Send full state to client
        var session = await _sessionCoordinator.GetSessionForConnectionAsync(Context.ConnectionId);
        if (session != null)
        {
            await Clients.Caller.SendAsync("OnSessionStatusChanged", session);
        }
    }
    
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client {ConnectionId} disconnected", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}
```

### Server to Client Methods

Clients should implement handlers for:
- `OnSessionStatusChanged(Session session)`
- `OnMessageReceived(ConversationMessage message)`
- `OnQuestionPending(PendingQuestion question)`
- `OnTaskCompleted(TaskCompletedEvent event)`
- `OnTaskFailed(TaskFailedEvent event)`
- `OnConnectionStatusChanged(ConnectionStatus status)`

---

## Service Implementations

### Extension Client

**Purpose:** HTTP client to communicate with VS Code extension

```csharp
public class ExtensionClient : IExtensionClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ExtensionClient> _logger;
    private readonly string _extensionUrl;
    
    public ExtensionClient(
        HttpClient httpClient,
        IConfiguration config,
        ILogger<ExtensionClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _extensionUrl = config["RemoteVibe:ExtensionUrl"] ?? "http://localhost:5000";
        
        _httpClient.BaseAddress = new Uri(_extensionUrl);
        _httpClient.DefaultRequestHeaders.Add("Authorization", 
            $"Bearer {config["RemoteVibe:ExtensionApiToken"]}");
    }
    
    public async Task<Session> StartSessionAsync(string repositoryPath, CancellationToken ct = default)
    {
        var response = await _httpClient.PostAsJsonAsync(
            "/extension/session/start",
            new { repositoryPath },
            ct
        );
        
        response.EnsureSuccessStatusCode();
        
        var result = await response.Content.ReadFromJsonAsync<SessionStartResponse>(cancellationToken: ct);
        return result!.Session;
    }
    
    public async Task<CommandResponse> SendCommandAsync(
        string sessionId,
        SendCommandRequest request,
        CancellationToken ct = default)
    {
        var response = await _httpClient.PostAsJsonAsync(
            "/extension/command",
            new
            {
                sessionId,
                command = request.Command,
                context = request.Context
            },
            ct
        );
        
        response.EnsureSuccessStatusCode();
        
        return await response.Content.ReadFromJsonAsync<CommandResponse>(cancellationToken: ct)
            ?? throw new InvalidOperationException("Failed to parse response");
    }
    
    public async Task SubmitAnswerAsync(
        string questionId,
        string answer,
        CancellationToken ct = default)
    {
        var response = await _httpClient.PostAsJsonAsync(
            "/extension/respond",
            new { questionId, answer, timestamp = DateTime.UtcNow },
            ct
        );
        
        response.EnsureSuccessStatusCode();
    }
    
    public async Task<SessionStatusResponse> GetSessionStatusAsync(
        string sessionId,
        CancellationToken ct = default)
    {
        var response = await _httpClient.GetAsync(
            $"/extension/session/{sessionId}/status",
            ct
        );
        
        response.EnsureSuccessStatusCode();
        
        return await response.Content.ReadFromJsonAsync<SessionStatusResponse>(cancellationToken: ct)
            ?? throw new InvalidOperationException("Failed to parse response");
    }
    
    public async Task<List<ConversationMessage>> GetMessagesAsync(
        string sessionId,
        CancellationToken ct = default)
    {
        var response = await _httpClient.GetAsync(
            $"/extension/session/{sessionId}/messages",
            ct
        );
        
        response.EnsureSuccessStatusCode();
        
        var result = await response.Content.ReadFromJsonAsync<MessagesResponse>(cancellationToken: ct);
        return result?.Messages ?? new List<ConversationMessage>();
    }
    
    public async Task StopSessionAsync(string sessionId, CancellationToken ct = default)
    {
        var response = await _httpClient.DeleteAsync(
            $"/extension/session/{sessionId}",
            ct
        );
        
        response.EnsureSuccessStatusCode();
    }
    
    public async Task<bool> CheckHealthAsync(CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.GetAsync("/extension/health", ct);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }
}
```

---

### Notification Service

**Purpose:** Send push notifications via FCM and APNS

```csharp
public class NotificationService : INotificationService
{
    private readonly ILogger<NotificationService> _logger;
    private readonly FirebaseApp _firebaseApp;
    // APNS client would be initialized here
    
    private readonly Dictionary<string, DeviceRegistration> _devices = new();
    
    public async Task RegisterDeviceAsync(DeviceRegistration registration)
    {
        _devices[registration.DeviceToken] = registration;
        _logger.LogInformation("Registered device: {Platform}", registration.Platform);
    }
    
    public async Task SendNotificationAsync(NotificationRequest notification)
    {
        var device = _devices.GetValueOrDefault(notification.DeviceToken);
        if (device == null)
        {
            _logger.LogWarning("Device not registered: {Token}", notification.DeviceToken);
            return;
        }
        
        if (device.Platform.Equals("android", StringComparison.OrdinalIgnoreCase))
        {
            await SendFcmNotificationAsync(notification);
        }
        else if (device.Platform.Equals("ios", StringComparison.OrdinalIgnoreCase))
        {
            await SendApnsNotificationAsync(notification);
        }
    }
    
    private async Task SendFcmNotificationAsync(NotificationRequest notification)
    {
        var message = new Message
        {
            Token = notification.DeviceToken,
            Notification = new Notification
            {
                Title = notification.Title,
                Body = notification.Body
            },
            Data = notification.Data,
            Android = new AndroidConfig
            {
                Priority = notification.Type == NotificationType.QuestionPending
                    ? Priority.High
                    : Priority.Normal
            }
        };
        
        var response = await FirebaseMessaging.DefaultInstance.SendAsync(message);
        _logger.LogInformation("FCM notification sent: {Response}", response);
    }
    
    private async Task SendApnsNotificationAsync(NotificationRequest notification)
    {
        // APNS implementation
        _logger.LogInformation("APNS notification sent");
    }
}
```

---

### Session Coordinator

**Purpose:** Coordinate sessions between extension and mobile clients

```csharp
public class SessionCoordinator : ISessionCoordinator
{
    private readonly Dictionary<string, Session> _sessions = new();
    private readonly Dictionary<string, string> _connectionToSession = new();
    private readonly IHubContext<RemoteVibeHub> _hubContext;
    private readonly INotificationService _notificationService;
    private readonly ILogger<SessionCoordinator> _logger;
    
    public async Task RegisterSessionAsync(Session session)
    {
        _sessions[session.Id] = session;
        _logger.LogInformation("Session registered: {SessionId}", session.Id);
    }
    
    public async Task UnregisterSessionAsync(string sessionId)
    {
        _sessions.Remove(sessionId);
        _logger.LogInformation("Session unregistered: {SessionId}", sessionId);
        
        // Notify all clients in this session
        await _hubContext.Clients.Group(sessionId)
            .SendAsync("OnSessionStopped", new { SessionId = sessionId });
    }
    
    public async Task NotifySessionUpdateAsync(Session session)
    {
        _sessions[session.Id] = session;
        
        // Notify via SignalR
        await _hubContext.Clients.Group(session.Id)
            .SendAsync("OnSessionStatusChanged", session);
    }
    
    public async Task NotifyQuestionPendingAsync(PendingQuestion question)
    {
        // Notify via SignalR
        await _hubContext.Clients.Group(question.SessionId)
            .SendAsync("OnQuestionPending", question);
        
        // Send push notification
        await SendPushNotificationAsync(question.SessionId, new NotificationRequest
        {
            Title = "Question Pending",
            Body = question.Question,
            Type = NotificationType.QuestionPending,
            Data = new Dictionary<string, string>
            {
                ["questionId"] = question.Id,
                ["sessionId"] = question.SessionId
            }
        });
    }
    
    private async Task SendPushNotificationAsync(string sessionId, NotificationRequest notification)
    {
        // Get registered devices for this session (simplified - would need proper mapping)
        // await _notificationService.SendNotificationAsync(notification);
    }
}
```

---

## Configuration

### appsettings.json

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "RemoteVibe": {
    "ExtensionUrl": "http://localhost:5000",
    "ExtensionApiToken": "your-shared-secret-token",
    "ExtensionHealthCheckIntervalSeconds": 30,
    "SessionTimeoutMinutes": 60,
    "MaxConcurrentSessions": 1
  },
  "Notifications": {
    "Firebase": {
      "ProjectId": "your-project-id",
      "CredentialsPath": "firebase-credentials.json"
    },
    "Apple": {
      "TeamId": "your-team-id",
      "KeyId": "your-key-id",
      "BundleId": "com.yourapp.remotevibe"
    }
  },
  "Kestrel": {
    "Endpoints": {
      "Http": {
        "Url": "http://localhost:5001"
      },
      "Https": {
        "Url": "https://localhost:5002"
      }
    }
  }
}
```

---

## Program.cs

```csharp
var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure HttpClient for Extension
builder.Services.AddHttpClient<IExtensionClient, ExtensionClient>();

// Add custom services
builder.Services.AddSingleton<ISessionCoordinator, SessionCoordinator>();
builder.Services.AddSingleton<INotificationService, NotificationService>();

// Add Serilog
builder.Host.UseSerilog((context, config) =>
{
    config.ReadFrom.Configuration(context.Configuration);
});

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthorization();

app.MapControllers();
app.MapHub<RemoteVibeHub>("/hubs/remotevibe");

app.Run();
```

---

## Acceptance Criteria

- [ ] Backend starts without errors
- [ ] All REST API endpoints functional per SHARED_CONTRACTS.md
- [ ] Successfully communicates with VS Code extension
- [ ] SignalR hub accepts connections from mobile
- [ ] Push notifications sent to registered devices
- [ ] Session coordination works between extension and mobile
- [ ] Health check reports accurate status
- [ ] Proper error handling with error codes
- [ ] Structured logging with Serilog
- [ ] HTTPS configured for production

---

## Testing

### Unit Tests
- ExtensionClient HTTP communication
- NotificationService message formatting
- SessionCoordinator state management

### Integration Tests
- Full flow: Mobile → Backend → Extension → Backend → Mobile
- SignalR message delivery
- Push notification delivery

### Manual Tests
```bash
# Start backend
dotnet run

# Test health
curl https://localhost:5002/api/health

# Start session
curl -X POST https://localhost:5002/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"repositoryPath": "/path/to/repo"}'
```

---

## Development Setup

```bash
dotnet restore
dotnet build
dotnet run
```

See CSHARP_STANDARDS.md for coding standards.
See SHARED_CONTRACTS.md for all DTOs and API contracts.

