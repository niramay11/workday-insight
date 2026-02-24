import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Activity } from "lucide-react";

interface Props {
  events: any[];
}

const actionLabels: Record<string, { label: string; color: string }> = {
  punch_in: { label: "Punched In", color: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" },
  punch_out: { label: "Punched Out", color: "bg-primary/10 text-primary" },
  screenshot: { label: "Screenshot", color: "bg-muted text-muted-foreground" },
  idle_start: { label: "Went Idle", color: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" },
  idle_end: { label: "Resumed", color: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" },
};

export function LiveActivityPanel({ events }: Props) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" /> Live Activity
          <span className="relative flex h-2 w-2 ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--success))] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(var(--success))]"></span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
        {events.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No activity yet today</p>
        )}
        {events.map((event, i) => {
          const info = actionLabels[event.action] ?? { label: event.action, color: "bg-muted text-muted-foreground" };
          return (
            <div key={event.id ?? i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={`text-xs ${info.color}`}>{info.label}</Badge>
                <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                  {event.user_id?.slice(0, 8)}...
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {event.created_at ? formatDistanceToNow(new Date(event.created_at), { addSuffix: true }) : ""}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
