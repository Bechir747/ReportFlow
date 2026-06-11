import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { UserRole } from "../types";

interface Props {
  roles: UserRole[];
  children: React.ReactNode;
}

export default function ProtectedRoute({ roles, children }: Props) {
  const { user, loading } = useAuth();

  if (loading) return <div role="status" aria-label="Loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role as UserRole)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
