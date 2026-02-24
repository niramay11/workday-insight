import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

interface Props {
  online: number;
  idle: number;
  offline: number;
  total: number;
}

export function StatusSummaryBar({ online, idle, offline, total }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5 pb-4 flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-[hsl(var(--success))]" />
          <div>
            <p className="text-2xl font-bold">{online}</p>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5 pb-4 flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-[hsl(var(--warning))]" />
          <div>
            <p className="text-2xl font-bold">{idle}</p>
            <p className="text-xs text-muted-foreground">Idle</p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5 pb-4 flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-muted-foreground" />
          <div>
            <p className="text-2xl font-bold">{offline}</p>
            <p className="text-xs text-muted-foreground">Offline</p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5 pb-4 flex items-center gap-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
