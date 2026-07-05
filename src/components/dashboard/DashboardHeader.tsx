import { useState, useEffect, useCallback, useRef } from 'react';
import { useDatabase } from '@/lib/backend';
import { Link, useNavigate } from '@/lib/router';
import {
  Bell, Search, Moon, Sun, Menu, LogOut, User, Settings,
  ChevronDown, ExternalLink, CheckCheck, Trash2, X, Users, Package, ShoppingBag,
  LayoutDashboard, Crown, Star, ChevronRight,
} from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useConfig } from '@/store/configStore';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { LogoWithText } from '@/components/Logo';

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

interface SearchResult {
  type: 'user' | 'product' | 'order';
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export default function DashboardHeader() {
  const { theme, setTheme } = useThemeStore();
  const { user, signOut } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { company, logoValue, logoSizes, plans, ranks } = useConfig();
  const database = useDatabase();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const userPlan = user ? plans.find(p => p.slug === user.plan || p.id === user.plan) : null;
  const userRank = user ? ranks.find(r => r.slug === user.rank || r.name?.toLowerCase() === user.rank?.toLowerCase()) : null;

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        if (!query) setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [query]);

  // Close mobile search panel on scroll
  useEffect(() => {
    const handler = () => {
      setSearchOpen(false);
      if (!query) { setResults([]); }
    };
    window.addEventListener('scroll', handler, { passive: true } as EventListenerOptions);
    return () => window.removeEventListener('scroll', handler);
  }, [query]);

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cmd+K (Mac) / Ctrl+K (Windows/Linux) shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isModifierPressed = isMac ? e.metaKey : e.ctrlKey;
      if (isModifierPressed && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setQuery('');
        setResults([]);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const performSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoadingSearch(true);
    const found: SearchResult[] = [];
    const lower = q.toLowerCase();
    const isAdmin = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'inspector';
    try {
      if (isAdmin) {
        const { data: users } = await database.select<any>('profiles', { select: ['id', 'full_name', 'email', 'username'], limit: 20 });
        if (Array.isArray(users)) {
          users.filter((u: any) =>
            u.full_name?.toLowerCase().includes(lower) || u.email?.toLowerCase().includes(lower) || u.username?.toLowerCase().includes(lower)
          ).slice(0, 3).forEach((u: any) => found.push({ type: 'user', id: u.id, title: u.full_name || u.username, subtitle: u.email, href: '/dashboard/usuarios' }));
        }
      }
      const { data: products } = await database.select<any>('products', { select: ['id', 'name', 'sku', 'slug', 'image_url'], limit: 20 });
      if (Array.isArray(products)) {
        products.filter((p: any) => p.name?.toLowerCase().includes(lower) || p.sku?.toLowerCase().includes(lower))
          .slice(0, 3).forEach((p: any) => found.push({ type: 'product', id: p.id, title: p.name, subtitle: p.sku ? `SKU: ${p.sku}` : 'Producto', href: `/tienda/${p.slug || p.id}` }));
      }
    } catch { /* silent */ }
    setResults(found.slice(0, 6));
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

  const iconFor = (type: string) => type === 'user' ? Users : type === 'product' ? Package : ShoppingBag;

  return (
    <>
      <header className="h-16 border-b border-border bg-background flex items-center px-4 lg:px-6 sticky top-0 z-30 gap-3">

        {/* Logo — only visible on desktop (lg+) */}
        <Link to="/" className="flex-shrink-0 hidden lg:flex">
          <LogoWithText
            value={logoValue}
            fallbackText={companyName}
            pixelSize={logoSizes.navbar || 32}
            textClass="text-base font-bold text-foreground"
          />
        </Link>

        {/* Search — large inline on desktop, icon-collapsible on mobile */}
        <div ref={searchRef} className="relative flex-1 max-w-md mx-2 hidden lg:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              placeholder={`Buscar usuarios, productos... (${isMac ? '⌘' : 'Ctrl'}K)`}
              className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary focus:bg-card transition-colors"
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Results dropdown */}
          {searchOpen && query.length >= 2 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50">
              {loadingSearch ? (
                <div className="py-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                      <Skeleton className="w-8 h-8 rounded-xl flex-shrink-0" />
                      <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-3/4 rounded" /><Skeleton className="h-2.5 w-1/2 rounded" /></div>
                    </div>
                  ))}
                </div>
              ) : results.length > 0 ? (
                <div className="py-1.5">
                  {results.map(r => {
                    const Icon = iconFor(r.type);
                    return (
                      <button key={`${r.type}-${r.id}`} onClick={() => go(r.href)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left">
                        <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground">Sin resultados para "{query}"</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right controls */}
        <div className="ml-auto flex items-center gap-1 flex-shrink-0">

          {/* Mobile search icon */}
          <button
            onClick={() => { setSearchOpen(v => !v); setTimeout(() => inputRef.current?.focus(), 50); }}
            className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted text-foreground/70 hover:text-foreground transition-colors"
            aria-label="Buscar"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Link to public site */}
          <Link to="/"
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted text-foreground/70 hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted text-foreground/70 hover:text-foreground transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setNotifOpen(v => !v); if (!notifOpen) fetchNotifications(); }}
              className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted text-foreground/70 hover:text-foreground transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unread > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50">
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
                        n.type === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500')}>
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
              className="flex items-center gap-2 px-2 py-1.5 rounded-full border border-border/60 hover:bg-muted/50 transition-all duration-200 ml-1"
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
              <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50">
                {/* User header card — clickable to profile */}
                <button
                  onClick={() => { navigate('/dashboard/perfil'); setUserMenuOpen(false); }}
                  className="w-full p-4 bg-muted/30 border-b border-border flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
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
                        {userPlan && (
                          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                            <Crown className="w-2.5 h-2.5" />{userPlan.name}
                          </span>
                        )}
                        {userRank && (
                          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                            <Star className="w-2.5 h-2.5" />{userRank.name}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
                <div className="p-1.5">
                  {[
                    { icon: LayoutDashboard, label: 'Mi Panel', path: '/dashboard' },
                    { icon: User, label: 'Mi Perfil', path: '/dashboard/perfil' },
                    { icon: Package, label: 'Mis Pedidos', path: '/pedidos' },
                    { icon: Settings, label: 'Configuracion', path: '/dashboard/configuracion' },
                  ].map(item => (
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
            className="lg:hidden w-9 h-9 flex items-center justify-center text-foreground/70 hover:text-foreground transition-colors"
            aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile search bar — full-width below nav */}
      {searchOpen && (
        <div className="lg:hidden fixed top-16 left-0 right-0 z-[45] bg-background border-b border-border shadow-lg">
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Buscar usuarios, productos... (${isMac ? '⌘' : 'Ctrl'}K)`}
                className="w-full pl-10 pr-10 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary focus:bg-card transition-colors"
                autoFocus
              />
              <button
                onClick={() => { setSearchOpen(false); setQuery(''); setResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Results */}
            {query.length >= 2 && (
              <div className="mt-2 bg-card border border-border rounded-xl overflow-hidden max-h-[60vh] overflow-y-auto">
                {loadingSearch ? (
                  <div className="py-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                        <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
                        <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-3/4 rounded" /><Skeleton className="h-2.5 w-1/2 rounded" /></div>
                      </div>
                    ))}
                  </div>
                ) : results.length > 0 ? (
                  <div className="py-1.5">
                    {results.map(r => {
                      const Icon = iconFor(r.type);
                      return (
                        <button key={`${r.type}-${r.id}`} onClick={() => go(r.href)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left">
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center">
                    <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Sin resultados para "{query}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logout confirmation dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6">
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
