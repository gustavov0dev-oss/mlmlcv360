import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { DollarSign, Clock, CheckCircle, XCircle, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending:  { label: 'Pendiente',  color: 'text-yellow-600 bg-yellow-500/10', icon: Clock },
  approved: { label: 'Aprobado',   color: 'text-blue-600 bg-blue-500/10',     icon: CheckCircle },
  paid:     { label: 'Pagado',     color: 'text-green-600 bg-green-500/10',   icon: CheckCircle },
  rejected: { label: 'Rechazado',  color: 'text-red-500 bg-red-500/10',       icon: XCircle },
};

const typeLabels: Record<string, string> = {
  direct: 'Directa', binary: 'Binaria', rank_bonus: 'Bono de rango',
  unilevel: 'Unilevel', residual: 'Residual',
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <div className="font-semibold text-foreground mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-primary" />
        <span className="text-muted-foreground">Comisiones:</span>
        <span className="font-semibold text-foreground">S/ {Number(payload[0].value).toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function CommissionsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    async function fetchCommissions() {
      if (!user) return;
      setLoading(true);
      const { data } = await supabase
        .from('commissions')
        .select('id, amount, type, status, description, created_at, from_user_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) {
        setCommissions(data);
        // Build chart from last 6 months
        const now = new Date();
        const months: any[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthName = d.toLocaleDateString('es-PE', { month: 'short' });
          const total = data.filter(c => {
            const cd = new Date(c.created_at);
            return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
          }).reduce((s, c) => s + Number(c.amount), 0);
          months.push({ name: monthName.charAt(0).toUpperCase() + monthName.slice(1), comisiones: total });
        }
        setChartData(months);
      }
      setLoading(false);
    }
    fetchCommissions();
  }, [user]);

  const filtered = filter === 'all' ? commissions : commissions.filter(c => c.status === filter);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const total = commissions.reduce((s, c) => s + Number(c.amount), 0);
  const pending = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + Number(c.amount), 0);
  const paid = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.amount), 0);
  const count = commissions.length;

  const handleExport = () => {
    const csv = ['Fecha,Tipo,Estado,Monto,Descripcion'];
    filtered.forEach(c => {
      csv.push([c.created_at, typeLabels[c.type] || c.type, c.status, c.amount, c.description || ''].join(','));
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'comisiones.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exportado a CSV');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

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
          { label: 'Total', value: `S/ ${total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-blue-500 bg-blue-500/10' },
          { label: 'Pagado', value: `S/ ${paid.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, icon: CheckCircle, color: 'text-green-500 bg-green-500/10' },
          { label: 'Pendiente', value: `S/ ${pending.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, icon: Clock, color: 'text-yellow-500 bg-yellow-500/10' },
          { label: 'Registros', value: String(count), icon: DollarSign, color: 'text-purple-500 bg-purple-500/10' },
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

      {/* Chart */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Evolución de comisiones</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="comisiones" name="Comisiones" stroke="#1d4ed8" strokeWidth={2} fill="url(#colorComm)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {['all', 'pending', 'approved', 'paid', 'rejected'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
              filter === f ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground')}>
            {f === 'all' ? 'Todos' : statusConfig[f]?.label || f}
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
              {paginated.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-muted-foreground text-sm">No hay comisiones registradas</td></tr>
              ) : paginated.map(c => {
                const sc = statusConfig[c.status] || statusConfig.pending;
                return (
                  <tr key={c.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString('es-PE')}</td>
                    <td className="py-3 px-4 text-sm font-medium text-foreground">{typeLabels[c.type] || c.type}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground hidden sm:table-cell max-w-[200px] truncate">{c.description || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={cn('text-xs font-medium px-2 py-1 rounded-full inline-flex items-center gap-1', sc.color)}>
                        <sc.icon className="w-3 h-3" /> {sc.label}
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
            <div className="text-xs text-muted-foreground">Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}</div>
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
