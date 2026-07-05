import { useSearchParams, useNavigate } from '@/lib/router';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { CircleCheck as CheckCircle, X, ArrowRight, Sparkles } from 'lucide-react';
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
    <div className="h-screen bg-background overflow-y-auto overflow-x-hidden">
      <Navbar />
      <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {isSelectMode && (
              <div className="mb-10 bg-primary/10 border border-primary/30 rounded-2xl p-5 flex items-start gap-4 max-w-2xl mx-auto">
                <Sparkles className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-base font-bold text-foreground mb-1">Bienvenido a MLM 360</h2>
                  <p className="text-sm text-muted-foreground">Tu cuenta fue creada. Elige un plan para comenzar a construir tu red.</p>
                </div>
              </div>
            )}

            <div className="text-center mb-16">
              <h1 className="text-5xl font-bold text-foreground mb-4">Planes MLM 360</h1>
              <p className="text-xl text-muted-foreground">Elige el plan perfecto para tu etapa de crecimiento.</p>
            </div>

            <div className={cn(
              'grid gap-6 max-w-6xl mx-auto mb-20',
              sortedPlans.length <= 3 ? 'grid-cols-1 md:grid-cols-3' :
              sortedPlans.length === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' :
              'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            )}>
              {sortedPlans.map(plan => {
                const isFree = plan.is_free || Number(plan.price) === 0;
                const isCurrent = user && (user as any).plan === plan.slug;
                const isLoading = activating === plan.slug;

                return (
                  <div key={plan.id} className={cn(
                    'bg-card border-2 rounded-2xl p-7 relative transition-all flex flex-col',
                    plan.is_popular ? 'border-primary shadow-xl shadow-primary/10 lg:scale-105' : 'border-border hover:border-primary/30 hover:shadow-lg'
                  )}>
                    {plan.badge && (
                      <div className={cn(
                        'absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap',
                        plan.is_popular ? 'bg-primary text-white' : 'bg-amber-500 text-white'
                      )}>
                        {plan.badge}
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute -top-3.5 right-4 text-xs font-bold px-3 py-1.5 rounded-full bg-green-500 text-white">
                        Plan Actual
                      </div>
                    )}

                    <h3 className="text-xl font-bold text-foreground mb-1">{plan.name}</h3>
                    {plan.description && <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>}
                    <div className="text-3xl font-bold text-foreground mb-4">
                      {isFree ? 'Gratis' : formatPrice(plan.price, currency, currencySymbol, exchangeRate)}
                      {!isFree && <span className="text-sm font-normal text-muted-foreground">/mes</span>}
                    </div>

                    <div className="flex-1">
                      {isCurrent ? (
                        <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold mb-5 bg-green-500/10 text-green-600 border border-green-500/30">
                          <CheckCircle className="w-4 h-4" /> Tu plan actual
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSelectPlan(plan)}
                          disabled={isLoading}
                          className={cn(
                            'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold mb-5 transition-colors disabled:opacity-60',
                            plan.is_popular
                              ? 'bg-primary text-white hover:bg-primary/90'
                              : 'border border-border hover:bg-muted text-foreground'
                          )}
                        >
                          {isLoading ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              {user ? (isFree ? 'Activar gratis' : 'Adquirir plan') : 'Comenzar'}
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      )}

                      <ul className="space-y-2">
                        {plan.features.map((f: string) => (
                          <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                            <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comparison table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">Comparativa de planes</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Característica</th>
                      {sortedPlans.map(p => (
                        <th key={p.id} className="text-center px-4 py-4 text-sm font-semibold text-foreground whitespace-nowrap">{p.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="px-6 py-3.5 text-sm text-foreground">Precio mensual</td>
                      {sortedPlans.map(p => (
                        <td key={p.id} className="px-4 py-3.5 text-center text-sm font-medium text-foreground">
                          {p.is_free || Number(p.price) === 0 ? 'Gratis' : formatPrice(p.price, currency, currencySymbol, exchangeRate)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/50 bg-muted/20">
                      <td className="px-6 py-3.5 text-sm text-foreground">Días de prueba</td>
                      {sortedPlans.map(p => (
                        <td key={p.id} className="px-4 py-3.5 text-center text-sm text-foreground">{p.trial_days || 0}</td>
                      ))}
                    </tr>
                    {sortedPlans[0]?.features?.map((feature: string, idx: number) => (
                      <tr key={idx} className={cn('border-b border-border/50', idx % 2 === 0 ? '' : 'bg-muted/20')}>
                        <td className="px-6 py-3.5 text-sm text-foreground">{feature}</td>
                        {sortedPlans.map(p => {
                          const has = p.features?.includes(feature);
                          return (
                            <td key={p.id} className="px-4 py-3.5 text-center">
                              {has
                                ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                                : <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                              }
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
