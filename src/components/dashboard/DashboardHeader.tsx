import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Link, useNavigate } from '@/lib/router';
import { Bell, Search, Moon, Sun, Menu, LogOut, User, Settings, ChevronDown, ExternalLink, CheckCheck, Trash2 } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function DashboardHeader() {
  const { theme, setTheme } = useThemeStore();
  const { user, signOut } = useAuthStore();
  const { setSidebarOpen } = useUIStore();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const [dbNotifications, setDbNotifications] = useState<any[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const unread = dbNotifications.filter(n => !n.read).length;
  const isDark = theme === 'dark';

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoadingNotifs(true);
    const { data } = await supabase
      .from('notifications')
      .select('id, title, message, type, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setDbNotifications(data || []);
    setLoadingNotifs(false);
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    await supabase.rpc('mark_notification_read', { p_notification_id: id });
    setDbNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = async () => {
    if (!user?.id || unread === 0) return;
    await supabase.rpc('mark_all_notifications_read', { p_user_id: user.id });
    setDbNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('Todas las notificaciones marcadas como leídas');
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setDbNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md flex items-center gap-3 px-4 lg:px-6 sticky top-0 z-30">
      <button
        onClick={() => setSidebarOpen(true)}
        className="p-2 rounded-lg hover:bg-muted text-muted-foreground lg:hidden"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className={cn(
        'flex items-center gap-2 bg-muted rounded-lg px-3 h-9 transition-all duration-200',
        searchOpen ? 'w-64 lg:w-96' : 'w-40 lg:w-64'
      )}>
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          placeholder="Buscar en el sistema..."
          onFocus={() => setSearchOpen(true)}
          onBlur={() => setSearchOpen(false)}
          className="bg-transparent text-sm outline-none flex-1 text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Link to="/" className="hidden sm:flex w-9 h-9 rounded-lg items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
          <ExternalLink className="w-4 h-4" />
        </Link>

        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
        >
          {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>

        {/* Notifications - fully functional */}
        <DropdownMenu open={notifOpen} onOpenChange={(open) => { setNotifOpen(open); if (open) fetchNotifications(); }}>
          <DropdownMenuTrigger asChild>
            <button className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
              <Bell className="w-4.5 h-4.5" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
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
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs',
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
                      onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                      title="Eliminar"
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

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-muted transition-colors">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name || 'Avatar'}
                  className="w-8 h-8 rounded-full object-cover border border-border flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                  {user?.full_name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-foreground leading-tight">{user?.full_name || user?.username || 'Usuario'}</div>
                <div className="text-xs text-muted-foreground capitalize">{user?.role?.replace('_', ' ') || 'Usuario'}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link to="/dashboard/perfil" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Mi Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/configuracion" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configuración
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
