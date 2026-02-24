import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { LogIn, LogOut, Camera, Moon, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

const actionIcons: Record<string, any> = {
  punch_in: LogIn,
  punch_out: LogOut,
  screenshot: Camera,
  idle_start: Moon,
  idle_end: Moon,
  late_arrival: AlertTriangle,
};

const actionColors: Record<string, string> = {
  punch_in: "text-[hsl(var(--success))]",
  punch_out: "text-destructive",
  screenshot: "text-primary",
  idle_start: "text-[hsl(var(--warning))]",
  idle_end: "text-[hsl(var(--warning))]",
  late_arrival: "text-destructive",
};

export function ActivityFeed() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [actionFilter, setActionFilter] = useState<string>("all");

  const logs = useQuery({
    queryKey: ["activity_logs", user?.id, role],
    enabled: !!user,
    queryFn: async () => {
      const query = supabase
        .from("activity_logs")
        .select("*, profiles!activity_logs_user_id_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      const { data, error } = await query;
      if (error) {
        // Fallback without join if FK doesn't exist
        const { data: fallback, error: err2 } = await supabase
          .from("activity_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        if (err2) throw err2;
        return fallback ?? [];
      }
      return data ?? [];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("activity_logs_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, () => {
        queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const filtered = (logs.data ?? []).filter(
    (l) => actionFilter === "all" || l.action === actionFilter
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="punch_in">Punch In</SelectItem>
            <SelectItem value="punch_out">Punch Out</SelectItem>
            <SelectItem value="screenshot">Screenshot</SelectItem>
            <SelectItem value="idle_start">Idle Start</SelectItem>
            <SelectItem value="idle_end">Idle End</SelectItem>
            <SelectItem value="late_arrival">Late Arrival</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {logs.isLoading ? (
        <p className="text-muted-foreground text-sm text-center py-8">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No activity logs yet.</p>
      ) : (
        <div className="space-y-1">
          {filtered.map((log) => {
            const Icon = actionIcons[log.action] || LogIn;
            const color = actionColors[log.action] || "text-muted-foreground";
            return (
              <div key={log.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className={`p-1.5 rounded-md bg-muted ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium capitalize">
                    {log.action.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {(log as any).profiles?.full_name || "User"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(log.created_at), "MMM d, hh:mm a")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
