import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react';

type Route = {
  path: string;
  params: Record<string, string>;
};

interface RouterContextType {
  route: Route;
  navigate: (path: string) => void;
  params: Record<string, string>;
}

const RouterContext = createContext<RouterContextType>({
  route: { path: '/', params: {} },
  navigate: () => {},
  params: {},
});

/** Strip query string and hash, returning only the pathname portion. */
function stripQuery(raw: string): string {
  return raw.split('?')[0].split('#')[0] || '/';
}

function matchRoute(pattern: string, path: string): Record<string, string> | null {
  // Always work with clean pathnames
  const cleanPath = stripQuery(path);
  const cleanPattern = pattern.replace('/*', '');
  const patternParts = cleanPattern.split('/').filter(Boolean);
  const pathParts = cleanPath.split('/').filter(Boolean);

  if (pattern.endsWith('/*')) {
    if (pathParts.length < patternParts.length) return null;
    const params: Record<string, string> = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) params[patternParts[i].slice(1)] = pathParts[i];
      else if (patternParts[i] !== pathParts[i]) return null;
    }
    return params;
  }

  if (patternParts.length !== pathParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) params[patternParts[i].slice(1)] = pathParts[i];
    else if (patternParts[i] !== pathParts[i]) return null;
  }
  return params;
}

export function Router({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => {
    const p = stripQuery(window.location.pathname || '/');
    if (p.endsWith('/index.html') || p === '/index.html') return { path: '/', params: {} };
    return { path: p, params: {} };
  });

  useEffect(() => {
    const handler = () => {
      const p = stripQuery(window.location.pathname || '/');
      setRoute(r => r.path === p ? r : { path: p, params: {} });
    };
    window.addEventListener('popstate', handler);
    window.addEventListener('locationchange', handler);
    return () => {
      window.removeEventListener('popstate', handler);
      window.removeEventListener('locationchange', handler);
    };
  }, []);

  const navigate = useCallback((to: string) => {
    window.history.pushState({}, '', to);
    const p = stripQuery(to);
    setRoute({ path: p, params: {} });
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    window.scrollTo({ top: 0, behavior: isMobile ? 'auto' : 'smooth' });
    // Trigger locationchange so useSearchParams listeners re-read
    window.dispatchEvent(new Event('locationchange'));
  }, []);

  return (
    <RouterContext.Provider value={{ route, navigate, params: route.params }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  return useContext(RouterContext);
}

export function useNavigate() {
  return useContext(RouterContext).navigate;
}

export function useParams() {
  return useContext(RouterContext).params;
}

interface RouteConfig {
  path: string;
  element: ReactNode;
}

export function Routes({ children }: { children: ReactNode }) {
  const { route } = useContext(RouterContext);
  const childArray = (Array.isArray(children) ? children : [children]) as Array<{ props: RouteConfig } | null>;

  for (const child of childArray) {
    if (!child?.props?.path) continue;
    const params = matchRoute(child.props.path, route.path);
    if (params !== null) {
      if (Object.keys(params).length > 0 && JSON.stringify(params) !== JSON.stringify(route.params)) {
        return <ParamsProvider params={params}>{child.props.element}</ParamsProvider>;
      }
      return <>{child.props.element}</>;
    }
  }

  // No match — render the wildcard * route if present
  const wildcard = childArray.find(c => c?.props?.path === '*');
  if (wildcard) return <>{wildcard.props.element}</>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-primary mb-4">404</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Página no encontrada</h1>
        <p className="text-muted-foreground mb-6">La página que buscas no existe o ha sido movida.</p>
        <a href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors">
          Volver al inicio
        </a>
      </div>
    </div>
  );
}

function ParamsProvider({ params, children }: { params: Record<string, string>; children: ReactNode }) {
  const ctx = useContext(RouterContext);
  return (
    <RouterContext.Provider value={{ ...ctx, route: { ...ctx.route, params }, params }}>
      {children}
    </RouterContext.Provider>
  );
}

export function Route(_props: RouteConfig) {
  return null;
}

interface LinkProps {
  to: string;
  children: ReactNode;
  className?: string | ((props: { isActive: boolean }) => string);
  end?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  style?: React.CSSProperties;
  target?: string;
  rel?: string;
  state?: any;
}

export function Link({ to, children, className, onClick, end, state }: LinkProps) {
  const { navigate, route } = useContext(RouterContext);

  const isActive = end
    ? route.path === stripQuery(to)
    : route.path.startsWith(stripQuery(to)) && (to !== '/' || route.path === '/');
  const resolvedClassName = typeof className === 'function' ? className({ isActive }) : className;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (to.startsWith('http://') || to.startsWith('https://')) {
      window.open(to, '_blank', 'noopener,noreferrer');
      return;
    }
    e.preventDefault();
    onClick?.(e);
    if (state) {
      sessionStorage.setItem(`router-state-${stripQuery(to)}`, JSON.stringify(state));
    }
    navigate(to);
  };

  return (
    <a href={to} onClick={handleClick} className={resolvedClassName}>
      {children}
    </a>
  );
}

export function NavLink({ to, children, className, end, onClick }: LinkProps) {
  return <Link to={to} className={className} end={end} onClick={onClick}>{children}</Link>;
}

export function Navigate({ to }: { to: string }) {
  const { navigate } = useContext(RouterContext);
  useEffect(() => { navigate(to); }, [to]);
  return null;
}

export function useLocation() {
  const { route } = useContext(RouterContext);
  return { pathname: route.path };
}

export function useSearchParams() {
  const getParams = () => new URLSearchParams(window.location.search);
  const [params, setParams] = useState<URLSearchParams>(getParams);

  useEffect(() => {
    const handler = () => setParams(getParams());
    window.addEventListener('popstate', handler);
    window.addEventListener('locationchange', handler);
    return () => {
      window.removeEventListener('popstate', handler);
      window.removeEventListener('locationchange', handler);
    };
  }, []);

  return [params] as const;
}
