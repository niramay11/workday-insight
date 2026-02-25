namespace TimeTrackAgent.Models;

public class AgentConfig
{
    public string ApiUrl { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public int ScreenshotIntervalSeconds { get; set; } = 300;
    public int IdleThresholdSeconds { get; set; } = 600;
}
