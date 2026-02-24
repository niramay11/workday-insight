import { AppLayout } from "@/components/layout/AppLayout";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ActivityLogs = () => (
  <AppLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Activity Logs</h1>
        <p className="text-muted-foreground mt-1">Monitor employee activity and system events</p>
      </div>
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed />
        </CardContent>
      </Card>
    </div>
  </AppLayout>
);

export default ActivityLogs;
