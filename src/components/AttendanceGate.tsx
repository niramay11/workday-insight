import { useState } from "react";
import { useAttendance } from "@/hooks/useAttendance";
import { useIdleReturn } from "@/hooks/useIdleReturn";
import { BreakSchedule } from "@/components/BreakSchedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, Clock, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AttendanceGateProps {
  children: React.ReactNode;
}

export function AttendanceGate({ children }: AttendanceGateProps) {
  const { activeSession, punchIn, todayTotalHours } = useAttendance();
  const [currentTask, setCurrentTask] = useState("");
  const [returnReason, setReturnReason] = useState("");

  const session = activeSession.data;
  const { pendingIdleEvent, submitReturnReason, hasPendingReturn } = useIdleReturn(session?.id ?? null);

  const isLoading = activeSession.isLoading;

  // If loading, show spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If there's a pending idle return, show return reason form
  if (session && hasPendingReturn) {
    const idleEvent = pendingIdleEvent.data;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg border-0 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-[hsl(var(--warning))]/10 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-[hsl(var(--warning))]" />
            </div>
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <p className="text-muted-foreground mt-1">
              You were away for{" "}
              {idleEvent?.duration_minutes
                ? `${Math.round(Number(idleEvent.duration_minutes))} minutes`
                : "a while"}
              . Please explain your absence before continuing.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Reason for absence *</Label>
              <Textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="e.g., Had a meeting, went for lunch, took a break..."
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              disabled={!returnReason.trim() || submitReturnReason.isPending}
              onClick={async () => {
                if (!idleEvent) return;
                try {
                  await submitReturnReason.mutateAsync({
                    eventId: idleEvent.id,
                    reason: returnReason.trim(),
                  });
                  toast({ title: "Welcome back!", description: "You can continue working." });
                  setReturnReason("");
                } catch {
                  toast({ title: "Error", variant: "destructive" });
                }
              }}
            >
              {submitReturnReason.isPending ? "Submitting..." : "Continue Working"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If there's an active session and no pending idle return, allow through
  if (session) {
    return <>{children}</>;
  }

  // No active session — show forced punch-in gate
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">Start Your Workday</CardTitle>
            <p className="text-muted-foreground mt-1">
              You must punch in before accessing the application.
            </p>
            {todayTotalHours > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Today's total: {todayTotalHours.toFixed(1)}h
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>What will you be working on? *</Label>
              <Input
                value={currentTask}
                onChange={(e) => setCurrentTask(e.target.value)}
                placeholder="e.g., Backend API development, Client reports..."
              />
            </div>
            <Button
              className="w-full h-12 text-base bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-[hsl(var(--success-foreground))]"
              disabled={!currentTask.trim() || punchIn.isPending}
              onClick={async () => {
                try {
                  await punchIn.mutateAsync(currentTask.trim());
                  toast({
                    title: "Punched in!",
                    description: "Have a productive day!",
                  });
                } catch {
                  toast({ title: "Error", variant: "destructive" });
                }
              }}
            >
              <LogIn className="mr-2 h-5 w-5" />
              {punchIn.isPending ? "Punching in..." : "Punch In & Start Working"}
            </Button>
          </CardContent>
        </Card>

        {/* Show break schedule on the gate */}
        <BreakSchedule />
      </div>
    </div>
  );
}
