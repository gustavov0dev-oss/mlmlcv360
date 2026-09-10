import { LoadingRegion, StableRegion } from '@/components/ui/loading-region';
import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '@/lib/backend';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Order, Product } from '@/lib/storeTypes';
import { OrderProductImage } from '@/components/store/OrderProductImage';
import { Search, RefreshCw, ChevronRight } from 'lucide-react';
import { useNavigate } from '@/lib/router';



const STATUS_CONFIG: Record<string, { label: string; cl: string }> = {
  pending:    { label: 'Pendiente',   cl: 'text-amber-600 bg-amber-500/10' },
  confirmed:  { label: 'Revisión',  cl: 'text-primary bg-primary/10'     },
  processing: { label: 'Procesando envío',  cl: 'text-primary bg-primary/10' },
  shipped:    { label: 'Procesando envío',     cl: 'text-cyan-600 bg-cyan-500/10'     },
  delivered:  { label: 'Entregado',   cl: 'text-emerald-600 bg-emerald-500/10'   },
  cancelled:  { label: 'Cancelado',   cl: 'text-red-600 bg-destructive/10'       },
  refunded:   { label: 'Reembolsado', cl: 'text-amber-600 bg-amber-500/10' },
};

const ALL_STATUSES = ['pending', 'confirmed', 'processing', 'delivered'];

export default function OrdersAdminPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const database = useDatabase();

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await database.select<Order>('orders', {
      select: '*, items:order_items(*)',
      order: { column: 'created_at', ascending: false },
      ...(statusFilter ? { filter: { status: statusFilter } } : {}),
    });
    if (error) { toast.error(error); setLoading(false); return; }
    let list = (data as Order[]) || [];
    const ids = [...new Set(list.flatMap(o => (o.items || []).map(i => i.product_id).filter(Boolean)))];
    if (ids.length) {
      const { data: products } = await database.select<Product>('products', { select: 'id,name,images', filter: { id: ids } });
      const catalog = new Map(((products as Product[]) || []).map(p => [p.id, p]));
      list = list.map(o => ({ ...o, items: (o.items || []).map(i => {
        const product = i.product_id ? catalog.get(i.product_id) : undefined;
        return { ...i, product_name: i.product_name || product?.name || "Producto no disponible", image_url: product?.images?.[0]?.url || i.image_url };
      }) }));
    }
    if (search) list = list.filter(o =>
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.shipping_address as any)?.full_name?.toLowerCase().includes(search.toLowerCase())
    );
    setOrders(list);
    setLoading(false);
  }, [statusFilter, search, database]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (orderId: string, status: string) => {
    setUpdating(orderId);
    const extra: Record<string, any> = {};
    if (status === 'shipped') extra.shipped_at = new Date().toISOString();
    if (status === 'delivered') extra.delivered_at = new Date().toISOString();
    if (status === 'cancelled') extra.cancelled_at = new Date().toISOString();

    const { error } = await database.update('orders', orderId, { status, ...extra, updated_at: new Date().toISOString() });
    if (error) { toast.error(error); setUpdating(null); return; }

    const trackDesc: Record<string, string> = {
      confirmed:  'Pedido en revisión',
      processing: 'Pedido procesando envío',
      shipped:    'Pedido enviado — en camino',
      delivered:  'Pedido entregado exitosamente',
      cancelled:  'Pedido cancelado',
    };
    if (trackDesc[status]) {
      await database.insert('order_tracking', { order_id: orderId, status, description: trackDesc[status] });
    }
    // Payment status for delivered
    if (status === 'delivered') {
      await database.update('orders', orderId, { payment_status: 'paid' });
      // Approve commissions
      await database.update('commissions', { reference_id: orderId, status: 'pending' }, { status: 'approved' });
    }

    toast.success(`Estado actualizado a: ${STATUS_CONFIG[status]?.label}`);
    setUpdating(null);
    load();
  };


  return (
    <StableRegion className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de Pedidos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{orders.length} pedidos</p>
        </div>
        <button onClick={load} className={["p-2 border border-border rounded-xl hover:bg-muted transition-colors self-start", 'dashboard-action'].filter(Boolean).join(' ')}>
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

      {loading ? <LoadingRegion className="min-h-[24rem]" /> : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
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
                          className="font-bold text-primary hover:underline whitespace-nowrap">{o.order_number}</button>
                        <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString('es-PE')}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{addr?.full_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{addr?.city}, {addr?.region}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-3 min-w-[220px]">
                          {(o.items || []).map(i => (
                            <div key={i.id} className="flex items-center gap-2.5">
                              <OrderProductImage src={i.image_url} name={i.product_name} />
                              <div className="min-w-0">
                                <p className="font-medium text-foreground leading-snug">{i.product_name || 'Producto no disponible'}</p>
                                {i.variant_name && <p className="text-xs text-muted-foreground">{i.variant_name}</p>}
                                <p className="text-xs text-muted-foreground">Cantidad: {i.quantity} · {new Intl.NumberFormat('es-PE', { style: 'currency', currency: o.currency || 'PEN' }).format(i.unit_price)} c/u</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground whitespace-nowrap">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: o.currency || 'PEN' }).format(o.total)}</td>
                      <td className="px-4 py-3">
                        <select
                          value={o.status === 'shipped' ? 'processing' : o.status}
                          disabled={updating === o.id}
                          onChange={e => updateStatus(o.id, e.target.value)}
                          className={cn('text-xs font-bold px-2.5 py-1.5 rounded-xl border-0 outline-none cursor-pointer', sc.cl)}
                        >
                          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full',
                          o.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' :
                          o.payment_status === 'failed' ? 'bg-destructive/10 text-red-600' : 'bg-muted text-muted-foreground')}>
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
    </StableRegion>
  );
}
