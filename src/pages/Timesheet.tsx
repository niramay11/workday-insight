import { AppLayout } from "@/components/layout/AppLayout";
import { TimesheetWeekView } from "@/components/TimesheetWeekView";

const Timesheet = () => (
  <AppLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>My Timesheet</h1>
        <p className="text-muted-foreground mt-1">Track your daily work hours</p>
      </div>
      <TimesheetWeekView />
    </div>
  </AppLayout>
);

export default Timesheet;
