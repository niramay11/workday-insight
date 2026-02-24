import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timer } from "lucide-react";

const Timesheet = () => (
  <AppLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>My Timesheet</h1>
        <p className="text-muted-foreground mt-1">Track your daily work hours</p>
      </div>
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Timer className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg font-medium">Coming Soon</p>
          <p className="text-muted-foreground text-sm mt-1">Timesheet tracking will be available in the next update</p>
        </CardContent>
      </Card>
    </div>
  </AppLayout>
);

export default Timesheet;
