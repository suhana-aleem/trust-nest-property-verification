import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <p className="page-msg">Loading session...</p>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    const fallback = ["Admin", "LegalOfficer", "Registrar"].includes(user?.role)
      ? "/admin/dashboard"
      : "/dashboard";
    return <Navigate to={fallback} replace />;
  }
  return children;
}

export default ProtectedRoute;
