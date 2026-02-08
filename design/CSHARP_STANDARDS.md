# C# Coding Standards

This document defines the coding standards for professional, maintainable, and idempotent C# code.

## Table of Contents

1. [General Principles](#general-principles)
2. [Code Style and Naming Conventions](#code-style-and-naming-conventions)
3. [File Organization](#file-organization)
4. [Formatting](#formatting)
5. [Modern C# Language Features](#modern-c-language-features)
6. [Async/Await Best Practices](#asyncawait-best-practices)
7. [Dependency Injection](#dependency-injection)
8. [Error Handling and Result Patterns](#error-handling-and-result-patterns)
9. [Logging with Structured Logging](#logging-with-structured-logging)
10. [Testing Considerations](#testing-considerations)
11. [Performance Best Practices](#performance-best-practices)
12. [Idempotency Guidelines](#idempotency-guidelines)
13. [XML Documentation](#xml-documentation)
14. [Code Review Checklist](#code-review-checklist)
15. [.editorconfig and Analyzer Configuration](#editorconfig-and-analyzer-configuration)

---

## General Principles

### SOLID Principles

- **S**ingle Responsibility: Each class should have one reason to change
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Derived classes must be substitutable for base classes
- **I**nterface Segregation: Many specific interfaces are better than one general
- **D**ependency Inversion: Depend on abstractions, not concretions

### DRY (Don't Repeat Yourself)

- Extract common logic into reusable methods, classes, or libraries
- Use inheritance and composition appropriately
- Avoid copy-paste programming

### KISS (Keep It Simple, Stupid)

- Prefer simple solutions over complex ones
- Avoid premature optimization
- Write code that is easy to understand and maintain

### YAGNI (You Aren't Gonna Need It)

- Don't add functionality until it's necessary
- Avoid speculative generality
- Focus on current requirements

### Idempotency

- Operations should produce the same result when executed multiple times
- Critical for distributed systems and retry logic
- See [Idempotency Guidelines](#idempotency-guidelines) for details

---

## Code Style and Naming Conventions

### Naming Conventions

```csharp
// PascalCase for classes, interfaces, methods, properties, events
public class UserService { }
public interface IUserRepository { }
public void ProcessOrder() { }
public string FirstName { get; set; }
public event EventHandler OrderProcessed;

// camelCase for local variables and parameters
public void ProcessUser(int userId)
{
    var userName = GetUserName(userId);
    var isActive = CheckUserStatus(userId);
}

// _camelCase for private fields
private readonly ILogger _logger;
private int _retryCount;

// UPPER_CASE for constants
public const int MAX_RETRY_COUNT = 3;
private const string DEFAULT_CONNECTION_STRING = "Server=localhost";

// Prefix interfaces with 'I'
public interface IEmailService { }

// Use meaningful, descriptive names
// Bad: void Process(int i)
// Good: void ProcessOrder(int orderId)
```

### Type Naming

```csharp
// Use noun or noun phrases for class names
public class OrderProcessor { }
public class PaymentGateway { }

// Use verb phrases for method names
public void SendEmail() { }
public bool ValidateInput() { }
public async Task<Order> GetOrderAsync(int id) { }

// Use adjectives for boolean properties/methods
public bool IsValid { get; set; }
public bool HasPermission() { }
public bool CanExecute { get; }
```

### File Naming

- One class per file (with exceptions for nested/private classes)
- File name must match the class name: `UserService.cs`
- Use PascalCase for file names

---

## File Organization

### Namespace and Using Directives

```csharp
// Using directives at the top, grouped and sorted
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using MyCompany.Core.Entities;
using MyCompany.Core.Interfaces;

namespace MyCompany.Application.Services;

public class UserService
{
    // Class implementation
}
```

### Class Member Order

```csharp
public class UserService
{
    // 1. Constants
    private const int MaxRetryCount = 3;
    
    // 2. Static fields
    private static readonly TimeSpan DefaultTimeout = TimeSpan.FromSeconds(30);
    
    // 3. Fields
    private readonly IUserRepository _userRepository;
    private readonly ILogger<UserService> _logger;
    
    // 4. Constructors
    public UserService(IUserRepository userRepository, ILogger<UserService> logger)
    {
        _userRepository = userRepository;
        _logger = logger;
    }
    
    // 5. Properties
    public int RetryCount { get; set; }
    
    // 6. Events
    public event EventHandler<UserEventArgs>? UserCreated;
    
    // 7. Public methods
    public async Task<User> GetUserAsync(int id)
    {
        // Implementation
    }
    
    // 8. Protected methods
    protected virtual void OnUserCreated(UserEventArgs e)
    {
        UserCreated?.Invoke(this, e);
    }
    
    // 9. Private methods
    private bool ValidateUser(User user)
    {
        // Implementation
    }
}
```

---

## Formatting

### Braces and Indentation

```csharp
// Always use braces, even for single-line statements
if (condition)
{
    DoSomething();
}

// Braces on new line (Allman style)
public void ProcessOrder(Order order)
{
    if (order is null)
    {
        throw new ArgumentNullException(nameof(order));
    }
    
    foreach (var item in order.Items)
    {
        ProcessItem(item);
    }
}

// Use 4 spaces for indentation, not tabs
public class Example
{
    public void Method()
    {
        var data = new[]
        {
            "item1",
            "item2",
            "item3"
        };
    }
}
```

### Line Length and Spacing

```csharp
// Keep lines under 120 characters
// Use blank lines to separate logical blocks
public async Task<Result<Order>> ProcessOrderAsync(int orderId)
{
    var order = await _orderRepository.GetByIdAsync(orderId);
    if (order is null)
    {
        return Result<Order>.NotFound();
    }
    
    var validationResult = await ValidateOrderAsync(order);
    if (!validationResult.IsSuccess)
    {
        return Result<Order>.Failure(validationResult.Error);
    }
    
    await _orderRepository.UpdateAsync(order);
    return Result<Order>.Success(order);
}

// Single space after keywords
if (condition) { }
while (running) { }
for (int i = 0; i < count; i++) { }

// No space before opening parenthesis in method calls
DoSomething(parameter);

// Space after commas
public void Method(int a, int b, int c) { }
```

---

## Modern C# Language Features

### Nullable Reference Types

```csharp
// Enable in .csproj
// <Nullable>enable</Nullable>

// Use nullable annotations
public class UserService
{
    // Non-nullable by default
    public string GetUserName(int userId) { }
    
    // Explicitly nullable
    public string? FindUserName(int userId) { }
    
    // Null-forgiving operator (use sparingly)
    var user = users.FirstOrDefault()!;
    
    // Null-conditional operators
    var length = userName?.Length ?? 0;
    
    // Pattern matching with null checks
    if (user is not null)
    {
        ProcessUser(user);
    }
}
```

### Records

```csharp
// Use records for immutable data transfer objects
public record UserDto(int Id, string Name, string Email);

// Record with validation
public record CreateUserRequest(string Name, string Email)
{
    public CreateUserRequest(string Name, string Email) : this(Name, Email)
    {
        if (string.IsNullOrWhiteSpace(Name))
            throw new ArgumentException("Name is required", nameof(Name));
    }
}

// Record with additional members
public record OrderSummary
{
    public int OrderId { get; init; }
    public decimal Total { get; init; }
    public DateTime CreatedAt { get; init; }
    
    public bool IsRecent => CreatedAt > DateTime.UtcNow.AddDays(-7);
}
```

### Pattern Matching

```csharp
// Type patterns
public decimal CalculateDiscount(Customer customer) => customer switch
{
    PremiumCustomer premium => premium.TotalSpent * 0.15m,
    RegularCustomer regular => regular.TotalSpent * 0.10m,
    NewCustomer => 0m,
    _ => throw new ArgumentException("Unknown customer type")
};

// Property patterns
public string GetPriceCategory(Product product) => product switch
{
    { Price: < 10 } => "Budget",
    { Price: >= 10 and < 50 } => "Standard",
    { Price: >= 50 } => "Premium",
    _ => "Unknown"
};

// Relational patterns
public bool IsValidAge(int age) => age is >= 18 and < 120;
```

### Init-only Properties

```csharp
public class User
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}

// Usage
var user = new User 
{ 
    Id = 1, 
    Name = "John Doe" 
};
// user.Id = 2; // Compilation error
```

### Top-level Statements and File-scoped Namespaces

```csharp
// File-scoped namespaces (C# 10+)
namespace MyCompany.Services;

public class UserService
{
    // Implementation
}
```

---

## Async/Await Best Practices

### General Guidelines

```csharp
// Always use async/await for I/O-bound operations
public async Task<User> GetUserAsync(int id)
{
    return await _userRepository.GetByIdAsync(id);
}

// Append 'Async' suffix to async method names
public async Task<bool> ValidateUserAsync(User user) { }

// Use ConfigureAwait(false) in library code
public async Task<Data> GetDataAsync()
{
    var response = await _httpClient.GetAsync(url).ConfigureAwait(false);
    return await response.Content.ReadAsAsync<Data>().ConfigureAwait(false);
}

// Avoid async void except for event handlers
// Bad
public async void ProcessData() { }

// Good
public async Task ProcessDataAsync() { }

// Exception: Event handlers
private async void Button_Click(object sender, EventArgs e)
{
    try
    {
        await ProcessDataAsync();
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error processing data");
    }
}
```

### Cancellation Tokens

```csharp
// Always accept CancellationToken for long-running operations
public async Task<List<User>> GetUsersAsync(CancellationToken cancellationToken = default)
{
    var users = await _dbContext.Users
        .AsNoTracking()
        .ToListAsync(cancellationToken);
    
    return users;
}

// Pass cancellation tokens through the call chain
public async Task ProcessOrdersAsync(CancellationToken cancellationToken)
{
    var orders = await GetOrdersAsync(cancellationToken);
    
    foreach (var order in orders)
    {
        cancellationToken.ThrowIfCancellationRequested();
        await ProcessOrderAsync(order, cancellationToken);
    }
}
```

### Parallel Operations

```csharp
// Use Task.WhenAll for parallel async operations
public async Task<IEnumerable<User>> GetMultipleUsersAsync(IEnumerable<int> userIds)
{
    var tasks = userIds.Select(id => GetUserAsync(id));
    var users = await Task.WhenAll(tasks);
    return users;
}

// Use SemaphoreSlim for throttling
private readonly SemaphoreSlim _semaphore = new(maxConcurrency: 5);

public async Task ProcessWithThrottlingAsync(IEnumerable<int> items)
{
    var tasks = items.Select(async item =>
    {
        await _semaphore.WaitAsync();
        try
        {
            await ProcessItemAsync(item);
        }
        finally
        {
            _semaphore.Release();
        }
    });
    
    await Task.WhenAll(tasks);
}
```

---

## Dependency Injection

### Constructor Injection

```csharp
// Prefer constructor injection
public class OrderService
{
    private readonly IOrderRepository _orderRepository;
    private readonly IEmailService _emailService;
    private readonly ILogger<OrderService> _logger;
    
    public OrderService(
        IOrderRepository orderRepository,
        IEmailService emailService,
        ILogger<OrderService> logger)
    {
        _orderRepository = orderRepository ?? throw new ArgumentNullException(nameof(orderRepository));
        _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }
}
```

### Service Registration

```csharp
// In Program.cs or Startup.cs
services.AddScoped<IOrderService, OrderService>();
services.AddSingleton<ICacheService, RedisCacheService>();
services.AddTransient<IEmailService, SmtpEmailService>();

// Use options pattern for configuration
services.Configure<EmailOptions>(configuration.GetSection("Email"));

public class EmailService
{
    private readonly EmailOptions _options;
    
    public EmailService(IOptions<EmailOptions> options)
    {
        _options = options.Value;
    }
}
```

---

## Error Handling and Result Patterns

### Result Pattern

```csharp
// Define a Result type
public class Result<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public string? Error { get; }
    
    private Result(bool isSuccess, T? value, string? error)
    {
        IsSuccess = isSuccess;
        Value = value;
        Error = error;
    }
    
    public static Result<T> Success(T value) => new(true, value, null);
    public static Result<T> Failure(string error) => new(false, default, error);
}

// Usage
public async Task<Result<Order>> GetOrderAsync(int orderId)
{
    var order = await _orderRepository.GetByIdAsync(orderId);
    
    if (order is null)
    {
        return Result<Order>.Failure($"Order {orderId} not found");
    }
    
    return Result<Order>.Success(order);
}
```

### Exception Handling

```csharp
// Catch specific exceptions
try
{
    await ProcessOrderAsync(order);
}
catch (ValidationException ex)
{
    _logger.LogWarning(ex, "Validation failed for order {OrderId}", order.Id);
    return Result.Failure(ex.Message);
}
catch (DbUpdateException ex)
{
    _logger.LogError(ex, "Database error processing order {OrderId}", order.Id);
    throw; // Rethrow infrastructure exceptions
}

// Use ArgumentNullException.ThrowIfNull (C# 11+)
public void ProcessUser(User user)
{
    ArgumentNullException.ThrowIfNull(user);
    // Process user
}

// Create custom exceptions
public class OrderNotFoundException : Exception
{
    public int OrderId { get; }
    
    public OrderNotFoundException(int orderId) 
        : base($"Order with ID {orderId} was not found")
    {
        OrderId = orderId;
    }
}
```

---

## Logging with Structured Logging

### ILogger Usage

```csharp
public class OrderService
{
    private readonly ILogger<OrderService> _logger;
    
    public async Task<Result<Order>> ProcessOrderAsync(int orderId)
    {
        // Use log levels appropriately
        _logger.LogInformation("Processing order {OrderId}", orderId);
        
        try
        {
            var order = await _orderRepository.GetByIdAsync(orderId);
            if (order is null)
            {
                _logger.LogWarning("Order {OrderId} not found", orderId);
                return Result<Order>.Failure("Order not found");
            }
            
            // Process order
            _logger.LogInformation(
                "Order {OrderId} processed successfully. Total: {Total:C}", 
                orderId, 
                order.Total);
            
            return Result<Order>.Success(order);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex, 
                "Error processing order {OrderId}", 
                orderId);
            throw;
        }
    }
}
```

### Structured Logging Best Practices

```csharp
// Use semantic logging with named properties
_logger.LogInformation(
    "User {UserId} created order {OrderId} with {ItemCount} items totaling {Total:C}",
    userId, orderId, itemCount, total);

// Don't use string interpolation
// Bad
_logger.LogInformation($"Processing order {orderId}");

// Good
_logger.LogInformation("Processing order {OrderId}", orderId);

// Use log scopes for context
using (_logger.BeginScope("OrderId: {OrderId}", orderId))
{
    _logger.LogInformation("Validating order");
    _logger.LogInformation("Processing payment");
    _logger.LogInformation("Updating inventory");
}
```

---

## Testing Considerations

### Unit Testing

```csharp
[Fact]
public async Task GetUserAsync_ExistingUser_ReturnsUser()
{
    // Arrange
    var userId = 1;
    var expectedUser = new User { Id = userId, Name = "John Doe" };
    var mockRepository = new Mock<IUserRepository>();
    mockRepository
        .Setup(r => r.GetByIdAsync(userId))
        .ReturnsAsync(expectedUser);
    
    var service = new UserService(mockRepository.Object);
    
    // Act
    var result = await service.GetUserAsync(userId);
    
    // Assert
    Assert.NotNull(result);
    Assert.Equal(expectedUser.Id, result.Id);
    Assert.Equal(expectedUser.Name, result.Name);
}

[Theory]
[InlineData(0)]
[InlineData(-1)]
public async Task GetUserAsync_InvalidId_ThrowsArgumentException(int invalidId)
{
    // Arrange
    var service = new UserService(Mock.Of<IUserRepository>());
    
    // Act & Assert
    await Assert.ThrowsAsync<ArgumentException>(() => service.GetUserAsync(invalidId));
}
```

### Testable Code

```csharp
// Make code testable by using interfaces and DI
public interface ISystemClock
{
    DateTime UtcNow { get; }
}

public class OrderService
{
    private readonly ISystemClock _clock;
    
    public OrderService(ISystemClock clock)
    {
        _clock = clock;
    }
    
    public Order CreateOrder()
    {
        return new Order 
        { 
            CreatedAt = _clock.UtcNow 
        };
    }
}
```

---

## Performance Best Practices

### Span<T> and Memory<T>

```csharp
// Use Span<T> for stack-allocated memory operations
public void ProcessData(ReadOnlySpan<byte> data)
{
    foreach (var b in data)
    {
        // Process byte
    }
}

// String manipulation with Span
public ReadOnlySpan<char> GetFileExtension(ReadOnlySpan<char> fileName)
{
    var lastDot = fileName.LastIndexOf('.');
    return lastDot >= 0 ? fileName[(lastDot + 1)..] : ReadOnlySpan<char>.Empty;
}
```

### ValueTask

```csharp
// Use ValueTask for frequently synchronous results
public ValueTask<User?> GetCachedUserAsync(int userId)
{
    if (_cache.TryGetValue(userId, out var user))
    {
        return new ValueTask<User?>(user);
    }
    
    return new ValueTask<User?>(GetUserFromDatabaseAsync(userId));
}

private async Task<User?> GetUserFromDatabaseAsync(int userId)
{
    return await _dbContext.Users.FindAsync(userId);
}
```

### Object Pooling

```csharp
// Use ArrayPool for temporary arrays
public void ProcessLargeData()
{
    var buffer = ArrayPool<byte>.Shared.Rent(1024);
    try
    {
        // Use buffer
        ProcessBuffer(buffer.AsSpan(0, 1024));
    }
    finally
    {
        ArrayPool<byte>.Shared.Return(buffer);
    }
}

// Use ObjectPool for expensive objects
private readonly ObjectPool<StringBuilder> _stringBuilderPool;

public string BuildString()
{
    var sb = _stringBuilderPool.Get();
    try
    {
        sb.Append("Hello");
        sb.Append(" World");
        return sb.ToString();
    }
    finally
    {
        sb.Clear();
        _stringBuilderPool.Return(sb);
    }
}
```

---

## Idempotency Guidelines

### Idempotent Operations

```csharp
// Use idempotency keys for critical operations
public class CreateOrderRequest
{
    public Guid IdempotencyKey { get; set; }
    public List<OrderItem> Items { get; set; }
}

public async Task<Result<Order>> CreateOrderAsync(CreateOrderRequest request)
{
    // Check if operation already completed
    var existingOrder = await _orderRepository
        .GetByIdempotencyKeyAsync(request.IdempotencyKey);
    
    if (existingOrder is not null)
    {
        _logger.LogInformation(
            "Order already exists for idempotency key {IdempotencyKey}", 
            request.IdempotencyKey);
        return Result<Order>.Success(existingOrder);
    }
    
    // Create new order
    var order = new Order
    {
        IdempotencyKey = request.IdempotencyKey,
        Items = request.Items
    };
    
    await _orderRepository.AddAsync(order);
    return Result<Order>.Success(order);
}
```

### State Machines for Complex Operations

```csharp
public enum OrderState
{
    Created,
    PaymentPending,
    PaymentCompleted,
    Shipped,
    Completed,
    Cancelled
}

public async Task<Result> ProcessOrderPaymentAsync(int orderId)
{
    var order = await _orderRepository.GetByIdAsync(orderId);
    
    // Idempotent state transitions
    return order.State switch
    {
        OrderState.Created => await TransitionToPaymentPendingAsync(order),
        OrderState.PaymentPending => await ProcessPaymentAsync(order),
        OrderState.PaymentCompleted => Result.Success(), // Already completed
        _ => Result.Failure($"Cannot process payment for order in {order.State} state")
    };
}
```

---

## XML Documentation

### Documentation Comments

```csharp
/// <summary>
/// Retrieves a user by their unique identifier.
/// </summary>
/// <param name="userId">The unique identifier of the user.</param>
/// <param name="cancellationToken">Cancellation token to cancel the operation.</param>
/// <returns>
/// A task that represents the asynchronous operation.
/// The task result contains the user if found; otherwise, null.
/// </returns>
/// <exception cref="ArgumentException">Thrown when userId is less than or equal to zero.</exception>
public async Task<User?> GetUserAsync(int userId, CancellationToken cancellationToken = default)
{
    if (userId <= 0)
    {
        throw new ArgumentException("User ID must be greater than zero", nameof(userId));
    }
    
    return await _userRepository.GetByIdAsync(userId, cancellationToken);
}

/// <summary>
/// Represents the result of an operation that can succeed or fail.
/// </summary>
/// <typeparam name="T">The type of the value returned on success.</typeparam>
public class Result<T>
{
    // Implementation
}
```

---

## Code Review Checklist

### Before Submitting PR

- [ ] Code follows naming conventions
- [ ] All public APIs have XML documentation
- [ ] Nullable reference types are used correctly
- [ ] No unused using statements or variables
- [ ] Error handling is appropriate
- [ ] Logging includes structured data
- [ ] Async methods use cancellation tokens
- [ ] Unit tests added/updated
- [ ] No hardcoded values (use configuration)
- [ ] Idempotency considered for critical operations
- [ ] Performance implications reviewed
- [ ] No sensitive data in logs or code

### Reviewer Focus Areas

- SOLID principles adherence
- Potential race conditions
- Resource disposal (using/IDisposable)
- Exception handling appropriateness
- Test coverage and quality
- API design and usability
- Security implications
- Breaking changes identified

---

## .editorconfig and Analyzer Configuration

### Sample .editorconfig

```ini
root = true

[*]
charset = utf-8
insert_final_newline = true
trim_trailing_whitespace = true

[*.cs]
indent_style = space
indent_size = 4
end_of_line = crlf

# Organize usings
dotnet_sort_system_directives_first = true
dotnet_separate_import_directive_groups = false

# this. preferences
dotnet_style_qualification_for_field = false:warning
dotnet_style_qualification_for_property = false:warning
dotnet_style_qualification_for_method = false:warning
dotnet_style_qualification_for_event = false:warning

# Language keywords vs framework type names
dotnet_style_predefined_type_for_locals_parameters_members = true:warning
dotnet_style_predefined_type_for_member_access = true:warning

# Parentheses preferences
dotnet_style_parentheses_in_arithmetic_binary_operators = always_for_clarity:suggestion
dotnet_style_parentheses_in_other_binary_operators = always_for_clarity:suggestion
dotnet_style_parentheses_in_relational_binary_operators = always_for_clarity:suggestion

# Modifier preferences
dotnet_style_require_accessibility_modifiers = always:warning
csharp_preferred_modifier_order = public,private,protected,internal,static,extern,new,virtual,abstract,sealed,override,readonly,unsafe,volatile,async:warning

# Expression-level preferences
dotnet_style_object_initializer = true:suggestion
dotnet_style_collection_initializer = true:suggestion
dotnet_style_prefer_auto_properties = true:suggestion
dotnet_style_prefer_inferred_tuple_names = true:suggestion
dotnet_style_prefer_inferred_anonymous_type_member_names = true:suggestion
dotnet_style_prefer_conditional_expression_over_return = false:silent

# Null-checking preferences
dotnet_style_coalesce_expression = true:suggestion
dotnet_style_null_propagation = true:suggestion
csharp_style_throw_expression = true:suggestion
csharp_style_conditional_delegate_call = true:suggestion

# var preferences
csharp_style_var_for_built_in_types = true:suggestion
csharp_style_var_when_type_is_apparent = true:suggestion
csharp_style_var_elsewhere = true:suggestion

# Expression-bodied members
csharp_style_expression_bodied_methods = when_on_single_line:silent
csharp_style_expression_bodied_constructors = false:silent
csharp_style_expression_bodied_operators = when_on_single_line:silent
csharp_style_expression_bodied_properties = when_on_single_line:suggestion
csharp_style_expression_bodied_indexers = when_on_single_line:suggestion
csharp_style_expression_bodied_accessors = when_on_single_line:suggestion

# Pattern matching preferences
csharp_style_pattern_matching_over_is_with_cast_check = true:suggestion
csharp_style_pattern_matching_over_as_with_null_check = true:suggestion
csharp_style_prefer_switch_expression = true:suggestion
csharp_style_prefer_pattern_matching = true:suggestion
csharp_style_prefer_not_pattern = true:suggestion

# Code block preferences
csharp_prefer_braces = true:warning
csharp_prefer_simple_using_statement = true:suggestion

# Namespace preferences
csharp_style_namespace_declarations = file_scoped:warning

# Null checking
csharp_style_prefer_null_check_over_type_check = true:suggestion

# New line preferences
csharp_new_line_before_open_brace = all
csharp_new_line_before_else = true
csharp_new_line_before_catch = true
csharp_new_line_before_finally = true

# Indentation preferences
csharp_indent_case_contents = true
csharp_indent_switch_labels = true
csharp_indent_labels = no_change

# Space preferences
csharp_space_after_cast = false
csharp_space_after_keywords_in_control_flow_statements = true
csharp_space_between_method_call_parameter_list_parentheses = false
csharp_space_between_method_declaration_parameter_list_parentheses = false

# Wrapping preferences
csharp_preserve_single_line_statements = false
csharp_preserve_single_line_blocks = true

# Nullable reference types
dotnet_diagnostic.CS8618.severity = error
dotnet_diagnostic.CS8600.severity = warning
dotnet_diagnostic.CS8602.severity = warning
dotnet_diagnostic.CS8603.severity = warning
```

### Analyzer Configuration

```xml
<!-- In .csproj -->
<PropertyGroup>
  <Nullable>enable</Nullable>
  <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
  <EnableNETAnalyzers>true</EnableNETAnalyzers>
  <AnalysisLevel>latest</AnalysisLevel>
</PropertyGroup>

<ItemGroup>
  <PackageReference Include="Microsoft.CodeAnalysis.NetAnalyzers" Version="8.0.0">
    <PrivateAssets>all</PrivateAssets>
    <IncludeAssets>runtime; build; native; contentfiles; analyzers</IncludeAssets>
  </PackageReference>
  <PackageReference Include="StyleCop.Analyzers" Version="1.2.0-beta.507">
    <PrivateAssets>all</PrivateAssets>
    <IncludeAssets>runtime; build; native; contentfiles; analyzers</IncludeAssets>
  </PackageReference>
</ItemGroup>
```

---

## Conclusion

These standards are living documentation and should evolve with the team's needs and C# language updates. Regular code reviews and team discussions help maintain consistency and improve code quality across projects.
