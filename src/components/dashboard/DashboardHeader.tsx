import { useState, useEffect, useCallback, useRef } from 'react';
import { useDatabase } from '@/lib/backend';
import { Link, useNavigate } from '@/lib/router';
import {
  Bell, Search, Moon, Sun, Menu, LogOut, User, Settings,
  ChevronDown, ExternalLink, CheckCheck, Trash2, X, Users, Package, ShoppingBag,
} from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

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
  const { setSidebarOpen } = useUIStore();
  const database = useDatabase();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [dbNotifications, setDbNotifications] = useState<any[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const unread = dbNotifications.filter(n => !n.read).length;
  const isDark = theme === 'dark';

  const initials = (user?.full_name || user?.username || 'U')
    .split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setFocused(true);
      }
      if (e.key === 'Escape' && focused) {
        setFocused(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [focused]);

  const performSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
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
      const { data: products } = await database.select<any>('products', { select: ['id', 'name', 'sku'], limit: 20 });
      if (Array.isArray(products)) {
        products.filter((p: any) => p.name?.toLowerCase().includes(lower) || p.sku?.toLowerCase().includes(lower))
          .slice(0, 3).forEach((p: any) => found.push({ type: 'product', id: p.id, title: p.name, subtitle: p.sku ? `SKU: ${p.sku}` : 'Producto', href: `/tienda/${p.id}` }));
      }
    } catch { /* silent */ }

    setResults(found.slice(0, 6));
    setLoading(false);
  }, [database, user?.role]);

  useEffect(() => {
    const t = setTimeout(() => performSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, performSearch]);

  const go = (href: string) => {
    navigate(href);
    setQuery('');
    setResults([]);
    setFocused(false);
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

  const handleSignOut = () => {
    setShowLogoutConfirm(true);
  };

  const iconFor = (type: string) => type === 'user' ? Users : type === 'product' ? Package : ShoppingBag;

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-4 lg:px-6 sticky top-0 z-30 gap-2">

      {/* Search bar — LEFT, flex-1, shows on both mobile and desktop */}
      <div ref={searchRef} className="relative flex-1 min-w-0 max-w-xs lg:max-w-sm">
        <div className={cn(
          'flex items-center gap-2 bg-muted/60 border rounded-xl px-3 h-10 transition-all duration-200',
          focused
            ? 'border-primary/50 bg-background ring-2 ring-primary/20'
            : 'border-transparent hover:border-border/40',
        )}>
          <Search className="w-4 h-4 text-foreground/50 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="Buscar..."
            className="bg-transparent text-sm outline-none flex-1 text-foreground placeholder:text-muted-foreground min-w-0"
          />
          {query ? (
            <button onClick={() => { setQuery(''); setResults([]); }} className="p-0.5 hover:bg-muted rounded-lg transition-colors flex-shrink-0">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          ) : (
            <kbd className="hidden lg:flex items-center px-1.5 py-0.5 bg-muted/80 rounded text-[10px] font-medium text-muted-foreground border border-border/30 leading-none flex-shrink-0">
              ⌘K
            </kbd>
          )}
        </div>

        {/* Results dropdown */}
        {focused && query.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50">
            {loading ? (
              <div className="py-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <Skeleton className="w-8 h-8 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-3/4 rounded" />
                      <Skeleton className="h-2.5 w-1/2 rounded" />
                    </div>
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
        <DropdownMenu open={notifOpen} onOpenChange={(open) => { setNotifOpen(open); if (open) fetchNotifications(); }}>
          <DropdownMenuTrigger asChild>
            <button className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted text-foreground/70 hover:text-foreground transition-colors">
              <Bell className="w-4 h-4" />
              {unread > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0 rounded-2xl">
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
                <div
                  key={n.id}
                  className={cn(
                    'group flex gap-3 px-4 py-3 hover:bg-muted transition-colors border-b border-border/50 cursor-pointer',
                    !n.read && 'bg-primary/5'
                  )}
                  onClick={() => !n.read && markAsRead(n.id)}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    n.type === 'success' ? 'bg-green-500/20 text-green-500' :
                    n.type === 'warning' ? 'bg-yellow-500/20 text-yellow-500' :
                    n.type === 'error' ? 'bg-red-500/20 text-red-500' :
                    'bg-blue-500/20 text-blue-500'
                  )}>
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
                    <button
                      onClick={e => { e.stopPropagation(); deleteNotification(n.id); }}
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                    >
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
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User avatar/menu — desktop only */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="hidden lg:flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-full hover:bg-muted transition-colors ml-0.5">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name || 'Avatar'}
                  className="w-8 h-8 rounded-full object-cover border border-border flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                  {initials}
                </div>
              )}
              <div className="text-left">
                <div className="text-sm font-medium text-foreground leading-tight">{user?.full_name?.split(' ')[0] || user?.username || 'Usuario'}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5">
            <div className="px-3 py-2 mb-1 border-b border-border/50">
              <p className="text-sm font-semibold text-foreground truncate">{user?.full_name || user?.username || 'Usuario'}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace(/_/g, ' ') || 'Usuario'}</p>
            </div>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/perfil" className="flex items-center gap-2 rounded-xl cursor-pointer">
                <User className="w-4 h-4" />Mi Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/configuracion" className="flex items-center gap-2 rounded-xl cursor-pointer">
                <Settings className="w-4 h-4" />Configuración
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive flex items-center gap-2 rounded-xl cursor-pointer">
              <LogOut className="w-4 h-4" />Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Hamburger — mobile only, RIGHT */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted text-foreground/70 hover:text-foreground transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Logout confirmation dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
                <LogOut className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground">¿Cerrar sesión?</h3>
              <p className="text-sm text-muted-foreground mt-1">Tendrás que volver a iniciar sesión para acceder a tu panel.</p>
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
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
