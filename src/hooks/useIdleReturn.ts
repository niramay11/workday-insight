import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useIdleReturn(attendanceId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const pendingIdleEvent = useQuery({
    queryKey: ["idle_return", user?.id, attendanceId],
    enabled: !!user && !!attendanceId,
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("idle_events")
        .select("*")
        .eq("user_id", user!.id)
        .eq("attendance_id", attendanceId!)
        .not("idle_end", "is", null)
        .is("return_reason" as any, null)
        .order("idle_end", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const submitReturnReason = useMutation({
    mutationFn: async ({
      eventId,
      reason,
      breakTypeId,
      customReason,
      attendanceId: attId,
      durationMinutes,
    }: {
      eventId: string;
      reason: string;
      breakTypeId: string | null;
      customReason: string | null;
      attendanceId: string;
      durationMinutes: number | null;
    }) => {
      // Update idle event with return reason
      const { error: idleError } = await supabase
        .from("idle_events")
        .update({ return_reason: reason } as any)
        .eq("id", eventId);
      if (idleError) throw idleError;

      // Create a break log entry
      const breakLog: any = {
        user_id: user!.id,
        attendance_id: attId,
        status: "completed",
        ended_at: new Date().toISOString(),
      };
      if (breakTypeId) {
        breakLog.break_type_id = breakTypeId;
      } else {
        breakLog.custom_reason = customReason;
      }
      const { error: breakError } = await supabase
        .from("break_logs")
        .insert(breakLog);
      if (breakError) throw breakError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["idle_return"] });
      queryClient.invalidateQueries({ queryKey: ["break_logs"] });
    },
  });

  return {
    pendingIdleEvent,
    submitReturnReason,
    hasPendingReturn: !!pendingIdleEvent.data,
  };
}
