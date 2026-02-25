using System.Runtime.InteropServices;

namespace TimeTrackAgent.Services;

public class IdleDetector
{
    [StructLayout(LayoutKind.Sequential)]
    private struct LASTINPUTINFO
    {
        public uint cbSize;
        public uint dwTime;
    }

    [DllImport("user32.dll")]
    private static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);

    /// <summary>
    /// Returns the number of seconds since the last mouse/keyboard input.
    /// </summary>
    public int GetIdleSeconds()
    {
        var info = new LASTINPUTINFO { cbSize = (uint)Marshal.SizeOf<LASTINPUTINFO>() };

        if (!GetLastInputInfo(ref info))
            return 0;

        var idleMillis = (uint)Environment.TickCount - info.dwTime;
        return (int)(idleMillis / 1000);
    }
}
