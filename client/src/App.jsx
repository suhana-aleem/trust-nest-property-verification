import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import InviteRegisterPage from "./pages/InviteRegisterPage";
import DashboardPage from "./pages/DashboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import DocumentDetailPage from "./pages/DocumentDetailPage";
import EditorPage from "./pages/EditorPage";
import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/invite-register" element={<InviteRegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["Seller", "Buyer"]}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={["Admin", "LegalOfficer", "Registrar"]}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/:id"
        element={
          <ProtectedRoute>
            <DocumentDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/:id/editor"
        element={
          <ProtectedRoute>
            <EditorPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
