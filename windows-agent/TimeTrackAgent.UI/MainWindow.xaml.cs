using System.IO;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using Microsoft.Extensions.Configuration;
using TimeTrackAgent.UI.Models;
using TimeTrackAgent.UI.Services;

namespace TimeTrackAgent.UI;

public partial class MainWindow : Window
{
    private readonly AgentApiClient _apiClient;
    private readonly string _stateFilePath;
    private List<BreakTypeItem> _breakTypes = new();
    private bool _isDayStartMode;
    private int _awayMinutes;

    public MainWindow()
    {
        InitializeComponent();

        // Load config from shared location or local
        var sharedConfigPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            "TimeTrackAgent", "appsettings.json");

        var localConfigPath = Path.Combine(AppContext.BaseDirectory, "appsettings.json");

        var configPath = File.Exists(sharedConfigPath) ? sharedConfigPath : localConfigPath;

        var config = new ConfigurationBuilder()
            .AddJsonFile(configPath, optional: false)
            .Build();

        var agentConfig = config.GetSection("AgentConfig");
        _apiClient = new AgentApiClient(
            agentConfig["ApiUrl"] ?? "",
            agentConfig["ApiKey"] ?? "",
            agentConfig["UserId"] ?? ""
        );

        _stateFilePath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            "TimeTrackAgent", "state.json");

        // Prevent closing with Alt+F4
        Closing += (_, e) =>
        {
            if (IsVisible)
            {
                e.Cancel = true;
            }
        };

        // Check initial state on startup
        Loaded += async (_, _) => await CheckAndShowPopup();
    }

    public async void OnSessionUnlocked()
    {
        await CheckAndShowPopup();
    }

    private async Task CheckAndShowPopup()
    {
        try
        {
            // Check if currently punched in
            var status = await _apiClient.CheckStatusAsync();
            if (status?.PunchedIn == true)
            {
                // Already punched in, hide window
                Hide();
                return;
            }

            // Read state file to determine mode
            AgentState? state = null;
            if (File.Exists(_stateFilePath))
            {
                try
                {
                    var json = await File.ReadAllTextAsync(_stateFilePath);
                    state = JsonSerializer.Deserialize<AgentState>(json, new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
                    });
                }
                catch { /* corrupted state file */ }
            }

            if (state?.LastEvent == "punch_out" && state.Acknowledged != true)
            {
                // Return from break/idle mode
                _isDayStartMode = false;
                _awayMinutes = state.IdleDurationSeconds / 60;
                HeaderText.Text = "Welcome Back!";
                SubHeaderText.Text = $"You were away for {_awayMinutes} minutes. What were you doing?";
                TaskPanel.Visibility = Visibility.Collapsed;
                await LoadBreakTypes();
            }
            else
            {
                // Day start mode
                _isDayStartMode = true;
                HeaderText.Text = "Start Your Workday";
                SubHeaderText.Text = "Good morning! Let's get started.";
                BreakTypePanel.Children.Clear();
                BreakTypePanel.Visibility = Visibility.Collapsed;
                CustomReasonBox.Visibility = Visibility.Collapsed;
                TaskPanel.Visibility = Visibility.Visible;
            }

            Show();
            Activate();
            Topmost = true;
        }
        catch (Exception)
        {
            // If API is unreachable, show day-start mode as fallback
            _isDayStartMode = true;
            HeaderText.Text = "Start Your Workday";
            SubHeaderText.Text = "Good morning! Let's get started.";
            BreakTypePanel.Children.Clear();
            BreakTypePanel.Visibility = Visibility.Collapsed;
            CustomReasonBox.Visibility = Visibility.Collapsed;
            TaskPanel.Visibility = Visibility.Visible;
            Show();
            Activate();
        }
    }

    private async Task LoadBreakTypes()
    {
        _breakTypes = await _apiClient.GetBreakTypesAsync() ?? new List<BreakTypeItem>();

        BreakTypePanel.Children.Clear();
        BreakTypePanel.Visibility = Visibility.Visible;

        foreach (var bt in _breakTypes)
        {
            var rb = new RadioButton
            {
                Content = bt.Name,
                Tag = bt.Id,
                GroupName = "BreakType",
                Style = (Style)FindResource("RadioStyle")
            };
            rb.Checked += (_, _) => CustomReasonBox.Visibility = Visibility.Collapsed;
            BreakTypePanel.Children.Add(rb);
        }

        // Add "Other" option
        var otherRb = new RadioButton
        {
            Content = "Other (specify below)",
            Tag = "other",
            GroupName = "BreakType",
            Style = (Style)FindResource("RadioStyle")
        };
        otherRb.Checked += (_, _) =>
        {
            CustomReasonBox.Visibility = Visibility.Visible;
            CustomReasonBox.Focus();
        };
        BreakTypePanel.Children.Add(otherRb);
    }

    private async void OnSubmitClicked(object sender, RoutedEventArgs e)
    {
        SubmitButton.IsEnabled = false;
        SubmitButton.Content = "Please wait...";

        try
        {
            if (_isDayStartMode)
            {
                // Day start — just punch in
                var task = TaskBox.Text.Trim();
                await _apiClient.PunchInAsync(string.IsNullOrEmpty(task) ? null : task);
            }
            else
            {
                // Return from break — log break then punch in
                string? breakTypeId = null;
                string? customReason = null;

                foreach (var child in BreakTypePanel.Children)
                {
                    if (child is RadioButton rb && rb.IsChecked == true)
                    {
                        var tag = rb.Tag?.ToString();
                        if (tag == "other")
                        {
                            customReason = CustomReasonBox.Text.Trim();
                            if (string.IsNullOrEmpty(customReason))
                            {
                                MessageBox.Show("Please enter a reason.", "Required",
                                    MessageBoxButton.OK, MessageBoxImage.Warning);
                                SubmitButton.IsEnabled = true;
                                SubmitButton.Content = "Punch In";
                                return;
                            }
                        }
                        else
                        {
                            breakTypeId = tag;
                        }
                        break;
                    }
                }

                // Check that something was selected
                if (breakTypeId == null && customReason == null)
                {
                    MessageBox.Show("Please select a break type.", "Required",
                        MessageBoxButton.OK, MessageBoxImage.Warning);
                    SubmitButton.IsEnabled = true;
                    SubmitButton.Content = "Punch In";
                    return;
                }

                await _apiClient.LogBreakAsync(breakTypeId, customReason, _awayMinutes);
                await _apiClient.PunchInAsync(null);
            }

            // Acknowledge in state file so the service knows
            AcknowledgeStateFile();

            Hide();
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Error: {ex.Message}", "Connection Error",
                MessageBoxButton.OK, MessageBoxImage.Error);
        }
        finally
        {
            SubmitButton.IsEnabled = true;
            SubmitButton.Content = "Punch In";
        }
    }

    private void AcknowledgeStateFile()
    {
        try
        {
            if (File.Exists(_stateFilePath))
            {
                var json = File.ReadAllText(_stateFilePath);
                var state = JsonSerializer.Deserialize<AgentState>(json, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
                });

                if (state != null)
                {
                    state.Acknowledged = true;
                    var updated = JsonSerializer.Serialize(state, new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
                        WriteIndented = true
                    });
                    File.WriteAllText(_stateFilePath, updated);
                }
            }
        }
        catch { /* best effort */ }
    }
}
