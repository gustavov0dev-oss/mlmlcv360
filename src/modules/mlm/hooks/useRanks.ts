import { useState, useEffect, useMemo } from 'react';
import {supabase} from '@/lib/backend/client';
import { useAuthStore } from '@/store/authStore';
import { useConfig } from '@/store/configStore';
import { mlmService } from '../services/mlmService';

export interface UseRanksOptions {
  userId?: string;
}

export interface UseRanksReturn {
  loading: boolean;
  error: string | null;
  stats: {
    affiliates: number;
    volume: number;
    totalCommissions: number;
  };
  currentRank: any | null;
  currentRankIndex: number;
  nextRank: any | null;
  progress: {
    affiliateProgress: number;
    volumeProgress: number;
  };
}

export function useRanks(options: UseRanksOptions = {}): UseRanksReturn {
  const { userId } = options;
  const { user } = useAuthStore();
  const { ranks,loading:configLoading } = useConfig();
  const [volume,setVolume]=useState(0);
  const [rankSlug,setRankSlug]=useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [affiliateCount, setAffiliateCount] = useState(0);
  const [totalCommissions, setTotalCommissions] = useState(0);

  const targetUserId = userId || user?.id || '';

  useEffect(() => {
    async function fetchStats() {
      if (!targetUserId) return;
      setLoading(true);
      setError(null);
      try {
        const {data,error}=await supabase.rpc('rank_points_progress',{p_user:targetUserId});
        if(error) throw error;
        setAffiliateCount(Number(data.affiliates));
        setVolume(Number(data.volume));
        setRankSlug(data.rank);
        setTotalCommissions(0);
      } catch (e: any) {
        setError(e?.message || 'Error al cargar estadísticas');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [targetUserId]);

  const stats = useMemo(() => ({
    affiliates: affiliateCount,
    volume,
    totalCommissions,
  }), [affiliateCount, totalCommissions,volume]);

  const { current, index, next } = useMemo(() => {
    return mlmService.findCurrentRank(ranks, rankSlug);
  }, [ranks, rankSlug]);

  const progress = useMemo(() => {
    return mlmService.calculateRankProgress(stats, next);
  }, [stats, next]);

  return {
    loading:loading || configLoading,
    error,
    stats,
    currentRank: current,
    currentRankIndex: index,
    nextRank: next,
    progress,
  };
}
