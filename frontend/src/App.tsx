import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import DepositorDashboard from "./pages/DepositorDashboard";
import ApproverDashboard from "./pages/ApproverDashboard";
import type { UserRole } from "./types";

function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const role = user.role as UserRole;
  if (role === "ADMIN") return <Navigate to="/admin" replace />;
  if (role === "DEPOSITOR") return <Navigate to="/depositor" replace />;
  if (role === "APPROVER") return <Navigate to="/approver" replace />;

  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/depositor"
            element={
              <ProtectedRoute roles={["DEPOSITOR"]}>
                <DepositorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/approver"
            element={
              <ProtectedRoute roles={["APPROVER"]}>
                <ApproverDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
