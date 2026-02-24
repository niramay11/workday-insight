import { AppLayout } from "@/components/layout/AppLayout";
import { useMonitoring } from "@/hooks/useMonitoring";
import { EmployeeStatusCard } from "@/components/monitoring/EmployeeStatusCard";
import { LiveActivityPanel } from "@/components/monitoring/LiveActivityPanel";
import { StatusSummaryBar } from "@/components/monitoring/StatusSummaryBar";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const LiveMonitoring = () => {
  const { role } = useAuth();
  const { statuses, recentActivity, summary, isLoading, refetch } = useMonitoring();

  if (role !== "admin" && role !== "manager") return <Navigate to="/dashboard" replace />;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Live Monitoring
            </h1>
            <p className="text-muted-foreground mt-1">Real-time employee activity overview</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>

        <StatusSummaryBar {...summary} />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {statuses.map((emp) => (
                <EmployeeStatusCard key={emp.userId} {...emp} />
              ))}
              {statuses.length === 0 && (
                <p className="text-muted-foreground text-sm col-span-full text-center py-8">No employees found</p>
              )}
            </div>
            <div className="lg:col-span-1">
              <LiveActivityPanel events={recentActivity} />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default LiveMonitoring;
