import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useAttendance } from "@/hooks/useAttendance";
import { PunchButton } from "@/components/PunchButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Users, AlertTriangle, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { profile, role } = useAuth();
  const { todayTotalHours } = useAttendance();

  // Live stats for admin/manager
  const stats = useQuery({
    queryKey: ["dashboard_stats", role],
    enabled: role === "admin" || role === "manager",
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [activeRes, idleRes] = await Promise.all([
        supabase
          .from("attendance_records")
          .select("id, user_id, total_hours")
          .gte("punch_in", today.toISOString()),
        supabase
          .from("idle_events")
          .select("id")
          .gte("idle_start", today.toISOString()),
      ]);

      const todayRecords = activeRes.data ?? [];
      const presentUsers = new Set(todayRecords.map((r) => r.user_id));
      const completedRecords = todayRecords.filter((r) => r.total_hours);
      const avgHours = completedRecords.length > 0
        ? completedRecords.reduce((s, r) => s + Number(r.total_hours), 0) / completedRecords.length
        : 0;
      const shortDays = completedRecords.filter((r) => Number(r.total_hours) < 8).length;

      return {
        present: presentUsers.size,
        avgHours: avgHours.toFixed(1),
        shortDays,
        idleAlerts: idleRes.data?.length ?? 0,
      };
    },
    refetchInterval: 30000,
  });

  const statCards = [
    { label: "Present Today", value: String(stats.data?.present ?? 0), icon: Users, color: "text-[hsl(var(--success))]" },
    { label: "Avg Hours", value: `${stats.data?.avgHours ?? "0"}h`, icon: Clock, color: "text-primary" },
    { label: "Short Days", value: String(stats.data?.shortDays ?? 0), icon: AlertTriangle, color: "text-[hsl(var(--warning))]" },
    { label: "Idle Alerts", value: String(stats.data?.idleAlerts ?? 0), icon: Activity, color: "text-destructive" },
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

        {/* Punch In/Out */}
        <PunchButton />

        {(role === "admin" || role === "manager") && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => (
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
      </div>
    </AppLayout>
  );
};

export default Dashboard;
