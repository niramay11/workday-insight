import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAttendance } from "@/hooks/useAttendance";
import { useSettings } from "@/hooks/useSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Coffee, Clock } from "lucide-react";

export function BreakSchedule() {
  const { user } = useAuth();
  const { activeSession } = useAttendance();
  const { settings } = useSettings();
  const attendanceId = activeSession.data?.id;
  const allowance = Number(settings.data?.daily_break_allowance_minutes || 75);

  const { data: todayBreakLogs } = useQuery({
    queryKey: ["break_logs", "today", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("break_logs")
        .select("*, break_types(name)")
        .eq("user_id", user!.id)
        .gte("started_at", today.toISOString())
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Calculate total break minutes used today
  const totalMinutes = (todayBreakLogs ?? []).reduce((sum, log) => {
    if (!log.ended_at) return sum;
    const start = new Date(log.started_at).getTime();
    const end = new Date(log.ended_at).getTime();
    return sum + (end - start) / 60000;
  }, 0);

  const usedMinutes = Math.round(totalMinutes);
  const percentage = Math.min((usedMinutes / allowance) * 100, 100);
  const isOverLimit = usedMinutes > allowance;

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Coffee className="h-5 w-5" /> Today's Breaks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Usage summary */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Break time used</span>
            <span className={isOverLimit ? "text-destructive font-medium" : "font-medium"}>
              {formatDuration(usedMinutes)} / {formatDuration(allowance)}
            </span>
          </div>
          <Progress value={percentage} className="h-2" />
          {isOverLimit && (
            <p className="text-xs text-destructive">
              Over limit by {formatDuration(usedMinutes - allowance)}
            </p>
          )}
        </div>

        {/* Break list */}
        {todayBreakLogs?.length ? (
          <div className="space-y-2">
            {todayBreakLogs.map((log) => {
              const label = (log as any).break_types?.name || log.custom_reason || "Break";
              const start = new Date(log.started_at);
              const end = log.ended_at ? new Date(log.ended_at) : null;
              const mins = end ? Math.round((end.getTime() - start.getTime()) / 60000) : null;

              return (
                <div key={log.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">{label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {mins != null ? `${mins}m` : "Active"}
                    {" · "}
                    {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">No breaks taken yet today</p>
        )}
      </CardContent>
    </Card>
  );
}
