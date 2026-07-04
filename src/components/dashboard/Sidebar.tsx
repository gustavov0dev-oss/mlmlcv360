import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useConfig } from '@/store/configStore';
import { cn } from '@/lib/utils';
import { Link, useLocation } from '@/lib/router';
import { useState } from 'react';
import { LayoutDashboard, Users, GitBranch, DollarSign, Award, ChartBar as BarChart3, Settings, ChevronDown, X, ChevronLeft, Boxes, UserCog, CreditCard, User, ShoppingBag, Package, Truck, Tag, ChartBar as BarChart2, ShoppingCart, FolderOpen, MessageSquare, Shield } from 'lucide-react';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  badge?: string;
}

const superAdminNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Usuarios', icon: Users,
    children: [
      { label: 'Lista de Usuarios', href: '/dashboard/usuarios', icon: Users },
      { label: 'Gestión de Roles', href: '/dashboard/admin/roles', icon: Shield },
    ]
  },
  { label: 'Red MLM', href: '/dashboard/red', icon: GitBranch },
  { label: 'Comisiones', href: '/dashboard/comisiones', icon: DollarSign },
  { label: 'Rangos', href: '/dashboard/rangos', icon: Award },
  {
    label: 'Tienda', icon: ShoppingBag,
    children: [
      { label: 'Ver Tienda', href: '/tienda', icon: ShoppingBag },
      { label: 'Productos', href: '/dashboard/admin/productos', icon: Package },
      { label: 'Categorías', href: '/dashboard/admin/categorias', icon: FolderOpen },
      { label: 'Pedidos', href: '/dashboard/admin/pedidos', icon: ShoppingCart },
      { label: 'Cupones', href: '/dashboard/admin/cupones', icon: Tag },
      { label: 'Envíos', href: '/dashboard/admin/envios', icon: Truck },
      { label: 'Reseñas', href: '/dashboard/admin/resenas', icon: MessageSquare },
      { label: 'Comisiones MLM', href: '/dashboard/admin/comisiones-mlm', icon: BarChart2 },
    ]
  },
  { label: 'Mi Plan', href: '/dashboard/mi-plan', icon: CreditCard },
  { label: 'Reportes', href: '/dashboard/reportes', icon: BarChart3 },
  { label: 'Gestión Admin', href: '/dashboard/admin', icon: UserCog },
  { label: 'Configuración', href: '/dashboard/configuracion', icon: Settings },
];

const adminNav: NavItem[] = [
  { label: 'Panel Admin', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Usuarios', icon: Users,
    children: [
      { label: 'Lista de Usuarios', href: '/dashboard/usuarios', icon: Users },
      { label: 'Gestión de Roles', href: '/dashboard/admin/roles', icon: Shield },
    ]
  },
  { label: 'Red MLM', href: '/dashboard/red', icon: GitBranch },
  { label: 'Comisiones', href: '/dashboard/comisiones', icon: DollarSign },
  { label: 'Rangos', href: '/dashboard/rangos', icon: Award },
  {
    label: 'Tienda', icon: ShoppingBag,
    children: [
      { label: 'Ver Tienda', href: '/tienda', icon: ShoppingBag },
      { label: 'Productos', href: '/dashboard/admin/productos', icon: Package },
      { label: 'Categorías', href: '/dashboard/admin/categorias', icon: FolderOpen },
      { label: 'Pedidos', href: '/dashboard/admin/pedidos', icon: ShoppingCart },
      { label: 'Cupones', href: '/dashboard/admin/cupones', icon: Tag },
      { label: 'Envíos', href: '/dashboard/admin/envios', icon: Truck },
      { label: 'Reseñas', href: '/dashboard/admin/resenas', icon: MessageSquare },
    ]
  },
  { label: 'Mi Plan', href: '/dashboard/mi-plan', icon: CreditCard },
  { label: 'Reportes', href: '/dashboard/reportes', icon: BarChart3 },
  { label: 'Gestión Admin', href: '/dashboard/admin', icon: UserCog },
];

const userNav: NavItem[] = [
  { label: 'Mi Panel', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Mi Perfil', href: '/dashboard/perfil', icon: User },
  { label: 'Mi Red', href: '/dashboard/red', icon: GitBranch },
  { label: 'Mis Comisiones', href: '/dashboard/comisiones', icon: DollarSign },
  { label: 'Mi Rango', href: '/dashboard/rangos', icon: Award },
  { label: 'Mi Plan', href: '/dashboard/mi-plan', icon: CreditCard },
  { label: 'Mis Pedidos', href: '/dashboard/pedidos', icon: ShoppingCart },
  { label: 'Tienda', href: '/tienda', icon: ShoppingBag },
  { label: 'Reportes', href: '/dashboard/reportes', icon: BarChart3 },
  { label: 'Configuración', href: '/dashboard/configuracion', icon: Settings },
];

const inspectorNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Usuarios', href: '/dashboard/usuarios', icon: Users },
  { label: 'Red MLM', href: '/dashboard/red', icon: GitBranch },
  { label: 'Comisiones', href: '/dashboard/comisiones', icon: DollarSign },
  { label: 'Reportes', href: '/dashboard/reportes', icon: BarChart3 },
];

function getNavForRole(role: string): NavItem[] {
  switch (role) {
    case 'super_admin': return superAdminNav;
    case 'admin': return adminNav;
    case 'inspector': return inspectorNav;
    default: return userNav;
  }
}

function NavItemComponent({ item, collapsed, depth = 0 }: { item: NavItem; collapsed: boolean; depth?: number }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(() => {
    if (!item.children) return false;
    return item.children.some(c => c.href && pathname.startsWith(c.href));
  });

  const isActive = item.href
    ? (item.href === '/dashboard' ? pathname === '/dashboard' || pathname === '/dashboard/'
      : pathname.startsWith(item.href))
    : false;

  if (item.children) {
    const hasActiveChild = item.children.some(c => c.href && pathname.startsWith(c.href));
    return (
      <div>
        <button onClick={() => setOpen(v => !v)}
          className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group',
            hasActiveChild ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            collapsed && 'justify-center px-2')}>
          <item.icon className={cn('w-4 h-4 flex-shrink-0', hasActiveChild ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
          {!collapsed && (<>
            <span className="flex-1 text-left truncate">{item.label}</span>
            <ChevronDown className={cn('w-3.5 h-3.5 flex-shrink-0 transition-transform', open && 'rotate-180')} />
          </>)}
        </button>
        {!collapsed && open && (
          <div className="mt-0.5 ml-3 border-l-2 border-border pl-3 space-y-0.5">
            {item.children.map(child => (
              <NavItemComponent key={child.href || child.label} item={child} collapsed={false} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link to={item.href!}
      className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group',
        isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        collapsed && 'justify-center px-2',
        depth > 0 && 'py-2 text-xs')}>
      <item.icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground')} />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
    </Link>
  );
}

export default function Sidebar() {
  const { user } = useAuthStore();
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const { company } = useConfig();

  const role = (user as any)?.role || 'user';
  const navItems = getNavForRole(role);
  const name = company.company_name || 'MLM360';

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        'fixed left-0 top-0 bottom-0 z-50 bg-card border-r border-border flex flex-col transition-all duration-300',
        'lg:translate-x-0',
        sidebarOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full w-[260px]',
        sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'
      )}>
        {/* Logo */}
        <div className={cn('flex items-center gap-3 p-4 border-b border-border flex-shrink-0', sidebarCollapsed && 'lg:justify-center lg:px-2')}>
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
            <Boxes className="w-5 h-5 text-primary-foreground" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-foreground truncate">{name}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{role.replace('_', ' ')}</p>
            </div>
          )}
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map(item => (
            <NavItemComponent key={item.href || item.label} item={item} collapsed={sidebarCollapsed} />
          ))}
        </nav>

        {/* Collapse toggle — desktop */}
        <div className="p-3 border-t border-border hidden lg:block flex-shrink-0">
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
            <ChevronLeft className={cn('w-4 h-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
            {!sidebarCollapsed && 'Colapsar'}
          </button>
        </div>
      </aside>
    </>
  );
}
