import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDatabase } from '@/lib/backend';
import { Link, useNavigate, useLocation } from '@/lib/router';
import {
  Bell, Search, Moon, Sun, Menu, LogOut, User, Settings,
  ChevronDown, ExternalLink, CheckCheck, Trash2, X, Users, Package, ShoppingBag,
  LayoutDashboard, Crown, Star, Medal, DollarSign, ArrowRight,
} from 'lucide-react';
import { useThemeStore, useIsDark } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useConfig, type Rank } from '@/store/configStore';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Logo from '@/components/Logo';

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

// Returns className + style so badge colors work whether the DB stores a Tailwind class
// (e.g. "text-amber-600") or a hex/rgb value (e.g. "#C79B3B").
function resolveBadgeColor(color: string | undefined, bg: string | undefined, fallbackColor: string, fallbackBg: string) {
  const isRaw = (v?: string) => v && (v.startsWith('#') || v.startsWith('rgb') || v.startsWith('hsl'));
  const style: React.CSSProperties = {};
  if (isRaw(color)) style.color = color;
  if (isRaw(bg)) style.backgroundColor = bg;
  const cls = cn(
    'flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
    !isRaw(color) ? (color || fallbackColor) : '',
    !isRaw(bg) ? (bg || fallbackBg) : '',
  );
  return { cls, style };
}

interface SearchResult {
  type: 'user' | 'product' | 'order' | 'commission' | 'nav';
  id: string;
  title: string;
  subtitle: string;
  href: string;
  image?: string;
}

const rankIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  medal: Medal, crown: Crown, star: Star,
  bronze: Medal, silver: Medal, gold: Medal, platinum: Medal, diamond: Medal,
};

function RankBadgeIcon({ rank, className }: { rank: Rank; className?: string }) {
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
  if (trimmed.startsWith('http') || trimmed.startsWith('/')) {
    return <img src={trimmed} alt="" className={cn('w-full h-full object-contain', className)} />;
  }
  const Comp = rankIconMap[trimmed.toLowerCase()];
  if (Comp) return <Comp className={className} />;
  if (trimmed.length === 1 || (trimmed.length <= 4 && !trimmed.includes('.'))) {
    return <span className={cn('flex items-center justify-center w-full h-full', className)}>{trimmed}</span>;
  }
  return <Star className={className} />;
}

export default function DashboardHeader() {
  const { setTheme } = useThemeStore();
  const isDark = useIsDark();
  const { user, signOut } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { company, logoValue, logoSizes, plans, ranks } = useConfig();
  const database = useDatabase();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const role = (user as any)?.role || 'user';
  const canAccessSettings = role === 'super_admin' || role === 'admin';

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement | null>(null);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);

  // Notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const [dbNotifications, setDbNotifications] = useState<any[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const unread = dbNotifications.filter(n => !n.read).length;

  // User dropdown
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Logout
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const companyName = company.company_name || 'MLM360';
  const initials = (user?.full_name || user?.username || 'U')
    .split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

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

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile search panel on scroll
  useEffect(() => {
    const handler = () => {
      setSearchOpen(false);
      if (!query) { setResults([]); }
    };
    window.addEventListener('scroll', handler, { passive: true } as EventListenerOptions);
    return () => window.removeEventListener('scroll', handler);
  }, [query]);

  // Close user menu and notifications on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      // Close notifications if clicking outside the bell button and panel
      const target = e.target as Node;
      const notifPanel = document.getElementById('notif-panel');
      const bellBtn = document.getElementById('bell-btn');
      if (notifOpen && notifPanel && bellBtn &&
        !notifPanel.contains(target) && !bellBtn.contains(target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  // Cmd+K (Mac) / Ctrl+K (Windows/Linux) shortcut — accept both modifiers on any platform
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setSidebarOpen(false);
        // Focus the correct input based on viewport (lg breakpoint = 1024px)
        setTimeout(() => {
          if (window.innerWidth >= 1024) desktopInputRef.current?.focus();
          else mobileInputRef.current?.focus();
        }, 80);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setQuery('');
        setResults([]);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setSidebarOpen]);

  // When search opens on mobile, ensure the mobile input gets focused after render
  useEffect(() => {
    if (searchOpen) {
      const t = setTimeout(() => mobileInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [searchOpen]);

  const performSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoadingSearch(true);
    const found: SearchResult[] = [];
    const pct = `%${q}%`;
    const isAdmin = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'inspector';
    const qLower = q.toLowerCase();

    // Navigation quick links based on role
    const navItems: { label: string; href: string; keywords: string[] }[] = [
      { label: 'Dashboard', href: '/dashboard', keywords: ['panel', 'inicio', 'dashboard', 'home'] },
      { label: 'Mi Perfil', href: '/dashboard/perfil', keywords: ['perfil', 'profile', 'cuenta', 'account'] },
      { label: 'Mi Red', href: '/dashboard/red', keywords: ['red', 'network', 'afiliados', 'arbol', 'tree'] },
      { label: 'Comisiones', href: '/dashboard/comisiones', keywords: ['comisiones', 'commissions', 'ingresos', 'ganancias'] },
      { label: 'Rangos', href: '/dashboard/rangos', keywords: ['rangos', 'ranks', 'niveles', 'levels'] },
      { label: 'Mi Plan', href: '/dashboard/mi-plan', keywords: ['plan', 'suscripcion', 'subscription'] },
      { label: 'Pedidos', href: '/dashboard/pedidos', keywords: ['pedidos', 'orders', 'compras', 'compras'] },
      { label: 'Reportes', href: '/dashboard/reportes', keywords: ['reportes', 'reports', 'estadisticas'] },
      { label: 'Tienda', href: '/tienda', keywords: ['tienda', 'store', 'shop', 'productos'] },
    ];
    if (isAdmin) {
      navItems.push(
        { label: 'Usuarios', href: '/dashboard/usuarios', keywords: ['usuarios', 'users', 'afiliados'] },
        { label: 'Gestin Admin', href: '/dashboard/admin', keywords: ['admin', 'administracion', 'gestion', 'configuracion'] },
        { label: 'Productos Admin', href: '/dashboard/admin/productos', keywords: ['productos', 'admin products'] },
        { label: 'Pedidos Admin', href: '/dashboard/admin/pedidos', keywords: ['pedidos admin', 'orders admin'] },
      );
    }
    // Filter nav items by query
    navItems.forEach(item => {
      if (item.label.toLowerCase().includes(qLower) || item.keywords.some(k => k.includes(qLower))) {
        found.push({ type: 'nav', id: `nav-${item.href}`, title: item.label, subtitle: 'Navegar', href: item.href });
      }
    });

    try {
      const [usersRes, productsRes, commissionsRes] = await Promise.all([
        isAdmin
          ? database.select<any>('profiles', {
              select: ['id', 'full_name', 'email', 'username', 'avatar_url'],
              filter: `full_name.ilike.${pct},email.ilike.${pct},username.ilike.${pct}`,
              limit: 5,
            })
          : Promise.resolve({ data: [] }),
        database.select<any>('products', {
          select: ['id', 'name', 'sku', 'slug', 'images', 'base_price'],
          filter: `name.ilike.${pct},sku.ilike.${pct}`,
          limit: 5,
        }),
        isAdmin
          ? database.select<any>('commissions', {
              select: ['id', 'user_id', 'amount', 'status', 'created_at'],
              filter: `user_id.ilike.${pct}`,
              limit: 3,
            })
          : Promise.resolve({ data: [] }),
      ]);
      if (Array.isArray(usersRes.data)) {
        usersRes.data.slice(0, 4).forEach((u: any) => found.push({
          type: 'user', id: u.id,
          title: u.full_name || u.username || u.email,
          subtitle: u.email,
          href: `/dashboard/usuarios?id=${u.id}`,
          image: u.avatar_url,
        }));
      }
      if (Array.isArray(productsRes.data)) {
        productsRes.data.slice(0, 4).forEach((p: any) => found.push({
          type: 'product', id: p.id,
          title: p.name,
          subtitle: [p.sku ? `SKU: ${p.sku}` : null, p.base_price != null ? `S/ ${p.base_price}` : null].filter(Boolean).join(' · ') || 'Producto',
          href: `/tienda/${p.slug || p.id}`,
          image: p.images?.[0]?.url,
        }));
      }
      if (Array.isArray(commissionsRes.data)) {
        commissionsRes.data.slice(0, 2).forEach((c: any) => found.push({
          type: 'commission', id: c.id,
          title: `Comision S/ ${c.amount || 0}`,
          subtitle: c.status || 'pendiente',
          href: '/dashboard/comisiones',
        }));
      }
    } catch { /* silent */ }
    setResults(found.slice(0, 8));
    setLoadingSearch(false);
  }, [database, user?.role]);

  useEffect(() => {
    const t = setTimeout(() => performSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, performSearch]);

  const go = (href: string) => {
    navigate(href);
    setQuery('');
    setResults([]);
    setSearchOpen(false);
    setSidebarOpen(false);
  };

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoadingNotifs(true);
    const { data } = await database.select<any>('notifications', {
      filter: { user_id: user.id },
      order: { column: 'created_at', ascending: false },
      limit: 10,
    });
    setDbNotifications((data as any[]) || []);
    setLoadingNotifs(false);
  }, [user?.id, database]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    await database.rpc('mark_notification_read', { p_notification_id: id });
    setDbNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = async () => {
    if (!user?.id || unread === 0) return;
    await database.rpc('mark_all_notifications_read', { p_user_id: user.id });
    setDbNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('Todas las notificaciones marcadas como leídas');
  };

  const deleteNotification = async (id: string) => {
    await database.delete('notifications', id);
    setDbNotifications(prev => prev.filter(n => n.id !== id));
  };

  const iconFor = (type: string) =>
    type === 'user' ? Users :
    type === 'product' ? Package :
    type === 'commission' ? DollarSign :
    type === 'nav' ? ArrowRight :
    ShoppingBag;

  function SearchResultItem({ r }: { r: SearchResult }) {
    const Icon = iconFor(r.type);
    return (
      <button onClick={() => go(r.href)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left">
        <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
          {r.image
            ? <img src={r.image} alt={r.title} className="w-full h-full object-cover" />
            : <Icon className="w-4 h-4 text-muted-foreground" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
          <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
        </div>
        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full flex-shrink-0 capitalize">
          {r.type === 'user' ? 'usuario' : r.type === 'product' ? 'producto' : r.type === 'commission' ? 'comision' : r.type === 'nav' ? 'ir' : 'pedido'}
        </span>
      </button>
    );
  }

  function SearchResultsList() {
    if (loadingSearch) {
      return (
        <div className="py-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-3/4 rounded" /><Skeleton className="h-2.5 w-1/2 rounded" /></div>
            </div>
          ))}
        </div>
      );
    }
    if (results.length > 0) {
      return <div className="py-1.5">{results.map(r => <SearchResultItem key={`${r.type}-${r.id}`} r={r} />)}</div>;
    }
    return (
      <div className="px-4 py-8 text-center">
        <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Sin resultados para "{query}"</p>
      </div>
    );
  }

  return (
    <>
      <header className={cn(
        'h-16 border-b border-border bg-background flex items-center px-3 sm:px-4 lg:px-6 shrink-0 z-40'
      )}>

        {/* Logo — mobile only (desktop sidebar already has it) */}
        <Link to="/" className="flex-shrink-0 flex lg:hidden active:scale-95 transition-transform">
          <Logo value={logoValue} fallbackText={companyName} pixelSize={logoSizes.navbar || 28} />
        </Link>

        {/* Search — large inline on desktop, icon-collapsible on mobile */}
  <div ref={searchRef} className="relative flex-1 max-w-lg mx-4 hidden lg:block">
  <div className="relative">
    <Search
      className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70 pointer-events-none"
    />

    <input
      ref={desktopInputRef}
      type="text"
      value={query}
      onChange={e => setQuery(e.target.value)}
      onFocus={() => setSearchOpen(true)}
      placeholder="Buscar usuarios, productos..."
      className="
        w-full
        h-10
        pl-11
        pr-[5.5rem]
        rounded-2xl
        bg-card/60
        border border-border
        text-sm
        text-foreground
        placeholder:text-muted-foreground/60
        outline-none
        transition-all duration-200
        hover:border-border
        focus:bg-card
        focus:border-primary/30
        focus:ring-2
        focus:ring-primary/10
      "
    />

    {/* Fixed-width right slot — prevents layout shift */}
    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
      {query ? (
        <button
          onClick={() => {
            setQuery('');
            setResults([]);
            desktopInputRef.current?.focus();
          }}
          className="
            w-7 h-7
            rounded-lg
            flex items-center justify-center
            text-muted-foreground
            hover:text-foreground
            hover:bg-muted/60
            transition-colors
          "
        >
          <X className="w-4 h-4" />
        </button>
      ) : (
        <kbd
          className="
            pointer-events-none
            inline-flex
            items-center
            gap-1
            px-2
            py-1
            text-[10px]
            font-mono
            font-medium
            text-muted-foreground
            bg-background/60
            border border-border
            rounded-md
            leading-none
          "
        >
          {isMac ? (
            <>
              <span className="text-[11px]">⌘</span>
              <span>K</span>
            </>
          ) : (
            'Ctrl+K'
          )}
        </kbd>
      )}
    </div>
  </div>

  {/* Results dropdown */}
  {searchOpen && query.length >= 2 && (
    <div
      className="
        absolute
        left-0
        right-0
        top-full
        mt-2
        bg-card
        border border-border
        rounded-2xl
        shadow-2xl
        overflow-hidden
        z-50
        backdrop-blur-xl
      "
    >
      <SearchResultsList />
    </div>
  )}
</div>

        {/* Right controls */}
        <div className="ml-auto flex items-center gap-0.5 sm:gap-1 flex-shrink-0">

          {/* Mobile search icon */}
          <button
            onClick={() => { setSearchOpen(v => !v); setSidebarOpen(false); setTimeout(() => mobileInputRef.current?.focus(), 50); }}
            className="lg:hidden w-10 h-10 sm:w-9 sm:h-9 rounded-xl sm:rounded-full flex items-center justify-center hover:bg-muted/50 active:bg-muted text-muted-foreground active:text-foreground transition-colors"
            aria-label="Buscar"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Link to public site */}
          <Link to="/"
            className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl sm:rounded-full flex items-center justify-center hover:bg-muted/50 active:bg-muted text-muted-foreground hover:text-foreground transition-colors hidden sm:flex"
          >
            <ExternalLink className="w-5 h-5" />
          </Link>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl sm:rounded-full flex items-center justify-center hover:bg-muted/50 active:bg-muted text-muted-foreground hover:text-foreground transition-colors hidden sm:flex"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              id="bell-btn"
              onClick={() => { setNotifOpen(v => !v); if (!notifOpen) fetchNotifications(); }}
              className="relative w-10 h-10 sm:w-9 sm:h-9 rounded-xl sm:rounded-full flex items-center justify-center hover:bg-muted/50 active:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 sm:top-0.5 sm:right-0.5 min-w-[18px] h-[18px] sm:min-w-[16px] sm:h-4 px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm ring-2 ring-background">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            {notifOpen && (
              <div id="notif-panel" className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="font-semibold text-sm">Notificaciones</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{unread} nuevas</Badge>
                    {unread > 0 && (
                      <button onClick={markAllAsRead} title="Marcar todas como leídas"
                        className="text-muted-foreground hover:text-primary transition-colors">
                        <CheckCheck className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {loadingNotifs ? (
                    <div className="px-4 py-8 text-center">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                  ) : dbNotifications.length > 0 ? dbNotifications.map(n => (
                    <div key={n.id}
                      className={cn('group flex gap-3 px-4 py-3 hover:bg-muted transition-colors border-b border-border/50 cursor-pointer', !n.read && 'bg-primary/5')}
                      onClick={() => !n.read && markAsRead(n.id)}
                    >
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                        n.type === 'success' ? 'bg-green-500/20 text-green-500' :
                        n.type === 'warning' ? 'bg-yellow-500/20 text-yellow-500' :
                        n.type === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-primary/15 text-primary')}>
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm text-foreground', !n.read && 'font-semibold')}>{n.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(n.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                        <button onClick={e => { e.stopPropagation(); deleteNotification(n.id); }}
                          className="text-muted-foreground hover:text-red-500 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="px-4 py-12 text-center">
                      <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Sin notificaciones</p>
                    </div>
                  )}
                </div>
                {dbNotifications.length > 0 && (
                  <div className="px-4 py-2 border-t border-border">
                    <button onClick={markAllAsRead} className="w-full text-xs text-primary hover:text-primary/80 text-center transition-colors py-1">
                      Marcar todas como leídas
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User avatar/menu — desktop only, same design as landing Navbar */}
          <div className="relative hidden lg:block" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(v => !v)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-full border border-border/60 hover:bg-muted/50 active:bg-muted transition-all duration-200 ml-1"
            >
              <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center flex-shrink-0">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user?.full_name || ''} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-primary">{initials}</span>
                )}
              </div>
              <span className="text-sm font-medium text-foreground max-w-[90px] truncate">
                {user?.full_name?.split(' ')[0] || user?.username || 'Usuario'}
              </span>
              <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform duration-200', userMenuOpen && 'rotate-180')} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50">
                {/* User header card — clickable to profile */}
                <button
                  onClick={() => { navigate('/dashboard/perfil'); setUserMenuOpen(false); }}
                  className="w-full p-4 bg-muted/40 border-b border-border flex items-center gap-3 hover:bg-muted/60 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center flex-shrink-0">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt={user?.full_name || ''} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-primary">{initials}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground truncate text-sm">{user?.full_name || user?.username}</div>
                    <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                    {(userPlan || userRank) && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {userPlan && (() => {
                          const { cls, style } = resolveBadgeColor(userPlan.color, userPlan.bg_color, 'text-amber-600 dark:text-amber-400', 'bg-amber-500/10');
                          return (
                            <span className={cls} style={style}>
                              <Crown className="w-2.5 h-2.5" />{userPlan.name}
                            </span>
                          );
                        })()}
                        {userRank && (() => {
                          const { cls, style } = resolveBadgeColor(userRank.color, userRank.bg_color, 'text-primary', 'bg-primary/10');
                          return (
                            <span className={cls} style={style}>
                              <RankBadgeIcon rank={userRank} className="w-2.5 h-2.5" />{userRank.name}
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </button>
                <div className="p-1.5">
                  {([
                    { icon: LayoutDashboard, label: 'Mi Panel', path: '/dashboard', show: pathname !== '/dashboard' },
                    { icon: User, label: 'Mi Perfil', path: '/dashboard/perfil', show: pathname !== '/dashboard/perfil' },
                    { icon: Package, label: 'Mis Pedidos', path: '/pedidos', show: true },
                    { icon: Settings, label: 'Configuracion', path: '/dashboard/configuracion', show: canAccessSettings },
                  ] as { icon: React.ComponentType<{ className?: string }>; label: string; path: string; show: boolean }[])
                    .filter(item => item.show)
                    .map(item => (
                      <button key={item.path} onClick={() => { navigate(item.path); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-muted text-sm text-foreground transition-colors text-left">
                        <item.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />{item.label}
                      </button>
                    ))}
                </div>
                <div className="p-1.5 border-t border-border">
                  <button onClick={() => { setShowLogoutConfirm(true); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-sm text-red-500 transition-colors text-left">
                    <LogOut className="w-4 h-4 flex-shrink-0" />Cerrar sesion
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl sm:rounded-full hover:bg-muted/60 active:bg-muted text-foreground transition-colors"
            aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile search bar — full-width below nav */}
      {searchOpen && (
        <div className="lg:hidden fixed top-16 left-0 right-0 bottom-0 z-[45] bg-background/98 backdrop-blur-sm">
          <div className="px-4 py-4 safe-area-inset-top">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                ref={mobileInputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar usuarios, productos..."
                className="w-full pl-12 pr-12 py-3.5 bg-muted/50 border border-border rounded-xl text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 focus:bg-card transition-colors"
                autoFocus
              />
              <button
                onClick={() => { setSearchOpen(false); setQuery(''); setResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Results */}
            {query.length >= 2 && (
              <div className="mt-3 bg-card border border-border rounded-xl overflow-hidden max-h-[70vh] overflow-y-auto shadow-xl">
                <SearchResultsList />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logout confirmation dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
                <LogOut className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground">¿Cerrar sesion?</h3>
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
                onClick={async () => { await signOut(); setShowLogoutConfirm(false); navigate('/login'); }}
                className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Cerrar sesion
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
