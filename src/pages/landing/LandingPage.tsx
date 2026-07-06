import { Link } from '@/lib/router';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Reveal } from '@/components/landing/Reveal';
import { testimonials, faqItems } from '@/lib/mockData';
import {
  ArrowRight, Check, Star, ChevronDown, Shield, Zap, Globe, Award, DollarSign,
  TrendingUp, Users, Lock, ShoppingBag, Bell, Network, CreditCard, Sparkles,
  ChartBar as BarChart3, Wallet, ExternalLink,
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

// ─── feature tabs ──────────────────────────────────────────────────────────────
const featureTabs = [
  { id: 'commissions', label: 'Comisiones', icon: Wallet },
  { id: 'network', label: 'Mi Red', icon: Network },
  { id: 'store', label: 'Tienda', icon: ShoppingBag },
  { id: 'ranks', label: 'Rangos', icon: Award },
];

// ─── bento features data ───────────────────────────────────────────────────────
const features = [
  {
    label: 'Comisiones automáticas',
    desc: '7% directa · 4% binaria · 2% unilevel. Calculo en tiempo real, pago cada 15 días sin tramites.',
    icon: Wallet, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10',
    wide: true,
  },
  {
    label: 'Red genealógica interactiva',
    desc: 'Panel visual con árbol binario, zoom y estadísticas por nodo.',
    icon: Network, color: 'text-primary', bg: 'bg-primary/10',
    wide: false,
  },
  {
    label: 'Sistema de rangos',
    desc: 'Bronce → Corona. Cada nivel desbloquea bonos en efectivo progresivos.',
    icon: Award, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10',
    wide: false,
  },
  {
    label: 'Tienda integrada',
    desc: 'Catálogo completo donde cada compra activa comisiones automáticas para tu red.',
    icon: ShoppingBag, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10',
    wide: true,
  },
];

// ─── steps ────────────────────────────────────────────────────────────────────
const steps = [
  { n: '01', title: 'Elige tu plan', desc: 'Gratis, Pro o Elite. Sin permanencia, cambia cuando quieras.', icon: BarChart3 },
  { n: '02', title: 'Comparte tu enlace', desc: 'Un código único conecta automáticamente a nuevos referidos a tu red.', icon: Network },
  { n: '03', title: 'Cobra tus comisiones', desc: 'Pagos automáticos quincenales a tu cuenta bancaria o billetera digital.', icon: DollarSign },
];

// ─── region stats (bento cells) ───────────────────────────────────────────────
const regionStats = [
  { city: 'Lima', members: '4,820+', emoji: '🏙️' },
  { city: 'Arequipa', members: '1,940+', emoji: '🌋' },
  { city: 'Trujillo', members: '1,560+', emoji: '🌊' },
  { city: 'Cusco', members: '980+', emoji: '🏔️' },
  { city: 'Piura', members: '760+', emoji: '☀️' },
  { city: 'Ica', members: '480+', emoji: '🌿' },
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
    content: 'Escalé de Bronce a Platino en 4 meses. Los reportes en tiempo real me ayudan a saber exactamente qué parte de mi red necesita atención.',
    rank: 'Platino', earnings: 'S/ 5,500/mes',
  },
  {
    id: '6', name: 'Luciana Flores', role: 'Comerciante', city: 'Ica',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=80',
    content: 'El soporte 24/7 es increíble. Tuve una duda un domingo y en 15 minutos tenía respuesta. Eso genera mucha confianza.',
    rank: 'Oro', earnings: 'S/ 3,800/mes',
  },
];

// ─── store section ─────────────────────────────────────────────────────────────
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
    <section className="py-24 border-t border-border">
      <div className="max-w-[1100px] mx-auto px-6 sm:px-8">
        <Reveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Tienda</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Compra y genera <span className="text-gradient-animated">ingresos</span>
            </h2>
            <p className="text-muted-foreground mt-2">Cada producto activa comisiones para toda tu red.</p>
          </div>
          <Link
            to="/tienda"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border text-sm font-medium hover:border-primary/50 hover:text-primary transition-all group shrink-0"
          >
            Ver tienda completa
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            {itemCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                {itemCount}
              </span>
            )}
          </Link>
        </Reveal>

        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-6">
            <button
              onClick={() => setActiveCat('')}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                activeCat === ''
                  ? 'bg-foreground text-background'
                  : 'border border-border hover:border-foreground/30 text-muted-foreground hover:text-foreground',
              )}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCat(activeCat === cat.id ? '' : cat.id)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                  activeCat === cat.id
                    ? 'bg-foreground text-background'
                    : 'border border-border hover:border-foreground/30 text-muted-foreground hover:text-foreground',
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl overflow-hidden border border-border">
                <Skeleton className="aspect-square" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.slice(0, 4).map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── dashboard mockup ──────────────────────────────────────────────────────────
function AppMockup() {
  return (
    <div className="relative w-full max-w-[780px] mx-auto">
      {/* main window */}
      <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* title bar */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/30">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-background border border-border rounded-lg px-4 py-1 text-xs text-muted-foreground w-56 text-center">
              app.club360.pe/dashboard
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[200px_1fr] min-h-[320px]">
          {/* sidebar */}
          <div className="border-r border-border p-4 bg-muted/10 hidden sm:block">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Panel</div>
            {[
              { icon: BarChart3, label: 'Resumen', active: false },
              { icon: DollarSign, label: 'Comisiones', active: true },
              { icon: Network, label: 'Mi Red', active: false },
              { icon: Award, label: 'Rangos', active: false },
              { icon: ShoppingBag, label: 'Tienda', active: false },
            ].map(item => (
              <div
                key={item.label}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium mb-0.5 transition-colors',
                  item.active
                    ? 'bg-primary/15 text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                {item.label}
              </div>
            ))}
          </div>

          {/* main content */}
          <div className="p-5 space-y-4">
            {/* metric cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Comisiones', value: 'S/ 3,240', trend: '+12% este mes', tcolor: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Mi Red', value: '48', sub: 'afiliados', tcolor: 'text-primary' },
                { label: 'Rango', value: 'Platino', sub: '→ Diamante', tcolor: 'text-amber-600 dark:text-amber-400' },
              ].map(s => (
                <div key={s.label} className="bg-muted/40 rounded-xl p-3 border border-border">
                  <div className="text-[10px] text-muted-foreground mb-1.5">{s.label}</div>
                  <div className="text-sm font-bold text-foreground leading-tight">{s.value}</div>
                  <div className={cn('text-[10px] font-medium mt-0.5', s.tcolor)}>{s.trend || s.sub}</div>
                </div>
              ))}
            </div>

            {/* mini chart */}
            <div className="bg-muted/30 rounded-xl p-3.5 border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-medium text-muted-foreground">Comisiones — últimas 12 semanas</span>
                <span className="text-[10px] font-semibold text-primary">+S/ 890</span>
              </div>
              <div className="flex items-end gap-1 h-16">
                {[28, 45, 38, 62, 50, 74, 58, 82, 68, 90, 78, 100].map((h, i) => (
                  <div
                    key={i}
                    className={cn('flex-1 rounded-sm', i === 11 ? 'bg-primary' : 'bg-primary/20')}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            {/* activity */}
            <div className="space-y-2">
              {[
                { icon: DollarSign, text: 'Comisión binaria — Juan P.', val: '+S/ 120', ic: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
                { icon: Users, text: 'Nuevo afiliado en red', val: '+1', ic: 'text-primary bg-primary/10' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 border border-border">
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', item.ic)}>
                    <item.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs text-foreground flex-1">{item.text}</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* floating notification */}
      <div className="absolute -top-4 -right-2 sm:-right-6 bg-card border border-primary/25 rounded-2xl px-4 py-3 shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground leading-tight">Comisión acreditada</div>
            <div className="text-sm font-bold text-primary">+S/ 320.50</div>
          </div>
        </div>
      </div>

      {/* floating badge */}
      <div className="absolute -bottom-4 -left-2 sm:-left-6 bg-card border border-amber-500/25 rounded-2xl px-4 py-3 shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Award className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground leading-tight">Nuevo rango</div>
            <div className="text-sm font-bold text-amber-600 dark:text-amber-400">Diamante ✦</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── testimonials carousel ─────────────────────────────────────────────────────
function TestimonialCard({ t }: { t: (typeof allTestimonials)[0] }) {
  return (
    <div className="w-[310px] shrink-0 bg-card border border-border rounded-2xl p-5 mx-1.5">
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed mb-4">"{t.content}"</p>
      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/20" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground leading-none">{t.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{t.role}{(t as any).city ? `, ${(t as any).city}` : ''}</div>
        </div>
        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">{t.earnings}</div>
      </div>
    </div>
  );
}

function TestimonialsCarousel() {
  const row1 = [...allTestimonials, ...allTestimonials];
  const row2 = [...allTestimonials, ...allTestimonials].reverse();
  return (
    <div className="relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      <div className="flex mb-3 animate-marquee-left">
        {row1.map((t, i) => <TestimonialCard key={`r1-${i}`} t={t} />)}
      </div>
      <div className="flex animate-marquee-right">
        {row2.map((t, i) => <TestimonialCard key={`r2-${i}`} t={t} />)}
      </div>
    </div>
  );
}

// ─── main page ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('commissions');
  const { plans: allPlans, ranks, currency, currencySymbol, exchangeRate } = useConfig();
  const plans = allPlans.filter(p => p.is_active);
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-0 overflow-hidden">
        {/* grid background */}
        <div className="absolute inset-0 bg-dub-grid mask-fade-top opacity-70" />
        {/* subtle glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-radial from-primary/8 to-transparent blur-[80px]" />

        <div className="relative max-w-[1100px] mx-auto px-6 sm:px-8 text-center">

          {/* Announcement pill */}
          <Reveal>
            <a href="#planes" className="inline-flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-full text-sm text-foreground hover:border-primary/40 transition-colors mb-8 group shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="font-medium">Nuevo: Bonos de rango Corona</span>
              <span className="text-muted-foreground mx-1">·</span>
              <span className="text-primary group-hover:text-primary/80 font-medium flex items-center gap-1">
                Ver más <ExternalLink className="w-3.5 h-3.5" />
              </span>
            </a>
          </Reveal>

          {/* Heading */}
          <Reveal delay={80}>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold text-foreground leading-[1.02] tracking-tight mb-6">
              Construye tu red.<br />
              <span className="text-gradient-animated">Cobra automático.</span>
            </h1>
          </Reveal>

          {/* Subtext */}
          <Reveal delay={160}>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Club 360 es la plataforma MLM líder en Latinoamérica. Comisiones en tiempo real, red genealógica interactiva y tienda integrada.
            </p>
          </Reveal>

          {/* CTAs */}
          <Reveal delay={220}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
              <Link
                to={user ? '/dashboard' : '/registro'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-foreground text-background font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-base shadow-lg"
              >
                {user ? 'Ir a mi Panel' : 'Empezar gratis'}
                <ArrowRight className="w-4.5 h-4.5" />
              </Link>
              <Link
                to="/planes"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-background border border-border text-foreground font-medium rounded-xl hover:border-primary/50 hover:text-primary transition-all text-base"
              >
                Ver planes
              </Link>
            </div>
          </Reveal>

          {/* Trust signals */}
          <Reveal delay={280}>
            <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-muted-foreground mb-12">
              {[
                { icon: Lock, text: 'SSL 256-bit', color: 'text-emerald-600 dark:text-emerald-400' },
                { icon: Shield, text: 'INDECOPI', color: 'text-primary' },
                { icon: Check, text: 'Sin permanencia', color: 'text-primary' },
                { icon: CreditCard, text: 'Pago quincenal', color: 'text-amber-600 dark:text-amber-400' },
              ].map(item => (
                <span key={item.text} className="flex items-center gap-1.5">
                  <item.icon className={cn('w-4 h-4', item.color)} />
                  {item.text}
                </span>
              ))}
            </div>
          </Reveal>

          {/* Feature tabs */}
          <Reveal delay={340}>
            <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
              {featureTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-all',
                    activeTab === tab.id
                      ? 'bg-foreground text-background border-foreground shadow-sm'
                      : 'bg-background border-border text-foreground/70 hover:border-primary/50 hover:text-foreground',
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        {/* App mockup */}
        <Reveal delay={420} className="relative max-w-[1100px] mx-auto px-8 sm:px-12 pb-0">
          <div className="relative">
            <AppMockup />
            {/* bottom fade into next section */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          </div>
        </Reveal>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────────────────────── */}
      <section className="py-14 border-y border-border bg-muted/30">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10">
            {[
              { value: '12,540+', label: 'Afiliados activos', icon: Users, color: 'text-primary' },
              { value: 'S/ 2.8M+', label: 'Comisiones pagadas', icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400' },
              { value: '8 países', label: 'Presencia regional', icon: Globe, color: 'text-primary' },
              { value: '+340%', label: 'Crecimiento anual', icon: TrendingUp, color: 'text-amber-600 dark:text-amber-400' },
            ].map((stat, i) => (
              <Reveal key={stat.label} delay={i * 60}>
                <div className="text-center">
                  <stat.icon className={cn('w-5 h-5 mx-auto mb-2', stat.color)} />
                  <div className="text-3xl font-bold text-foreground tracking-tight">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section className="relative py-24">
        <div className="absolute inset-0 bg-dub-grid opacity-25 mask-fade-center" />
        <div className="relative max-w-[1100px] mx-auto px-6 sm:px-8">
          <Reveal className="mb-16">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-4 block">Plataforma</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-4">
              Todo lo que necesitas<br />para <span className="text-gradient-animated">crecer</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl">
              Cada herramienta está diseñada para resolver un problema real del negocio multinivel.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bento-gap">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              const isWide = feat.wide;
              return (
                <Reveal key={feat.label} delay={i * 60} className={isWide ? 'md:col-span-2' : ''}>
                  <div className="h-full bg-card border border-border rounded-2xl p-8 card-lift hover:border-primary/30">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-5', feat.bg)}>
                      <Icon className={cn('w-6 h-6', feat.color)} />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">{feat.label}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feat.desc}</p>
                    {i === 0 && (
                      <div className="mt-6 flex flex-wrap gap-2">
                        {['7% Directa', '4% Binaria', '2% Unilevel', 'Pago quincenal'].map(tag => (
                          <span key={tag} className="px-3 py-1.5 bg-muted rounded-full text-xs font-medium text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {i === 3 && (
                      <Link to="/tienda" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary mt-4 hover:gap-2.5 transition-all">
                        Explorar tienda <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── DARK PROMO ──────────────────────────────────────────────────────── */}
      <section className="relative py-28 overflow-hidden bg-[#0c0a08]">
        <div className="absolute inset-0 bg-dub-grid-dark opacity-60" />
        <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[70%] bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[60%] bg-gradient-to-tl from-amber-900/30 to-transparent rounded-full blur-[100px]" />

        <div className="relative max-w-[1100px] mx-auto px-6 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <Reveal>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/8 border border-white/12 rounded-full text-xs font-medium text-white/70 mb-6 backdrop-blur-sm">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Sistema multinivel inteligente
                </div>
                <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-5 tracking-tight">
                  Potencia tu negocio<br />
                  <span style={{ color: 'hsl(43 95% 60%)' }}>al máximo nivel</span>
                </h2>
                <p className="text-lg text-white/50 leading-relaxed mb-8">
                  Mientras duermes, el sistema calcula y distribuye comisiones a toda tu red. Sin errores, sin retrasos, sin papeleo.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    to={user ? '/dashboard' : '/registro'}
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/25"
                  >
                    Empezar ahora <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/contacto"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/10 border border-white/15 text-white font-medium rounded-xl hover:bg-white/15 transition-all backdrop-blur-sm"
                  >
                    Hablar con ventas
                  </Link>
                </div>
              </Reveal>
            </div>

            <Reveal delay={120}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: DollarSign, title: 'Comisiones en tiempo real', desc: 'Se calculan al instante, cada vez que alguien en tu red realiza una compra.', color: 'text-emerald-400' },
                  { icon: Zap, title: 'Pago automático', desc: 'Transferencias quincenales sin ningún trámite de tu parte.', color: 'text-primary' },
                  { icon: Globe, title: 'Red internacional', desc: 'Tus afiliados pueden estar en cualquier país de Latinoamérica.', color: 'text-blue-400' },
                  { icon: TrendingUp, title: 'Crecimiento probado', desc: '+340% de crecimiento en el último año. Números reales, no promesas.', color: 'text-amber-400' },
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 border border-white/8 rounded-2xl p-5 hover:bg-white/8 transition-colors">
                    <item.icon className={cn('w-6 h-6 mb-3', item.color)} />
                    <div className="text-sm font-semibold text-white mb-1.5">{item.title}</div>
                    <div className="text-xs text-white/45 leading-relaxed">{item.desc}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section className="py-24 border-b border-border">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8">
          <Reveal className="mb-16">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-4 block">Proceso</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
              De cero a <span className="text-gradient-animated">comisiones</span><br />en minutos
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <Reveal key={step.n} delay={i * 80}>
                <div className="relative">
                  <div className="text-6xl font-bold text-border/60 dark:text-border/40 mb-4 select-none">{step.n}</div>
                  <div className="mb-4">
                    <step.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-full w-8 border-t border-dashed border-border -translate-x-4" />
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS BENTO ──────────────────────────────────────────────── */}
      <section className="py-24 border-b border-border">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 mb-16">
          <Reveal>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-4 block">Testimonios</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
              Miles ya <span className="text-gradient-animated">ganan</span> con Club 360
            </h2>
            <p className="text-lg text-muted-foreground mt-3 max-w-xl">
              Historias reales de emprendedores en toda Latinoamérica.
            </p>
          </Reveal>
        </div>

        {/* dub.co-style bento testimonials grid */}
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 mb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border border-border rounded-2xl overflow-hidden">
            {/* Row 1 */}
            {/* Region stats × 2 */}
            {regionStats.slice(0, 2).map((region, i) => (
              <div key={region.city} className={cn('p-8 border-border flex flex-col items-center justify-center text-center', i < 2 && 'border-b sm:border-b lg:border-b', i === 0 && 'sm:border-r')}>
                <div className="text-4xl mb-3">{region.emoji}</div>
                <div className="text-2xl font-bold text-foreground">{region.members}</div>
                <div className="text-sm text-muted-foreground mt-1">afiliados en {region.city}</div>
              </div>
            ))}
            {/* Full testimonial - spans 2 rows on large */}
            <div className="p-8 border-t border-border sm:border-t-0 sm:border-l lg:border-l row-span-1 lg:row-span-2 flex flex-col justify-between">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <div className="flex-1">
                <p className="text-foreground/85 leading-relaxed text-base mb-5">
                  "{allTestimonials[0].content}"
                </p>
              </div>
              <div>
                <div className="flex gap-2 mb-4 flex-wrap">
                  {['Comisiones automáticas', 'Red binaria'].map(tag => (
                    <span key={tag} className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <img src={allTestimonials[0].avatar} alt={allTestimonials[0].name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">{allTestimonials[0].name}</div>
                    <div className="text-xs text-muted-foreground">{allTestimonials[0].role}</div>
                  </div>
                  <div className="ml-auto text-sm font-bold text-emerald-600 dark:text-emerald-400">{allTestimonials[0].earnings}</div>
                </div>
              </div>
            </div>

            {/* Row 2 */}
            <div className="p-8 border-t border-border sm:border-r flex flex-col justify-between col-span-1 sm:col-span-2 lg:col-span-1">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-foreground/85 leading-relaxed mb-5">"{allTestimonials[1].content}"</p>
              <div className="flex items-center gap-3">
                <img src={allTestimonials[1].avatar} alt={allTestimonials[1].name} className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <div className="text-sm font-semibold text-foreground">{allTestimonials[1].name}</div>
                  <div className="text-xs text-muted-foreground">{allTestimonials[1].role}</div>
                </div>
                <div className="ml-auto text-sm font-bold text-emerald-600 dark:text-emerald-400">{allTestimonials[1].earnings}</div>
              </div>
            </div>

            {/* Row 3 */}
            {regionStats.slice(2, 4).map((region, i) => (
              <div key={region.city} className={cn('p-8 border-t border-border flex flex-col items-center justify-center text-center', i === 0 && 'sm:border-r')}>
                <div className="text-4xl mb-3">{region.emoji}</div>
                <div className="text-2xl font-bold text-foreground">{region.members}</div>
                <div className="text-sm text-muted-foreground mt-1">afiliados en {region.city}</div>
              </div>
            ))}
            <div className="p-8 border-t border-border sm:border-l flex flex-col justify-between">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-foreground/85 leading-relaxed mb-5">"{allTestimonials[2].content}"</p>
              <div className="flex items-center gap-3">
                <img src={allTestimonials[2].avatar} alt={allTestimonials[2].name} className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <div className="text-sm font-semibold text-foreground">{allTestimonials[2].name}</div>
                  <div className="text-xs text-muted-foreground">{allTestimonials[2].role}</div>
                </div>
                <div className="ml-auto text-sm font-bold text-emerald-600 dark:text-emerald-400">{allTestimonials[2].earnings}</div>
              </div>
            </div>
          </div>
        </div>

        {/* marquee carousel below the bento */}
        <TestimonialsCarousel />
      </section>

      {/* ── RANKS ───────────────────────────────────────────────────────────── */}
      {ranks.filter(r => r.is_active !== false).length > 0 && (
        <section className="py-24 border-b border-border">
          <div className="max-w-[1100px] mx-auto px-6 sm:px-8">
            <div className="grid lg:grid-cols-[1fr_1.4fr] gap-14 items-start">
              <Reveal>
                <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-4 block">Rangos</span>
                <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-4">
                  Cada nivel,<br /><span className="text-gradient-animated">más ingresos</span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                  El sistema premia tu esfuerzo con bonos progresivos. Desde el bono de bienvenida Bronce hasta el máximo nivel Corona.
                </p>
                <Link
                  to={user ? '/dashboard/rangos' : '/registro'}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-semibold rounded-xl hover:opacity-90 transition-all"
                >
                  {user ? 'Ver mis rangos' : 'Ver todos los rangos'} <ArrowRight className="w-4 h-4" />
                </Link>
              </Reveal>

              <Reveal delay={100}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ranks.filter(r => r.is_active !== false).slice(0, 6).map(r => (
                    <div
                      key={r.id}
                      className={cn('bg-card rounded-2xl p-5 border transition-all card-lift text-center', r.border_color || 'border-border hover:border-primary/30')}
                    >
                      <div className="text-3xl mb-2">{r.icon}</div>
                      <div className={cn('font-bold text-sm mb-1', r.color || 'text-foreground')}>{r.name}</div>
                      <div className="text-xs text-muted-foreground mb-1.5">Bono de rango</div>
                      <div className="text-lg font-bold text-foreground">
                        {formatPrice(r.bonus, currency, currencySymbol, exchangeRate)}
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {/* ── PLANS ───────────────────────────────────────────────────────────── */}
      {plans.length > 0 && (
        <section className="py-24 border-b border-border" id="planes">
          <div className="max-w-[1100px] mx-auto px-6 sm:px-8">
            <Reveal className="mb-14">
              <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-4 block">Precios</span>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight mb-4">
                Planes flexibles<br />que crecen contigo
              </h2>
              <p className="text-lg text-muted-foreground max-w-lg">
                Comienza gratis y escala cuando tu negocio lo necesite.
              </p>
            </Reveal>

            <Reveal delay={80}>
              <div className={cn(
                'grid gap-5',
                plans.length <= 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
              )}>
                {plans.map(plan => {
                  const isFree = plan.is_free || plan.price === 0;
                  const isCurrent = user && (user as any).plan === plan.slug;
                  return (
                    <div
                      key={plan.id}
                      className={cn(
                        'bg-card rounded-2xl p-7 flex flex-col relative overflow-hidden transition-all card-lift',
                        plan.is_popular
                          ? 'border-2 border-foreground shadow-xl'
                          : 'border border-border hover:border-primary/40',
                      )}
                    >
                      {plan.is_popular && (
                        <div className="absolute top-5 right-5">
                          <span className="px-2.5 py-1 bg-foreground text-background text-[11px] font-bold rounded-full uppercase tracking-wide">
                            Mejor valor
                          </span>
                        </div>
                      )}

                      <div className="mb-6">
                        <h3 className="text-2xl font-bold text-foreground mb-1.5">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                      </div>

                      <div className="mb-7">
                        <div className="flex items-end gap-1.5">
                          <span className="text-4xl font-bold text-foreground">
                            {isFree ? 'Gratis' : formatPrice(plan.price, currency, currencySymbol, exchangeRate)}
                          </span>
                          {!isFree && <span className="text-muted-foreground text-base mb-1">/mes</span>}
                        </div>
                      </div>

                      {isCurrent ? (
                        <div className="py-3.5 text-center bg-emerald-500/10 rounded-xl border border-emerald-500/20 mb-6">
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Tu plan actual</span>
                        </div>
                      ) : (
                        <Link
                          to={user ? '/dashboard/mi-plan' : `/registro?plan=${plan.slug}`}
                          className={cn(
                            'py-3.5 mb-6 rounded-xl text-sm font-semibold text-center transition-all block',
                            plan.is_popular
                              ? 'bg-foreground text-background hover:opacity-90'
                              : 'border border-border hover:border-foreground/50 hover:bg-muted',
                          )}
                        >
                          {isFree ? 'Comenzar gratis' : 'Activar plan'}
                        </Link>
                      )}

                      <div className="border-t border-border pt-6">
                        <div className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">
                          {plan.is_popular ? 'Todo en Inicio, más:' : 'Incluye:'}
                        </div>
                        <ul className="space-y-3">
                          {(plan.features || []).slice(0, 5).map((f: string) => (
                            <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                              <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Reveal>

            <p className="text-center text-sm text-muted-foreground mt-8">
              <Link to="/planes" className="text-primary font-medium hover:underline">
                Ver comparación completa de planes →
              </Link>
            </p>
          </div>
        </section>
      )}

      {/* ── STORE ───────────────────────────────────────────────────────────── */}
      <StoreSection />

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section className="relative py-24 border-t border-border">
        <div className="absolute inset-0 bg-dub-grid opacity-20 mask-fade-center" />
        <div className="relative max-w-[720px] mx-auto px-6 sm:px-8">
          <Reveal className="mb-14">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-4 block">FAQ</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
              Preguntas <span className="text-gradient-animated">frecuentes</span>
            </h2>
          </Reveal>

          <Reveal delay={80}>
            <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden">
              {faqItems.map((faq, i) => (
                <div key={i} className={cn('bg-card transition-colors', openFaq === i && 'bg-muted/30')}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-7 py-5 text-left gap-4 group"
                  >
                    <span className="text-base font-semibold text-foreground">{faq.question}</span>
                    <ChevronDown className={cn('w-5 h-5 text-muted-foreground transition-transform shrink-0', openFaq === i && 'rotate-180')} />
                  </button>
                  <div className={cn('grid transition-all', openFaq === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                    <div className="overflow-hidden">
                      <div className="px-7 pb-6">
                        <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="relative py-32 overflow-hidden bg-[#0c0a08]">
        <div className="absolute inset-0 bg-dub-grid-dark opacity-50" />
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-primary/20 to-transparent blur-[100px]" />

        <div className="relative z-10 max-w-[780px] mx-auto px-6 text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/8 border border-white/12 rounded-full text-xs font-medium text-white/70 mb-8 backdrop-blur-sm">
              <Zap className="w-3.5 h-3.5 text-primary" />
              Sin tarjeta de crédito requerida
            </div>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-5 leading-[1.05] tracking-tight">
              Tu red no espera.
            </h2>
            <p className="text-xl sm:text-2xl font-bold mb-3" style={{ color: 'hsl(43 95% 60%)' }}>
              Empieza hoy mismo.
            </p>
            <p className="text-lg text-white/45 max-w-lg mx-auto mb-12 leading-relaxed">
              Únete a miles de emprendedores que ya construyen libertad financiera con Club 360.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                to={user ? '/dashboard' : '/registro'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-9 py-4 bg-white text-black font-semibold rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all shadow-2xl text-base"
              >
                {user ? 'Ir a mi Panel' : 'Crear cuenta gratis'} <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/contacto"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-9 py-4 bg-white/8 border border-white/15 text-white font-medium rounded-xl hover:bg-white/12 transition-all text-base backdrop-blur-sm"
              >
                Hablar con ventas
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-white/35">
              {['Cuenta gratuita', 'Sin permanencia', 'Pago quincenal', 'Soporte 24/7'].map(t => (
                <span key={t} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-white/50" /> {t}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
