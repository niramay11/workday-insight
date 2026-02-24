

## Fix: Missing Page Routes (404 errors)

### Problem
The admin sidebar links to 6 pages, but only 3 have actual routes and page components. Clicking these sidebar links shows a 404:

| Sidebar Link | Route | Status |
|---|---|---|
| Dashboard | `/dashboard` | Exists |
| My Timesheet | `/timesheet` | **Missing** |
| Employees | `/employees` | Exists |
| Departments | `/departments` | Exists |
| Reports | `/reports` | **Missing** |
| Activity Logs | `/activity` | **Missing** |
| Settings | `/settings` | **Missing** |

### Plan

Create placeholder pages for the 4 missing routes, then register them in the router. Each page will use `AppLayout`, show a title, and display a "Coming Soon" message so navigation works without errors.

### Changes

1. **Create `src/pages/Timesheet.tsx`** -- Placeholder page with "My Timesheet" heading and coming soon message
2. **Create `src/pages/Reports.tsx`** -- Placeholder page for Reports
3. **Create `src/pages/ActivityLogs.tsx`** -- Placeholder page for Activity Logs
4. **Create `src/pages/Settings.tsx`** -- Placeholder page for Settings
5. **Update `src/App.tsx`** -- Import all 4 new pages and add protected routes for `/timesheet`, `/reports`, `/activity`, and `/settings`

All pages will follow the same pattern already used by Dashboard, Departments, and Employees (wrapped in `AppLayout`, protected by `ProtectedRoute`).
