import { useAuthStore } from '@/store/authStore';
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts';
import { DollarSign, Clock, CircleCheck as CheckCircle, Download, Circle as XCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCommissions, useCommissionsPagination, TYPE_LABELS } from '@/modules/mlm';
import { STATUS_CONFIG } from '@/modules/mlm/services/mlmService';
import { Skeleton } from '@/components/ui/skeleton';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 border border-border/80 rounded-xl px-3.5 py-2.5 shadow-xl backdrop-blur-sm text-xs">
      <div className="font-semibold text-foreground/70 mb-1.5">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold text-foreground">S/ {Number(p.value).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
        </div>
      ))}
    </div>
  );
}

function CommissionsSkeleton() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
        <Skeleton className="h-4 w-48 mb-4" />
        <Skeleton className="h-[220px] w-full rounded-lg" />
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-lg flex-shrink-0" />
        ))}
      </div>

      {/* Table – 5 columns matching real layout */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Fecha', 'Tipo', 'Descripción', 'Estado', 'Monto'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="py-3 px-4 hidden sm:table-cell"><Skeleton className="h-4 w-36" /></td>
                  <td className="py-3 px-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                  <td className="py-3 px-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function CommissionsPage() {
  const { user } = useAuthStore();
  const { commissions, loading, stats, chartData, exportCSV } = useCommissions({ userId: user?.id, autoLoad: true });
  const { page, setPage, filter, setFilter, paginatedData, totalPages, total } = useCommissionsPagination(commissions, 10);

  const handleExport = () => {
    exportCSV();
    toast.success('Exportado a CSV');
  };

  if (loading) return <CommissionsSkeleton />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comisiones</h1>
          <p className="text-muted-foreground text-sm mt-1">Historial completo de tus comisiones.</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors">
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total', value: `S/ ${stats.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-primary bg-primary/10' },
          { label: 'Pagado', value: `S/ ${stats.paid.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, icon: CheckCircle, color: 'text-green-500 bg-green-500/10' },
          { label: 'Pendiente', value: `S/ ${stats.pending.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, icon: Clock, color: 'text-yellow-500 bg-yellow-500/10' },
          { label: 'Registros', value: String(stats.count), icon: DollarSign, color: 'text-purple-500 bg-purple-500/10' },
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

      {/* Chart — 12 semanas */}
      <div className="bg-card border border-border rounded-xl p-5 sm:p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-foreground">Comisiones — 12 semanas</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Evolución semanal de tus ingresos por comisiones</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground tabular-nums">
                S/ {chartData.length > 0
                  ? chartData.reduce((s: number, d: any) => s + (d.comisiones || 0), 0).toLocaleString('es-PE', { minimumFractionDigits: 0 })
                  : '0'}
              </div>
              <div className="text-xs text-muted-foreground">Total acumulado</div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                {(() => {
                  const arr = chartData.map((d: any) => d.comisiones || 0);
                  if (arr.length < 2) return <span className="text-sm font-semibold text-muted-foreground">—</span>;
                  const last = arr[arr.length - 1];
                  const prev = arr[arr.length - 2];
                  const diff = last - prev;
                  const pct = prev > 0 ? Math.round((diff / prev) * 100) : 0;
                  const up = diff >= 0;
                  return (
                    <>
                      <span className={cn('text-sm font-bold flex items-center gap-0.5', up ? 'text-emerald-500' : 'text-rose-500')}>
                        {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {up ? '+' : ''}{pct}%
                      </span>
                    </>
                  );
                })()}
              </div>
              <div className="text-xs text-muted-foreground">vs. semana anterior</div>
            </div>
          </div>
        </div>

        {/* Dual chart: area trend + bar weekly */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
          {/* Area chart */}
          <div className="relative">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradComm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="60%" stopColor="#3b82f6" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.25} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="comisiones" name="Comisiones" stroke="url(#gradLine)" strokeWidth={2.5} fill="url(#gradComm)" dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#3b82f6', stroke: 'hsl(var(--background))', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bar chart — weekly breakdown */}
          <div className="relative">
            <div className="text-xs font-semibold text-muted-foreground mb-2 px-1">Desglose semanal</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.25} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
                <Bar dataKey="comisiones" name="Comisiones" fill="url(#gradBar)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mini stats row */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-border/50">
          {(() => {
            const arr = chartData.map((d: any) => d.comisiones || 0);
            const max = arr.length > 0 ? Math.max(...arr) : 0;
            const avg = arr.length > 0 ? arr.reduce((a: number, b: number) => a + b, 0) / arr.length : 0;
            const last = arr.length > 0 ? arr[arr.length - 1] : 0;
            return [
              { label: 'Mejor semana', value: `S/ ${max.toLocaleString('es-PE', { minimumFractionDigits: 0 })}`, accent: 'text-emerald-500' },
              { label: 'Promedio semanal', value: `S/ ${avg.toLocaleString('es-PE', { minimumFractionDigits: 0 })}`, accent: 'text-primary' },
              { label: 'Última semana', value: `S/ ${last.toLocaleString('es-PE', { minimumFractionDigits: 0 })}`, accent: 'text-foreground' },
            ];
          })().map(s => (
            <div key={s.label} className="text-center sm:text-left">
              <div className={cn('text-sm sm:text-base font-bold tabular-nums', s.accent)}>{s.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {['all', 'pending', 'approved', 'paid', 'rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
              filter === f ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground')}>
            {f === 'all' ? 'Todos' : STATUS_CONFIG[f as keyof typeof STATUS_CONFIG]?.label || f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Fecha</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Tipo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Descripcion</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Monto</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-muted-foreground text-sm">No hay comisiones registradas</td></tr>
              ) : paginatedData.map(c => {
                const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
                const Icon = c.status === 'pending' ? Clock : c.status === 'paid' || c.status === 'approved' ? CheckCircle : XCircle;
                return (
                  <tr key={c.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString('es-PE')}</td>
                    <td className="py-3 px-4 text-sm font-medium text-foreground">{TYPE_LABELS[c.type] || c.type}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground hidden sm:table-cell max-w-[200px] truncate">{c.description || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={cn('text-xs font-medium px-2 py-1 rounded-full inline-flex items-center gap-1', sc.color)}>
                        <Icon className="w-3 h-3" /> {sc.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-bold text-foreground">S/ {Number(c.amount).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <div className="text-xs text-muted-foreground">Mostrando {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} de {total}</div>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-xs border border-border hover:bg-muted disabled:opacity-40">Anterior</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg text-xs border border-border hover:bg-muted disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
