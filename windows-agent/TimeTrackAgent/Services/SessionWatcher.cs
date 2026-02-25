using Microsoft.Extensions.Logging;
using Microsoft.Win32;

namespace TimeTrackAgent.Services;

public class SessionWatcher
{
    private readonly ILogger<SessionWatcher> _logger;

    public event EventHandler? SessionLocked;
    public event EventHandler? SessionUnlocked;

    public SessionWatcher(ILogger<SessionWatcher> logger)
    {
        _logger = logger;
    }

    public void Start()
    {
        SystemEvents.SessionSwitch += OnSessionSwitch;
        _logger.LogInformation("SessionWatcher started — listening for lock/unlock events");
    }

    public void Stop()
    {
        SystemEvents.SessionSwitch -= OnSessionSwitch;
        _logger.LogInformation("SessionWatcher stopped");
    }

    private void OnSessionSwitch(object sender, SessionSwitchEventArgs e)
    {
        switch (e.Reason)
        {
            case SessionSwitchReason.SessionLock:
                _logger.LogInformation("Session locked detected");
                SessionLocked?.Invoke(this, EventArgs.Empty);
                break;

            case SessionSwitchReason.SessionUnlock:
                _logger.LogInformation("Session unlock detected");
                SessionUnlocked?.Invoke(this, EventArgs.Empty);
                break;
        }
    }
}
