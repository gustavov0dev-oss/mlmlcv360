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
import { Boxes, Wrench as WrenchIcon } from 'lucide-react';
import { useSeo } from '@/hooks/useSeo';

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
  const msg = company.maintenance_message || 'Estamos realizando mejoras. Volvemos pronto.';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <WrenchIcon className="w-8 h-8 text-primary" />
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Boxes className="w-6 h-6 text-primary" />
        <span className="text-xl font-bold text-foreground">{name}</span>
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-3">En mantenimiento</h1>
      <p className="text-muted-foreground max-w-md mb-8">{msg}</p>
      {user && ADMIN_BYPASS_ROLES.includes((user as any).role) && (
        <div className="text-xs text-muted-foreground bg-muted px-4 py-2 rounded-full">
          Eres administrador — puedes acceder igualmente al{' '}
          <a href="/dashboard" className="text-primary font-medium underline">panel</a>.
        </div>
      )}
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
  const { user } = useAuthStore();
  const { pathname } = useLocation();

  const isMaintenanceOn = company.maintenance_mode === 'true';
  const isAdmin = user && ADMIN_BYPASS_ROLES.includes((user as any).role);
  const isDashboard = pathname.startsWith('/dashboard');

  if (isMaintenanceOn && !isAdmin && !isDashboard) {
    if (pathname === '/login') return <>{children}</>;
    return <MaintenancePage />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { loading } = useConfig();
  const [forcedReady, setForcedReady] = useState(false);

  useSeo();

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
