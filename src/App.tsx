import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { SettingsProvider } from "./context/SettingsContext.js";
import Login from "./pages/Login.js";
import ForgotPassword from "./pages/ForgotPassword.js";
import ResetPassword from "./pages/ResetPassword.js";
import SetupAdmin from "./pages/SetupAdmin.js";
import AdminDashboard from "./pages/AdminDashboard.js";
import AdminAlbumDetail from "./pages/AdminAlbumDetail.js";
import AdminProofingDashboard from "./pages/AdminProofingDashboard.js";
import AdminProofingManager from "./pages/AdminProofingManager.js";
import WeddingCrewManager from "./pages/WeddingCrewManager.js";
import StudioClientsManager from "./pages/StudioClientsManager.js";
import ClientGallery from "./pages/ClientGallery.js";
import ClientProofingView from "./pages/ClientProofingView.js";
import ProtectedRoute from "./components/ProtectedRoute.js";

function RootRedirect() {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center text-gray-900" id="root-loader">
        <div className="h-12 w-12 rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin" />
        <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase mt-4 block">
          Loading Session...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const role = user?.role?.toLowerCase() || "";
  if (role === "super_admin" || role === "superadmin" || role === "super_admin_role" || user?.role === "SUPER_ADMIN") {
    return <Navigate to="/admin/studio-clients" replace />;
  }

  return <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <SettingsProvider>
          <Routes>
            {/* Public Authentication & Client Gallery Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/setup-admin" element={<SetupAdmin />} />
            <Route path="/gallery/:id" element={<ClientGallery />} />
            <Route path="/gallery/:albumId/proofing" element={<ClientProofingView />} />

            {/* Protected Administrative Suite */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/proofing"
              element={
                <ProtectedRoute>
                  <AdminProofingDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/wedding-crew"
              element={
                <ProtectedRoute>
                  <WeddingCrewManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/studio-clients"
              element={
                <ProtectedRoute>
                  <StudioClientsManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/albums/:id"
              element={
                <ProtectedRoute>
                  <AdminAlbumDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/albums/:albumId/proofing"
              element={
                <ProtectedRoute>
                  <AdminProofingManager />
                </ProtectedRoute>
              }
            />

            {/* Dynamic Root & Fallback Routes */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </SettingsProvider>
      </Router>
    </AuthProvider>
  );
}
