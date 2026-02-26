using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TimeTrackAgent.Models;

namespace TimeTrackAgent.Services;

public class ApiClient
{
    private readonly HttpClient _http;
    private readonly AgentConfig _config;
    private readonly ILogger<ApiClient> _logger;
    private readonly JsonSerializerOptions _jsonOptions;

    public ApiClient(IOptions<AgentConfig> config, ILogger<ApiClient> logger)
    {
        _config = config.Value;
        _logger = logger;

        _http = new HttpClient
        {
            BaseAddress = new Uri(_config.ApiUrl),
            Timeout = TimeSpan.FromSeconds(30)
        };
        _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_config.ApiKey}");

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };
    }

    public async Task<bool> SendAsync(string action, object? data = null)
    {
        var response = await SendWithResponseAsync<object>(action, data);
        return response != null;
    }

    public async Task<T?> SendWithResponseAsync<T>(string action, object? data = null) where T : class
    {
        var payload = new ApiPayload
        {
            Action = action,
            UserId = _config.UserId,
            Data = data
        };

        for (int attempt = 1; attempt <= 3; attempt++)
        {
            try
            {
                var response = await _http.PostAsJsonAsync("", payload, _jsonOptions);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogDebug("API call '{Action}' succeeded (attempt {Attempt})", action, attempt);

                    try
                    {
                        var body = await response.Content.ReadFromJsonAsync<ApiResponseWrapper<T>>(_jsonOptions);
                        return body?.Data;
                    }
                    catch
                    {
                        return null;
                    }
                }

                _logger.LogWarning("API call '{Action}' returned {Status} (attempt {Attempt})",
                    action, response.StatusCode, attempt);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "API call '{Action}' failed (attempt {Attempt})", action, attempt);
            }

            if (attempt < 3)
                await Task.Delay(TimeSpan.FromSeconds(attempt * 2));
        }

        _logger.LogError("API call '{Action}' failed after 3 attempts", action);
        return null;
    }
}

public class ApiResponseWrapper<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
}
