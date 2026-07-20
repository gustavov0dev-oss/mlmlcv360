import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from '@/lib/router';
import {
  X, Sun, Moon, ChevronDown, LogOut, LayoutDashboard, User,
  ShoppingBag, Package, Heart, Menu, Settings,
  Crown, Zap, Scale, Star, Medal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStore, useIsDark } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import { useConfig, type Rank } from '@/store/configStore';
import { useCart } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { LogoWithText } from '@/components/Logo';

const rankIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  medal: Medal, crown: Crown, star: Star,
  bronze: Medal, silver: Medal, gold: Medal, platinum: Medal, diamond: Medal,
};

function resolveBadgeColor(color: string | undefined, bg: string | undefined, fallbackColor: string, fallbackBg: string) {
  const isRaw = (v?: string) => v && (v.startsWith('#') || v.startsWith('rgb') || v.startsWith('hsl'));
  const style: React.CSSProperties = {};
  if (isRaw(color)) style.color = color;
  if (isRaw(bg)) style.backgroundColor = bg;
  const cls = cn(
    'inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
    !isRaw(color) ? (color || fallbackColor) : '',
    !isRaw(bg) ? (bg || fallbackBg) : '',
  );
  return { cls, style };
}

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
  if (trimmed.startsWith('http') || trimmed.startsWith('/')) return <img src={trimmed} alt="" className={cn('w-full h-full object-contain', className)} />;
  const Comp = rankIconMap[trimmed.toLowerCase()];
  if (Comp) return <Comp className={className} />;
  if (trimmed.length <= 4 && !trimmed.includes('.')) return <span className={cn('flex items-center justify-center w-full h-full', className)}>{trimmed}</span>;
  return <Star className={className} />;
}

const navLinks = [
  { href: '/nosotros', label: 'Nosotros' },
  { href: '/planes', label: 'Planes' },
  { href: '/tienda', label: 'Tienda' },
  { href: '/empresa', label: 'Empresa' },
  { href: '/blog', label: 'Novedades' },
  { href: '/contacto', label: 'Contacto' },
];

function DesktopUserMenu() {
  const { user, signOut } = useAuthStore();
  const { plans, ranks } = useConfig();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  const initials = (user.full_name || user.email || 'U')
    .split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  const userPlan = plans.find(p => p.slug === user.plan || p.id === user.plan);
  const userRank = ranks.find(r => r.slug === user.rank || r.name?.toLowerCase() === user.rank?.toLowerCase());

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-full border border-border/60 hover:bg-muted/50 transition-all duration-200"
      >
        <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center flex-shrink-0">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-primary">{initials}</span>
          )}
        </div>
        <span className="text-sm font-medium text-foreground max-w-[90px] truncate">
          {user.full_name?.split(' ')[0] || 'Usuario'}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="p-4 bg-muted/30 border-b border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center flex-shrink-0">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-primary">{initials}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-foreground truncate text-sm">{user.full_name}</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              {(userPlan || userRank) && (
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {userPlan && (() => {
                    const { cls, style } = resolveBadgeColor(userPlan.color, userPlan.bg_color, 'text-amber-600 dark:text-amber-400', 'bg-amber-500/10');
                    return <span className={cls} style={style}><Crown className="w-2.5 h-2.5" />{userPlan.name}</span>;
                  })()}
                  {userRank && (() => {
                    const { cls, style } = resolveBadgeColor(userRank.color, userRank.bg_color, 'text-primary', 'bg-primary/10');
                    return <span className={cls} style={style}><RankBadgeIcon rank={userRank} className="w-2.5 h-2.5" />{userRank.name}</span>;
                  })()}
                </div>
              )}
            </div>
          </div>
          <div className="p-1.5">
            {(() => {
              const role = (user as any)?.role || 'user';
              const canAccessSettings = role === 'super_admin' || role === 'admin';
              return [
                { icon: LayoutDashboard, label: 'Mi Panel', path: '/dashboard', show: true },
                { icon: User, label: 'Mi Perfil', path: '/dashboard/perfil', show: true },
                { icon: Package, label: 'Mis Pedidos', path: '/pedidos', show: true },
                { icon: Settings, label: 'Configuracion', path: '/dashboard/configuracion', show: canAccessSettings },
              ].filter(item => item.show).map(item => (
                <button key={item.path} onClick={() => { navigate(item.path); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-muted text-sm text-foreground transition-colors text-left">
                  <item.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />{item.label}
                </button>
              ));
            })()}
          </div>
          <div className="p-1.5 border-t border-border">
            <button onClick={() => { setShowLogoutConfirm(true); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-sm text-red-500 transition-colors text-left">
              <LogOut className="w-4 h-4 flex-shrink-0" />Cerrar sesion
            </button>
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
                onClick={async () => { await signOut(); setShowLogoutConfirm(false); }}
                className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Cerrar sesion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setTheme } = useThemeStore();
  const isDark = useIsDark();
  const { user, signOut } = useAuthStore();
  const { company, logoValue, logoSizes, plans, ranks } = useConfig();
  const { itemCount } = useCart();
  const { mobileNavOpen, setMobileNavOpen } = useUIStore();
  const companyName = company.company_name || 'MLM 360';
  const [scrolled, setScrolled] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const isLoggedIn = !!user;

  // Simple scroll lock - no position:fixed to avoid jelly scroll
  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'contain';
    } else {
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
    };
  }, [mobileNavOpen]);

  useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const initials = user
    ? (user.full_name || user.email || 'U').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : '';

  // Quick access buttons for logged-in users (removed duplicate "Panel")
  const loggedInQuickActions = [
    { icon: Package, label: 'Pedidos', action: () => navigate('/dashboard/pedidos') },
    { icon: Heart, label: 'Favoritos', action: () => navigate('/favoritos') },
    { icon: Scale, label: 'Comparar', action: () => navigate('/comparar') },
    { icon: Zap, label: 'Mi Plan', action: () => navigate('/dashboard/mi-plan') },
  ];

  // Quick access for guests (removed duplicate Blog and Contacto)
  const guestQuickActions = [
    { icon: ShoppingBag, label: 'Tienda', action: () => navigate('/tienda') },
    { icon: Crown, label: 'Planes', action: () => navigate('/planes') },
  ];

  const quickActions = isLoggedIn ? loggedInQuickActions : guestQuickActions;

  // Get user's plan and rank info
  const userPlan = user ? plans.find(p => p.slug === user.plan || p.id === user.plan) : null;
  const userRank = user ? ranks.find(r => r.slug === user.rank || r.name?.toLowerCase() === user.rank?.toLowerCase()) : null;

  return (
    <>
      {/* Fixed top bar */}
      <nav className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        mobileNavOpen
          ? 'bg-background border-b-0'
          : scrolled
            ? 'bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm'
            : 'bg-background',
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center gap-4">

            {/* Logo */}
            <Link to="/" className="flex-shrink-0" onClick={() => mobileNavOpen && setMobileNavOpen(false)}>
              <LogoWithText
                value={logoValue}
                fallbackText={companyName}
                pixelSize={logoSizes.navbar || 32}
                pixelHeight={logoSizes.navbarHeight || logoSizes.navbar || 32}
                textClass="text-lg font-bold text-foreground"
              />
            </Link>

            {/* Desktop nav links */}
            <div className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
              {navLinks.map(link => (
                <Link key={link.href} to={link.href}
                  className={cn(
                    'px-3.5 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
                    location.pathname === link.href || location.pathname.startsWith(link.href + '/')
                      ? 'text-primary bg-primary/10'
                      : 'text-foreground/70 hover:text-foreground hover:bg-muted/50',
                  )}>
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Right controls */}
            <div className="ml-auto flex items-center gap-1">
              {/* Cart button */}
              <button onClick={() => navigate('/carrito')}
                className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Carrito">
                <ShoppingBag className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </button>

              {/* Theme toggle */}
              <button onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Cambiar tema">
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {isLoggedIn ? (
                <div className="hidden md:block ml-1"><DesktopUserMenu /></div>
              ) : (
                <div className="hidden md:flex items-center gap-2 ml-2">
                  <Link to="/login" className="px-4 py-1.5 text-sm font-medium text-foreground border border-border/60 rounded-full hover:bg-muted/50 transition-colors">
                    Ingresar
                  </Link>
                  <Link to="/registro" className="px-5 py-1.5 text-sm font-semibold bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
                    Registrarse
                  </Link>
                </div>
              )}

              {/* Hamburger */}
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className={cn(
                  'lg:hidden w-9 h-9 flex items-center justify-center transition-colors ml-1',
                  mobileNavOpen ? 'text-foreground' : 'text-foreground hover:text-foreground',
                )}
                aria-label={mobileNavOpen ? 'Cerrar menu' : 'Abrir menu'}>
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile overlay — bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!mobileNavOpen}
        className={cn(
          'fixed top-16 left-0 right-0 bottom-0 z-[55] lg:hidden',
          mobileNavOpen ? 'pointer-events-auto visible' : 'pointer-events-none invisible',
        )}
      >
        {/* Backdrop */}
        <div
          className={cn(
            'absolute inset-0 bg-black/40 transition-opacity duration-200',
            mobileNavOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setMobileNavOpen(false)}
        />

        {/* Bottom-sheet panel */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl border-t border-border shadow-2xl',
            'transition-transform duration-200 ease-out overscroll-contain',
            mobileNavOpen ? 'translate-y-0' : 'translate-y-full',
          )}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>
          <div className="px-4 pt-3 pb-8 overflow-y-auto max-h-[80vh]">

            {/* User card — only when logged in */}
            {isLoggedIn && user && (
              <button
                onClick={() => { navigate('/dashboard/perfil'); setMobileNavOpen(false); }}
                className="w-full mb-4 p-4 bg-gradient-to-r from-primary/8 to-muted/30 border border-border/50 rounded-xl flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center flex-shrink-0 ring-2 ring-primary/15">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-primary">{initials}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground">{user.full_name}</div>
                  <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                  {(userPlan || userRank) && (
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {userPlan && (() => {
                        const { cls, style } = resolveBadgeColor(userPlan.color, userPlan.bg_color, 'text-amber-600 dark:text-amber-400', 'bg-amber-500/10');
                        return <span className={cls} style={style}><Crown className="w-2.5 h-2.5" />{userPlan.name}</span>;
                      })()}
                      {userRank && (() => {
                        const { cls, style } = resolveBadgeColor(userRank.color, userRank.bg_color, 'text-primary', 'bg-primary/10');
                        return <span className={cls} style={style}><RankBadgeIcon rank={userRank} className="w-2.5 h-2.5" />{userRank.name}</span>;
                      })()}
                    </div>
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90 flex-shrink-0" />
              </button>
            )}

            {/* Auth buttons — only when NOT logged in */}
            {!isLoggedIn && (
              <div className="flex gap-2 mb-4">
                <Link to="/login" onClick={() => setMobileNavOpen(false)}
                  className="flex-1 py-3 text-center text-sm font-semibold text-foreground bg-muted/50 rounded-xl border border-border/50 hover:bg-muted/70 transition-colors">
                  Ingresar
                </Link>
                <Link to="/registro" onClick={() => setMobileNavOpen(false)}
                  className="flex-1 py-3 text-center text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                  Registrarse
                </Link>
              </div>
            )}

            {/* Navigation links grid */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {navLinks.map(link => (
                <Link key={link.href} to={link.href} onClick={() => setMobileNavOpen(false)}
                  className={cn(
                    'py-3 rounded-xl text-center text-sm font-medium transition-colors',
                    location.pathname === link.href
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted/40 text-foreground hover:bg-muted/60',
                  )}>
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Quick access icons — conditional on auth state, no duplicates */}
            {quickActions.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                {quickActions.map(({ icon: Icon, label, action }) => (
                  <button key={label} onClick={() => { action(); setMobileNavOpen(false); }}
                    className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors active:scale-95">
                    <Icon className="w-5 h-5 text-foreground" />
                    <span className="text-xs font-medium text-foreground">{label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Logged-in bottom actions */}
            {isLoggedIn && (
              <div className="flex gap-2">
                <button onClick={() => { navigate('/dashboard'); setMobileNavOpen(false); }}
                  className="flex-1 py-3 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                  <LayoutDashboard className="w-4 h-4" />Mi Panel
                </button>
                <button onClick={() => { setShowLogoutConfirm(true); setMobileNavOpen(false); }}
                  className="w-12 flex items-center justify-center border border-red-400/40 text-red-500 rounded-xl hover:bg-red-500/8 transition-colors"
                  aria-label="Cerrar sesion">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
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
                onClick={async () => { await signOut(); setShowLogoutConfirm(false); }}
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
