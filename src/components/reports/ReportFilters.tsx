import { useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ReportFiltersProps {
  onFilterChange: (filters: { startDate: string; endDate: string; departmentId?: string; employeeId?: string }) => void;
}

export function ReportFilters({ onFilterChange }: ReportFiltersProps) {
  const { role } = useAuth();
  const [range, setRange] = useState("30");
  const [departmentId, setDepartmentId] = useState("all");
  const [employeeId, setEmployeeId] = useState("all");

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").order("name");
      return data ?? [];
    },
    enabled: role === "admin",
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-list"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name").order("full_name");
      return data ?? [];
    },
    enabled: role === "admin" || role === "manager",
  });

  const applyFilters = (r?: string, d?: string, e?: string) => {
    const days = parseInt(r ?? range);
    const end = format(new Date(), "yyyy-MM-dd'T'23:59:59");
    const start = format(subDays(new Date(), days), "yyyy-MM-dd'T'00:00:00");
    onFilterChange({
      startDate: start,
      endDate: end,
      departmentId: (d ?? departmentId) !== "all" ? (d ?? departmentId) : undefined,
      employeeId: (e ?? employeeId) !== "all" ? (e ?? employeeId) : undefined,
    });
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Select value={range} onValueChange={(v) => { setRange(v); applyFilters(v); }}>
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Last 7 days</SelectItem>
          <SelectItem value="30">Last 30 days</SelectItem>
          <SelectItem value="90">Last 90 days</SelectItem>
        </SelectContent>
      </Select>

      {role === "admin" && departments && (
        <Select value={departmentId} onValueChange={(v) => { setDepartmentId(v); applyFilters(undefined, v); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {(role === "admin" || role === "manager") && employees && (
        <Select value={employeeId} onValueChange={(v) => { setEmployeeId(v); applyFilters(undefined, undefined, v); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.user_id} value={e.user_id}>{e.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
