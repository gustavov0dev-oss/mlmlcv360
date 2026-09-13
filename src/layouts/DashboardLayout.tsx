import { EmailReminder } from '@/components/auth/EmailReminder';
import { supportMode } from '@/lib/backend/client';
import { endSupportAccess } from '@/lib/backend/supportAccess';
import { LoadingRegion } from '@/components/ui/loading-region';
import { Navigate, useLocation } from '@/lib/router';
import { useAuthStore } from '@/store/authStore';
import { useConfig } from '@/store/configStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Wrench, X } from 'lucide-react';

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
const NovedadesAdminPage = lazy(() => import('@/pages/admin/NovedadesAdminPage'));
const ContactoAdminPage = lazy(() => import('@/pages/admin/ContactoAdminPage'));
const OportunidadAdminPage = lazy(() => import('@/pages/admin/OportunidadAdminPage'));
const NosotrosAdminPage = lazy(() => import('@/pages/admin/NosotrosAdminPage'));
const MyComplaintsPage = lazy(() => import('@/pages/dashboard/MyComplaintsPage'));



function DashboardContent() {
  const { pathname } = useLocation();

  const render = (Page: React.ComponentType) => (
    <Suspense fallback={<LoadingRegion className="min-h-[calc(100dvh-8rem)]" />}>
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
  if (pathname === '/dashboard/admin/novedades') return render(NovedadesAdminPage);
  if (pathname === '/dashboard/admin/contacto') return render(ContactoAdminPage);
  if (pathname === '/dashboard/admin/oportunidad') return render(OportunidadAdminPage);
  if (pathname === '/dashboard/admin/nosotros') return render(NosotrosAdminPage);
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
    return <LoadingRegion className="min-h-[100dvh]" />;
  }

  if (!user && supportMode) return <div className="p-8"><p>La sesión de soporte terminó.</p><button onClick={()=>void endSupportAccess()} className="text-primary mt-4">Volver a mi cuenta</button></div>;
  if (!user) return <Navigate to={'/login?next='+encodeURIComponent(window.location.pathname+window.location.search)} />;

  return (
    <div className="relative flex h-[100dvh] w-full max-w-7xl mx-auto bg-background overflow-hidden lg:border-x lg:border-border/50">
      <Sidebar />
      <div className={cn('flex flex-col min-w-0 h-[100dvh] overflow-hidden w-full transition-[margin] duration-200',
        sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]')}>
        <DashboardHeader />
        {supportMode&&<div role="status" className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm border-b border-amber-500/30 bg-amber-500/10"><span>Acceso de soporte: <strong>{user.full_name||user.username}</strong></span><button onClick={()=>void endSupportAccess()} className="font-semibold text-primary underline underline-offset-4">Volver a mi cuenta</button></div>}
        <MaintenanceBanner /><EmailReminder/>
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 bg-background dashboard-scroll">
          <div className="w-full max-w-[1400px] mx-auto px-1 sm:px-2 min-h-[calc(100dvh-8rem)]">
            <DashboardContent />
          </div>
        </main>
      </div>
    </div>
  );
}

// Persistent banner shown to admins while the public site is under maintenance,
// so they remember the site is closed to regular users even while they browse
// the dashboard. Dismissable per-session.
function MaintenanceBanner() {
  const { company } = useConfig();
  const isMaintenanceOn = company.maintenance_mode === 'true';
  const [dismissed, setDismissed] = useState(false);

  if (!isMaintenanceOn || dismissed) return null;

  return (
    <div className="flex items-center gap-3 px-4 sm:px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-300 text-sm">
      <Wrench className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 min-w-0">
        El sitio público está en <strong>mantenimiento</strong>. Los visitantes ven la página de mantenimiento; solo administradores acceden al panel.
      </span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Ocultar aviso"
        className="p-1 rounded hover:bg-amber-500/20 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
