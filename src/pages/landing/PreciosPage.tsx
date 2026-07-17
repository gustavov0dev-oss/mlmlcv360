import { Link } from '@/lib/router';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { plans } from '@/lib/mockData';
import { CircleCheck as CheckCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PreciosPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <section className="pt-28 pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h1 className="text-5xl font-bold text-foreground mb-4">Precios transparentes</h1>
              <p className="text-xl text-muted-foreground">Sin costos ocultos. Cancela cuando quieras.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {plans.map(plan => (
                <div key={plan.id} className={cn(
                  'bg-card border-2 rounded-2xl p-7 relative transition-all hover:shadow-xl',
                  plan.id === 'pro' ? 'border-primary shadow-xl shadow-primary/10 scale-105' : 'border-border hover:border-primary/30'
                )}>
                  {plan.badge && (
                    <div className={cn('absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1.5 rounded-full', plan.id === 'pro' ? 'bg-primary text-white' : 'bg-amber-500 text-white')}>
                      {plan.badge}
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-foreground">S/ {plan.price}</span>
                    <span className="text-muted-foreground text-sm">/mes</span>
                  </div>
                  <Link to="/registro" className={cn('w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors mb-6', plan.id === 'pro' ? 'bg-primary text-white hover:bg-primary/90' : 'border border-border hover:bg-muted text-foreground')}>
                    Comenzar ahora <ArrowRight className="w-4 h-4" />
                  </Link>
                  <ul className="space-y-2.5">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-16 bg-card border border-border rounded-2xl p-8 max-w-3xl mx-auto text-center">
              <h3 className="text-2xl font-bold text-foreground mb-3">¿Necesitas un plan personalizado?</h3>
              <p className="text-muted-foreground mb-6">Para empresas con necesidades especiales, ofrecemos planes a medida.</p>
              <Link to="/contacto" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors">
                Contactar ventas <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      <Footer />
    </div>
  );
}
