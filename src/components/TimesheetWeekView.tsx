import { useState } from "react";
import { useTimesheet, TimesheetDay } from "@/hooks/useTimesheet";
import { useSettings } from "@/hooks/useSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Camera, Moon } from "lucide-react";
import { format, addWeeks, subWeeks, startOfWeek, parseISO, isToday } from "date-fns";
import { TimesheetDayDetail } from "./TimesheetDayDetail";

export function TimesheetWeekView() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const weekData = useTimesheet(weekStart);
  const { settings } = useSettings();
  const expectedHours = Number(settings.data?.expected_hours_per_day ?? 8);

  const getStatusColor = (day: TimesheetDay) => {
    if (day.records.length === 0) return "text-muted-foreground";
    if (day.totalHours >= expectedHours) return "text-[hsl(var(--success))]";
    if (day.totalHours >= expectedHours * 0.75) return "text-[hsl(var(--warning))]";
    return "text-destructive";
  };

  const getStatusBadge = (day: TimesheetDay) => {
    if (day.records.length === 0) return null;
    if (day.totalHours >= expectedHours) return <Badge variant="outline" className="border-[hsl(var(--success))] text-[hsl(var(--success))]">Full Day</Badge>;
    if (day.totalHours >= expectedHours * 0.75) return <Badge variant="outline" className="border-[hsl(var(--warning))] text-[hsl(var(--warning))]">Short Day</Badge>;
    return <Badge variant="destructive">Under Hours</Badge>;
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Weekly Timesheet</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[180px] text-center">
              {format(weekStart, "MMM d")} — {format(addWeeks(weekStart, 1), "MMM d, yyyy")}
            </span>
            <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {weekData.isLoading ? (
          <p className="text-muted-foreground text-sm text-center py-8">Loading...</p>
        ) : (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[140px_1fr_1fr_80px_100px_60px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span>Date</span>
              <span>Punch In</span>
              <span>Punch Out</span>
              <span>Hours</span>
              <span>Status</span>
              <span></span>
            </div>
            {(weekData.data ?? []).map((day) => {
              const date = parseISO(day.date);
              const firstRecord = day.records[0];
              const lastRecord = day.records[day.records.length - 1];
              return (
                <div key={day.date}>
                  <div
                    className={`grid grid-cols-[140px_1fr_1fr_80px_100px_60px] gap-2 px-3 py-3 rounded-lg items-center cursor-pointer transition-colors ${
                      isToday(date) ? "bg-primary/5" : "hover:bg-muted/50"
                    }`}
                    onClick={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
                  >
                    <span className={`text-sm font-medium ${isToday(date) ? "text-primary" : ""}`}>
                      {format(date, "EEE, MMM d")}
                    </span>
                    <span className="text-sm">
                      {firstRecord ? format(new Date(firstRecord.punch_in), "hh:mm a") : "—"}
                    </span>
                    <span className="text-sm">
                      {lastRecord?.punch_out ? format(new Date(lastRecord.punch_out), "hh:mm a") : firstRecord?.status === "active" ? "In progress" : "—"}
                    </span>
                    <span className={`text-sm font-semibold ${getStatusColor(day)}`}>
                      {day.totalHours > 0 ? `${day.totalHours.toFixed(1)}h` : "—"}
                    </span>
                    <span>{getStatusBadge(day)}</span>
                    <div className="flex gap-1.5">
                      {day.screenshots.length > 0 && (
                        <span className="flex items-center text-xs text-muted-foreground">
                          <Camera className="h-3 w-3 mr-0.5" />{day.screenshots.length}
                        </span>
                      )}
                      {day.idleEvents.length > 0 && (
                        <span className="flex items-center text-xs text-muted-foreground">
                          <Moon className="h-3 w-3 mr-0.5" />{day.idleEvents.length}
                        </span>
                      )}
                    </div>
                  </div>
                  {expandedDay === day.date && (
                    <TimesheetDayDetail day={day} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
