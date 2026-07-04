import { ReactNode, useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider, useAuthStore } from '@/store/authStore';
import { ThemeProvider } from '@/store/themeStore';
import { UIProvider } from '@/store/uiStore';
import { ConfigProvider, useConfig } from '@/store/configStore';
import { Router, Routes, Route, Navigate, useLocation } from '@/lib/router';

import LandingPage from '@/pages/landing/LandingPage';
import NosotrosPage from '@/pages/landing/NosotrosPage';
import PreciosPage from '@/pages/landing/PreciosPage';
import EmpresaPage from '@/pages/landing/EmpresaPage';
import ContactoPage from '@/pages/landing/ContactoPage';
import PlanesPage from '@/pages/landing/PlanesPage';
import BlogPage from '@/pages/landing/BlogPage';
import PagoPage from '@/pages/landing/PagoPage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import DashboardLayout from '@/layouts/DashboardLayout';
import WhatsAppButton from '@/components/WhatsAppButton';
import NotFoundPage from '@/pages/NotFoundPage';
import StorePage from '@/pages/store/StorePage';
import ProductDetailPage from '@/pages/store/ProductDetailPage';
import CartPage from '@/pages/store/CartPage';
import CheckoutPage from '@/pages/store/CheckoutPage';
import ComparePage from '@/pages/store/ComparePage';
import WishlistPage from '@/pages/store/WishlistPage';
import { CartProvider } from '@/store/cartStore';
import { Boxes, Wrench as WrenchIcon } from 'lucide-react';

const LANDING_PATHS = ['/', '/nosotros', '/precios', '/empresa', '/contacto', '/planes', '/blog', '/pago', '/login', '/registro', '/reset-password', '/tienda', '/carrito', '/checkout', '/favoritos', '/tienda/comparar'];
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

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Cargando...</p>
        </div>
      </div>
    );
  }
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

  // Admins can always reach dashboard; everyone sees maintenance on public pages
  if (isMaintenanceOn && !isAdmin && !isDashboard) {
    // Allow login so admin can sign in
    if (pathname === '/login') return <>{children}</>;
    return <MaintenancePage />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { loading } = useConfig();
  const [forcedReady, setForcedReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setForcedReady(true), 2000);
    return () => clearTimeout(t);
  }, []);

  if (loading && !forcedReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <MaintenanceGate>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/nosotros" element={<NosotrosPage />} />
        <Route path="/precios" element={<PreciosPage />} />
        <Route path="/empresa" element={<EmpresaPage />} />
        <Route path="/contacto" element={<ContactoPage />} />
        <Route path="/planes" element={<PlanesPage />} />
        <Route path="/blog" element={<BlogPage />} />
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
        <Route path="/dashboard/*" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MaintenanceGate>
  );
}

export default function App() {
  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
}
