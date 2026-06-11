import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import DepositorDashboard from "./pages/DepositorDashboard";
import ApproverDashboard from "./pages/ApproverDashboard";
import { UserRole } from "./types";

function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <div role="status" aria-label="Loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const role = user.role as UserRole;
  if (role === UserRole.ADMIN) return <Navigate to="/admin" replace />;
  if (role === UserRole.DEPOSITOR) return <Navigate to="/depositor" replace />;
  if (role === UserRole.APPROVER) return <Navigate to="/approver" replace />;

  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={[UserRole.ADMIN]}>
                  <Layout><AdminDashboard /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/depositor"
              element={
                <ProtectedRoute roles={[UserRole.DEPOSITOR]}>
                  <Layout><DepositorDashboard /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/approver"
              element={
                <ProtectedRoute roles={[UserRole.APPROVER]}>
                  <Layout><ApproverDashboard /></Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
