

## Replace Python Desktop Agent with C# (.NET) Windows Service

This plan replaces the existing Python-based desktop agent with a C# (.NET) Windows Service. The backend API remains unchanged -- the new agent communicates with the same `agent-api` endpoint. The web dashboard's Settings page will be updated to reflect the new installation process.

---

### What Changes

#### 1. Remove the Python Agent
Delete the entire `desktop-agent/` folder (agent.py, config.py, screenshot.py, idle_detector.py, tray_icon.py, api_client.py, requirements.txt, config.example.json, README.md).

#### 2. Create `windows-agent/` -- C# .NET Windows Service

A new folder at the project root containing a complete C# solution:

```text
windows-agent/
  TimeTrackAgent.sln                -- Solution file
  TimeTrackAgent/
    Program.cs                      -- Entry point, host builder for Windows Service
    Worker.cs                       -- Main background service (orchestrates all modules)
    appsettings.json                -- Configuration (API URL, API key, user ID, intervals)
    TimeTrackAgent.csproj           -- Project file (.NET 8, Windows target)
    Services/
      ApiClient.cs                  -- HttpClient wrapper for agent-api endpoint
      IdleDetector.cs               -- Uses GetLastInputInfo Win32 API for idle tracking
      ScreenshotCapture.cs          -- Uses Graphics.CopyFromScreen for desktop capture
      SessionWatcher.cs             -- Hooks SystemEvents.SessionSwitch for lock/unlock
      LockScreenManager.cs          -- Forces LockWorkStation after idle threshold
    Models/
      AgentConfig.cs                -- Strongly-typed config model
      ApiPayload.cs                 -- Request/response DTOs
  TimeTrackAgent.Watchdog/
    Program.cs                      -- Watchdog service that monitors + restarts main service
    WatchdogWorker.cs               -- Checks if main service is running, restarts if crashed
    TimeTrackAgent.Watchdog.csproj  -- Project file
  README.md                         -- Full setup, build, install, and deployment guide
```

#### Core Features

**Idle Tracking (GetLastInputInfo)**
- Calls `GetLastInputInfo` via P/Invoke every 5 seconds
- When idle exceeds configured threshold (default 10 minutes), sends `idle_start` to API and calls `LockWorkStation` to force-lock the screen

**Session Lock/Unlock Detection**
- Subscribes to `SystemEvents.SessionSwitch`
- On `SessionUnlock`: sends `idle_end` to API and logs the unlock event
- On `SessionLock`: sends `idle_start` to API

**Screenshot Capture**
- Uses `System.Drawing.Graphics.CopyFromScreen` to capture the full desktop
- Compresses to PNG, base64-encodes, sends via `screenshot` action to the existing `agent-api` endpoint
- Configurable interval (default: 5 minutes), skips capture while idle

**API Communication**
- Uses `HttpClient` to POST to the same `agent-api` edge function
- Same payload format: `{ action, user_id, data }` with `Bearer` API key auth
- Handles retries and logs errors

**Watchdog Service**
- A separate Windows Service that polls the main service status every 30 seconds
- If the main service is stopped/crashed, it restarts it automatically
- Both services are installed under LocalSystem account so standard users cannot stop them

#### 3. Update `agent-api` Edge Function

**No changes needed.** The existing API accepts `{ action, user_id, data }` with bearer token auth. The C# agent sends the exact same payloads. Two small additions:

- Add `session_lock` and `session_unlock` as recognized action types (they already pass through as activity log entries, so this is optional and backward-compatible)

#### 4. Update Settings Page (`src/components/SettingsForm.tsx`)

Replace the "Desktop Agent" setup card at the bottom with updated instructions for the C# agent:

- Replace Python instructions with:
  1. Download the `windows-agent/` folder
  2. Build with `dotnet publish -c Release`
  3. Install as Windows Service: `sc create TimeTrackAgent binPath="..." start=auto`
  4. Install watchdog: `sc create TimeTrackWatchdog binPath="..." start=auto`
  5. Configure `appsettings.json` with API URL, API Key, and User ID
  6. Start both services

- Add a note about MSI packaging and GPO/Intune deployment for enterprise rollout

#### 5. No Database Changes

The agent uses the same tables (`attendance_records`, `screenshots`, `idle_events`, `activity_logs`) and the same API endpoint. No schema changes required.

---

### Technical Details

**Target Framework:** .NET 8 with `Microsoft.Extensions.Hosting.WindowsServices`

**Key Win32 APIs (P/Invoke):**
- `GetLastInputInfo` -- idle time tracking
- `LockWorkStation` -- force screen lock
- `SystemEvents.SessionSwitch` -- lock/unlock events

**Configuration (`appsettings.json`):**
```json
{
  "AgentConfig": {
    "ApiUrl": "https://YOUR_PROJECT.supabase.co/functions/v1/agent-api",
    "ApiKey": "YOUR_AGENT_API_KEY",
    "UserId": "YOUR_USER_UUID",
    "ScreenshotIntervalSeconds": 300,
    "IdleThresholdSeconds": 600
  }
}
```

**Tamper Resistance:**
- Runs as LocalSystem -- standard users cannot stop/modify
- Watchdog service auto-restarts crashed main service
- Requires admin/GPO to uninstall
- README includes guidance on revoking local admin rights

**Enterprise Deployment Options (documented in README):**
- MSI package via WiX or Visual Studio Installer
- Active Directory GPO silent push
- Microsoft Intune / Endpoint Manager
- RMM tools (AnyDesk, ConnectWise)

---

### Implementation Order

1. Delete `desktop-agent/` folder
2. Create `windows-agent/` solution with all C# files
3. Create README with build, install, and deployment instructions
4. Update `SettingsForm.tsx` with new agent setup instructions
