import { ReactNode, useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider, useAuthStore } from '@/store/authStore';
import { ThemeProvider, ThemeSync } from '@/store/themeStore';
import { UIProvider } from '@/store/uiStore';
import { ConfigProvider, useConfig } from '@/store/configStore';
import { BackendProvider, useDatabase } from '@/lib/backend';
import { Router, Routes, Route, Navigate, useLocation } from '@/lib/router';
import DashboardLayout from '@/layouts/DashboardLayout';
import WhatsAppButton from '@/components/WhatsAppButton';
import { CartProvider } from '@/store/cartStore';
import { useSeo } from '@/hooks/useSeo';
import { usePwa } from '@/hooks/usePwa';
import Logo from '@/components/Logo';

const LandingPage = lazy(() => import('@/pages/landing/LandingPage'));
const NosotrosPage = lazy(() => import('@/pages/landing/NosotrosPage'));
const PreciosPage = lazy(() => import('@/pages/landing/PreciosPage'));
const EmpresaPage = lazy(() => import('@/pages/landing/EmpresaPage'));
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

const LANDING_PATHS = ['/', '/nosotros', '/precios', '/empresa', '/contacto', '/planes', '/blog', '/pago', '/login', '/registro', '/reset-password', '/tienda', '/carrito', '/checkout', '/pedidos', '/favoritos', '/tienda/comparar', '/libro-reclamaciones', '/legal'];
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

function formatCountdown(ms: number) {
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { d, h, m, s };
}

function MaintenancePage() {
  const { company, refresh } = useConfig();
  const database = useDatabase();
  const name = company.company_name || 'MLM 360';
  const msg = company.maintenance_message || 'Estamos realizando mejoras en nuestra plataforma. Volveremos pronto con una experiencia renovada.';
  const title = company.maintenance_title || 'Volveremos pronto';
  const themeColor = company.pwa_theme_color || '#C79B3B';
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

  return (
    <div className="min-h-[100dvh] w-full overflow-y-auto bg-background flex flex-col items-center justify-center px-4 py-10 relative">
      {/* Faded grid mesh background */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, ${themeColor}22 1px, transparent 1px), linear-gradient(to bottom, ${themeColor}22 1px, transparent 1px)`,
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 100%)',
        }}
      />
      {/* Soft glow accents */}
      <div className="fixed inset-0 -z-10 opacity-[0.07] pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[30rem] h-[30rem] rounded-full blur-3xl" style={{ background: themeColor }} />
        <div className="absolute -bottom-40 -right-32 w-[34rem] h-[34rem] rounded-full blur-3xl" style={{ background: themeColor }} />
      </div>

      {/* Logo */}
      <div className="flex justify-center mb-8 sm:mb-10 shrink-0">
        <Logo
          value={company.logo_value || ''}
          fallbackText={name}
          imgClass="max-w-[160px] sm:max-w-[196px] w-full h-auto object-contain"
        />
      </div>

      {/* Main content centered */}
      <div className="flex flex-col items-center justify-center text-center w-full max-w-xl mx-auto">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-3 sm:mb-4">
          {title}
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base lg:text-lg leading-relaxed max-w-md mx-auto mb-8 sm:mb-10">
          {msg}
        </p>

        {/* Countdown timer */}
        {showCountdown && remaining !== null && remaining > 0 && (() => {
          const { d, h, m, s } = formatCountdown(remaining);
          const units = [
            { v: d, l: 'Días' },
            { v: h, l: 'Horas' },
            { v: m, l: 'Min' },
            { v: s, l: 'Seg' },
          ];
          return (
            <div className="flex justify-center gap-3 sm:gap-4">
              {units.map((u, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div
                    className="relative w-[17vw] max-w-[80px] aspect-square rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold tabular-nums select-none overflow-hidden"
                    style={{
                      background: 'hsl(var(--muted))',
                      border: '1px solid hsl(var(--border))',
                      color: 'hsl(var(--foreground))',
                    }}
                  >
                    <span className="absolute inset-x-0 top-1/2 -translate-y-px h-px bg-current opacity-10 pointer-events-none" />
                    <span className="relative z-10">{String(u.v).padStart(2, '0')}</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">{u.l}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function AppSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div className="w-12 h-12 rounded-2xl bg-muted animate-pulse" />
        <div className="space-y-2 text-center">
          <div className="h-2.5 w-32 bg-muted rounded-full animate-pulse mx-auto" />
          <div className="h-2 w-20 bg-muted rounded-full animate-pulse mx-auto" />
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuthStore();

  if (loading) return <AppSkeleton />;
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
    if (authLoading) return <AppSkeleton />;
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
  if ((configLoading || authLoading) && !forcedReady) return <AppSkeleton />;
  return (
    <MaintenanceGate>
      <ThemeSync globalTheme={globalTheme} />
      <MaintenanceAutoDisable />
      <Suspense fallback={<AppSkeleton />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/nosotros" element={<NosotrosPage />} />
          <Route path="/precios" element={<PreciosPage />} />
          <Route path="/empresa" element={<EmpresaPage />} />
          <Route path="/contacto" element={<ContactoPage />} />
          <Route path="/planes" element={<PlanesPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogDetailPage />} />
          <Route path="/libro-reclamaciones" element={<LibroReclamacionesPage />} />
          <Route path="/legal/:slug" element={<LegalPage />} />
          <Route path="/pago" element={<PagoPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/tienda" element={<StorePage />} />
          <Route path="/tienda/comparar" element={<ProtectedRoute><PedidosPage initialTab="comparar" /></ProtectedRoute>} />
          <Route path="/tienda/*" element={<ProductDetailPage />} />
          <Route path="/carrito" element={<CartPage />} />
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="/favoritos" element={<ProtectedRoute><PedidosPage initialTab="favoritos" /></ProtectedRoute>} />
          <Route path="/pedidos" element={<ProtectedRoute><PedidosPage initialTab="pedidos" /></ProtectedRoute>} />
          <Route path="/dashboard/*" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>} />
          <Route path="*" element={<NotFoundPage />} />
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
