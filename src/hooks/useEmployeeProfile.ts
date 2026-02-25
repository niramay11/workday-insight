import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useEmployeeProfile(userId: string | undefined) {
  const profile = useQuery({
    queryKey: ["employee_profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [profileRes, roleRes, deptRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId!).single(),
        supabase.from("user_roles").select("role").eq("user_id", userId!).single(),
        supabase.from("profiles").select("department_id").eq("user_id", userId!).single(),
      ]);
      const dept = profileRes.data?.department_id
        ? await supabase.from("departments").select("name").eq("id", profileRes.data.department_id).single()
        : null;
      return {
        ...profileRes.data,
        role: roleRes.data?.role ?? "employee",
        departmentName: dept?.data?.name ?? "Unassigned",
      };
    },
  });

  const attendance = useQuery({
    queryKey: ["employee_attendance", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("user_id", userId!)
        .order("punch_in", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const screenshots = useQuery({
    queryKey: ["employee_screenshots", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screenshots")
        .select("*")
        .eq("user_id", userId!)
        .order("captured_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const idleEvents = useQuery({
    queryKey: ["employee_idle_events", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("idle_events")
        .select("*")
        .eq("user_id", userId!)
        .order("idle_start", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const heartbeat = useQuery({
    queryKey: ["employee_heartbeat", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_heartbeats")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      return data;
    },
    refetchInterval: 30000,
  });

  // Stats
  const stats = (() => {
    const records = attendance.data ?? [];
    const thisMonth = records.filter((r) => {
      const d = new Date(r.punch_in);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const completed = thisMonth.filter((r) => r.total_hours);
    const totalHours = completed.reduce((s, r) => s + Number(r.total_hours), 0);
    const uniqueDays = new Set(thisMonth.map((r) => r.punch_in.split("T")[0])).size;
    const totalIdleMin = (idleEvents.data ?? [])
      .filter((e) => {
        const d = new Date(e.idle_start);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, e) => s + Number(e.duration_minutes ?? 0), 0);

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      avgDailyHours: uniqueDays > 0 ? Math.round((totalHours / uniqueDays) * 10) / 10 : 0,
      attendanceDays: uniqueDays,
      totalIdleMinutes: Math.round(totalIdleMin),
    };
  })();

  return {
    profile,
    attendance,
    screenshots,
    idleEvents,
    heartbeat,
    stats,
    isLoading: profile.isLoading,
  };
}
