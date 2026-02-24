import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ReportFilters {
  startDate: string;
  endDate: string;
  departmentId?: string;
  employeeId?: string;
}

export function useReportData(filters: ReportFilters) {
  const { role } = useAuth();

  const attendanceData = useQuery({
    queryKey: ["report_attendance", filters],
    queryFn: async () => {
      let q = supabase
        .from("attendance_records")
        .select("*")
        .gte("punch_in", filters.startDate)
        .lte("punch_in", filters.endDate)
        .order("punch_in", { ascending: true });

      if (filters.employeeId) {
        q = q.eq("user_id", filters.employeeId);
      }

      const { data, error } = await q;
      if (error) throw error;

      // If department filter, fetch profiles to filter by dept
      let records = data ?? [];
      if (filters.departmentId) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("department_id", filters.departmentId);
        const deptUsers = new Set((profiles ?? []).map((p) => p.user_id));
        records = records.filter((r) => deptUsers.has(r.user_id));
      }

      return records;
    },
  });

  const idleData = useQuery({
    queryKey: ["report_idle", filters],
    queryFn: async () => {
      let q = supabase
        .from("idle_events")
        .select("*")
        .gte("idle_start", filters.startDate)
        .lte("idle_start", filters.endDate);

      if (filters.employeeId) {
        q = q.eq("user_id", filters.employeeId);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Compute daily attendance trend
  const attendanceTrend = (() => {
    if (!attendanceData.data) return [];
    const dayMap: Record<string, Set<string>> = {};
    attendanceData.data.forEach((r) => {
      const day = r.punch_in.split("T")[0];
      if (!dayMap[day]) dayMap[day] = new Set();
      dayMap[day].add(r.user_id);
    });
    return Object.entries(dayMap)
      .map(([date, users]) => ({ date, count: users.size }))
      .sort((a, b) => a.date.localeCompare(b.date));
  })();

  // Hours by day of week
  const hoursByDayOfWeek = (() => {
    if (!attendanceData.data) return [];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const sums: Record<string, { total: number; count: number }> = {};
    days.forEach((d) => (sums[d] = { total: 0, count: 0 }));
    attendanceData.data.forEach((r) => {
      if (!r.total_hours) return;
      const dow = days[new Date(r.punch_in).getDay()];
      sums[dow].total += Number(r.total_hours);
      sums[dow].count += 1;
    });
    return days.map((d) => ({
      day: d,
      avgHours: sums[d].count > 0 ? Math.round((sums[d].total / sums[d].count) * 10) / 10 : 0,
    }));
  })();

  // Productivity: active vs idle
  const productivity = (() => {
    const totalHours = (attendanceData.data ?? []).reduce(
      (s, r) => s + Number(r.total_hours ?? 0), 0
    );
    const totalIdleMin = (idleData.data ?? []).reduce(
      (s, e) => s + Number(e.duration_minutes ?? 0), 0
    );
    const activeHours = Math.max(0, totalHours - totalIdleMin / 60);
    return { activeHours: Math.round(activeHours * 10) / 10, idleHours: Math.round((totalIdleMin / 60) * 10) / 10 };
  })();

  // Summary stats
  const stats = (() => {
    const records = attendanceData.data ?? [];
    const completed = records.filter((r) => r.total_hours);
    const totalHours = completed.reduce((s, r) => s + Number(r.total_hours), 0);
    const uniqueDays = new Set(records.map((r) => r.punch_in.split("T")[0])).size;
    const totalIdleMin = (idleData.data ?? []).reduce((s, e) => s + Number(e.duration_minutes ?? 0), 0);
    return {
      totalHours: Math.round(totalHours * 10) / 10,
      avgDailyHours: uniqueDays > 0 ? Math.round((totalHours / uniqueDays) * 10) / 10 : 0,
      attendanceDays: uniqueDays,
      totalIdleMinutes: Math.round(totalIdleMin),
    };
  })();

  return {
    attendanceData,
    idleData,
    attendanceTrend,
    hoursByDayOfWeek,
    productivity,
    stats,
    isLoading: attendanceData.isLoading || idleData.isLoading,
  };
}
