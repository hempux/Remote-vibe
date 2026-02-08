using Serilog;
using RemoteVibe.Backend.Services;
using RemoteVibe.Backend.Hubs;

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/remotevibe-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // Use Serilog
    builder.Host.UseSerilog();

    // Add services to the container
    builder.Services.AddControllers();
    builder.Services.AddSignalR();
    builder.Services.AddOpenApi();
    builder.Services.AddHttpClient();

    // Register application services
    builder.Services.AddSingleton<ISessionManager, SessionManager>();
    builder.Services.AddSingleton<ICopilotCliService, CopilotCliService>();
    builder.Services.AddSingleton<INotificationService, NotificationService>();

    // Configure CORS for SignalR
    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
    });

    var app = builder.Build();

    // Configure the HTTP request pipeline
    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }

    app.UseSerilogRequestLogging();
    app.UseCors();
    
    // Only use HTTPS redirection in production
    if (!app.Environment.IsDevelopment())
    {
        app.UseHttpsRedirection();
    }
    
    app.MapControllers();
    app.MapHub<CopilotHub>("/hubs/remotevibe"); // Match mobile app expectation

    Log.Information("Remote Vibe Backend starting...");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
