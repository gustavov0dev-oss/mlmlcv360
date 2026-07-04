import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from '@/lib/router';
import { Boxes, Menu, X, Sun, Moon, ChevronDown, LogOut, LayoutDashboard, User, ShoppingBag, ShoppingCart, Package, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import { useConfig } from '@/store/configStore';
import { useCart } from '@/store/cartStore';

const navLinks = [
  { href: '/nosotros', label: 'Nosotros' },
  { href: '/planes', label: 'Planes' },
  { href: '/tienda', label: 'Tienda' },
  { href: '/empresa', label: 'Empresa' },
  { href: '/blog', label: 'Blog' },
  { href: '/contacto', label: 'Contacto' },
];

function CartButton() {
  const { itemCount } = useCart();
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate('/carrito')}
      className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Carrito de compras"
    >
      <ShoppingCart className="w-4 h-4" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground rounded-full text-[9px] font-black flex items-center justify-center leading-none">
          {itemCount > 9 ? '9+' : itemCount}
        </span>
      )}
    </button>
  );
}

function UserMenu() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  const initials = (user.full_name || user.email || 'U').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl border border-border hover:bg-muted transition-colors"
      >
        <div className="w-7 h-7 rounded-full overflow-hidden border border-primary/30 flex-shrink-0">
          {user.avatar_url
            ? <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">{initials}</div>}
        </div>
        <span className="text-sm font-medium text-foreground hidden sm:block max-w-[90px] truncate">
          {user.full_name?.split(' ')[0] || 'Usuario'}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 flex-shrink-0">
              {user.avatar_url
                ? <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">{initials}</div>}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-foreground truncate">{user.full_name}</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              {user.plan && <div className="text-[10px] text-primary font-semibold capitalize mt-0.5 bg-primary/10 px-1.5 py-0.5 rounded-full inline-block">{user.plan}</div>}
            </div>
          </div>

          {/* MLM */}
          <div className="py-1">
            <p className="px-4 pt-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mi cuenta</p>
            {[
              { icon: LayoutDashboard, label: 'Mi Panel', path: '/dashboard' },
              { icon: User, label: 'Mi Perfil', path: '/dashboard/perfil' },
            ].map(item => (
              <button key={item.path} onClick={() => { navigate(item.path); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-sm text-foreground transition-colors text-left">
                <item.icon className="w-4 h-4 text-muted-foreground" /> {item.label}
              </button>
            ))}
          </div>

          {/* Store */}
          <div className="py-1 border-t border-border">
            <p className="px-4 pt-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tienda</p>
            {[
              { icon: ShoppingBag, label: 'Ver Tienda', path: '/tienda' },
              { icon: ShoppingCart, label: 'Mi Carrito', path: '/carrito' },
              { icon: Package, label: 'Mis Pedidos', path: '/dashboard/pedidos' },
              { icon: Heart, label: 'Mis Favoritos', path: '/tienda?tab=favoritos' },
            ].map(item => (
              <button key={item.path} onClick={() => { navigate(item.path); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-sm text-foreground transition-colors text-left">
                <item.icon className="w-4 h-4 text-muted-foreground" /> {item.label}
              </button>
            ))}
          </div>

          <div className="py-1 border-t border-border">
            <button onClick={async () => { await signOut(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 text-sm text-red-500 transition-colors text-left">
              <LogOut className="w-4 h-4" /> Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeStore();
  const { user } = useAuthStore();
  const { company } = useConfig();
  const { itemCount } = useCart();
  const companyName = company.company_name || 'MLM 360';
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDark = theme === 'dark';
  const isLoggedIn = !!user;

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      <nav className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-sm' : 'bg-transparent'
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-2">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 mr-4">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Boxes className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">{companyName}</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1">
            {navLinks.map(link => (
              <Link key={link.href} to={link.href}
                className={cn('px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                  location.pathname === link.href || location.pathname.startsWith(link.href + '/')
                    ? 'text-primary bg-primary/8' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-1.5">
            {/* Cart button - always visible */}
            <CartButton />

            <button onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
              aria-label="Toggle theme">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {isLoggedIn ? (
              <div className="hidden md:block">
                <UserMenu />
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login"
                  className="px-4 py-2 text-sm font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors">
                  Ingresar
                </Link>
                <Link to="/registro"
                  className="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20">
                  Registrarse
                </Link>
              </div>
            )}

            <button onClick={() => setMobileOpen(v => !v)}
              className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted text-foreground transition-colors"
              aria-label="Menu">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div className={cn('fixed inset-0 z-40 lg:hidden transition-all duration-300', mobileOpen ? 'pointer-events-auto' : 'pointer-events-none')}>
        <div className={cn('absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300', mobileOpen ? 'opacity-100' : 'opacity-0')}
          onClick={() => setMobileOpen(false)} />
        <div className={cn('absolute top-0 right-0 h-full w-72 bg-card border-l border-border shadow-2xl flex flex-col transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : 'translate-x-full')}>
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Boxes className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-foreground">{companyName}</span>
            </div>
            <button onClick={() => setMobileOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {isLoggedIn && user && (
            <div className="mx-3 mt-3 p-3 bg-muted/60 rounded-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden border border-primary/30 flex-shrink-0">
                {user.avatar_url
                  ? <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">{(user.full_name || 'U').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}</div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-foreground truncate">{user.full_name}</div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              </div>
            </div>
          )}

          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 mt-2">
            {navLinks.map(link => (
              <Link key={link.href} to={link.href} onClick={() => setMobileOpen(false)}
                className={cn('flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                  location.pathname === link.href ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                {link.label === 'Tienda' && <ShoppingBag className="w-4 h-4 mr-2" />}
                {link.label}
              </Link>
            ))}
            {/* Carrito mobile */}
            <button onClick={() => { navigate('/carrito'); setMobileOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <ShoppingCart className="w-4 h-4" /> Carrito
              {itemCount > 0 && <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-full">{itemCount}</span>}
            </button>
            {isLoggedIn && (
              <button onClick={() => { navigate('/dashboard/pedidos'); setMobileOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <Package className="w-4 h-4" /> Mis Pedidos
              </button>
            )}
          </nav>

          <div className="p-3 border-t border-border space-y-2">
            {isLoggedIn ? (
              <>
                <button onClick={() => { navigate('/dashboard'); setMobileOpen(false); }}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">
                  <LayoutDashboard className="w-4 h-4" /> Ir al Panel
                </button>

              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center w-full px-4 py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                  Ingresar al sistema
                </Link>
                <Link to="/registro" onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center w-full px-4 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">
                  Crear cuenta gratis
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
