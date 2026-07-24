import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '@/lib/backend';

import { useNavigate } from '@/lib/router';
import { cn } from '@/lib/utils';
import type { Order, OrderTracking } from '@/lib/storeTypes';
import { ChevronLeft, Package, Truck, CircleCheck as CheckCircle, Clock, Circle as XCircle, Printer, MapPin, Phone, ExternalLink, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function fmt(n: number) { return `S/ ${n.toFixed(2)}`; }

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.FC<any> }> = {
  pending:    { label: 'Pendiente',   color: 'text-yellow-600', bg: 'bg-yellow-500/10', icon: Clock    },
  confirmed:  { label: 'Confirmado',  color: 'text-primary',    bg: 'bg-primary/10',    icon: CheckCircle },
  processing: { label: 'En proceso',  color: 'text-purple-600', bg: 'bg-purple-500/10', icon: Package  },
  shipped:    { label: 'Enviado',     color: 'text-cyan-600',   bg: 'bg-cyan-500/10',   icon: Truck    },
  delivered:  { label: 'Entregado',   color: 'text-green-600',  bg: 'bg-green-500/10',  icon: CheckCircle },
  cancelled:  { label: 'Cancelado',   color: 'text-red-600',    bg: 'bg-red-500/10',    icon: XCircle  },
  refunded:   { label: 'Reembolsado', color: 'text-orange-600', bg: 'bg-orange-500/10', icon: RefreshCw },
};

const ORDER_STEPS = ['pending','confirmed','processing','shipped','delivered'];

// ── Invoice component (printable)
function Invoice({ order, company }: { order: Order; company: any }) {
  const base = order.total / 1.18;
  const igv  = order.total - base;
  const addr = order.shipping_address as any;
  const isFactura = addr?.invoice_type === 'factura';
  const series = company.invoice_series || 'B001';
  const docNum = order.order_number.replace('ORD-', '');

  return (
    <div id="invoice" className="bg-white text-black p-8 max-w-2xl mx-auto text-sm font-sans hidden print:block">
      <div className="border border-black">
        <div className="flex border-b border-black">
          <div className="flex-1 p-4 border-r border-black">
            <p className="font-bold text-base">{company.company_name || 'MLM360'}</p>
            <p className="text-xs">RUC: {company.company_ruc || '20000000001'}</p>
            <p className="text-xs">{company.company_address || ''}</p>
          </div>
          <div className="w-48 p-4 text-center">
            <p className="font-bold text-sm border-b border-black pb-1 mb-2">
              {isFactura ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA'}
            </p>
            <p className="font-bold">{series}-{docNum}</p>
          </div>
        </div>
        <div className="p-4 border-b border-black space-y-1 text-xs">
          <p><strong>Cliente:</strong> {addr?.full_name || order.user_id}</p>
          <p><strong>Dirección:</strong> {addr?.address}, {addr?.district}, {addr?.city}</p>
          {isFactura && <><p><strong>RUC:</strong> {addr?.ruc}</p><p><strong>Razón Social:</strong> {addr?.razon_social}</p></>}
          <p><strong>Fecha:</strong> {new Date(order.created_at).toLocaleDateString('es-PE')}</p>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-black bg-gray-100">
              <th className="p-2 text-left">Descripción</th>
              <th className="p-2 text-center w-12">Cant.</th>
              <th className="p-2 text-right w-20">P. Unit.</th>
              <th className="p-2 text-right w-20">Total</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map(i => (
              <tr key={i.id} className="border-b border-gray-200">
                <td className="p-2">{i.product_name}{i.variant_name ? ` (${i.variant_name})` : ''}</td>
                <td className="p-2 text-center">{i.quantity}</td>
                <td className="p-2 text-right">{fmt(i.unit_price / 1.18)}</td>
                <td className="p-2 text-right">{fmt((i.unit_price / 1.18) * i.quantity)}</td>
              </tr>
            ))}
            {order.shipping_amount > 0 && (
              <tr className="border-b border-gray-200">
                <td className="p-2">Servicio de envío — {order.shipping_method_name}</td>
                <td className="p-2 text-center">1</td>
                <td className="p-2 text-right">{fmt(order.shipping_amount / 1.18)}</td>
                <td className="p-2 text-right">{fmt(order.shipping_amount / 1.18)}</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex justify-end">
          <div className="w-56 border-t border-black text-xs">
            <div className="flex justify-between p-1.5 border-b border-gray-200"><span>Op. Gravada:</span><span>{fmt(base)}</span></div>
            <div className="flex justify-between p-1.5 border-b border-gray-200"><span>IGV (18%):</span><span>{fmt(igv)}</span></div>
            {order.discount_amount > 0 && <div className="flex justify-between p-1.5 border-b border-gray-200 text-red-600"><span>Descuento:</span><span>-{fmt(order.discount_amount)}</span></div>}
            <div className="flex justify-between p-2 font-bold text-sm"><span>TOTAL:</span><span>{fmt(order.total)}</span></div>
          </div>
        </div>
        <div className="p-3 text-center text-[10px] text-gray-500 border-t border-black">
          Representación impresa de comprobante electrónico — Autorizado por SUNAT
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const database = useDatabase();
  const orderId = window.location.pathname.split('/').pop() || '';
  // const { user } = useAuthStore();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [tracking, setTracking] = useState<OrderTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    const [{ data: o }, { data: t }, { data: cfg }] = await Promise.all([
      database.select<Order>('orders', { select: '*, items:order_items(*)', filter: { id: orderId }, maybeSingle: true }),
      database.select<OrderTracking>('order_tracking', { filter: { order_id: orderId }, order: { column: 'created_at' } }),
      database.select<{ key: string; value: string }>('system_config', { select: 'key,value' }),
    ]);
    if (o) setOrder({ ...(o as Order), tracking: (t as OrderTracking[]) || [] });
    setTracking((t as OrderTracking[]) || []);
    if (cfg) {
      const c: Record<string, string> = {};
      (cfg as any[]).forEach(r => { c[r.key] = r.value; });
      setCompany(c);
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  // Realtime tracking
  useEffect(() => {
    if (!orderId) return;
    const unsubscribe = database.subscribe('order_tracking',
      payload => setTracking(prev => [...prev, (payload as any).new as OrderTracking]),
      { event: 'INSERT', filter: `order_id=eq.${orderId}` });
    return () => { unsubscribe(); };
  }, [orderId]);

  if (loading) return (
    <div className="space-y-5">
      <div className="flex items-center gap-3"><Skeleton className="w-5 h-5 rounded" /><div className="space-y-1"><Skeleton className="h-6 w-36" /><Skeleton className="h-3 w-40" /></div></div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 space-y-3">
          <Skeleton className="h-4 w-24 mb-2" />
          {Array.from({length:3}).map((_,i)=>(<div key={i} className="flex items-center gap-3"><Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" /><div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-16" /></div><Skeleton className="h-4 w-16" /></div>))}
        </div>
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-2">{Array.from({length:5}).map((_,i)=>(<div key={i} className="flex justify-between"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-16" /></div>))}</div>
          <div className="bg-card border border-border rounded-xl p-5 space-y-2">{Array.from({length:4}).map((_,i)=>(<Skeleton key={i} className="h-4 w-full" />))}</div>
        </div>
      </div>
    </div>
  );
  if (!order) return (
    <div className="text-center py-16 text-muted-foreground">
      <p>Pedido no encontrado</p>
      <button onClick={() => navigate('/dashboard/pedidos')} className="text-primary font-semibold mt-2 hover:underline">Ver mis pedidos</button>
    </div>
  );

  const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const currentStep = ORDER_STEPS.indexOf(order.status);
  const addr = order.shipping_address as any;
  const igv = order.total - order.total / 1.18;

  return (
    <div className="space-y-5 pb-10">
      <Invoice order={order} company={company} />

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/dashboard/pedidos')} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{order.order_number}</h1>
          <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <span className={cn('ml-auto text-xs font-bold px-3 py-1.5 rounded-full', sc.color, sc.bg)}>{sc.label}</span>
      </div>

      {/* Progress stepper */}
      {order.status !== 'cancelled' && order.status !== 'refunded' && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-foreground mb-4">Estado del pedido</h2>
          <div className="flex items-center">
            {ORDER_STEPS.map((s, i) => {
              const sc2 = STATUS_CONFIG[s];
              const done = i <= currentStep;
              const active = i === currentStep;
              return (
                <div key={s} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center transition-all',
                      done ? (active ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-primary/70') : 'bg-muted border-2 border-border')}>
                      <sc2.icon className={cn('w-4 h-4', done ? 'text-white' : 'text-muted-foreground')} />
                    </div>
                    <span className={cn('text-[10px] font-semibold text-center', done ? 'text-primary' : 'text-muted-foreground')}>{sc2.label}</span>
                  </div>
                  {i < ORDER_STEPS.length - 1 && (
                    <div className={cn('flex-1 h-0.5 mx-1 -mt-4', i < currentStep ? 'bg-primary/70' : 'bg-border')} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tracking timeline */}
      {tracking.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-foreground mb-4">Historial de seguimiento</h2>
          <div className="space-y-3">
            {[...tracking].reverse().map((t, i) => (
              <div key={t.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn('w-3 h-3 rounded-full flex-shrink-0 mt-0.5', i === 0 ? 'bg-primary' : 'bg-muted-foreground/40')} />
                  {i < tracking.length - 1 && <div className="w-px flex-1 bg-border mt-1 mb-1" />}
                </div>
                <div className="pb-3">
                  <p className="text-sm font-semibold text-foreground">{t.description || t.status}</p>
                  {t.location && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{t.location}</p>}
                  <p className="text-[11px] text-muted-foreground mt-0.5">{new Date(t.created_at).toLocaleString('es-PE')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tracking number */}
      {order.tracking_number && (
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <Truck className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Número de rastreo</p>
            <p className="text-sm font-bold text-foreground">{order.tracking_number}</p>
          </div>
          {order.tracking_url && (
            <a href={order.tracking_url} target="_blank" rel="noreferrer" className="p-2 hover:bg-muted rounded-lg transition-colors">
              <ExternalLink className="w-4 h-4 text-primary" />
            </a>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Items */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-foreground mb-4">Productos</h2>
          <div className="space-y-3">
            {(order.items || []).map(i => (
              <div key={i.id} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                  {i.image_url && <img src={i.image_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{i.product_name}</p>
                  {i.variant_name && <p className="text-xs text-muted-foreground">{i.variant_name}</p>}
                  <p className="text-xs text-muted-foreground">× {i.quantity}</p>
                </div>
                <p className="text-sm font-bold text-foreground">{fmt(i.total)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          {/* Totals */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-2 text-sm">
            <h2 className="font-bold text-foreground mb-3">Resumen</h2>
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{fmt(order.subtotal)}</span></div>
            {order.discount_amount > 0 && <div className="flex justify-between text-green-600"><span>Descuento</span><span>-{fmt(order.discount_amount)}</span></div>}
            <div className="flex justify-between text-muted-foreground"><span>Envío</span><span>{order.shipping_amount === 0 ? 'Gratis' : fmt(order.shipping_amount)}</span></div>
            <div className="flex justify-between text-muted-foreground text-xs"><span>IGV (18%)</span><span>{fmt(igv)}</span></div>
            <div className="flex justify-between font-bold text-foreground border-t border-border pt-2"><span>Total</span><span>{fmt(order.total)}</span></div>
          </div>

          {/* Address */}
          <div className="bg-card border border-border rounded-xl p-5 text-sm space-y-1">
            <h2 className="font-bold text-foreground mb-2 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" /> Entrega</h2>
            <p className="font-semibold text-foreground">{addr?.full_name}</p>
            <p className="text-muted-foreground">{addr?.address}</p>
            <p className="text-muted-foreground">{addr?.district}, {addr?.city}</p>
            <p className="text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{addr?.phone}</p>
          </div>

          {/* Print invoice */}
          <button onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-2 border border-border rounded-xl py-3 text-sm font-semibold hover:bg-muted transition-colors">
            <Printer className="w-4 h-4 text-primary" /> Imprimir {addr?.invoice_type === 'factura' ? 'factura' : 'boleta'}
          </button>
        </div>
      </div>
    </div>
  );
}
