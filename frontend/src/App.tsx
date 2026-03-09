import { useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { SessionProvider, useSession } from './hooks/useSession';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { SalesOrderAnalysis } from './pages/SalesOrderAnalysis';
import { ProductSkuDashboard } from './pages/ProductSkuDashboard';
import { SalesByChannelPage } from './pages/SalesByChannelPage';
import { SalesVsTargetPage } from './pages/SalesVsTargetPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { NocoDbMasterPage } from './pages/NocoDbMasterPage';
import { UserManagementPanel } from './components/admin/UserManagementPanel';

function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<ProtectedAppLayout />}>
              <Route path="/" element={<Navigate to="/dashboards/sales" replace />} />
              <Route path="/dashboards/sales" element={<SalesOrderAnalysis />} />
              <Route path="/dashboards/sales-by-channel" element={<SalesByChannelPage />} />
              <Route path="/dashboards/sales-vs-target" element={<SalesVsTargetPage />} />
              <Route path="/dashboards/product-sku" element={<ProductSkuDashboard />} />
              <Route path="/integrations" element={<IntegrationsPage />} />
              <Route path="/nocodb" element={<NocoDbMasterPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}

export default App;

function ProtectedAppLayout() {
  const { user, logout } = useSession();
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  return (
    <>
      <AppShell
        user={user}
        onLogout={logout}
        onAdminMenu={() => setAdminPanelOpen(true)}
      >
        <Outlet />
      </AppShell>
      <UserManagementPanel
        isOpen={adminPanelOpen}
        onClose={() => setAdminPanelOpen(false)}
      />
    </>
  );
}
