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
import { Skeleton } from '@/components/ui/skeleton';
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
import TestimonialsManagerPage from '@/pages/admin/TestimonialsManagerPage';
import SocialLinksAdminPage from '@/pages/admin/SocialLinksAdminPage';
import FaqAdminPage from '@/pages/admin/FaqAdminPage';
import ComplaintsAdminPage from '@/pages/admin/ComplaintsAdminPage';
import LegalPagesAdminPage from '@/pages/admin/LegalPagesAdminPage';
import MyComplaintsPage from '@/pages/dashboard/MyComplaintsPage';

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
  if (pathname === '/dashboard/admin/testimonios' || pathname === '/dashboard/admin/ciudades') return <TestimonialsManagerPage />;
  if (pathname === '/dashboard/admin/redes-sociales') return <SocialLinksAdminPage />;
  if (pathname === '/dashboard/admin/faq') return <FaqAdminPage />;
  if (pathname === '/dashboard/admin/libro-reclamaciones') return <ComplaintsAdminPage />;
  if (pathname === '/dashboard/admin/paginas') return <LegalPagesAdminPage />;
  if (pathname === '/dashboard/mis-reclamos') return <MyComplaintsPage />;

  return <DashboardPage />;
}

export default function DashboardLayout() {
  const { sidebarCollapsed } = useUIStore();
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Sidebar placeholder */}
        <div className="hidden lg:flex flex-col w-[260px] h-full bg-card border-r border-border flex-shrink-0 p-4 gap-3">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16" /></div>
          </div>
          {Array.from({length:8}).map((_,i)=>(<Skeleton key={i} className="h-9 w-full rounded-xl" />))}
        </div>
        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-16 border-b border-border bg-card flex items-center gap-3 px-6">
            <Skeleton className="h-9 flex-1 max-w-xs rounded-xl" />
            <div className="ml-auto flex items-center gap-2">
              <Skeleton className="w-9 h-9 rounded-lg" />
              <Skeleton className="w-9 h-9 rounded-lg" />
              <Skeleton className="w-32 h-9 rounded-xl" />
            </div>
          </div>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="space-y-5">
              <div className="space-y-1.5"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64" /></div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({length:4}).map((_,i)=>(<div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3"><Skeleton className="w-10 h-10 rounded-xl" /><Skeleton className="h-7 w-28" /><Skeleton className="h-3 w-20" /></div>))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Skeleton className="lg:col-span-2 h-72 rounded-xl" />
                <Skeleton className="h-72 rounded-xl" />
              </div>
            </div>
          </main>
        </div>
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
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 bg-background dashboard-scroll">
          <div className="max-w-[1400px] mx-auto w-full">
            <DashboardContent />
          </div>
        </main>
      </div>
    </div>
  );
}
