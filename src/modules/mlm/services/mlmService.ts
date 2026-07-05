import type { Commission, Profile, Rank } from '../repositories/mlmRepository';

// Types for enriched data
export interface CommissionWithTotals extends Commission {
  _amount_pen: number;
}

export interface NetworkStats {
  total: number;
  active: number;
  direct: number;
  depth: number;
  byRank: Record<string, number>;
}

export interface CommissionStats {
  total: number;
  paid: number;
  pending: number;
  approved: number;
  count: number;
}

export interface ChartDataPoint {
  name: string;
  comisiones: number;
}

export type CommissionStatus = Commission['status'];
export type CommissionType = Commission['type'];

// Constants
export const STATUS_CONFIG: Record<CommissionStatus, { label: string; color: string; icon?: any }> = {
  pending: { label: 'Pendiente', color: 'text-yellow-600 bg-yellow-500/10' },
  approved: { label: 'Aprobado', color: 'text-blue-600 bg-blue-500/10' },
  paid: { label: 'Pagado', color: 'text-green-600 bg-green-500/10' },
  rejected: { label: 'Rechazado', color: 'text-red-500 bg-red-500/10' },
};

export const STATUS_COLORS: Record<CommissionStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-600',
  approved: 'bg-blue-500/10 text-blue-600',
  paid: 'bg-green-500/10 text-green-600',
  rejected: 'bg-red-500/10 text-red-500',
};

export const TYPE_LABELS: Record<CommissionType, string> = {
  direct: 'Directa',
  binary: 'Binaria',
  rank_bonus: 'Bono de Rango',
  unilevel: 'Unilevel',
  residual: 'Residual',
};

export const TYPE_COLORS: Record<CommissionType, string> = {
  direct: 'bg-blue-500/10 text-blue-600',
  binary: 'bg-purple-500/10 text-purple-600',
  rank_bonus: 'bg-yellow-500/10 text-yellow-600',
  unilevel: 'bg-cyan-500/10 text-cyan-600',
  residual: 'bg-green-500/10 text-green-600',
};

// Service class for read-only aggregations and formatting
class MLMService {
  // Formatting
  formatAmount(amount: number, currency: string = 'PEN'): string {
    const prefix = currency === 'PEN' ? 'S/' : '$';
    return `${prefix} ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatDate(dateStr: string, locale = 'es-PE'): string {
    return new Date(dateStr).toLocaleDateString(locale);
  }

  formatDateTime(dateStr: string, locale = 'es-PE'): string {
    return new Date(dateStr).toLocaleString(locale);
  }

  // Commission aggregations
  calculateCommissionStats(commissions: Commission[]): CommissionStats {
    return {
      total: commissions.reduce((sum, c) => sum + Number(c.amount), 0),
      paid: commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.amount), 0),
      pending: commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.amount), 0),
      approved: commissions.filter(c => c.status === 'approved').length,
      count: commissions.length,
    };
  }

  buildCommissionChartData(commissions: Commission[], monthsBack = 6): ChartDataPoint[] {
    const now = new Date();
    const result: ChartDataPoint[] = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleDateString('es-PE', { month: 'short' });
      const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      const total = commissions.filter(c => {
        const cd = new Date(c.created_at);
        return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
      }).reduce((sum, c) => sum + Number(c.amount), 0);
      result.push({ name: capitalized, comisiones: total });
    }
    return result;
  }

  filterCommissions(commissions: Commission[], filter: string): Commission[] {
    if (filter === 'all') return commissions;
    return commissions.filter(c => c.status === filter);
  }

  paginateCommissions(commissions: Commission[], page: number, pageSize: number): {
    data: Commission[];
    totalPages: number;
    total: number;
  } {
    const total = commissions.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const data = commissions.slice(start, start + pageSize);
    return { data, totalPages, total };
  }

  // Network aggregations
  calculateNetworkStats(profiles: Profile[], rootId: string): NetworkStats {
    const all = profiles;
    const total = all.length;
    const active = all.filter(p => p.status === 'active').length;
    const root = all.find(p => p.id === rootId);
    const direct = root ? all.filter(p => p.sponsor_id === rootId).length : 0;
    const depth = this.calculateMaxDepth(profiles, rootId);
    const byRank: Record<string, number> = {};
    all.forEach(p => {
      const r = p.rank || 'bronze';
      byRank[r] = (byRank[r] || 0) + 1;
    });
    return { total, active, direct, depth, byRank };
  }

  private calculateMaxDepth(profiles: Profile[], rootId: string): number {
    const childMap = new Map<string, Profile[]>();
    profiles.forEach(p => {
      if (p.sponsor_id) {
        const children = childMap.get(p.sponsor_id) || [];
        children.push(p);
        childMap.set(p.sponsor_id, children);
      }
    });
    const visited = new Set<string>();
    const dfs = (id: string, depth: number): number => {
      if (visited.has(id)) return depth;
      visited.add(id);
      const children = childMap.get(id) || [];
      if (children.length === 0) return depth;
      return Math.max(...children.map(c => dfs(c.id, depth + 1)));
    };
    return dfs(rootId, 0);
  }

  buildTree(profiles: Profile[], rootId: string): ProfileNode | null {
    const map = new Map<string, ProfileNode>();
    profiles.forEach(p => map.set(p.id, { ...p, children: [], depth: 0, subtreeSize: 1 }));

    profiles.forEach(p => {
      if (p.sponsor_id && p.id !== rootId) {
        const parent = map.get(p.sponsor_id);
        const child = map.get(p.id);
        if (parent && child) parent.children!.push(child);
      }
    });

    const annotate = (node: ProfileNode, depth: number, seen: Set<string> = new Set()): number => {
      if (seen.has(node.id)) return 0;
      seen.add(node.id);
      node.depth = depth;
      node.subtreeSize = 1 + (node.children || []).reduce((s, c) => s + annotate(c, depth + 1, seen), 0);
      return node.subtreeSize;
    };

    const root = map.get(rootId);
    if (!root) return null;
    annotate(root, 0);
    return root;
  }

  flattenTree(root: ProfileNode): ProfileNode[] {
    const result: ProfileNode[] = [];
    const traverse = (node: ProfileNode, depth: number) => {
      result.push({ ...node, depth });
      (node.children || []).forEach(c => traverse(c, depth + 1));
    };
    traverse(root, 0);
    return result;
  }

  filterByRank(root: ProfileNode | null, rank: string): ProfileNode | null {
    if (!root) return null;
    if (rank === 'all') return root;
    const filterRecursive = (node: ProfileNode): ProfileNode | null => {
      const filteredChildren = (node.children || [])
        .map(c => filterRecursive(c))
        .filter(Boolean) as ProfileNode[];
      if (node.rank === rank || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    };
    return filterRecursive(root);
  }

  // Rank calculations
  findCurrentRank(ranks: Rank[], userRank: string | undefined): { current: Rank | null; index: number; next: Rank | null } {
    const index = ranks.findIndex(r => r.slug === userRank);
    if (index === -1) return { current: ranks[0] || null, index: 0, next: ranks[1] || null };
    return { current: ranks[index], index, next: ranks[index + 1] || null };
  }

  calculateRankProgress(stats: { affiliates: number; volume: number }, nextRank: Rank | null): {
    affiliateProgress: number;
    volumeProgress: number;
  } {
    if (!nextRank) return { affiliateProgress: 100, volumeProgress: 100 };
    return {
      affiliateProgress: Math.min(100, (stats.affiliates / nextRank.min_affiliates) * 100),
      volumeProgress: Math.min(100, (stats.volume / nextRank.min_volume) * 100),
    };
  }

  // Export helper
  exportCommissionsToCSV(commissions: Commission[]): void {
    const header = 'Fecha,Tipo,Estado,Monto,Descripcion';
    const rows = commissions.map(c => [
      this.formatDate(c.created_at),
      TYPE_LABELS[c.type] || c.type,
      STATUS_CONFIG[c.status]?.label || c.status,
      Number(c.amount).toFixed(2),
      c.description || '',
    ].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comisiones_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export interface ProfileNode extends Profile {
  children?: ProfileNode[];
  depth?: number;
  subtreeSize?: number;
}

export const mlmService = new MLMService();
