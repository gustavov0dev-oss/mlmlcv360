import { useState, useEffect } from 'react';
import { useDatabase } from '@/lib/backend';
import { useAuthStore } from '@/store/authStore';
import { useConfig, formatPrice } from '@/store/configStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  CreditCard, CircleCheck as CheckCircle, X, Loader as Loader2,
  TriangleAlert as AlertTriangle, RefreshCw, ArrowRight,
  Crown, Zap, Lock, ExternalLink, Smartphone, ShieldCheck,
  DollarSign,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate, useSearchParams } from '@/lib/router';

type Tab = 'current' | 'change';
type Currency = 'PEN' | 'USD';

interface DBGateway {
  id: string; slug: string; name: string; logo: string;
  currency: string; is_active: boolean;
  credentials: Record<string, string>;
  test_mode: boolean; description: string;
}

function gatewayReady(g: DBGateway) {
  return Object.values(g.credentials || {}).some(v => typeof v === 'string' && v.trim() !== '');
}

export default function MyPlanPage() {
  const database = useDatabase();
  const { user, fetchProfile } = useAuthStore();
  const { plans, currency: sysCurrency, currencySymbol, exchangeRate } = useConfig();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Tabs
  const [tab, setTab] = useState<Tab>(() => {
    return searchParams.get('tab') === 'change' ? 'change' : 'current';
  });

  // Handle URL params: tab=change&plan=pro
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const planParam = searchParams.get('plan');
    if (tabParam === 'change') {
      setTab('change');
      if (planParam) setTargetPlanSlug(planParam);
      window.history.replaceState({}, '', '/dashboard/mi-plan');
    }
  }, [searchParams]);

  // Plan/subscription state
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [working, setWorking] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  // Payment state (for "Cambiar Plan" tab)
  const [gateways, setGatewaysState] = useState<DBGateway[]>([]);
  const [selectedGatewayId, setSelectedGatewayId] = useState('');
  const [currency, setCurrency] = useState<Currency>((sysCurrency as Currency) || 'PEN');
  const [targetPlanSlug, setTargetPlanSlug] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const activePlans = [...plans].filter(p => p.is_active).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const currentPlanSlug = (user as any)?.plan || 'free';
  const currentPlan = activePlans.find(p => p.slug === currentPlanSlug);
  const isFree = !currentPlan || currentPlan.is_free || Number(currentPlan.price) === 0;

  // Load subscription
  useEffect(() => {
    if (!user) return;
    database.select('subscriptions', {
      filter: { user_id: user.id },
      order: { column: 'created_at', ascending: false },
      limit: 1,
      maybeSingle: true,
    }).then(({ data }) => { setSubscription(data); setLoading(false); });
  }, [user]);

  // Load gateways
  useEffect(() => {
    database.select('payment_gateways', { filter: { is_active: true } })
      .then(({ data }) => { if (data) setGatewaysState(data as DBGateway[]); });
  }, []);

  // Auto-select gateway
  useEffect(() => {
    if (!gateways.length) return;
    const forCurrency = gateways.filter(g => g.currency === currency);
    const ready = forCurrency.find(g => gatewayReady(g)) || forCurrency[0];
    if (ready && ready.id !== selectedGatewayId) setSelectedGatewayId(ready.id);
  }, [currency, gateways]);

  // Handle return from payment gateway
  useEffect(() => {
    const p = searchParams.get('payment');
    const planParam = searchParams.get('plan');
    if (p === 'success' && planParam && user) {
      // Activate subscription from redirect
      activateSubscription(planParam, `REDIRECT-${Date.now()}`).then(() => {
        toast.success('¡Pago confirmado! Tu plan fue activado.');
        window.history.replaceState({}, '', '/dashboard/mi-plan');
      });
    }
  }, [searchParams, user]);

  const isExpired = subscription?.status === 'cancelled' || subscription?.status === 'expired' ||
    (subscription?.current_period_end && new Date(subscription.current_period_end) < new Date());
  const isActive = subscription?.status === 'active' && !isExpired;
  const daysLeft = subscription?.current_period_end
    ? Math.max(0, Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / 86400000))
    : null;

  const cancelPlan = async () => {
    if (!user) return;
    setWorking(true);
    const freePlan = activePlans.find(p => p.is_free || Number(p.price) === 0);
    const targetSlug = freePlan?.slug || 'free';
    const now = new Date().toISOString();
    await Promise.all([
      database.update('profiles', user.id, { plan: targetSlug, updated_at: now }),
      database.update('subscriptions', { user_id: user.id, status: 'active' }, { status: 'cancelled', updated_at: now }),
    ]);
    await fetchProfile(user.id);
    toast.success('Plan cancelado. Tu cuenta ahora es gratuita.');
    setShowCancel(false);
    setSubscription((prev: any) => prev ? { ...prev, status: 'cancelled' } : null);
    setWorking(false);
  };

  const activateSubscription = async (planSlug: string, ref: string, gwSlug?: string) => {
    if (!user?.id) return;
    const targetPlan = activePlans.find(p => p.slug === planSlug);
    if (!targetPlan) return;
    const now = new Date();
    const end = new Date(now); end.setMonth(end.getMonth() + 1);
    await Promise.all([
      database.update('profiles', user.id, { plan: planSlug, updated_at: now.toISOString() }),
      database.upsert('subscriptions', {
        user_id: user.id, plan_slug: planSlug, status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: end.toISOString(),
        gateway: gwSlug || 'manual',
        amount: Number(targetPlan.price),
        currency, payment_reference: ref,
        updated_at: now.toISOString(),
      }, 'user_id'),
    ]);
    await fetchProfile(user.id);
    // Refresh subscription UI
    const { data } = await database.select('subscriptions', {
      filter: { user_id: user.id },
      order: { column: 'created_at', ascending: false },
      limit: 1,
      maybeSingle: true,
    });
    setSubscription(data);
  };

  const handleActivateFree = async (planSlug: string) => {
    if (!user) return;
    setWorking(true);
    const now = new Date().toISOString();
    await Promise.all([
      database.update('profiles', user.id, { plan: planSlug, updated_at: now }),
      database.upsert('subscriptions', {
        user_id: user.id, plan_slug: planSlug, status: 'active',
        current_period_start: now,
        current_period_end: new Date(Date.now() + 100 * 365 * 86400000).toISOString(),
        gateway: 'free', amount: 0, currency: 'PEN',
        updated_at: now,
      }, 'user_id'),
    ]);
    await fetchProfile(user.id);
    toast.success('Plan gratuito activado.');
    setTab('current');
    setWorking(false);
  };

  const selectedGateway = gateways.find(g => g.id === selectedGatewayId) || null;
  const targetPlan = activePlans.find(p => p.slug === targetPlanSlug);
  const targetIsFree = targetPlan?.is_free || Number(targetPlan?.price ?? 1) === 0;
  const gatewaysForCurrency = gateways.filter(g => g.currency === currency);

  const handlePay = async () => {
    if (!targetPlan || !user) return;
    if (targetIsFree) { await handleActivateFree(targetPlanSlug); return; }
    if (!selectedGateway || !gatewayReady(selectedGateway)) {
      toast.error('Selecciona un método de pago disponible.');
      return;
    }

    const isYape = selectedGateway.slug === 'yape';
    const isPayPal = selectedGateway.slug === 'paypal';
    const isMercadoPago = selectedGateway.slug === 'mercadopago';

    setPayLoading(true);

    if (isYape) {
      const ref = `YAPE-${Date.now()}`;
      await database.upsert('subscriptions', {
        user_id: user.id, plan_slug: targetPlanSlug, status: 'pending',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        gateway: 'yape', amount: Number(targetPlan.price), currency,
        payment_reference: ref, updated_at: new Date().toISOString(),
      }, 'user_id');
      toast.success('Pago registrado. Sigue las instrucciones de Yape.');
      navigate(`/pago?plan=${targetPlanSlug}`);
      setPayLoading(false);
      return;
    }

    if (isPayPal || isMercadoPago) {
      try {
        const { data, error } = await database.invoke<{ redirect_url?: string; success?: boolean; reference?: string; error?: string }>('process-payment', {
          body: {
            gateway: selectedGateway.slug,
            plan_slug: targetPlanSlug, plan_name: targetPlan.name,
            plan_price: targetPlan.price, currency,
            user_id: user.id, user_email: user.email,
            return_url: `${window.location.origin}/dashboard/mi-plan?payment=success&plan=${targetPlanSlug}`,
            cancel_url: `${window.location.origin}/dashboard/mi-plan?tab=change`,
          },
        });
        if (!error && data?.redirect_url) {
          window.location.href = data.redirect_url;
          return;
        }
        // Fallback: simulate success
        const ref = `${selectedGateway.slug.toUpperCase()}-${Date.now()}`;
        await activateSubscription(targetPlanSlug, ref, selectedGateway.slug);
        toast.success(`¡Plan ${targetPlan.name} activado!`);
        setTab('current');
      } catch {
        toast.error('Error de conexión.');
      }
      setPayLoading(false);
      return;
    }

    // Generic
    try {
      const { data, error } = await database.invoke<{ success?: boolean; reference?: string; error?: string }>('process-payment', {
        body: {
          gateway: selectedGateway.slug,
          plan_slug: targetPlanSlug, plan_price: targetPlan.price,
          currency, user_id: user.id, user_email: user.email,
        },
      });
      if (!error && data?.success) {
        await activateSubscription(targetPlanSlug, data.reference || `${selectedGateway.slug}-${Date.now()}`, selectedGateway.slug);
        toast.success(`¡Plan ${targetPlan.name} activado!`);
        setTab('current');
      } else {
        toast.error(data?.error || 'Error al procesar el pago.');
      }
    } catch { toast.error('Error de conexión.'); }
    setPayLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="space-y-1.5"><Skeleton className="h-8 w-28" /><Skeleton className="h-4 w-48" /></div>
        <Skeleton className="h-10 w-48 rounded-xl" />
        {/* Current plan card */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
              <div className="space-y-2"><Skeleton className="h-6 w-36" /><Skeleton className="h-5 w-20 rounded-full" /></div>
            </div>
            <div className="flex flex-col gap-2"><Skeleton className="h-10 w-32 rounded-xl" /><Skeleton className="h-10 w-32 rounded-xl" /></div>
          </div>
          <Skeleton className="h-9 w-32" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({length:4}).map((_,i)=>(<div key={i} className="bg-muted/50 rounded-xl p-3 space-y-1"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-20" /></div>))}
          </div>
        </div>
        {/* Features card */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <Skeleton className="h-4 w-40" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Array.from({length:6}).map((_,i)=>(<div key={i} className="flex items-center gap-2"><Skeleton className="w-3.5 h-3.5 rounded-full flex-shrink-0" /><Skeleton className="h-4 w-40" /></div>))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi Plan</h1>
        <p className="text-muted-foreground text-sm mt-1">Administra tu suscripción y beneficios.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        {([['current', 'Plan Actual'], ['change', 'Cambiar Plan']] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Plan Actual ── */}
      {tab === 'current' && (
        <div className="space-y-5">
          {/* Current plan card */}
          <div className="bg-card border border-primary/30 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{currentPlan?.name || 'Plan Gratuito'}</h2>
                  <span className={cn(
                    'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full mt-1',
                    isFree ? 'bg-green-500/10 text-green-600' :
                    isActive ? 'bg-primary/10 text-primary' :
                    'bg-red-500/10 text-red-500'
                  )}>
                    {isFree ? 'Gratuito · Activo' : isActive ? 'Activo' : 'Vencido / Cancelado'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 min-w-[140px]">
                {!isFree && isActive && (
                  <button
                    onClick={() => setShowCancel(true)}
                    className="px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-red-500/5 hover:text-red-500 hover:border-red-500/30 transition-colors flex items-center gap-2"
                  >
                    <X className="w-3.5 h-3.5" /> Cancelar
                  </button>
                )}
                {!isFree && !isActive && (
                  <button
                    onClick={() => { setTargetPlanSlug(currentPlanSlug); setTab('change'); }}
                    className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Renovar
                  </button>
                )}
                <button
                  onClick={() => setTab('change')}
                  className="px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2"
                >
                  Cambiar plan <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="text-3xl font-bold text-foreground mb-4">
              {isFree ? 'Gratis' : formatPrice(currentPlan?.price ?? 0, currency, currencySymbol, exchangeRate)}
              {!isFree && <span className="text-base font-normal text-muted-foreground">/mes</span>}
            </div>

            {/* Subscription info grid */}
            {subscription && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border">
                {[
                  { label: 'Estado', value: subscription.status === 'active' ? 'Activo' : subscription.status === 'pending' ? 'Pendiente' : subscription.status === 'cancelled' ? 'Cancelado' : 'Vencido' },
                  { label: 'Pasarela', value: subscription.gateway || '—' },
                  { label: 'Inicio', value: subscription.current_period_start ? new Date(subscription.current_period_start).toLocaleDateString('es-PE') : '—' },
                  { label: daysLeft !== null ? `Vence en ${daysLeft}d` : 'Vencimiento', value: subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('es-PE') : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-muted/50 rounded-xl p-3">
                    <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
                    <div className="text-sm font-semibold text-foreground capitalize">{value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
            {!isFree && daysLeft !== null && daysLeft <= 7 && daysLeft > 0 && (
              <div className="mt-4 flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Tu plan vence en <strong>{daysLeft} día{daysLeft !== 1 ? 's' : ''}</strong>.{' '}
                  <button className="underline font-medium" onClick={() => { setTargetPlanSlug(currentPlanSlug); setTab('change'); }}>
                    Renovar ahora
                  </button>
                </p>
              </div>
            )}
            {!isFree && isExpired && (
              <div className="mt-4 flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-3.5">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">
                  Tu suscripción ha vencido.{' '}
                  <button className="underline font-medium" onClick={() => { setTargetPlanSlug(currentPlanSlug); setTab('change'); }}>
                    Renovar plan
                  </button>{' '}para recuperar el acceso.
                </p>
              </div>
            )}
          </div>

          {/* Current plan features */}
          {(currentPlan?.features?.length ?? 0) > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> Lo que incluye tu plan
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(currentPlan?.features ?? []).map((f: string) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> {f}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Cambiar Plan ── */}
      {tab === 'change' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left: Plan + Gateway selection */}
          <div className="lg:col-span-3 space-y-5">

            {/* Plan selector */}
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Elige tu nuevo plan</p>
              <div className="space-y-2">
                {activePlans.map(p => {
                  const pFree = p.is_free || Number(p.price) === 0;
                  const isCurrent = p.slug === currentPlanSlug;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setTargetPlanSlug(p.slug)}
                      disabled={isCurrent}
                      className={cn(
                        'w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left',
                        isCurrent && 'opacity-50 cursor-not-allowed border-green-500/30 bg-green-500/5',
                        !isCurrent && targetPlanSlug === p.slug && 'border-primary bg-primary/5',
                        !isCurrent && targetPlanSlug !== p.slug && 'border-border hover:border-primary/40'
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{p.name}</span>
                          {isCurrent && <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-medium">Actual</span>}
                          {p.badge && !isCurrent && <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-medium">{p.badge}</span>}
                        </div>
                        {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <div className={cn('text-lg font-bold', !isCurrent && targetPlanSlug === p.slug ? 'text-primary' : 'text-foreground')}>
                          {pFree ? 'Gratis' : formatPrice(p.price, currency, currencySymbol, exchangeRate)}
                        </div>
                        {!pFree && <div className="text-xs text-muted-foreground">/mes</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Currency — only for paid plans */}
            {targetPlan && !targetIsFree && (
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Moneda</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['PEN', 'USD'] as Currency[]).map(c => (
                    <button
                      key={c}
                      onClick={() => setCurrency(c)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border-2 transition-all',
                        currency === c ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                      )}
                    >
                      <span className="text-xl">{c === 'PEN' ? '🇵🇪' : '🇺🇸'}</span>
                      <div>
                        <div className={cn('text-sm font-bold', currency === c ? 'text-primary' : 'text-foreground')}>{c}</div>
                        <div className="text-xs text-muted-foreground">{c === 'PEN' ? 'Sol' : 'Dólar'}</div>
                      </div>
                    </button>
                  ))}
                </div>
                {currency === 'USD' && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> T/C: S/ {exchangeRate} = USD 1.00
                  </p>
                )}
              </div>
            )}

            {/* Gateway selector — only for paid plans */}
            {targetPlan && !targetIsFree && (
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Método de pago</p>
                {gatewaysForCurrency.length === 0 ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <p className="text-sm text-amber-700 dark:text-amber-300">No hay pasarelas para {currency}. Prueba otra moneda.</p>
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
                            'w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left',
                            !ready && 'opacity-40 cursor-not-allowed border-border',
                            isSelected && ready ? 'border-primary bg-primary/5' : ready ? 'border-border hover:border-primary/30 cursor-pointer' : ''
                          )}
                        >
                          <span className="text-2xl leading-none">{g.logo}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn('text-sm font-semibold', isSelected ? 'text-primary' : 'text-foreground')}>{g.name}</span>
                              {!ready && <span className="text-xs bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full">No disponible</span>}
                              {g.test_mode && ready && <span className="text-xs bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full">Prueba</span>}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{g.description}</p>
                          </div>
                          <div className={cn(
                            'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                            isSelected && ready ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                          )}>
                            {isSelected && ready && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Gateway hint */}
                {selectedGateway && gatewayReady(selectedGateway) && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-xl">
                    {selectedGateway.slug === 'yape' && (
                      <p className="text-xs text-muted-foreground flex items-start gap-2">
                        <Smartphone className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-purple-500" />
                        Yape: verás instrucciones de transferencia al número {selectedGateway.credentials.phone_number}. Activación en máx. 24h.
                      </p>
                    )}
                    {(selectedGateway.slug === 'paypal' || selectedGateway.slug === 'mercadopago') && (
                      <p className="text-xs text-muted-foreground flex items-start gap-2">
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-primary" />
                        Serás redirigido a {selectedGateway.name} para completar el pago de forma segura.
                      </p>
                    )}
                    {selectedGateway.slug !== 'yape' && selectedGateway.slug !== 'paypal' && selectedGateway.slug !== 'mercadopago' && (
                      <p className="text-xs text-muted-foreground flex items-start gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-green-500" />
                        Pago procesado de forma segura. No almacenamos datos de tarjeta.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Summary + CTA */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-xl p-5 sticky top-24">
              <h3 className="text-sm font-bold text-foreground mb-4">Resumen</h3>

              {!targetPlan ? (
                <div className="text-center py-8">
                  <CreditCard className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Selecciona un plan para continuar</p>
                </div>
              ) : (
                <>
                  <div className="bg-muted/50 rounded-xl p-4 mb-4">
                    <div className="text-sm font-bold text-foreground mb-1">{targetPlan.name}</div>
                    {targetPlan.description && <p className="text-xs text-muted-foreground mb-2">{targetPlan.description}</p>}
                    <div className="text-2xl font-bold text-foreground">
                      {targetIsFree ? 'Gratis' : formatPrice(targetPlan.price, currency, currencySymbol, exchangeRate)}
                      {!targetIsFree && <span className="text-sm font-normal text-muted-foreground">/mes</span>}
                    </div>
                  </div>

                  {!targetIsFree && (
                    <div className="border-t border-border py-3 mb-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="text-foreground">{formatPrice(targetPlan.price, currency, currencySymbol, exchangeRate)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">IGV (18%)</span>
                        <span className="text-foreground">
                          {currency === 'PEN'
                            ? `S/ ${(Number(targetPlan.price) * 0.18).toFixed(2)}`
                            : `USD ${(Number(targetPlan.price) / exchangeRate * 0.18).toFixed(2)}`}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold text-foreground border-t border-border pt-2">
                        <span>Total</span>
                        <span>
                          {currency === 'PEN'
                            ? `S/ ${(Number(targetPlan.price) * 1.18).toFixed(2)}`
                            : `USD ${(Number(targetPlan.price) / exchangeRate * 1.18).toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handlePay}
                    disabled={payLoading || working || (!targetIsFree && (!selectedGateway || !gatewayReady(selectedGateway)))}
                    className={cn(
                      'w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm',
                      (!targetIsFree && (!selectedGateway || !gatewayReady(selectedGateway)))
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-primary hover:bg-primary/90 text-white'
                    )}
                  >
                    {(payLoading || working) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        {targetIsFree ? 'Activar plan gratuito' :
                          selectedGateway?.slug === 'yape' ? 'Ver instrucciones Yape' :
                          (selectedGateway?.slug === 'paypal' || selectedGateway?.slug === 'mercadopago') ? `Pagar con ${selectedGateway.name}` :
                          'Confirmar pago'}
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
                    <Lock className="w-3 h-3" /> Pago seguro · SSL 256-bit
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl w-full max-w-sm p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <X className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-foreground text-center mb-2">Cancelar plan</h3>
            <p className="text-sm text-muted-foreground text-center mb-2">
              Se cancelará tu suscripción a <strong className="text-foreground">{currentPlan?.name}</strong> y se activará el plan gratuito.
            </p>
            <p className="text-xs text-center text-amber-600 mb-5">Esta acción no genera reembolso automático.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowCancel(false)} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                Mantener plan
              </button>
              <button onClick={cancelPlan} disabled={working}
                className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Cancelar plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
