import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useIdleReturn(attendanceId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check for idle events that need a return reason
  const pendingIdleEvent = useQuery({
    queryKey: ["idle_return", user?.id, attendanceId],
    enabled: !!user && !!attendanceId,
    refetchInterval: 10000,
    queryFn: async () => {
      // Find idle events on this attendance that ended but have no return reason
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
    mutationFn: async ({ eventId, reason }: { eventId: string; reason: string }) => {
      const { error } = await supabase
        .from("idle_events")
        .update({ return_reason: reason } as any)
        .eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["idle_return"] });
    },
  });

  return {
    pendingIdleEvent,
    submitReturnReason,
    hasPendingReturn: !!pendingIdleEvent.data,
  };
}
