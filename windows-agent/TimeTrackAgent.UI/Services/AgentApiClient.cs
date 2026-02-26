using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using TimeTrackAgent.UI.Models;

namespace TimeTrackAgent.UI.Services;

public class AgentApiClient
{
    private readonly HttpClient _http;
    private readonly string _userId;
    private readonly JsonSerializerOptions _jsonOptions;

    public AgentApiClient(string apiUrl, string apiKey, string userId)
    {
        _userId = userId;
        _http = new HttpClient
        {
            BaseAddress = new Uri(apiUrl),
            Timeout = TimeSpan.FromSeconds(15)
        };
        _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };
    }

    private async Task<T?> PostAsync<T>(string action, object? data = null) where T : class
    {
        var payload = new { action, user_id = _userId, data };
        var response = await _http.PostAsJsonAsync("", payload, _jsonOptions);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<ApiResponse<T>>(_jsonOptions);
        return body?.Data;
    }

    public async Task<StatusResult?> CheckStatusAsync()
    {
        return await PostAsync<StatusResult>("check_status");
    }

    public async Task<List<BreakTypeItem>?> GetBreakTypesAsync()
    {
        return await PostAsync<List<BreakTypeItem>>("get_break_types");
    }

    public async Task PunchInAsync(string? currentTask)
    {
        await PostAsync<object>("punch_in", new { current_task = currentTask });
    }

    public async Task LogBreakAsync(string? breakTypeId, string? customReason, int durationMinutes)
    {
        await PostAsync<object>("log_break", new
        {
            break_type_id = breakTypeId,
            custom_reason = customReason,
            duration_minutes = durationMinutes
        });
    }
}

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
}
