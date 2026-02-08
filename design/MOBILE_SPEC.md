# Mobile App Specification

## Project Overview

**Project Name:** RemoteVibe.Mobile  
**Language:** C# 12  
**Framework:** .NET MAUI 10 with Blazor Hybrid  
**UI Framework:** MudBlazor 7.x  
**Platforms:** iOS, Android  
**Purpose:** Remote control interface for AI coding sessions on mobile devices

### Core Responsibilities

1. Provide mobile UI for sending AI commands
2. Display real-time conversation history
3. Handle pending questions and user responses
4. Receive and display push notifications
5. Maintain SignalR connection to backend
6. Platform-specific notification handling

---

## Technology Stack

- **.NET MAUI 10** (Blazor Hybrid)
- **Blazor WebView** for UI rendering
- **MudBlazor 7.x** for UI components
- **SignalR Client** for real-time updates
- **HttpClient** for REST API calls
- **Firebase Cloud Messaging** (Android)
- **APNs** (iOS)

---

## Project Structure

```
RemoteVibe.Mobile/
├── Platforms/
│   ├── Android/
│   │   ├── MainActivity.cs
│   │   ├── MainApplication.cs
│   │   ├── AndroidManifest.xml
│   │   └── Services/
│   │       └── AndroidNotificationService.cs
│   └── iOS/
│       ├── AppDelegate.cs
│       ├── Info.plist
│       └── Services/
│           └── iOSNotificationService.cs
├── Pages/
│   ├── Index.razor                  # Dashboard/home
│   ├── SessionDashboard.razor       # Active session view
│   ├── CommandInput.razor           # Send command form
│   ├── ConversationHistory.razor    # Message list
│   └── PendingQuestions.razor       # Questions awaiting response
├── Components/
│   ├── Layout/
│   │   ├── MainLayout.razor
│   │   └── NavMenu.razor
│   └── Shared/
│       ├── SessionStatusCard.razor
│       ├── MessageItem.razor
│       └── QuestionCard.razor
├── Services/
│   ├── IApiClient.cs                # Interface for backend API
│   ├── ApiClient.cs                 # HTTP client wrapper
│   ├── ISignalRService.cs           # Interface for SignalR
│   ├── SignalRService.cs            # SignalR connection management
│   ├── INotificationService.cs      # Interface for notifications
│   └── NotificationService.cs       # Platform-agnostic notifications
├── Models/
│   ├── Session.cs
│   ├── ConversationMessage.cs
│   ├── PendingQuestion.cs
│   └── SessionStatus.cs
├── ViewModels/ (optional)
│   └── SessionViewModel.cs
├── MauiProgram.cs
├── App.xaml.cs
└── appsettings.json
```

---

## Pages Specification

### 1. Index.razor (Dashboard)

**Purpose:** Landing page showing session status or ability to start new session

```razor
@page "/"
@inject IApiClient ApiClient
@inject ISignalRService SignalR
@inject NavigationManager Nav

<MudContainer MaxWidth="MaxWidth.Large" Class="mt-4">
    <MudText Typo="Typo.h4" Class="mb-4">Remote Vibe</MudText>
    
    @if (_activeSession != null)
    {
        <MudAlert Severity="Severity.Info">
            Active session in progress
            <MudButton OnClick="@(() => Nav.NavigateTo("/session"))">
                Go to Session
            </MudButton>
        </MudAlert>
    }
    else
    {
        <MudCard>
            <MudCardContent>
                <MudTextField @bind-Value="_repositoryPath"
                             Label="Repository Path"
                             Variant="Variant.Outlined"
                             Required="true" />
            </MudCardContent>
            <MudCardActions>
                <MudButton Variant="Variant.Filled"
                          Color="Color.Primary"
                          Disabled="@_isStarting"
                          OnClick="@StartSessionAsync">
                    @if (_isStarting)
                    {
                        <MudProgressCircular Size="Size.Small" Indeterminate="true" />
                        <span>Starting...</span>
                    }
                    else
                    {
                        <span>Start Session</span>
                    }
                </MudButton>
            </MudCardActions>
        </MudCard>
    }
</MudContainer>

@code {
    private Session? _activeSession;
    private string _repositoryPath = "/path/to/repo";
    private bool _isStarting;
    
    protected override async Task OnInitializedAsync()
    {
        await SignalR.ConnectAsync();
        // Check for active session
    }
    
    private async Task StartSessionAsync()
    {
        _isStarting = true;
        try
        {
            _activeSession = await ApiClient.StartSessionAsync(_repositoryPath);
            Nav.NavigateTo("/session");
        }
        catch (Exception ex)
        {
            // Show error
        }
        finally
        {
            _isStarting = false;
        }
    }
}
```

---

### 2. SessionDashboard.razor

**Purpose:** Main session view showing status, messages, and input

```razor
@page "/session"
@inject IApiClient ApiClient
@inject ISignalRService SignalR
@inject ISnackbar Snackbar

<MudContainer MaxWidth="MaxWidth.Large" Class="pa-4">
    <MudGrid>
        <MudItem xs="12">
            <SessionStatusCard Session="@_session" />
        </MudItem>
        
        <MudItem xs="12" md="8">
            <MudPaper Class="pa-4" Style="height: 60vh; overflow-y: auto;">
                <MudText Typo="Typo.h6" Class="mb-2">Conversation</MudText>
                <ConversationHistory Messages="@_messages" />
            </MudPaper>
        </MudItem>
        
        <MudItem xs="12" md="4">
            <MudPaper Class="pa-4">
                <MudText Typo="Typo.h6" Class="mb-2">Pending Questions</MudText>
                <PendingQuestions Questions="@_pendingQuestions"
                                 OnAnswer="@HandleAnswerAsync" />
            </MudPaper>
        </MudItem>
        
        <MudItem xs="12">
            <CommandInput OnCommandSent="@HandleCommandAsync"
                         IsDisabled="@(_session?.Status != SessionStatus.Idle)" />
        </MudItem>
    </MudGrid>
</MudContainer>

@code {
    private Session? _session;
    private List<ConversationMessage> _messages = new();
    private List<PendingQuestion> _pendingQuestions = new();
    
    protected override async Task OnInitializedAsync()
    {
        // Subscribe to SignalR events
        SignalR.OnMessageReceived += HandleMessageReceived;
        SignalR.OnQuestionPending += HandleQuestionPending;
        SignalR.OnSessionStatusChanged += HandleSessionStatusChanged;
        
        // Load initial data
        await LoadSessionDataAsync();
    }
    
    private void HandleMessageReceived(ConversationMessage message)
    {
        _messages.Add(message);
        InvokeAsync(StateHasChanged);
    }
    
    private void HandleQuestionPending(PendingQuestion question)
    {
        _pendingQuestions.Add(question);
        InvokeAsync(StateHasChanged);
        Snackbar.Add("New question requires your input", Severity.Warning);
    }
    
    private async Task HandleCommandAsync(string command)
    {
        try
        {
            await ApiClient.SendCommandAsync(_session!.Id, command);
            Snackbar.Add("Command sent", Severity.Success);
        }
        catch (Exception ex)
        {
            Snackbar.Add($"Error: {ex.Message}", Severity.Error);
        }
    }
    
    private async Task HandleAnswerAsync(string questionId, string answer)
    {
        try
        {
            await ApiClient.RespondToQuestionAsync(_session!.Id, questionId, answer);
            _pendingQuestions.RemoveAll(q => q.Id == questionId);
            Snackbar.Add("Answer submitted", Severity.Success);
        }
        catch (Exception ex)
        {
            Snackbar.Add($"Error: {ex.Message}", Severity.Error);
        }
    }
    
    public void Dispose()
    {
        SignalR.OnMessageReceived -= HandleMessageReceived;
        SignalR.OnQuestionPending -= HandleQuestionPending;
        SignalR.OnSessionStatusChanged -= HandleSessionStatusChanged;
    }
}
```

---

### 3. CommandInput.razor

**Purpose:** Text input for sending commands to AI

```razor
<MudCard>
    <MudCardContent>
        <MudTextField @bind-Value="_command"
                     Label="Enter your command"
                     Variant="Variant.Outlined"
                     Lines="3"
                     Disabled="@IsDisabled"
                     Placeholder="Example: Create a new React component for user profile" />
    </MudCardContent>
    <MudCardActions>
        <MudButton Variant="Variant.Filled"
                  Color="Color.Primary"
                  Disabled="@(IsDisabled || string.IsNullOrWhiteSpace(_command) || _isSending)"
                  OnClick="@SendCommandAsync">
            @if (_isSending)
            {
                <MudProgressCircular Size="Size.Small" Indeterminate="true" />
            }
            else
            {
                <MudIcon Icon="@Icons.Material.Filled.Send" />
            }
            Send
        </MudButton>
    </MudCardActions>
</MudCard>

@code {
    [Parameter] public EventCallback<string> OnCommandSent { get; set; }
    [Parameter] public bool IsDisabled { get; set; }
    
    private string _command = string.Empty;
    private bool _isSending;
    
    private async Task SendCommandAsync()
    {
        _isSending = true;
        try
        {
            await OnCommandSent.InvokeAsync(_command);
            _command = string.Empty;
        }
        finally
        {
            _isSending = false;
        }
    }
}
```

---

### 4. ConversationHistory.razor

**Purpose:** Display chat-like conversation history

```razor
<MudStack Spacing="2">
    @foreach (var message in Messages.OrderBy(m => m.Timestamp))
    {
        <MessageItem Message="@message" />
    }
</MudStack>

@code {
    [Parameter] public List<ConversationMessage> Messages { get; set; } = new();
}
```

---

### 5. PendingQuestions.razor

**Purpose:** Display questions and capture answers

```razor
<MudStack Spacing="2">
    @if (!Questions.Any())
    {
        <MudText Typo="Typo.body2" Color="Color.Secondary">
            No pending questions
        </MudText>
    }
    else
    {
        @foreach (var question in Questions)
        {
            <QuestionCard Question="@question" OnAnswer="@OnAnswer" />
        }
    }
</MudStack>

@code {
    [Parameter] public List<PendingQuestion> Questions { get; set; } = new();
    [Parameter] public EventCallback<(string QuestionId, string Answer)> OnAnswer { get; set; }
}
```

---

## Service Implementations

### ApiClient

**Purpose:** HTTP client for backend REST API

```csharp
public class ApiClient : IApiClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ApiClient> _logger;
    
    public ApiClient(HttpClient httpClient, IConfiguration config, ILogger<ApiClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        
        var baseUrl = config["BackendUrl"] ?? "https://localhost:5002";
        _httpClient.BaseAddress = new Uri(baseUrl);
    }
    
    public async Task<Session> StartSessionAsync(string repositoryPath)
    {
        var response = await _httpClient.PostAsJsonAsync(
            "/api/session/start",
            new { repositoryPath }
        );
        
        response.EnsureSuccessStatusCode();
        
        var result = await response.Content.ReadFromJsonAsync<StartSessionResponse>();
        return result!.Session;
    }
    
    public async Task SendCommandAsync(string sessionId, string command)
    {
        var response = await _httpClient.PostAsJsonAsync(
            $"/api/session/{sessionId}/command",
            new { command }
        );
        
        response.EnsureSuccessStatusCode();
    }
    
    public async Task RespondToQuestionAsync(string sessionId, string questionId, string answer)
    {
        var response = await _httpClient.PostAsJsonAsync(
            $"/api/session/{sessionId}/respond",
            new { questionId, answer }
        );
        
        response.EnsureSuccessStatusCode();
    }
    
    public async Task<SessionStatus> GetSessionStatusAsync(string sessionId)
    {
        var response = await _httpClient.GetAsync(
            $"/api/session/{sessionId}/status"
        );
        
        response.EnsureSuccessStatusCode();
        
        return await response.Content.ReadFromJsonAsync<SessionStatus>()
            ?? throw new InvalidOperationException("Failed to parse response");
    }
}
```

---

### SignalRService

**Purpose:** Manage SignalR connection and events

```csharp
public class SignalRService : ISignalRService, IAsyncDisposable
{
    private readonly HubConnection _hubConnection;
    private readonly ILogger<SignalRService> _logger;
    
    public event Action<Session>? OnSessionStatusChanged;
    public event Action<ConversationMessage>? OnMessageReceived;
    public event Action<PendingQuestion>? OnQuestionPending;
    public event Action<TaskCompletedEvent>? OnTaskCompleted;
    
    public bool IsConnected => _hubConnection.State == HubConnectionState.Connected;
    
    public SignalRService(IConfiguration config, ILogger<SignalRService> logger)
    {
        _logger = logger;
        
        var hubUrl = config["BackendUrl"] + "/hubs/remotevibe";
        
        _hubConnection = new HubConnectionBuilder()
            .WithUrl(hubUrl)
            .WithAutomaticReconnect(new[] 
            { 
                TimeSpan.Zero, 
                TimeSpan.FromSeconds(2), 
                TimeSpan.FromSeconds(5),
                TimeSpan.FromSeconds(10)
            })
            .Build();
        
        RegisterHandlers();
    }
    
    private void RegisterHandlers()
    {
        _hubConnection.On<Session>("OnSessionStatusChanged", session =>
        {
            _logger.LogInformation("Session status changed: {Status}", session.Status);
            OnSessionStatusChanged?.Invoke(session);
        });
        
        _hubConnection.On<ConversationMessage>("OnMessageReceived", message =>
        {
            _logger.LogInformation("Message received: {Content}", message.Content);
            OnMessageReceived?.Invoke(message);
        });
        
        _hubConnection.On<PendingQuestion>("OnQuestionPending", question =>
        {
            _logger.LogInformation("Question pending: {Question}", question.Question);
            OnQuestionPending?.Invoke(question);
        });
        
        _hubConnection.On<TaskCompletedEvent>("OnTaskCompleted", evt =>
        {
            _logger.LogInformation("Task completed: {Summary}", evt.Summary);
            OnTaskCompleted?.Invoke(evt);
        });
    }
    
    public async Task ConnectAsync()
    {
        if (_hubConnection.State == HubConnectionState.Disconnected)
        {
            await _hubConnection.StartAsync();
            _logger.LogInformation("Connected to SignalR hub");
        }
    }
    
    public async Task DisconnectAsync()
    {
        if (_hubConnection.State == HubConnectionState.Connected)
        {
            await _hubConnection.StopAsync();
            _logger.LogInformation("Disconnected from SignalR hub");
        }
    }
    
    public async Task JoinSessionAsync(string sessionId)
    {
        await _hubConnection.InvokeAsync("JoinSession", sessionId);
    }
    
    public async ValueTask DisposeAsync()
    {
        await _hubConnection.DisposeAsync();
    }
}
```

---

### NotificationService (Platform-Agnostic)

**Purpose:** Abstract notification handling

```csharp
public class NotificationService : INotificationService
{
    private readonly IPlatformNotificationService _platformService;
    private readonly ILogger<NotificationService> _logger;
    
    public async Task InitializeAsync()
    {
        await _platformService.RequestPermissionAsync();
        await _platformService.RegisterForNotificationsAsync();
    }
    
    public async Task<string> GetDeviceTokenAsync()
    {
        return await _platformService.GetDeviceTokenAsync();
    }
    
    public void ShowLocalNotification(string title, string body)
    {
        _platformService.ShowLocalNotification(title, body);
    }
}
```

---

## Platform-Specific Implementation

### Android (MainActivity.cs)

```csharp
[Activity(Theme = "@style/Maui.SplashTheme", MainLauncher = true)]
public class MainActivity : MauiAppCompatActivity
{
    protected override void OnCreate(Bundle? savedInstanceState)
    {
        base.OnCreate(savedInstanceState);
        
        // Initialize Firebase
        FirebaseApp.InitializeApp(this);
        
        // Request notification permission (Android 13+)
        if (Build.VERSION.SdkInt >= BuildVersionCodes.Tiramisu)
        {
            RequestPermissions(new[] { Android.Manifest.Permission.PostNotifications }, 0);
        }
    }
}
```

### iOS (AppDelegate.cs)

```csharp
[Register("AppDelegate")]
public class AppDelegate : MauiUIApplicationDelegate
{
    protected override MauiApp CreateMauiApp() => MauiProgram.CreateMauiApp();
    
    public override bool FinishedLaunching(UIApplication app, NSDictionary options)
    {
        // Register for notifications
        UNUserNotificationCenter.Current.RequestAuthorization(
            UNAuthorizationOptions.Alert | UNAuthorizationOptions.Sound | UNAuthorizationOptions.Badge,
            (granted, error) =>
            {
                if (granted)
                {
                    InvokeOnMainThread(() =>
                    {
                        UIApplication.SharedApplication.RegisterForRemoteNotifications();
                    });
                }
            }
        );
        
        return base.FinishedLaunching(app, options);
    }
}
```

---

## MauiProgram.cs

```csharp
public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        
        builder
            .UseMauiApp<App>()
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
            });
        
        // Add Blazor WebView
        builder.Services.AddMauiBlazorWebView();
        
        #if DEBUG
        builder.Services.AddBlazorWebViewDeveloperTools();
        #endif
        
        // Add MudBlazor
        builder.Services.AddMudServices();
        
        // Add HttpClient
        builder.Services.AddHttpClient<IApiClient, ApiClient>();
        
        // Add services
        builder.Services.AddSingleton<ISignalRService, SignalRService>();
        builder.Services.AddSingleton<INotificationService, NotificationService>();
        
        // Platform-specific services
        #if ANDROID
        builder.Services.AddSingleton<IPlatformNotificationService, AndroidNotificationService>();
        #elif IOS
        builder.Services.AddSingleton<IPlatformNotificationService, iOSNotificationService>();
        #endif
        
        return builder.Build();
    }
}
```

---

## Acceptance Criteria

- [ ] App builds for Android without errors
- [ ] App builds for iOS without errors
- [ ] Can start session from mobile
- [ ] Can send commands and see responses
- [ ] Receives real-time updates via SignalR
- [ ] Can answer pending questions
- [ ] Push notifications work on Android
- [ ] Push notifications work on iOS
- [ ] MudBlazor theme applied consistently
- [ ] Responsive design works on phone and tablet
- [ ] Follows WEB_STANDARDS.md for Blazor components
- [ ] No memory leaks during long sessions

---

## Development Setup

```bash
# Install MAUI workload
dotnet workload install maui

# Restore packages
dotnet restore

# Build
dotnet build

# Run on Android
dotnet build -t:Run -f net10.0-android

# Run on iOS (macOS only)
dotnet build -t:Run -f net10.0-ios
```

See WEB_STANDARDS.md for Blazor/MudBlazor standards.
See SHARED_CONTRACTS.md for all DTOs and API contracts.

