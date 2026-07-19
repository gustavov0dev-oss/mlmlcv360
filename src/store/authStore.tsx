import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useBackend, useDatabase } from '@/lib/backend';
import type { Profile, Session } from '@/lib/backend';

interface AuthContextType {
  user: Profile | null;
  session: Session | null;
  loading: boolean;
  setUser: (user: Profile | null) => void;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
  fetchProfile: (id: string) => Promise<Profile | null>;
  getInviteLink: () => string;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, loading: true,
  setUser: () => {}, setSession: () => {},
  signOut: async () => {}, fetchProfile: async () => null,
  getInviteLink: () => '',
});

const AUTH_PATHS = ['/login', '/registro'];
const ADMIN_ROLES = ['super_admin', 'admin', 'inspector', 'support'];

function doRedirect(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new Event('locationchange'));
}

function defaultDashboardPath(role?: string): string {
  if (!role) return '/dashboard';
  if (ADMIN_ROLES.includes(role)) return '/dashboard';
  return '/dashboard';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<Profile | null>(null);
  const [session, setSessionState] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const backend = useBackend();
  const database = useDatabase();

  const setUser = useCallback((u: Profile | null) => {
    setUserState(u);
    if (u) localStorage.setItem('mlm360-user', JSON.stringify(u));
    else localStorage.removeItem('mlm360-user');
  }, []);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await database.select<Profile>('profiles', {
        filter: { id: userId },
        single: true,
      });
      if (data && !error) {
        setUser(data as Profile);
        return data as Profile;
      }
      return null;
    } catch {
      return null;
    }
  }, [setUser, database]);

  const getInviteLink = useCallback((): string => {
    if (!user?.referral_code) return '';
    return `${window.location.origin}/registro?ref=${user.referral_code}`;
  }, [user]);

  const signOut = useCallback(async () => {
    await backend.auth.signOut();
    setUser(null);
    setSessionState(null);
    doRedirect('/login');
  }, [setUser, backend.auth]);

  useEffect(() => {
    let mounted = true;

    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 3000);

    const isOAuthCallback = window.location.hash.includes('access_token');
    if (isOAuthCallback) {
      sessionStorage.setItem('mlm360-oauth', '1');
      window.history.replaceState({}, '', window.location.pathname + window.location.search);
    }

    backend.auth.getSession().then(async (sessionData) => {
      if (!mounted) return;
      setSessionState(sessionData);

      if (sessionData?.user?.id) {
        try {
          const profile = await fetchProfile(sessionData.user.id);
          if (mounted) {
            clearTimeout(safetyTimer);
            setLoading(false);
            if (AUTH_PATHS.includes(window.location.pathname)) {
              doRedirect(defaultDashboardPath(profile?.role));
            }
          }
        } catch {
          if (mounted) { clearTimeout(safetyTimer); setLoading(false); }
        }
      } else {
        localStorage.removeItem('mlm360-user');
        if (mounted) { clearTimeout(safetyTimer); setLoading(false); }
      }
    }).catch(() => {
      if (mounted) { clearTimeout(safetyTimer); setLoading(false); }
    });

    const unsubscribe = backend.auth.onAuthStateChange((event, sessionData) => {
      if (!mounted) return;
      (async () => {
        setSessionState(sessionData);

        if (sessionData?.user?.id) {
          const fromOAuth = sessionStorage.getItem('mlm360-oauth') === '1';
          if (fromOAuth) sessionStorage.removeItem('mlm360-oauth');

          try {
            let profile = await fetchProfile(sessionData.user.id);
            if (!profile) {
              await new Promise(r => setTimeout(r, 800));
              profile = await fetchProfile(sessionData.user.id);
            }
            if (!mounted) return;
            clearTimeout(safetyTimer);
            setLoading(false);
            if (event === 'PASSWORD_RECOVERY') {
              if (window.location.pathname !== '/reset-password') doRedirect('/reset-password');
              return;
            }
            if (event === 'SIGNED_IN') {
              const currentPath = window.location.pathname;
              if (fromOAuth || AUTH_PATHS.includes(currentPath)) {
                doRedirect(defaultDashboardPath(profile?.role));
              }
            }
          } catch {
            if (mounted) { clearTimeout(safetyTimer); setLoading(false); }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          clearTimeout(safetyTimer);
          setLoading(false);
          doRedirect('/login');
        }
      })();
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = database.subscribe('profiles', (payload: unknown) => {
      const p = payload as { new: Profile };
      if (p.new && (p.new as Profile).id === user.id) {
        setUser(p.new as Profile);
      }
    });
    return unsubscribe;
  }, [user?.id, setUser, database]);

  return (
    <AuthContext.Provider value={{ user, session, loading, setUser, setSession: setSessionState, signOut, fetchProfile, getInviteLink }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthStore() {
  return useContext(AuthContext);
}
