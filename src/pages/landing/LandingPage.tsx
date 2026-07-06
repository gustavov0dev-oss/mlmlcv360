import { Link } from '@/lib/router';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Reveal } from '@/components/landing/Reveal';
import { testimonials, faqItems } from '@/lib/mockData';
import {
  ArrowRight, Check, Star, ChevronDown, Shield, Zap, Globe, Award, DollarSign,
  TrendingUp, Users, Lock, ShoppingBag, Bell, Network, CreditCard, Sparkles,
  ChartBar as BarChart3, Wallet, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useConfig, formatPrice } from '@/store/configStore';
import { useDatabase } from '@/lib/backend';
import { useCart } from '@/store/cartStore';
import type { Product, ProductCategory } from '@/lib/storeTypes';
import ProductCard from '@/components/store/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';

// ─── steps ───────────────────────────────────────────────────────────────────
const steps = [
  { n: '01', title: 'Elige tu plan', desc: 'Gratis, Pro o Elite. Sin permanencia, cambia cuando quieras.', icon: BarChart3 },
  { n: '02', title: 'Comparte tu enlace', desc: 'Tu código único conecta automáticamente a nuevos referidos.', icon: Network },
  { n: '03', title: 'Cobra tus comisiones', desc: 'Pagos automáticos quincenales. Sin trámites, sin demoras.', icon: DollarSign },
];

// ─── extended testimonials ────────────────────────────────────────────────────
const allTestimonials = [
  ...testimonials,
  {
    id: '4', name: 'Sandra Palomino', role: 'Emprendedora', city: 'Trujillo',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=80',
    content: 'La automatización de comisiones me ahorró horas de trabajo. Ahora me enfoco en expandir mi red sin preocuparme por los cálculos.',
    rank: 'Platino', earnings: 'S/ 6,100/mes',
  },
  {
    id: '5', name: 'Diego Ramírez', role: 'Profesional', city: 'Piura',
    avatar: 'https://images.pexels.com/photos/1680172/pexels-photo-1680172.jpeg?auto=compress&cs=tinysrgb&w=80',
    content: 'Escalé de Bronce a Platino en 4 meses. Los reportes me ayudan a saber exactamente qué parte de mi red necesita atención.',
    rank: 'Platino', earnings: 'S/ 5,500/mes',
  },
  {
    id: '6', name: 'Luciana Flores', role: 'Comerciante', city: 'Ica',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=80',
    content: 'El soporte 24/7 es increíble. Tuve una duda un domingo y en 15 minutos tenía respuesta. Eso genera mucha confianza.',
    rank: 'Oro', earnings: 'S/ 3,800/mes',
  },
];

// ─── payment brands ───────────────────────────────────────────────────────────
const brands = ['Visa', 'Mastercard', 'Yape', 'Plin', 'BCP', 'BBVA', 'Culqi', 'Izipay', 'PayPal', 'Interbank', 'Niubiz', 'SafetyPay'];

// ─── store section ────────────────────────────────────────────────────────────
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
    <section className="py-20 sm:py-28 bg-white dark:bg-card border-t border-border/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary uppercase tracking-wider mb-4">
            <ShoppingBag className="w-3 h-3" /> Tienda
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight mb-3">
            Compra y genera <span className="text-primary">ingresos</span>
          </h2>
          <p className="text-muted-foreground max-w-md text-base">Cada producto activa comisiones automáticas para toda tu red.</p>
        </Reveal>

        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-8">
            <button onClick={() => setActiveCat('')} className={cn('px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0 border', activeCat === '' ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground')}>Todos</button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCat(activeCat === cat.id ? '' : cat.id)} className={cn('px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0 border', activeCat === cat.id ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground')}>{cat.name}</button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="rounded-2xl overflow-hidden border border-border"><Skeleton className="aspect-square" /></div>)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center border border-dashed border-border rounded-2xl">
            <ShoppingBag className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No hay productos en esta categoría</p>
            <button onClick={() => setActiveCat('')} className="mt-3 text-xs text-primary hover:underline">Ver todos</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.slice(0, 4).map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}

        <Reveal className="mt-10 text-center">
          <Link to="/tienda" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors group">
            Ver tienda completa
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            {itemCount > 0 && <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">{itemCount}</span>}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

// ─── app mockup ───────────────────────────────────────────────────────────────
function AppMockup() {
  const appHost = typeof window !== 'undefined' ? window.location.host : 'app.cluv360.pe';
  return (
    <div className="relative w-full max-w-3xl mx-auto">
      {/* Glow under mockup */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-primary/20 blur-3xl rounded-full pointer-events-none" />

      <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-700 rounded-2xl shadow-[0_32px_80px_-12px_rgba(0,0,0,0.18)] dark:shadow-[0_32px_80px_-12px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* Browser chrome */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-neutral-100 dark:border-zinc-800 bg-neutral-50/80 dark:bg-zinc-800/50 backdrop-blur-sm">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-700 rounded-md px-4 py-1 text-xs text-neutral-400 w-52 text-center truncate">
              {appHost}/dashboard
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] min-h-[300px]">
          {/* Sidebar */}
          <div className="border-r border-neutral-100 dark:border-zinc-800 p-3 bg-neutral-50/50 dark:bg-zinc-800/30 hidden sm:block">
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-3 px-2">Panel</div>
            {[
              { icon: BarChart3, label: 'Resumen', active: false },
              { icon: DollarSign, label: 'Comisiones', active: true },
              { icon: Network, label: 'Mi Red', active: false },
              { icon: Award, label: 'Rangos', active: false },
              { icon: ShoppingBag, label: 'Tienda', active: false },
            ].map(item => (
              <div key={item.label} className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium mb-0.5 transition-colors', item.active ? 'bg-primary/10 text-primary font-semibold' : 'text-neutral-500 dark:text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-700/50')}>
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                {item.label}
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="p-4 sm:p-5 space-y-4 bg-white dark:bg-zinc-900">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Comisiones', value: 'S/ 3,240', sub: '+12% mes', c: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30' },
                { label: 'Mi Red', value: '48', sub: 'afiliados', c: 'text-primary', bg: 'bg-primary/5 border-primary/10' },
                { label: 'Rango', value: 'Platino', sub: '→ Diamante', c: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30' },
              ].map(s => (
                <div key={s.label} className={cn('rounded-xl p-3 border', s.bg)}>
                  <div className="text-[10px] text-neutral-400 mb-1 font-medium">{s.label}</div>
                  <div className="text-sm font-bold text-foreground">{s.value}</div>
                  <div className={cn('text-[10px] font-semibold mt-0.5', s.c)}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="bg-neutral-50 dark:bg-zinc-800/50 rounded-xl p-3.5 border border-neutral-100 dark:border-zinc-700/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-neutral-400 font-medium">Comisiones — 12 semanas</span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">+S/ 890</span>
              </div>
              <div className="flex items-end gap-0.5 h-14">
                {[28, 45, 38, 62, 50, 74, 58, 82, 68, 90, 78, 100].map((h, i) => (
                  <div key={i} className={cn('flex-1 rounded-sm transition-all', i === 11 ? 'bg-primary' : 'bg-primary/20')} style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>

            {/* Activity feed */}
            <div className="space-y-2">
              {[
                { icon: DollarSign, text: 'Comisión binaria — Juan P.', val: '+S/ 120', cls: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
                { icon: Users, text: 'Nuevo afiliado en red', val: '+1 afil.', cls: 'text-primary bg-primary/8' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-neutral-50 dark:bg-zinc-800/50 border border-neutral-100 dark:border-zinc-700/50">
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', item.cls)}><item.icon className="w-3.5 h-3.5" /></div>
                  <span className="text-xs text-foreground flex-1 truncate font-medium">{item.text}</span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating notification cards */}
      <div className="absolute -top-4 sm:-top-6 -right-2 sm:-right-8 bg-white dark:bg-zinc-900 border border-primary/20 rounded-xl px-4 py-3 shadow-xl shadow-primary/10 dark:shadow-primary/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bell className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-[10px] text-neutral-400 leading-tight">Comisión acreditada</div>
            <div className="text-sm font-bold text-primary">+S/ 320.50</div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-4 sm:-bottom-6 -left-2 sm:-left-8 bg-white dark:bg-zinc-900 border border-amber-400/20 rounded-xl px-4 py-3 shadow-xl shadow-amber-500/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-[10px] text-neutral-400 leading-tight">Nuevo rango</div>
            <div className="text-sm font-bold text-amber-600 dark:text-amber-400">Diamante alcanzado</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { plans: allPlans, ranks, currency, currencySymbol, exchangeRate } = useConfig();
  const plans = allPlans.filter(p => p.is_active);
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 overflow-x-hidden">
      <Navbar />

      {/* ── HERO ──────────────────────────────────────────────────────────────*/}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-16">
        {/* Grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, hsl(var(--border)/0.4) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)/0.4) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
        {/* Radial gradient mask over grid */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-white dark:from-zinc-950/0 dark:via-zinc-950/0 dark:to-zinc-950 pointer-events-none" />

        {/* Aura glow center */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] pointer-events-none">
          <div className="w-full h-full rounded-full bg-gradient-radial from-primary/12 via-primary/4 to-transparent blur-3xl" style={{ background: 'radial-gradient(ellipse at center, hsl(var(--primary)/0.12) 0%, hsl(var(--primary)/0.04) 40%, transparent 70%)' }} />
        </div>

        {/* Side auras */}
        <div className="absolute top-1/4 -left-32 w-72 h-72 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, hsl(var(--primary)/0.08) 0%, transparent 70%)' }} />
        <div className="absolute top-2/3 -right-32 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, hsl(43 90% 68% / 0.1) 0%, transparent 70%)' }} />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
          <div className="text-center max-w-4xl mx-auto">

            {/* Badge */}
            <Reveal>
              <a href="#planes" className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-700 rounded-full text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:border-primary/40 hover:text-primary transition-all mb-8 group shadow-sm">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                Nuevo: Bonos de rango Corona disponibles
                <ArrowRight className="w-3.5 h-3.5 text-primary group-hover:translate-x-0.5 transition-transform" />
              </a>
            </Reveal>

            {/* Headline */}
            <Reveal delay={80}>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-[5.5rem] font-bold text-neutral-900 dark:text-white leading-[1.04] tracking-[-0.03em] mb-6">
                Construye tu red.
                <br />
                <span className="text-primary">Cobra automático.</span>
              </h1>
            </Reveal>

            {/* Subheadline */}
            <Reveal delay={140}>
              <p className="text-lg sm:text-xl text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                La plataforma MLM líder en Latinoamérica. Comisiones en tiempo real, red interactiva y tienda integrada.
              </p>
            </Reveal>

            {/* CTAs */}
            <Reveal delay={200}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
                <Link
                  to={user ? '/dashboard' : '/registro'}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold rounded-xl hover:bg-neutral-700 dark:hover:bg-neutral-100 active:scale-[0.98] transition-all text-base shadow-lg shadow-neutral-900/20 dark:shadow-white/10"
                >
                  {user ? 'Ir a mi Panel' : 'Empezar gratis'} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/planes"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-700 text-neutral-700 dark:text-neutral-200 font-medium rounded-xl hover:border-neutral-400 dark:hover:border-zinc-500 transition-all text-base"
                >
                  Ver planes
                </Link>
              </div>
            </Reveal>

            {/* Trust badges */}
            <Reveal delay={250}>
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-neutral-400 dark:text-neutral-500 mb-16">
                {[
                  { icon: Lock, text: 'SSL 256-bit' },
                  { icon: Shield, text: 'INDECOPI' },
                  { icon: Check, text: 'Sin permanencia' },
                  { icon: CreditCard, text: 'Pago quincenal' },
                ].map(item => (
                  <span key={item.text} className="flex items-center gap-1.5">
                    <item.icon className="w-3.5 h-3.5 text-primary/70" />
                    {item.text}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>

          {/* App mockup */}
          <Reveal delay={300} className="px-2 sm:px-8 lg:px-16">
            <AppMockup />
          </Reveal>
        </div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────────────────────────*/}
      <section className="py-14 sm:py-20 border-y border-neutral-100 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 lg:gap-16">
            {[
              { value: '12,540+', label: 'Afiliados activos', icon: Users, color: 'text-primary' },
              { value: 'S/ 2.8M+', label: 'Comisiones pagadas', icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400' },
              { value: '8 países', label: 'Presencia regional', icon: Globe, color: 'text-primary' },
              { value: '+340%', label: 'Crecimiento anual', icon: TrendingUp, color: 'text-amber-600 dark:text-amber-400' },
            ].map((stat, i) => (
              <Reveal key={stat.label} delay={i * 60}>
                <div className="text-center">
                  <stat.icon className={cn('w-5 h-5 mx-auto mb-3', stat.color)} />
                  <div className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white tracking-tight">{stat.value}</div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5">{stat.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── BRANDS MARQUEE ────────────────────────────────────────────────────*/}
      <section className="py-10 sm:py-14 bg-white dark:bg-zinc-950 overflow-hidden">
        <p className="text-center text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-8">
          Pagos y certificaciones aceptadas
        </p>
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-40 bg-gradient-to-r from-white dark:from-zinc-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-40 bg-gradient-to-l from-white dark:from-zinc-950 to-transparent z-10 pointer-events-none" />
          <div className="flex animate-marquee-brands">
            {[...brands, ...brands].map((name, i) => (
              <div key={i} className="shrink-0 mx-3 px-5 py-2.5 bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-full">
                <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 whitespace-nowrap">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ─────────────────────────────────────────────────────*/}
      <section className="relative py-20 sm:py-28 bg-white dark:bg-zinc-950">
        <div className="absolute inset-0 pointer-events-none opacity-30 dark:opacity-20"
          style={{ backgroundImage: `linear-gradient(to right, hsl(var(--border)/0.6) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)/0.6) 1px, transparent 1px)`, backgroundSize: '64px 64px' }} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-zinc-800 text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider mb-4">
              Plataforma
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight mb-4">
              Todo lo que necesitas para <span className="text-primary">crecer</span>
            </h2>
            <p className="text-lg text-neutral-500 dark:text-neutral-400 max-w-xl">Cada herramienta resuelve un problema real del negocio multinivel.</p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Comisiones — wide */}
            <Reveal className="md:col-span-2">
              <div className="h-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 hover:border-emerald-300 dark:hover:border-emerald-700/50 group transition-colors overflow-hidden">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center shrink-0">
                      <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Comisiones automáticas</h3>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">+S/ 3,240</div>
                    <div className="text-xs text-neutral-400">último mes</div>
                  </div>
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6">7% directa · 4% binaria · 2% unilevel. Cálculo en tiempo real, pago cada 15 días.</p>
                <div className="flex items-end gap-1 h-16 mb-5">
                  {[28, 45, 38, 62, 50, 74, 58, 82, 68, 90, 78, 100].map((h, i) => (
                    <div key={i} className={cn('flex-1 rounded-sm transition-all', i === 11 ? 'bg-emerald-500' : 'bg-emerald-500/20 group-hover:bg-emerald-500/30')} style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {['7% Directa', '4% Binaria', '2% Unilevel', 'Pago quincenal'].map(tag => (
                    <span key={tag} className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-semibold border border-emerald-100 dark:border-emerald-900/30">{tag}</span>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Red genealógica */}
            <Reveal>
              <div className="h-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 hover:border-primary/30 group transition-colors flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center shrink-0">
                    <Network className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Red genealógica</h3>
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6 flex-1">Panel visual con árbol binario, zoom dinámico y estadísticas por nodo en tiempo real.</p>
                <div className="relative flex flex-col items-center gap-3 py-2">
                  <div className="w-9 h-9 rounded-full bg-primary/10 border-2 border-primary/40 flex items-center justify-center">
                    <div className="w-3.5 h-3.5 rounded-full bg-primary" />
                  </div>
                  <div className="flex items-center gap-8">
                    {[0, 1].map(i => <div key={i} className="w-8 h-8 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center"><div className="w-2.5 h-2.5 rounded-full bg-primary/60" /></div>)}
                  </div>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-neutral-300 dark:bg-zinc-500" /></div>
                    ))}
                  </div>
                  <div className="text-xs text-neutral-400 font-medium">48 afiliados en tu red</div>
                </div>
              </div>
            </Reveal>

            {/* Sistema de rangos */}
            <Reveal>
              <div className="h-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 hover:border-amber-300 dark:hover:border-amber-700/50 group transition-colors flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Sistema de rangos</h3>
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6 flex-1">Bronce → Corona. Cada nivel desbloquea bonos progresivos exclusivos.</p>
                <div className="space-y-2">
                  {[
                    { name: 'Bronce', cls: 'bg-amber-50 dark:bg-amber-900/15 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/20', w: 'w-1/3' },
                    { name: 'Plata', cls: 'bg-slate-50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-700/30', w: 'w-1/2' },
                    { name: 'Oro', cls: 'bg-yellow-50 dark:bg-yellow-900/15 text-yellow-700 dark:text-yellow-400 border-yellow-100 dark:border-yellow-900/20', w: 'w-2/3' },
                    { name: 'Platino', cls: 'bg-cyan-50 dark:bg-cyan-900/15 text-cyan-700 dark:text-cyan-400 border-cyan-100 dark:border-cyan-900/20', w: 'w-4/5' },
                    { name: 'Corona', cls: 'bg-primary/8 text-primary border-primary/15', w: 'w-full' },
                  ].map(r => (
                    <div key={r.name} className={cn('h-7 rounded-full flex items-center px-3.5 border text-xs font-semibold transition-all', r.cls, r.w)}>
                      {r.name}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Tienda — wide */}
            <Reveal className="md:col-span-2">
              <div className="h-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 hover:border-blue-300 dark:hover:border-blue-700/50 group transition-colors flex flex-col sm:flex-row gap-6 overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Tienda integrada</h3>
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-5 flex-1">Catálogo completo. Cada compra activa comisiones automáticas en toda tu red de forma instantánea.</p>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {['Vitaminas', 'Bienestar', 'Nutrición', 'Cuidado personal'].map(tag => (
                      <span key={tag} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-xs font-semibold border border-blue-100 dark:border-blue-900/30">{tag}</span>
                    ))}
                  </div>
                  <Link to="/tienda" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-3 transition-all group/link">
                    Explorar tienda <ArrowRight className="w-4 h-4 group-hover/link:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:w-44 shrink-0">
                  {[
                    'https://images.pexels.com/photos/3762879/pexels-photo-3762879.jpeg?auto=compress&cs=tinysrgb&w=200',
                    'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=200',
                    'https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=200',
                    'https://images.pexels.com/photos/4041392/pexels-photo-4041392.jpeg?auto=compress&cs=tinysrgb&w=200',
                  ].map((src, i) => (
                    <div key={i} className="rounded-xl aspect-square border border-neutral-100 dark:border-zinc-800 overflow-hidden">
                      <img src={src} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── DARK PROMO ────────────────────────────────────────────────────────*/}
      <section className="relative py-20 sm:py-28 overflow-hidden bg-neutral-950">
        {/* Grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)`, backgroundSize: '48px 48px' }} />
        {/* Auras */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, hsl(var(--primary)/0.15) 0%, transparent 65%)' }} />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, hsl(43 90% 68% / 0.10) 0%, transparent 65%)' }} />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/8 border border-white/10 rounded-full text-xs font-semibold text-white/60 mb-6">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Sistema multinivel inteligente
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold text-white leading-[1.08] mb-5 tracking-tight">
                Potencia tu negocio<br />al <span className="text-primary">máximo nivel</span>
              </h2>
              <p className="text-lg text-white/50 leading-relaxed mb-8 max-w-lg">
                Mientras duermes, el sistema calcula y distribuye comisiones a toda tu red. Sin errores, sin retrasos.
              </p>
              <div className="flex items-center gap-3 mb-8">
                <div className="flex -space-x-2">
                  {[
                    'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=60',
                    'https://images.pexels.com/photos/1680172/pexels-photo-1680172.jpeg?auto=compress&cs=tinysrgb&w=60',
                    'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=60',
                    'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=60',
                  ].map((src, i) => (
                    <img key={i} src={src} alt="" className="w-8 h-8 rounded-full border-2 border-neutral-800 object-cover" />
                  ))}
                </div>
                <div className="text-sm text-white/40">
                  <span className="text-white font-semibold">12,540+</span> emprendedores confían en nosotros
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to={user ? '/dashboard' : '/registro'}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-neutral-900 font-semibold rounded-xl hover:bg-neutral-100 transition-all shadow-lg text-base">
                  Empezar ahora <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/contacto"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/5 border border-white/15 text-white font-medium rounded-xl hover:bg-white/10 transition-all text-base">
                  Hablar con ventas
                </Link>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: DollarSign, title: 'Comisiones en tiempo real', desc: 'Calculadas al instante en cada compra de tu red.', border: 'border-emerald-500/20', bg: 'bg-emerald-500/8', cls: 'text-emerald-400' },
                  { icon: Zap, title: 'Pago automático', desc: 'Transferencias quincenales sin trámite de tu parte.', border: 'border-amber-500/20', bg: 'bg-amber-500/8', cls: 'text-amber-400' },
                  { icon: Globe, title: 'Red internacional', desc: 'Tus afiliados pueden estar en toda Latinoamérica.', border: 'border-blue-500/20', bg: 'bg-blue-500/8', cls: 'text-blue-400' },
                  { icon: TrendingUp, title: 'Crecimiento probado', desc: '+340% anual. Números reales, no promesas.', border: 'border-rose-500/20', bg: 'bg-rose-500/8', cls: 'text-rose-400' },
                ].map((item, i) => (
                  <div key={i} className={cn('border rounded-2xl p-5 transition-all hover:bg-white/5', item.border, item.bg)}>
                    <div className={cn('w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4')}>
                      <item.icon className={cn('w-5 h-5', item.cls)} />
                    </div>
                    <div className="text-sm font-semibold text-white mb-1.5">{item.title}</div>
                    <div className="text-xs text-white/45 leading-relaxed">{item.desc}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────────*/}
      <section className="py-20 sm:py-28 bg-white dark:bg-zinc-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-zinc-800 text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider mb-4">
              Proceso
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight mb-4">
              De cero a <span className="text-primary">comisiones</span><br className="hidden sm:block" /> en minutos
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-neutral-100 dark:bg-zinc-800 border border-neutral-100 dark:border-zinc-800 rounded-2xl overflow-hidden">
            {steps.map((step, i) => (
              <Reveal key={step.n} delay={i * 80}>
                <div className="relative bg-white dark:bg-zinc-950 p-8 sm:p-10 h-full group hover:bg-neutral-50 dark:hover:bg-zinc-900 transition-colors">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors">
                      <step.icon className="w-5 h-5 text-neutral-600 dark:text-neutral-300 group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-5xl font-black text-neutral-100 dark:text-zinc-800 select-none leading-none">{step.n}</span>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">{step.title}</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed text-sm">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────────*/}
      <section className="py-20 sm:py-28 bg-neutral-50 dark:bg-zinc-900/40 border-y border-neutral-100 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-14">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-200 dark:bg-zinc-800 text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider mb-4">
                Testimonios
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight">
                Miles ya ganan<br className="hidden sm:block" /> con Cluv 360
              </h2>
              <p className="text-lg text-neutral-500 dark:text-neutral-400 mt-3 max-w-lg">Historias reales de emprendedores en toda Latinoamérica.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex gap-0.5">
                {Array.from({length: 5}).map((_,i) => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
              </div>
              <div className="text-sm text-neutral-500">
                <span className="text-neutral-900 dark:text-white font-semibold">4.9</span>/5 · 2,300+ reseñas
              </div>
            </div>
          </Reveal>

          {/* Bento testimonial grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {allTestimonials.slice(0, 3).map((t, i) => (
              <Reveal key={t.id} delay={i * 70}>
                <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col h-full hover:border-neutral-300 dark:hover:border-zinc-700 transition-colors">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: 5 }).map((_, si) => <Star key={si} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed flex-1 mb-5">"{t.content}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-neutral-100 dark:border-zinc-800">
                    <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-neutral-100 dark:ring-zinc-800 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-neutral-900 dark:text-white leading-tight truncate">{t.name}</div>
                      <div className="text-xs text-neutral-400">{t.role}{(t as any).city ? `, ${(t as any).city}` : ''}</div>
                    </div>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">{t.earnings}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Photo banner */}
          <Reveal>
            <div className="relative rounded-2xl overflow-hidden">
              <img
                src="https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1260&h=350&fit=crop"
                alt="Emprendedores Cluv 360"
                className="w-full h-48 sm:h-64 object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/90 via-neutral-950/60 to-neutral-950/20" />
              <div className="absolute inset-0 flex items-center px-8 sm:px-12">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12">
                  {[
                    { value: '12,540+', label: 'Afiliados activos' },
                    { value: 'S/ 2.8M+', label: 'Comisiones pagadas' },
                    { value: '8 países', label: 'Presencia regional' },
                    { value: '+340%', label: 'Crecimiento anual' },
                  ].map(stat => (
                    <div key={stat.label}>
                      <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{stat.value}</div>
                      <div className="text-xs sm:text-sm text-white/50 mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── RANKS ─────────────────────────────────────────────────────────────*/}
      {ranks.filter(r => r.is_active !== false).length > 0 && (
        <section className="py-20 sm:py-28 bg-white dark:bg-zinc-950">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-[1fr_1.4fr] gap-12 lg:gap-20 items-start">
              <Reveal>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-4">
                  <Award className="w-3 h-3" /> Rangos
                </div>
                <h2 className="text-4xl sm:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight mb-4">
                  Cada nivel,<br /><span className="text-primary">más ingresos</span>
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed mb-8 text-base max-w-md">
                  El sistema premia tu esfuerzo con bonos progresivos. Desde Bronce hasta el nivel máximo Corona.
                </p>
                <Link to={user ? '/dashboard/rangos' : '/registro'} className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold rounded-xl hover:bg-neutral-700 dark:hover:bg-neutral-100 transition-all">
                  {user ? 'Ver mis rangos' : 'Ver todos los rangos'} <ArrowRight className="w-4 h-4" />
                </Link>
              </Reveal>

              <Reveal delay={80}>
                <div className="grid grid-cols-3 gap-3">
                  {ranks.filter(r => r.is_active !== false).slice(0, 6).map(r => (
                    <div key={r.id} className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-5 border border-neutral-200 dark:border-zinc-800 hover:border-neutral-300 dark:hover:border-zinc-700 transition-colors text-center">
                      <div className="w-10 h-10 rounded-xl bg-neutral-50 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-2.5">
                        <Award className={cn('w-5 h-5', r.color || 'text-amber-500')} />
                      </div>
                      <div className={cn('font-bold text-xs sm:text-sm mb-1', r.color || 'text-neutral-700 dark:text-neutral-200')}>{r.name}</div>
                      <div className="text-xs text-neutral-400 mb-1">Bono</div>
                      <div className="text-sm font-bold text-neutral-900 dark:text-white">{formatPrice(r.bonus, currency, currencySymbol, exchangeRate)}</div>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {/* ── PLANS ─────────────────────────────────────────────────────────────*/}
      {plans.length > 0 && (
        <section className="py-20 sm:py-28 bg-neutral-50 dark:bg-zinc-900/30 border-y border-neutral-100 dark:border-zinc-800" id="planes">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-200 dark:bg-zinc-800 text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider mb-4">
                Precios
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 dark:text-white tracking-tight mb-4">
                Planes flexibles<br />que crecen contigo
              </h2>
              <p className="text-lg text-neutral-500 dark:text-neutral-400 max-w-lg">Comienza gratis y escala cuando tu negocio lo necesite.</p>
            </Reveal>

            <Reveal delay={60}>
              <div className={cn('grid gap-4', plans.length === 1 ? 'grid-cols-1 max-w-sm' : plans.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
                {plans.map(plan => {
                  const isFree = plan.is_free || plan.price === 0;
                  const isCurrent = user && (user as any).plan === plan.slug;
                  return (
                    <div key={plan.id} className={cn(
                      'bg-white dark:bg-zinc-900 rounded-2xl p-7 flex flex-col relative transition-all',
                      plan.is_popular
                        ? 'border-2 border-neutral-900 dark:border-white ring-4 ring-neutral-900/8 dark:ring-white/8 shadow-xl'
                        : 'border border-neutral-200 dark:border-zinc-800 hover:border-neutral-300 dark:hover:border-zinc-700',
                    )}>
                      {plan.badge && (
                        <div className={cn('absolute -top-3 left-5 text-xs font-bold px-3 py-1 rounded-full', plan.is_popular ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'bg-primary text-primary-foreground')}>
                          {plan.badge}
                        </div>
                      )}
                      {isCurrent && (
                        <div className="absolute -top-3 right-5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500 text-white">Actual</div>
                      )}
                      <div className="mb-5">
                        <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{plan.name}</h3>
                        {plan.description && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{plan.description}</p>}
                      </div>
                      <div className="mb-6 pb-6 border-b border-neutral-100 dark:border-zinc-800">
                        <span className="text-4xl font-bold text-neutral-900 dark:text-white tracking-tight">{isFree ? 'Gratis' : formatPrice(plan.price, currency, currencySymbol, exchangeRate)}</span>
                        {!isFree && <span className="text-sm text-neutral-400 font-normal">/mes</span>}
                        {plan.trial_days > 0 && <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 font-medium">{plan.trial_days} días de prueba gratis</div>}
                      </div>
                      {isCurrent ? (
                        <div className="py-3 text-center border border-emerald-200 dark:border-emerald-800/50 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 mb-6">
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Tu plan actual</span>
                        </div>
                      ) : (
                        <Link
                          to={user ? '/dashboard/mi-plan' : `/registro?plan=${plan.slug}`}
                          className={cn(
                            'py-3 rounded-xl text-sm font-semibold text-center transition-all block mb-6',
                            plan.is_popular
                              ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100'
                              : 'border border-neutral-200 dark:border-zinc-700 hover:bg-neutral-50 dark:hover:bg-zinc-800 text-neutral-900 dark:text-white',
                          )}
                        >
                          {isFree ? 'Comenzar gratis' : 'Activar plan'}
                        </Link>
                      )}
                      <ul className="space-y-2.5 mt-auto">
                        {(plan.features || []).slice(0, 5).map((f: string) => (
                          <li key={f} className="flex items-start gap-2.5 text-sm text-neutral-600 dark:text-neutral-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </Reveal>

            <Reveal delay={120}>
              <p className="text-center text-sm text-neutral-400 mt-8">
                <Link to="/planes" className="text-primary font-semibold hover:underline">Ver comparación completa de planes →</Link>
              </p>
            </Reveal>
          </div>
        </section>
      )}

      {/* ── STORE ─────────────────────────────────────────────────────────────*/}
      <StoreSection />

      {/* ── FAQ ───────────────────────────────────────────────────────────────*/}
      <section className="py-20 sm:py-28 bg-white dark:bg-zinc-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-zinc-800 text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider mb-4">
              FAQ
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight">
              Preguntas <span className="text-primary">frecuentes</span>
            </h2>
          </Reveal>

          <Reveal delay={60}>
            <div className="border border-neutral-200 dark:border-zinc-800 rounded-2xl overflow-hidden divide-y divide-neutral-100 dark:divide-zinc-800">
              {faqItems.map((faq, i) => (
                <div key={i} className={cn('bg-white dark:bg-zinc-950 transition-colors', openFaq === i && 'bg-neutral-50 dark:bg-zinc-900')}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-6 sm:px-8 py-5 text-left gap-4">
                    <span className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-white">{faq.question}</span>
                    <ChevronDown className={cn('w-5 h-5 text-neutral-400 transition-transform duration-200 shrink-0', openFaq === i && 'rotate-180')} />
                  </button>
                  <div className={cn('grid transition-all duration-200', openFaq === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                    <div className="overflow-hidden">
                      <div className="px-6 sm:px-8 pb-6">
                        <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 leading-relaxed">{faq.answer}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────────*/}
      <section className="relative py-24 sm:py-36 overflow-hidden bg-neutral-950">
        {/* Grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)`, backgroundSize: '48px 48px' }} />
        {/* Aura */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] pointer-events-none">
          <div className="w-full h-full" style={{ background: 'radial-gradient(ellipse at center top, hsl(var(--primary)/0.2) 0%, transparent 65%)' }} />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/6 border border-white/10 rounded-full text-xs font-semibold text-white/50 mb-8">
              <Zap className="w-3.5 h-3.5 text-primary" />
              Sin tarjeta de crédito
            </div>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-4 leading-[1.04] tracking-tight">
              Tu red no espera.
            </h2>
            <p className="text-3xl sm:text-4xl font-bold mb-5 text-primary">
              Empieza hoy mismo.
            </p>
            <p className="text-base sm:text-lg text-white/40 max-w-lg mx-auto mb-12 leading-relaxed">
              Únete a miles de emprendedores que ya construyen libertad financiera con Cluv 360.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
              <Link
                to={user ? '/dashboard' : '/registro'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-neutral-900 font-semibold rounded-xl hover:bg-neutral-100 active:scale-[0.98] transition-all shadow-2xl shadow-white/10 text-base"
              >
                {user ? 'Ir a mi Panel' : 'Crear cuenta gratis'} <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/contacto"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/8 transition-all text-base"
              >
                Hablar con ventas
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm text-white/30">
              {['Cuenta gratuita', 'Sin permanencia', 'Pago quincenal', 'Soporte 24/7'].map(t => (
                <span key={t} className="flex items-center gap-2"><Check className="w-4 h-4 text-white/40" /> {t}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
