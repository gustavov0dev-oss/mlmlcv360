import { Link } from '@/lib/router';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { testimonials, faqItems } from '@/lib/mockData';
import { ArrowRight, CircleCheck as CheckCircle, Star, ChevronDown, Shield, Zap, Globe, Award, GitBranch, DollarSign, ChartBar as BarChart3, TrendingUp, Users, Lock, ShoppingBag, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useConfig, formatPrice } from '@/store/configStore';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/store/cartStore';
import type { Product, ProductCategory } from '@/lib/storeTypes';
import ProductCard from '@/components/store/ProductCard';

const benefits = [
  { icon: GitBranch, title: 'Árbol Genealógico', desc: 'Visualiza y gestiona tu red en tiempo real con zoom, búsqueda y expansión multinivel.', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { icon: DollarSign, title: 'Comisiones Automáticas', desc: 'Sistema binario y unilevel calculado en tiempo real. Cobro quincenal sin trámites.', color: 'text-green-500', bg: 'bg-green-500/10' },
  { icon: Award, title: 'Sistema de Rangos', desc: '6 rangos de Bronce a Corona con bonos exclusivos, viajes y reconocimientos.', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { icon: BarChart3, title: 'Reportes en Tiempo Real', desc: 'Dashboards con gráficos avanzados. Exporta reportes personalizados en PDF o Excel.', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { icon: ShoppingBag, title: 'Tienda Integrada', desc: 'Vende productos físicos y digitales. Comisiones MLM automáticas en cada compra.', color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { icon: Globe, title: 'Multi-moneda', desc: 'Soporte para Soles y USD con tipo de cambio en tiempo real via Fixer.io.', color: 'text-teal-500', bg: 'bg-teal-500/10' },
];

const stats = [
  { label: 'Afiliados activos', value: '12,540+', icon: Users },
  { label: 'Comisiones pagadas', value: 'S/ 2.8M+', icon: DollarSign },
  { label: 'Países con presencia', value: '8 países', icon: Globe },
  { label: 'Crecimiento anual', value: '340%', icon: TrendingUp },
];

// ── Store section embedded in landing ──────────────────────────────────────
function StoreSection() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCat, setActiveCat] = useState('');
  const [loading, setLoading] = useState(true);
  const { itemCount } = useCart();

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from('product_categories').select('*').eq('status','active').order('sort_order').limit(10),
      supabase.from('products').select('*, category:product_categories(id,name,slug), variants:product_variants(id,price,stock,attributes,status)').eq('status','active').order('sort_order').limit(12),
    ]);
    setCategories(cats || []);
    setProducts((prods as Product[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = activeCat
    ? products.filter(p => p.category_id === activeCat)
    : products;

  if (!loading && products.length === 0) return null;

  return (
    <section className="py-20 lg:py-24 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <span className="text-primary text-xs font-bold uppercase tracking-widest">Tienda MLM360</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">Productos que generan comisiones</h2>
            <p className="text-muted-foreground mt-2 text-sm">Cada compra activa comisiones automáticas para toda tu red</p>
          </div>
          <Link to="/tienda"
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 whitespace-nowrap self-start sm:self-auto">
            <ShoppingBag className="w-4 h-4" /> Ver toda la tienda
            {itemCount > 0 && <span className="bg-white/30 text-white text-xs font-black px-1.5 py-0.5 rounded-full">{itemCount}</span>}
          </Link>
        </div>

        {/* Category carousel */}
        {categories.length > 0 && (
          <div className="mb-8">
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
              {/* All products pill */}
              <button
                onClick={() => setActiveCat('')}
                className={cn(
                  'flex-shrink-0 flex flex-col items-center gap-2 group transition-all',
                )}
              >
                <div className={cn(
                  'w-16 h-16 rounded-2xl flex items-center justify-center transition-all border-2',
                  activeCat === ''
                    ? 'bg-primary border-primary shadow-lg shadow-primary/30 scale-105'
                    : 'bg-card border-border hover:border-primary/50 hover:scale-105'
                )}>
                  <ShoppingBag className={cn('w-6 h-6', activeCat === '' ? 'text-white' : 'text-muted-foreground')} />
                </div>
                <span className={cn('text-[11px] font-bold text-center leading-tight max-w-[72px]',
                  activeCat === '' ? 'text-primary' : 'text-muted-foreground')}>
                  Todos
                </span>
              </button>

              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(activeCat === cat.id ? '' : cat.id)}
                  className="flex-shrink-0 flex flex-col items-center gap-2 group transition-all"
                >
                  <div className={cn(
                    'w-16 h-16 rounded-2xl overflow-hidden transition-all border-2',
                    activeCat === cat.id
                      ? 'border-primary shadow-lg shadow-primary/25 scale-105'
                      : 'border-border hover:border-primary/50 hover:scale-105'
                  )}>
                    {cat.image_url ? (
                      <img src={cat.image_url} alt={cat.name}
                        className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <span className={cn('text-[11px] font-bold text-center leading-tight max-w-[72px] line-clamp-2',
                    activeCat === cat.id ? 'text-primary' : 'text-muted-foreground')}>
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Products grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-muted" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-5 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.slice(0, 8).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {filtered.length > 8 && (
          <div className="text-center mt-8">
            <Link to="/tienda"
              className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-xl text-sm font-semibold hover:bg-muted hover:border-primary/40 transition-all text-foreground">
              Ver {filtered.length - 8} productos más <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { plans: allPlans, ranks, currency, currencySymbol, exchangeRate } = useConfig();
  const plans = allPlans.filter(p => p.is_active);
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative min-h-[92vh] flex items-center pt-16">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] translate-x-1/3 -translate-y-1/4" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] -translate-x-1/4 translate-y-1/4" />
          <div className="absolute inset-0 bg-grid opacity-[0.04] mask-radial" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-primary text-xs font-semibold mb-6 tracking-wide uppercase">
                <Zap className="w-3 h-3" />
                Sistema MLM Empresarial · Perú 2025
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] mb-5 tracking-tight">
                Construye tu red.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-blue-400">
                  Multiplica tus ingresos.
                </span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
                La plataforma MLM más completa del Perú. Gestiona tu red de afiliados, automatiza comisiones y escala tu negocio desde un solo lugar.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <Link to={user ? "/dashboard" : "/registro"} className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25 text-sm">
                  {user ? "Ir a mi panel" : "Comenzar gratis"}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/tienda" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-border text-foreground font-medium rounded-xl hover:bg-muted transition-colors text-sm">
                  <ShoppingBag className="w-4 h-4" />
                  Ver tienda
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-green-500" /> SSL Seguro</div>
                <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-blue-500" /> INDECOPI Registrado</div>
                <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-primary" /> Sin contrato</div>
                <div className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-yellow-500" /> Setup en 5 min</div>
              </div>
            </div>

            <div className="relative hidden lg:block animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="relative bg-card border border-border rounded-2xl shadow-2xl overflow-hidden glow-primary">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 bg-background rounded-md px-3 py-1 text-xs text-muted-foreground">app.mlm360.pe/dashboard</div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: 'Ingresos', value: 'S/ 14,200', change: '+18%', color: 'text-blue-500 bg-blue-500/10' },
                      { label: 'Comisiones', value: 'S/ 5,150', change: '+22%', color: 'text-green-500 bg-green-500/10' },
                      { label: 'Afiliados', value: '128', change: '+12', color: 'text-purple-500 bg-purple-500/10' },
                      { label: 'Rango', value: 'Diamante', change: '💎', color: 'text-cyan-500 bg-cyan-500/10' },
                    ].map(item => (
                      <div key={item.label} className="bg-muted/60 rounded-xl p-3">
                        <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                        <div className="text-base font-bold text-foreground">{item.value}</div>
                        <div className={cn('text-xs font-medium mt-1 px-1.5 py-0.5 rounded-full inline-block', item.color)}>{item.change}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-muted/40 rounded-xl p-3">
                    <div className="text-xs text-muted-foreground mb-3">Ingresos últimas 8 semanas</div>
                    <div className="flex items-end gap-1.5 h-16">
                      {[35, 52, 48, 68, 55, 78, 65, 88].map((h, i) => (
                        <div key={i} className="flex-1 rounded-sm bg-primary/70 hover:bg-primary transition-colors" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-8 bg-card border border-border rounded-xl p-3 shadow-lg flex items-center gap-3 w-48">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">Nueva comisión</div>
                  <div className="text-xs text-green-500 font-bold">+ S/ 450.00</div>
                </div>
              </div>
              <div className="absolute -top-4 -right-6 bg-card border border-border rounded-xl p-3 shadow-lg flex items-center gap-3 w-44">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-base">💎</div>
                <div>
                  <div className="text-xs font-semibold text-foreground">Rango alcanzado</div>
                  <div className="text-xs text-primary font-bold">Diamante</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 pt-12 border-t border-border">
            {stats.map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">{s.value}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="py-20 lg:py-24 bg-muted/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-sm opacity-[0.03]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-14">
            <span className="text-primary text-xs font-bold uppercase tracking-widest">Por qué MLM 360</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">Todo lo que necesitas en un solo lugar</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Herramientas diseñadas para emprendedores que quieren construir negocios sólidos y escalables.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map((b) => (
              <div key={b.title} className="group bg-card border border-border rounded-2xl p-6 hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110', b.bg)}>
                  <b.icon className={cn('w-5 h-5', b.color)} />
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 lg:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-primary text-xs font-bold uppercase tracking-widest">El proceso</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">Empieza en 3 pasos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-[calc(33%+24px)] right-[calc(33%+24px)] h-0.5 bg-gradient-to-r from-primary/40 to-primary/40" />
            {[
              { n: '01', title: 'Crea tu cuenta', desc: 'Regístrate en menos de 5 minutos. Elige tu plan y personaliza tu perfil.', icon: '🚀' },
              { n: '02', title: 'Construye tu red', desc: 'Invita afiliados con tu código único. Gestiona tu estructura binaria fácilmente.', icon: '🌐' },
              { n: '03', title: 'Cobra tus comisiones', desc: 'Recibe pagos quincenales automáticos en tu cuenta bancaria o billetera digital.', icon: '💰' },
            ].map(step => (
              <div key={step.n} className="flex flex-col items-center text-center">
                <div className="relative mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl">{step.icon}</div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">{step.n.slice(1)}</div>
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RANKS ── */}
      <section className="py-20 lg:py-24 bg-muted/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-sm opacity-[0.03]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-14">
            <span className="text-primary text-xs font-bold uppercase tracking-widest">Sistema de rangos</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">Del Bronce a la Corona</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Cada nivel desbloquea bonos, beneficios y reconocimientos exclusivos.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {ranks.map(r => (
              <div key={r.id} className={cn('bg-card border-2 rounded-2xl p-5 text-center hover:shadow-lg transition-all hover:-translate-y-1 duration-300', r.border_color)}>
                <div className="text-3xl mb-3">{r.icon}</div>
                <div className={cn('text-sm font-bold mb-1', r.color)}>{r.name}</div>
                <div className="text-xs text-muted-foreground">Bono mensual</div>
                <div className="text-sm font-bold text-foreground mt-0.5">{formatPrice(r.bonus, currency, currencySymbol, exchangeRate)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANS ── */}
      <section className="py-20 lg:py-24" id="planes">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-primary text-xs font-bold uppercase tracking-widest">Planes</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">Invierte en tu crecimiento</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">Sin costos ocultos. Cancela en cualquier momento.</p>
          </div>
          <div className={cn('grid gap-6 max-w-5xl mx-auto',
            plans.length <= 3 ? 'grid-cols-1 md:grid-cols-3' :
            plans.length === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' :
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          )}>
            {plans.map(plan => {
              const isFree = plan.is_free || plan.price === 0;
              const isCurrent = user && (user as any).plan === plan.slug;
              return (
                <div key={plan.id} className={cn(
                  'relative bg-card rounded-2xl p-6 sm:p-7 flex flex-col transition-all hover:shadow-xl',
                  plan.is_popular ? 'border-2 border-primary shadow-xl shadow-primary/10 md:scale-[1.02]' : 'border border-border hover:border-primary/30'
                )}>
                  {plan.badge && (
                    <div className={cn('absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap',
                      plan.is_popular ? 'bg-primary text-white' : 'bg-amber-500 text-white')}>{plan.badge}</div>
                  )}
                  {isCurrent && <div className="absolute -top-3.5 right-4 text-xs font-bold px-3 py-1.5 rounded-full bg-green-500 text-white">Plan Actual</div>}
                  <div className="mb-5">
                    <h3 className="text-xl font-bold text-foreground mb-1">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-foreground">
                        {isFree ? 'Gratis' : formatPrice(plan.price, currency, currencySymbol, exchangeRate)}
                      </span>
                      {!isFree && <span className="text-muted-foreground text-sm">/mes</span>}
                    </div>
                    {plan.trial_days > 0 && <div className="text-xs text-green-600 mt-1">{plan.trial_days} días de prueba gratis</div>}
                  </div>
                  <ul className="space-y-2.5 flex-1 mb-6">
                    {plan.features.map((f: string) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />{f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-green-500/10 text-green-600 border border-green-500/30">
                      <CheckCircle className="w-4 h-4" /> Tu plan actual
                    </div>
                  ) : (
                    <Link to={user ? `/dashboard/mi-plan` : isFree ? `/registro?plan=${plan.slug}` : `/pago?plan=${plan.slug}`} className={cn(
                      'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors',
                      plan.is_popular ? 'bg-primary text-white hover:bg-primary/90' : 'border border-border hover:bg-muted text-foreground'
                    )}>
                      {user ? 'Cambiar plan' : 'Empezar con'} {plan.name} <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── STORE SECTION ── */}
      <StoreSection />

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 lg:py-24 bg-muted/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-sm opacity-[0.03]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-14">
            <span className="text-primary text-xs font-bold uppercase tracking-widest">Testimonios</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">Historias reales de éxito</h2>
            <p className="text-muted-foreground">Personas que transformaron su vida financiera con MLM 360.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.id} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5 italic">"{t.content}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-muted-foreground">Gana</div>
                    <div className="text-sm font-bold text-green-500">{t.earnings}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 lg:py-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-primary text-xs font-bold uppercase tracking-widest">FAQ</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-2">
            {faqItems.map((faq, i) => (
              <div key={i} className={cn('bg-card border rounded-xl overflow-hidden transition-colors', openFaq === i ? 'border-primary/40' : 'border-border')}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left gap-4">
                  <span className="text-sm font-semibold text-foreground">{faq.question}</span>
                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200', openFaq === i && 'rotate-180')} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5">
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-white/10 rounded-full blur-[100px]" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">¿Listo para transformar tu vida financiera?</h2>
          <p className="text-blue-100/80 text-base sm:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            Únete a más de 12,000 afiliados peruanos que ya están construyendo su libertad financiera.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={user ? "/dashboard" : "/registro"} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-xl">
              {user ? "Ir a mi panel" : "Crear cuenta gratis"} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/contacto" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 border-2 border-white/30 text-white font-medium rounded-xl hover:bg-white/10 transition-colors">
              Hablar con un asesor
            </Link>
          </div>
          <p className="mt-6 text-blue-200/60 text-sm">Sin contrato. Sin tarjeta de crédito. Comienza hoy.</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
