import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Clock,
  LayoutDashboard,
  Users,
  Building2,
  FileBarChart,
  Settings,
  LogOut,
  Timer,
  Activity,
  Monitor,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = {
  employee: [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/timesheet", icon: Timer, label: "My Timesheet" },
    { to: "/activity", icon: Activity, label: "My Activity" },
  ],
  manager: [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/timesheet", icon: Timer, label: "My Timesheet" },
    { to: "/team", icon: Users, label: "My Team" },
    { to: "/monitoring", icon: Monitor, label: "Live Monitor" },
    { to: "/reports", icon: FileBarChart, label: "Reports" },
  ],
  admin: [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/timesheet", icon: Timer, label: "My Timesheet" },
    { to: "/employees", icon: Users, label: "Employees" },
    { to: "/departments", icon: Building2, label: "Departments" },
    { to: "/monitoring", icon: Monitor, label: "Live Monitor" },
    { to: "/reports", icon: FileBarChart, label: "Reports" },
    { to: "/activity", icon: Activity, label: "Activity Logs" },
    { to: "/agents", icon: Cpu, label: "Agent Management" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ],
};

export function AppSidebar() {
  const { role, profile, signOut } = useAuth();
  const location = useLocation();
  const items = navItems[role ?? "employee"];

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-sidebar-background text-sidebar-foreground flex-col z-30">
      {/* Logo */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Clock className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              TimeTrack
            </h1>
            <p className="text-[11px] text-sidebar-muted capitalize">{role ?? "employee"}</p>
          </div>
        </div>
        <NotificationBell />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {items.map((item) => {
          const active = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-primary-foreground"
                  : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4", active && "text-primary")} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-semibold">
            {profile?.full_name?.charAt(0) ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name ?? "User"}</p>
            <p className="text-xs text-sidebar-muted truncate">{profile?.email}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm text-sidebar-muted hover:text-destructive transition-colors px-1"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
