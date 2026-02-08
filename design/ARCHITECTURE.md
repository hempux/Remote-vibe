# Remote Vibe - System Architecture

## Overview
Remote Vibe enables remote control of GitHub Copilot CLI agents from mobile devices, running locally to avoid GitHub Actions costs while leveraging existing Copilot subscriptions.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile Devices                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   .NET MAUI Blazor Hybrid App                        │  │
│  │   - MudBlazor UI Components                          │  │
│  │   - SignalR Client                                   │  │
│  │   - Push Notification Handler                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS/WSS
                          │ SignalR
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Local Machine (Backend Service)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   ASP.NET Core Web API + SignalR Hub                 │  │
│  │   ┌────────────────────────────────────────────┐     │  │
│  │   │  Session Manager                           │     │  │
│  │   │  - Session State                           │     │  │
│  │   │  - Conversation History                    │     │  │
│  │   │  - Pending Questions Queue                 │     │  │
│  │   └────────────────────────────────────────────┘     │  │
│  │   ┌────────────────────────────────────────────┐     │  │
│  │   │  Copilot CLI Wrapper                       │     │  │
│  │   │  - Process Manager                         │     │  │
│  │   │  - Output Parser                           │     │  │
│  │   │  - Input Handler                           │     │  │
│  │   └────────────────────────────────────────────┘     │  │
│  │   ┌────────────────────────────────────────────┐     │  │
│  │   │  Notification Service                      │     │  │
│  │   │  - FCM Provider (Android)                  │     │  │
│  │   │  - APNS Provider (iOS)                     │     │  │
│  │   └────────────────────────────────────────────┘     │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          │ Process Spawn/IPC                │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   GitHub Copilot CLI                                 │  │
│  │   - Authenticated session                            │  │
│  │   - Local repository access                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              GitHub Copilot Service                         │
│              (Existing Subscription)                        │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Mobile Application (.NET MAUI Blazor Hybrid)

**Technology Stack:**
- .NET 10 MAUI
- Blazor Hybrid (WebView-based UI)
- MudBlazor 7.x for UI components
- SignalR Client for real-time communication
- Platform-specific push notification APIs

**Key Components:**

#### 1.1 UI Layer (Blazor Components)
- `SessionDashboard.razor` - Main screen showing session status
- `CommandInput.razor` - Form for sending commands to Copilot
- `ConversationView.razor` - Chat-like display of conversation history
- `PendingQuestions.razor` - List of questions awaiting user response
- `NotificationList.razor` - History of notifications

#### 1.2 Services
- `SignalRService` - Manages connection to backend hub
- `NotificationService` - Handles platform-specific push notifications
- `SessionStateService` - Client-side session state management
- `ApiClient` - HTTP client for REST API calls

#### 1.3 Platform-Specific Code
- `Platforms/Android/` - FCM integration, permissions
- `Platforms/iOS/` - APNS integration, permissions
- `Platforms/Windows/` - Optional desktop support
- `Platforms/MacCatalyst/` - Optional macOS support

### 2. Backend Service (ASP.NET Core)

**Technology Stack:**
- ASP.NET Core 10
- SignalR for real-time communication
- System.Diagnostics.Process for CLI management
- Entity Framework Core (optional, for persistence)

**Project Structure:**
```
RemoteVibe.Backend/
├── Controllers/
│   ├── SessionController.cs       # REST API for session management
│   └── HealthController.cs        # Health check endpoint
├── Hubs/
│   └── CopilotHub.cs              # SignalR hub for real-time updates
├── Services/
│   ├── ICopilotCliService.cs      # Interface for CLI wrapper
│   ├── CopilotCliService.cs       # GitHub Copilot CLI wrapper
│   ├── ISessionManager.cs         # Interface for session management
│   ├── SessionManager.cs          # Session state and lifecycle
│   ├── IOutputParser.cs           # Interface for parsing CLI output
│   ├── OutputParser.cs            # Parses Copilot CLI responses
│   ├── INotificationService.cs    # Interface for notifications
│   └── NotificationService.cs     # Push notification provider
├── Models/
│   ├── Session.cs                 # Session entity
│   ├── Command.cs                 # Command entity
│   ├── ConversationMessage.cs     # Message in conversation
│   ├── PendingQuestion.cs         # Question awaiting response
│   └── Notification.cs            # Notification entity
├── DTOs/
│   ├── StartSessionRequest.cs
│   ├── SendCommandRequest.cs
│   ├── RespondToQuestionRequest.cs
│   └── SessionStatusResponse.cs
└── Program.cs                      # Service configuration
```

### 3. Core Components Deep Dive

#### 3.1 CopilotCliService

**Responsibilities:**
- Spawn and manage GitHub Copilot CLI process
- Handle stdin/stdout/stderr streams
- Detect when Copilot needs user input
- Forward user responses to CLI
- Graceful shutdown and cleanup

**Key Methods:**
```csharp
Task<string> StartSessionAsync(string repositoryPath, CancellationToken ct);
Task SendCommandAsync(string sessionId, string command, CancellationToken ct);
Task SendResponseAsync(string sessionId, string response, CancellationToken ct);
Task<string> GetOutputAsync(string sessionId, CancellationToken ct);
Task StopSessionAsync(string sessionId, CancellationToken ct);
```

**Output Parsing Strategy:**
- Monitor stdout for patterns indicating questions (e.g., "? ", "[Y/n]")
- Detect task completion markers
- Capture file changes and diffs
- Identify errors and exceptions

#### 3.2 SessionManager

**Responsibilities:**
- Maintain single active session state
- Store conversation history
- Queue pending questions
- Coordinate between CLI service and SignalR hub
- Persist session data (optional)

**State Model:**
```csharp
public class Session
{
    public string Id { get; set; }
    public string RepositoryPath { get; set; }
    public SessionStatus Status { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? LastActivityAt { get; set; }
    public List<ConversationMessage> History { get; set; }
    public Queue<PendingQuestion> PendingQuestions { get; set; }
    public string CurrentCommand { get; set; }
}

public enum SessionStatus
{
    Idle,
    Processing,
    WaitingForInput,
    Completed,
    Error
}
```

#### 3.3 NotificationService

**Responsibilities:**
- Send push notifications via FCM (Android) and APNS (iOS)
- Track device tokens per user
- Queue notifications if delivery fails
- Handle notification priorities

**Notification Types:**
```csharp
public enum NotificationType
{
    QuestionPending,      // High priority - needs user input
    TaskCompleted,        // Normal priority - task finished
    TaskFailed,           // High priority - error occurred
    SessionStarted,       // Low priority - informational
    SessionStopped        // Low priority - informational
}
```

### 4. Communication Protocol

#### 4.1 REST API Endpoints

```
POST   /api/session/start              - Start new session
POST   /api/session/{id}/command       - Send command to session
POST   /api/session/{id}/respond       - Respond to pending question
GET    /api/session/{id}/status        - Get session status
GET    /api/session/{id}/history       - Get conversation history
DELETE /api/session/{id}               - Stop session
GET    /api/health                     - Health check
```

#### 4.2 SignalR Hub Methods

**Server to Client:**
```csharp
// Pushed from server to mobile clients
OnSessionStatusChanged(SessionStatusResponse status)
OnMessageReceived(ConversationMessage message)
OnQuestionPending(PendingQuestion question)
OnTaskCompleted(TaskResult result)
OnError(ErrorInfo error)
```

**Client to Server:**
```csharp
// Called by mobile clients
JoinSession(string sessionId)
LeaveSession(string sessionId)
SendHeartbeat()
```

### 5. Data Flow Examples

#### 5.1 Starting a Session and Sending Command

1. Mobile: `POST /api/session/start` with repository path
2. Backend: Creates session, spawns Copilot CLI process
3. Backend: Returns session ID
4. Mobile: Connects to SignalR hub, calls `JoinSession(sessionId)`
5. Mobile: `POST /api/session/{id}/command` with command text
6. Backend: Forwards command to Copilot CLI stdin
7. Backend: Monitors stdout, parses output
8. Backend: Sends `OnMessageReceived` events via SignalR as output arrives
9. Backend: If question detected, sends `OnQuestionPending` + push notification
10. Mobile: Displays notification, user opens app
11. Mobile: `POST /api/session/{id}/respond` with answer
12. Backend: Forwards answer to Copilot CLI stdin
13. Backend: Continues monitoring until task complete
14. Backend: Sends `OnTaskCompleted` + push notification

#### 5.2 Handling Network Disconnection

1. Mobile: Loses network connection
2. SignalR: Connection dropped
3. Backend: Continues processing Copilot CLI
4. Backend: Queues SignalR events in session state
5. Mobile: Reconnects to network
6. Mobile: SignalR auto-reconnects
7. Mobile: Calls `GET /api/session/{id}/status` to sync state
8. Backend: Replays queued events
9. Mobile: UI updates with missed messages

### 6. Security Considerations

**Authentication:**
- Simple token-based auth for MVP (API key in headers)
- Future: OAuth, JWT tokens, or device-specific certificates

**Network Security:**
- HTTPS/WSS only (no plaintext)
- Consider ngrok, Tailscale, or Cloudflare Tunnel for external access
- Firewall rules to limit access to local network

**Authorization:**
- Single user system (no multi-tenant for MVP)
- Session isolation (one active session at a time)
- Rate limiting on API endpoints

### 7. Deployment Architecture

**Development:**
- Backend: `dotnet run` on local machine
- Mobile: Debug on physical device via USB or WiFi debugging
- Use local network IP address for backend URL

**Production:**
- Backend: Run as Windows Service or systemd daemon
- Mobile: Distribute via TestFlight (iOS) or internal testing (Android)
- Use dynamic DNS or tunnel service for stable endpoint

### 8. Technology Choices Rationale

**Why .NET MAUI Blazor Hybrid?**
- Single codebase for iOS and Android
- Leverage existing MudBlazor knowledge
- Share UI components with potential web version
- Native performance for notifications and platform features

**Why SignalR?**
- Real-time bidirectional communication
- Automatic reconnection handling
- Built-in support in .NET ecosystem
- Scales well for single-user scenarios

**Why Local Backend?**
- No GitHub Actions costs
- Direct access to local repository
- No code upload to cloud services
- Low latency for file operations

**Why Process Wrapping GitHub Copilot CLI?**
- Leverage existing Copilot subscription
- No need to implement LLM integration
- Access to latest Copilot features
- Familiar Copilot behavior and quality

### 9. Scalability and Performance

**Current Design (MVP):**
- Single user
- Single active session
- In-memory session state
- Direct CLI process management

**Future Enhancements:**
- Multi-user support with authentication
- Multiple concurrent sessions
- Persistent session storage (database)
- Distributed architecture with message queue
- Session recording and playback

### 10. Error Handling and Resilience

**Critical Failure Scenarios:**

1. **Copilot CLI Crash:**
   - Detect process exit
   - Attempt restart with session context
   - Notify user of interruption

2. **Network Failure:**
   - SignalR auto-reconnection
   - REST API retry with exponential backoff
   - Queue operations offline, sync when connected

3. **Backend Crash:**
   - Copilot CLI process orphaned (cleanup on restart)
   - Session state lost (acceptable for MVP)
   - Future: Persist state to disk/database

4. **Mobile App Crash:**
   - Session continues on backend
   - Reconnect and sync state on restart

### 11. Monitoring and Diagnostics

**Logging Strategy:**
- Structured logging (Serilog)
- Log levels: Trace (CLI I/O), Debug, Info, Warning, Error, Critical
- Log sinks: Console, File, Optional: Seq/Application Insights

**Health Checks:**
- `/api/health` endpoint
- Check Copilot CLI process status
- Check repository accessibility
- Check notification service connectivity

**Metrics to Track:**
- Session duration
- Command processing time
- Notification delivery success rate
- SignalR connection uptime
- CLI process restarts

### 12. Development Workflow

**Prerequisites:**
- .NET 10 SDK
- Visual Studio 2025 or Rider
- GitHub CLI with Copilot installed and authenticated
- Android SDK (for Android development)
- Xcode (for iOS development, macOS only)

**Setup Steps:**
1. Clone repository
2. Run `dotnet restore` in backend project
3. Configure `appsettings.Development.json` with paths
4. Run backend: `dotnet run`
5. Set backend URL in mobile app configuration
6. Deploy mobile app to device
7. Test end-to-end workflow

**Testing Strategy:**
- Unit tests for output parser
- Integration tests for CLI wrapper
- Manual testing on physical devices
- Test network resilience (airplane mode)
- Test notification delivery

### 13. Future Considerations

**Potential Enhancements:**
- Web UI using same Blazor components
- Desktop app (Windows/macOS) for larger screens
- Voice commands via mobile device
- File diff visualization on mobile
- Support for multiple Copilot modes (chat, agent, code review)
- Session templates and saved commands
- Analytics and usage statistics
- Multi-repository support with quick switching
