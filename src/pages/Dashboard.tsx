import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Users, AlertTriangle, Activity } from "lucide-react";

const Dashboard = () => {
  const { profile, role } = useAuth();

  const stats = [
    { label: "Present Today", value: "42", icon: Users, color: "text-[hsl(var(--success))]" },
    { label: "Avg Hours", value: "7.5h", icon: Clock, color: "text-primary" },
    { label: "Late Arrivals", value: "3", icon: AlertTriangle, color: "text-[hsl(var(--warning))]" },
    { label: "Idle Alerts", value: "8", icon: Activity, color: "text-destructive" },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Welcome back, {profile?.full_name?.split(" ")[0] ?? "User"} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening today
          </p>
        </div>

        {(role === "admin" || role === "manager") && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <Card key={stat.label} className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Punch in/out placeholder */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Punch in/out system and activity tracking will be built in the next phase.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
