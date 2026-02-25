using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using TimeTrackAgent;
using TimeTrackAgent.Models;
using TimeTrackAgent.Services;

var builder = Host.CreateApplicationBuilder(args);

// Bind configuration
builder.Services.Configure<AgentConfig>(
    builder.Configuration.GetSection("AgentConfig"));

// Register services
builder.Services.AddSingleton<ApiClient>();
builder.Services.AddSingleton<IdleDetector>();
builder.Services.AddSingleton<ScreenshotCapture>();
builder.Services.AddSingleton<SessionWatcher>();
builder.Services.AddSingleton<LockScreenManager>();
builder.Services.AddHostedService<Worker>();

// Enable Windows Service support
builder.Services.AddWindowsService(options =>
{
    options.ServiceName = "TimeTrackAgent";
});

var host = builder.Build();
host.Run();
