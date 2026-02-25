using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TimeTrackAgent.Models;
using TimeTrackAgent.Services;

namespace TimeTrackAgent;

public class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;
    private readonly ApiClient _apiClient;
    private readonly IdleDetector _idleDetector;
    private readonly ScreenshotCapture _screenshotCapture;
    private readonly SessionWatcher _sessionWatcher;
    private readonly LockScreenManager _lockScreenManager;
    private readonly AgentConfig _config;

    private bool _isIdle;
    private DateTime _lastScreenshot = DateTime.MinValue;

    public Worker(
        ILogger<Worker> logger,
        ApiClient apiClient,
        IdleDetector idleDetector,
        ScreenshotCapture screenshotCapture,
        SessionWatcher sessionWatcher,
        LockScreenManager lockScreenManager,
        IOptions<AgentConfig> config)
    {
        _logger = logger;
        _apiClient = apiClient;
        _idleDetector = idleDetector;
        _screenshotCapture = screenshotCapture;
        _sessionWatcher = sessionWatcher;
        _lockScreenManager = lockScreenManager;
        _config = config.Value;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("TimeTrackAgent started at {Time}", DateTimeOffset.Now);

        // Subscribe to session events
        _sessionWatcher.SessionLocked += async (_, _) =>
        {
            _isIdle = true;
            await _apiClient.SendAsync("idle_start", new { source = "session_lock" });
            _logger.LogInformation("Session locked — idle_start sent");
        };

        _sessionWatcher.SessionUnlocked += async (_, _) =>
        {
            _isIdle = false;
            await _apiClient.SendAsync("idle_end", new { source = "session_unlock" });
            _logger.LogInformation("Session unlocked — idle_end sent");
        };

        _sessionWatcher.Start();

        // Main loop — checks idle and captures screenshots
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var idleSeconds = _idleDetector.GetIdleSeconds();

                // Idle threshold exceeded — lock screen
                if (!_isIdle && idleSeconds >= _config.IdleThresholdSeconds)
                {
                    _isIdle = true;
                    await _apiClient.SendAsync("idle_start", new { idle_seconds = idleSeconds, source = "input_timeout" });
                    _lockScreenManager.Lock();
                    _logger.LogInformation("Idle threshold reached ({Seconds}s) — screen locked", idleSeconds);
                }
                else if (_isIdle && idleSeconds < 10)
                {
                    // User came back (detected by input before session unlock fires)
                    _isIdle = false;
                    await _apiClient.SendAsync("idle_end", new { source = "input_resumed" });
                    _logger.LogInformation("Input resumed — idle_end sent");
                }

                // Screenshot capture (skip while idle)
                if (!_isIdle && (DateTime.UtcNow - _lastScreenshot).TotalSeconds >= _config.ScreenshotIntervalSeconds)
                {
                    var base64 = _screenshotCapture.CaptureAsBase64();
                    if (base64 != null)
                    {
                        await _apiClient.SendAsync("screenshot", new { image = base64 });
                        _lastScreenshot = DateTime.UtcNow;
                        _logger.LogInformation("Screenshot captured and sent");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in main loop");
            }

            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }

        _sessionWatcher.Stop();
        _logger.LogInformation("TimeTrackAgent stopped");
    }
}
