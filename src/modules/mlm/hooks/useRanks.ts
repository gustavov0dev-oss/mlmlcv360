import { useState, useEffect, useMemo } from 'react';
import { useMLMRepository } from '../repositories/mlmRepository';
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
  const { ranks } = useConfig();
  const repo = useMLMRepository();
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
        const [referrals, commissions] = await Promise.all([
          repo.getDownline(targetUserId, 1),
          repo.getCommissions(targetUserId),
        ]);
        setAffiliateCount(referrals.filter(p => p.sponsor_id === targetUserId).length);
        const total = commissions.reduce((s, c) => s + Number(c.amount), 0);
        setTotalCommissions(total);
      } catch (e: any) {
        setError(e?.message || 'Error al cargar estadísticas');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [targetUserId, repo]);

  const stats = useMemo(() => ({
    affiliates: affiliateCount,
    volume: totalCommissions * 10, // Approximate volume
    totalCommissions,
  }), [affiliateCount, totalCommissions]);

  const { current, index, next } = useMemo(() => {
    return mlmService.findCurrentRank(ranks, user?.rank);
  }, [ranks, user?.rank]);

  const progress = useMemo(() => {
    return mlmService.calculateRankProgress(stats, next);
  }, [stats, next]);

  return {
    loading: loading || ranks.length === 0,
    error,
    stats,
    currentRank: current,
    currentRankIndex: index,
    nextRank: next,
    progress,
  };
}
