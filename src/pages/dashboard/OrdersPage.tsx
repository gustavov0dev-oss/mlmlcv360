import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '@/lib/backend';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from '@/lib/router';
import { cn } from '@/lib/utils';
import type { Order } from '@/lib/storeTypes';
import { Package, ChevronRight, ShoppingBag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pendiente',     color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
  confirmed:  { label: 'Confirmado',    color: 'text-blue-600',   bg: 'bg-blue-500/10'   },
  processing: { label: 'En proceso',    color: 'text-purple-600', bg: 'bg-purple-500/10' },
  shipped:    { label: 'Enviado',       color: 'text-cyan-600',   bg: 'bg-cyan-500/10'   },
  delivered:  { label: 'Entregado',     color: 'text-green-600',  bg: 'bg-green-500/10'  },
  cancelled:  { label: 'Cancelado',     color: 'text-red-600',    bg: 'bg-red-500/10'    },
  refunded:   { label: 'Reembolsado',   color: 'text-orange-600', bg: 'bg-orange-500/10' },
};

export default function OrdersPage() {
  const database = useDatabase();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await database.select<Order>('orders', {
      select: '*, items:order_items(*)',
      filter: { user_id: user.id },
      order: { column: 'created_at', ascending: false },
    });
    setOrders((data as Order[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="space-y-5">
      <div className="space-y-1.5"><Skeleton className="h-8 w-36" /><Skeleton className="h-4 w-28" /></div>
      <div className="space-y-3">
        {Array.from({length:5}).map((_,i)=>(
          <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <Skeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-5 w-16 rounded-full" /></div>
              <Skeleton className="h-3 w-40" /><Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="w-4 h-4 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mis Pedidos</h1>
        <p className="text-muted-foreground text-sm mt-1">{orders.length} pedido{orders.length !== 1 ? 's' : ''} en total</p>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-card border border-border rounded-xl">
          <ShoppingBag className="w-12 h-12 text-muted-foreground/30" />
          <div className="text-center">
            <p className="font-semibold text-foreground">No tienes pedidos aún</p>
            <p className="text-sm text-muted-foreground mt-1">Explora la tienda y realiza tu primera compra</p>
          </div>
          <button onClick={() => navigate('/tienda')}
            className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors">
            Ir a la tienda
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const img = order.items?.[0]?.image_url;
            return (
              <button
                key={order.id}
                onClick={() => navigate(`/dashboard/pedidos/${order.id}`)}
                className="w-full bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/40 hover:shadow-md transition-all text-left"
              >
                <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                  {img ? <img src={img} alt="" className="w-full h-full object-cover" /> :
                    <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-muted-foreground" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground">{order.order_number}</span>
                    <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full', sc.color, sc.bg)}>{sc.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(order.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {' · '}{order.items?.length || 0} producto{(order.items?.length || 0) !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm font-bold text-foreground mt-0.5">S/ {order.total.toFixed(2)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
