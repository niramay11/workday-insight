using System.Windows;

namespace TimeTrackAgent.UI;

public partial class App : Application
{
    private System.Windows.Forms.NotifyIcon? _trayIcon;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        // Create system tray icon
        _trayIcon = new System.Windows.Forms.NotifyIcon
        {
            Text = "TimeTrack Agent",
            Visible = true
        };

        // Use a simple generated icon (green circle)
        using var bmp = new System.Drawing.Bitmap(16, 16);
        using var g = System.Drawing.Graphics.FromImage(bmp);
        g.Clear(System.Drawing.Color.Transparent);
        g.FillEllipse(System.Drawing.Brushes.Green, 2, 2, 12, 12);
        _trayIcon.Icon = System.Drawing.Icon.FromHandle(bmp.GetHicon());

        _trayIcon.DoubleClick += (_, _) =>
        {
            if (MainWindow != null)
            {
                MainWindow.Show();
                MainWindow.Activate();
            }
        };

        // Listen for session unlock
        Microsoft.Win32.SystemEvents.SessionSwitch += OnSessionSwitch;
    }

    private void OnSessionSwitch(object sender, Microsoft.Win32.SessionSwitchEventArgs e)
    {
        if (e.Reason == Microsoft.Win32.SessionSwitchReason.SessionUnlock ||
            e.Reason == Microsoft.Win32.SessionSwitchReason.SessionLogon)
        {
            Dispatcher.Invoke(() =>
            {
                if (MainWindow is MainWindow mw)
                {
                    mw.OnSessionUnlocked();
                }
            });
        }
    }

    protected override void OnExit(ExitEventArgs e)
    {
        _trayIcon?.Dispose();
        Microsoft.Win32.SystemEvents.SessionSwitch -= OnSessionSwitch;
        base.OnExit(e);
    }
}
