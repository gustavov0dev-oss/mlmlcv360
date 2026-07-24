import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMLMRepository, type Profile } from '../repositories/mlmRepository';
import { mlmService, type ProfileNode, type NetworkStats } from '../services/mlmService';

export interface UseNetworkOptions {
  userId: string;
  isAdmin?: boolean;
  viewAllNetwork?: boolean;
  maxDepth?: number;
}

export interface UseNetworkReturn {
  profiles: Profile[];
  tree: ProfileNode | null;
  stats: NetworkStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addReferral: (params: {
    sponsorId: string;
    fullName: string;
    email: string;
    username?: string;
    position?: 'left' | 'right';
  }) => Promise<{ success: boolean; error?: string; data?: any }>;
  assignExistingUser: (params: {
    userId: string;
    sponsorId: string;
    position: 'left' | 'right';
  }) => Promise<{ success: boolean; error?: string }>;
  moveUser: (params: {
    userId: string;
    newSponsorId: string;
    position: 'left' | 'right';
  }) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (userId: string, updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
  unlinkUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  allowAssignExisting: boolean;
}

export function useNetwork(options: UseNetworkOptions): UseNetworkReturn {
  const { userId, isAdmin = false, viewAllNetwork = false, maxDepth = 6 } = options;
  const repo = useMLMRepository();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allowAssignExisting, setAllowAssignExisting] = useState(true);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch config
      const config = await repo.getConfig(['allow_assign_existing_user']);
      const cfgMap: Record<string, string> = {};
      config.forEach(c => { cfgMap[c.key] = c.value; });
      setAllowAssignExisting(cfgMap.allow_assign_existing_user !== 'false');

      let data: Profile[] = [];
      if (isAdmin && viewAllNetwork) {
        data = await repo.getAllProfiles();
      } else {
        data = await repo.getDownline(userId, maxDepth);
      }
      setProfiles(data);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar la red');
    } finally {
      setLoading(false);
    }
  }, [userId, isAdmin, viewAllNetwork, maxDepth, repo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const rootId = useMemo(() => {
    if (isAdmin && viewAllNetwork) {
      const root = profiles.find(p => !p.sponsor_id) || profiles[0];
      return root?.id || userId;
    }
    return userId;
  }, [profiles, userId, isAdmin, viewAllNetwork]);

  const tree = useMemo(() => {
    if (profiles.length === 0 || !rootId) return null;
    return mlmService.buildTree(profiles, rootId);
  }, [profiles, rootId]);

  const stats = useMemo(() => {
    if (profiles.length === 0 || !rootId) return null;
    return mlmService.calculateNetworkStats(profiles, rootId);
  }, [profiles, rootId]);

  const addReferral = useCallback(async (params: {
    sponsorId: string;
    fullName: string;
    email: string;
    username?: string;
    position?: 'left' | 'right';
  }): Promise<{ success: boolean; error?: string; data?: any }> => {
    const result = await repo.addReferralDirect({
      p_sponsor_id: params.sponsorId,
      p_full_name: params.fullName,
      p_email: params.email,
      p_username: params.username,
      p_position: params.position,
    });
    if (result.success) await fetchData();
    return { success: !!result.success, error: result.error, data: result.data };
  }, [repo, fetchData]);

  const assignExistingUser = useCallback(async (params: {
    userId: string;
    sponsorId: string;
    position: 'left' | 'right';
  }): Promise<{ success: boolean; error?: string }> => {
    const result = await repo.assignExistingUserToNetwork({
      p_user_id: params.userId,
      p_sponsor_id: params.sponsorId,
      p_position: params.position,
    });
    if (result.success) await fetchData();
    return { success: !!result.success, error: result.error };
  }, [repo, fetchData]);

  const moveUser = useCallback(async (params: {
    userId: string;
    newSponsorId: string;
    position: 'left' | 'right';
  }): Promise<{ success: boolean; error?: string }> => {
    const result = await repo.moveUserInNetwork({
      p_user_id: params.userId,
      p_new_sponsor_id: params.newSponsorId,
      p_position: params.position,
    });
    if (result.success) await fetchData();
    return { success: !!result.success, error: result.error };
  }, [repo, fetchData]);

  const updateProfile = useCallback(async (profileUserId: string, updates: Partial<Profile>) => {
    const { error } = await repo.updateProfile(profileUserId, updates);
    if (!error) await fetchData();
    return { success: !error, error };
  }, [repo, fetchData]);

  const unlinkUser = useCallback(async (profileUserId: string) => {
    const { error } = await repo.updateProfile(profileUserId, { sponsor_id: null as any });
    if (!error) await fetchData();
    return { success: !error, error };
  }, [repo, fetchData]);

  return {
    profiles,
    tree,
    stats,
    loading,
    error,
    refresh: fetchData,
    addReferral,
    assignExistingUser,
    moveUser,
    updateProfile,
    unlinkUser,
    allowAssignExisting,
  };
}
