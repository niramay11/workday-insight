

## Mobile-Responsive Timesheet Layout

### Problem
The timesheet weekly view uses a fixed 6-column grid (`grid-cols-[140px_1fr_1fr_80px_100px_60px]`) that overflows on mobile screens. The sidebar also takes significant space on smaller devices.

### Solution
Replace the desktop table grid with a responsive card-based layout on mobile, keeping the full table on larger screens.

### Changes

#### 1. `src/components/TimesheetWeekView.tsx`
- **Hide the table header row** on mobile (`hidden md:grid`)
- **Replace the 6-column grid** with a stacked card layout on small screens:
  - On mobile (`< md`): Each day renders as a compact card showing date, hours, and status badge in a vertical stack
  - On desktop (`>= md`): Keep the existing 6-column grid unchanged
- **Adjust the week navigation header** to stack vertically on mobile (`flex-col sm:flex-row`)
- **Reduce the date range text width** on mobile

#### 2. `src/components/TimesheetDayDetail.tsx`
- Change screenshot grid from `grid-cols-4` to `grid-cols-2 md:grid-cols-4` for mobile
- Adjust session detail items to wrap on small screens

### Mobile Layout Per Day Row
On screens under `md` breakpoint, each day will display as:

```text
+----------------------------------+
| Mon, Feb 24           4.5h       |
| 09:00 AM - 05:30 PM   Full Day  |
|                    [cam] [idle]  |
+----------------------------------+
```

### Desktop Layout (unchanged)
The existing 6-column table grid remains exactly as-is for `md` and above.

### Technical Details
- Uses Tailwind responsive classes (`hidden md:grid`, `md:hidden`, `grid-cols-2 md:grid-cols-4`)
- No new dependencies needed
- Two files modified: `TimesheetWeekView.tsx` and `TimesheetDayDetail.tsx`
