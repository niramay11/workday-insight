
## Add Agent Heartbeat Data to Employee Profile Page

### Overview
Add an "Agent Status" card to the Employee Profile page showing the current connection status and heartbeat details for that employee's Windows Agent.

### Changes

#### 1. Update `src/hooks/useEmployeeProfile.ts`
- Add a new `useQuery` call to fetch the `agent_heartbeats` row for the given `user_id`
- Return the heartbeat data alongside existing profile data
- Use `refetchInterval: 30000` to keep the status live

#### 2. Update `src/pages/EmployeeProfile.tsx`
- Import `Cpu` icon from lucide-react and `formatDistanceToNow` from date-fns
- Add an **Agent Status** card in the header area (next to the stats cards or in the profile header) showing:
  - Connection status dot (green/red/gray) with label text ("Connected", "Disconnected", "Never Connected")
  - Last seen timestamp (e.g., "3 minutes ago")
  - Agent version (if available)
  - Hostname (if available)
- The card uses the same 10-minute threshold logic already established in `useMonitoring.ts` and `Employees.tsx`

### Technical Details

**Heartbeat query in `useEmployeeProfile.ts`:**
```typescript
const heartbeat = useQuery({
  queryKey: ["employee_heartbeat", userId],
  enabled: !!userId,
  queryFn: async () => {
    const { data } = await supabase
      .from("agent_heartbeats")
      .select("*")
      .eq("user_id", userId!)
      .single();
    return data;
  },
  refetchInterval: 30000,
});
```

**Agent Status card in `EmployeeProfile.tsx`:**
- Placed between the header and the stats grid
- Shows a compact card with the Cpu icon, status dot, last seen time, version, and hostname
- Follows the same styling patterns as existing stat cards (border-0, shadow-sm)

### No Database or Backend Changes
The `agent_heartbeats` table and RLS policies already exist. This is a frontend-only change.

### Files Modified
1. `src/hooks/useEmployeeProfile.ts` -- add heartbeat query
2. `src/pages/EmployeeProfile.tsx` -- add Agent Status card
