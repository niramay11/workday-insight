using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using TimeTrackAgent.Watchdog;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddHostedService<WatchdogWorker>();

builder.Services.AddWindowsService(options =>
{
    options.ServiceName = "TimeTrackWatchdog";
});

var host = builder.Build();
host.Run();
