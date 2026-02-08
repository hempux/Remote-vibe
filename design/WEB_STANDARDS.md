# Web Standards - Blazor & MudBlazor Development

## Table of Contents
1. [Blazor Component Structure](#blazor-component-structure)
2. [Component File Organization](#component-file-organization)
3. [Component Best Practices](#component-best-practices)
4. [MudBlazor Component Usage](#mudblazor-component-usage)
5. [MudBlazor Theme Configuration](#mudblazor-theme-configuration)
6. [Blazor Service Layer Patterns](#blazor-service-layer-patterns)
7. [SignalR Integration](#signalr-integration)
8. [State Management](#state-management)
9. [Responsive Design](#responsive-design)
10. [Performance Optimization](#performance-optimization)
11. [Error Handling](#error-handling)
12. [Testing Blazor Components](#testing-blazor-components)
13. [Code Review Checklist](#code-review-checklist)
14. [Professional Examples](#professional-examples)

---

## Blazor Component Structure

### Component Anatomy
Every Blazor component should follow this structure:

```razor
@* 1. Directives and using statements *@
@page "/example"
@using MyApp.Services
@inject IExampleService ExampleService
@implements IDisposable

@* 2. Markup/UI section *@
<MudContainer MaxWidth="MaxWidth.Large">
    <MudText Typo="Typo.h4">@Title</MudText>
    @* Component content *@
</MudContainer>

@code {
    // 3. Code section in this order:
    // - Parameters
    // - Cascading Parameters
    // - Injected Services (from @inject)
    // - Fields and Properties
    // - Lifecycle methods
    // - Event handlers
    // - Helper methods
    // - IDisposable implementation
    
    [Parameter]
    public string Title { get; set; } = string.Empty;
    
    private string _privateField = string.Empty;
    
    protected override async Task OnInitializedAsync()
    {
        await LoadDataAsync();
    }
    
    private async Task LoadDataAsync()
    {
        // Implementation
    }
    
    public void Dispose()
    {
        // Cleanup
    }
}
```

### Component Responsibilities
- **Single Responsibility**: Each component should have one clear purpose
- **Composition**: Break large components into smaller, reusable pieces
- **Presentational vs Container**: Separate UI components from data-fetching logic

---

## Component File Organization

### Directory Structure
```
/Components
  /Shared          # Reusable components across features
    /Layout        # Layout components
    /Common        # Common UI elements (cards, dialogs, etc.)
  /Features        # Feature-specific components
    /Meetings
      MeetingCard.razor
      MeetingList.razor
      MeetingDetails.razor
    /Users
  /Forms           # Form components
  /Charts          # Chart/visualization components
```

### Naming Conventions
- **Components**: PascalCase, descriptive names (e.g., `UserProfileCard.razor`)
- **Parameters**: PascalCase (e.g., `UserId`, `OnItemSelected`)
- **Private fields**: `_camelCase` with underscore prefix
- **Methods**: PascalCase for public, PascalCase for private
- **Events**: Prefix with `On` (e.g., `OnSaveClicked`, `OnDataLoaded`)

### File Organization
- **One component per file** unless tightly coupled child components exist
- **Co-locate CSS** using scoped styles (`ComponentName.razor.css`)
- **Separate complex logic** into code-behind files (`ComponentName.razor.cs`)

```
MeetingCard.razor
MeetingCard.razor.css      # Scoped styles
MeetingCard.razor.cs       # Code-behind (optional)
```

---

## Component Best Practices

### Parameters

#### Declaration and Validation
```csharp
[Parameter]
[EditorRequired] // Mark required parameters
public string UserId { get; set; } = string.Empty;

[Parameter]
public EventCallback<User> OnUserSelected { get; set; }

[Parameter]
public RenderFragment? ChildContent { get; set; }

protected override void OnParametersSet()
{
    // Validate parameters
    if (string.IsNullOrWhiteSpace(UserId))
        throw new ArgumentException("UserId cannot be null or empty");
}
```

#### Parameter Guidelines
- **Use EditorRequired**: For mandatory parameters in .NET 7+
- **Provide defaults**: Initialize with sensible default values
- **Validate in OnParametersSet**: Check parameter validity
- **EventCallback**: Prefer over Action/Func for parameter events
- **CaptureUnmatchedValues**: Use sparingly for wrapper components

```csharp
[Parameter(CaptureUnmatchedValues = true)]
public Dictionary<string, object>? AdditionalAttributes { get; set; }
```

### Cascading Values

#### Providing Values
```csharp
<CascadingValue Value="@currentUser" Name="CurrentUser">
    <Router AppAssembly="@typeof(App).Assembly">
        @* Router content *@
    </Router>
</CascadingValue>
```

#### Consuming Values
```csharp
[CascadingParameter(Name = "CurrentUser")]
public User? CurrentUser { get; set; }

protected override void OnParametersSet()
{
    if (CurrentUser is null)
        throw new InvalidOperationException("CurrentUser is required");
}
```

### Component Disposal

#### Implementing IDisposable
```csharp
@implements IDisposable

@code {
    private Timer? _timer;
    private IDisposable? _subscription;
    
    protected override void OnInitialized()
    {
        _subscription = DataService.Subscribe(OnDataChanged);
        _timer = new Timer(OnTimerElapsed, null, 0, 1000);
    }
    
    public void Dispose()
    {
        _subscription?.Dispose();
        _timer?.Dispose();
    }
}
```

#### Disposal Guidelines
- **Always dispose**: Timers, subscriptions, event handlers, HttpClient instances
- **Unsubscribe events**: Remove event handlers to prevent memory leaks
- **CancellationToken**: Use for async operations
- **IAsyncDisposable**: Use for async cleanup in .NET 6+

```csharp
@implements IAsyncDisposable

private CancellationTokenSource? _cts;

protected override async Task OnInitializedAsync()
{
    _cts = new CancellationTokenSource();
    await LoadDataAsync(_cts.Token);
}

public async ValueTask DisposeAsync()
{
    _cts?.Cancel();
    _cts?.Dispose();
}
```

---

## MudBlazor Component Usage

### Layout Components

#### Standard Page Layout
```razor
<MudContainer MaxWidth="MaxWidth.Large" Class="mt-4">
    <MudPaper Elevation="2" Class="pa-4">
        <MudText Typo="Typo.h4" GutterBottom="true">Page Title</MudText>
        <MudDivider Class="my-4" />
        @* Page content *@
    </MudPaper>
</MudContainer>
```

#### Grid System
```razor
<MudGrid>
    <MudItem xs="12" sm="6" md="4">
        <MudCard>
            <MudCardContent>Card 1</MudCardContent>
        </MudCard>
    </MudItem>
    <MudItem xs="12" sm="6" md="4">
        <MudCard>
            <MudCardContent>Card 2</MudCardContent>
        </MudCard>
    </MudItem>
</MudGrid>
```

### Form Components

#### MudForm with Validation
```razor
<MudForm @ref="_form" @bind-IsValid="@_isValid">
    <MudTextField @bind-Value="_model.Name"
                  Label="Name"
                  Required="true"
                  RequiredError="Name is required"
                  MaxLength="100"
                  Counter="100"
                  Immediate="true" />
    
    <MudTextField @bind-Value="_model.Email"
                  Label="Email"
                  InputType="InputType.Email"
                  Required="true"
                  Validation="@(new EmailAddressAttribute())" />
    
    <MudNumericField @bind-Value="_model.Age"
                     Label="Age"
                     Min="0"
                     Max="150" />
    
    <MudSelect @bind-Value="_model.Category"
               Label="Category"
               Required="true"
               AnchorOrigin="Origin.BottomCenter">
        @foreach (var category in _categories)
        {
            <MudSelectItem Value="@category">@category</MudSelectItem>
        }
    </MudSelect>
    
    <MudButton Variant="Variant.Filled"
               Color="Color.Primary"
               Disabled="@(!_isValid)"
               OnClick="@HandleSubmit">
        Submit
    </MudButton>
</MudForm>

@code {
    private MudForm _form = null!;
    private bool _isValid;
    private FormModel _model = new();
    private string[] _categories = { "Category1", "Category2" };
    
    private async Task HandleSubmit()
    {
        await _form.Validate();
        if (_isValid)
        {
            // Submit logic
        }
    }
}
```

### Data Display Components

#### MudTable with Features
```razor
<MudTable Items="@_items"
          Loading="@_loading"
          Dense="true"
          Hover="true"
          Striped="true"
          Filter="new Func<Item, bool>(FilterFunc)"
          @bind-SelectedItem="_selectedItem">
    <ToolBarContent>
        <MudText Typo="Typo.h6">Items</MudText>
        <MudSpacer />
        <MudTextField @bind-Value="_searchString"
                      Placeholder="Search"
                      Adornment="Adornment.Start"
                      AdornmentIcon="@Icons.Material.Filled.Search"
                      IconSize="Size.Medium"
                      Immediate="true"
                      Class="mt-0" />
    </ToolBarContent>
    <HeaderContent>
        <MudTh>Name</MudTh>
        <MudTh>Status</MudTh>
        <MudTh>Actions</MudTh>
    </HeaderContent>
    <RowTemplate>
        <MudTd DataLabel="Name">@context.Name</MudTd>
        <MudTd DataLabel="Status">
            <MudChip Color="@GetStatusColor(context.Status)" Size="Size.Small">
                @context.Status
            </MudChip>
        </MudTd>
        <MudTd DataLabel="Actions">
            <MudIconButton Icon="@Icons.Material.Filled.Edit"
                          Size="Size.Small"
                          OnClick="@(() => EditItem(context))" />
            <MudIconButton Icon="@Icons.Material.Filled.Delete"
                          Size="Size.Small"
                          Color="Color.Error"
                          OnClick="@(() => DeleteItem(context))" />
        </MudTd>
    </RowTemplate>
</MudTable>
```

### Dialog Components

#### Service-based Dialog
```csharp
@inject IDialogService DialogService

private async Task ShowDialog()
{
    var options = new DialogOptions
    {
        MaxWidth = MaxWidth.Medium,
        FullWidth = true,
        CloseButton = true,
        DisableBackdropClick = true
    };
    
    var parameters = new DialogParameters
    {
        ["Item"] = selectedItem
    };
    
    var dialog = await DialogService.ShowAsync<EditItemDialog>("Edit Item", parameters, options);
    var result = await dialog.Result;
    
    if (!result.Canceled && result.Data is Item updatedItem)
    {
        await UpdateItemAsync(updatedItem);
    }
}
```

#### Dialog Component
```razor
@* EditItemDialog.razor *@
<MudDialog>
    <DialogContent>
        <MudForm @ref="_form" @bind-IsValid="@_isValid">
            <MudTextField @bind-Value="Item.Name" Label="Name" Required="true" />
        </MudForm>
    </DialogContent>
    <DialogActions>
        <MudButton OnClick="Cancel">Cancel</MudButton>
        <MudButton Color="Color.Primary" OnClick="Save" Disabled="@(!_isValid)">Save</MudButton>
    </DialogActions>
</MudDialog>

@code {
    [CascadingParameter]
    MudDialogInstance MudDialog { get; set; } = null!;
    
    [Parameter]
    public Item Item { get; set; } = new();
    
    private MudForm _form = null!;
    private bool _isValid;
    
    private void Cancel() => MudDialog.Cancel();
    
    private void Save() => MudDialog.Close(DialogResult.Ok(Item));
}
```

---

## MudBlazor Theme Configuration

### Theme Setup in Program.cs
```csharp
builder.Services.AddMudServices(config =>
{
    config.SnackbarConfiguration.PositionClass = Defaults.Classes.Position.BottomRight;
    config.SnackbarConfiguration.PreventDuplicates = false;
    config.SnackbarConfiguration.NewestOnTop = true;
    config.SnackbarConfiguration.ShowCloseIcon = true;
    config.SnackbarConfiguration.VisibleStateDuration = 5000;
    config.SnackbarConfiguration.SnackbarVariant = Variant.Filled;
});
```

### Custom Theme Definition
```razor
@* App.razor or MainLayout.razor *@
<MudThemeProvider Theme="_theme" />
<MudDialogProvider />
<MudSnackbarProvider />

@code {
    private MudTheme _theme = new()
    {
        Palette = new PaletteLight
        {
            Primary = "#1976d2",
            Secondary = "#424242",
            AppbarBackground = "#1976d2",
            Background = "#f5f5f5",
            DrawerBackground = "#ffffff",
            DrawerText = "rgba(0,0,0, 0.87)",
            Success = "#4caf50",
            Error = "#f44336",
            Warning = "#ff9800",
            Info = "#2196f3"
        },
        PaletteDark = new PaletteDark
        {
            Primary = "#64b5f6",
            Secondary = "#616161",
            AppbarBackground = "#1e1e1e",
            Background = "#121212",
            DrawerBackground = "#1e1e1e",
            Surface = "#1e1e1e",
            Success = "#66bb6a",
            Error = "#ef5350",
            Warning = "#ffa726",
            Info = "#42a5f5"
        },
        Typography = new Typography
        {
            Default = new Default
            {
                FontFamily = new[] { "Roboto", "Helvetica", "Arial", "sans-serif" }
            }
        },
        LayoutProperties = new LayoutProperties
        {
            DrawerWidthLeft = "260px",
            DrawerWidthRight = "300px",
            AppbarHeight = "64px"
        }
    };
}
```

---

## Blazor Service Layer Patterns

### Service Registration
```csharp
// Program.cs
builder.Services.AddScoped<IMeetingService, MeetingService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddSingleton<IConfigurationService, ConfigurationService>();
```

### Service Interface Pattern
```csharp
public interface IMeetingService
{
    Task<IEnumerable<Meeting>> GetMeetingsAsync(CancellationToken ct = default);
    Task<Meeting?> GetMeetingByIdAsync(string id, CancellationToken ct = default);
    Task<Meeting> CreateMeetingAsync(Meeting meeting, CancellationToken ct = default);
    Task UpdateMeetingAsync(Meeting meeting, CancellationToken ct = default);
    Task DeleteMeetingAsync(string id, CancellationToken ct = default);
    
    event EventHandler<Meeting>? MeetingCreated;
    event EventHandler<Meeting>? MeetingUpdated;
}
```

### Service Implementation
```csharp
public class MeetingService : IMeetingService, IDisposable
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<MeetingService> _logger;
    
    public event EventHandler<Meeting>? MeetingCreated;
    public event EventHandler<Meeting>? MeetingUpdated;
    
    public MeetingService(HttpClient httpClient, ILogger<MeetingService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }
    
    public async Task<IEnumerable<Meeting>> GetMeetingsAsync(CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.GetAsync("api/meetings", ct);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<IEnumerable<Meeting>>(cancellationToken: ct)
                ?? Enumerable.Empty<Meeting>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching meetings");
            throw;
        }
    }
    
    public async Task<Meeting> CreateMeetingAsync(Meeting meeting, CancellationToken ct = default)
    {
        var response = await _httpClient.PostAsJsonAsync("api/meetings", meeting, ct);
        response.EnsureSuccessStatusCode();
        var created = await response.Content.ReadFromJsonAsync<Meeting>(cancellationToken: ct)
            ?? throw new InvalidOperationException("Failed to create meeting");
        
        MeetingCreated?.Invoke(this, created);
        return created;
    }
    
    public void Dispose()
    {
        // Clean up event handlers if needed
    }
}
```

---

## SignalR Integration

### Hub Connection Setup
```csharp
public class SignalRService : IAsyncDisposable
{
    private HubConnection? _hubConnection;
    
    public event EventHandler<Meeting>? MeetingUpdated;
    
    public async Task InitializeAsync(string hubUrl)
    {
        _hubConnection = new HubConnectionBuilder()
            .WithUrl(hubUrl)
            .WithAutomaticReconnect()
            .Build();
        
        _hubConnection.On<Meeting>("MeetingUpdated", meeting =>
        {
            MeetingUpdated?.Invoke(this, meeting);
        });
        
        await _hubConnection.StartAsync();
    }
    
    public async Task SendMessageAsync(string method, object data)
    {
        if (_hubConnection?.State == HubConnectionState.Connected)
        {
            await _hubConnection.SendAsync(method, data);
        }
    }
    
    public async ValueTask DisposeAsync()
    {
        if (_hubConnection is not null)
        {
            await _hubConnection.DisposeAsync();
        }
    }
}
```

### Component Integration
```razor
@inject SignalRService SignalR
@implements IAsyncDisposable

@code {
    protected override async Task OnInitializedAsync()
    {
        SignalR.MeetingUpdated += OnMeetingUpdated;
        await SignalR.InitializeAsync("/meetinghub");
    }
    
    private async void OnMeetingUpdated(object? sender, Meeting meeting)
    {
        // Update UI
        await InvokeAsync(StateHasChanged);
    }
    
    public async ValueTask DisposeAsync()
    {
        SignalR.MeetingUpdated -= OnMeetingUpdated;
    }
}
```

---

## State Management

### Local Component State
```csharp
@code {
    private List<Item> _items = new();
    private Item? _selectedItem;
    private bool _isLoading;
    
    protected override async Task OnInitializedAsync()
    {
        _isLoading = true;
        _items = await LoadItemsAsync();
        _isLoading = false;
    }
}
```

### Service-Based State
```csharp
public class AppStateService
{
    private User? _currentUser;
    
    public User? CurrentUser
    {
        get => _currentUser;
        set
        {
            _currentUser = value;
            NotifyStateChanged();
        }
    }
    
    public event Action? OnChange;
    
    private void NotifyStateChanged() => OnChange?.Invoke();
}

// Component usage
@inject AppStateService AppState
@implements IDisposable

protected override void OnInitialized()
{
    AppState.OnChange += StateHasChanged;
}

public void Dispose()
{
    AppState.OnChange -= StateHasChanged;
}
```

### Cascading State
```razor
@* App.razor *@
<CascadingValue Value="@_appState">
    <Router AppAssembly="@typeof(App).Assembly">
        <Found Context="routeData">
            <RouteView RouteData="@routeData" DefaultLayout="@typeof(MainLayout)" />
        </Found>
    </Router>
</CascadingValue>

@code {
    private AppState _appState = new();
}

@* Child Component *@
@code {
    [CascadingParameter]
    public AppState AppState { get; set; } = null!;
}
```

---

## Responsive Design

### MudBlazor Breakpoints
```razor
@* Responsive Grid *@
<MudGrid>
    <MudItem xs="12" sm="6" md="4" lg="3" xl="2">
        <MudCard>Content</MudCard>
    </MudItem>
</MudGrid>

@* Responsive Visibility *@
<MudHidden Breakpoint="Breakpoint.SmAndDown">
    <MudText>Visible on medium screens and up</MudText>
</MudHidden>

<MudHidden Breakpoint="Breakpoint.MdAndUp">
    <MudText>Visible on small screens only</MudText>
</MudHidden>
```

### Breakpoint Service
```razor
@inject IBreakpointService BreakpointService

@code {
    private Breakpoint _currentBreakpoint;
    
    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender)
        {
            var listener = await BreakpointService.Subscribe(breakpoint =>
            {
                _currentBreakpoint = breakpoint;
                InvokeAsync(StateHasChanged);
            });
        }
    }
}
```

### Mobile-First CSS
```css
/* ComponentName.razor.css */

/* Mobile first - base styles */
.container {
    padding: 8px;
    font-size: 14px;
}

/* Tablet and up */
@media (min-width: 768px) {
    .container {
        padding: 16px;
        font-size: 16px;
    }
}

/* Desktop and up */
@media (min-width: 1024px) {
    .container {
        padding: 24px;
        max-width: 1200px;
        margin: 0 auto;
    }
}
```

---

## Performance Optimization

### Virtualization
```razor
<MudVirtualize Items="@_largeList" Context="item">
    <MudListItem>
        <MudText>@item.Name</MudText>
    </MudListItem>
</MudVirtualize>
```

### Lazy Loading
```razor
@* Lazy load component *@
<Suspense>
    <SuspenseContent>
        @if (_shouldLoad)
        {
            <LazyComponent />
        }
    </SuspenseContent>
    <FallbackContent>
        <MudProgressCircular Indeterminate="true" />
    </FallbackContent>
</Suspense>
```

### ShouldRender Optimization
```csharp
protected override bool ShouldRender()
{
    // Only re-render if specific conditions are met
    return _dataChanged || _userInteraction;
}
```

### Debouncing User Input
```razor
<MudTextField @bind-Value="_searchTerm"
              Label="Search"
              Immediate="true"
              DebounceInterval="300"
              OnDebounceIntervalElapsed="@OnSearchChanged" />

@code {
    private async Task OnSearchChanged()
    {
        await SearchAsync(_searchTerm);
    }
}
```

---

## Error Handling

### Error Boundary
```razor
<ErrorBoundary>
    <ChildContent>
        <ComponentThatMightFail />
    </ChildContent>
    <ErrorContent Context="exception">
        <MudAlert Severity="Severity.Error">
            <MudText>An error occurred: @exception.Message</MudText>
            <MudButton OnClick="@context.Recover">Retry</MudButton>
        </MudAlert>
    </ErrorContent>
</ErrorBoundary>
```

### Try-Catch in Components
```csharp
private string? _errorMessage;

private async Task LoadDataAsync()
{
    try
    {
        _errorMessage = null;
        _isLoading = true;
        _data = await DataService.GetDataAsync();
    }
    catch (HttpRequestException ex)
    {
        _errorMessage = "Failed to load data. Please check your connection.";
        _logger.LogError(ex, "Error loading data");
    }
    catch (Exception ex)
    {
        _errorMessage = "An unexpected error occurred.";
        _logger.LogError(ex, "Unexpected error");
    }
    finally
    {
        _isLoading = false;
    }
}
```

### Global Error Handling
```csharp
// Program.cs
builder.Services.AddScoped<IErrorHandler, ErrorHandler>();

public interface IErrorHandler
{
    void HandleError(Exception exception);
}

public class ErrorHandler : IErrorHandler
{
    private readonly ISnackbar _snackbar;
    private readonly ILogger<ErrorHandler> _logger;
    
    public void HandleError(Exception exception)
    {
        _logger.LogError(exception, "Application error");
        
        var message = exception switch
        {
            HttpRequestException => "Network error. Please check your connection.",
            UnauthorizedAccessException => "You don't have permission to perform this action.",
            _ => "An unexpected error occurred."
        };
        
        _snackbar.Add(message, Severity.Error);
    }
}
```

---

## Testing Blazor Components

### bUnit Test Setup
```csharp
using Bunit;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

public class MeetingCardTests : TestContext
{
    [Fact]
    public void MeetingCard_RendersCorrectly()
    {
        // Arrange
        var meeting = new Meeting { Title = "Test Meeting", Date = DateTime.Now };
        Services.AddSingleton<IMeetingService, MockMeetingService>();
        
        // Act
        var cut = RenderComponent<MeetingCard>(parameters => parameters
            .Add(p => p.Meeting, meeting));
        
        // Assert
        cut.Find("h6").TextContent.ShouldBe("Test Meeting");
    }
    
    [Fact]
    public async Task MeetingCard_DeleteButton_CallsService()
    {
        // Arrange
        var mockService = new MockMeetingService();
        Services.AddSingleton<IMeetingService>(mockService);
        var meeting = new Meeting { Id = "123" };
        
        var cut = RenderComponent<MeetingCard>(parameters => parameters
            .Add(p => p.Meeting, meeting));
        
        // Act
        var deleteButton = cut.Find("button.delete-btn");
        await cut.InvokeAsync(() => deleteButton.Click());
        
        // Assert
        Assert.True(mockService.DeleteCalled);
    }
}
```

---

## Code Review Checklist

### Component Review
- [ ] Component has single, clear responsibility
- [ ] Parameters are validated in OnParametersSet
- [ ] Required parameters use [EditorRequired]
- [ ] EventCallback used instead of Action/Func
- [ ] IDisposable implemented if needed
- [ ] No memory leaks (events unsubscribed, timers disposed)
- [ ] CancellationToken used for async operations

### MudBlazor Usage
- [ ] Consistent use of theme colors
- [ ] Proper responsive breakpoints (xs, sm, md, lg, xl)
- [ ] Forms have validation
- [ ] Loading states shown during async operations
- [ ] Dialogs use DialogService pattern
- [ ] Snackbar used for notifications

### Performance
- [ ] Large lists use virtualization
- [ ] Heavy components lazy loaded
- [ ] ShouldRender optimized where needed
- [ ] Input debounced appropriately

### Error Handling
- [ ] Try-catch around async operations
- [ ] User-friendly error messages
- [ ] Errors logged appropriately
- [ ] Error boundaries used for component isolation

---

## Professional Examples

### Complete CRUD Component
```razor
@page "/meetings"
@inject IMeetingService MeetingService
@inject IDialogService DialogService
@inject ISnackbar Snackbar
@implements IAsyncDisposable

<MudContainer MaxWidth="MaxWidth.Large" Class="mt-4">
    <MudPaper Elevation="2" Class="pa-4">
        <MudStack Row="true" Justify="Justify.SpaceBetween" AlignItems="AlignItems.Center">
            <MudText Typo="Typo.h4">Meetings</MudText>
            <MudButton Variant="Variant.Filled"
                      Color="Color.Primary"
                      StartIcon="@Icons.Material.Filled.Add"
                      OnClick="@CreateMeeting">
                Create Meeting
            </MudButton>
        </MudStack>
        
        <MudDivider Class="my-4" />
        
        @if (_isLoading)
        {
            <MudProgressLinear Indeterminate="true" />
        }
        else if (_errorMessage is not null)
        {
            <MudAlert Severity="Severity.Error">@_errorMessage</MudAlert>
        }
        else
        {
            <MudTable Items="@_meetings"
                     Dense="true"
                     Hover="true"
                     Filter="new Func<Meeting, bool>(FilterMeeting)">
                <ToolBarContent>
                    <MudTextField @bind-Value="_searchString"
                                 Placeholder="Search meetings"
                                 Adornment="Adornment.Start"
                                 AdornmentIcon="@Icons.Material.Filled.Search"
                                 IconSize="Size.Medium"
                                 Immediate="true"
                                 DebounceInterval="300"
                                 Class="mt-0" />
                </ToolBarContent>
                <HeaderContent>
                    <MudTh>Title</MudTh>
                    <MudTh>Date</MudTh>
                    <MudTh>Participants</MudTh>
                    <MudTh>Status</MudTh>
                    <MudTh>Actions</MudTh>
                </HeaderContent>
                <RowTemplate>
                    <MudTd DataLabel="Title">@context.Title</MudTd>
                    <MudTd DataLabel="Date">@context.Date.ToString("g")</MudTd>
                    <MudTd DataLabel="Participants">@context.ParticipantCount</MudTd>
                    <MudTd DataLabel="Status">
                        <MudChip Size="Size.Small" Color="@GetStatusColor(context.Status)">
                            @context.Status
                        </MudChip>
                    </MudTd>
                    <MudTd DataLabel="Actions">
                        <MudIconButton Icon="@Icons.Material.Filled.Edit"
                                      Size="Size.Small"
                                      OnClick="@(() => EditMeeting(context))" />
                        <MudIconButton Icon="@Icons.Material.Filled.Delete"
                                      Size="Size.Small"
                                      Color="Color.Error"
                                      OnClick="@(() => DeleteMeeting(context))" />
                    </MudTd>
                </RowTemplate>
            </MudTable>
        }
    </MudPaper>
</MudContainer>

@code {
    private List<Meeting> _meetings = new();
    private bool _isLoading;
    private string? _errorMessage;
    private string _searchString = string.Empty;
    private CancellationTokenSource? _cts;
    
    protected override async Task OnInitializedAsync()
    {
        _cts = new CancellationTokenSource();
        await LoadMeetingsAsync();
        MeetingService.MeetingUpdated += OnMeetingUpdated;
    }
    
    private async Task LoadMeetingsAsync()
    {
        try
        {
            _isLoading = true;
            _errorMessage = null;
            _meetings = (await MeetingService.GetMeetingsAsync(_cts!.Token)).ToList();
        }
        catch (Exception ex)
        {
            _errorMessage = "Failed to load meetings. Please try again.";
        }
        finally
        {
            _isLoading = false;
        }
    }
    
    private async Task CreateMeeting()
    {
        var dialog = await DialogService.ShowAsync<CreateMeetingDialog>("Create Meeting");
        var result = await dialog.Result;
        
        if (!result.Canceled && result.Data is Meeting meeting)
        {
            await MeetingService.CreateMeetingAsync(meeting, _cts!.Token);
            Snackbar.Add("Meeting created successfully", Severity.Success);
            await LoadMeetingsAsync();
        }
    }
    
    private async Task EditMeeting(Meeting meeting)
    {
        var parameters = new DialogParameters { ["Meeting"] = meeting };
        var dialog = await DialogService.ShowAsync<EditMeetingDialog>("Edit Meeting", parameters);
        var result = await dialog.Result;
        
        if (!result.Canceled)
        {
            await MeetingService.UpdateMeetingAsync(meeting, _cts!.Token);
            Snackbar.Add("Meeting updated successfully", Severity.Success);
        }
    }
    
    private async Task DeleteMeeting(Meeting meeting)
    {
        var confirmed = await DialogService.ShowMessageBox(
            "Confirm Delete",
            $"Are you sure you want to delete '{meeting.Title}'?",
            yesText: "Delete", cancelText: "Cancel");
        
        if (confirmed == true)
        {
            await MeetingService.DeleteMeetingAsync(meeting.Id, _cts!.Token);
            Snackbar.Add("Meeting deleted successfully", Severity.Success);
            await LoadMeetingsAsync();
        }
    }
    
    private void OnMeetingUpdated(object? sender, Meeting meeting)
    {
        var index = _meetings.FindIndex(m => m.Id == meeting.Id);
        if (index >= 0)
        {
            _meetings[index] = meeting;
            InvokeAsync(StateHasChanged);
        }
    }
    
    private bool FilterMeeting(Meeting meeting)
    {
        if (string.IsNullOrWhiteSpace(_searchString))
            return true;
        
        return meeting.Title.Contains(_searchString, StringComparison.OrdinalIgnoreCase);
    }
    
    private Color GetStatusColor(MeetingStatus status) => status switch
    {
        MeetingStatus.Scheduled => Color.Info,
        MeetingStatus.InProgress => Color.Warning,
        MeetingStatus.Completed => Color.Success,
        MeetingStatus.Cancelled => Color.Error,
        _ => Color.Default
    };
    
    public async ValueTask DisposeAsync()
    {
        MeetingService.MeetingUpdated -= OnMeetingUpdated;
        _cts?.Cancel();
        _cts?.Dispose();
    }
}
```

---

## Additional Resources

- [Blazor Documentation](https://learn.microsoft.com/en-us/aspnet/core/blazor/)
- [MudBlazor Documentation](https://mudblazor.com/)
- [bUnit Documentation](https://bunit.dev/)
- [Blazor University](https://blazor-university.com/)

---

*Last Updated: 2024*
*Version: 1.0*
