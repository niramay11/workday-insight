

## Feature 1: Downloadable Agent Configuration Package

Since the C# source code needs to be compiled on a development machine, the most practical approach is to provide a **pre-configured download** that gives admins everything they need.

### Implementation

**New Edge Function: `download-agent-config`**
- Generates a ZIP file containing:
  - `appsettings.json` pre-filled with the project's API URL, the current API key, and a placeholder for user ID
  - `install.ps1` - a PowerShell script with the `sc.exe` commands ready to run
  - `README.txt` - quick-start instructions
- Uses the `fflate` library (available via esm.sh) for ZIP generation
- Authenticated + admin-only (checks user role)

**Settings Page Update (`SettingsForm.tsx`)**
- Add a "Download Agent Package" button in the Windows Agent card
- Clicking it calls the edge function and triggers a browser download of `TimeTrackAgent-Config.zip`
- The button shows a loading spinner while generating

---

## Feature 2: Agent Connection Status Indicator

### Database Changes

**New table: `agent_heartbeats`**
- `id` (uuid, PK)
- `user_id` (uuid, unique, not null)
- `last_seen_at` (timestamptz, not null, default now())
- `agent_version` (text, nullable)
- `hostname` (text, nullable)

RLS policies:
- Admins/managers can SELECT all rows
- Users can SELECT their own row
- No direct INSERT/UPDATE from client (only via edge function)

**Migration**: Create the table with appropriate RLS.

### Backend Changes

**Update `agent-api` edge function**
- On every incoming request (any action), upsert into `agent_heartbeats` with the current timestamp, agent version, and hostname (from payload)
- This happens automatically so no agent code changes are needed

### Frontend Changes

**Update `useMonitoring.ts`**
- Fetch `agent_heartbeats` alongside other data
- Add `agentConnected` (boolean) and `agentLastSeen` (string) to the `EmployeeStatus` interface
- An agent is "connected" if `last_seen_at` is within the last 10 minutes

**Update `EmployeeStatusCard.tsx`**
- Add a small indicator dot/badge showing agent connection status (green = connected, gray = never connected, red = disconnected)
- Show tooltip with last seen timestamp

**Update `Employees.tsx` table**
- Add an "Agent" column showing a connection status badge per employee

### Technical Details

- The heartbeat is lightweight -- a single upsert per API call, no extra network requests from the agent
- Status logic: connected (< 10 min), disconnected (> 10 min), never (no row)
- The `useMonitoring` hook already refetches every 30 seconds, so status updates appear quickly

### Implementation Order

1. Create `agent_heartbeats` table via migration
2. Update `agent-api` edge function to upsert heartbeats
3. Create `download-agent-config` edge function
4. Update `useMonitoring.ts` to include heartbeat data
5. Update `EmployeeStatusCard.tsx` with agent indicator
6. Update `Employees.tsx` with agent column
7. Update `SettingsForm.tsx` with download button

