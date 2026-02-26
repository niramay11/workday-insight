namespace TimeTrackAgent.Models;

public class AgentState
{
    public string LastEvent { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
    public int IdleDurationSeconds { get; set; }
    public string Reason { get; set; } = string.Empty;
    public bool Acknowledged { get; set; }
}
