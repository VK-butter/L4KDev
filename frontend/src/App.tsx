import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { SessionProvider, useSession } from './hooks/useSession';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardHome } from './pages/DashboardHome';
import { SalesOrderAnalysis } from './pages/SalesOrderAnalysis';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { UserManagementPanel } from './components/admin/UserManagementPanel';

function DashboardLayout() {
  const { user, logout } = useSession();
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  return (
    <>
      <AppShell
        user={user}
        onLogout={logout}
        onAdminMenu={() => setAdminPanelOpen(true)}
      >
        <DashboardHome />
      </AppShell>
      <UserManagementPanel
        isOpen={adminPanelOpen}
        onClose={() => setAdminPanelOpen(false)}
      />
    </>
  );
}

function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardLayout />} />
            <Route path="/dashboards/sales" element={<SalesLayout />} />
            <Route path="/integrations" element={<IntegrationsLayout />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}

function IntegrationsLayout() {
  const { user, logout } = useSession();
  return (
    <AppShell user={user} onLogout={logout}>
      <IntegrationsPage />
    </AppShell>
  );
}

export default App;

function SalesLayout() {
  const { user, logout } = useSession();
  return (
    <AppShell user={user} onLogout={logout}>
      <SalesOrderAnalysis />
    </AppShell>
  );
}
