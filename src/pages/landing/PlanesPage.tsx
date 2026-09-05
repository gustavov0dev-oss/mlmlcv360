import { useSearchParams, useNavigate } from '@/lib/router';
import { CircleCheck as CheckCircle, ArrowRight, Sparkles, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfig, formatPrice } from '@/store/configStore';
import { useAuthStore } from '@/store/authStore';
import { useDatabase } from '@/lib/backend';
import { toast } from 'sonner';
import { useState } from 'react';

export default function PlanesPage() {
  const { plans, currency, currencySymbol, exchangeRate } = useConfig();
  const { user, fetchProfile } = useAuthStore();
  const database = useDatabase();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSelectMode = searchParams.get('select') === '1';
  const [activating, setActivating] = useState<string | null>(null);

  const sortedPlans = [...plans].filter(p => p.is_active).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const handleSelectPlan = async (plan: any) => {
    const isFree = plan.is_free || Number(plan.price) === 0;
    if (!user) { navigate(`/registro?plan=${plan.slug}`); return; }
    if (isFree) {
      setActivating(plan.slug);
      const now = new Date().toISOString();
      const endDate = new Date(Date.now() + 100 * 365 * 86400000).toISOString();
      await Promise.all([
        database.update('profiles', user.id, { plan: plan.slug, updated_at: now }),
        database.upsert('subscriptions', {
          user_id: user.id, plan_slug: plan.slug, status: 'active',
          current_period_start: now, current_period_end: endDate,
          gateway: 'free', amount: 0, currency: 'PEN', updated_at: now,
        }, 'user_id'),
      ]);
      await fetchProfile(user.id);
      toast.success(`Plan ${plan.name} activado`);
      navigate('/dashboard/mi-plan');
      setActivating(null);
      return;
    }
    navigate(`/dashboard/mi-plan?tab=change&plan=${plan.slug}`);
  };

  const featureRows = sortedPlans[0]?.features || [];

  return (
    <>
      {/* HERO */}
      <section className="relative pt-28 pb-10 sm:pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.25] mask-fade-top pointer-events-none dark:opacity-[0.1]" />
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[400px] rounded-full bg-primary/8 blur-[130px] pointer-events-none" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-widest mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            Planes
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight mb-4 leading-[1.1] max-w-2xl">
            Elige el plan <span className="text-gradient-animated">que crece contigo</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground/80 max-w-xl leading-relaxed">
            Sin costos ocultos. Comienza gratis y cambia de plan cuando tu negocio lo necesite.
          </p>

          {isSelectMode && (
            <div className="flex items-start gap-3 mt-8 pt-6 border-t border-border/20 max-w-xl">
              <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-foreground">Tu cuenta fue creada</div>
                <div className="text-xs text-muted-foreground/80">Elige un plan para comenzar a construir tu red.</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* PLANES */}
      <section className="py-10 sm:py-14">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={cn(
              'grid gap-x-8 gap-y-10 items-stretch',
              sortedPlans.length === 1
                ? 'grid-cols-1 max-w-sm'
                : sortedPlans.length === 2
                  ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl'
                  : sortedPlans.length === 3
                    ? 'grid-cols-1 sm:grid-cols-3'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
            )}
          >
            {sortedPlans.map((plan) => {
              const isFree = plan.is_free || Number(plan.price) === 0;
              const isCurrent = user && (user as any).plan === plan.slug;
              const isLoading = activating === plan.slug;

              return (
                <div
                  key={plan.id}
                  className={cn(
                    'pt-6 flex flex-col h-full',
                    plan.is_popular ? 'border-t-2 border-primary' : 'border-t border-border/50',
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {plan.badge && (
                      <span
                        className={cn(
                          'text-[11px] font-bold uppercase tracking-wider',
                          plan.is_popular ? 'text-primary' : 'text-amber-500',
                        )}
                      >
                        {plan.badge}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Tu plan actual
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground mt-1 mb-5">{plan.description}</p>
                  )}

                  <div className="mb-5">
                    <span className="text-3xl font-bold text-foreground tracking-tight">
                      {isFree ? 'Gratis' : formatPrice(plan.price, currency, currencySymbol, exchangeRate)}
                    </span>
                    {!isFree && <span className="text-sm text-muted-foreground ml-1">/mes</span>}
                    {plan.trial_days > 0 && (
                      <span className="text-xs text-primary block mt-1">{plan.trial_days} días de prueba</span>
                    )}
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {(plan.features || []).slice(0, 5).map((f: string) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <div className="text-center border border-border/50 rounded-lg py-2.5">
                      <span className="text-sm font-medium text-muted-foreground">Tu plan actual</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={isLoading}
                      className={cn(
                        'w-full py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2',
                        plan.is_popular
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'border border-border/60 text-foreground hover:bg-white/10',
                        isLoading && 'opacity-60',
                      )}
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          {user ? (isFree ? 'Activar gratis' : 'Adquirir') : 'Comenzar'}
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* COMPARATIVA */}
      {sortedPlans.length > 0 && (
        <section className="py-10 sm:py-14">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Comparativa</span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-8 max-w-xl">
              Compara <span className="text-gradient-animated">cada plan</span> en detalle
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-4 pr-4 font-medium text-muted-foreground/70 text-xs uppercase tracking-wide">
                      Característica
                    </th>
                    {sortedPlans.map((p) => (
                      <th
                        key={p.id}
                        className="text-center py-4 px-4 font-semibold text-foreground whitespace-nowrap"
                      >
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/20">
                    <td className="py-3.5 pr-4 text-muted-foreground">Precio</td>
                    {sortedPlans.map((p) => (
                      <td key={p.id} className="text-center px-4 py-3.5 font-medium text-foreground">
                        {p.is_free || Number(p.price) === 0
                          ? 'Gratis'
                          : formatPrice(p.price, currency, currencySymbol, exchangeRate)}
                      </td>
                    ))}
                  </tr>
                  {featureRows.map((feature: string, idx: number) => (
                    <tr key={idx} className="border-b border-border/20 last:border-b-0">
                      <td className="py-3.5 pr-4 text-muted-foreground">{feature}</td>
                      {sortedPlans.map((p) => {
                        const has = p.features?.includes(feature);
                        return (
                          <td key={p.id} className="text-center px-4 py-3.5">
                            {has ? (
                              <Check className="w-4 h-4 text-primary mx-auto" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-muted-foreground/30 mx-auto" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </>
  );
}