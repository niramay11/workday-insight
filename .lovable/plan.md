

## Phase 4: Desktop Agent + Reports, Live Monitoring, Notifications, and Employee Profiles

This plan covers two major deliverables built together:
1. **Desktop Agent** -- A Python application that captures screenshots, detects idle time, and communicates with your backend
2. **Phase 4 Web Features** -- Reports/Analytics, Live Monitoring Dashboard, Notifications/Alerts, and Employee Profile Pages

---

### Part A: Python Desktop Agent

A lightweight Python script with system tray icon that runs on Windows/Mac/Linux. It connects to your backend using the Agent API key from Settings.

#### Agent Features
- **Screenshot capture**: Takes full desktop screenshots at a configurable interval (default: every 5 minutes)
- **Idle detection**: Monitors keyboard/mouse input; triggers idle alert after the configured threshold (fetched from settings)
- **System tray**: Runs in background with tray icon showing status (active/idle/disconnected)
- **Auto-start**: Optional system startup registration
- **Config file**: Stores API endpoint URL, API key, and user ID locally

#### Files Created
A new `desktop-agent/` folder at the project root containing:

```text
desktop-agent/
  agent.py              -- Main entry point
  config.py             -- Configuration loading (config.json)
  screenshot.py         -- Screenshot capture using mss library
  idle_detector.py      -- Keyboard/mouse idle detection using pynput
  api_client.py         -- HTTP client for agent-api endpoint
  tray_icon.py          -- System tray using pystray
  requirements.txt      -- mss, pynput, pystray, Pillow, requests
  config.example.json   -- Template config file
  README.md             -- Setup and usage instructions
```

#### How It Works

```text
+------------------+       HTTPS POST        +------------------+
|  Python Agent    | -----------------------> |  agent-api       |
|  (on employee PC)|   Bearer: <api_key>      |  (edge function) |
|                  |   {action, user_id,      |                  |
|  - Screenshots   |    data: {base64...}}    |  - Validates key |
|  - Idle detect   |                          |  - Stores data   |
|  - System tray   |                          |  - Logs activity |
+------------------+                          +------------------+
```

#### Agent Flow
1. On launch, reads `config.json` for API URL, API key, and user_id
2. Starts idle detector (monitors keyboard + mouse events)
3. Starts screenshot timer (every N minutes)
4. If no input for `idle_threshold` minutes: sends `idle_start` to API
5. When input resumes: sends `idle_end` to API
6. Screenshots are captured, compressed to PNG, base64-encoded, and sent as `screenshot` action
7. System tray shows green (active), yellow (idle), red (disconnected)

---

### Part B: Phase 4 Web Features

#### 1. Reports and Analytics Page (`src/pages/Reports.tsx`)

Replace the "Coming Soon" placeholder with a full analytics dashboard.

**Charts and Metrics:**
- **Attendance Trend** (line chart): Daily attendance count over the last 30 days
- **Hours Distribution** (bar chart): Average hours worked per day of the week
- **Department Comparison** (bar chart): Average hours by department
- **Productivity Score** (donut chart): Ratio of active time vs idle time
- **Top Statistics Cards**: Total hours this month, average daily hours, attendance rate, total idle time

**Filters:**
- Date range picker (last 7 days, 30 days, custom range)
- Department filter (admin only)
- Employee filter (admin/manager only)

**Export:**
- CSV download button for filtered data
- Exports attendance records with columns: Employee, Date, Punch In, Punch Out, Hours, Idle Minutes, Status

**New files:**
- `src/components/reports/AttendanceTrendChart.tsx`
- `src/components/reports/HoursDistributionChart.tsx`
- `src/components/reports/DepartmentComparisonChart.tsx`
- `src/components/reports/ProductivityChart.tsx`
- `src/components/reports/ReportFilters.tsx`
- `src/components/reports/ExportButton.tsx`
- `src/hooks/useReportData.ts`

#### 2. Live Monitoring Dashboard (`src/pages/LiveMonitoring.tsx`)

A real-time admin/manager view showing current employee status.

**Features:**
- **Employee Status Grid**: Cards showing each employee with:
  - Name, avatar, department
  - Current status: Online (green), Idle (yellow), Offline (gray)
  - Time since last activity
  - Latest screenshot thumbnail (click to expand)
  - Today's total hours
- **Live Activity Feed**: Right panel showing real-time events (punch ins, screenshots, idle alerts) using Supabase Realtime subscriptions
- **Summary Bar**: Count of online/idle/offline employees
- **Auto-refresh**: Status updates every 30 seconds + realtime push for new events

**Database Changes:**
- Enable Supabase Realtime on `activity_logs` table (already added in Phase 3 migration)

**New files:**
- `src/pages/LiveMonitoring.tsx`
- `src/components/monitoring/EmployeeStatusCard.tsx`
- `src/components/monitoring/LiveActivityPanel.tsx`
- `src/components/monitoring/StatusSummaryBar.tsx`
- `src/components/monitoring/ScreenshotModal.tsx`
- `src/hooks/useMonitoring.ts`

**Routing:** Add `/monitoring` route (admin/manager only)
**Sidebar:** Add "Live Monitor" nav item for admin and manager roles

#### 3. Notifications and Alerts

**In-App Notifications:**
- New `notifications` database table:

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | Recipient |
| title | text | Short title |
| message | text | Details |
| type | text | `idle_alert`, `missed_punch`, `late_arrival`, `system` |
| read | boolean | Default false |
| created_at | timestamptz | |

- Notification bell icon in sidebar/header with unread count badge
- Dropdown panel showing recent notifications with mark-as-read
- RLS: Users see own notifications only

**Auto-Generated Alerts (via edge function cron):**
- A scheduled edge function `check-alerts` runs every 15 minutes and:
  - Detects employees who haven't punched in by a configurable time
  - Detects idle events exceeding the threshold
  - Creates notification records for the employee and their manager/admin
- Uses `pg_cron` + `pg_net` to invoke the edge function on schedule

**New files:**
- `src/components/NotificationBell.tsx`
- `src/components/NotificationPanel.tsx`
- `src/hooks/useNotifications.ts`
- `supabase/functions/check-alerts/index.ts`

#### 4. Employee Profile Pages (`src/pages/EmployeeProfile.tsx`)

Detailed view for each employee, accessible by admins and the employee themselves.

**Sections:**
- **Header**: Avatar, name, email, department, role, status
- **Attendance History**: Paginated table of all attendance records with date, punch in/out, hours, and status badges
- **Screenshots Gallery**: Grid of screenshots with date/time labels, click to expand full-size. Paginated (20 per page)
- **Idle Events Log**: Table showing idle start, end, duration, and any reason provided
- **Stats Summary Cards**: This month's total hours, average daily hours, attendance rate, total idle time, longest streak

**Routing:** `/employees/:id` route (admin access + own profile access)

**New files:**
- `src/pages/EmployeeProfile.tsx`
- `src/components/profile/ProfileHeader.tsx`
- `src/components/profile/AttendanceHistory.tsx`
- `src/components/profile/ScreenshotsGallery.tsx`
- `src/components/profile/IdleEventsLog.tsx`
- `src/components/profile/ProfileStats.tsx`
- `src/hooks/useEmployeeProfile.ts`

---

### Database Changes Summary

1. **New table: `notifications`** -- For in-app alerts
2. **Enable Realtime** on `activity_logs` (if not already)
3. **RLS policies** for notifications (users see own)
4. **Seed data**: Add `screenshot_interval_minutes` (default `5`) and `missed_punch_alert_time` (default `10:00`) to `app_settings`

---

### Updated Sidebar Navigation

```text
Employee:
  - Dashboard
  - My Timesheet
  - My Activity
  
Manager:
  - Dashboard
  - My Timesheet
  - My Team
  - Live Monitor (new)
  - Reports (new)

Admin:
  - Dashboard
  - My Timesheet
  - Employees
  - Departments
  - Live Monitor (new)
  - Reports (updated)
  - Activity Logs
  - Settings
```

---

### Settings Page Additions

Add to the admin Settings form:
- **Screenshot Interval** (minutes) -- how often the agent captures screenshots (default 5)
- **Missed Punch Alert Time** -- time after which a "missed punch-in" alert triggers (default 10:00 AM)
- **Agent Download Section** -- Instructions and link to the `desktop-agent/` README

---

### Implementation Order

1. Database migration (notifications table, new settings seeds, realtime)
2. Desktop agent Python files (entire `desktop-agent/` folder)
3. Reports page with charts and export
4. Live Monitoring page with realtime status cards
5. Notifications system (bell, panel, `check-alerts` edge function)
6. Employee Profile pages
7. Sidebar and routing updates
8. Settings page additions
9. End-to-end testing

---

### Technical Notes

- All charts use **Recharts** (already installed)
- Realtime subscriptions use `supabase.channel()` with `postgres_changes`
- CSV export is generated client-side from fetched data using a simple utility function
- The Python agent is standalone -- it does NOT require Node.js or any web tooling
- The agent communicates exclusively through the existing `agent-api` edge function
- No new external API keys are needed for any of these features
