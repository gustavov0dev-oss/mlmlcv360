import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMLMRepository, type Commission, type Profile } from '../repositories/mlmRepository';
import { mlmService, type CommissionStats, type ChartDataPoint } from '../services/mlmService';

export interface UseCommissionsOptions {
  userId?: string;
  isAdmin?: boolean;
  autoLoad?: boolean;
}

export interface UseCommissionsReturn {
  commissions: Commission[];
  users: Profile[];
  loading: boolean;
  error: string | null;
  stats: CommissionStats;
  chartData: ChartDataPoint[];
  refresh: () => Promise<void>;
  create: (commission: Omit<Commission, 'id' | 'created_at'>) => Promise<{ success: boolean; error?: string }>;
  createMany: (commissions: Omit<Commission, 'id' | 'created_at'>[]) => Promise<{ success: boolean; error?: string }>;
  update: (id: string, updates: Partial<Commission>) => Promise<{ success: boolean; error?: string }>;
  updateStatus: (id: string, status: Commission['status']) => Promise<{ success: boolean; error?: string }>;
  updateStatusMany: (ids: string[], status: Commission['status']) => Promise<{ success: boolean; error?: string }>;
  delete: (id: string) => Promise<{ success: boolean; error?: string }>;
  exportCSV: () => void;
}

export function useCommissions(options: UseCommissionsOptions = {}): UseCommissionsReturn {
  const { userId, isAdmin = false, autoLoad = true } = options;
  const repo = useMLMRepository();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [commData, profileData] = await Promise.all([
        userId && !isAdmin ? repo.getCommissions(userId) : repo.getAllCommissions(),
        repo.getAllProfiles(),
      ]);
      setCommissions(commData);
      setUsers(profileData);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar comisiones');
    } finally {
      setLoading(false);
    }
  }, [userId, isAdmin, repo]);

  useEffect(() => {
    if (autoLoad) fetchData();
  }, [autoLoad, fetchData]);

  const stats = useMemo(() => mlmService.calculateCommissionStats(commissions), [commissions]);
  const chartData = useMemo(() => mlmService.buildCommissionChartData(commissions), [commissions]);

  const create = useCallback(async (commission: Omit<Commission, 'id' | 'created_at'>) => {
    const { error } = await repo.createCommission(commission);
    if (!error) await fetchData();
    return { success: !error, error };
  }, [repo, fetchData]);

  const createMany = useCallback(async (newCommissions: Omit<Commission, 'id' | 'created_at'>[]) => {
    const { error } = await repo.createCommissions(newCommissions);
    if (!error) await fetchData();
    return { success: !error, error };
  }, [repo, fetchData]);

  const update = useCallback(async (id: string, updates: Partial<Commission>) => {
    const { error } = await repo.updateCommission(id, updates);
    if (!error) await fetchData();
    return { success: !error, error };
  }, [repo, fetchData]);

  const updateStatus = useCallback(async (id: string, status: Commission['status']) => {
    const { error } = await repo.updateCommission(id, { status });
    if (!error) await fetchData();
    return { success: !error, error };
  }, [repo, fetchData]);

  const updateStatusMany = useCallback(async (ids: string[], status: Commission['status']) => {
    const { error } = await repo.updateCommissionsStatus(ids, status);
    if (!error) await fetchData();
    return { success: !error, error };
  }, [repo, fetchData]);

  const deleteCommission = useCallback(async (id: string) => {
    const { error } = await repo.deleteCommission(id);
    if (!error) await fetchData();
    return { success: !error, error };
  }, [repo, fetchData]);

  const exportCSV = useCallback(() => {
    mlmService.exportCommissionsToCSV(commissions);
  }, [commissions]);

  return {
    commissions,
    users,
    loading,
    error,
    stats,
    chartData,
    refresh: fetchData,
    create,
    createMany,
    update,
    updateStatus,
    updateStatusMany,
    delete: deleteCommission,
    exportCSV,
  };
}

// Pagination helper for use in components
export function useCommissionsPagination(
  commissions: Commission[],
  pageSize: number = 10
) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    return mlmService.filterCommissions(commissions, filter);
  }, [commissions, filter]);

  const paginated = useMemo(() => {
    return mlmService.paginateCommissions(filtered, page, pageSize);
  }, [filtered, page, pageSize]);

  const setFilterAndReset = useCallback((newFilter: string) => {
    setFilter(newFilter);
    setPage(1);
  }, []);

  return {
    page,
    setPage,
    filter,
    setFilter: setFilterAndReset,
    filtered,
    paginatedData: paginated.data,
    totalPages: paginated.totalPages,
    total: paginated.total,
  };
}

// Admin-specific pagination with search and filters
export function useCommissionsAdminPagination(
  commissions: Commission[],
  users: Profile[],
  pageSize: number = 15
) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Enrich commissions with user data
  const enriched = useMemo(() => {
    const userMap = new Map(users.map(u => [u.id, u]));
    return commissions.map(c => ({
      ...c,
      _user_name: userMap.get(c.user_id)?.full_name || '—',
      _user_email: userMap.get(c.user_id)?.email || '',
      _from_name: c.from_user_id ? (userMap.get(c.from_user_id)?.full_name || '—') : '—',
    }));
  }, [commissions, users]);

  const filtered = useMemo(() => {
    let list = enriched as any[];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        `${c._user_name} ${c._user_email} ${c.description ?? ''}`.toLowerCase().includes(q)
      );
    }
    if (filterType) list = list.filter(c => c.type === filterType);
    if (filterStatus) list = list.filter(c => c.status === filterStatus);
    return list;
  }, [enriched, search, filterType, filterStatus]);

  const paginated = useMemo(() => {
    return mlmService.paginateCommissions(filtered as Commission[], page, pageSize);
  }, [filtered, page, pageSize]);

  const adminStats = useMemo(() => {
    const baseStats = mlmService.calculateCommissionStats(commissions);
    return {
      ...baseStats,
      pendingAmt: commissions.filter(c => c.status === 'pending').reduce((s, c) => s + Number(c.amount), 0),
    };
  }, [commissions]);

  const setSearchAndReset = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, []);

  const setFilterTypeAndReset = useCallback((val: string) => {
    setFilterType(val);
    setPage(1);
  }, []);

  const setFilterStatusAndReset = useCallback((val: string) => {
    setFilterStatus(val);
    setPage(1);
  }, []);

  return {
    page,
    setPage,
    search,
    setSearch: setSearchAndReset,
    filterType,
    setFilterType: setFilterTypeAndReset,
    filterStatus,
    setFilterStatus: setFilterStatusAndReset,
    enriched: enriched as any[],
    filtered: filtered as any[],
    paginatedData: paginated.data,
    totalPages: paginated.totalPages,
    total: paginated.total,
    stats: adminStats,
  };
}
