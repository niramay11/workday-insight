

## Redesign Break System: Flexible Break Allowance with Labels

### Current Problem
The existing break system uses fixed time windows (e.g., "Lunch 1:00-1:30 PM"), but your actual workflow is different: employees get a total daily break allowance (e.g., 1 hour 15 minutes) that they can use however they want. When they return from being away, they must categorize their break from a list of predefined labels or write a custom reason.

### What Changes

**1. Database Changes**
- Make `start_time`, `end_time`, and `duration_minutes` columns on `break_types` nullable (they're no longer needed -- break types become just label names like "Tea Break 1", "Lunch Break", etc.)
- Add `custom_reason` TEXT column to `break_logs` for when employee selects "Other"
- Make `break_type_id` on `break_logs` nullable (null when "Other" is chosen)
- Store daily break allowance in `app_settings` (key: `daily_break_allowance_minutes`, default: `75`)

**2. AttendanceGate Idle Return Screen**
Replace the current free-text "Reason for absence" with a structured break categorization form:
- Radio button list of active break types (e.g., "Tea Break 1", "Tea Break 2", "Lunch Break", "Extra Break")
- An "Other" option at the bottom
- When "Other" is selected, a text input appears for the reason (e.g., "Client meeting", "Conference call")
- The idle event's duration is automatically recorded as the break duration
- A break_log entry is created linking to the selected break type (or storing the custom reason)
- The return_reason on idle_events is also updated for record-keeping

**3. Settings -- Break Management (Admin)**
Simplify the admin UI:
- Remove start time, end time, and duration fields
- Just a list of break label names with add/delete
- Add a "Daily Break Allowance" field (in minutes, default 75) saved to app_settings

**4. BreakSchedule Component on Dashboard**
Redesign to show:
- Today's breaks taken (label + duration) in a list
- Total break time used vs. daily allowance (e.g., "45 min / 1h 15min used")
- A progress bar showing usage against allowance

### Files to Modify

| File | Change |
|------|--------|
| Migration SQL | Alter `break_types` (nullable columns), alter `break_logs` (add custom_reason, nullable break_type_id) |
| `src/components/AttendanceGate.tsx` | Replace free-text reason with break type selector + "Other" option; create break_log on submit |
| `src/hooks/useIdleReturn.ts` | Update mutation to also insert a break_log record |
| `src/components/BreakSchedule.tsx` | Show today's break usage summary with allowance tracking |
| `src/components/SettingsForm.tsx` | Simplify BreakManagement to just label names + daily allowance setting |
| `src/hooks/useAttendance.ts` | No changes needed |

### Technical Details

**Migration SQL:**
```sql
ALTER TABLE public.break_types
  ALTER COLUMN start_time DROP NOT NULL,
  ALTER COLUMN end_time DROP NOT NULL,
  ALTER COLUMN duration_minutes DROP NOT NULL;

ALTER TABLE public.break_logs
  ADD COLUMN custom_reason TEXT,
  ALTER COLUMN break_type_id DROP NOT NULL;
```

**AttendanceGate idle return flow:**
1. Employee returns from idle lock
2. Screen shows: "You were away for X minutes. What were you doing?"
3. Radio list: Tea Break 1, Tea Break 2, Lunch Break, Extra Break, Other
4. If "Other" -> text input for custom reason
5. On submit:
   - Update `idle_events.return_reason` with the selected label or custom text
   - Insert a `break_logs` entry with the break_type_id (or custom_reason if Other), duration from idle event
6. Employee proceeds to work

**Settings Break Management simplified form:**
- Text input for break label name + "Add" button
- List of existing labels with delete button
- Numeric input for "Daily Break Allowance (minutes)" saved to app_settings

**BreakSchedule dashboard component:**
- Fetches today's `break_logs` for the user
- Joins with `break_types` to show labels (or shows custom_reason for "Other")
- Shows a summary bar: "Used 45m of 1h 15m break allowance"

