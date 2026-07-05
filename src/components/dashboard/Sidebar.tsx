import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useConfig } from '@/store/configStore';
import { useDatabase } from '@/lib/backend';
import { cn } from '@/lib/utils';
import { Link, useLocation } from '@/lib/router';
import { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Users, GitBranch, DollarSign, Award, ChartBar as BarChart3, Settings, ChevronDown, ChevronRight, X, UserCog, CreditCard, User, ShoppingBag, Package, Truck, Tag, ChartBar as BarChart2, ShoppingCart, FolderOpen, MessageSquare, Shield, Chrome as Home, Crown, Star } from 'lucide-react';
import { LogoWithText } from '@/components/Logo';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

const superAdminNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Usuarios', icon: Users, children: [
      { label: 'Todos los usuarios', href: '/dashboard/usuarios', icon: Users },
      { label: 'Roles y permisos', href: '/dashboard/roles', icon: UserCog },
    ],
  },
  {
    label: 'Red MLM', icon: GitBranch, children: [
      { label: 'Mi Red', href: '/dashboard/red', icon: GitBranch },
      { label: 'Comisiones MLM', href: '/dashboard/comisiones', icon: DollarSign },
      { label: 'Rangos', href: '/dashboard/rangos', icon: Award },
    ],
  },
  {
    label: 'Tienda', icon: ShoppingBag, children: [
      { label: 'Productos', href: '/dashboard/admin/productos', icon: Package },
      { label: 'Categorías', href: '/dashboard/admin/categorias', icon: FolderOpen },
      { label: 'Pedidos', href: '/dashboard/admin/pedidos', icon: ShoppingCart },
      { label: 'Cupones', href: '/dashboard/admin/cupones', icon: Tag },
      { label: 'Envíos', href: '/dashboard/admin/envios', icon: Truck },
      { label: 'Comisiones Tienda', href: '/dashboard/admin/comisiones-tienda', icon: DollarSign },
      { label: 'Reseñas', href: '/dashboard/admin/resenas', icon: MessageSquare },
    ],
  },
  { label: 'Mi Plan', href: '/dashboard/mi-plan', icon: CreditCard },
  { label: 'Reportes', href: '/dashboard/reportes', icon: BarChart3 },
  { label: 'Gestión Admin', href: '/dashboard/admin', icon: Shield },
  { label: 'Configuración', href: '/dashboard/configuracion', icon: Settings },
];

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Usuarios', href: '/dashboard/usuarios', icon: Users },
  {
    label: 'Red MLM', icon: GitBranch, children: [
      { label: 'Mi Red', href: '/dashboard/red', icon: GitBranch },
      { label: 'Comisiones MLM', href: '/dashboard/comisiones', icon: DollarSign },
      { label: 'Rangos', href: '/dashboard/rangos', icon: Award },
    ],
  },
  {
    label: 'Tienda', icon: ShoppingBag, children: [
      { label: 'Productos', href: '/dashboard/admin/productos', icon: Package },
      { label: 'Categorías', href: '/dashboard/admin/categorias', icon: FolderOpen },
      { label: 'Pedidos', href: '/dashboard/admin/pedidos', icon: ShoppingCart },
      { label: 'Cupones', href: '/dashboard/admin/cupones', icon: Tag },
      { label: 'Envíos', href: '/dashboard/admin/envios', icon: Truck },
      { label: 'Reseñas', href: '/dashboard/admin/resenas', icon: MessageSquare },
    ],
  },
  { label: 'Mi Plan', href: '/dashboard/mi-plan', icon: CreditCard },
  { label: 'Reportes', href: '/dashboard/reportes', icon: BarChart3 },
  { label: 'Gestión Admin', href: '/dashboard/admin', icon: Shield },
];

const userNav: NavItem[] = [
  { label: 'Mi Panel', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Mi Perfil', href: '/dashboard/perfil', icon: User },
  { label: 'Mi Red', href: '/dashboard/red', icon: GitBranch },
  { label: 'Mis Comisiones', href: '/dashboard/comisiones', icon: DollarSign },
  { label: 'Mi Rango', href: '/dashboard/rangos', icon: Award },
  { label: 'Mi Plan', href: '/dashboard/mi-plan', icon: CreditCard },
  { label: 'Mis Pedidos', href: '/dashboard/pedidos', icon: ShoppingCart },
  { label: 'Reportes', href: '/dashboard/reportes', icon: BarChart2 },
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
  if (role === 'super_admin') return superAdminNav;
  if (role === 'admin') return adminNav;
  if (role === 'inspector') return inspectorNav;
  return userNav;
}

function NavItemComponent({
  item,
  collapsed,
  onNavigate,
  onExpandSidebar,
  pathname,
  forceClosed,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
  onExpandSidebar?: () => void;
  pathname: string;
  forceClosed?: boolean;
}) {
  const isActiveLeaf = item.href
    ? item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === item.href || pathname.startsWith(item.href + '/')
    : false;

  const isActiveParent = item.children?.some(c =>
    c.href && (pathname === c.href || pathname.startsWith(c.href + '/'))
  );

  const isActive = isActiveLeaf || isActiveParent;
  const [open, setOpen] = useState(() => Boolean(isActiveParent));
  const prevCollapsed = useRef(collapsed);

  // Auto-close expanded groups when sidebar collapses
  useEffect(() => {
    if (collapsed && !prevCollapsed.current && open) {
      setOpen(false);
    }
    prevCollapsed.current = collapsed;
  }, [collapsed, open]);

  // Override open state when forceClosed is true (during collapse transition)
  const effectiveOpen = forceClosed ? false : open;

  if (item.children) {
    // Collapsed: clicking a group item expands the sidebar
    if (collapsed) {
      return (
        <button
          type="button"
          onClick={() => {
            onExpandSidebar?.();
            setOpen(true);
          }}
          className={cn(
            'w-full flex items-center justify-center p-3 rounded-xl transition-colors text-sm cursor-pointer',
            isActive
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          <item.icon className="w-4 h-4 flex-shrink-0" />
        </button>
      );
    }

    return (
      <div className="overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm cursor-pointer',
            isActive
              ? 'text-primary bg-primary/10 font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          <item.icon className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', !effectiveOpen && '-rotate-90')} />
        </button>

        <div className={cn(
          'ml-7 mt-0.5 space-y-0.5 border-l border-border/50 pl-3 transition-all duration-200',
          effectiveOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden',
        )}>
          {item.children.map(child => {
            const childActive = child.href
              ? pathname === child.href || pathname.startsWith(child.href + '/')
              : false;
            return (
              <Link
                key={child.href}
                to={child.href!}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  childActive
                    ? 'text-primary font-semibold bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                <child.icon className="w-3.5 h-3.5 flex-shrink-0" />
                {child.label}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  if (collapsed) {
    return (
      <Link
        to={item.href!}
        onClick={onNavigate}
        className={cn(
          'flex items-center justify-center p-3 rounded-xl transition-colors text-sm',
          isActive
            ? 'text-primary bg-primary/10 font-semibold'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        )}
      >
        <item.icon className="w-4 h-4 flex-shrink-0" />
      </Link>
    );
  }

  return (
    <Link
      to={item.href!}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm',
        isActive
          ? 'text-primary bg-primary/10 font-semibold'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
      )}
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      <span className="font-medium">{item.label}</span>
    </Link>
  );
}

function MobileExpandableSection({
  item,
  onNavigate,
  pathname,
}: {
  item: NavItem;
  onNavigate: () => void;
  pathname: string;
}) {
  const isActiveParent = item.children?.some(c => c.href && pathname.startsWith(c.href));
  const [expanded, setExpanded] = useState(Boolean(isActiveParent));

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className={cn(
          'w-full flex items-center gap-2 py-3 px-3 rounded-xl text-sm font-medium transition-colors',
          isActiveParent ? 'bg-primary/10 text-primary' : 'bg-muted/40 text-foreground hover:bg-muted/60',
        )}
      >
        <item.icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {expanded && item.children && (
        <div className="grid grid-cols-2 gap-1.5 mt-1.5 px-1">
          {item.children.map(child => {
            const childActive = child.href ? pathname.startsWith(child.href) : false;
            return (
              <Link
                key={child.href}
                to={child.href!}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-2 py-2.5 px-3 rounded-xl text-sm transition-colors',
                  childActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'bg-muted/40 text-foreground hover:bg-muted/60 active:scale-95',
                )}
              >
                <child.icon className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                <span className="truncate">{child.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { user } = useAuthStore();
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const { company, logoValue, logoSizes, plans, ranks } = useConfig();
  const database = useDatabase();
  const location = useLocation();
  const pathname = location.pathname;

  const role = (user as any)?.role || 'user';
  const navItems = getNavForRole(role);
  const name = company.company_name || 'MLM360';

  // Role label state - fetch from custom_roles table
  const [roleLabel, setRoleLabel] = useState<string>(() => {
    // Initial fallback based on common roles
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Administrador',
      inspector: 'Inspector',
      support: 'Soporte',
      user: 'Usuario',
    };
    return labels[role] || role.replace(/_/g, ' ');
  });

  // Fetch display label for role from custom_roles table
  useEffect(() => {
    let mounted = true;
    database.select<{ name: string; label: string; color: string }>('custom_roles', {
      filter: { name: role },
      single: true,
    }).then(({ data, error }) => {
      if (mounted && data && !error) {
        const roleData = Array.isArray(data) ? data[0] : data;
        if (roleData?.label) {
          setRoleLabel(roleData.label);
        }
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, [role, database]);

  const initials = user
    ? (user.full_name || user.email || 'U').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const userPlan = user ? plans.find(p => p.slug === user.plan || p.id === user.plan) : null;
  const userRank = user ? ranks.find(r => r.slug === user.rank || r.name?.toLowerCase() === user.rank?.toLowerCase()) : null;

  const UserAvatar = ({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) => {
    const dim = size === 'lg' ? 'w-10 h-10 text-sm' : size === 'md' ? 'w-9 h-9 text-sm' : 'w-8 h-8 text-xs';
    return (
      <div className={cn('rounded-full overflow-hidden bg-primary/20 flex items-center justify-center flex-shrink-0 ring-2 ring-primary/20', dim)}>
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
        ) : (
          <span className="font-bold text-primary">{initials}</span>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Desktop Sidebar ─────────────────────────────────────── */}
      <aside className={cn(
        'fixed left-0 top-0 bottom-0 z-50 bg-card border-r border-border flex flex-col transition-all duration-300',
        'hidden lg:flex',
        sidebarCollapsed ? 'w-[72px]' : 'w-[260px]',
      )}>
        {/* Logo header */}
        <div className={cn(
          'flex items-center border-b border-border flex-shrink-0 min-h-[64px]',
          sidebarCollapsed ? 'justify-center px-3' : 'px-4',
        )}>
          {sidebarCollapsed ? (
            /* Collapsed: square logo container with dynamic size */
            <div
              className="rounded-xl overflow-hidden flex items-center justify-center bg-muted/50 border border-border/50 flex-shrink-0 transition-all duration-300"
              style={{
                width: `${(logoSizes.collapsed || 40) + 4}px`,
                height: `${(logoSizes.collapsed || 40) + 4}px`,
              }}
            >
              {logoValue ? (
                logoValue.trim().toLowerCase().startsWith('<svg') ? (
                  <span
                    className="inline-flex items-center justify-center [&_svg]:w-full [&_svg]:h-full"
                    style={{ width: `${logoSizes.collapsed || 40}px`, height: `${logoSizes.collapsed || 40}px` }}
                    dangerouslySetInnerHTML={{ __html: logoValue }}
                  />
                ) : (
                  <img
                    src={logoValue}
                    alt={name}
                    style={{ width: `${logoSizes.collapsed || 40}px`, height: `${logoSizes.collapsed || 40}px` }}
                    className="object-contain"
                  />
                )
              ) : (
                <span className="text-sm font-black text-primary leading-none">{name.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
          ) : (
            <LogoWithText
              value={logoValue}
              fallbackText={name}
              size={`w-[${logoSizes.sidebar || 36}px] h-[${logoSizes.sidebar || 36}px]`}
              pixelSize={logoSizes.sidebar || 36}
              textClass="text-sm font-black text-foreground truncate"
            />
          )}
        </div>

        {/* Role badge — only when expanded */}
        {!sidebarCollapsed && (
          <div className="px-4 py-2 border-b border-border/50 flex-shrink-0">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {roleLabel}
            </span>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {/* Home link - always visible at top */}
          {sidebarCollapsed ? (
            <Link
              to="/"
              className="flex items-center justify-center p-3 rounded-xl transition-colors text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <Home className="w-4 h-4 flex-shrink-0" />
            </Link>
          ) : (
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <Home className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">Inicio</span>
            </Link>
          )}
          {navItems.map((item, i) => (
            <NavItemComponent
              key={i}
              item={item}
              collapsed={sidebarCollapsed}
              pathname={pathname}
              onExpandSidebar={() => setSidebarCollapsed(false)}
            />
          ))}
        </nav>

        {/* Bottom user card + collapse */}
        <div className="border-t border-border flex-shrink-0">
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2 py-3 px-2">
              <UserAvatar size="md" />
              {userPlan && (
                <div className="w-full flex items-center justify-center" title={userPlan.name}>
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 rounded-full">
                    <Crown className="w-3 h-3 text-amber-500" />
                  </div>
                </div>
              )}
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="w-8 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Expandir"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-3">
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <UserAvatar size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {user?.full_name || user?.username || 'Usuario'}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{roleLabel}</p>
                  {/* Plan + Rank badges */}
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {userPlan && (
                      <span className="flex items-center gap-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full leading-none">
                        <Crown className="w-2.5 h-2.5" />
                        {userPlan.name}
                      </span>
                    )}
                    {userRank && (
                      <span className="flex items-center gap-0.5 text-[9px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full leading-none">
                        <Star className="w-2.5 h-2.5" />
                        {userRank.name}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
                  title="Colapsar"
                >
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ─── Mobile Sidebar — Bottom Sheet ──────────────────────── */}
      {/* Close button - fixed outside the drawer */}
      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed top-4 right-4 z-[60] w-10 h-10 rounded-full bg-background border border-border shadow-lg flex items-center justify-center hover:bg-muted text-foreground transition-colors lg:hidden"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 lg:hidden transition-transform duration-300 ease-out',
          sidebarOpen ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <div className="bg-background rounded-t-3xl border-t border-border shadow-2xl">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 pb-3">
            <UserAvatar size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground truncate">{user?.full_name || name}</p>
              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {roleLabel}
                </p>
                {userPlan && (
                  <span className="flex items-center gap-0.5 text-[9px] font-semibold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                    <Crown className="w-2.5 h-2.5" />{userPlan.name}
                  </span>
                )}
                {userRank && (
                  <span className="flex items-center gap-0.5 text-[9px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                    <Star className="w-2.5 h-2.5" />{userRank.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable nav */}
          <div className="px-4 pb-2 overflow-y-auto max-h-[65vh]">
            {/* Grid for simple items */}
            {(() => {
              const simple = navItems.filter(item => !item.children);
              return simple.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {simple.map(item => {
                    const active = item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : item.href ? pathname.startsWith(item.href) : false;
                    return (
                      <Link
                        key={item.href}
                        to={item.href!}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors text-center',
                          active
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted/40 text-foreground hover:bg-muted/60 active:scale-95',
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="text-xs font-medium leading-tight">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null;
            })()}

            {/* Expandable sections */}
            {navItems.filter(item => item.children).map(item => (
              <MobileExpandableSection
                key={item.label}
                item={item}
                pathname={pathname}
                onNavigate={() => setSidebarOpen(false)}
              />
            ))}

            {/* Quick shortcuts */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-border">
              <Link
                to="/tienda"
                onClick={() => setSidebarOpen(false)}
                className="flex-1 py-2.5 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                Tienda
              </Link>
            </div>
          </div>

          <div className="h-6" />
        </div>
      </div>
    </>
  );
}
