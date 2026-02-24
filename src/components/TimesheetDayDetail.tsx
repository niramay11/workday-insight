import { TimesheetDay } from "@/hooks/useTimesheet";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Camera, Moon, Clock } from "lucide-react";

interface Props {
  day: TimesheetDay;
}

export function TimesheetDayDetail({ day }: Props) {
  if (day.records.length === 0) {
    return (
      <div className="ml-4 mb-2 p-4 rounded-lg bg-muted/30 text-sm text-muted-foreground">
        No activity recorded for this day.
      </div>
    );
  }

  return (
    <div className="ml-4 mb-2 space-y-3">
      {/* Sessions */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Clock className="h-3 w-3" /> Sessions
        </p>
        {day.records.map((r) => (
          <div key={r.id} className="flex items-center gap-4 text-sm bg-muted/30 rounded-lg px-3 py-2">
            <span>{format(new Date(r.punch_in), "hh:mm a")}</span>
            <span className="text-muted-foreground">→</span>
            <span>{r.punch_out ? format(new Date(r.punch_out), "hh:mm a") : "In progress"}</span>
            {r.total_hours && (
              <span className="ml-auto text-muted-foreground">{Number(r.total_hours).toFixed(1)}h</span>
            )}
          </div>
        ))}
      </div>

      {/* Screenshots */}
      {day.screenshots.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Camera className="h-3 w-3" /> Screenshots ({day.screenshots.length})
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {day.screenshots.map((s) => (
              <div key={s.id} className="relative rounded-lg overflow-hidden bg-muted aspect-video">
                <img src={s.image_url} alt="Screenshot" className="object-cover w-full h-full" />
                <span className="absolute bottom-1 right-1 text-[10px] bg-foreground/70 text-background px-1 rounded">
                  {format(new Date(s.captured_at), "hh:mm a")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Idle Events */}
      {day.idleEvents.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Moon className="h-3 w-3" /> Idle Events ({day.idleEvents.length})
          </p>
          {day.idleEvents.map((e) => (
            <div key={e.id} className="flex items-center gap-4 text-sm bg-muted/30 rounded-lg px-3 py-2">
              <span>{format(new Date(e.idle_start), "hh:mm a")}</span>
              <span className="text-muted-foreground">→</span>
              <span>{e.idle_end ? format(new Date(e.idle_end), "hh:mm a") : "Ongoing"}</span>
              {e.duration_minutes && (
                <span className="ml-auto text-muted-foreground">{Number(e.duration_minutes).toFixed(0)} min</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
