import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase, type Profile } from '@/lib/supabase';

interface AuthContextType {
  user: Profile | null;
  session: any | null;
  loading: boolean;
  setUser: (user: Profile | null) => void;
  setSession: (session: any) => void;
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
  const [session, setSessionState] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((u: Profile | null) => {
    setUserState(u);
    if (u) localStorage.setItem('mlm360-user', JSON.stringify(u));
    else localStorage.removeItem('mlm360-user');
  }, []);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (data && !error) {
        setUser(data as Profile);
        return data as Profile;
      }
      return null;
    } catch {
      return null;
    }
  }, [setUser]);

  const getInviteLink = useCallback((): string => {
    if (!user?.referral_code) return '';
    return `${window.location.origin}/registro?ref=${user.referral_code}`;
  }, [user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSessionState(null);
    doRedirect('/login');
  }, [setUser]);

  useEffect(() => {
    let mounted = true;

    // Hard safety timeout — never leave the app stuck loading
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 3000);

    // Detect Google OAuth callback (hash-based token)
    const isOAuthCallback = window.location.hash.includes('access_token');
    if (isOAuthCallback) {
      sessionStorage.setItem('mlm360-oauth', '1');
      window.history.replaceState({}, '', window.location.pathname + window.location.search);
    }

    // Bootstrap: get session then fetch fresh profile from DB
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!mounted) return;
      setSessionState(s);

      if (s?.user?.id) {
        try {
          const profile = await fetchProfile(s.user.id);
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
        // No session — clear any stale stored user and unblock immediately
        localStorage.removeItem('mlm360-user');
        if (mounted) { clearTimeout(safetyTimer); setLoading(false); }
      }
    }).catch(() => {
      if (mounted) { clearTimeout(safetyTimer); setLoading(false); }
    });

    // Auth state changes (login, logout, token refresh, OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      (async () => {
        setSessionState(s);

        if (s?.user?.id) {
          const fromOAuth = sessionStorage.getItem('mlm360-oauth') === '1';
          if (fromOAuth) sessionStorage.removeItem('mlm360-oauth');

          try {
            let profile = await fetchProfile(s.user.id);
            if (!profile) {
              await new Promise(r => setTimeout(r, 800));
              profile = await fetchProfile(s.user.id);
            }
            if (!mounted) return;
            clearTimeout(safetyTimer);
            setLoading(false);
            if (event === 'PASSWORD_RECOVERY') {
              // Navigate to the reset page so the user can set a new password
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
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time profile sync for own profile changes
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`profile-rt-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`,
      }, payload => {
        if (payload.new) setUser(payload.new as Profile);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, setUser]);

  return (
    <AuthContext.Provider value={{ user, session, loading, setUser, setSession: setSessionState, signOut, fetchProfile, getInviteLink }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthStore() {
  return useContext(AuthContext);
}
