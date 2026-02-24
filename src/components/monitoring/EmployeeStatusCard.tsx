import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Monitor } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Props {
  userId: string;
  fullName: string;
  email: string;
  status: "online" | "idle" | "offline";
  lastActivity: string | null;
  todayHours: number;
  latestScreenshot: string | null;
  onClick?: () => void;
}

const statusColors = {
  online: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20",
  idle: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20",
  offline: "bg-muted text-muted-foreground border-border",
};

const dotColors = {
  online: "bg-[hsl(var(--success))]",
  idle: "bg-[hsl(var(--warning))]",
  offline: "bg-muted-foreground",
};

export function EmployeeStatusCard({ fullName, email, status, lastActivity, todayHours, latestScreenshot }: Props) {
  const [showScreenshot, setShowScreenshot] = useState(false);

  return (
    <>
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="pt-5 pb-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  {fullName.charAt(0)}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${dotColors[status]}`} />
              </div>
              <div>
                <p className="font-medium text-sm">{fullName}</p>
                <p className="text-xs text-muted-foreground">{email}</p>
              </div>
            </div>
            <Badge variant="outline" className={statusColors[status]}>{status}</Badge>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {todayHours}h today
            </span>
            {lastActivity && (
              <span>{formatDistanceToNow(new Date(lastActivity), { addSuffix: true })}</span>
            )}
          </div>

          {latestScreenshot && (
            <button
              onClick={() => setShowScreenshot(true)}
              className="w-full rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors"
            >
              <img src={latestScreenshot} alt="Latest screenshot" className="w-full h-20 object-cover" />
            </button>
          )}
          {!latestScreenshot && (
            <div className="w-full h-20 rounded-lg border border-dashed border-border flex items-center justify-center">
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showScreenshot} onOpenChange={setShowScreenshot}>
        <DialogContent className="max-w-4xl">
          {latestScreenshot && (
            <img src={latestScreenshot} alt="Screenshot" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
