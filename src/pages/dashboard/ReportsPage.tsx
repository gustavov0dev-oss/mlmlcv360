import { useState, useEffect } from 'react';
import { useDatabase } from '@/lib/backend';
import { useAuthStore } from '@/store/authStore';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts';
import { Download, TrendingUp, Users, DollarSign, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const rankColors: Record<string, string> = {
  bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700',
  platinum: '#e5e4e2', diamond: '#b9f2ff', crown: '#ffd700',
};
const rankLabels: Record<string, string> = {
  bronze: 'Bronce', silver: 'Plata', gold: 'Oro',
  platinum: 'Platino', diamond: 'Diamante', crown: 'Corona',
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      {label && <div className="font-semibold text-foreground mb-1">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{typeof p.value === 'number' ? `S/ ${p.value.toLocaleString()}` : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const database = useDatabase();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [commissionData, setCommissionData] = useState<any[]>([]);
  const [referralData, setReferralData] = useState<any[]>([]);
  const [rankData, setRankData] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, count: 0, referrals: 0, growth: 0 });

  useEffect(() => {
    async function fetchReports() {
      if (!user) return;
      setLoading(true);
      const { data } = await database.select<any>('commissions', {
        select: 'amount, created_at',
        filter: { user_id: user.id },
      });
      const commissions = data as any;
      const { data: rData } = await database.select<any>('profiles', {
        select: 'id, rank, created_at, status',
        filter: { sponsor_id: user.id },
      });
      const referrals = rData as any;

      // Monthly commission data
      const now = new Date();
      const months: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = d.toLocaleDateString('es-PE', { month: 'short' });
        const total = (commissions || []).filter((c: any) => {
          const cd = new Date(c.created_at);
          return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
        }).reduce((s: number, c: any) => s + Number(c.amount), 0);
        months.push({ name: monthName.charAt(0).toUpperCase() + monthName.slice(1), comisiones: total });
      }
      setCommissionData(months);

      // Referral growth
      const referralMonths: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = d.toLocaleDateString('es-PE', { month: 'short' });
        const count = (referrals || []).filter((r: any) => {
          const rd = new Date(r.created_at);
          return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
        }).length;
        referralMonths.push({ name: monthName.charAt(0).toUpperCase() + monthName.slice(1), afiliados: count });
      }
      setReferralData(referralMonths);

      // Rank distribution
      const rankMap: Record<string, number> = {};
      (referrals || []).forEach((r: any) => { rankMap[r.rank] = (rankMap[r.rank] || 0) + 1; });
      setRankData(Object.entries(rankMap).map(([k, v]) => ({ name: rankLabels[k] || k, value: v, fill: rankColors[k] || '#999' })));

      const total = (commissions || []).reduce((s: number, c: any) => s + Number(c.amount), 0);
      setStats({ total, count: commissions?.length || 0, referrals: referrals?.length || 0, growth: 0 });
      setLoading(false);
    }
    fetchReports();
  }, [user]);

  const handleExport = () => {
    toast.success('Reporte exportado');
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
        {/* 4 stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
        {/* 2×2 chart grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 sm:p-5">
              <Skeleton className="h-4 w-40 mb-4" />
              <Skeleton className="h-[220px] w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
          <p className="text-muted-foreground text-sm mt-1">Analiza tu rendimiento y crecimiento.</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors">
          <Download className="w-4 h-4" /> Exportar
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos totales', value: `S/ ${stats.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-primary bg-primary/10' },
          { label: 'Transacciones', value: String(stats.count), icon: TrendingUp, color: 'text-green-500 bg-green-500/10' },
          { label: 'Afiliados', value: String(stats.referrals), icon: Users, color: 'text-purple-500 bg-purple-500/10' },
          { label: 'Crecimiento', value: `+${stats.growth}%`, icon: Award, color: 'text-orange-500 bg-orange-500/10' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', s.color)}>
              <s.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold text-foreground truncate">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Commission area */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Ingresos mensuales</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={commissionData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="comisiones" name="Ingresos" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorArea)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Referral bar */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Nuevos afiliados por mes</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={referralData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="afiliados" name="Afiliados" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Rank distribution */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Distribución por rango</h3>
          {rankData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={rankData} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Afiliados" radius={[0, 4, 4, 0]}>
                  {rankData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Sin afiliados para mostrar</div>
          )}
        </div>

        {/* Commission trend line */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Tendencia de comisiones</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={commissionData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="comisiones" name="Comisiones" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
