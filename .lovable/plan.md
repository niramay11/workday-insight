

## Phase 3: Punch In/Out, Timesheet, Screenshots, and Idle Lock System

### Overview

Build a full attendance tracking system with punch in/out, daily timesheet view, late arrival detection (flexible hours), screenshot capture API, idle detection API, and admin-configurable settings. The system prepares backend API endpoints so you can connect a desktop agent or third-party monitoring tool later.

---

### Database Changes (5 new tables)

#### 1. `attendance_records` -- Punch in/out entries
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK auth.users | |
| punch_in | timestamptz | When user punched in |
| punch_out | timestamptz | Nullable, set on punch out |
| total_hours | numeric | Computed on punch out |
| status | text | `active`, `completed`, `auto_closed` |
| notes | text | Optional |
| created_at | timestamptz | |

RLS: Users see own records. Managers see department records. Admins see all.

#### 2. `screenshots` -- Received from desktop agent / webhook
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK auth.users | |
| attendance_id | uuid FK attendance_records | |
| image_url | text | URL to stored screenshot |
| captured_at | timestamptz | |
| source | text | `agent` or `webhook` |

RLS: Users see own. Admins/managers see their scope.

#### 3. `idle_events` -- Idle alerts from agent / webhook
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK auth.users | |
| attendance_id | uuid FK attendance_records | |
| idle_start | timestamptz | |
| idle_end | timestamptz | Nullable |
| duration_minutes | numeric | Computed |
| source | text | `agent` or `webhook` |

RLS: Same pattern as screenshots.

#### 4. `activity_logs` -- General activity tracking
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK auth.users | |
| action | text | `punch_in`, `punch_out`, `idle_start`, `idle_end`, `screenshot`, `late_arrival` |
| details | jsonb | Metadata |
| created_at | timestamptz | |

RLS: Users see own. Admins see all.

#### 5. `app_settings` -- Admin-configurable settings
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| key | text UNIQUE | e.g. `idle_threshold_minutes`, `expected_hours_per_day` |
| value | text | |
| updated_at | timestamptz | |

Seeded with defaults: `idle_threshold_minutes` = `10`, `expected_hours_per_day` = `8`.

RLS: All authenticated can read. Only admins can update.

---

### Storage Bucket

Create a `screenshots` storage bucket for storing captured screenshots from the agent/webhook.

---

### Edge Functions (2 endpoints)

#### 1. `agent-api` -- For your desktop agent
- **POST /agent-api** with `action` in body:
  - `screenshot`: accepts base64 image, stores in bucket, inserts into `screenshots` table
  - `idle_start` / `idle_end`: inserts into `idle_events` table
- Authenticated via a bearer token (API key) that you configure in Settings
- Validates user_id, finds active attendance record

#### 2. `webhook-receiver` -- For third-party tools (Hubstaff, Time Doctor, etc.)
- **POST /webhook-receiver** with standard webhook payload
- Accepts screenshot URLs or idle events
- Authenticated via configurable webhook secret
- Maps external user identifiers to your user_id

Both endpoints log to `activity_logs`.

---

### Frontend Changes

#### 1. Dashboard (`src/pages/Dashboard.tsx`)
- Replace "Quick Actions" placeholder with a **Punch In / Punch Out** button
- Show current session timer (live clock since punch in)
- Show today's total hours worked
- Stats cards become live data from `attendance_records`

#### 2. Timesheet (`src/pages/Timesheet.tsx`)
- **Weekly view** with date picker (navigate by week)
- Daily rows showing: date, punch in time, punch out time, total hours, status
- Color coding: green for full day, yellow for short day, red for missed
- Late arrival indicator (based on `expected_hours_per_day` setting and flexible threshold)
- Click a day to expand and see screenshots + idle events for that day

#### 3. Activity Logs (`src/pages/ActivityLogs.tsx`)
- Real-time feed of activity from `activity_logs` table
- Filter by user (admin), by action type
- Shows punch ins/outs, idle alerts, screenshots captured, late arrivals

#### 4. Settings (`src/pages/Settings.tsx`)
- **Admin only** settings panel with:
  - Idle threshold (minutes) -- default 10, changeable
  - Expected hours per day -- default 8
  - Agent API key display + regenerate button
  - Webhook secret display + regenerate button
  - Webhook URL display (copy to clipboard)

#### 5. New Components
- `src/components/PunchButton.tsx` -- Big punch in/out button with timer
- `src/components/TimesheetWeekView.tsx` -- Weekly timesheet table
- `src/components/TimesheetDayDetail.tsx` -- Expanded day view with screenshots/idle
- `src/components/ActivityFeed.tsx` -- Activity log list
- `src/components/SettingsForm.tsx` -- Admin settings form

---

### Late Arrival Detection

Since hours are flexible, "late" is defined as:
- If a user works less than the `expected_hours_per_day` setting on a given day, that day is flagged as a short day
- Dashboard stats calculate this from completed `attendance_records`

---

### How the Agent/Webhook Connection Works

1. Admin goes to **Settings** and sees the **Agent API Key** and **Webhook URL**
2. To use a desktop agent: install the agent, paste the API key and endpoint URL into its config
3. To use a third-party tool: paste the webhook URL and secret into the tool's webhook settings
4. Both endpoints receive data and store it in the same tables

---

### Technical Details

```text
File changes summary:
+-- supabase/
|   +-- migrations/  (new migration for 5 tables + storage bucket)
|   +-- functions/
|       +-- agent-api/index.ts        (new)
|       +-- webhook-receiver/index.ts (new)
+-- src/
    +-- components/
    |   +-- PunchButton.tsx            (new)
    |   +-- TimesheetWeekView.tsx      (new)
    |   +-- TimesheetDayDetail.tsx     (new)
    |   +-- ActivityFeed.tsx           (new)
    |   +-- SettingsForm.tsx           (new)
    +-- hooks/
    |   +-- useAttendance.ts           (new - punch in/out logic)
    |   +-- useTimesheet.ts            (new - weekly data fetching)
    |   +-- useSettings.ts             (new - app settings CRUD)
    +-- pages/
        +-- Dashboard.tsx              (updated - live punch button + stats)
        +-- Timesheet.tsx              (updated - full weekly view)
        +-- ActivityLogs.tsx           (updated - real activity feed)
        +-- Settings.tsx               (updated - admin config panel)
```

### Implementation Order

1. Database migration (tables, RLS policies, seed settings)
2. Storage bucket for screenshots
3. Hooks: `useAttendance`, `useTimesheet`, `useSettings`
4. Dashboard punch in/out button with live timer
5. Timesheet weekly view with day detail expansion
6. Settings page with admin controls (idle threshold, API keys)
7. Edge functions: `agent-api` and `webhook-receiver`
8. Activity Logs page with real feed
9. End-to-end testing
