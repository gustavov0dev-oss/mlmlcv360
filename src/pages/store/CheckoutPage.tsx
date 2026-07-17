import { useState, useEffect } from 'react';
import { useDatabase } from '@/lib/backend';
import { useCart } from '@/store/cartStore';
import { useConfig } from '@/store/configStore';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from '@/lib/router';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ShippingMethod, Coupon } from '@/lib/storeTypes';
import { CircleCheck as CheckCircle, ChevronLeft, ChevronRight, MapPin, Truck, CreditCard, ClipboardList, Tag, Package, Plus, Trash2, Globe, Chrome as Home, X, Loader as Loader2 } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

function fmt(n: number, currency = 'PEN', rate = 1) {
  if (currency === 'USD') return `$${(n / rate).toFixed(2)}`;
  return `S/ ${n.toFixed(2)}`;
}

const PERU_REGIONS = ['Amazonas','Áncash','Apurímac','Arequipa','Ayacucho','Cajamarca','Callao','Cusco','Huancavelica','Huánuco','Ica','Junín','La Libertad','Lambayeque','Lima','Loreto','Madre de Dios','Moquegua','Pasco','Piura','Puno','San Martín','Tacna','Tumbes','Ucayali'];

const COUNTRIES = [
  { code: 'PE', name: 'Perú', flag: '🇵🇪', zones: PERU_REGIONS },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', zones: [] },
  { code: 'MX', name: 'México', flag: '🇲🇽', zones: [] },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', zones: [] },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', zones: [] },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', zones: [] },
  { code: 'ES', name: 'España', flag: '🇪🇸', zones: [] },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', zones: [] },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', zones: [] },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', zones: [] },
  { code: 'OTHER', name: 'Otro país', flag: '🌍', zones: [] },
];

const REFERENCE_HINTS = [
  'Casa con reja roja', 'Frente al parque', 'Al costado de la bodega',
  'Casa de 2 pisos', 'Portón verde', 'Cerca de la iglesia', 'Zona rural',
];

const STEPS = [
  { id: 1, label: 'Dirección', icon: MapPin },
  { id: 2, label: 'Envío', icon: Truck },
  { id: 3, label: 'Pago', icon: CreditCard },
  { id: 4, label: 'Confirmar', icon: ClipboardList },
];

type AddressForm = {
  id?: string;
  label: string;
  full_name: string;
  phone: string;
  address: string;
  district: string;
  city: string;
  region: string;
  country: string;
  country_name: string;
  zip_code: string;
  reference: string;
  invoice_type: 'boleta' | 'factura' | 'receipt' | 'invoice';
  ruc: string;
  razon_social: string;
  is_default: boolean;
};

const EMPTY_ADDR: AddressForm = {
  label: 'Mi dirección', full_name: '', phone: '', address: '', district: '',
  city: '', region: 'Lima', country: 'PE', country_name: 'Perú',
  zip_code: '', reference: '', invoice_type: 'boleta',
  ruc: '', razon_social: '', is_default: false,
};

// Skeleton for step
function StepSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      {Array.from({length: 5}).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          <div className="h-11 bg-muted rounded-xl animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function CheckoutPage() {
  const database = useDatabase();
  const { items, subtotal, clearCart } = useCart();
  const { company, currency: storeCurrency, exchangeRate, tax } = useConfig();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [addr, setAddr] = useState<AddressForm>({ ...EMPTY_ADDR, full_name: user?.full_name || '', phone: (user as any)?.phone || '' });
  const [savedAddresses, setSavedAddresses] = useState<AddressForm[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const [saveForFuture, setSaveForFuture] = useState(true);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState<ShippingMethod | null>(null);
  const [gateways, setGateways] = useState<any[]>([]);
  const [loadingGateways, setLoadingGateways] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [selectedGateway, setSelectedGateway] = useState<any>(null);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<{ order_number: string; order_id: string; total: number } | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState(storeCurrency || 'PEN');

  const freeThreshold = parseFloat(company.free_shipping_threshold || '150');

  // Load saved addresses and gateways on mount
  useEffect(() => {
    const loadAll = async () => {
      setLoadingAddresses(true);
      setLoadingGateways(true);
      const [addrRes, gwRes] = await Promise.all([
        user ? database.select<AddressForm>('saved_addresses', { filter: { user_id: user.id }, order: { column: 'is_default', ascending: false } }) : Promise.resolve({ data: [] }),
        database.select('payment_gateways', { filter: { is_active: true }, order: { column: 'name' } }),
      ]);
      const addrs = (addrRes.data || []) as AddressForm[];
      setSavedAddresses(addrs);
      if (addrs.length > 0) {
        const def = addrs.find((a: AddressForm) => a.is_default) || addrs[0];
        setAddr({ ...def });
      }
      setLoadingAddresses(false);

      const gws = (gwRes.data || []) as any[];
      setGateways(gws);
      if (gws.length > 0) {
        setSelectedGateway(gws[0]);
        setPaymentMethod(gws[0].slug || gws[0].id);
      }
      setLoadingGateways(false);
    };
    loadAll();
  }, [user]);

  // Load shipping methods when country changes
  useEffect(() => {
    if (step !== 2) return;
    setLoadingShipping(true);
    database.select<ShippingMethod>('shipping_methods', { filter: { status: 'active' } }).then(({ data }) => {
      const ms = (data || []) as ShippingMethod[];
      setShippingMethods(ms);
      if (ms.length > 0 && !selectedShipping) setSelectedShipping(ms[0]);
      setLoadingShipping(false);
    });
  }, [step]);

  const shippingCost = (() => {
    if (!selectedShipping) return 0;
    if (subtotal >= freeThreshold) return 0;
    if (selectedShipping.type === 'free_threshold' && selectedShipping.free_threshold && subtotal >= selectedShipping.free_threshold) return 0;
    return selectedShipping.price;
  })();

  const discount = coupon
    ? coupon.type === 'percentage'
      ? Math.min(subtotal * coupon.value / 100, coupon.max_discount ?? Infinity)
      : coupon.value
    : 0;

  // Dynamic IGV/Tax calculation
  const subtotalAfterDiscount = subtotal - discount;
  let taxAmount = 0;
  let basePrice = subtotalAfterDiscount + shippingCost;

  if (tax.enabled) {
    if (tax.includedInPrice) {
      // IGV included in price - extract from total
      taxAmount = basePrice - (basePrice / (1 + tax.rate / 100));
    } else {
      // IGV added to price
      taxAmount = basePrice * (tax.rate / 100);
    }
  }

  const total = tax.includedInPrice ? basePrice : basePrice + taxAmount;
  const isPeru = addr.country === 'PE';

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    const { data } = await database.select<Coupon>('coupons', {
      filter: [
        { column: 'code', operator: 'eq', value: couponCode.trim().toUpperCase() },
        { column: 'status', operator: 'eq', value: 'active' },
      ],
      single: true,
    });
    if (!data) { setCouponError('Cupón inválido'); setCoupon(null); return; }
    const c = data as Coupon;
    if (subtotal < (c.min_order_amount ?? 0)) { setCouponError(`Mínimo: ${fmt(c.min_order_amount)}`); setCoupon(null); return; }
    setCoupon(c); setCouponError(''); toast.success('Cupón aplicado');
  };

  const validateAddr = () => {
    if (!addr.full_name.trim()) { toast.error('Ingresa tu nombre completo'); return false; }
    if (!addr.phone.trim()) { toast.error('Ingresa un teléfono de contacto'); return false; }
    if (!addr.address.trim()) { toast.error('Ingresa la dirección'); return false; }
    if (!addr.city.trim()) { toast.error('Ingresa la ciudad'); return false; }
    if (isPeru && !addr.district.trim()) { toast.error('Ingresa el distrito'); return false; }
    if (addr.invoice_type === 'factura' && !addr.ruc.trim()) { toast.error('Ingresa el RUC para factura'); return false; }
    return true;
  };

  const saveAddress = async () => {
    if (!user || !saveForFuture) return;

    const payload = {
      user_id: user.id, label: addr.label || 'Mi dirección',
      full_name: addr.full_name, phone: addr.phone, address: addr.address,
      district: addr.district, city: addr.city, region: addr.region,
      country: addr.country, country_name: addr.country_name,
      zip_code: addr.zip_code, reference: addr.reference,
      invoice_type: addr.invoice_type, ruc: addr.ruc, razon_social: addr.razon_social,
      is_default: savedAddresses.length === 0,
      updated_at: new Date().toISOString(),
    };
    if (addr.id) {
      await database.update('saved_addresses', addr.id, payload);
    } else {
      const { data } = await database.insert<AddressForm>('saved_addresses', payload);
      if (data && !Array.isArray(data)) setAddr(prev => ({ ...prev, id: data.id }));
    }

  };

  const deleteAddress = async (id: string) => {
    await database.delete('saved_addresses', id);
    setSavedAddresses(prev => prev.filter(a => a.id !== id));
    if (addr.id === id) setAddr({ ...EMPTY_ADDR, full_name: user?.full_name || '' });
  };

  const placeOrder = async () => {
    if (!user || items.length === 0) return;
    setPlacing(true);
    await saveAddress();

    const shippingAddr = { ...addr, reference: addr.reference };
    const payload = {
      p_user_id: user.id,
      p_items: items.map(i => ({
        product_id: i.product.id,
        variant_id: i.variant?.id || '',
        quantity: i.quantity,
        image_url: i.variant?.images?.[0]?.url || i.product.images?.[0]?.url || '',
      })),
      p_shipping_addr: shippingAddr,
      p_billing_addr: shippingAddr,
      p_shipping_name: selectedShipping?.name || 'Estándar',
      p_shipping_cost: shippingCost,
      p_coupon_code: coupon?.code || null,
      p_currency: displayCurrency,
      p_exchange_rate: displayCurrency === 'USD' ? exchangeRate : 1,
      p_notes: notes || null,
      p_payment_method: paymentMethod,
    };

    const { data, error } = await database.rpc<any>('place_order', payload);
    if (error || !data?.success) {
      toast.error(data?.error || error || 'Error al procesar el pedido');
      setPlacing(false); return;
    }
    clearCart();
    setPlacedOrder({ order_number: data.order_number, order_id: data.order_id, total: data.total });
    setStep(5);
    setPlacing(false);
  };

  // Success screen
  if (step === 5 && placedOrder) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4 pt-28 pb-10">
        <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-20 h-20 bg-green-500/15 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">¡Pedido realizado!</h2>
            <p className="text-muted-foreground text-sm mt-1">Gracias por tu compra. Te notificaremos al confirmar el pago.</p>
          </div>
          <div className="bg-muted rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Número de pedido</span>
              <span className="font-bold text-foreground font-mono">{placedOrder.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold text-foreground">{fmt(placedOrder.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pago</span>
              <span className="font-semibold text-foreground capitalize">{selectedGateway?.name || paymentMethod}</span>
            </div>
          </div>
          {/* Payment instructions */}
          {selectedGateway && (
            <div className="bg-primary/8 border border-primary/20 rounded-xl p-4 text-sm text-left">
              <p className="font-bold text-foreground mb-1">Instrucciones de pago</p>
              {selectedGateway.slug === 'yape' && selectedGateway.credentials?.phone_number && (
                <p className="text-muted-foreground">Envía el pago a Yape/Plin: <span className="font-bold text-foreground">{selectedGateway.credentials.phone_number}</span> a nombre de {selectedGateway.credentials.merchant_name}</p>
              )}
              {(selectedGateway.slug === 'transfer' || !selectedGateway.credentials?.phone_number) && (
                <p className="text-muted-foreground">Recibirás los detalles de pago por correo electrónico. Tu pedido se confirmará tras verificar el pago.</p>
              )}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => navigate('/dashboard/pedidos')}
              className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors">
              Ver mis pedidos
            </button>
            <button onClick={() => navigate('/tienda')}
              className="flex-1 border border-border py-3 rounded-xl font-bold text-sm hover:bg-muted transition-colors">
              Seguir comprando
            </button>
          </div>
        </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (items.length === 0) {
    navigate('/carrito');
    return null;
  }



  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      {/* Checkout Header */}
      <div className="border-b border-border bg-card mt-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/carrito')}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 -ml-1">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-foreground">Finalizar compra</h1>
          </div>
          {/* Step bar */}
          <div className="flex items-center">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <button onClick={() => step > s.id && setStep(s.id)}
                  className={cn('flex items-center gap-1.5 text-xs font-bold transition-colors',
                    step === s.id ? 'text-primary' : step > s.id ? 'text-green-500 cursor-pointer' : 'text-muted-foreground cursor-default')}>
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 transition-all',
                    step === s.id ? 'border-primary bg-primary text-white shadow-md shadow-primary/30' :
                    step > s.id ? 'border-green-500 bg-green-500 text-white' : 'border-border text-muted-foreground')}>
                    {step > s.id ? '✓' : s.id}
                  </div>
                  <span className="hidden sm:block">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <div className={cn('flex-1 h-px mx-2', step > s.id ? 'bg-green-500' : 'bg-border')} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">

          {/* ── STEP 1: Address ── */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Saved addresses */}
              {loadingAddresses ? (
                <StepSkeleton />
              ) : savedAddresses.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Home className="w-4 h-4 text-primary" /> Direcciones guardadas
                  </h2>
                  <div className="space-y-2">
                    {savedAddresses.map(a => (
                      <label key={a.id} className={cn('flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors',
                        addr.id === a.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40')}>
                        <input type="radio" name="saved_addr" checked={addr.id === a.id}
                          onChange={() => setAddr({ ...a })} className="mt-0.5 accent-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground">{a.label} {a.is_default && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full ml-1">Principal</span>}</p>
                          <p className="text-xs text-muted-foreground">{a.full_name} · {a.phone}</p>
                          <p className="text-xs text-muted-foreground">{a.address}{a.district ? `, ${a.district}` : ''}, {a.city}, {a.country_name}</p>
                        </div>
                        <button onClick={e => { e.stopPropagation(); deleteAddress(a.id!); }}
                          className="text-muted-foreground hover:text-red-500 transition-colors p-1 flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </label>
                    ))}
                    <button onClick={() => setAddr({ ...EMPTY_ADDR, full_name: user?.full_name || '' })}
                      className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-border rounded-xl text-sm font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
                      <Plus className="w-4 h-4" /> Nueva dirección
                    </button>
                  </div>
                </div>
              )}

              {/* Address form */}
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  {savedAddresses.length > 0 ? 'Editar / Nueva dirección' : 'Dirección de entrega'}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Country selector */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1">
                      <Globe className="w-3 h-3" /> País de destino *
                    </label>
                    <select
                      value={addr.country}
                      onChange={e => {
                        const c = COUNTRIES.find(x => x.code === e.target.value) || COUNTRIES[0];
                        setAddr(p => ({ ...p, country: c.code, country_name: c.name, region: c.zones[0] || '', district: '' }));
                      }}
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary">
                      {COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Nombre completo *</label>
                    <input value={addr.full_name} onChange={e => setAddr(p => ({ ...p, full_name: e.target.value }))}
                      placeholder="Juan Pérez García"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Celular / WhatsApp *</label>
                    <input value={addr.phone} onChange={e => setAddr(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+51 999 888 777"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
                  </div>

                  {isPeru ? (
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">Región *</label>
                      <select value={addr.region} onChange={e => setAddr(p => ({ ...p, region: e.target.value }))}
                        className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary">
                        {PERU_REGIONS.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">Estado / Provincia *</label>
                      <input value={addr.region} onChange={e => setAddr(p => ({ ...p, region: e.target.value }))}
                        placeholder="Estado o provincia"
                        className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Ciudad *</label>
                    <input value={addr.city} onChange={e => setAddr(p => ({ ...p, city: e.target.value }))}
                      placeholder="Lima"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
                  </div>

                  {isPeru && (
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">Distrito *</label>
                      <input value={addr.district} onChange={e => setAddr(p => ({ ...p, district: e.target.value }))}
                        placeholder="Miraflores"
                        className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
                    </div>
                  )}

                  {!isPeru && (
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">Código postal</label>
                      <input value={addr.zip_code} onChange={e => setAddr(p => ({ ...p, zip_code: e.target.value }))}
                        placeholder="12345"
                        className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Dirección completa *</label>
                    <input value={addr.address} onChange={e => setAddr(p => ({ ...p, address: e.target.value }))}
                      placeholder="Av. Javier Prado 1234, Dpto 501"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Referencia de entrega
                      <span className="font-normal text-muted-foreground ml-1">(útil para zonas rurales o difíciles)</span>
                    </label>
                    <input value={addr.reference} onChange={e => setAddr(p => ({ ...p, reference: e.target.value }))}
                      placeholder="Ej: Casa de 2 pisos, portón azul, frente al parque..."
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {REFERENCE_HINTS.map(h => (
                        <button key={h} type="button" onClick={() => setAddr(p => ({ ...p, reference: h }))}
                          className="px-2.5 py-1 bg-muted border border-border rounded-full text-[11px] text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Invoice type */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-foreground mb-2">Tipo de comprobante</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {isPeru ? (
                        <>
                          {([['boleta', '📄 Boleta'], ['factura', '🏢 Factura']] as const).map(([val, label]) => (
                            <button key={val} onClick={() => setAddr(p => ({ ...p, invoice_type: val }))}
                              className={cn('py-2.5 rounded-xl text-sm font-bold border-2 transition-colors',
                                addr.invoice_type === val ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                              {label}
                            </button>
                          ))}
                        </>
                      ) : (
                        <>
                          {([['receipt', '🧾 Recibo'], ['invoice', '📑 Invoice']] as const).map(([val, label]) => (
                            <button key={val} onClick={() => setAddr(p => ({ ...p, invoice_type: val }))}
                              className={cn('py-2.5 rounded-xl text-sm font-bold border-2 transition-colors',
                                addr.invoice_type === val ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                              {label}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  {addr.invoice_type === 'factura' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1.5">RUC *</label>
                        <input value={addr.ruc} onChange={e => setAddr(p => ({ ...p, ruc: e.target.value }))}
                          placeholder="20xxxxxxxxx" maxLength={11}
                          className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm font-mono outline-none focus:border-primary" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1.5">Razón Social *</label>
                        <input value={addr.razon_social} onChange={e => setAddr(p => ({ ...p, razon_social: e.target.value }))}
                          placeholder="Empresa S.A.C."
                          className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
                      </div>
                    </>
                  )}

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Etiqueta (para identificar)</label>
                    <input value={addr.label} onChange={e => setAddr(p => ({ ...p, label: e.target.value }))}
                      placeholder="Casa, Trabajo, etc."
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
                  </div>
                </div>

                {/* Save for future */}
                {user && (
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div onClick={() => setSaveForFuture(v => !v)}
                      className={cn('w-10 h-6 rounded-full transition-colors relative flex-shrink-0',
                        saveForFuture ? 'bg-primary' : 'bg-muted border border-border')}>
                      <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                        saveForFuture ? 'translate-x-5' : 'translate-x-1')} />
                    </div>
                    <span className="text-sm text-foreground">Guardar esta dirección para futuras compras</span>
                  </label>
                )}

                <button onClick={() => validateAddr() && setStep(2)}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-xl font-bold hover:bg-primary/90 transition-colors">
                  Continuar al envío <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Shipping ── */}
          {step === 2 && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" /> Método de envío
              </h2>
              {loadingShipping ? (
                <div className="space-y-2">
                  {Array.from({length: 3}).map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : shippingMethods.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-sm">
                  <p>No hay métodos de envío disponibles.</p>
                  <p className="text-xs mt-1">Contacta con soporte para coordinar el envío a tu ubicación.</p>
                </div>
              ) : (
                shippingMethods.map(m => {
                  const cost = subtotal >= freeThreshold ? 0 :
                    (m.type === 'free_threshold' && m.free_threshold && subtotal >= m.free_threshold) ? 0 : m.price;
                  return (
                    <label key={m.id} className={cn('flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors',
                      selectedShipping?.id === m.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40')}>
                      <input type="radio" name="ship" checked={selectedShipping?.id === m.id}
                        onChange={() => setSelectedShipping(m)} className="accent-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-foreground">{m.name}</p>
                        {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                        {m.estimated_days_min != null && (
                          <p className="text-xs text-muted-foreground">{m.estimated_days_min}–{m.estimated_days_max} días hábiles</p>
                        )}
                      </div>
                      <span className={cn('text-sm font-bold', cost === 0 ? 'text-green-500' : 'text-foreground')}>
                        {cost === 0 ? '¡Gratis!' : `S/ ${cost.toFixed(2)}`}
                      </span>
                    </label>
                  );
                })
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 border border-border rounded-xl py-3 font-bold text-sm hover:bg-muted transition-colors">
                  <ChevronLeft className="w-4 h-4 inline mr-1" /> Anterior
                </button>
                <button onClick={() => setStep(3)} className="flex-1 bg-primary text-primary-foreground rounded-xl py-3 font-bold text-sm hover:bg-primary/90 transition-colors">
                  Continuar <ChevronRight className="w-4 h-4 inline ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Payment ── */}
          {step === 3 && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" /> Método de pago
                </h2>
                {/* Currency toggle */}
                <div className="flex items-center bg-muted rounded-xl p-1 gap-1">
                  {['PEN', 'USD'].map(c => (
                    <button key={c} onClick={() => setDisplayCurrency(c)}
                      className={cn('px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
                        displayCurrency === c ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                      {c === 'PEN' ? 'S/ Soles' : '$ USD'}
                    </button>
                  ))}
                </div>
              </div>

              {loadingGateways ? (
                <div className="space-y-2">
                  {Array.from({length: 3}).map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : gateways.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay métodos de pago configurados. Contacta al administrador.</p>
              ) : (
                gateways.map(gw => {
                  const gwIcons: Record<string, string> = { yape: '📱', culqi: '💳', niubiz: '💳', mercadopago: '💙', paypal: '🅿️', izipay: '💳', transfer: '🏦', efectivo: '💵' };
                  const icon = gwIcons[gw.slug] || '💰';
                  const gwDesc: Record<string, string> = {
                    yape: gw.credentials?.phone_number ? `Yape al ${gw.credentials.phone_number}` : 'Pago móvil instantáneo',
                    culqi: 'Visa, Mastercard, Amex • Perú',
                    niubiz: 'Visa, Mastercard, Amex • Perú',
                    mercadopago: 'Múltiples métodos • Latinoamérica',
                    paypal: 'Tarjeta de crédito / PayPal Balance',
                    izipay: 'Visa, Mastercard, Diners • Perú',
                    transfer: 'BCP, Interbank, BBVA, Scotiabank',
                    efectivo: 'Paga al recibir tu pedido',
                  };
                  const isSelected = paymentMethod === (gw.slug || gw.id);
                  return (
                    <label key={gw.id} className={cn('flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors',
                      isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40')}>
                      <input type="radio" name="payment" value={gw.slug || gw.id} checked={isSelected}
                        onChange={() => { setPaymentMethod(gw.slug || gw.id); setSelectedGateway(gw); }}
                        className="accent-primary" />
                      <span className="text-xl flex-shrink-0">{icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-foreground">{gw.name}</p>
                        <p className="text-xs text-muted-foreground">{gw.description || gwDesc[gw.slug] || ''}</p>
                      </div>
                      {gw.commission_rate > 0 && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">+{gw.commission_rate}%</span>
                      )}
                    </label>
                  );
                })
              )}

              {/* Payment instruction hint */}
              {selectedGateway?.slug === 'yape' && selectedGateway.credentials?.phone_number && (
                <div className="bg-green-500/8 border border-green-500/20 rounded-xl p-3">
                  <p className="text-xs font-bold text-green-700 dark:text-green-400 mb-1">📱 Instrucciones Yape</p>
                  <p className="text-xs text-muted-foreground">Realiza el pago a <strong className="text-foreground">{selectedGateway.credentials.phone_number}</strong> ({selectedGateway.credentials.merchant_name}). Envía el comprobante por WhatsApp para confirmar.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Notas del pedido (opcional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="Instrucciones especiales, horario preferido de entrega..."
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary resize-none" />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 border border-border rounded-xl py-3 font-bold text-sm hover:bg-muted transition-colors">
                  <ChevronLeft className="w-4 h-4 inline mr-1" /> Anterior
                </button>
                <button onClick={() => setStep(4)} className="flex-1 bg-primary text-primary-foreground rounded-xl py-3 font-bold text-sm hover:bg-primary/90 transition-colors">
                  Revisar pedido <ChevronRight className="w-4 h-4 inline ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Review ── */}
          {step === 4 && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-5">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" /> Confirmar pedido
              </h2>

              {/* Address summary */}
              <div className="bg-muted/40 rounded-xl p-4 space-y-1 text-sm border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dirección</span>
                  <button onClick={() => setStep(1)} className="text-xs text-primary hover:underline">Editar</button>
                </div>
                <p className="font-bold text-foreground">{addr.full_name}</p>
                <p className="text-muted-foreground">{addr.address}</p>
                {addr.district && <p className="text-muted-foreground">{addr.district}, {addr.city}, {addr.region}</p>}
                {!addr.district && <p className="text-muted-foreground">{addr.city}, {addr.region}, {addr.country_name}</p>}
                {addr.reference && <p className="text-muted-foreground italic">Ref: {addr.reference}</p>}
                <p className="text-muted-foreground">📞 {addr.phone}</p>
                {addr.invoice_type === 'factura' && <p className="text-muted-foreground">RUC: {addr.ruc} — {addr.razon_social}</p>}
              </div>

              {/* Items */}
              <div className="space-y-2">
                {items.map(i => (
                  <div key={i.id} className="flex items-center gap-3 py-1">
                    <div className="w-10 h-10 rounded-xl bg-muted overflow-hidden flex-shrink-0 border border-border">
                      {(i.product.images?.[0]?.url || i.variant?.images?.[0]?.url) && (
                        <img src={i.variant?.images?.[0]?.url || i.product.images?.[0]?.url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground line-clamp-1">{i.product.name}</p>
                      {i.variant && <p className="text-xs text-muted-foreground">{i.variant.name}</p>}
                      <p className="text-xs text-muted-foreground">× {i.quantity}</p>
                    </div>
                    <span className="text-sm font-bold text-foreground">{fmt(i.price * i.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className="flex-1 border border-border rounded-xl py-3 font-bold text-sm hover:bg-muted transition-colors">
                  <ChevronLeft className="w-4 h-4 inline mr-1" /> Anterior
                </button>
                <button onClick={placeOrder} disabled={placing}
                  className="flex-1 bg-primary text-primary-foreground rounded-xl py-3 font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {placing ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : <><Package className="w-4 h-4" /> Confirmar pedido</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── ORDER SUMMARY SIDEBAR ── */}
        <div>
          <div className="bg-card border border-border rounded-xl p-5 space-y-4 sticky top-20">
            <h3 className="text-sm font-bold text-foreground">Resumen del pedido</h3>

            {/* Items mini list */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {items.map(i => (
                <div key={i.id} className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex-1 truncate pr-2">{i.product.name}{i.variant ? ` (${i.variant.name})` : ''} ×{i.quantity}</span>
                  <span className="font-semibold text-foreground whitespace-nowrap">{fmt(i.price * i.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Coupon - Always visible regardless of step */}
            {!coupon ? (
              <div className="space-y-1.5 pt-2 border-t border-border">
                <label className="text-xs font-bold text-foreground">Cupon de descuento</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                      placeholder="Ingresa tu codigo"
                      className="w-full pl-9 pr-3 py-2.5 bg-muted border border-border rounded-xl text-xs outline-none focus:border-primary"
                      onKeyDown={e => e.key === 'Enter' && applyCoupon()} />
                  </div>
                  <button onClick={applyCoupon} className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/90">
                    Aplicar
                  </button>
                </div>
                {couponError && <p className="text-xs text-red-500">{couponError}</p>}
              </div>
            ) : (
              <div className="flex items-center gap-2 pt-2 border-t border-border bg-green-500/10 px-3 py-2.5 rounded-xl">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <div className="flex-1">
                  <p className="text-xs text-green-600 font-bold">{coupon.code} aplicado</p>
                  <p className="text-xs text-green-600">Descuento: -{fmt(discount)}</p>
                </div>
                <button onClick={() => { setCoupon(null); setCouponCode(''); }} className="text-muted-foreground hover:text-red-500"><X className="w-4 h-4" /></button>
              </div>
            )}

            {/* Totals */}
            <div className="border-t border-border pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{fmt(subtotal, displayCurrency, exchangeRate)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento</span>
                  <span>-{fmt(discount, displayCurrency, exchangeRate)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Envio</span>
                <span className={shippingCost === 0 ? 'text-green-500 font-semibold' : ''}>
                  {shippingCost === 0 ? 'Gratis' : fmt(shippingCost, displayCurrency, exchangeRate)}
                </span>
              </div>
              {tax.enabled && (
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>{tax.name} {tax.includedInPrice ? 'incluido' : `(${tax.rate}%)`}</span>
                  <span>{fmt(taxAmount, displayCurrency, exchangeRate)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-foreground text-base border-t border-border pt-2">
                <span>Total</span>
                <span>{fmt(total, displayCurrency, exchangeRate)}</span>
              </div>
              {displayCurrency === 'USD' && (
                <p className="text-[10px] text-muted-foreground text-right">Tipo de cambio: S/ {exchangeRate} por $1</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
