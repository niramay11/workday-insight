import { useParams, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useEmployeeProfile } from "@/hooks/useEmployeeProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Calendar, Timer, AlertTriangle, ArrowLeft, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Link } from "react-router-dom";

const EmployeeProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { role, user } = useAuth();
  const { profile, attendance, screenshots, idleEvents, heartbeat, stats, isLoading } = useEmployeeProfile(id);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Access: admin or own profile
  if (role !== "admin" && user?.id !== id) return <Navigate to="/dashboard" replace />;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const p = profile.data;

  const statCards = [
    { label: "Monthly Hours", value: `${stats.totalHours}h`, icon: Clock },
    { label: "Avg Daily", value: `${stats.avgDailyHours}h`, icon: Timer },
    { label: "Days Attended", value: String(stats.attendanceDays), icon: Calendar },
    { label: "Idle Minutes", value: `${stats.totalIdleMinutes}m`, icon: AlertTriangle },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back + Header */}
        <div>
          {role === "admin" && (
            <Link to="/employees">
              <Button variant="ghost" size="sm" className="mb-2">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Employees
              </Button>
            </Link>
          )}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
              {p?.full_name?.charAt(0) ?? "?"}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {p?.full_name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">{p?.email}</span>
                <Badge variant="outline">{p?.role}</Badge>
                <span className="text-sm text-muted-foreground">{p?.departmentName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Agent Status */}
        {(() => {
          const hb = heartbeat.data;
          const isConnected = hb ? (Date.now() - new Date(hb.last_seen_at).getTime()) < 10 * 60 * 1000 : false;
          const statusColor = !hb ? "bg-muted-foreground" : isConnected ? "bg-[hsl(var(--success,142_76%_36%))]" : "bg-destructive";
          const statusLabel = !hb ? "Never Connected" : isConnected ? "Connected" : "Disconnected";
          return (
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <Cpu className="h-5 w-5 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
                    <span className="text-sm font-medium">{statusLabel}</span>
                  </div>
                  {hb && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      Last seen {formatDistanceToNow(new Date(hb.last_seen_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
                {hb && (hb.agent_version || hb.hostname) && (
                  <div className="flex gap-4 mt-2 ml-8 text-xs text-muted-foreground">
                    {hb.hostname && <span>Host: {hb.hostname}</span>}
                    {hb.agent_version && <span>v{hb.agent_version}</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <Card key={s.label} className="border-0 shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-bold mt-1">{s.value}</p>
                  </div>
                  <s.icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Attendance History */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Attendance History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Punch In</TableHead>
                  <TableHead>Punch Out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(attendance.data ?? []).slice(0, 20).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{format(new Date(r.punch_in), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="text-sm">{format(new Date(r.punch_in), "hh:mm a")}</TableCell>
                    <TableCell className="text-sm">{r.punch_out ? format(new Date(r.punch_out), "hh:mm a") : "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{r.total_hours ? `${Number(r.total_hours).toFixed(1)}h` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={r.status === "active" ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" : ""}>
                        {r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Screenshots Gallery */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Screenshots</CardTitle>
          </CardHeader>
          <CardContent>
            {(screenshots.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No screenshots captured yet</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(screenshots.data ?? []).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedImage(s.image_url)}
                    className="rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors"
                  >
                    <img src={s.image_url} alt="Screenshot" className="w-full h-24 object-cover" />
                    <p className="text-[10px] text-muted-foreground p-1.5">{format(new Date(s.captured_at), "MMM dd, HH:mm")}</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Idle Events */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Idle Events</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(idleEvents.data ?? []).slice(0, 20).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{format(new Date(e.idle_start), "MMM dd, HH:mm")}</TableCell>
                    <TableCell className="text-sm">{e.idle_end ? format(new Date(e.idle_end), "HH:mm") : "Ongoing"}</TableCell>
                    <TableCell className="text-sm">{e.duration_minutes ? `${Number(e.duration_minutes).toFixed(0)} min` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          {selectedImage && <img src={selectedImage} alt="Screenshot" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default EmployeeProfile;
