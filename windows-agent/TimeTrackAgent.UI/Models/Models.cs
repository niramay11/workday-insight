namespace TimeTrackAgent.UI.Models;

public class BreakTypeItem
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public class StatusResult
{
    public bool PunchedIn { get; set; }
    public object? Record { get; set; }
}

public class AgentState
{
    public string LastEvent { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
    public int IdleDurationSeconds { get; set; }
    public string Reason { get; set; } = string.Empty;
    public bool Acknowledged { get; set; }
}
