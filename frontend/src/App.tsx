import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { SessionProvider, useSession } from './hooks/useSession';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { UserManagementPanel } from './components/admin/UserManagementPanel';

const SalesOrderAnalysis  = lazy(() => import('./pages/SalesOrderAnalysis').then(m => ({ default: m.SalesOrderAnalysis })));
const ProductSkuDashboard = lazy(() => import('./pages/ProductSkuDashboard').then(m => ({ default: m.ProductSkuDashboard })));
const SalesByChannelPage  = lazy(() => import('./pages/SalesByChannelPage').then(m => ({ default: m.SalesByChannelPage })));
const SalesVsTargetPage   = lazy(() => import('./pages/SalesVsTargetPage').then(m => ({ default: m.SalesVsTargetPage })));
const IntegrationsPage    = lazy(() => import('./pages/IntegrationsPage').then(m => ({ default: m.IntegrationsPage })));
const NocoDbMasterPage    = lazy(() => import('./pages/NocoDbMasterPage').then(m => ({ default: m.NocoDbMasterPage })));

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <svg className="h-6 w-6 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none" aria-label="Loading page…">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
    </div>
  );
}

function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<ProtectedAppLayout />}>
              <Route path="/" element={<Navigate to="/dashboards/sales" replace />} />
              <Route path="/dashboards/sales" element={<Suspense fallback={<PageFallback />}><SalesOrderAnalysis /></Suspense>} />
              <Route path="/dashboards/sales-by-channel" element={<Suspense fallback={<PageFallback />}><SalesByChannelPage /></Suspense>} />
              <Route path="/dashboards/sales-vs-target" element={<Suspense fallback={<PageFallback />}><SalesVsTargetPage /></Suspense>} />
              <Route path="/dashboards/product-sku" element={<Suspense fallback={<PageFallback />}><ProductSkuDashboard /></Suspense>} />
              <Route path="/integrations" element={<Suspense fallback={<PageFallback />}><IntegrationsPage /></Suspense>} />
              <Route path="/nocodb" element={<Suspense fallback={<PageFallback />}><NocoDbMasterPage /></Suspense>} />
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
