import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Cpu, Download, Wifi, WifiOff, Clock, HardDrive, RefreshCw } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";

const AgentManagement = () => {
  const { role } = useAuth();
  const [downloading, setDownloading] = useState(false);

  if (role !== "admin") return <Navigate to="/dashboard" replace />;

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: heartbeats, refetch: refetchHeartbeats } = useQuery({
    queryKey: ["agent_heartbeats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agent_heartbeats").select("*");
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("*");
      if (error) throw error;
      return data;
    },
  });

  const handleDownloadConfig = async () => {
    setDownloading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/download-agent-config`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Download failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "TimeTrackAgent-Config.zip";
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Config downloaded", description: "Edit appsettings.json with each employee's User ID before deploying." });
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const getAgentStatus = (userId: string) => {
    const hb = heartbeats?.find((h) => h.user_id === userId);
    if (!hb) return { status: "never" as const, hb: null };
    const diff = Date.now() - new Date(hb.last_seen_at).getTime();
    const connected = diff < 10 * 60 * 1000;
    return { status: connected ? "online" as const : "offline" as const, hb };
  };

  const onlineCount = employees?.filter((e) => getAgentStatus(e.user_id).status === "online").length ?? 0;
  const offlineCount = employees?.filter((e) => getAgentStatus(e.user_id).status === "offline").length ?? 0;
  const neverCount = employees?.filter((e) => getAgentStatus(e.user_id).status === "never").length ?? 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Agent Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor desktop agent status across all employees
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchHeartbeats()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button onClick={handleDownloadConfig} disabled={downloading}>
              <Download className="mr-2 h-4 w-4" />
              {downloading ? "Downloading..." : "Download Config ZIP"}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="h-12 w-12 rounded-xl bg-[hsl(var(--success))]/10 flex items-center justify-center">
                <Wifi className="h-6 w-6 text-[hsl(var(--success))]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{onlineCount}</p>
                <p className="text-sm text-muted-foreground">Agents Online</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <WifiOff className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{offlineCount}</p>
                <p className="text-sm text-muted-foreground">Agents Offline</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                <Cpu className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{neverCount}</p>
                <p className="text-sm text-muted-foreground">Never Connected</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent Status Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Agent Status by Employee</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Heartbeat</TableHead>
                <TableHead>Hostname</TableHead>
                <TableHead>Agent Version</TableHead>
                <TableHead>User ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees?.map((emp) => {
                const { status, hb } = getAgentStatus(emp.user_id);
                const deptName = departments?.find((d) => d.id === emp.department_id)?.name ?? "Unassigned";

                return (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                          {emp.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{emp.full_name}</p>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{deptName}</TableCell>
                    <TableCell>
                      {status === "online" ? (
                        <Badge variant="outline" className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20">
                          <span className="h-2 w-2 rounded-full bg-[hsl(var(--success))] mr-1.5 animate-pulse" />
                          Online
                        </Badge>
                      ) : status === "offline" ? (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                          <span className="h-2 w-2 rounded-full bg-destructive mr-1.5" />
                          Offline
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                          <span className="h-2 w-2 rounded-full bg-muted-foreground mr-1.5" />
                          Never Connected
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {hb ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span title={format(new Date(hb.last_seen_at), "PPpp")}>
                            {formatDistanceToNow(new Date(hb.last_seen_at), { addSuffix: true })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {hb?.hostname ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                          {hb.hostname}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {hb?.agent_version ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono select-all">
                        {emp.user_id.substring(0, 8)}…
                      </code>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AgentManagement;
