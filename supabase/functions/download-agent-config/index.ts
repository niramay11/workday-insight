import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { zipSync, strToU8 } from "https://esm.sh/fflate@0.8.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current API key
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "agent_api_key")
      .single();

    const apiKey = setting?.value ?? "YOUR_API_KEY_HERE";
    const agentApiUrl = `${supabaseUrl}/functions/v1/agent-api`;

    // Generate files
    const appsettings = JSON.stringify(
      {
        Logging: {
          LogLevel: { Default: "Information", "Microsoft.Hosting.Lifetime": "Information" },
        },
        AgentConfig: {
          ApiUrl: agentApiUrl,
          ApiKey: apiKey,
          UserId: "REPLACE_WITH_EMPLOYEE_USER_ID",
          ScreenshotIntervalSeconds: 300,
          IdleThresholdSeconds: 600,
        },
      },
      null,
      2
    );

    const installPs1 = `# TimeTrackAgent Installation Script
# Run this script as Administrator in PowerShell

$AgentPath = Read-Host "Enter full path to TimeTrackAgent.exe"
$WatchdogPath = Read-Host "Enter full path to TimeTrackAgent.Watchdog.exe"
$UIAppPath = Read-Host "Enter full path to TimeTrackAgent.UI.exe"

# Create shared config directory
$ConfigDir = "C:\\ProgramData\\TimeTrackAgent"
if (!(Test-Path $ConfigDir)) {
    New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
}

# Copy appsettings.json to shared location
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Copy-Item "$ScriptDir\\appsettings.json" "$ConfigDir\\appsettings.json" -Force
Write-Host "Config copied to $ConfigDir\\appsettings.json" -ForegroundColor Yellow
Write-Host "IMPORTANT: Edit $ConfigDir\\appsettings.json and set the employee's User ID" -ForegroundColor Yellow

# Install main agent service
sc.exe create TimeTrackAgent binPath= "$AgentPath" start= auto obj= LocalSystem displayname= "TimeTrack Agent"
sc.exe description TimeTrackAgent "Employee time tracking and monitoring agent"

# Install watchdog service
sc.exe create TimeTrackWatchdog binPath= "$WatchdogPath" start= auto obj= LocalSystem displayname= "TimeTrack Watchdog"
sc.exe description TimeTrackWatchdog "Monitors and auto-restarts the TimeTrack Agent"

# Set UI app to auto-start at user login (all users)
$RegPath = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run"
Set-ItemProperty -Path $RegPath -Name "TimeTrackUI" -Value """$UIAppPath"""
Write-Host "UI app registered for auto-start at login" -ForegroundColor Cyan

# Start services
sc.exe start TimeTrackAgent
sc.exe start TimeTrackWatchdog

# Start UI app for current user
Start-Process -FilePath $UIAppPath

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host "  Services: TimeTrackAgent + TimeTrackWatchdog (running)" -ForegroundColor Green
Write-Host "  UI App: Will auto-start at every user login" -ForegroundColor Green
Write-Host ""
Write-Host "Verify with: sc.exe query TimeTrackAgent" -ForegroundColor Cyan
`;

    const readmeTxt = `TimeTrack Agent - Quick Start Guide
====================================

1. PREREQUISITES
   - Windows 10/11 or Windows Server 2016+
   - .NET 8 Runtime (download from https://dotnet.microsoft.com/download/dotnet/8.0)
   - .NET 8 Desktop Runtime (for UI app)

2. ARCHITECTURE
   The agent consists of three components:
   
   a) TimeTrackAgent (Windows Service)
      - Runs as LocalSystem, always active
      - Detects idle time, captures screenshots
      - Auto punches-out on idle/lock, sends heartbeats
   
   b) TimeTrackAgent.Watchdog (Windows Service)
      - Monitors the main agent and auto-restarts if stopped
   
   c) TimeTrackAgent.UI (Desktop Tray App)
      - Runs in the user's session (auto-starts at login)
      - Shows forced popup on unlock/login for:
        * Day start: "What will you be working on?" → Punch In
        * Return from break: Select break label or type reason → Punch In
      - Cannot be closed or bypassed by the employee

3. CONFIGURE
   - Open appsettings.json (or C:\\ProgramData\\TimeTrackAgent\\appsettings.json after install)
   - The API URL and API Key are pre-filled
   - Replace "REPLACE_WITH_EMPLOYEE_USER_ID" with the employee's User ID
     (found in the admin dashboard under Employees)

4. BUILD (if building from source)
   dotnet publish TimeTrackAgent -c Release -o ./publish/agent
   dotnet publish TimeTrackAgent.Watchdog -c Release -o ./publish/watchdog
   dotnet publish TimeTrackAgent.UI -c Release -o ./publish/ui

5. INSTALL
   - Run install.ps1 as Administrator
   - Or manually run the sc.exe commands inside the script

6. VERIFY
   sc.exe query TimeTrackAgent
   sc.exe query TimeTrackWatchdog

Both services should show "RUNNING".
The UI tray app will appear in the system tray.

7. HOW IT WORKS
   - Employee logs in → UI popup: "Start Your Workday" → Punch In
   - Employee goes idle for 10 min → Agent punches out & locks screen
   - Employee returns and unlocks → UI popup: "What were you doing?" 
     → Select break label → Punch In
   - All punch-in/out, breaks, screenshots, and idle events are tracked
     and visible in the admin dashboard

For enterprise deployment (MSI, GPO, Intune), see the full README.md
in the windows-agent source folder.
`;

    // Create ZIP
    const zipData = zipSync({
      "TimeTrackAgent-Config/appsettings.json": strToU8(appsettings),
      "TimeTrackAgent-Config/install.ps1": strToU8(installPs1),
      "TimeTrackAgent-Config/README.txt": strToU8(readmeTxt),
    });

    return new Response(zipData, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="TimeTrackAgent-Config.zip"',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
