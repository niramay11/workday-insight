import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAttendance } from "@/hooks/useAttendance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coffee, Play, Square } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function BreakSchedule() {
  const { user } = useAuth();
  const { activeSession } = useAttendance();
  const queryClient = useQueryClient();
  const attendanceId = activeSession.data?.id;

  const { data: breakTypes } = useQuery({
    queryKey: ["break_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("break_types")
        .select("*")
        .eq("is_active", true)
        .order("start_time");
      if (error) throw error;
      return data;
    },
  });

  const { data: todayBreakLogs } = useQuery({
    queryKey: ["break_logs", "today", user?.id],
    enabled: !!user && !!attendanceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("break_logs")
        .select("*")
        .eq("user_id", user!.id)
        .eq("attendance_id", attendanceId!);
      if (error) throw error;
      return data;
    },
  });

  const startBreak = useMutation({
    mutationFn: async (breakTypeId: string) => {
      const { error } = await supabase.from("break_logs").insert({
        user_id: user!.id,
        break_type_id: breakTypeId,
        attendance_id: attendanceId!,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["break_logs"] });
      toast({ title: "Break started" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const endBreak = useMutation({
    mutationFn: async (breakLogId: string) => {
      const { error } = await supabase
        .from("break_logs")
        .update({ ended_at: new Date().toISOString(), status: "completed" })
        .eq("id", breakLogId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["break_logs"] });
      toast({ title: "Break ended" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (!breakTypes?.length) return null;

  const formatTime = (t: string) => {
    const [h, m] = t.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Coffee className="h-5 w-5" /> Today's Breaks
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {breakTypes.map((bt) => {
            const log = todayBreakLogs?.find(
              (l) => l.break_type_id === bt.id && l.status === "active"
            );
            const completed = todayBreakLogs?.find(
              (l) => l.break_type_id === bt.id && l.status === "completed"
            );

            return (
              <div
                key={bt.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div>
                  <p className="font-medium text-sm">{bt.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(bt.start_time)} – {formatTime(bt.end_time)} · {bt.duration_minutes} min
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {completed ? (
                    <Badge variant="outline" className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]">
                      Done
                    </Badge>
                  ) : log ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => endBreak.mutate(log.id)}
                      disabled={endBreak.isPending}
                    >
                      <Square className="mr-1 h-3 w-3" /> End
                    </Button>
                  ) : attendanceId ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startBreak.mutate(bt.id)}
                      disabled={startBreak.isPending}
                    >
                      <Play className="mr-1 h-3 w-3" /> Start
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Punch in first
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
