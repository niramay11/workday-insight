import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Search, UserPlus, Pencil, Users, Cpu } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { Navigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type AppRole = Database["public"]["Enums"]["app_role"];

const Employees = () => {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [editingEmployee, setEditingEmployee] = useState<(Profile & { role?: AppRole }) | null>(null);
  const [editDeptId, setEditDeptId] = useState<string>("none");
  const [editRole, setEditRole] = useState<AppRole>("employee");
  const [editStatus, setEditStatus] = useState<string>("active");

  // Invite employee state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDept, setInviteDept] = useState("none");
  const [inviteRole, setInviteRole] = useState<AppRole>("employee");
  const [inviteResult, setInviteResult] = useState<{ email: string; temp_password: string } | null>(null);
  const [inviting, setInviting] = useState(false);

  if (role !== "admin") return <Navigate to="/dashboard" replace />;

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: heartbeats } = useQuery({
    queryKey: ["agent_heartbeats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agent_heartbeats").select("*");
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingEmployee) return;

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          department_id: editDeptId === "none" ? null : editDeptId,
          status: editStatus,
        })
        .eq("id", editingEmployee.id);
      if (profileError) throw profileError;

      // Update role
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: editRole })
        .eq("user_id", editingEmployee.user_id);
      if (roleError) throw roleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["all-roles"] });
      toast({ title: "Employee updated" });
      setEditingEmployee(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const getRoleBadge = (userRole: AppRole) => {
    const colors: Record<AppRole, string> = {
      admin: "bg-primary/10 text-primary border-primary/20",
      manager: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20",
      employee: "bg-muted text-muted-foreground border-border",
    };
    return <Badge variant="outline" className={colors[userRole]}>{userRole}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <Badge variant="outline" className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20">Active</Badge>
    ) : (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Inactive</Badge>
    );
  };

  const getDeptName = (deptId: string | null) => {
    if (!deptId) return "Unassigned";
    return departments?.find((d) => d.id === deptId)?.name ?? "Unknown";
  };

  const getUserRole = (userId: string): AppRole => {
    return roles?.find((r) => r.user_id === userId)?.role ?? "employee";
  };

  const filtered = employees?.filter((e) => {
    const matchesSearch =
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase());
    const matchesDept = filterDept === "all" || e.department_id === filterDept || (filterDept === "none" && !e.department_id);
    return matchesSearch && matchesDept;
  });

  const openEdit = (emp: Profile) => {
    setEditingEmployee(emp);
    setEditDeptId(emp.department_id ?? "none");
    setEditRole(getUserRole(emp.user_id));
    setEditStatus(emp.status);
  };

  return (
    <>
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Employees
            </h1>
            <p className="text-muted-foreground mt-1">
              {employees?.length ?? 0} total employees
            </p>
          </div>
          <Button onClick={() => { setShowInvite(true); setInviteResult(null); setInviteName(""); setInviteEmail(""); setInviteDept("none"); setInviteRole("employee"); }}>
            <UserPlus className="mr-2 h-4 w-4" /> Invite Employee
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-9"
            />
          </div>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="none">Unassigned</SelectItem>
              {departments?.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered?.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg font-medium">No employees found</p>
              <p className="text-muted-foreground text-sm mt-1">Try adjusting your search or filter</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm">
            <Table>
              <TableHeader>
                 <TableRow>
                   <TableHead>Employee</TableHead>
                   <TableHead>Department</TableHead>
                   <TableHead>Role</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Agent</TableHead>
                   <TableHead className="w-12"></TableHead>
                 </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                          {emp.full_name.charAt(0)}
                        </div>
                        <div>
                          <Link to={`/employees/${emp.user_id}`} className="font-medium text-sm hover:text-primary transition-colors">
                            {emp.full_name}
                          </Link>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{getDeptName(emp.department_id)}</TableCell>
                    <TableCell>{getRoleBadge(getUserRole(emp.user_id))}</TableCell>
                    <TableCell>{getStatusBadge(emp.status)}</TableCell>
                    <TableCell>
                      {(() => {
                        const hb = heartbeats?.find((h) => h.user_id === emp.user_id);
                        const lastSeen = hb?.last_seen_at ?? null;
                        const connected = lastSeen ? (Date.now() - new Date(lastSeen).getTime()) < 10 * 60 * 1000 : false;
                        const dotColor = lastSeen == null ? "bg-muted-foreground" : connected ? "bg-[hsl(var(--success))]" : "bg-destructive";
                        const label = lastSeen == null ? "Never connected" : connected ? `Connected — ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}` : `Disconnected — ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}`;
                        return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center gap-1.5 cursor-default">
                                  <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{label}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(emp)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AppLayout>

      {/* Edit Dialog */}
      <Dialog open={!!editingEmployee} onOpenChange={(o) => !o && setEditingEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="font-medium">{editingEmployee?.full_name}</p>
              <p className="text-sm text-muted-foreground">{editingEmployee?.email}</p>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={editDeptId} onValueChange={setEditDeptId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {departments?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingEmployee(null)}>Cancel</Button>
              <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Employee</DialogTitle>
          </DialogHeader>
          {inviteResult ? (
            <div className="space-y-4">
              <div className="bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/20 rounded-lg p-4 space-y-2">
                <p className="font-medium text-[hsl(var(--success))]">Employee created successfully!</p>
                <p className="text-sm">Share these credentials with the employee:</p>
                <div className="space-y-1 font-mono text-sm bg-background rounded p-3">
                  <p><span className="text-muted-foreground">Email:</span> {inviteResult.email}</p>
                  <p><span className="text-muted-foreground">Password:</span> {inviteResult.temp_password}</p>
                </div>
                <p className="text-xs text-muted-foreground">The employee should change their password after first login.</p>
              </div>
              <Button className="w-full" onClick={() => setShowInvite(false)}>Done</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="john@company.com" />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={inviteDept} onValueChange={setInviteDept}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {departments?.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
                <Button
                  disabled={!inviteName.trim() || !inviteEmail.trim() || inviting}
                  onClick={async () => {
                    setInviting(true);
                    try {
                      const { data: sessionData } = await supabase.auth.getSession();
                      const token = sessionData?.session?.access_token;
                      if (!token) throw new Error("Not authenticated");
                      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
                      const res = await fetch(
                        `https://${projectId}.supabase.co/functions/v1/invite-employee`,
                        {
                          method: "POST",
                          headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            full_name: inviteName.trim(),
                            email: inviteEmail.trim(),
                            department_id: inviteDept === "none" ? null : inviteDept,
                            role: inviteRole,
                          }),
                        }
                      );
                      const result = await res.json();
                      if (!res.ok) throw new Error(result.error || "Failed to invite");
                      setInviteResult({ email: result.email, temp_password: result.temp_password });
                      queryClient.invalidateQueries({ queryKey: ["employees"] });
                      queryClient.invalidateQueries({ queryKey: ["all-roles"] });
                      toast({ title: "Employee invited successfully" });
                    } catch (err: any) {
                      toast({ title: "Error", description: err.message, variant: "destructive" });
                    } finally {
                      setInviting(false);
                    }
                  }}
                >
                  {inviting ? "Creating..." : "Create Employee"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Employees;
