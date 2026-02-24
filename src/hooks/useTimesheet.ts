import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startOfWeek, endOfWeek, format, eachDayOfInterval } from "date-fns";

export interface TimesheetDay {
  date: string;
  records: any[];
  totalHours: number;
  screenshots: any[];
  idleEvents: any[];
}

export function useTimesheet(weekStart: Date) {
  const { user } = useAuth();
  const start = startOfWeek(weekStart, { weekStartsOn: 1 });
  const end = endOfWeek(weekStart, { weekStartsOn: 1 });

  const weekData = useQuery({
    queryKey: ["timesheet", user?.id, format(start, "yyyy-MM-dd")],
    enabled: !!user,
    queryFn: async () => {
      const { data: records, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("user_id", user!.id)
        .gte("punch_in", start.toISOString())
        .lte("punch_in", end.toISOString())
        .order("punch_in", { ascending: true });
      if (error) throw error;

      const attendanceIds = (records ?? []).map((r) => r.id);

      const [screenshotsRes, idleRes] = await Promise.all([
        attendanceIds.length > 0
          ? supabase.from("screenshots").select("*").in("attendance_id", attendanceIds)
          : Promise.resolve({ data: [], error: null }),
        attendanceIds.length > 0
          ? supabase.from("idle_events").select("*").in("attendance_id", attendanceIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const days = eachDayOfInterval({ start, end });
      const result: TimesheetDay[] = days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayRecords = (records ?? []).filter(
          (r) => format(new Date(r.punch_in), "yyyy-MM-dd") === dateStr
        );
        const dayAttIds = dayRecords.map((r) => r.id);
        return {
          date: dateStr,
          records: dayRecords,
          totalHours: dayRecords.reduce((s, r) => s + (Number(r.total_hours) || 0), 0),
          screenshots: (screenshotsRes.data ?? []).filter((s) => dayAttIds.includes(s.attendance_id)),
          idleEvents: (idleRes.data ?? []).filter((e) => dayAttIds.includes(e.attendance_id)),
        };
      });

      return result;
    },
  });

  return weekData;
}
