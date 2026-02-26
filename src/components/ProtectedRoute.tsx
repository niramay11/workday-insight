import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AttendanceGate } from "@/components/AttendanceGate";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  // Employees must punch in before accessing the app
  if (role === "employee") {
    return <AttendanceGate>{children}</AttendanceGate>;
  }

  return <>{children}</>;
}
