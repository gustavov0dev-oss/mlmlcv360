import { checkoutSnapshots } from '@/lib/checkoutCart';
import { useAuthStore } from '@/store/authStore';
import ProductCard from '@/components/store/ProductCard';
import { useCartCoupon } from '@/hooks/useCartCoupon';
import React from 'react';
import { useState, useEffect } from 'react';
import { useDatabase } from '@/lib/backend';
import { useCart } from '@/store/cartStore';
import { useConfig } from '@/store/configStore';
import { useNavigate } from '@/lib/router';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Coupon, Product } from '@/lib/storeTypes';
import { ShoppingCart, Trash2, Plus, Minus, Tag, X, ArrowRight, ChevronLeft, Truck, CircleCheck as CheckCircle, Package, ShoppingBag, Check } from 'lucide-react';

// Mismo ancho máximo que usa StorePage, para que ambas vistas queden
// perfectamente alineadas.
const PAGE_MAX_W = 'max-w-[1100px]';



// Mismo estilo del indicador de envío gratis de la tienda, integrado sin
// tarjeta propia.
function FreeShippingIndicator({ subtotal, threshold, currencySymbol, className }: {
  subtotal: number;
  threshold: number;
  currencySymbol: string;
  className?: string;
}) {
  if (subtotal <= 0) return null;

  const reached = subtotal >= threshold;
  const remaining = threshold - subtotal;
  const progress = Math.min((subtotal / threshold) * 100, 100);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-full shrink-0 transition-colors duration-300',
          reached ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground/70'
        )}
      >
        {reached ? <Check className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <span
            className={cn(
              'text-xs sm:text-[13px] leading-tight whitespace-nowrap font-medium',
              reached ? 'text-primary' : 'text-foreground/80'
            )}
          >
            {reached ? (
              '¡Envío gratis desbloqueado!'
            ) : (
              <>
                Te falta{' '}
                <strong className="font-bold text-foreground">
                  {currencySymbol} {remaining.toFixed(2)}
                </strong>{' '}
                para envío gratis
              </>
            )}
          </span>
          <span
            className={cn(
              'text-[11px] font-bold tabular-nums shrink-0',
              reached ? 'text-primary' : 'text-muted-foreground/70'
            )}
          >
            {Math.round(progress)}%
          </span>
        </div>
        <div className="relative h-1 w-full rounded-full bg-border/30 overflow-hidden">
          <div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out',
              reached ? 'bg-primary' : 'bg-gradient-to-r from-primary/60 to-primary'
            )}
            style={{ width: `${Math.max(progress, 4)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  useEffect(()=>{void import('./CheckoutPage').catch(()=>{});},[]);
  const database = useDatabase();
  const {user}=useAuthStore();
  const [pendingOrder,setPendingOrder]=useState<string|null>(null);
  const { items, removeItem, updateQty, subtotal, itemCount, refreshStock } = useCart();
  useEffect(()=>{
    let active=true;setPendingOrder(null);
    const snapshot=checkoutSnapshots().filter(s=>s.userId===user?.id&&s.items.length===items.length&&s.items.every(p=>items.some(i=>i.id===p.id&&i.quantity===p.quantity))).at(-1);
    if(snapshot)database.select<any>('orders',{filter:{id:snapshot.orderId,user_id:user?.id},single:true}).then(({data})=>{if(active&&data?.payment_status==='pending'&&!['cancelled','refunded'].includes(data.status))setPendingOrder(snapshot.orderId);});
    return()=>{active=false;};
  },[user?.id,items,database]);
  const { company,showUsd,exchangeRate } = useConfig();
  const fmt=(n:number)=>new Intl.NumberFormat('es-PE',{style:'currency',currency:showUsd?'USD':'PEN'}).format(showUsd?n/exchangeRate:n);
  const navigate = useNavigate();
  useEffect(()=>{void refreshStock();},[refreshStock]);
  const [couponCode, setCouponCode] = useState('');
  const { coupon, setCoupon } = useCartCoupon(subtotal,items.some(i=>!!i.pack));
  const [couponError, setCouponError] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  useEffect(() => {
    let active=true;
    database.select<Product>('products', {select:'*, category:product_categories(*), variants:product_variants(*)',filter:{status:'active'},limit:8}).then(({data})=>{
      if(active)setRecommendations(((data as Product[])||[]).filter(p=>!p.track_stock || p.allow_backorder || (p.variants?.some(v=>v.status==='active' && v.stock>0)) || p.general_stock>0).slice(0,5));
    });
    return()=>{active=false;};
  },[database]);
  const freeThreshold = parseFloat(company.free_shipping_threshold || '150');

  useEffect(() => {
    database.select<Coupon>('coupons', { filter: { status: 'active' } }).then(({data:coupons}) => {
      const now = new Date();
      const valid = ((coupons || []) as Coupon[]).filter((c: Coupon) => {
        if (c.expires_at && new Date(c.expires_at) < now) return false;
        if (c.usage_limit && c.used_count >= c.usage_limit) return false;
        if (c.min_order_amount && subtotal < c.min_order_amount) return false;
        return true;
      });
      setAvailableCoupons(valid.slice(0, 5) as Coupon[]);
    });
  }, [items.length, subtotal]);

  const applyCoupon = async (codeOverride?: string | React.MouseEvent) => {
    if(items.some(i=>i.pack)){setCouponError('Los packs no admiten cupones adicionales.');return;}
    const code = (typeof codeOverride === 'string' ? codeOverride : null) || couponCode;
    if (!code.trim()) return;
    setCheckingCoupon(true);
    setCouponError('');
    const { data } = await database.select<Coupon>('coupons', {
      filter: [
        { column: 'code', operator: 'eq', value: code.trim().toUpperCase() },
        { column: 'status', operator: 'eq', value: 'active' },
      ],
      maybeSingle: true,
    });
    if (!data || ((data as Coupon).expires_at && new Date((data as Coupon).expires_at!).getTime() <= Date.now()) || ((data as Coupon).usage_limit && (data as Coupon).used_count >= (data as Coupon).usage_limit!)) {
      setCouponError('Cupón inválido o expirado');
      setCoupon(null);
    } else if ((data as Coupon).min_order_amount && subtotal < (data as Coupon).min_order_amount!) {
      setCouponError(`Monto mínimo para este cupón: ${fmt((data as Coupon).min_order_amount!)}`);
      setCoupon(null);
    } else {
      setCoupon(data as Coupon);
      setCouponCode((data as Coupon).code);
      toast.success('Cupón aplicado');
    }
    setCheckingCoupon(false);
  };

  const discount = coupon
    ? coupon.type === 'percentage'
      ? Math.min(subtotal * coupon.value / 100, coupon.max_discount ?? Infinity)
      : Math.min(subtotal, coupon.value)
    : 0;

  const shippingCost = 0;
  const total = subtotal - discount + shippingCost;
  const igv = total - total / 1.18;

  if (itemCount === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center gap-5 px-4 pt-28 sm:pt-32 pb-10">
          <div className="w-24 h-24 rounded-3xl bg-muted flex items-center justify-center">
            <ShoppingCart className="w-12 h-12 text-muted-foreground/30" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">Tu carrito está vacío</h2>
            <p className="text-muted-foreground text-sm mt-1">Explora nuestra tienda y agrega los productos que te gusten</p>
          </div>
          <button onClick={() => navigate('/tienda')}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-md shadow-primary/20">
            <ShoppingBag className="w-4 h-4" /> Explorar tienda
          </button>
        </div>
        {recommendations.length>0 && <section className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <h2 className="text-xl font-semibold mb-5">Descubre estos productos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">{recommendations.map(p=><ProductCard key={p.id} product={p}/>)}</div>
        </section>}
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="border-b border-border/20 bg-card sticky top-0 z-20">
        <div className={cn(PAGE_MAX_W, 'mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3')}>
          <button onClick={() => navigate('/tienda')} className="text-muted-foreground p-1 -ml-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Carrito de compras</h1>
          <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">{itemCount}</span>
          <button onClick={() => navigate('/tienda')} className="ml-auto text-sm text-primary font-semibold hidden sm:block">
            Seguir comprando
          </button>
        </div>
      </div>

      <div className={cn(PAGE_MAX_W, 'mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-16 grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16')}>
        {/* ── Items + Shipping ── */}
        <div className="lg:col-span-3 flex flex-col">
          {pendingOrder&&<div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm"><p className="text-muted-foreground">Tu carrito está guardado. Tienes un pago sin completar.</p><button className="text-primary font-semibold" onClick={()=>navigate(`/pago?order=${pendingOrder}`)}>Retomar pago</button></div>}
          {/* Free shipping */}
          {subtotal > 0 && (
            <FreeShippingIndicator subtotal={showUsd?subtotal/exchangeRate:subtotal} threshold={showUsd?freeThreshold/exchangeRate:freeThreshold} currencySymbol={showUsd?'US$':'S/'} className="mb-6" />
          )}

          {/* Items */}
          <div className="divide-y divide-border/20 border-t border-border/20">
            {items.map(item => {
              const img = item.variant?.images?.[0]?.url || item.product.images?.[0]?.url;
              return (
                <div key={item.id} className="flex items-center gap-3 sm:gap-4 py-4">
                  <button onClick={() => navigate(item.pack?'/packs':`/tienda/${item.product.slug}`)}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {img ? <img src={img} alt={item.product.name} className="w-full h-full object-cover" /> :
                      <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-muted-foreground/40" /></div>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <button onClick={() => navigate(item.pack?'/packs':`/tienda/${item.product.slug}`)} className="text-left">
                      <p className="text-sm font-bold text-foreground line-clamp-2">{item.product.name}</p>
                    </button>
                    {item.pack&&<div className="text-xs text-muted-foreground mt-1"><p className="text-primary">Pack MLM · {item.pack.points} puntos</p>{item.pack.lines.map((l:any,index:number)=><p key={index}>{l.name}{l.variant_name?` · ${l.variant_name}`:''} × {l.quantity}</p>)}</div>}
                    {item.variant && <p className="text-xs text-muted-foreground mt-0.5">{item.variant.name}</p>}
                    <p className="text-sm font-bold text-primary mt-1">{fmt(item.price)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <button onClick={() => removeItem(item.id)} className="text-muted-foreground/60 p-1 -mr-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1">
                      <button disabled={!!item.pack} onClick={() => updateQty(item.id, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center text-muted-foreground">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-foreground">{item.quantity}</span>
                      <button disabled={!!item.pack} onClick={() => updateQty(item.id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center text-muted-foreground">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs font-bold text-foreground">{fmt(item.price * item.quantity)}</p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* ── Order Summary ── */}
        <div className="lg:col-span-2 lg:pl-12 lg:border-l lg:border-border/20">
          <div className="lg:sticky lg:top-24 space-y-5">
            <h2 className="text-base font-bold text-foreground">Resumen del pedido</h2>

            {items.some(i=>i.pack)&&<p className="text-xs text-muted-foreground">Los packs no admiten cupones adicionales.</p>}
            {/* Smart coupons */}
            {!items.some(i=>i.pack) && availableCoupons.length > 0 && !coupon && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Cupones disponibles
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {availableCoupons.map(c => (
                    <button key={c.code}
                      onClick={() => { setCouponCode(c.code); applyCoupon(c.code); }}
                      className="flex items-center gap-1 px-2.5 py-1 border border-amber-500/20 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-400">
                      {c.code} <span className="opacity-70">{c.type === 'percentage' ? `-${c.value}%` : `-S/${c.value}`}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Coupon input */}
            {!items.some(i=>i.pack)&&<div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input value={couponCode}
                    onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                    placeholder="Código de cupón"
                    className="w-full pl-9 pr-3 py-2.5 bg-muted/30 border border-border/40 rounded-lg text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    onKeyDown={e => e.key === 'Enter' && applyCoupon()} />
                </div>
                <button onClick={() => applyCoupon()} disabled={checkingCoupon}
                  className="px-4 py-2.5 border border-border/40 rounded-lg text-sm font-semibold disabled:opacity-50">
                  {checkingCoupon ? '...' : 'Aplicar'}
                </button>
              </div>
              {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
              {coupon && (
                <div className="flex items-center gap-2 mt-2 text-green-600 text-xs font-semibold px-1 py-1">
                  <CheckCircle className="w-3.5 h-3.5" /> {coupon.code}: -{fmt(discount)}
                  <button onClick={() => { setCoupon(null); setCouponCode(''); }} className="ml-auto text-muted-foreground"><X className="w-3 h-3" /></button>
                </div>
              )}
            </div>}

            {/* Breakdown */}
            <div className="space-y-2 text-sm border-t border-border/20 pt-4">
              <div className="flex justify-between gap-4 text-muted-foreground">
                <span>Subtotal ({itemCount} art.)</span>
                <span className="shrink-0 tabular-nums">{fmt(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between gap-4 text-green-600 font-semibold">
                  <span>Descuento</span>
                  <span>-{fmt(discount)}</span>
                </div>
              )}
              <div className="grid grid-cols-2 items-start gap-4 text-muted-foreground">
                <span>Envío estimado</span>
                <span className="text-right text-sm text-muted-foreground">
                  Se calcula al continuar
                </span>
              </div>
              <div className="flex justify-between gap-4 text-muted-foreground text-xs">
                <span>IGV incluido (18%)</span>
                <span className="shrink-0 tabular-nums">{fmt(igv)}</span>
              </div>
              <div className="flex justify-between gap-4 font-bold text-foreground text-base border-t border-border/20 pt-3">
                <span>Subtotal a pagar</span>
                <span className="shrink-0 tabular-nums">{fmt(total)}</span>
              </div>
            </div>

            <button onClick={async () => {if(await refreshStock()) navigate('/checkout');}}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-lg font-bold text-base">
              Finalizar compra <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => navigate('/tienda')}
              className="w-full text-center text-sm text-muted-foreground">
              ← Seguir comprando
            </button>
          </div>
        </div>
      </div>
    </>
  );
}