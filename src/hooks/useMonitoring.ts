import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface EmployeeStatus {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  departmentId: string | null;
  status: "online" | "idle" | "offline";
  lastActivity: string | null;
  todayHours: number;
  latestScreenshot: string | null;
}

export function useMonitoring() {
  const [realtimeEvents, setRealtimeEvents] = useState<any[]>([]);

  const employeeStatuses = useQuery({
    queryKey: ["monitoring_statuses"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [profilesRes, attendanceRes, idleRes, screenshotsRes, activityRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("status", "active"),
        supabase.from("attendance_records").select("*").gte("punch_in", today.toISOString()),
        supabase.from("idle_events").select("*").gte("idle_start", today.toISOString()).is("idle_end", null),
        supabase.from("screenshots").select("*").gte("captured_at", today.toISOString()).order("captured_at", { ascending: false }),
        supabase.from("activity_logs").select("*").gte("created_at", today.toISOString()).order("created_at", { ascending: false }).limit(50),
      ]);

      const profiles = profilesRes.data ?? [];
      const attendance = attendanceRes.data ?? [];
      const openIdles = idleRes.data ?? [];

      const statuses: EmployeeStatus[] = profiles.map((p) => {
        const userAttendance = attendance.filter((a) => a.user_id === p.user_id);
        const isActive = userAttendance.some((a) => a.status === "active");
        const isIdle = openIdles.some((i) => i.user_id === p.user_id);
        const todayHours = userAttendance.reduce((s, r) => s + Number(r.total_hours ?? 0), 0);
        const latestSS = (screenshotsRes.data ?? []).find((s) => s.user_id === p.user_id);
        const latestAct = (activityRes.data ?? []).find((a) => a.user_id === p.user_id);

        return {
          userId: p.user_id,
          fullName: p.full_name,
          email: p.email,
          avatarUrl: p.avatar_url,
          departmentId: p.department_id,
          status: isIdle ? "idle" : isActive ? "online" : "offline",
          lastActivity: latestAct?.created_at ?? null,
          todayHours: Math.round(todayHours * 10) / 10,
          latestScreenshot: latestSS?.image_url ?? null,
        };
      });

      return { statuses, recentActivity: activityRes.data ?? [] };
    },
    refetchInterval: 30000,
  });

  // Subscribe to realtime activity_logs
  useEffect(() => {
    const channel = supabase
      .channel("monitoring-activity")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, (payload) => {
        setRealtimeEvents((prev) => [payload.new, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const summary = (() => {
    const statuses = employeeStatuses.data?.statuses ?? [];
    return {
      online: statuses.filter((s) => s.status === "online").length,
      idle: statuses.filter((s) => s.status === "idle").length,
      offline: statuses.filter((s) => s.status === "offline").length,
      total: statuses.length,
    };
  })();

  return {
    statuses: employeeStatuses.data?.statuses ?? [],
    recentActivity: [
      ...realtimeEvents,
      ...(employeeStatuses.data?.recentActivity ?? []),
    ].slice(0, 50),
    summary,
    isLoading: employeeStatuses.isLoading,
    refetch: employeeStatuses.refetch,
  };
}
