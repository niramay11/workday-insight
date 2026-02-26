

## Comprehensive Feature Build: Employee Management, Break System, and Post-Lock Return Screen

### Problem Summary
Several critical features are missing:
1. **No "Add Employee" functionality** -- admins can only edit existing employees, not invite new ones
2. **Agent idle lock works** (code exists in Worker.cs), but the **web app has no post-lock return flow** -- when an employee unlocks their PC and logs back in, they should be forced to a screen before accessing the desktop
3. **No predefined break system** -- employees should see scheduled breaks and be able to start/end them
4. **No forced punch-in screen** -- after login, employees must punch in before doing anything else

---

### Part 1: Add Employee (Admin Invite)

**What:** Add an "Invite Employee" button on the Employees page that lets admins create new employee accounts.

**How:**
- Add an "Invite Employee" dialog on `Employees.tsx` with fields: Full Name, Email, Department, Role
- Create a new backend function `invite-employee` that:
  - Uses the service role to create a user via the admin auth API
  - Auto-generates a temporary password
  - Creates the profile and role records
  - Returns the temporary credentials for the admin to share
- Add the function config to `supabase/config.toml`

**Files:**
- Create: `supabase/functions/invite-employee/index.ts`
- Modify: `src/pages/Employees.tsx` (add invite dialog + button)
- Modify: `supabase/config.toml` (add function entry)

---

### Part 2: Predefined Breaks System

**What:** Create a system of admin-configurable breaks (e.g., Lunch Break 1:00-1:30, Tea Break 3:30-3:45) that employees see on their dashboard and can track.

**Database changes:**
- New table `break_types`: id, name, start_time (TIME), end_time (TIME), duration_minutes, is_active, created_at
  - RLS: admins can CRUD, all authenticated can SELECT
- New table `break_logs`: id, user_id, break_type_id, attendance_id, started_at, ended_at, status (active/completed/missed)
  - RLS: users see own, admins see all

**Frontend:**
- Add a "Break Management" card in Settings where admins can add/edit/delete predefined break types
- Show break schedule on the Dashboard below the punch button

**Files:**
- Database migration (2 new tables + RLS policies)
- Modify: `src/components/SettingsForm.tsx` (add Break Management section)
- Create: `src/components/BreakSchedule.tsx` (shows break list with start/end buttons)
- Modify: `src/pages/Dashboard.tsx` (include BreakSchedule)

---

### Part 3: Forced Punch-In Screen (Attendance Gate)

**What:** When an employee logs in (or returns after idle lock-out), they MUST see a full-screen attendance gate that forces them to punch in before accessing the rest of the app. This screen also shows their break schedule and requires them to state what task they'll be working on.

**How:**
- Create a new `AttendanceGate` component -- a full-screen overlay that blocks navigation
- It shows:
  - Punch In button (if no active session)
  - A "What will you be working on?" text input (required before punch-in)
  - Today's break schedule
  - If returning from idle: a "Reason for absence" field
- Modify `ProtectedRoute.tsx` to check for an active attendance session. If none exists and the user is an employee, render the `AttendanceGate` instead of the child route
- Store the "return reason" in the `idle_events` table (add a `return_reason` column) and the "current task" in the `attendance_records` table (add a `current_task` column)

**Database changes:**
- Add `return_reason` TEXT column to `idle_events`
- Add `current_task` TEXT column to `attendance_records`

**Files:**
- Database migration (alter 2 tables)
- Create: `src/components/AttendanceGate.tsx`
- Modify: `src/components/ProtectedRoute.tsx` (add attendance check for employees)
- Modify: `src/hooks/useAttendance.ts` (support current_task field on punch-in)

---

### Part 4: Idle Return Flow Enhancement

**What:** When the Windows agent locks the screen due to idle timeout, and the user logs back in, the agent sends `idle_end` to the API. The web app should detect this and show the forced return screen.

**How:**
- The `AttendanceGate` component checks for open idle events (where `idle_end` is null or was recently closed)
- If a recent idle event exists, the gate shows the "return reason" form
- After submitting the reason, the idle event is updated with the reason, and the user can proceed
- Create a new `useIdleReturn` hook that checks for recent idle events on the current attendance session

**Files:**
- Create: `src/hooks/useIdleReturn.ts`
- Modify: `src/components/AttendanceGate.tsx` (integrate idle return logic)

---

### Implementation Order

1. Database migration (break_types, break_logs tables + alter idle_events and attendance_records)
2. `invite-employee` edge function
3. Employees page -- add invite dialog
4. BreakSchedule component + Settings break management
5. AttendanceGate component + useIdleReturn hook
6. ProtectedRoute integration

---

### Technical Details

**Database Migration SQL:**
```sql
-- Break types table
CREATE TABLE public.break_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.break_types ENABLE ROW LEVEL SECURITY;

-- Break logs table
CREATE TABLE public.break_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  break_type_id UUID REFERENCES public.break_types(id) ON DELETE CASCADE NOT NULL,
  attendance_id UUID REFERENCES public.attendance_records(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.break_logs ENABLE ROW LEVEL SECURITY;

-- Add columns to existing tables
ALTER TABLE public.attendance_records ADD COLUMN current_task TEXT;
ALTER TABLE public.idle_events ADD COLUMN return_reason TEXT;

-- RLS for break_types
CREATE POLICY "Authenticated can view break types" ON public.break_types FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage break types" ON public.break_types FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for break_logs
CREATE POLICY "Users see own break logs" ON public.break_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users manage own break logs" ON public.break_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own break logs" ON public.break_logs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins see all break logs" ON public.break_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
```

**AttendanceGate behavior:**
- Shown to employees (not admins) when there is no active attendance session
- Full-screen, cannot be dismissed or navigated away from
- After punch-in, redirects to Dashboard
- On idle return: shows reason form before allowing access

**Invite Employee edge function:**
- Uses `supabase.auth.admin.createUser()` with a generated temp password
- Creates profile + user_roles entries
- Returns the temp password so admin can share it with the employee
