

## Enhanced Windows Agent: Auto Punch-In/Out with Desktop Popup

### The Challenge

The current agent is a **headless Windows Service** running under `LocalSystem`. Windows Services cannot display UI to the logged-in user's desktop (Session 0 isolation since Windows Vista). To show a forced popup, we need a **companion tray/UI app** that runs in the user's session.

### Architecture: Two-Process Design

```text
+----------------------------------+     +----------------------------------+
|   TimeTrackAgent (Service)       |     |   TimeTrackAgent.UI (Tray App)   |
|   Runs as: LocalSystem           |     |   Runs as: Logged-in User        |
|   Session: 0 (no desktop)        |     |   Session: User desktop           |
|                                  |     |                                  |
|   - Idle detection               |     |   - System tray icon             |
|   - Screenshot capture           |     |   - Popup window on unlock       |
|   - Session lock/unlock detect   |     |   - Break label selector         |
|   - Heartbeat to API             |     |   - "Other" with text input      |
|   - Auto punch-out on lock/idle  |     |   - Sends punch_in + break_log   |
|   - Sends idle_start/idle_end    |     |     to API                       |
|                                  |     |                                  |
|   Communicates via:              |<--->|   Reads named pipe / local file  |
|   Named Pipe or local file       |     |   to know when to show popup     |
+----------------------------------+     +----------------------------------+
```

### What Changes

**1. Agent-API (Edge Function) -- Add `punch_in` and `punch_out` actions**

The API already handles `idle_start`, `idle_end`, and `screenshot`. We need to add:
- `punch_in`: Creates an `attendance_records` entry with `status: active` and optional `current_task`
- `punch_out`: Closes the active attendance record (sets `punch_out` timestamp, calculates `total_hours`, sets `status: completed`)
- `log_break`: Creates a `break_logs` entry with `break_type_id` or `custom_reason`
- `get_break_types`: Returns active break type labels so the UI app can show them in the popup

**File:** `supabase/functions/agent-api/index.ts`

**2. Worker.cs -- Auto Punch-Out on Lock/Idle**

Update the Worker to:
- On `SessionLocked` or idle threshold: send `punch_out` action to API (instead of just `idle_start`)
- On `SessionUnlocked`: write a signal file/pipe message so the UI app knows to show the popup
- Keep sending `idle_start`/`idle_end` for tracking, but also trigger the attendance punch-out

**File:** `windows-agent/TimeTrackAgent/Worker.cs`

**3. New Project: TimeTrackAgent.UI (WPF Tray App)**

A lightweight WPF or WinForms application that:
- Starts automatically at user login (via registry Run key or Startup folder, set during install)
- Sits in the system tray with a small icon
- Listens for session unlock events (`SessionSwitch`)
- On unlock: shows a **topmost, non-closable popup window** that:
  - Fetches break types from the API (`get_break_types`)
  - Shows radio buttons for each break label + "Other" option
  - If "Other" is selected, shows a text box for custom reason
  - Has a "Punch In" button
  - On submit: calls the API with `punch_in` (creates attendance) and `log_break` (categorizes the absence)
  - The window cannot be closed, minimized, or moved behind other windows
- Also detects first login of the day (no signal file exists) and shows a simpler "Start Your Workday" popup with just the task input

**New files:**
- `windows-agent/TimeTrackAgent.UI/TimeTrackAgent.UI.csproj`
- `windows-agent/TimeTrackAgent.UI/Program.cs`
- `windows-agent/TimeTrackAgent.UI/App.xaml` + `App.xaml.cs`
- `windows-agent/TimeTrackAgent.UI/MainWindow.xaml` + `MainWindow.xaml.cs` (popup)
- `windows-agent/TimeTrackAgent.UI/Services/ApiClient.cs` (shared API client)
- `windows-agent/TimeTrackAgent.UI/Models/` (shared models)
- `windows-agent/TimeTrackAgent.UI/appsettings.json`

**4. Communication Between Service and UI App**

The service (Session 0) and UI app (user session) communicate via a **named pipe** or a simple **local file signal**:
- Service writes a JSON file to `C:\ProgramData\TimeTrackAgent\state.json` containing:
  ```json
  {
    "last_event": "punch_out",
    "timestamp": "2026-02-26T14:30:00Z",
    "idle_duration_seconds": 650,
    "reason": "idle_timeout"
  }
  ```
- UI app watches this file. When it detects a new `punch_out` event, it shows the popup on unlock
- UI app writes back `"acknowledged": true` after the user submits

**5. ApiClient Enhancement**

Add a `SendAsync<T>` method that returns the API response body (needed for `get_break_types` which returns data).

**File:** `windows-agent/TimeTrackAgent/Services/ApiClient.cs` (update) and replicate in UI project

**6. Install Script Update**

Update `install.ps1` and the download-agent-config function to include:
- The UI app auto-start registry key (`HKCU\Software\Microsoft\Windows\CurrentVersion\Run`)
- Configuration for the UI app

**File:** `supabase/functions/download-agent-config/index.ts`

### Agent-API New Actions (Edge Function)

| Action | What it does |
|--------|-------------|
| `punch_in` | Insert `attendance_records` row with `status: active`, optional `current_task` from payload |
| `punch_out` | Find active record, set `punch_out = now()`, calculate `total_hours`, set `status = completed` |
| `log_break` | Insert `break_logs` row with `break_type_id` or `custom_reason`, `attendance_id`, duration |
| `get_break_types` | Return all active `break_types` rows (labels for the popup) |
| `get_config` | Return admin settings like `idle_threshold_seconds` and `daily_break_allowance_minutes` |

### Flow: Employee Day Start

```text
1. Employee powers on PC and logs in
2. TimeTrackAgent.UI starts (auto-run)
3. UI checks API: any active attendance? No.
4. UI shows topmost popup: "Start Your Workday"
   - Text input: "What will you be working on?"
   - [Punch In] button
5. Employee fills in task, clicks Punch In
6. UI calls API: punch_in { current_task: "..." }
7. Popup closes, tray icon turns green
8. Service starts capturing screenshots, tracking idle
```

### Flow: Idle Lock and Return

```text
1. Employee goes idle for 10 minutes
2. Service detects idle, sends punch_out + idle_start to API
3. Service locks the Windows screen
4. Service writes state.json: { last_event: "punch_out", reason: "idle_timeout" }
5. Employee returns, unlocks PC
6. UI detects unlock, reads state.json, sees punch_out
7. UI shows topmost popup: "Welcome Back - You were away for X minutes"
   - Radio buttons: Tea Break 1, Tea Break 2, Lunch Break, Extra Break
   - "Other" option with text input
   - [Punch In] button
8. Employee selects break type, clicks Punch In
9. UI calls API: log_break { break_type_id/custom_reason, duration } then punch_in { current_task }
10. Popup closes, work tracking resumes
```

### Implementation Order

1. Update `agent-api` edge function with new actions (`punch_in`, `punch_out`, `log_break`, `get_break_types`, `get_config`)
2. Update `Worker.cs` to send `punch_out` on lock/idle and write state file
3. Create `TimeTrackAgent.UI` WPF tray app with popup window
4. Add inter-process communication (state file)
5. Update install script and download-agent-config
6. Update `ApiClient` to support response deserialization

### Technical Notes

- The UI app uses WPF (not WinForms) for a modern-looking popup with XAML styling
- The popup is set as `Topmost = true`, `WindowStyle = None`, `ResizeMode = NoResize`, and intercepts the close event to prevent dismissal
- The tray icon uses `System.Windows.Forms.NotifyIcon` (standard for WPF tray apps)
- The service and UI app share the same `appsettings.json` config file from `C:\ProgramData\TimeTrackAgent\`
- No user-level admin access is needed -- the UI app runs under the standard user account, and the service handles all privileged operations

