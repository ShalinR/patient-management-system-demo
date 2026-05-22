import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { FullPageSpinner } from "@/components/ui/spinner";

type Role = "ADMIN" | "DOCTOR" | "NURSE";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Optional: restrict to specific roles. Omit for any authenticated user. */
  allow?: Role[];
}

/**
 * Route guard for the SPA.
 *
 * - Waits for auth bootstrap to finish (avoids flashing the login page on
 *   reload while the session is being rehydrated).
 * - Redirects unauthenticated users to /login.
 * - Optionally restricts by role. The API still enforces authorization on
 *   every request; this guard is a UX convenience, not a security boundary.
 */
export const ProtectedRoute = ({ children, allow }: ProtectedRouteProps) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allow && user && !allow.includes(user.role as Role)) {
    return <Navigate to="/forbidden" replace />;
  }
  return <>{children}</>;
};
