import { MaintenanceView } from '@/components/MaintenanceView';
import { LoadingRegion } from '@/components/ui/loading-region';
import { ReactNode, useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider, useAuthStore } from '@/store/authStore';
import { ThemeProvider, ThemeSync } from '@/store/themeStore';
import { UIProvider } from '@/store/uiStore';
import { ConfigProvider, useConfig } from '@/store/configStore';
import { BackendProvider, useDatabase } from '@/lib/backend';
import { Router, Routes, Route, Navigate, useLocation } from '@/lib/router';
import DashboardLayout from '@/layouts/DashboardLayout';
import SiteLayout from '@/layouts/SiteLayout';
import WhatsAppButton from '@/components/WhatsAppButton';
import { CartProvider } from '@/store/cartStore';
import { useSeo } from '@/hooks/useSeo';
import { usePwa } from '@/hooks/usePwa';

const LandingPage = lazy(() => import('@/pages/landing/LandingPage'));
const NosotrosPage = lazy(() => import('@/pages/landing/NosotrosPage'));
const PreciosPage = lazy(() => import('@/pages/landing/PreciosPage'));
const OportunidadPage = lazy(() => import('@/pages/landing/OportunidadPage'));
const ContactoPage = lazy(() => import('@/pages/landing/ContactoPage'));
const PlanesPage = lazy(() => import('@/pages/landing/PlanesPage'));
const BlogPage = lazy(() => import('@/pages/landing/BlogPage'));
const BlogDetailPage = lazy(() => import('@/pages/landing/BlogDetailPage'));
const LibroReclamacionesPage = lazy(() => import('@/pages/landing/LibroReclamacionesPage'));
const LegalPage = lazy(() => import('@/pages/landing/LegalPage'));
const PagoPage = lazy(() => import('@/pages/landing/PagoPage'));
const PedidosPage = lazy(() => import('@/pages/landing/PedidosPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const StorePage = lazy(() => import('@/pages/store/StorePage'));
const ProductDetailPage = lazy(() => import('@/pages/store/ProductDetailPage'));
const CartPage = lazy(() => import('@/pages/store/CartPage'));
const CheckoutPage = lazy(() => import('@/pages/store/CheckoutPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

const LANDING_PATHS = ['/', '/nosotros', '/precios', '/empresa', '/oportunidad', '/contacto', '/planes', '/blog', '/pago', '/login', '/registro', '/reset-password', '/tienda', '/packs', '/carrito', '/checkout', '/pedidos', '/favoritos', '/tienda/comparar', '/libro-reclamaciones', '/legal'];
const ADMIN_BYPASS_ROLES = ['super_admin', 'admin'];

function useCountdown(targetIso: string) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!targetIso) { setRemaining(null); return; }
    const target = new Date(targetIso).getTime();
    if (isNaN(target)) { setRemaining(null); return; }
    const tick = () => {
      const diff = target - Date.now();
      setRemaining(diff > 0 ? diff : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  return remaining;
}

function MaintenancePage() {
  const { company, refresh } = useConfig();
  const database = useDatabase();
  const showCountdown = company.maintenance_countdown_enabled === 'true';
  const countdownDate = company.maintenance_countdown_date || '';
  const remaining = useCountdown(countdownDate);

  // If a visitor lands on the maintenance page AFTER the countdown already
  // expired but the DB still says maintenance is on, ask the database to
  // self-disable and refresh config so the site comes back online without
  // needing an admin to toggle it manually.
  useEffect(() => {
    if (!showCountdown || !countdownDate) return;
    if (remaining === null) return;
    if (remaining > 0) return;
    database
      .rpc<boolean>('auto_disable_maintenance')
      .then(({ error }) => {
        if (!error) refresh();
      })
      .catch(() => {});
  }, [showCountdown, countdownDate, remaining, database, refresh]);

  return <div className="min-h-[100dvh] flex items-center bg-background"><MaintenanceView config={company} /></div>;
}


function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuthStore();

  if (loading) return <LoadingRegion className="min-h-[100dvh]" />;
  if (!session) return <Navigate to="/login" />;
  return <>{children}</>;
}

function WhatsAppGate() {
  const { pathname } = useLocation();
  const { company, loading: configLoading } = useConfig();
  const isLanding = LANDING_PATHS.some(p => pathname === p || pathname.startsWith(p + '?'));
  const isMaintenanceOn = company.maintenance_mode === 'true';
  if (configLoading || !isLanding || isMaintenanceOn) return null;
  return <WhatsAppButton />;
}

function MaintenanceGate({ children }: { children: ReactNode }) {
  const { company } = useConfig();
  const { user, loading: authLoading } = useAuthStore();
  const { pathname } = useLocation();

  const isMaintenanceOn = company.maintenance_mode === 'true';
  const isAdmin = user && ADMIN_BYPASS_ROLES.includes((user as any).role);
  const isDashboard = pathname.startsWith('/dashboard');

  if (isMaintenanceOn && !isDashboard) {
    if (authLoading) return <LoadingRegion className="min-h-[100dvh]" />;
    if (pathname === '/login' || pathname === '/registro' || pathname === '/reset-password') return <>{children}</>;
    // Admins bypass maintenance entirely — they see the regular content
    if (isAdmin) return <>{children}</>;
    // Non-admins see the maintenance page
    return <MaintenancePage />;
  }

  return <>{children}</>;
}

// Watches the maintenance countdown. When it reaches zero, automatically
// disables maintenance_mode so the public site comes back online and the
// dashboard maintenance banner disappears. The actual write is done via a
// SECURITY DEFINER RPC (auto_disable_maintenance) so the disable happens
// server-side even when no admin browser is open, and so the anon key never
// needs direct UPDATE access to system_config.
function MaintenanceAutoDisable() {
  const { company, refresh } = useConfig();
  const database = useDatabase();
  const ranRef = useRef(false);

  const isMaintenanceOn = company.maintenance_mode === 'true';
  const showCountdown = company.maintenance_countdown_enabled === 'true';
  const countdownDate = company.maintenance_countdown_date || '';
  const remaining = useCountdown(countdownDate);

  useEffect(() => {
    if (!isMaintenanceOn || !showCountdown || !countdownDate || ranRef.current) return;
    if (remaining === null) return;
    if (remaining > 0) return;

    // Countdown finished — ask the database to disable maintenance mode once.
    ranRef.current = true;
    database
      .rpc<boolean>('auto_disable_maintenance')
      .then(({ error }) => {
        if (error) {
          console.error('No se pudo desactivar el modo mantenimiento:', error);
          ranRef.current = false;
          return;
        }
        refresh();
      })
      .catch((e) => {
        console.error('Error al desactivar el modo mantenimiento:', e);
        ranRef.current = false;
      });
  }, [isMaintenanceOn, showCountdown, countdownDate, remaining, database, refresh]);

  return null;
}

function AppRoutes() {
  const { loading: configLoading, company } = useConfig();
  const { loading: authLoading } = useAuthStore();
  const [forcedReady, setForcedReady] = useState(false);

  useSeo();
  usePwa();

  // Sync global theme from system_config to all users
  const globalTheme = company.global_theme;
  // ThemeSync handles reading global_theme and persisting theme changes

  useEffect(() => {
    const t = setTimeout(() => setForcedReady(true), 2000);
    return () => clearTimeout(t);
  }, []);

  // Wait for BOTH config and auth to resolve before rendering routes.
  // This prevents guest-state flashes (e.g. "Empezar gratis" button) for
  // logged-in users during the initial session restore on manual reload.
  if ((configLoading || authLoading) && !forcedReady) return <LoadingRegion className="min-h-[100dvh]" />;
  return (
    <MaintenanceGate>
      <ThemeSync globalTheme={globalTheme} />
      <MaintenanceAutoDisable />
      <Suspense fallback={<LoadingRegion className="min-h-[100dvh]" />}>
        <Routes>
          <Route path="/" element={<SiteLayout><LandingPage /></SiteLayout>} />
          <Route path="/nosotros" element={<SiteLayout><NosotrosPage /></SiteLayout>} />
          <Route path="/precios" element={<SiteLayout><PreciosPage /></SiteLayout>} />
          <Route path="/empresa" element={<Navigate to="/oportunidad" replace />} />
          <Route path="/oportunidad" element={<SiteLayout><OportunidadPage /></SiteLayout>} />
          <Route path="/contacto" element={<SiteLayout><ContactoPage /></SiteLayout>} />
          <Route path="/planes" element={<SiteLayout><PlanesPage /></SiteLayout>} />
          <Route path="/blog" element={<SiteLayout><BlogPage /></SiteLayout>} />
          <Route path="/blog/:slug" element={<SiteLayout><BlogDetailPage /></SiteLayout>} />
          <Route path="/libro-reclamaciones" element={<SiteLayout><LibroReclamacionesPage /></SiteLayout>} />
          <Route path="/legal/:slug" element={<SiteLayout><LegalPage /></SiteLayout>} />
          <Route path="/pago" element={<SiteLayout><PagoPage /></SiteLayout>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/packs" element={<SiteLayout><StorePage /></SiteLayout>} />
          <Route path="/tienda" element={<SiteLayout><StorePage /></SiteLayout>} />
          <Route path="/tienda/comparar" element={<SiteLayout><ProtectedRoute><PedidosPage initialTab="comparar" /></ProtectedRoute></SiteLayout>} />
          <Route path="/tienda/*" element={<SiteLayout><ProductDetailPage /></SiteLayout>} />
          <Route path="/carrito" element={<SiteLayout><CartPage /></SiteLayout>} />
          <Route path="/checkout" element={<SiteLayout><ProtectedRoute><CheckoutPage /></ProtectedRoute></SiteLayout>} />
          <Route path="/favoritos" element={<SiteLayout><ProtectedRoute><PedidosPage initialTab="favoritos" /></ProtectedRoute></SiteLayout>} />
          <Route path="/pedidos" element={<SiteLayout><ProtectedRoute><PedidosPage initialTab="pedidos" /></ProtectedRoute></SiteLayout>} />
          <Route path="/dashboard/*" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>} />
          <Route path="*" element={<SiteLayout><NotFoundPage /></SiteLayout>} />
        </Routes>
      </Suspense>
    </MaintenanceGate>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BackendProvider>
        <AuthProvider>
          <ConfigProvider>
            <UIProvider>
              <CartProvider>
                <Router>
                  <AppRoutes />
                  <WhatsAppGate />
                  <Toaster position="top-right" richColors closeButton toastOptions={{ duration: 4000 }} />
                </Router>
              </CartProvider>
            </UIProvider>
          </ConfigProvider>
        </AuthProvider>
      </BackendProvider>
    </ThemeProvider>
  );
}
