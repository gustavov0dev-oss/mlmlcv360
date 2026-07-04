import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Order } from '@/lib/storeTypes';
import { Search, Loader as Loader2, RefreshCw, ChevronRight } from 'lucide-react';
import { useNavigate } from '@/lib/router';

function fmt(n: number) { return `S/ ${n.toFixed(2)}`; }

const STATUS_CONFIG: Record<string, { label: string; cl: string }> = {
  pending:    { label: 'Pendiente',   cl: 'text-yellow-600 bg-yellow-500/10' },
  confirmed:  { label: 'Confirmado',  cl: 'text-blue-600 bg-blue-500/10'     },
  processing: { label: 'En proceso',  cl: 'text-purple-600 bg-purple-500/10' },
  shipped:    { label: 'Enviado',     cl: 'text-cyan-600 bg-cyan-500/10'     },
  delivered:  { label: 'Entregado',   cl: 'text-green-600 bg-green-500/10'   },
  cancelled:  { label: 'Cancelado',   cl: 'text-red-600 bg-red-500/10'       },
  refunded:   { label: 'Reembolsado', cl: 'text-orange-600 bg-orange-500/10' },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

export default function OrdersAdminPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('orders')
      .select('*, items:order_items(id,product_name,image_url,quantity)')
      .order('created_at', { ascending: false });
    if (statusFilter) q = q.eq('status', statusFilter);
    const { data } = await q;
    let list = (data as Order[]) || [];
    if (search) list = list.filter(o =>
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.shipping_address as any)?.full_name?.toLowerCase().includes(search.toLowerCase())
    );
    setOrders(list);
    setLoading(false);
  }, [statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (orderId: string, status: string) => {
    setUpdating(orderId);
    const extra: Record<string, any> = {};
    if (status === 'shipped') extra.shipped_at = new Date().toISOString();
    if (status === 'delivered') extra.delivered_at = new Date().toISOString();
    if (status === 'cancelled') extra.cancelled_at = new Date().toISOString();

    const { error } = await supabase.from('orders').update({ status, ...extra, updated_at: new Date().toISOString() }).eq('id', orderId);
    if (error) { toast.error(error.message); setUpdating(null); return; }

    const trackDesc: Record<string, string> = {
      confirmed:  'Pedido confirmado — en preparación',
      processing: 'Pedido en proceso de empaque',
      shipped:    'Pedido enviado — en camino',
      delivered:  'Pedido entregado exitosamente',
      cancelled:  'Pedido cancelado',
    };
    if (trackDesc[status]) {
      await supabase.from('order_tracking').insert({ order_id: orderId, status, description: trackDesc[status] });
    }
    // Payment status for delivered
    if (status === 'delivered') {
      await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', orderId);
      // Approve commissions
      await supabase.from('commissions').update({ status: 'approved' }).eq('reference_id', orderId).eq('status', 'pending');
    }

    toast.success(`Estado actualizado a: ${STATUS_CONFIG[status]?.label}`);
    setUpdating(null);
    load();
  };


  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Gestión de Pedidos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{orders.length} pedidos</p>
        </div>
        <button onClick={load} className="p-2 border border-border rounded-xl hover:bg-muted transition-colors self-start">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por número o cliente..."
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary">
          <option value="">Todos los estados</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Pedido', 'Cliente', 'Productos', 'Total', 'Estado', 'Pago', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const sc = STATUS_CONFIG[o.status] || STATUS_CONFIG.pending;
                  const addr = o.shipping_address as any;
                  return (
                    <tr key={o.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <button onClick={() => navigate(`/dashboard/admin/pedidos/${o.id}`)}
                          className="font-black text-primary hover:underline">{o.order_number}</button>
                        <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString('es-PE')}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{addr?.full_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{addr?.city}, {addr?.region}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex -space-x-2">
                          {(o.items || []).slice(0, 3).map((i: any) => (
                            <div key={i.id} className="w-7 h-7 rounded-lg bg-muted border border-background overflow-hidden flex-shrink-0">
                              {i.image_url && <img src={i.image_url} alt="" className="w-full h-full object-cover" />}
                            </div>
                          ))}
                          {(o.items || []).length > 3 && <span className="text-xs text-muted-foreground pl-2">+{(o.items || []).length - 3}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-black text-foreground">{fmt(o.total)}</td>
                      <td className="px-4 py-3">
                        <select
                          value={o.status}
                          disabled={updating === o.id}
                          onChange={e => updateStatus(o.id, e.target.value)}
                          className={cn('text-xs font-bold px-2.5 py-1.5 rounded-xl border-0 outline-none cursor-pointer', sc.cl)}
                        >
                          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full',
                          o.payment_status === 'paid' ? 'bg-green-500/10 text-green-600' :
                          o.payment_status === 'failed' ? 'bg-red-500/10 text-red-600' : 'bg-muted text-muted-foreground')}>
                          {o.payment_status === 'paid' ? 'Pagado' : o.payment_status === 'failed' ? 'Fallido' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => navigate(`/dashboard/admin/pedidos/${o.id}`)}
                          className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-primary transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No hay pedidos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
