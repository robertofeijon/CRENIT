import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { TenantLayout } from "./layouts/TenantLayout";
import { LandlordLayout } from "./layouts/LandlordLayout";
import { AuthPage } from "./pages/AuthPage";
import { LandingPage } from "./pages/LandingPage";
import { TenantWelcomePage } from "./pages/TenantWelcomePage";
import { DashboardHomePage } from "./pages/DashboardHomePage";
import { VerificationPage } from "./pages/VerificationPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { CreditScorePage } from "./pages/CreditScorePage";
import { LeasePage } from "./pages/LeasePage";
import { DepositEscrowPage } from "./pages/DepositEscrowPage";
import { DisputesPage } from "./pages/DisputesPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { ProfileSettingsPage } from "./pages/ProfileSettingsPage";
import { SupportPage } from "./pages/SupportPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LandlordDashboardPage } from "./pages/landlord/LandlordDashboardPage";
import { LandlordPropertiesPage } from "./pages/landlord/LandlordPropertiesPage";
import { LandlordUnitsPage } from "./pages/landlord/LandlordUnitsPage";
import { LandlordTenantsPage } from "./pages/landlord/LandlordTenantsPage";
import { LandlordPaymentsPage } from "./pages/landlord/LandlordPaymentsPage";
import { LandlordReportsPage } from "./pages/landlord/LandlordReportsPage";
import { LandlordDepositsPage } from "./pages/landlord/LandlordDepositsPage";
import { LandlordDisputesPage } from "./pages/landlord/LandlordDisputesPage";
import { LandlordDocumentsPage } from "./pages/landlord/LandlordDocumentsPage";
import { LandlordCommunicationPage } from "./pages/landlord/LandlordCommunicationPage";
import { LandlordSettingsPage } from "./pages/landlord/LandlordSettingsPage";
import { LandlordSupportPage } from "./pages/landlord/LandlordSupportPage";
import "./App.css";
import "./components/ui/StateComponents.css";

function isLandlordRole(role) {
  return role === "landlord" || role === "admin";
}

function TenantRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div className="auth-page"><div className="auth-card"><p>Loading secure session...</p></div></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (user.role !== "customer") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Tenant Portal Only</h1>
          <p className="subtitle">You are signed in as {user.role}. Use a tenant account to access this portal.</p>
          <Navigate to="/auth" replace />
        </div>
      </div>
    );
  }

  return children;
}

function LandlordRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div className="auth-page"><div className="auth-card"><p>Loading secure session...</p></div></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!isLandlordRole(user.role)) {
    return <Navigate to="/tenant/welcome" replace />;
  }

  return children;
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();
  const homeElement = isAuthenticated
    ? <Navigate to={isLandlordRole(user?.role) ? "/landlord/dashboard" : "/tenant/welcome"} replace />
    : <LandingPage />;

  return (
    <Routes>
      <Route
        path="/auth"
        element={
          isAuthenticated
            ? <Navigate to={isLandlordRole(user?.role) ? "/landlord/dashboard" : "/tenant/welcome"} replace />
            : <AuthPage />
        }
      />

      <Route
        path="/landlord"
        element={
          <LandlordRoute>
            <LandlordLayout />
          </LandlordRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<LandlordDashboardPage />} />
        <Route path="properties" element={<LandlordPropertiesPage />} />
        <Route path="units" element={<LandlordUnitsPage />} />
        <Route path="tenants" element={<LandlordTenantsPage />} />
        <Route path="payments" element={<LandlordPaymentsPage />} />
        <Route path="reports" element={<LandlordReportsPage />} />
        <Route path="deposits" element={<LandlordDepositsPage />} />
        <Route path="disputes" element={<LandlordDisputesPage />} />
        <Route path="documents" element={<LandlordDocumentsPage />} />
        <Route path="communication" element={<LandlordCommunicationPage />} />
        <Route path="settings" element={<LandlordSettingsPage />} />
        <Route path="support" element={<LandlordSupportPage />} />
      </Route>

      <Route
        path="/tenant"
        element={
          <TenantRoute>
            <TenantLayout />
          </TenantRoute>
        }
      >
        <Route index element={<Navigate to="welcome" replace />} />
        <Route path="welcome" element={<TenantWelcomePage />} />
        <Route path="dashboard" element={<DashboardHomePage />} />
        <Route path="verification" element={<VerificationPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="credit" element={<CreditScorePage />} />
        <Route path="lease" element={<LeasePage />} />
        <Route path="deposit" element={<DepositEscrowPage />} />
        <Route path="disputes" element={<DisputesPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="settings" element={<ProfileSettingsPage />} />
        <Route path="support" element={<SupportPage />} />
      </Route>

      <Route path="/" element={homeElement} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
