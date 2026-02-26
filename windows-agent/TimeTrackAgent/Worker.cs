using System.Text.Json;
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
    private bool _isPunchedOut;
    private DateTime _lastScreenshot = DateTime.MinValue;

    private static readonly string StateDir = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
        "TimeTrackAgent");
    private static readonly string StateFilePath = Path.Combine(StateDir, "state.json");

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

        Directory.CreateDirectory(StateDir);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("TimeTrackAgent started at {Time}", DateTimeOffset.Now);

        // Subscribe to session events
        _sessionWatcher.SessionLocked += async (_, _) =>
        {
            if (!_isPunchedOut)
            {
                _isIdle = true;
                _isPunchedOut = true;
                await _apiClient.SendAsync("idle_start", new { source = "session_lock" });
                await _apiClient.SendAsync("punch_out", new { source = "session_lock" });
                WriteStateFile("punch_out", "session_lock", 0);
                _logger.LogInformation("Session locked — punch_out sent");
            }
        };

        _sessionWatcher.SessionUnlocked += async (_, _) =>
        {
            _isIdle = false;
            await _apiClient.SendAsync("idle_end", new { source = "session_unlock" });
            // Don't clear _isPunchedOut here — UI app will handle punch_in
            // Just signal that unlock happened
            WriteStateFile("session_unlocked", "session_unlock", 0);
            _logger.LogInformation("Session unlocked — idle_end sent, awaiting UI punch_in");
        };

        _sessionWatcher.Start();

        // Main loop
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var idleSeconds = _idleDetector.GetIdleSeconds();

                // Idle threshold exceeded — punch out and lock screen
                if (!_isPunchedOut && idleSeconds >= _config.IdleThresholdSeconds)
                {
                    _isIdle = true;
                    _isPunchedOut = true;
                    await _apiClient.SendAsync("idle_start", new { idle_seconds = idleSeconds, source = "input_timeout" });
                    await _apiClient.SendAsync("punch_out", new { source = "input_timeout", idle_seconds = idleSeconds });
                    WriteStateFile("punch_out", "idle_timeout", idleSeconds);
                    _lockScreenManager.Lock();
                    _logger.LogInformation("Idle threshold reached ({Seconds}s) — punched out and screen locked", idleSeconds);
                }
                else if (_isIdle && !_isPunchedOut && idleSeconds < 10)
                {
                    // Short idle that didn't reach threshold — just mark as resumed
                    _isIdle = false;
                    await _apiClient.SendAsync("idle_end", new { source = "input_resumed" });
                    _logger.LogInformation("Input resumed — idle_end sent");
                }

                // Check if UI app acknowledged punch_in (read state file)
                if (_isPunchedOut)
                {
                    try
                    {
                        if (File.Exists(StateFilePath))
                        {
                            var stateJson = await File.ReadAllTextAsync(StateFilePath, stoppingToken);
                            var state = JsonSerializer.Deserialize<AgentState>(stateJson);
                            if (state?.Acknowledged == true)
                            {
                                _isPunchedOut = false;
                                _isIdle = false;
                                _logger.LogInformation("UI app acknowledged punch_in — resuming monitoring");
                            }
                        }
                    }
                    catch { /* state file may be locked by UI app */ }
                }

                // Screenshot capture (skip while punched out)
                if (!_isPunchedOut && (DateTime.UtcNow - _lastScreenshot).TotalSeconds >= _config.ScreenshotIntervalSeconds)
                {
                    var base64 = _screenshotCapture.CaptureAsBase64();
                    if (base64 != null)
                    {
                        await _apiClient.SendAsync("screenshot", new { image_base64 = base64 });
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

    private void WriteStateFile(string lastEvent, string reason, int idleDurationSeconds)
    {
        try
        {
            var state = new AgentState
            {
                LastEvent = lastEvent,
                Timestamp = DateTime.UtcNow.ToString("o"),
                IdleDurationSeconds = idleDurationSeconds,
                Reason = reason,
                Acknowledged = false
            };

            var json = JsonSerializer.Serialize(state, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
                WriteIndented = true
            });

            File.WriteAllText(StateFilePath, json);
            _logger.LogDebug("State file written: {Event}", lastEvent);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to write state file");
        }
    }
}
