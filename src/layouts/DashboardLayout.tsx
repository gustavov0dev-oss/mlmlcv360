import { Navigate, useLocation } from '@/lib/router';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { lazy, Suspense, useEffect } from 'react';

const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const ProfilePage = lazy(() => import('@/pages/dashboard/ProfilePage'));
const ReportsPage = lazy(() => import('@/pages/dashboard/ReportsPage'));
const SettingsPage = lazy(() => import('@/pages/dashboard/SettingsPage'));
const NetworkPage = lazy(() => import('@/pages/mlm/NetworkPage'));
const CommissionsPage = lazy(() => import('@/pages/mlm/CommissionsPage'));
const RanksPage = lazy(() => import('@/pages/mlm/RanksPage'));
const AdminPage = lazy(() => import('@/pages/admin/AdminPage'));
const AdminCommissionsPage = lazy(() => import('@/pages/admin/AdminCommissionsPage'));
const RolesAdminPage = lazy(() => import('@/pages/admin/RolesAdminPage'));
const UsersPage = lazy(() => import('@/pages/admin/UsersPage'));
const MyPlanPage = lazy(() => import('@/pages/dashboard/MyPlanPage'));
const OrdersPage = lazy(() => import('@/pages/dashboard/OrdersPage'));
const OrderDetailPage = lazy(() => import('@/pages/dashboard/OrderDetailPage'));
const InvoicePage = lazy(() => import('@/pages/dashboard/InvoicePage'));
const ProductsAdminPage = lazy(() => import('@/pages/admin/store/ProductsAdminPage'));
const ProductFormPage = lazy(() => import('@/pages/admin/store/ProductFormPage'));
const OrdersAdminPage = lazy(() => import('@/pages/admin/store/OrdersAdminPage'));
const ShippingAdminPage = lazy(() => import('@/pages/admin/store/ShippingAdminPage'));
const CouponsAdminPage = lazy(() => import('@/pages/admin/store/CouponsAdminPage'));
const CategoriesAdminPage = lazy(() => import('@/pages/admin/store/CategoriesAdminPage'));
const MlmCommissionsAdminPage = lazy(() => import('@/pages/admin/store/MlmCommissionsAdminPage'));
const ReviewsAdminPage = lazy(() => import('@/pages/admin/store/ReviewsAdminPage'));
const TestimonialsManagerPage = lazy(() => import('@/pages/admin/TestimonialsManagerPage'));
const SocialLinksAdminPage = lazy(() => import('@/pages/admin/SocialLinksAdminPage'));
const FaqAdminPage = lazy(() => import('@/pages/admin/FaqAdminPage'));
const ComplaintsAdminPage = lazy(() => import('@/pages/admin/ComplaintsAdminPage'));
const LegalPagesAdminPage = lazy(() => import('@/pages/admin/LegalPagesAdminPage'));
const MyComplaintsPage = lazy(() => import('@/pages/dashboard/MyComplaintsPage'));

function PageSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

function DashboardContent() {
  const { pathname } = useLocation();

  const render = (Page: React.ComponentType) => (
    <Suspense fallback={<PageSkeleton />}>
      <Page />
    </Suspense>
  );

  if (pathname === '/dashboard' || pathname === '/dashboard/') return render(DashboardPage);
  if (pathname === '/dashboard/perfil') return render(ProfilePage);
  if (pathname === '/dashboard/reportes') return render(ReportsPage);
  if (pathname === '/dashboard/configuracion') return render(SettingsPage);
  if (pathname === '/dashboard/red') return render(NetworkPage);
  if (pathname === '/dashboard/comisiones') return render(CommissionsPage);
  if (pathname === '/dashboard/rangos') return render(RanksPage);
  if (pathname === '/dashboard/usuarios') return render(UsersPage);
  if (pathname === '/dashboard/admin') return render(AdminPage);
  if (pathname === '/dashboard/admin-comisiones') return render(AdminCommissionsPage);
  if (pathname === '/dashboard/admin/roles') return render(RolesAdminPage);
  if (pathname === '/dashboard/mi-plan') return render(MyPlanPage);
  if (pathname === '/dashboard/pedidos') return render(OrdersPage);
  if (pathname.startsWith('/dashboard/pedidos/factura/')) return render(InvoicePage);
  if (pathname.startsWith('/dashboard/pedidos/')) return render(OrderDetailPage);
  if (pathname === '/dashboard/admin/productos') return render(ProductsAdminPage);
  if (pathname === '/dashboard/admin/productos/nuevo') return render(ProductFormPage);
  if (pathname.startsWith('/dashboard/admin/productos/')) return render(ProductFormPage);
  if (pathname === '/dashboard/admin/pedidos') return render(OrdersAdminPage);
  if (pathname.startsWith('/dashboard/admin/pedidos/')) return render(OrderDetailPage);
  if (pathname === '/dashboard/admin/envios') return render(ShippingAdminPage);
  if (pathname === '/dashboard/admin/cupones') return render(CouponsAdminPage);
  if (pathname === '/dashboard/admin/categorias') return render(CategoriesAdminPage);
  if (pathname === '/dashboard/admin/comisiones-mlm') return render(MlmCommissionsAdminPage);
  if (pathname === '/dashboard/admin/resenas') return render(ReviewsAdminPage);
  if (pathname === '/dashboard/admin/testimonios' || pathname === '/dashboard/admin/ciudades') return render(TestimonialsManagerPage);
  if (pathname === '/dashboard/admin/redes-sociales') return render(SocialLinksAdminPage);
  if (pathname === '/dashboard/admin/faq') return render(FaqAdminPage);
  if (pathname === '/dashboard/admin/libro-reclamaciones') return render(ComplaintsAdminPage);
  if (pathname === '/dashboard/admin/paginas') return render(LegalPagesAdminPage);
  if (pathname === '/dashboard/mis-reclamos') return render(MyComplaintsPage);

  return render(DashboardPage);
}

export default function DashboardLayout() {
  const { sidebarCollapsed } = useUIStore();
  const { user, loading } = useAuthStore();

  // Prevent body-level scroll while the dashboard is mounted — the dashboard
  // manages its own internal scroll via the main element's overflow-y-auto.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        <div className="hidden lg:flex flex-col w-[260px] h-full bg-card border-r border-border flex-shrink-0 p-4 gap-3">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16" /></div>
          </div>
          {Array.from({ length: 8 }).map((_, i) => (<Skeleton key={i} className="h-9 w-full rounded-xl" />))}
        </div>
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
            <PageSkeleton />
          </main>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      <Sidebar />
      <div className={cn('flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden transition-[margin] duration-200 lg:ml-auto',
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
