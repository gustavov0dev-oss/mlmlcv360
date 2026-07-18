import { ReactNode, useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider, useAuthStore } from '@/store/authStore';
import { ThemeProvider } from '@/store/themeStore';
import { UIProvider } from '@/store/uiStore';
import { ConfigProvider, useConfig } from '@/store/configStore';
import { BackendProvider } from '@/lib/backend';
import { Router, Routes, Route, Navigate, useLocation } from '@/lib/router';
import DashboardLayout from '@/layouts/DashboardLayout';
import WhatsAppButton from '@/components/WhatsAppButton';
import { CartProvider } from '@/store/cartStore';
import { Boxes, Wrench as WrenchIcon, ArrowRight, ShieldCheck, Clock, Mail } from 'lucide-react';
import { useSeo } from '@/hooks/useSeo';
import { usePwa } from '@/hooks/usePwa';

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
const ComparePage = lazy(() => import('@/pages/store/ComparePage'));
const WishlistPage = lazy(() => import('@/pages/store/WishlistPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

const LANDING_PATHS = ['/', '/nosotros', '/precios', '/empresa', '/contacto', '/planes', '/blog', '/pago', '/login', '/registro', '/reset-password', '/tienda', '/carrito', '/checkout', '/favoritos', '/tienda/comparar', '/libro-reclamaciones', '/legal'];
const ADMIN_BYPASS_ROLES = ['super_admin', 'admin'];

function MaintenancePage() {
  const { company } = useConfig();
  const { user } = useAuthStore();
  const name = company.company_name || 'MLM 360';
  const msg = company.maintenance_message || 'Estamos realizando mejoras en nuestra plataforma. Volveremos pronto con una experiencia renovada.';
  const themeColor = company.pwa_theme_color || '#C79B3B';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 -z-10 opacity-[0.07] pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl" style={{ background: themeColor }} />
        <div className="absolute -bottom-32 -right-24 w-[28rem] h-[28rem] rounded-full blur-3xl" style={{ background: themeColor }} />
      </div>
      <div className="absolute inset-0 -z-10 opacity-[0.04] pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`, backgroundSize: '32px 32px' }} />

      <div className="w-full max-w-xl text-center">
        {/* Brand */}
        <div className="inline-flex items-center gap-2 mb-10">
          <Boxes className="w-6 h-6" style={{ color: themeColor }} />
          <span className="text-lg font-bold tracking-tight text-foreground">{name}</span>
        </div>

        {/* Animated icon */}
        <div className="relative mx-auto mb-8 w-24 h-24">
          <div className="absolute inset-0 rounded-3xl animate-ping opacity-20" style={{ background: themeColor }} />
          <div className="relative w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg" style={{ background: `${themeColor}1a`, border: `1px solid ${themeColor}33` }}>
            <WrenchIcon className="w-11 h-11" style={{ color: themeColor }} />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-5" style={{ background: `${themeColor}1a`, color: themeColor }}>
          <Clock className="w-3.5 h-3.5" />
          Modo mantenimiento
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4">
          Volveremos pronto
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-md mx-auto mb-10">
          {msg}
        </p>

        {/* Feature pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
          {[
            { icon: ShieldCheck, label: 'Mejoras de seguridad' },
            { icon: Clock, label: 'Mantenimiento programado' },
            { icon: Mail, label: 'Soporte disponible' },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
              <f.icon className="w-4 h-4 shrink-0" style={{ color: themeColor }} />
              <span className="text-sm text-muted-foreground text-left">{f.label}</span>
            </div>
          ))}
        </div>

        {user && ADMIN_BYPASS_ROLES.includes((user as any).role) ? (
          <a href="/dashboard" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5" style={{ background: themeColor }}>
            Ir al panel de administración
            <ArrowRight className="w-4 h-4" />
          </a>
        ) : (
          <a href="/" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium border border-border bg-card text-foreground hover:bg-muted transition-colors">
            <ArrowRight className="w-4 h-4 rotate-180" />
            Reintentar
          </a>
        )}
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
  const isLanding = LANDING_PATHS.some(p => pathname === p || pathname.startsWith(p + '?'));
  if (!isLanding) return null;
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
    if (pathname === '/login') return <>{children}</>;
    if (!isAdmin) return <MaintenancePage />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { loading } = useConfig();
  const [forcedReady, setForcedReady] = useState(false);

  useSeo();
  usePwa();

  useEffect(() => {
    const t = setTimeout(() => setForcedReady(true), 2000);
    return () => clearTimeout(t);
  }, []);

  if (loading && !forcedReady) return <AppSkeleton />;
  return (
    <MaintenanceGate>
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
          <Route path="/tienda/comparar" element={<ComparePage />} />
          <Route path="/tienda/*" element={<ProductDetailPage />} />
          <Route path="/carrito" element={<CartPage />} />
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="/favoritos" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
          <Route path="/pedidos" element={<ProtectedRoute><PedidosPage /></ProtectedRoute>} />
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
