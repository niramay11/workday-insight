import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useAttendance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const activeSession = useQuery({
    queryKey: ["attendance", "active", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const todayRecords = useQuery({
    queryKey: ["attendance", "today", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("user_id", user!.id)
        .gte("punch_in", today.toISOString())
        .order("punch_in", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const punchIn = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .insert({ user_id: user!.id, status: "active" })
        .select()
        .single();
      if (error) throw error;

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: user!.id,
        action: "punch_in",
        details: { attendance_id: data.id },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
    },
  });

  const punchOut = useMutation({
    mutationFn: async (attendanceId: string) => {
      const { data: record } = await supabase
        .from("attendance_records")
        .select("punch_in")
        .eq("id", attendanceId)
        .single();

      const punchInTime = new Date(record!.punch_in);
      const now = new Date();
      const totalHours = (now.getTime() - punchInTime.getTime()) / (1000 * 60 * 60);

      const { data, error } = await supabase
        .from("attendance_records")
        .update({
          punch_out: now.toISOString(),
          total_hours: Math.round(totalHours * 100) / 100,
          status: "completed",
        })
        .eq("id", attendanceId)
        .select()
        .single();
      if (error) throw error;

      await supabase.from("activity_logs").insert({
        user_id: user!.id,
        action: "punch_out",
        details: { attendance_id: attendanceId, total_hours: totalHours },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
    },
  });

  const todayTotalHours = (todayRecords.data ?? []).reduce((sum, r) => {
    if (r.total_hours) return sum + Number(r.total_hours);
    if (r.status === "active") {
      const hrs = (Date.now() - new Date(r.punch_in).getTime()) / (1000 * 60 * 60);
      return sum + hrs;
    }
    return sum;
  }, 0);

  return {
    activeSession,
    todayRecords,
    todayTotalHours,
    punchIn,
    punchOut,
  };
}
