using System.Drawing;
using System.Drawing.Imaging;
using Microsoft.Extensions.Logging;

namespace TimeTrackAgent.Services;

public class ScreenshotCapture
{
    private readonly ILogger<ScreenshotCapture> _logger;

    public ScreenshotCapture(ILogger<ScreenshotCapture> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Captures the primary screen and returns a base64-encoded PNG string.
    /// Returns null if capture fails.
    /// </summary>
    public string? CaptureAsBase64()
    {
        try
        {
            var bounds = System.Windows.Forms.Screen.PrimaryScreen!.Bounds;
            using var bitmap = new Bitmap(bounds.Width, bounds.Height);
            using var graphics = Graphics.FromImage(bitmap);

            graphics.CopyFromScreen(bounds.Location, Point.Empty, bounds.Size);

            using var ms = new MemoryStream();
            bitmap.Save(ms, ImageFormat.Png);
            return Convert.ToBase64String(ms.ToArray());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to capture screenshot");
            return null;
        }
    }
}
