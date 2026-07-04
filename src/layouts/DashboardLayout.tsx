import { Navigate, useLocation } from '@/lib/router';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import ProfilePage from '@/pages/dashboard/ProfilePage';
import ReportsPage from '@/pages/dashboard/ReportsPage';
import SettingsPage from '@/pages/dashboard/SettingsPage';
import NetworkPage from '@/pages/mlm/NetworkPage';
import CommissionsPage from '@/pages/mlm/CommissionsPage';
import RanksPage from '@/pages/mlm/RanksPage';
import AdminPage from '@/pages/admin/AdminPage';
import AdminCommissionsPage from '@/pages/admin/AdminCommissionsPage';
import RolesAdminPage from '@/pages/admin/RolesAdminPage';
import UsersPage from '@/pages/admin/UsersPage';
import MyPlanPage from '@/pages/dashboard/MyPlanPage';
import OrdersPage from '@/pages/dashboard/OrdersPage';
import OrderDetailPage from '@/pages/dashboard/OrderDetailPage';
import InvoicePage from '@/pages/dashboard/InvoicePage';
import ProductsAdminPage from '@/pages/admin/store/ProductsAdminPage';
import ProductFormPage from '@/pages/admin/store/ProductFormPage';
import OrdersAdminPage from '@/pages/admin/store/OrdersAdminPage';
import ShippingAdminPage from '@/pages/admin/store/ShippingAdminPage';
import CouponsAdminPage from '@/pages/admin/store/CouponsAdminPage';
import CategoriesAdminPage from '@/pages/admin/store/CategoriesAdminPage';
import MlmCommissionsAdminPage from '@/pages/admin/store/MlmCommissionsAdminPage';
import ReviewsAdminPage from '@/pages/admin/store/ReviewsAdminPage';

function DashboardContent() {
  const { pathname } = useLocation();

  if (pathname === '/dashboard' || pathname === '/dashboard/') return <DashboardPage />;
  if (pathname === '/dashboard/perfil') return <ProfilePage />;
  if (pathname === '/dashboard/reportes') return <ReportsPage />;
  if (pathname === '/dashboard/configuracion') return <SettingsPage />;
  if (pathname === '/dashboard/red') return <NetworkPage />;
  if (pathname === '/dashboard/comisiones') return <CommissionsPage />;
  if (pathname === '/dashboard/rangos') return <RanksPage />;
  if (pathname === '/dashboard/usuarios') return <UsersPage />;
  if (pathname === '/dashboard/admin') return <AdminPage />;
  if (pathname === '/dashboard/admin-comisiones') return <AdminCommissionsPage />;
  if (pathname === '/dashboard/admin/roles') return <RolesAdminPage />;
  if (pathname === '/dashboard/mi-plan') return <MyPlanPage />;
  if (pathname === '/dashboard/pedidos') return <OrdersPage />;
  if (pathname.startsWith('/dashboard/pedidos/factura/')) return <InvoicePage />;
  if (pathname.startsWith('/dashboard/pedidos/')) return <OrderDetailPage />;
  if (pathname === '/dashboard/admin/productos') return <ProductsAdminPage />;
  if (pathname === '/dashboard/admin/productos/nuevo') return <ProductFormPage />;
  if (pathname.startsWith('/dashboard/admin/productos/')) return <ProductFormPage />;
  if (pathname === '/dashboard/admin/pedidos') return <OrdersAdminPage />;
  if (pathname.startsWith('/dashboard/admin/pedidos/')) return <OrderDetailPage />;
  if (pathname === '/dashboard/admin/envios') return <ShippingAdminPage />;
  if (pathname === '/dashboard/admin/cupones') return <CouponsAdminPage />;
  if (pathname === '/dashboard/admin/categorias') return <CategoriesAdminPage />;
  if (pathname === '/dashboard/admin/comisiones-mlm') return <MlmCommissionsAdminPage />;
  if (pathname === '/dashboard/admin/resenas') return <ReviewsAdminPage />;

  return <DashboardPage />;
}

export default function DashboardLayout() {
  const { sidebarCollapsed } = useUIStore();
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className={cn('flex-1 flex flex-col min-w-0 transition-all duration-300 lg:ml-auto',
        sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]')}>
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background">
          <DashboardContent />
        </main>
      </div>
    </div>
  );
}
