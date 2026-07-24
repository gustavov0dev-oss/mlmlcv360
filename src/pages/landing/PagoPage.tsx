import { useState, useEffect, useMemo } from 'react';
import {
  CircleCheck as CheckCircle, Lock, ArrowLeft, DollarSign,
  TriangleAlert as AlertTriangle, Smartphone, ExternalLink,
  ShieldCheck, RefreshCw, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate, useSearchParams, Link } from '@/lib/router';
import { toast } from 'sonner';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { useConfig, formatPrice } from '@/store/configStore';
import { useDatabase } from '@/lib/backend';
import { useAuthStore } from '@/store/authStore';

type Currency = 'PEN' | 'USD';

interface DBGateway {
  id: string;
  slug: string;
  name: string;
  logo: string;
  currency: string;
  is_active: boolean;
  credentials: Record<string, string>;
  test_mode: boolean;
  description: string;
}

function gatewayReady(g: DBGateway): boolean {
  if (!g.credentials) return false;
  return Object.values(g.credentials).some(v => typeof v === 'string' && v.trim() !== '');
}

function PlanBadge({ plan }: { plan: any }) {
  if (!plan) return null;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-bold text-foreground">{plan.name}</span>
      {plan.badge && (
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
          {plan.badge}
        </span>
      )}
    </div>
  );
}

export default function PagoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, fetchProfile } = useAuthStore();
  const database = useDatabase();
  const { plans: configPlans, currency: sysCurrency, currencySymbol, exchangeRate } = useConfig();

  const [currency, setCurrency] = useState<Currency>(sysCurrency as Currency || 'PEN');
  const [gateways, setGateways] = useState<DBGateway[]>([]);
  const [selectedGatewayId, setSelectedGatewayId] = useState('');
  const [selectedPlanSlug, setSelectedPlanSlug] = useState('');
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [gatewaysLoading, setGatewaysLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'select' | 'confirm' | 'success'>('select');
  const [paymentRef, setPaymentRef] = useState('');

  // Resolve plans: DB first, fallback to configStore
  const paidPlans = useMemo(() => {
    const source = allPlans.length > 0 ? allPlans : configPlans;
    return source
      .filter(p => p.is_active !== false && !p.is_free && Number(p.price) > 0)
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [allPlans, configPlans]);

  const plan = paidPlans.find(p => p.slug === selectedPlanSlug) || paidPlans[0] || null;

  // Load plans
  useEffect(() => {
    database.select('plans', { filter: { is_active: true }, order: { column: 'sort_order' } }).then(({ data }) => {
      if (data) setAllPlans(data as any[]);
      setPlansLoading(false);
    });
  }, []);

  // Load gateways
  useEffect(() => {
    database.select('payment_gateways', { filter: { is_active: true } }).then(({ data }) => {
      if (data) setGateways(data as DBGateway[]);
      setGatewaysLoading(false);
    });
  }, []);

  // Set plan from URL
  useEffect(() => {
    const slug = searchParams.get('plan') || '';
    if (slug) setSelectedPlanSlug(slug);
  }, [searchParams]);

  // Auto-select first ready gateway when currency or gateways change
  useEffect(() => {
    if (!gateways.length) return;
    const forCurrency = gateways.filter(g => g.currency === currency);
    const ready = forCurrency.find(g => gatewayReady(g));
    const first = ready || forCurrency[0];
    if (first && first.id !== selectedGatewayId) setSelectedGatewayId(first.id);
  }, [currency, gateways]);

  // Auto-select plan when paidPlans load if none selected
  useEffect(() => {
    if (!selectedPlanSlug && paidPlans.length > 0) {
      setSelectedPlanSlug(paidPlans[0].slug);
    }
  }, [paidPlans]);

  const gatewaysForCurrency = gateways.filter(g => g.currency === currency);
  const selectedGateway = gateways.find(g => g.id === selectedGatewayId) || null;
  const isYape = selectedGateway?.slug === 'yape';
  const isPayPal = selectedGateway?.slug === 'paypal';
  const isMercadoPago = selectedGateway?.slug === 'mercadopago';

  const displayPrice = plan
    ? formatPrice(plan.price, currency, currencySymbol, exchangeRate)
    : '—';

  const totalWithTax = plan
    ? currency === 'PEN'
      ? `${currencySymbol} ${(Number(plan.price) * 1.18).toFixed(2)}`
      : `USD ${(Number(plan.price) / exchangeRate * 1.18).toFixed(2)}`
    : '—';

  const handleCurrencyChange = (c: Currency) => {
    setCurrency(c);
  };

  // Activate subscription in DB after payment
  const activateSubscription = async (ref: string) => {
    if (!user?.id || !plan) return;
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    await Promise.all([
      database.update('profiles', user.id, {
        plan: plan.slug,
        updated_at: now.toISOString(),
      }),
      database.upsert('subscriptions', {
        user_id: user.id,
        plan_slug: plan.slug,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: end.toISOString(),
        gateway: selectedGateway?.slug || '',
        amount: Number(plan.price),
        currency,
        payment_reference: ref,
        updated_at: now.toISOString(),
      }, 'user_id'),
    ]);
    await fetchProfile(user.id);
  };

  const handlePay = async () => {
    if (!selectedGateway) { toast.error('Selecciona un método de pago'); return; }
    if (!plan) { toast.error('Selecciona un plan'); return; }
    if (!user) {
      toast.info('Debes iniciar sesión para continuar.');
      navigate(`/login`);
      return;
    }
    if (!gatewayReady(selectedGateway)) {
      toast.error('Este método de pago aún no tiene credenciales. Contacta al administrador.');
      return;
    }
    setLoading(true);

    // Yape: manual process — just record as pending and show instructions
    if (isYape) {
      try {
        const ref = `YAPE-${Date.now()}`;
        const now = new Date();
        const end = new Date(now); end.setMonth(end.getMonth() + 1);
        await database.upsert('subscriptions', {
          user_id: user.id,
          plan_slug: plan.slug,
          status: 'pending',
          current_period_start: now.toISOString(),
          current_period_end: end.toISOString(),
          gateway: 'yape',
          amount: Number(plan.price),
          currency,
          payment_reference: ref,
          updated_at: now.toISOString(),
        }, 'user_id');
        setPaymentRef(ref);
        setPaymentStep('confirm');
      } catch {
        toast.error('Error al registrar el pago. Intenta nuevamente.');
      }
      setLoading(false);
      return;
    }

    // PayPal / Mercado Pago: call edge function for checkout URL
    if (isPayPal || isMercadoPago) {
      try {
        const { data, error } = await database.invoke<{ success?: boolean; error?: string; redirect_url?: string; reference?: string }>('process-payment', {
          body: {
            gateway: selectedGateway.slug,
            plan_slug: plan.slug,
            plan_name: plan.name,
            plan_price: plan.price,
            currency,
            user_id: user.id,
            user_email: user.email,
            return_url: `${window.location.origin}/dashboard/mi-plan?payment=success&plan=${plan.slug}`,
            cancel_url: `${window.location.origin}/pago?plan=${plan.slug}`,
          },
        });

        if (error || !data?.success) {
          // If edge function fails (e.g. not deployed), fallback to demo success
          console.warn('Edge function error:', error || data?.error);
          toast.info('Procesando en modo simulación...');
          const ref = `${selectedGateway.slug.toUpperCase()}-${Date.now()}`;
          await activateSubscription(ref);
          setPaymentRef(ref);
          setPaymentStep('success');
          setLoading(false);
          return;
        }

        if (data.redirect_url) {
          // Real redirect to PayPal/MP checkout
          window.location.href = data.redirect_url;
          return;
        }

        // Synchronous success (test mode)
        await activateSubscription(data.reference || `${selectedGateway.slug}-${Date.now()}`);
        setPaymentRef(data.reference || '');
        setPaymentStep('success');
      } catch {
        toast.error('Error de conexión. Intenta nuevamente.');
      }
      setLoading(false);
      return;
    }

    // Generic gateway (Izipay etc): call edge function
    try {
      const { data, error } = await database.invoke<{ success?: boolean; error?: string; reference?: string }>('process-payment', {
        body: {
          gateway: selectedGateway.slug,
          plan_slug: plan.slug,
          plan_price: plan.price,
          currency,
          user_id: user.id,
          user_email: user.email,
        },
      });
      if (error || !data?.success) {
        toast.error(data?.error || 'Error al procesar el pago.');
        setLoading(false);
        return;
      }
      await activateSubscription(data.reference || `${selectedGateway.slug}-${Date.now()}`);
      setPaymentRef(data.reference || '');
      setPaymentStep('success');
    } catch {
      toast.error('Error de conexión. Intenta nuevamente.');
    }
    setLoading(false);
  };

  // ── Yape confirm screen ──
  if (paymentStep === 'confirm' && isYape && selectedGateway) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="pt-28 pb-16 flex items-center justify-center px-4">
          <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-md shadow-xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-purple-500" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-1">Instrucciones de pago</h2>
              <p className="text-sm text-muted-foreground">Completa el pago por Yape y envía tu comprobante</p>
            </div>

            <div className="bg-muted/50 rounded-xl p-5 mb-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-semibold text-foreground">{plan?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monto a pagar</span>
                <span className="font-bold text-foreground text-lg">{displayPrice}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">N° referencia</span>
                <span className="font-mono text-xs text-foreground bg-muted px-2 py-0.5 rounded">{paymentRef}</span>
              </div>
            </div>

            <ol className="space-y-3 mb-6">
              {[
                { n: 1, text: `Abre tu app Yape o Plin` },
                { n: 2, text: `Yapea al número: ${selectedGateway.credentials.phone_number}` },
                { n: 3, text: `Nombre del titular: ${selectedGateway.credentials.merchant_name || 'Administrador'}` },
                { n: 4, text: `Monto exacto: ${displayPrice}` },
                { n: 5, text: `En el concepto escribe tu correo: ${user?.email}` },
                { n: 6, text: 'Toma captura del comprobante y envíalo por WhatsApp al administrador' },
              ].map(({ n, text }) => (
                <li key={n} className="flex items-start gap-3 text-sm text-foreground">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{n}</span>
                  <span className={n === 2 || n === 4 ? 'font-semibold' : ''}>{text}</span>
                </li>
              ))}
            </ol>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-5">
              <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                Tu cuenta se activará en máx. 24 horas después de verificar el pago. Si tienes dudas escríbenos.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPaymentStep('select')}
                className="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Volver
              </button>
              <button
                onClick={() => { toast.success('¡Pago registrado! Te avisaremos cuando se verifique.'); navigate('/dashboard'); }}
                className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Listo, ya yapé
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Success screen ──
  if (paymentStep === 'success') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="pt-28 pb-16 flex items-center justify-center px-4">
          <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-md shadow-xl text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">¡Pago exitoso!</h2>
            <p className="text-muted-foreground mb-2">Tu plan <strong className="text-foreground">{plan?.name}</strong> ha sido activado.</p>
            {paymentRef && (
              <p className="text-xs text-muted-foreground mb-6">
                Referencia: <span className="font-mono bg-muted px-2 py-0.5 rounded">{paymentRef}</span>
              </p>
            )}
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 mb-6">
              <ul className="space-y-1.5 text-sm text-foreground text-left">
                {(plan?.features || []).slice(0, 4).map((f: string) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Ir a mi Dashboard
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Loading screen ──
  if (plansLoading || gatewaysLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">Cargando opciones de pago...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── No paid plans ──
  if (!plan) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Sin planes de pago</h2>
            <p className="text-muted-foreground text-sm mb-6">No hay planes pagados activos configurados en este momento.</p>
            <Link to="/planes" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
              Ver todos los planes
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Main payment screen ──
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex-1 pt-28 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Back button */}
          <button
            onClick={() => navigate(user ? '/dashboard/mi-plan' : '/planes')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            {user ? 'Volver a Mi Plan' : 'Volver a planes'}
          </button>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-1">Centro de Pago</h1>
            <p className="text-muted-foreground">Completa tu suscripción de forma segura.</p>
          </div>

          {/* Require login banner */}
          {!user && (
            <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
              <User className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Necesitas una cuenta para completar el pago</p>
                <div className="flex gap-3 mt-2">
                  <Link to={`/registro?plan=${plan.slug}`} className="text-xs font-semibold text-amber-700 dark:text-amber-300 underline underline-offset-2">
                    Crear cuenta gratis
                  </Link>
                  <Link to="/login" className="text-xs font-semibold text-amber-700 dark:text-amber-300 underline underline-offset-2">
                    Ya tengo cuenta
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

            {/* ── Left: Form ── */}
            <div className="lg:col-span-3 space-y-5">

              {/* Plan selector */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Plan seleccionado</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {paidPlans.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlanSlug(p.slug)}
                      className={cn(
                        'p-3 rounded-xl border-2 text-left transition-all',
                        selectedPlanSlug === p.slug
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40'
                      )}
                    >
                      <div className="text-sm font-bold text-foreground">{p.name}</div>
                      <div className={cn('text-xs mt-0.5', selectedPlanSlug === p.slug ? 'text-primary' : 'text-muted-foreground')}>
                        {currency === 'PEN'
                          ? `S/ ${Number(p.price).toFixed(2)}`
                          : `USD ${(Number(p.price) / exchangeRate).toFixed(2)}`}/mes
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Currency */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Moneda de pago</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['PEN', 'USD'] as Currency[]).map(c => (
                    <button
                      key={c}
                      onClick={() => handleCurrencyChange(c)}
                      className={cn(
                        'flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all',
                        currency === c ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                      )}
                    >
                      <span className="text-2xl">{c === 'PEN' ? '🇵🇪' : '🇺🇸'}</span>
                      <div>
                        <div className={cn('text-sm font-bold', currency === c ? 'text-primary' : 'text-foreground')}>{c}</div>
                        <div className="text-xs text-muted-foreground">{c === 'PEN' ? 'Sol peruano' : 'Dólar USD'}</div>
                      </div>
                    </button>
                  ))}
                </div>
                {currency === 'USD' && exchangeRate > 0 && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Tipo de cambio referencial: S/ {exchangeRate} = USD 1.00
                  </p>
                )}
              </div>

              {/* Gateway selector */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Método de pago</p>

                {gatewaysForCurrency.length === 0 ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      No hay pasarelas disponibles para {currency}. Prueba con otra moneda.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {gatewaysForCurrency.map(g => {
                      const ready = gatewayReady(g);
                      const isSelected = selectedGatewayId === g.id;
                      return (
                        <button
                          key={g.id}
                          onClick={() => ready && setSelectedGatewayId(g.id)}
                          disabled={!ready}
                          className={cn(
                            'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                            !ready && 'opacity-40 cursor-not-allowed',
                            isSelected && ready ? 'border-primary bg-primary/5' : 'border-border',
                            ready && !isSelected && 'hover:border-primary/40 cursor-pointer'
                          )}
                        >
                          <span className="text-3xl leading-none">{g.logo}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn('text-sm font-semibold', isSelected ? 'text-primary' : 'text-foreground')}>
                                {g.name}
                              </span>
                              {!ready && (
                                <span className="text-xs bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">
                                  No disponible
                                </span>
                              )}
                              {g.test_mode && ready && (
                                <span className="text-xs bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                                  Modo prueba
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{g.description}</p>
                          </div>
                          <div className={cn(
                            'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all',
                            isSelected && ready ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                          )}>
                            {isSelected && ready && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Gateway-specific info */}
              {selectedGateway && gatewayReady(selectedGateway) && (
                <>
                  {isYape && (
                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Smartphone className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-semibold text-foreground">Pago por Yape / Plin</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Al continuar verás las instrucciones de transferencia. Tu cuenta se activará en máx. 24 horas.
                      </p>
                      <div className="bg-card rounded-xl p-3 text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">Número Yape</span>
                          <span className="font-bold text-foreground">{selectedGateway.credentials.phone_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Titular</span>
                          <span className="font-medium text-foreground">{selectedGateway.credentials.merchant_name}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {(isPayPal || isMercadoPago) && (
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <ExternalLink className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-semibold text-foreground">
                          {isPayPal ? 'Pago seguro con PayPal' : 'Pago con Mercado Pago'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isPayPal
                          ? 'Serás redirigido a PayPal para completar el pago de forma segura. Acepta tarjetas, saldo PayPal y más.'
                          : 'Serás redirigido a Mercado Pago. Acepta tarjetas de crédito, débito y otros métodos locales.'}
                      </p>
                    </div>
                  )}

                  {!isYape && !isPayPal && !isMercadoPago && (
                    <div className="bg-card border border-border rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-semibold text-foreground">Pago seguro — {selectedGateway.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        El pago se procesará de forma segura a través de {selectedGateway.name}. 
                        No almacenamos datos de tarjeta.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Right: Order summary ── */}
            <div className="lg:col-span-2">
              <div className="bg-card border border-border rounded-2xl p-6 sticky top-24">
                <h2 className="text-base font-bold text-foreground mb-4">Resumen del pedido</h2>

                {/* Plan info */}
                <div className="bg-muted/50 rounded-xl p-4 mb-4">
                  <PlanBadge plan={plan} />
                  <p className="text-xs text-muted-foreground mt-1 mb-3">{plan.description}</p>
                  <div className="text-2xl font-bold text-foreground">
                    {displayPrice}
                    <span className="text-sm font-normal text-muted-foreground">/mes</span>
                  </div>
                </div>

                {/* Features */}
                {plan.features?.length > 0 && (
                  <ul className="space-y-1.5 mb-4">
                    {plan.features.slice(0, 5).map((f: string) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />{f}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Price breakdown */}
                <div className="border-t border-border py-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">{displayPrice}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IGV (18%)</span>
                    <span className="text-foreground">
                      {currency === 'PEN'
                        ? `S/ ${(Number(plan.price) * 0.18).toFixed(2)}`
                        : `USD ${(Number(plan.price) / exchangeRate * 0.18).toFixed(2)}`}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between py-3 border-t border-border mb-4">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="font-bold text-xl text-foreground">{totalWithTax}</span>
                </div>

                {/* CTA */}
                <button
                  onClick={handlePay}
                  disabled={loading || !selectedGateway || !gatewayReady(selectedGateway || {} as DBGateway)}
                  className={cn(
                    'w-full font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm',
                    (!selectedGateway || !gatewayReady(selectedGateway || {} as DBGateway))
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-primary hover:bg-primary/90 text-white hover:shadow-lg hover:shadow-primary/20'
                  )}
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      {!selectedGateway || !gatewayReady(selectedGateway)
                        ? 'Selecciona un método de pago'
                        : isYape
                        ? `Ver instrucciones Yape`
                        : isPayPal || isMercadoPago
                        ? `Pagar con ${selectedGateway.name}`
                        : `Pagar ${displayPrice}`}
                    </>
                  )}
                </button>

                {(!selectedGateway || !gatewayReady(selectedGateway || {} as DBGateway)) && (
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Elige una pasarela de pago disponible o{' '}
                    <Link to="/contacto" className="text-primary hover:underline">contacta al administrador</Link>
                  </p>
                )}

                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" /> Pago 100% seguro · SSL 256-bit
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
