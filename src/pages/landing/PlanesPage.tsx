import { useSearchParams, useNavigate } from '@/lib/router';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { CircleCheck as CheckCircle, ArrowRight, Sparkles, X } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <section className="pt-28 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {isSelectMode && (
            <div className="mb-8 bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground text-sm">Bienvenido a MLM 360</div>
                <div className="text-xs text-muted-foreground">Tu cuenta fue creada. Elige un plan para comenzar.</div>
              </div>
            </div>
          )}

          <div className="text-center mb-12">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Planes</span>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mt-2 mb-3">Elige tu plan</h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">Sin costos ocultos. Puedes cambiar de plan en cualquier momento.</p>
          </div>

          {/* ── Plans Grid: Compact cards ─────────────────────────────────────────── */}
          <div className={cn(
            'grid gap-4 mb-12',
            sortedPlans.length <= 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          )}>
            {sortedPlans.map(plan => {
              const isFree = plan.is_free || Number(plan.price) === 0;
              const isCurrent = user && (user as any).plan === plan.slug;
              const isLoading = activating === plan.slug;

              return (
                <div key={plan.id} className={cn(
                  'bg-card rounded-xl p-6 flex flex-col relative',
                  plan.is_popular ? 'border-2 border-primary ring-4 ring-primary/10' : 'border border-border hover:border-primary/30'
                )}>
                  {plan.badge && (
                    <div className={cn(
                      'absolute -top-2.5 left-4 text-xs font-bold px-3 py-1 rounded-full',
                      plan.is_popular ? 'bg-primary text-white' : 'bg-amber-500 text-white'
                    )}>{plan.badge}</div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-2.5 right-4 text-xs font-bold px-3 py-1 rounded-full bg-green-500 text-white">Actual</div>
                  )}

                  <div className="mb-4">
                    <h3 className="font-bold text-foreground text-lg">{plan.name}</h3>
                    {plan.description && <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>}
                  </div>

                  <div className="mb-4">
                    <span className="text-3xl font-bold text-foreground">
                      {isFree ? 'Gratis' : formatPrice(plan.price, currency, currencySymbol, exchangeRate)}
                    </span>
                    {!isFree && <span className="text-sm text-muted-foreground font-normal">/mes</span>}
                    {plan.trial_days > 0 && <span className="text-xs text-green-600 block mt-1">{plan.trial_days} días de prueba</span>}
                  </div>

                  <ul className="space-y-1.5 mb-6 flex-1">
                    {(plan.features || []).slice(0, 5).map((f: string) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />{f}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <div className="text-center text-sm font-medium text-green-600 py-2.5 border border-green-500/30 rounded-lg bg-green-500/5">Tu plan actual</div>
                  ) : (
                    <button onClick={() => handleSelectPlan(plan)} disabled={isLoading}
                      className={cn(
                        'w-full py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2',
                        plan.is_popular
                          ? 'bg-primary text-white hover:bg-primary/90'
                          : 'border border-border hover:bg-muted text-foreground',
                        isLoading && 'opacity-60'
                      )}>
                      {isLoading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : null}
                      {user ? (isFree ? 'Activar gratis' : 'Adquirir') : 'Comenzar'}
                      {!isLoading && <ArrowRight className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Comparison Table: Dense, scannable ───────────────────────────────── */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Comparativa</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Característica</th>
                    {sortedPlans.map(p => (
                      <th key={p.id} className="text-center px-4 py-3 font-semibold text-foreground whitespace-nowrap">{p.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="px-5 py-3 text-muted-foreground">Precio</td>
                    {sortedPlans.map(p => (
                      <td key={p.id} className="text-center px-4 py-3 font-medium">
                        {p.is_free || Number(p.price) === 0 ? 'Gratis' : formatPrice(p.price, currency, currencySymbol, exchangeRate)}
                      </td>
                    ))}
                  </tr>
                  {sortedPlans[0]?.features?.map((feature: string, idx: number) => (
                    <tr key={idx} className={cn('border-b border-border/50', idx % 2 === 1 && 'bg-muted/20')}>
                      <td className="px-5 py-3 text-muted-foreground">{feature}</td>
                      {sortedPlans.map(p => {
                        const has = p.features?.includes(feature);
                        return (
                          <td key={p.id} className="text-center px-4 py-3">
                            {has ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-3 h-3 text-muted-foreground/40 mx-auto" />}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
