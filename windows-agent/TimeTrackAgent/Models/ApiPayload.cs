namespace TimeTrackAgent.Models;

public class ApiPayload
{
    public string Action { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public object? Data { get; set; }
}

public class ApiResponse
{
    public bool Success { get; set; }
    public string? Message { get; set; }
}
