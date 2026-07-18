import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useConfig } from '@/store/configStore';
import { useDatabase } from '@/lib/backend';
import { cn } from '@/lib/utils';
import { Link, useLocation, useNavigate } from '@/lib/router';
import { LayoutDashboard, Users, GitBranch, DollarSign, Award, ChartBar as BarChart3, Settings, ChevronDown, ChevronRight, UserCog, CreditCard, User, ShoppingBag, Package, Truck, Tag, ChartBar as BarChart2, ShoppingCart, FolderOpen, MessageSquare, Shield, Crown, Star, Medal, LogOut, Link2, CircleHelp as HelpCircle, FileText, ScrollText } from 'lucide-react';
import { type Rank } from '@/store/configStore';

const rankIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  medal: Medal, crown: Crown, star: Star,
  bronze: Medal, silver: Medal, gold: Medal, platinum: Medal, diamond: Medal,
};

// Returns className + style handling both Tailwind class strings and hex/rgb colors.
function resolveBadgeColor(color: string | undefined, bg: string | undefined, fallbackColor: string, fallbackBg: string) {
  const isRaw = (v?: string) => v && (v.startsWith('#') || v.startsWith('rgb') || v.startsWith('hsl'));
  const style: React.CSSProperties = {};
  if (isRaw(color)) style.color = color;
  if (isRaw(bg)) style.backgroundColor = bg;
  const cls = cn(
    !isRaw(color) ? (color || fallbackColor) : '',
    !isRaw(bg) ? (bg || fallbackBg) : '',
  );
  return { cls, style };
}

function RankIcon({ rank, className }: { rank: Rank; className?: string }) {
  const icon = rank.icon || '';
  const trimmed = icon.trim();
  if (trimmed.toLowerCase().startsWith('<svg')) {
    return (
      <span
        className={cn('inline-flex items-center justify-center w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain', className)}
        dangerouslySetInnerHTML={{ __html: trimmed }}
      />
    );
  }
  if (trimmed.startsWith('http') || trimmed.startsWith('/')) return <img src={trimmed} alt="" className={cn('w-full h-full object-contain', className)} />;
  const Comp = rankIconMap[trimmed.toLowerCase()];
  if (Comp) return <Comp className={className} />;
  if (trimmed.length <= 4 && !trimmed.includes('.')) return <span className={cn('flex items-center justify-center w-full h-full', className)}>{trimmed}</span>;
  return <Star className={className} />;
}
import { LogoWithText } from '@/components/Logo';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  exact?: boolean;
}

const superAdminNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Usuarios', icon: Users, children: [
      { label: 'Todos los usuarios', href: '/dashboard/usuarios', icon: Users },
      { label: 'Roles y permisos', href: '/dashboard/admin/roles', icon: UserCog },
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
      { label: 'Comisiones Tienda', href: '/dashboard/admin/comisiones-mlm', icon: DollarSign },
      { label: 'Reseñas', href: '/dashboard/admin/resenas', icon: MessageSquare },
    ],
  },
  { label: 'Mi Plan', href: '/dashboard/mi-plan', icon: CreditCard },
  { label: 'Reportes', href: '/dashboard/reportes', icon: BarChart3 },
  {
    label: 'Contenido', icon: MessageSquare, children: [
      { label: 'Testimonios', href: '/dashboard/admin/testimonios', icon: Star },
      { label: 'Preguntas Frecuentes', href: '/dashboard/admin/faq', icon: HelpCircle },
      { label: 'Redes Sociales', href: '/dashboard/admin/redes-sociales', icon: Link2 },
      { label: 'Libro de Reclamaciones', href: '/dashboard/admin/libro-reclamaciones', icon: FileText },
      { label: 'Páginas Legales', href: '/dashboard/admin/paginas', icon: ScrollText },
    ],
  },
  {
    label: 'Sistema', icon: Shield, children: [
      { label: 'Panel de Admin', href: '/dashboard/admin', icon: Shield, exact: true },
      { label: 'Configuración', href: '/dashboard/configuracion', icon: Settings },
    ],
  },
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
  {
    label: 'Contenido', icon: MessageSquare, children: [
      { label: 'Testimonios', href: '/dashboard/admin/testimonios', icon: Star },
      { label: 'Preguntas Frecuentes', href: '/dashboard/admin/faq', icon: HelpCircle },
      { label: 'Redes Sociales', href: '/dashboard/admin/redes-sociales', icon: Link2 },
      { label: 'Libro de Reclamaciones', href: '/dashboard/admin/libro-reclamaciones', icon: FileText },
      { label: 'Páginas Legales', href: '/dashboard/admin/paginas', icon: ScrollText },
    ],
  },
  {
    label: 'Sistema', icon: Shield, children: [
      { label: 'Panel de Admin', href: '/dashboard/admin', icon: Shield, exact: true },
    ],
  },
];

const userNav: NavItem[] = [
  { label: 'Mi Panel', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Mi Perfil', href: '/dashboard/perfil', icon: User },
  { label: 'Mi Red', href: '/dashboard/red', icon: GitBranch },
  { label: 'Mis Comisiones', href: '/dashboard/comisiones', icon: DollarSign },
  { label: 'Mi Rango', href: '/dashboard/rangos', icon: Award },
  { label: 'Mi Plan', href: '/dashboard/mi-plan', icon: CreditCard },
  { label: 'Mis Pedidos', href: '/dashboard/pedidos', icon: ShoppingCart },
  { label: 'Mis Reclamos', href: '/dashboard/mis-reclamos', icon: FileText },
  { label: 'Reportes', href: '/dashboard/reportes', icon: BarChart2 },
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
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
  onExpandSidebar?: () => void;
  pathname: string;
}) {
  const isActiveLeaf = item.href
    ? (item.href === '/dashboard' || item.exact)
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + '/')
    : false;

  const isActiveParent = item.children?.some(c =>
    c.href && (c.exact ? pathname === c.href : (pathname === c.href || pathname.startsWith(c.href + '/')))
  );

  const isActive = isActiveLeaf || isActiveParent;
  const [open, setOpen] = useState(() => Boolean(isActiveParent));
  const prevCollapsed = useRef(collapsed);

  // Auto-close expanded groups when sidebar collapses - with immediate response
  useEffect(() => {
    if (collapsed) {
      setOpen(false);
    }
    prevCollapsed.current = collapsed;
  }, [collapsed]);

  const effectiveOpen = !collapsed && open;

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
              ? 'text-primary bg-primary/15'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
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
              ? 'text-primary bg-primary/15 font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
          )}
        >
          <item.icon className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', !effectiveOpen && '-rotate-90')} />
        </button>

        <div className={cn(
          'ml-6 mt-1 space-y-0.5 border-l-2 border-primary/20 pl-3 transition-all duration-200',
          effectiveOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden',
        )}>
          {item.children.map(child => {
            const childActive = child.href
              ? (child.exact ? pathname === child.href : (pathname === child.href || pathname.startsWith(child.href + '/')))
              : false;
            return (
              <Link
                key={child.href}
                to={child.href!}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  childActive
                    ? 'text-primary font-semibold bg-primary/[0.12]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
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
            ? 'text-primary bg-primary/15 font-semibold'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
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
          ? 'text-primary bg-primary/15 font-semibold'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
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
  const isActiveParent = item.children?.some(c =>
    c.href && (c.exact ? pathname === c.href : (pathname === c.href || pathname.startsWith(c.href + '/')))
  );
  const [expanded, setExpanded] = useState(Boolean(isActiveParent));

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className={cn(
          'w-full flex items-center gap-2 py-3 px-3 rounded-xl text-sm font-medium transition-colors',
          isActiveParent ? 'bg-primary/15 text-primary' : 'bg-muted/40 text-foreground hover:bg-muted/60',
        )}
      >
        <item.icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {expanded && item.children && (
        <div className="grid grid-cols-2 gap-1.5 mt-1.5 px-1">
          {item.children.map(child => {
            const childActive = child.href
              ? (child.exact ? pathname === child.href : (pathname === child.href || pathname.startsWith(child.href + '/')))
              : false;
            return (
              <Link
                key={child.href}
                to={child.href!}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-2 py-2.5 px-3 rounded-xl text-sm transition-colors',
                  childActive
                    ? 'bg-primary/15 text-primary font-semibold'
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
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const { company, logoValue, logoSizes, plans, ranks } = useConfig();
  const [logoCollapsed, setLogoCollapsed] = useState<string>('');
  const database = useDatabase();

  useEffect(() => {
    database.select<{ key: string; value: string }>('system_config', {
      filter: { key: 'logo_collapsed_value' },
      single: true,
    }).then(({ data }) => {
      if (data && !Array.isArray(data) && data.value) {
        setLogoCollapsed(data.value);
      }
    }).catch(() => {});
  }, [database]);

  const effectiveLogoCollapsed = logoCollapsed || logoValue;
  const location = useLocation();
  const pathname = location.pathname;
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const role = (user as any)?.role || 'user';
  const navItems = getNavForRole(role);
  const name = company.company_name || 'MLM360';

  // Role label + color state - fetch from custom_roles table
  const defaultLabels: Record<string, string> = {
    super_admin: 'Super Admin', admin: 'Administrador',
    inspector: 'Inspector', support: 'Soporte', user: 'Usuario',
  };
  const [roleLabel, setRoleLabel] = useState<string>(defaultLabels[role] || role.replace(/_/g, ' '));
  const [roleColor, setRoleColor] = useState<string>('');

  // Determine if roleColor is a hex value or Tailwind class
  const isHexColor = (c: string) => /^#[0-9A-Fa-f]{3,8}$/.test(c);
  const roleColorStyle = roleColor && isHexColor(roleColor) ? { color: roleColor } : undefined;
  const roleColorClass = roleColor && !isHexColor(roleColor) ? roleColor : '';

  useEffect(() => {
    let mounted = true;
    database.select<{ name: string; label: string; color: string }>('custom_roles', {
      filter: { name: role },
      single: true,
    }).then(({ data, error }) => {
      if (mounted && data && !error) {
        const roleData = Array.isArray(data) ? data[0] : data;
        if (roleData?.label) setRoleLabel(roleData.label);
        if (roleData?.color) setRoleColor(roleData.color);
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, [role, database]);

  const initials = user
    ? (user.full_name || user.email || 'U').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  // Legacy English rank names → new Spanish slugs (profiles may store old values)
  const RANK_LEGACY_MAP: Record<string, string> = {
    bronze: 'plata', silver: 'plata', gold: 'oro',
    platinum: 'zafiro', diamond: 'diamante', master: 'master',
  };
  const userPlan = user ? plans.find(p => p.slug === user.plan || p.id === user.plan || p.name?.toLowerCase() === user.plan?.toLowerCase()) : null;
  const userRank = user ? ranks.find(r =>
    r.slug === user.rank ||
    r.slug === RANK_LEGACY_MAP[user.rank || ''] ||
    r.name?.toLowerCase() === user.rank?.toLowerCase() ||
    r.name?.toLowerCase() === RANK_LEGACY_MAP[user.rank || '']
  ) : null;

  const UserAvatar = ({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) => {
    const dim = size === 'lg' ? 'w-10 h-10 text-sm' : size === 'md' ? 'w-9 h-9 text-sm' : 'w-8 h-8 text-xs';
    return (
      <div className={cn('rounded-full overflow-hidden bg-primary/20 flex items-center justify-center flex-shrink-0 ring-2 ring-primary/30', dim)}>
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
      {/* Mobile backdrop — moderate blur */}
      {sidebarOpen && (
        <div
          className={cn(
            'fixed top-16 left-0 right-0 bottom-0 z-[45] lg:hidden transition-opacity duration-300',
            sidebarOpen ? 'opacity-100' : 'opacity-0'
          )}
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%)' }}
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
          'flex items-center border-b border-border/60 flex-shrink-0 min-h-[64px]',
          sidebarCollapsed ? 'justify-center px-3' : 'px-4',
        )}>
          {sidebarCollapsed ? (
            /* Collapsed: static 40px square logo — independent of main logo size */
            <div
              className="rounded-xl overflow-hidden flex items-center justify-center  flex-shrink-0"
              style={{ width: '40px', height: '40px' }}
            >
              {effectiveLogoCollapsed ? (
                effectiveLogoCollapsed.trim().toLowerCase().startsWith('<svg') ? (
                  <span
                    className="inline-flex items-center justify-center [&_svg]:w-full [&_svg]:h-full"
                    style={{ width: '36px', height: '36px' }}
                    dangerouslySetInnerHTML={{ __html: effectiveLogoCollapsed }}
                  />
                ) : (
                  <img
                    src={effectiveLogoCollapsed}
                    alt={name}
                    style={{ width: '36px', height: '36px' }}
                    className="object-contain"
                  />
                )
              ) : (
                <span className="text-sm font-bold text-primary leading-none">{name.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
          ) : (
            <LogoWithText
              value={logoValue}
              fallbackText={name}
              pixelSize={logoSizes.sidebar || 36}
              pixelHeight={logoSizes.sidebarHeight || logoSizes.sidebar || 36}
              textClass="text-sm font-bold text-foreground truncate"
            />
          )}
        </div>

        {/* Role badge */}
        {sidebarCollapsed ? (
          roleColor ? (
            <div className="flex justify-center py-1.5 border-b border-border/50 flex-shrink-0">
              <div
                className="w-2 h-2 rounded-full"
                style={roleColor && isHexColor(roleColor) ? { backgroundColor: roleColor } : undefined}
                title={roleLabel}
              />
            </div>
          ) : null
        ) : (
          <div className="px-4 py-2 border-b border-border/50 flex-shrink-0 overflow-hidden">
            <span
              className={cn('block text-[10px] font-semibold uppercase tracking-wider truncate', roleColorClass || 'text-muted-foreground')}
              style={roleColorStyle}
              title={roleLabel}
            >
              {roleLabel}
            </span>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5 scrollbar-hide">
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
              {(userPlan || userRank) && (() => {
                const r = userRank;
                const p = userPlan;
                const rawColor = r?.color || p?.color;
                const iconStyle: React.CSSProperties = rawColor?.startsWith('#') || rawColor?.startsWith('rgb') || rawColor?.startsWith('hsl')
                  ? { color: rawColor }
                  : {};
                const iconClass = (!rawColor?.startsWith('#') && !rawColor?.startsWith('rgb') && !rawColor?.startsWith('hsl'))
                  ? (rawColor || 'text-primary')
                  : '';
                return (
                  <div className="w-full flex items-center justify-center" title={r?.name || p?.name}>
                    <div className={cn('w-4 h-4 flex items-center justify-center', iconClass)} style={iconStyle}>
                      {r ? <RankIcon rank={r} className="w-4 h-4" /> : <Crown className="w-4 h-4" />}
                    </div>
                  </div>
                );
              })()}
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
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                <UserAvatar size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {user?.full_name || user?.username || 'Usuario'}
                  </p>
                  <p className={cn('text-[10px] truncate', roleColorClass || 'text-muted-foreground')} style={roleColorStyle}>{roleLabel}</p>
                  {/* Plan + Rank badges */}
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {userPlan && (() => {
                      const { cls, style } = resolveBadgeColor(userPlan.color, userPlan.bg_color, 'text-amber-600 dark:text-amber-400', 'bg-amber-500/10');
                      return (
                        <span className={cn('flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none', cls)} style={style}>
                          <Crown className="w-2.5 h-2.5" />{userPlan.name}
                        </span>
                      );
                    })()}
                    {userRank && (() => {
                      const { cls, style } = resolveBadgeColor(userRank.color, userRank.bg_color, 'text-primary', 'bg-primary/10');
                      return (
                        <span className={cn('inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none', cls)} style={style}>
                          <RankIcon rank={userRank} className="w-2.5 h-2.5" />{userRank.name}
                        </span>
                      );
                    })()}
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
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-[55] lg:hidden transition-transform duration-300 ease-out will-change-transform',
          sidebarOpen ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <div className="bg-background rounded-t-3xl border-t border-border/50 shadow-2xl max-w-full overflow-hidden">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
          </div>

          {/* Header — styled like landing nav user card, clickable to profile */}
          <div className="px-4 pb-3">
            <button
              onClick={() => { navigate('/dashboard/perfil'); setSidebarOpen(false); }}
              className="w-full flex items-center gap-3 p-3.5 bg-gradient-to-r from-primary/8 to-muted/30 border border-border/50 rounded-xl text-left active:scale-[0.98] transition-transform shadow-sm"
            >
              <UserAvatar size="lg" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground truncate">{user?.full_name || name}</p>
                <p className={cn('text-[10px] font-semibold uppercase tracking-wider mt-0.5', roleColorClass || 'text-muted-foreground')} style={roleColorStyle}>{roleLabel}</p>
                {(userPlan || userRank) && (
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {userPlan && (() => {
                      const { cls, style } = resolveBadgeColor(userPlan.color, userPlan.bg_color, 'text-amber-600 dark:text-amber-400', 'bg-amber-500/10');
                      return (
                        <span className={cn('flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full', cls)} style={style}>
                          <Crown className="w-2.5 h-2.5" />{userPlan.name}
                        </span>
                      );
                    })()}
                    {userRank && (() => {
                      const { cls, style } = resolveBadgeColor(userRank.color, userRank.bg_color, 'text-primary', 'bg-primary/10');
                      return (
                        <span className={cn('inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full', cls)} style={style}>
                          <RankIcon rank={userRank} className="w-2.5 h-2.5" />{userRank.name}
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90 flex-shrink-0" />
            </button>
          </div>

          {/* Scrollable nav */}
          <div className="px-4 pb-2 overflow-y-auto max-h-[55vh] overflow-x-hidden" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
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
                          'flex flex-col items-center gap-2 py-3.5 rounded-xl transition-all text-center active:scale-95',
                          active
                            ? 'bg-primary/12 text-primary shadow-sm'
                            : 'bg-muted/40 text-foreground hover:bg-muted/60 active:bg-muted',
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="text-xs font-semibold leading-tight">{item.label}</span>
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
            <div className="flex gap-2 mt-4 pt-4 border-t border-border/60">
              <Link
                to="/tienda"
                onClick={() => setSidebarOpen(false)}
                className="flex-1 py-3 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                Tienda
              </Link>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-14 flex items-center justify-center border border-red-400/40 text-red-500 rounded-xl hover:bg-red-500/10 active:scale-95 transition-all flex-shrink-0"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="h-2" />
        </div>
      </div>

      {/* Logout confirmation dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
                <LogOut className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground">¿Cerrar sesión?</h3>
              <p className="text-sm text-muted-foreground mt-1">Confirma que deseas salir de tu cuenta.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => { await signOut(); setShowLogoutConfirm(false); setSidebarOpen(false); navigate('/login'); }}
                className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
