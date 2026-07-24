import { useMemo } from 'react';
import { useDatabase } from '@/lib/backend';
import type { DatabaseInterface, Profile as BackendProfile } from '@/lib/backend';

// Re-export backend's Profile to avoid type mismatches
export type Profile = BackendProfile;

export interface Commission {
  id: string;
  user_id: string;
  from_user_id?: string | null;
  type: 'direct' | 'binary' | 'rank_bonus' | 'unilevel' | 'residual';
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  description?: string | null;
  created_at: string;
}

export interface Rank {
  id: string;
  name: string;
  slug: string;
  min_affiliates: number;
  min_volume: number;
  bonus: number;
  icon?: string;
  color?: string;
  bg_color?: string;
  border_color?: string;
  sort_order?: number;
}

export interface SystemConfig {
  key: string;
  value: string;
}

export interface MLMRepository {
  // Profiles / Network
  getProfile(userId: string): Promise<Profile | null>;
  getProfileWithReferrals(userId: string): Promise<Profile[]>;
  getDownline(userId: string, maxDepth?: number): Promise<Profile[]>;
  getAllProfiles(): Promise<Profile[]>;
  getProfilesByIds(ids: string[]): Promise<Profile[]>;
  updateProfile(userId: string, updates: Partial<Profile>): Promise<{ error?: string }>;

  // Network RPCs
  addReferralDirect(params: {
    p_sponsor_id: string;
    p_full_name: string;
    p_email: string;
    p_username?: string;
    p_position?: 'left' | 'right';
  }): Promise<{ success?: boolean; error?: string; data?: any }>;

  assignExistingUserToNetwork(params: {
    p_user_id: string;
    p_sponsor_id: string;
    p_position: 'left' | 'right';
  }): Promise<{ success?: boolean; error?: string }>;

  moveUserInNetwork(params: {
    p_user_id: string;
    p_new_sponsor_id: string;
    p_position: 'left' | 'right';
  }): Promise<{ success?: boolean; error?: string }>;

  // Commissions
  getCommissions(userId: string): Promise<Commission[]>;
  getAllCommissions(limit?: number): Promise<Commission[]>;
  createCommission(commission: Omit<Commission, 'id' | 'created_at'>): Promise<{ error?: string }>;
  createCommissions(commissions: Omit<Commission, 'id' | 'created_at'>[]): Promise<{ error?: string }>;
  updateCommission(id: string, updates: Partial<Commission>): Promise<{ error?: string }>;
  updateCommissionsStatus(ids: string[], status: Commission['status']): Promise<{ error?: string }>;
  deleteCommission(id: string): Promise<{ error?: string }>;

  // Ranks
  getRanks(): Promise<Rank[]>;

  // Config
  getConfig(keys: string[]): Promise<SystemConfig[]>;
}

class MLMRepositoryImpl implements MLMRepository {
  private db: DatabaseInterface;

  constructor(db: DatabaseInterface) {
    this.db = db;
  }

  // Profiles / Network
  async getProfile(userId: string): Promise<Profile | null> {
    const { data } = await this.db.select<Profile>('profiles', {
      select: 'id,username,full_name,email,role,rank,plan,status,sponsor_id,binary_position,avatar_url,referral_code,invite_link,created_at,updated_at',
      filter: { id: userId },
      maybeSingle: true,
    });
    return data as Profile | null;
  }

  async getProfileWithReferrals(userId: string): Promise<Profile[]> {
    const { data: self } = await this.db.select<Profile>('profiles', {
      select: 'id,username,full_name,email,role,rank,plan,status,sponsor_id,binary_position,avatar_url,referral_code,invite_link,created_at,updated_at',
      filter: { id: userId },
      maybeSingle: true,
    });
    const results: Profile[] = [];
    if (self) results.push(self as Profile);
    const { data: referrals } = await this.db.select<Profile>('profiles', {
      select: 'id,username,full_name,email,role,rank,plan,status,sponsor_id,binary_position,avatar_url,referral_code,invite_link,created_at,updated_at',
      filter: { sponsor_id: userId },
    });
    if (referrals) results.push(...(referrals as Profile[]));
    return results;
  }

  async getDownline(userId: string, maxDepth = 6): Promise<Profile[]> {
    const results: Profile[] = [];
    const { data: self } = await this.db.select<Profile>('profiles', {
      select: 'id,username,full_name,email,role,rank,plan,status,sponsor_id,binary_position,avatar_url,referral_code,invite_link,created_at,updated_at',
      filter: { id: userId },
      maybeSingle: true,
    });
    if (self) results.push(self as Profile);
    let frontier = [userId];
    for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
      const { data: kids } = await this.db.select<Profile>('profiles', {
        select: 'id,username,full_name,email,role,rank,plan,status,sponsor_id,binary_position,avatar_url,referral_code,invite_link,created_at,updated_at',
        filter: [{ column: 'sponsor_id', operator: 'in', value: frontier }],
      });
      const newKids = ((kids as Profile[]) || []).filter(k => !results.find(p => p.id === k.id));
      if (newKids.length > 0) results.push(...newKids);
      frontier = newKids.map(k => k.id);
    }
    return results;
  }

  async getAllProfiles(): Promise<Profile[]> {
    const { data } = await this.db.select<Profile>('profiles', {
      select: 'id,username,full_name,email,role,rank,plan,status,sponsor_id,binary_position,avatar_url,referral_code,invite_link,created_at,updated_at',
      order: { column: 'created_at' },
    });
    return (data as Profile[]) || [];
  }

  async getProfilesByIds(ids: string[]): Promise<Profile[]> {
    if (ids.length === 0) return [];
    const { data } = await this.db.select<Profile>('profiles', {
      select: 'id,username,full_name,email,role,rank,plan,status,sponsor_id,binary_position,avatar_url,referral_code,invite_link,created_at,updated_at',
      filter: [{ column: 'id', operator: 'in', value: ids }],
    });
    return (data as Profile[]) || [];
  }

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<{ error?: string }> {
    const { error } = await this.db.update('profiles', userId, {
      ...updates,
      updated_at: new Date().toISOString(),
    });
    return { error };
  }

  // Network RPCs
  async addReferralDirect(params: {
    p_sponsor_id: string;
    p_full_name: string;
    p_email: string;
    p_username?: string;
    p_position?: 'left' | 'right';
  }): Promise<{ success?: boolean; error?: string; data?: any }> {
    const { data, error } = await this.db.rpc('add_referral_direct', {
      p_sponsor_id: params.p_sponsor_id,
      p_full_name: params.p_full_name,
      p_email: params.p_email,
      p_username: params.p_username || params.p_full_name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
      p_position: params.p_position || 'left',
    });
    if (error) return { error };
    return { success: true, data };
  }

  async assignExistingUserToNetwork(params: {
    p_user_id: string;
    p_sponsor_id: string;
    p_position: 'left' | 'right';
  }): Promise<{ success?: boolean; error?: string }> {
    const { error } = await this.db.rpc('assign_existing_user_to_network', {
      p_user_id: params.p_user_id,
      p_sponsor_id: params.p_sponsor_id,
      p_position: params.p_position,
    });
    if (error) return { error };
    return { success: true };
  }

  async moveUserInNetwork(params: {
    p_user_id: string;
    p_new_sponsor_id: string;
    p_position: 'left' | 'right';
  }): Promise<{ success?: boolean; error?: string }> {
    const { error } = await this.db.rpc('move_user_in_network', {
      p_user_id: params.p_user_id,
      p_new_sponsor_id: params.p_new_sponsor_id,
      p_position: params.p_position,
    });
    if (error) return { error };
    return { success: true };
  }

  // Commissions
  async getCommissions(userId: string): Promise<Commission[]> {
    const { data } = await this.db.select<Commission>('commissions', {
      select: 'id,user_id,from_user_id,type,amount,currency,status,description,created_at',
      filter: { user_id: userId },
      order: { column: 'created_at', ascending: false },
    });
    return (data as Commission[]) || [];
  }

  async getAllCommissions(limit = 500): Promise<Commission[]> {
    const { data } = await this.db.select<Commission>('commissions', {
      select: 'id,user_id,from_user_id,type,amount,currency,status,description,created_at',
      order: { column: 'created_at', ascending: false },
      limit,
    });
    return (data as Commission[]) || [];
  }

  async createCommission(commission: Omit<Commission, 'id' | 'created_at'>): Promise<{ error?: string }> {
    const { error } = await this.db.insert('commissions', commission);
    return { error };
  }

  async createCommissions(commissions: Omit<Commission, 'id' | 'created_at'>[]): Promise<{ error?: string }> {
    const { error } = await this.db.insert('commissions', commissions);
    return { error };
  }

  async updateCommission(id: string, updates: Partial<Commission>): Promise<{ error?: string }> {
    const { error } = await this.db.update('commissions', id, updates);
    return { error };
  }

  async updateCommissionsStatus(ids: string[], status: Commission['status']): Promise<{ error?: string }> {
    if (ids.length === 0) return {};
    const { error } = await this.db.update('commissions', { id: ids }, { status });
    return { error };
  }

  async deleteCommission(id: string): Promise<{ error?: string }> {
    const { error } = await this.db.delete('commissions', id);
    return { error };
  }

  // Ranks
  async getRanks(): Promise<Rank[]> {
    const { data } = await this.db.select<Rank>('ranks', {
      order: { column: 'sort_order', ascending: true },
    });
    return (data as Rank[]) || [];
  }

  // Config
  async getConfig(keys: string[]): Promise<SystemConfig[]> {
    if (keys.length === 0) return [];
    const { data } = await this.db.select<SystemConfig>('system_config', {
      select: 'key,value',
      filter: [{ column: 'key', operator: 'in', value: keys }],
    });
    return (data as SystemConfig[]) || [];
  }
}

// Hook to get repository instance
export function useMLMRepository(): MLMRepository {
  const db = useDatabase();
  return useMemo(() => new MLMRepositoryImpl(db), [db]);
}
