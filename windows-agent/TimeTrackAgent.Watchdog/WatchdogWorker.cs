using System.ServiceProcess;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace TimeTrackAgent.Watchdog;

public class WatchdogWorker : BackgroundService
{
    private const string TargetServiceName = "TimeTrackAgent";
    private readonly ILogger<WatchdogWorker> _logger;

    public WatchdogWorker(ILogger<WatchdogWorker> logger)
    {
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Watchdog started — monitoring '{Service}'", TargetServiceName);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var sc = new ServiceController(TargetServiceName);

                if (sc.Status != ServiceControllerStatus.Running)
                {
                    _logger.LogWarning("'{Service}' is {Status} — attempting restart", TargetServiceName, sc.Status);

                    if (sc.Status == ServiceControllerStatus.Stopped)
                    {
                        sc.Start();
                        sc.WaitForStatus(ServiceControllerStatus.Running, TimeSpan.FromSeconds(30));
                        _logger.LogInformation("'{Service}' restarted successfully", TargetServiceName);
                    }
                }
            }
            catch (InvalidOperationException)
            {
                _logger.LogError("Service '{Service}' not found on this machine", TargetServiceName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking/restarting '{Service}'", TargetServiceName);
            }

            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }
}
