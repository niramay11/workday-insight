# TimeTrackAgent — C# (.NET 8) Windows Service

A tamper-resistant Windows Service that tracks employee activity (idle time, screenshots, session lock/unlock) and reports to the TimeTrack dashboard via the `agent-api` endpoint.

## Features

- **Idle Tracking** — Detects inactivity via `GetLastInputInfo` Win32 API
- **Auto Screen Lock** — Forces `LockWorkStation` after idle threshold (default: 10 min)
- **Session Detection** — Hooks `SystemEvents.SessionSwitch` for lock/unlock events
- **Screenshot Capture** — Periodic desktop captures sent as base64 PNG
- **Watchdog Service** — Auto-restarts the main service if it crashes
- **Tamper Resistant** — Runs as LocalSystem; standard users cannot stop it

## Prerequisites

- Windows 10/11 or Windows Server 2019+
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) (for building)
- Administrator access (for installation)

## Quick Setup

### 1. Configure

Edit `TimeTrackAgent/appsettings.json`:

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

Get the **API URL** and **API Key** from your dashboard's **Settings** page.

### 2. Build

```powershell
cd windows-agent
dotnet publish TimeTrackAgent -c Release -o ./publish/agent
dotnet publish TimeTrackAgent.Watchdog -c Release -o ./publish/watchdog
```

### 3. Install as Windows Services

Run these commands in an **elevated (Administrator) PowerShell**:

```powershell
# Install main agent service
sc.exe create TimeTrackAgent binPath="C:\path\to\publish\agent\TimeTrackAgent.exe" start=auto obj=LocalSystem

# Install watchdog service
sc.exe create TimeTrackWatchdog binPath="C:\path\to\publish\watchdog\TimeTrackAgent.Watchdog.exe" start=auto obj=LocalSystem

# Start both services
sc.exe start TimeTrackAgent
sc.exe start TimeTrackWatchdog
```

### 4. Verify

```powershell
sc.exe query TimeTrackAgent
sc.exe query TimeTrackWatchdog
```

Both should show `STATE: RUNNING`.

Check Windows Event Viewer → Application logs for `TimeTrackAgent` entries.

## Uninstall

```powershell
sc.exe stop TimeTrackWatchdog
sc.exe stop TimeTrackAgent
sc.exe delete TimeTrackWatchdog
sc.exe delete TimeTrackAgent
```

## Enterprise Deployment

### MSI Package

Use [WiX Toolset](https://wixtoolset.org/) or Visual Studio Installer Projects to create an MSI that:
- Copies binaries to `C:\Program Files\TimeTrackAgent\`
- Registers both Windows Services
- Prompts for API URL, API Key, and User ID during install

### Active Directory (GPO)

1. Build the MSI package
2. Place on a network share accessible to all domain PCs
3. Create a GPO: `Computer Configuration → Software Installation → New Package`
4. Assign to the target OU — installs silently on next reboot

### Microsoft Intune / Endpoint Manager

1. Upload the MSI to Intune as a Line-of-business app
2. Assign to the target device group
3. Devices install the agent on next sync

### RMM Tools

Use AnyDesk, ConnectWise, or similar to run a remote PowerShell script:

```powershell
# Download, extract, install
Invoke-WebRequest -Uri "https://your-server/agent.zip" -OutFile "C:\temp\agent.zip"
Expand-Archive "C:\temp\agent.zip" -DestinationPath "C:\Program Files\TimeTrackAgent"
sc.exe create TimeTrackAgent binPath="C:\Program Files\TimeTrackAgent\agent\TimeTrackAgent.exe" start=auto obj=LocalSystem
sc.exe create TimeTrackWatchdog binPath="C:\Program Files\TimeTrackAgent\watchdog\TimeTrackAgent.Watchdog.exe" start=auto obj=LocalSystem
sc.exe start TimeTrackAgent
sc.exe start TimeTrackWatchdog
```

## Security Hardening

> **Critical:** Revoke Local Administrator rights for all monitored employees. Standard user accounts cannot stop, modify, or uninstall system-level Windows Services.

- Both services run under `LocalSystem` — immune to standard user Task Manager kills
- Watchdog auto-restarts the main service within 30 seconds of a crash
- Consider AppLocker policies to prevent unauthorized executables

## Architecture

```
┌─────────────────────────┐     ┌──────────────────────┐
│   TimeTrackAgent        │     │  TimeTrackWatchdog    │
│   (Windows Service)     │     │  (Windows Service)    │
│                         │     │                       │
│  ┌─────────────────┐   │     │  Monitors + restarts  │
│  │ IdleDetector     │   │     │  TimeTrackAgent if    │
│  │ ScreenshotCapture│   │◄────│  it stops or crashes  │
│  │ SessionWatcher   │   │     │                       │
│  │ LockScreenManager│   │     └──────────────────────┘
│  └────────┬────────┘   │
│           │             │
│  ┌────────▼────────┐   │
│  │   ApiClient      │   │
│  └────────┬────────┘   │
└───────────┼─────────────┘
            │ HTTPS POST
            ▼
   ┌─────────────────┐
   │   agent-api      │
   │ (Edge Function)  │
   └─────────────────┘
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Service won't start | Check `appsettings.json` is in the same folder as the exe |
| No screenshots in dashboard | Verify API Key and User ID; check Event Viewer logs |
| Service stops randomly | Ensure Watchdog is running; check for unhandled exceptions in logs |
| Access Denied on stop | Expected for standard users — service runs as LocalSystem |
