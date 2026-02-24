import { useState } from "react";
import { format, subDays } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { useReportData } from "@/hooks/useReportData";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { AttendanceTrendChart } from "@/components/reports/AttendanceTrendChart";
import { HoursDistributionChart } from "@/components/reports/HoursDistributionChart";
import { ProductivityChart } from "@/components/reports/ProductivityChart";
import { ExportButton } from "@/components/reports/ExportButton";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Calendar, Timer, AlertTriangle } from "lucide-react";

const Reports = () => {
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 30), "yyyy-MM-dd'T'00:00:00"),
    endDate: format(new Date(), "yyyy-MM-dd'T'23:59:59"),
  });

  const { attendanceTrend, hoursByDayOfWeek, productivity, stats, isLoading, attendanceData } = useReportData(filters);

  const statCards = [
    { label: "Total Hours", value: `${stats.totalHours}h`, icon: Clock },
    { label: "Avg Daily Hours", value: `${stats.avgDailyHours}h`, icon: Timer },
    { label: "Attendance Days", value: String(stats.attendanceDays), icon: Calendar },
    { label: "Total Idle", value: `${stats.totalIdleMinutes}m`, icon: AlertTriangle },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Reports</h1>
            <p className="text-muted-foreground mt-1">Attendance and productivity analytics</p>
          </div>
          <ExportButton data={attendanceData.data ?? []} />
        </div>

        <ReportFilters onFilterChange={setFilters} />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((s) => (
                <Card key={s.label} className="border-0 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{s.label}</p>
                        <p className="text-2xl font-bold mt-1">{s.value}</p>
                      </div>
                      <s.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AttendanceTrendChart data={attendanceTrend} />
              <HoursDistributionChart data={hoursByDayOfWeek} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProductivityChart activeHours={productivity.activeHours} idleHours={productivity.idleHours} />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Reports;
