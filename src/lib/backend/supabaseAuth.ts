import { AuthInterface, AuthResult, Session, User } from './types';
import { supabase } from './client';

function mapUser(supabaseUser: unknown): User | null {
  if (!supabaseUser || typeof supabaseUser !== 'object') return null;
  const u = supabaseUser as Record<string, unknown>;
  return {
    id: u.id as string,
    email: u.email as string,
    emailConfirmed: u.email_confirmed === true,
    createdAt: u.created_at as string,
    lastSignInAt: u.last_sign_in_at as string | undefined,
    metadata: u.user_metadata as Record<string, unknown> | undefined,
  };
}

function mapSession(supabaseSession: unknown): Session | null {
  if (!supabaseSession || typeof supabaseSession !== 'object') return null;
  const s = supabaseSession as Record<string, unknown>;
  const user = mapUser(s.user);
  if (!user) return null;
  return {
    accessToken: s.access_token as string,
    refreshToken: s.refresh_token as string,
    expiresAt: s.expires_at as number,
    user,
  };
}

export const supabaseAuthService: AuthInterface = {
  async signUp(email, password, metadata): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, session: mapSession(data.session) || undefined };
  },

  async signIn(email, password): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, session: mapSession(data.session) || undefined };
  },

  async signInWithOAuth(provider): Promise<{ url?: string; error?: string }> {
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: provider as 'google' });
    if (error) {
      return { error: error.message };
    }
    return { url: data.url };
  },

  async signOut(): Promise<{ error?: string }> {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message };
  },

  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return mapSession(data.session);
  },

  async getUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    return mapUser(data.user);
  },

  async updateUser(metadata): Promise<AuthResult> {
    const { error } = await supabase.auth.updateUser({ data: metadata });
    if (error) {
      return { success: false, error: error.message };
    }
    const session = await this.getSession();
    return { success: true, session: session || undefined };
  },

  async resetPassword(email): Promise<{ error?: string }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error?.message };
  },

  async updatePassword(newPassword): Promise<{ error?: string }> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message };
  },

  onAuthStateChange(callback): () => void {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(_event, mapSession(session));
    });
    return () => data.subscription.unsubscribe();
  },
};
