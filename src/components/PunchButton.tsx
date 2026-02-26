import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAttendance } from "@/hooks/useAttendance";
import { LogIn, LogOut, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function PunchButton() {
  const { activeSession, todayTotalHours, punchIn, punchOut } = useAttendance();
  const [elapsed, setElapsed] = useState("");

  const session = activeSession.data;

  useEffect(() => {
    if (!session) {
      setElapsed("");
      return;
    }
    const tick = () => {
      const diff = Date.now() - new Date(session.punch_in).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session]);

  const handlePunch = async () => {
    try {
      if (session) {
        await punchOut.mutateAsync(session.id);
        toast({ title: "Punched out", description: "Session ended successfully." });
      } else {
        await punchIn.mutateAsync(undefined);
        toast({ title: "Punched in", description: "Session started. Have a productive day!" });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="flex items-center justify-between p-6">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            {session ? "Currently Working" : "Ready to Start"}
          </p>
          {session && (
            <p className="text-3xl font-bold tabular-nums tracking-tight font-mono">
              {elapsed}
            </p>
          )}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Today: {todayTotalHours.toFixed(1)}h</span>
          </div>
        </div>
        <Button
          size="lg"
          onClick={handlePunch}
          disabled={punchIn.isPending || punchOut.isPending}
          className={session
            ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground h-14 px-8 text-base"
            : "bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-[hsl(var(--success-foreground))] h-14 px-8 text-base"
          }
        >
          {session ? (
            <>
              <LogOut className="mr-2 h-5 w-5" /> Punch Out
            </>
          ) : (
            <>
              <LogIn className="mr-2 h-5 w-5" /> Punch In
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
