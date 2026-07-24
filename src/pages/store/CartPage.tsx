import React from 'react';
import { useState, useEffect } from 'react';
import { useDatabase } from '@/lib/backend';
import { useCart } from '@/store/cartStore';
import { useConfig } from '@/store/configStore';
import { useNavigate } from '@/lib/router';
import FreeShippingBar from '@/components/store/FreeShippingBar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Coupon, ShippingMethod } from '@/lib/storeTypes';
import { ShoppingCart, Trash2, Plus, Minus, Tag, X, ArrowRight, ChevronLeft, Truck, CircleCheck as CheckCircle, Package, ShoppingBag } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

function fmt(n: number) { return `S/ ${n.toFixed(2)}`; }

export default function CartPage() {
  const database = useDatabase();
  const { items, removeItem, updateQty, subtotal, itemCount } = useCart();
  const { company } = useConfig();
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingMethod | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(true);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const freeThreshold = parseFloat(company.free_shipping_threshold || '150');

  useEffect(() => {
    setLoadingShipping(true);
    Promise.all([
      database.select<ShippingMethod>('shipping_methods', { filter: { status: 'active' } }),
      database.select<Coupon>('coupons', { filter: { status: 'active' } }),
    ]).then(([{ data: methods }, { data: coupons }]) => {
      const ms = (methods || []) as ShippingMethod[];
      setShippingMethods(ms);
      if (ms.length > 0) setSelectedShipping(ms[0]);
      setLoadingShipping(false);

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
    if (!data) {
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
      : coupon.value
    : 0;

  const shippingCost = (() => {
    if (!selectedShipping) return 0;
    if (subtotal >= freeThreshold) return 0;
    if (selectedShipping.type === 'free_threshold' && selectedShipping.free_threshold && subtotal >= selectedShipping.free_threshold) return 0;
    return selectedShipping.price;
  })();

  const total = subtotal - discount + shippingCost;
  const igv = total - total / 1.18;

  if (itemCount === 0) {
    return (
      <div className="min-h-screen bg-background pt-28 flex flex-col">
        <Navbar />
        <div className="flex flex-col items-center justify-center gap-5 px-4 min-h-[80vh]">
          <div className="w-24 h-24 rounded-3xl bg-muted flex items-center justify-center">
            <ShoppingCart className="w-12 h-12 text-muted-foreground/30" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">Tu carrito esta vacio</h2>
            <p className="text-muted-foreground text-sm mt-1">Explora nuestra tienda y agrega los productos que te gusten</p>
          </div>
          <button onClick={() => navigate('/tienda')}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-md shadow-primary/20">
            <ShoppingBag className="w-4 h-4" /> Explorar tienda
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-28">
      <Navbar />
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/tienda')} className="text-muted-foreground hover:text-foreground transition-colors p-1 -ml-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Carrito de compras</h1>
          <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">{itemCount}</span>
          <button onClick={() => navigate('/tienda')} className="ml-auto text-sm text-primary hover:underline font-semibold hidden sm:block">
            Seguir comprando
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Items + Shipping ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Free shipping bar */}
          <FreeShippingBar subtotal={subtotal} threshold={freeThreshold} />

          {/* Items */}
          <div className="space-y-3">
            {items.map(item => {
              const img = item.variant?.images?.[0]?.url || item.product.images?.[0]?.url;
              return (
                <div key={item.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 sm:gap-4 hover:border-primary/20 transition-colors">
                  <button onClick={() => navigate(`/tienda/${item.product.slug}`)}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0 border border-border hover:opacity-80 transition-opacity">
                    {img ? <img src={img} alt={item.product.name} className="w-full h-full object-cover" /> :
                      <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-muted-foreground/40" /></div>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <button onClick={() => navigate(`/tienda/${item.product.slug}`)} className="text-left">
                      <p className="text-sm font-bold text-foreground hover:text-primary transition-colors line-clamp-2">{item.product.name}</p>
                    </button>
                    {item.variant && <p className="text-xs text-muted-foreground mt-0.5">{item.variant.name}</p>}
                    <p className="text-sm font-bold text-primary mt-1">{fmt(item.price)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <button onClick={() => removeItem(item.id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors p-1 -mr-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center border border-border rounded-xl overflow-hidden">
                      <button onClick={() => updateQty(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-foreground">{item.quantity}</span>
                      <button onClick={() => updateQty(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs font-bold text-foreground">{fmt(item.price * item.quantity)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Shipping selector */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4 text-primary" /> Estimación de envío
            </h3>
            {loadingShipping ? (
              <div className="space-y-2">
                {Array.from({length: 2}).map((_, i) => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {shippingMethods.map(m => {
                  const cost = subtotal >= freeThreshold || (m.type === 'free_threshold' && m.free_threshold && subtotal >= m.free_threshold) ? 0 : m.price;
                  return (
                    <label key={m.id} className={cn('flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors',
                      selectedShipping?.id === m.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40')}>
                      <input type="radio" name="shipping" value={m.id} checked={selectedShipping?.id === m.id}
                        onChange={() => setSelectedShipping(m)} className="accent-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{m.name}</p>
                        {m.estimated_days_min != null && <p className="text-xs text-muted-foreground">{m.estimated_days_min}–{m.estimated_days_max} días hábiles</p>}
                      </div>
                      <span className={cn('text-sm font-bold', cost === 0 ? 'text-green-500' : 'text-foreground')}>
                        {cost === 0 ? 'Gratis' : fmt(cost)}
                      </span>
                    </label>
                  );
                })}
                {shippingMethods.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">El costo de envío se calculará al hacer checkout</p>}
              </div>
            )}
          </div>
        </div>

        {/* ── Order Summary ── */}
        <div>
          <div className="bg-card border border-border rounded-xl p-5 space-y-4 sticky top-[73px]">
            <h2 className="text-base font-bold text-foreground">Resumen del pedido</h2>

            {/* Smart coupons */}
            {availableCoupons.length > 0 && !coupon && (
              <div className="space-y-2 bg-amber-500/8 border border-amber-500/20 rounded-xl p-3">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Cupones disponibles
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {availableCoupons.map(c => (
                    <button key={c.code}
                      onClick={() => { setCouponCode(c.code); applyCoupon(c.code); }}
                      className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/15 border border-amber-500/25 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 transition-colors">
                      {c.code} <span className="opacity-70">{c.type === 'percentage' ? `-${c.value}%` : `-S/${c.value}`}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Coupon input */}
            <div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input value={couponCode}
                    onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                    placeholder="Código de cupón"
                    className="w-full pl-9 pr-3 py-2.5 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary"
                    onKeyDown={e => e.key === 'Enter' && applyCoupon()} />
                </div>
                <button onClick={() => applyCoupon()} disabled={checkingCoupon}
                  className="px-4 py-2.5 bg-muted border border-border rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors disabled:opacity-50">
                  {checkingCoupon ? '...' : 'Aplicar'}
                </button>
              </div>
              {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
              {coupon && (
                <div className="flex items-center gap-2 mt-2 bg-green-500/10 text-green-600 text-xs font-semibold px-3 py-2 rounded-lg">
                  <CheckCircle className="w-3.5 h-3.5" /> {coupon.code}: -{fmt(discount)}
                  <button onClick={() => { setCoupon(null); setCouponCode(''); }} className="ml-auto text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
                </div>
              )}
            </div>

            {/* Breakdown */}
            <div className="space-y-2 text-sm border-t border-border pt-3">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({itemCount} art.)</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 font-semibold">
                  <span>Descuento</span>
                  <span>-{fmt(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Envío estimado</span>
                <span className={shippingCost === 0 ? 'text-green-500 font-semibold' : ''}>
                  {shippingCost === 0 ? 'Gratis' : fmt(shippingCost)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>IGV incluido (18%)</span>
                <span>{fmt(igv)}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground text-base border-t border-border pt-2">
                <span>Total estimado</span>
                <span>{fmt(total)}</span>
              </div>
            </div>

            <button onClick={() => navigate('/checkout')}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-xl font-bold text-base hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20">
              Finalizar compra <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => navigate('/tienda')}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Seguir comprando
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
