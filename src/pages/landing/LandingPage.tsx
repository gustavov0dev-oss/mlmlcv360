import { Link } from '@/lib/router';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { testimonials, faqItems } from '@/lib/mockData';
import { ArrowRight, CircleCheck as CheckCircle, Star, ChevronDown, Shield, Zap, Globe, Award, DollarSign, TrendingUp, Users, Lock, ShoppingBag, Bell, ChartBar as BarChart2, Network, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useConfig, formatPrice } from '@/store/configStore';
import { useDatabase } from '@/lib/backend';
import { useCart } from '@/store/cartStore';
import type { Product, ProductCategory } from '@/lib/storeTypes';
import ProductCard from '@/components/store/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';

// ── Feature blocks ─────────────────────────────────────────────────────────────
const featureBlocks = [
  {
    label: 'Comisiones',
    title: 'Gana en múltiples niveles',
    desc: '7% comisión directa, 4% binaria y 2% unilevel. Todo calculado automáticamente, pagado cada 15 días sin demoras.',
    stats: [
      { value: '7%', label: 'Comisión directa' },
      { value: '4%', label: 'Binaria' },
      { value: '15d', label: 'Ciclo de pago' },
    ],
    icon: DollarSign,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    label: 'Red',
    title: 'Visualiza tu red en tiempo real',
    desc: 'Panel genealógico interactivo con zoom, búsqueda por nodo y estadísticas de rendimiento por afiliado. Control total de tu estructura.',
    stats: [
      { value: '∞', label: 'Niveles de profundidad' },
      { value: '360°', label: 'Vista completa' },
      { value: 'Live', label: 'Actualización' },
    ],
    icon: Network,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    label: 'Rangos',
    title: 'Sube de rango, recibe más bonos',
    desc: 'Sistema de rangos con bonos progresivos. Cada nivel desbloquea beneficios exclusivos: bonos en efectivo, viajes y reconocimientos.',
    stats: [
      { value: '4', label: 'Rangos activos' },
      { value: 'S/150', label: 'Primer bono' },
      { value: 'S/15K', label: 'Bono Corona' },
    ],
    icon: Award,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
];

// ── Store Section ─────────────────────────────────────────────────────────────
function StoreSection() {
  const database = useDatabase();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCat, setActiveCat] = useState('');
  const [loading, setLoading] = useState(true);
  const { itemCount } = useCart();

  const load = useCallback(async () => {
    setLoading(true);
    const [catsRes, prodsRes] = await Promise.all([
      database.select<ProductCategory>('product_categories', { filter: { status: 'active' }, order: { column: 'sort_order' }, limit: 8 }),
      database.select<Product>('products', { filter: { status: 'active' }, order: { column: 'sort_order' }, limit: 8 }),
    ]);
    setCategories((catsRes.data as ProductCategory[]) || []);
    setProducts((prodsRes.data as Product[]) || []);
    setLoading(false);
  }, [database]);

  useEffect(() => { load(); }, [load]);

  const filtered = activeCat ? products.filter(p => p.category_id === activeCat) : products;

  if (!loading && products.length === 0) return null;

  return (
    <section className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Tienda</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Compra y gana comisiones</h2>
            <p className="text-muted-foreground text-sm mt-1.5">Cada compra genera comisiones automáticas para tu red.</p>
          </div>
          <Link to="/tienda" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all shrink-0">
            Ver tienda completa <ArrowRight className="w-4 h-4" />
            {itemCount > 0 && <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">{itemCount}</span>}
          </Link>
        </div>

        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-6">
            <button onClick={() => setActiveCat('')} className={cn(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
              activeCat === '' ? 'bg-primary text-white' : 'bg-card border border-border hover:border-primary/50'
            )}>Todos</button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCat(activeCat === cat.id ? '' : cat.id)} className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                activeCat === cat.id ? 'bg-primary text-white' : 'bg-card border border-border hover:border-primary/50'
              )}>{cat.name}</button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl overflow-hidden"><Skeleton className="aspect-square" /></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.slice(0, 4).map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Dashboard mockup preview (hero right side) ────────────────────────────────
function DashboardPreview() {
  return (
    <div className="relative w-full max-w-[520px] mx-auto lg:ml-auto">
      {/* Main card */}
      <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Mini top bar */}
        <div className="bg-muted/60 border-b border-border px-4 py-2.5 flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <div className="flex-1 mx-4">
            <div className="bg-muted rounded-md px-3 py-1 text-[10px] text-muted-foreground text-center">app.mlm360.pe/dashboard</div>
          </div>
        </div>

        <div className="p-5">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Comisiones', value: 'S/ 3,240', trend: '+12%', color: 'text-green-500' },
              { label: 'Mi red', value: '48 afiliados', trend: '+3 hoy', color: 'text-blue-500' },
              { label: 'Rango', value: 'Platino', trend: '→ Diamante', color: 'text-amber-500' },
            ].map(s => (
              <div key={s.label} className="bg-muted/50 rounded-xl p-3">
                <div className="text-[10px] text-muted-foreground mb-1">{s.label}</div>
                <div className="text-sm font-bold text-foreground leading-tight">{s.value}</div>
                <div className={cn('text-[10px] font-medium mt-0.5', s.color)}>{s.trend}</div>
              </div>
            ))}
          </div>

          {/* Chart placeholder */}
          <div className="bg-muted/40 rounded-xl p-3 mb-4">
            <div className="flex items-end gap-1 h-12">
              {[30, 50, 40, 70, 55, 80, 65, 90, 75, 95, 85, 100].map((h, i) => (
                <div key={i} className={cn(
                  'flex-1 rounded-sm transition-all',
                  i === 11 ? 'bg-primary' : 'bg-primary/20'
                )} style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground mt-2">Comisiones — últimas 12 semanas</div>
          </div>

          {/* Recent activity */}
          <div className="space-y-2">
            {[
              { icon: DollarSign, text: 'Comisión binaria de Juan P.', val: '+S/120', color: 'text-green-500 bg-green-500/10' },
              { icon: Users, text: 'Nuevo afiliado en tu red', val: '+1', color: 'text-blue-500 bg-blue-500/10' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', item.color)}>
                  <item.icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs text-foreground flex-1">{item.text}</span>
                <span className="text-xs font-bold text-green-500">{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating pills */}
      <div className="absolute -top-4 -right-4 bg-card border border-green-500/30 rounded-xl px-3 py-2 shadow-lg animate-bounce" style={{ animationDuration: '3s' }}>
        <div className="flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-green-500" />
          <div>
            <div className="text-[10px] font-bold text-foreground">Comisión recibida</div>
            <div className="text-[10px] text-green-500 font-bold">+S/ 320.50</div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-4 -left-4 bg-card border border-amber-500/30 rounded-xl px-3 py-2 shadow-lg animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
        <div className="flex items-center gap-2">
          <Award className="w-3.5 h-3.5 text-amber-500" />
          <div>
            <div className="text-[10px] font-bold text-foreground">Nuevo rango</div>
            <div className="text-[10px] text-amber-500 font-bold">💎 Diamante</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Testimonials double infinite carousel ─────────────────────────────────────
const extendedTestimonials = [
  ...testimonials,
  {
    id: '4',
    name: 'Sandra Palomino',
    role: 'Emprendedora, Trujillo',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100',
    content: 'La automatización de comisiones me ahorró horas de trabajo manual. Ahora me enfoco en expandir mi red.',
    rank: 'platinum',
    earnings: 'S/ 6,100/mes',
  },
  {
    id: '5',
    name: 'Diego Ramírez',
    role: 'Profesional independiente, Piura',
    avatar: 'https://images.pexels.com/photos/1680172/pexels-photo-1680172.jpeg?auto=compress&cs=tinysrgb&w=100',
    content: 'Escalé de Bronce a Platino en 4 meses. El panel de reportes me ayuda a identificar qué parte de mi red necesita atención.',
    rank: 'platinum',
    earnings: 'S/ 5,500/mes',
  },
  {
    id: '6',
    name: 'Luciana Flores',
    role: 'Comerciante, Ica',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100',
    content: 'El soporte 24/7 es increíble. Tuve una duda un domingo y en 15 minutos tenía la respuesta. Eso genera mucha confianza.',
    rank: 'gold',
    earnings: 'S/ 3,800/mes',
  },
];

function TestimonialCard({ t }: { t: typeof testimonials[0] }) {
  return (
    <div className="w-[320px] shrink-0 bg-card border border-border rounded-2xl p-5 mx-2">
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">"{t.content}"</p>
      <div className="flex items-center gap-3 pt-3 border-t border-border">
        <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full object-cover" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground leading-tight">{t.name}</div>
          <div className="text-xs text-muted-foreground">{t.role}</div>
        </div>
        <div className="text-sm font-bold text-green-500 shrink-0">{t.earnings}</div>
      </div>
    </div>
  );
}

function TestimonialsCarousel() {
  const row1 = [...extendedTestimonials, ...extendedTestimonials];
  const row2 = [...extendedTestimonials, ...extendedTestimonials].reverse();

  return (
    <div className="relative overflow-hidden">
      {/* Left fade */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      {/* Row 1: left scroll */}
      <div className="flex mb-4" style={{ animation: 'marquee-left 40s linear infinite' }}>
        {row1.map((t, i) => <TestimonialCard key={`r1-${i}`} t={t} />)}
      </div>

      {/* Row 2: right scroll */}
      <div className="flex" style={{ animation: 'marquee-right 40s linear infinite' }}>
        {row2.map((t, i) => <TestimonialCard key={`r2-${i}`} t={t} />)}
      </div>
    </div>
  );
}

// ── Main Landing Page ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { plans: allPlans, ranks, currency, currencySymbol, exchangeRate } = useConfig();
  const plans = allPlans.filter(p => p.is_active);
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Carousel keyframes injected into <style> */}
      <style>{`
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>

      <Navbar />

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-24 overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/4 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-xs font-bold text-green-600 mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span>+12,540 afiliados activos en Latinoamérica</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-foreground leading-[1.1] tracking-tight mb-6">
                Construye tu red.<br />
                Cobra comisiones<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-primary bg-[length:200%_auto] animate-[gradient_4s_linear_infinite]">automáticamente.</span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed">
                MLM 360 es la plataforma multinivel que calcula, paga y visualiza tus comisiones en tiempo real. 7% directa, 4% binaria, pago cada 15 días.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <Link to={user ? '/dashboard' : '/registro'}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/25 text-sm">
                  {user ? 'Ir a mi Panel' : 'Empezar gratis'} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/planes"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-muted border border-border text-foreground font-medium rounded-xl hover:border-primary/40 transition-all text-sm">
                  Ver precios
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-5 text-xs text-muted-foreground">
                {[
                  { icon: Lock, text: 'SSL seguro', color: 'text-green-500' },
                  { icon: Shield, text: 'INDECOPI', color: 'text-blue-500' },
                  { icon: CheckCircle, text: 'Sin permanencia', color: 'text-primary' },
                  { icon: CreditCard, text: 'Pago cada 15 días', color: 'text-amber-500' },
                ].map(item => (
                  <span key={item.text} className="flex items-center gap-1.5">
                    <item.icon className={cn('w-3.5 h-3.5', item.color)} />
                    {item.text}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: dashboard preview */}
            <DashboardPreview />
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 pt-10 border-t border-border">
            {[
              { value: '12,540+', label: 'Afiliados activos', icon: Users, color: 'text-blue-500' },
              { value: 'S/ 2.8M+', label: 'Comisiones pagadas', icon: DollarSign, color: 'text-green-500' },
              { value: '8 países', label: 'Presencia regional', icon: Globe, color: 'text-primary' },
              { value: '+340%', label: 'Crecimiento anual', icon: TrendingUp, color: 'text-amber-500' },
            ].map(s => (
              <div key={s.label} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <s.icon className={cn('w-4 h-4', s.color)} />
                </div>
                <div>
                  <div className="text-xl font-bold text-foreground leading-tight">{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE BLOCKS ──────────────────────────────────────────────────── */}
      <section className="py-24 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Un sistema diseñado para <span className="text-primary">escalar</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Cada funcionalidad resuelve un problema real del negocio multinivel.</p>
          </div>

          <div className="space-y-6">
            {featureBlocks.map((block, i) => (
              <div key={block.label} className={cn(
                'bg-card border border-border rounded-2xl p-8 lg:p-10 grid lg:grid-cols-2 gap-8 items-center hover:border-primary/20 transition-all',
                i % 2 === 1 && 'lg:[&>*:first-child]:order-2'
              )}>
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', block.bg)}>
                      <block.icon className={cn('w-4 h-4', block.color)} />
                    </div>
                    <span className={cn('text-xs font-bold uppercase tracking-widest', block.color)}>{block.label}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">{block.title}</h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">{block.desc}</p>
                  <Link to={user ? '/dashboard' : '/registro'}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all">
                    {user ? 'Ver en mi panel' : 'Comenzar ahora'} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {block.stats.map(stat => (
                    <div key={stat.label} className="bg-muted/60 rounded-xl p-4 text-center">
                      <div className={cn('text-2xl font-bold mb-1', block.color)}>{stat.value}</div>
                      <div className="text-xs text-muted-foreground leading-tight">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">De cero a comisiones en minutos</h2>
            <p className="text-muted-foreground">Sin curva de aprendizaje. Sin configuraciones complicadas.</p>
          </div>

          <div className="relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-7 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-border" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { n: '1', title: 'Elige tu plan', desc: 'Free Trial, Pro o Elite. Cambia cuando quieras, sin penalización.', icon: BarChart2, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
                { n: '2', title: 'Invita con tu código', desc: 'Un enlace único. Tus referidos se suman automáticamente a tu red.', icon: Network, color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
                { n: '3', title: 'Recibe comisiones', desc: 'Cada 15 días directo a tu cuenta. Sin trámites, sin demoras.', icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/20' },
              ].map(step => (
                <div key={step.n} className="text-center relative">
                  <div className={cn('w-14 h-14 rounded-2xl border-2 flex items-center justify-center mx-auto mb-4 relative z-10', step.bg, 'bg-background')}>
                    <step.icon className={cn('w-6 h-6', step.color)} />
                  </div>
                  <div className="text-xs font-bold text-muted-foreground mb-1.5">PASO {step.n}</div>
                  <h3 className="font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── RANKS ───────────────────────────────────────────────────────────── */}
      {ranks.filter(r => r.is_active !== false).length > 0 && (
        <section className="py-24 bg-muted/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Award className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">Rangos</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Cada nivel, más beneficios</h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  El sistema de rangos premia tu crecimiento con bonos en efectivo progresivos. Desde el bono de bienvenida Bronce hasta el máximo Corona.
                </p>
                <Link to={user ? '/dashboard/rangos' : '/registro'}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all">
                  {user ? 'Ver mis rangos' : 'Ver todos los rangos'} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {ranks.filter(r => r.is_active !== false).map(r => (
                  <div key={r.id} className={cn(
                    'bg-card rounded-2xl p-5 border transition-all hover:scale-[1.02]',
                    r.border_color || 'border-border'
                  )}>
                    <div className="text-3xl mb-3">{r.icon}</div>
                    <div className={cn('font-bold text-base mb-1', r.color || 'text-foreground')}>{r.name}</div>
                    <div className="text-xs text-muted-foreground">Bono de rango</div>
                    <div className="text-lg font-bold text-foreground mt-1">
                      {formatPrice(r.bonus, currency, currencySymbol, exchangeRate)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── PLANS ───────────────────────────────────────────────────────────── */}
      {plans.length > 0 && (
        <section className="py-24" id="planes">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Elige tu plan</h2>
              <p className="text-muted-foreground">Comienza gratis, escala cuando crezcas.</p>
            </div>

            <div className={cn(
              'grid gap-4',
              plans.length <= 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            )}>
              {plans.map(plan => {
                const isFree = plan.is_free || plan.price === 0;
                const isCurrent = user && (user as any).plan === plan.slug;
                return (
                  <div key={plan.id} className={cn(
                    'bg-card rounded-2xl p-6 flex flex-col relative overflow-hidden transition-all hover:translate-y-[-2px]',
                    plan.is_popular
                      ? 'border-2 border-primary shadow-xl shadow-primary/10'
                      : 'border border-border hover:border-primary/30'
                  )}>
                    {plan.is_popular && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-blue-500 to-primary" />
                    )}
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-bold text-foreground text-lg">{plan.name}</h3>
                      {plan.badge && (
                        <span className="text-[10px] font-bold text-white bg-primary px-2 py-0.5 rounded-full ml-2">{plan.badge}</span>
                      )}
                      {isCurrent && (
                        <span className="text-[10px] font-bold text-green-600 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full ml-2">Tu plan</span>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-5">{plan.description}</p>

                    <div className="mb-6">
                      <span className="text-3xl font-bold text-foreground">
                        {isFree ? 'Gratis' : formatPrice(plan.price, currency, currencySymbol, exchangeRate)}
                      </span>
                      {!isFree && <span className="text-sm font-normal text-muted-foreground">/mes</span>}
                    </div>

                    <ul className="space-y-2.5 mb-6 flex-1">
                      {(plan.features || []).slice(0, 5).map((f: string) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <div className="text-center text-sm font-semibold text-green-600 py-3 bg-green-500/5 rounded-xl">Tu plan actual</div>
                    ) : (
                      <Link to={user ? '/dashboard/mi-plan' : `/registro?plan=${plan.slug}`}
                        className={cn(
                          'text-center py-3 rounded-xl text-sm font-bold transition-all',
                          plan.is_popular
                            ? 'bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20'
                            : 'border border-border hover:bg-muted hover:border-primary/40'
                        )}>
                        {isFree ? 'Comenzar gratis' : 'Activar plan'}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-center text-xs text-muted-foreground mt-6">
              <Link to="/planes" className="text-primary font-medium hover:underline">Ver comparación completa de planes →</Link>
            </p>
          </div>
        </section>
      )}

      {/* ── STORE ───────────────────────────────────────────────────────────── */}
      <StoreSection />

      {/* ── TESTIMONIALS: Double infinite carousel ──────────────────────────── */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Miles de afiliados ya <span className="text-primary">ganan con MLM 360</span>
          </h2>
          <p className="text-muted-foreground">Historias reales de emprendedores latinoamericanos.</p>
        </div>
        <TestimonialsCarousel />
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-muted/20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Preguntas frecuentes</h2>
            <p className="text-muted-foreground text-sm">Todo lo que necesitas saber antes de empezar.</p>
          </div>

          <div className="space-y-2">
            {faqItems.map((faq, i) => (
              <div key={i} className={cn(
                'bg-card border rounded-xl overflow-hidden transition-all',
                openFaq === i ? 'border-primary/40 shadow-sm shadow-primary/5' : 'border-border hover:border-border/80'
              )}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left gap-4">
                  <span className="text-sm font-semibold text-foreground">{faq.question}</span>
                  <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform shrink-0', openFaq === i && 'rotate-180')} />
                </button>
                <div className={cn(
                  'overflow-hidden transition-all',
                  openFaq === i ? 'max-h-48' : 'max-h-0'
                )}>
                  <div className="px-5 pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-foreground">
            {/* Texture grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
            {/* Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] bg-primary/20 rounded-full blur-[80px]" />

            <div className="relative px-8 py-16 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-full text-xs font-bold text-white/80 mb-6">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Sin tarjeta de crédito requerida</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5 leading-tight">
                Tu red no espera.<br />Empieza hoy.
              </h2>

              <p className="text-white/60 max-w-md mx-auto mb-8 text-base">
                Únete a +12,540 emprendedores que ya construyen libertad financiera con MLM 360.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to={user ? '/dashboard' : '/registro'}
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-foreground font-bold rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all shadow-lg text-sm">
                  {user ? 'Ir a mi Panel' : 'Crear cuenta gratis'} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/contacto"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/10 border border-white/20 text-white font-medium rounded-xl hover:bg-white/15 transition-all text-sm">
                  Hablar con ventas
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-xs text-white/40">
                <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-white/60" /> Cuenta gratuita disponible</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-white/60" /> Sin permanencia mínima</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-white/60" /> Pago cada 15 días</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
