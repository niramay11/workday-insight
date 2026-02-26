import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAttendance } from "@/hooks/useAttendance";
import { useIdleReturn } from "@/hooks/useIdleReturn";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BreakSchedule } from "@/components/BreakSchedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, Clock, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AttendanceGateProps {
  children: React.ReactNode;
}

export function AttendanceGate({ children }: AttendanceGateProps) {
  const { user } = useAuth();
  const { activeSession, punchIn, todayTotalHours } = useAttendance();
  const [currentTask, setCurrentTask] = useState("");
  const [selectedBreakType, setSelectedBreakType] = useState("");
  const [customReason, setCustomReason] = useState("");

  const session = activeSession.data;
  const { pendingIdleEvent, submitReturnReason, hasPendingReturn } = useIdleReturn(session?.id ?? null);

  // Fetch break types for the idle return form
  const { data: breakTypes } = useQuery({
    queryKey: ["break_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("break_types")
        .select("*")
        .eq("is_active", true)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const isLoading = activeSession.isLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If there's a pending idle return, show break categorization form
  if (session && hasPendingReturn) {
    const idleEvent = pendingIdleEvent.data;
    const isOther = selectedBreakType === "other";
    const canSubmit = selectedBreakType && (!isOther || customReason.trim());

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
              . Please categorize your break before continuing.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>What type of break was this? *</Label>
              <RadioGroup value={selectedBreakType} onValueChange={setSelectedBreakType}>
                {breakTypes?.map((bt) => (
                  <div key={bt.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value={bt.id} id={bt.id} />
                    <Label htmlFor={bt.id} className="cursor-pointer font-normal">
                      {bt.name}
                    </Label>
                  </div>
                ))}
                <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="cursor-pointer font-normal">
                    Other (meeting, conference, etc.)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {isOther && (
              <div className="space-y-2">
                <Label>Please specify *</Label>
                <Textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="e.g., Client meeting, Conference call, Personal errand..."
                  rows={2}
                />
              </div>
            )}

            <Button
              className="w-full"
              disabled={!canSubmit || submitReturnReason.isPending}
              onClick={async () => {
                if (!idleEvent) return;
                const breakTypeId = isOther ? null : selectedBreakType;
                const reason = isOther
                  ? customReason.trim()
                  : breakTypes?.find((bt) => bt.id === selectedBreakType)?.name ?? "";

                try {
                  await submitReturnReason.mutateAsync({
                    eventId: idleEvent.id,
                    reason,
                    breakTypeId,
                    customReason: isOther ? customReason.trim() : null,
                    attendanceId: session.id,
                    durationMinutes: idleEvent.duration_minutes ? Number(idleEvent.duration_minutes) : null,
                  });
                  toast({ title: "Welcome back!", description: "Break logged. You can continue working." });
                  setSelectedBreakType("");
                  setCustomReason("");
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

        <BreakSchedule />
      </div>
    </div>
  );
}
