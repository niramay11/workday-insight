using System.Runtime.InteropServices;
using Microsoft.Extensions.Logging;

namespace TimeTrackAgent.Services;

public class LockScreenManager
{
    private readonly ILogger<LockScreenManager> _logger;

    [DllImport("user32.dll", EntryPoint = "LockWorkStation")]
    private static extern bool NativeLockWorkStation();

    public LockScreenManager(ILogger<LockScreenManager> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Forces the Windows lock screen to appear.
    /// </summary>
    public void Lock()
    {
        try
        {
            if (NativeLockWorkStation())
            {
                _logger.LogInformation("Workstation locked successfully");
            }
            else
            {
                _logger.LogWarning("LockWorkStation returned false");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to lock workstation");
        }
    }
}
