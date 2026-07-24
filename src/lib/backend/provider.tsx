import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { BackendServices, Session, User } from './types';
import { supabaseAuthService } from './supabaseAuth';
import { supabaseStorageService } from './supabaseStorage';
import { supabaseDatabaseService } from './supabaseDatabase';

let backendInstance: BackendServices;

export function createBackendServices(): BackendServices {
  if (!backendInstance) {
    backendInstance = {
      auth: supabaseAuthService,
      storage: supabaseStorageService,
      database: supabaseDatabaseService,
      config: supabaseDatabaseService,
    };
  }
  return backendInstance;
}

const supabaseBackend = createBackendServices();

const BackendContext = createContext<BackendServices>(supabaseBackend);
const AuthContext = createContext<{
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function BackendProvider({ children, backend = supabaseBackend }: { children: ReactNode; backend?: BackendServices }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const sessionData = await backend.auth.getSession();
      if (mounted) {
        setSession(sessionData);
        setUser(sessionData?.user || null);
        setLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [backend.auth]);

  useEffect(() => {
    const unsubscribe = backend.auth.onAuthStateChange((_event, sessionData) => {
      setSession(sessionData);
      setUser(sessionData?.user || null);
      setLoading(false);
    });
    return unsubscribe;
  }, [backend.auth]);

  const signOut = useCallback(async () => {
    await backend.auth.signOut();
    setUser(null);
    setSession(null);
  }, [backend.auth]);

  return (
    <BackendContext.Provider value={backend}>
      <AuthContext.Provider value={{ user, session, loading, signOut }}>
        {children}
      </AuthContext.Provider>
    </BackendContext.Provider>
  );
}

export function useBackend(): BackendServices {
  return useContext(BackendContext);
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useStorage() {
  return useBackend().storage;
}

export function useDatabase() {
  return useBackend().database;
}

export { supabaseBackend };
export type { BackendServices, Session, User };
