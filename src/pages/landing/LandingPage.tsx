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
import { useState, useEffect, useCallback, useRef } from 'react';
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

// ─── features ─────────────────────────────────────────────────────────────────
const features = [
  {
    label: 'Comisiones automáticas',
    desc: '7% directa · 4% binaria · 2% unilevel. Cálculo en tiempo real, pago cada 15 días.',
    icon: Wallet, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/8',
    tags: ['7% Directa', '4% Binaria', '2% Unilevel', 'Pago quincenal'],
    wide: true,
  },
  {
    label: 'Red genealógica interactiva',
    desc: 'Panel visual con árbol binario, zoom dinámico y estadísticas por nodo en tiempo real.',
    icon: Network, color: 'text-primary', bg: 'bg-primary/8',
    wide: false,
  },
  {
    label: 'Sistema de rangos',
    desc: 'Bronce → Corona. Cada nivel desbloquea bonos progresivos exclusivos.',
    icon: Award, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/8',
    wide: false,
  },
  {
    label: 'Tienda integrada',
    desc: 'Catálogo completo donde cada compra activa comisiones automáticas en tu red.',
    icon: ShoppingBag, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/8',
    wide: true,
    link: true,
  },
];

// ─── steps ────────────────────────────────────────────────────────────────────
const steps = [
  { n: '01', title: 'Elige tu plan', desc: 'Gratis, Pro o Elite. Sin permanencia, cambia cuando quieras.', icon: BarChart3 },
  { n: '02', title: 'Comparte tu enlace', desc: 'Tu código único conecta automáticamente a nuevos referidos.', icon: Network },
  { n: '03', title: 'Cobra tus comisiones', desc: 'Pagos automáticos quincenales. Sin trámites, sin demoras.', icon: DollarSign },
];

// ─── region stats ──────────────────────────────────────────────────────────────
const regionStats = [
  { city: 'Lima', members: '4,820+', emoji: '🏙️' },
  { city: 'Arequipa', members: '1,940+', emoji: '🌋' },
  { city: 'Trujillo', members: '1,560+', emoji: '🌊' },
  { city: 'Cusco', members: '980+', emoji: '🏔️' },
  { city: 'Piura', members: '760+', emoji: '☀️' },
  { city: 'Ica', members: '480+', emoji: '🌿' },
];

// ─── extended testimonials ─────────────────────────────────────────────────────
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

// ─── subtle section divider ────────────────────────────────────────────────────
function SectionDivider() {
  return <div className="section-divider mx-auto max-w-[1100px]" />;
}

// ─── store ─────────────────────────────────────────────────────────────────────
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
    <>
      <SectionDivider />
      <section className="py-24">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8">
          <Reveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Tienda</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                Compra y genera <span className="text-gradient-animated">ingresos</span>
              </h2>
              <p className="text-muted-foreground mt-2 max-w-md">Cada producto activa comisiones automáticas para toda tu red.</p>
            </div>
            <Link to="/tienda" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border/70 text-sm font-medium hover:border-primary/50 hover:text-primary transition-all group shrink-0">
              Ver tienda completa
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              {itemCount > 0 && <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">{itemCount}</span>}
            </Link>
          </Reveal>

          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-6">
              <button onClick={() => setActiveCat('')} className={cn('px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all', activeCat === '' ? 'bg-foreground text-background' : 'border border-border/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground')}>Todos</button>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setActiveCat(activeCat === cat.id ? '' : cat.id)} className={cn('px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all', activeCat === cat.id ? 'bg-foreground text-background' : 'border border-border/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground')}>{cat.name}</button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-card rounded-xl overflow-hidden border border-border/60"><Skeleton className="aspect-square" /></div>)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.slice(0, 4).map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

// ─── app mockup ───────────────────────────────────────────────────────────────
function AppMockup() {
  const appHost = typeof window !== 'undefined' ? window.location.host : 'app.club360.pe';
  return (
    <div className="relative w-full max-w-[780px] mx-auto">
      <div className="bg-card border border-border/60 rounded-2xl shadow-[0_24px_64px_-16px_rgba(0,0,0,0.12)] dark:shadow-[0_24px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* title bar */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50 bg-muted/20">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-background/80 border border-border/50 rounded-lg px-4 py-1 text-xs text-muted-foreground w-56 text-center backdrop-blur-sm">
              {appHost}/dashboard
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[180px_1fr] min-h-[310px]">
          {/* sidebar */}
          <div className="border-r border-border/40 p-3.5 bg-muted/10 hidden sm:block">
            <div className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-3 px-2">Panel</div>
            {[
              { icon: BarChart3, label: 'Resumen', active: false },
              { icon: DollarSign, label: 'Comisiones', active: true },
              { icon: Network, label: 'Mi Red', active: false },
              { icon: Award, label: 'Rangos', active: false },
              { icon: ShoppingBag, label: 'Tienda', active: false },
            ].map(item => (
              <div key={item.label} className={cn('flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium mb-0.5', item.active ? 'bg-primary/12 text-primary font-semibold' : 'text-muted-foreground/70')}>
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                {item.label}
              </div>
            ))}
          </div>

          {/* content */}
          <div className="p-4 space-y-3.5">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Comisiones', value: 'S/ 3,240', sub: '+12% mes', c: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Mi Red', value: '48', sub: 'afiliados', c: 'text-primary' },
                { label: 'Rango', value: 'Platino', sub: '→ Diamante', c: 'text-amber-600 dark:text-amber-400' },
              ].map(s => (
                <div key={s.label} className="bg-muted/30 rounded-xl p-3 border border-border/40">
                  <div className="text-[10px] text-muted-foreground/70 mb-1">{s.label}</div>
                  <div className="text-sm font-bold text-foreground">{s.value}</div>
                  <div className={cn('text-[10px] font-medium mt-0.5', s.c)}>{s.sub}</div>
                </div>
              ))}
            </div>

            <div className="bg-muted/20 rounded-xl p-3.5 border border-border/40">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-muted-foreground/70 font-medium">Comisiones — últimas 12 semanas</span>
                <span className="text-[10px] font-semibold text-primary">+S/ 890</span>
              </div>
              <div className="flex items-end gap-1 h-[60px]">
                {[28, 45, 38, 62, 50, 74, 58, 82, 68, 90, 78, 100].map((h, i) => (
                  <div key={i} className={cn('flex-1 rounded-sm', i === 11 ? 'bg-primary' : 'bg-primary/20')} style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {[
                { icon: DollarSign, text: 'Comisión binaria — Juan P.', val: '+S/ 120', ic: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
                { icon: Users, text: 'Nuevo afiliado en red', val: '+1 afil.', ic: 'text-primary bg-primary/10' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/20 border border-border/40">
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', item.ic)}><item.icon className="w-3.5 h-3.5" /></div>
                  <span className="text-xs text-foreground flex-1">{item.text}</span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* floating notification */}
      <div className="absolute -top-5 -right-2 sm:-right-7 bg-card border border-primary/20 rounded-2xl px-4 py-3 shadow-xl shadow-primary/5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground leading-tight">Comisión acreditada</div>
            <div className="text-sm font-bold text-primary">+S/ 320.50</div>
          </div>
        </div>
      </div>

      {/* floating badge */}
      <div className="absolute -bottom-5 -left-2 sm:-left-7 bg-card border border-amber-500/20 rounded-2xl px-4 py-3 shadow-xl shadow-amber-500/5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
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

// ─── testimonial carousel ──────────────────────────────────────────────────────
function TestimonialCard({ t }: { t: (typeof allTestimonials)[0] }) {
  return (
    <div className="w-[300px] sm:w-[320px] shrink-0 bg-card border border-border/60 rounded-2xl p-5 mx-2">
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
      </div>
      <p className="text-sm text-foreground/75 leading-relaxed mb-4">"{t.content}"</p>
      <div className="flex items-center gap-3 pt-3.5 border-t border-border/50">
        <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/15" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground leading-tight">{t.name}</div>
          <div className="text-xs text-muted-foreground">{t.role}{(t as any).city ? `, ${(t as any).city}` : ''}</div>
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
      <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      <div className="flex mb-3 animate-marquee-left">
        {row1.map((t, i) => <TestimonialCard key={`r1-${i}`} t={t} />)}
      </div>
      <div className="flex animate-marquee-right">
        {row2.map((t, i) => <TestimonialCard key={`r2-${i}`} t={t} />)}
      </div>
    </div>
  );
}

// ─── main ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('commissions');
  const { plans: allPlans, ranks, currency, currencySymbol, exchangeRate } = useConfig();
  const plans = allPlans.filter(p => p.is_active);
  const { user } = useAuthStore();

  const heroRef = useRef<HTMLElement>(null);

  // Mouse spotlight for hero grid
  const handleHeroMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = heroRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty('--hero-mx', `${x}%`);
    el.style.setProperty('--hero-my', `${y}%`);
  }, []);

  const handleHeroEnter = useCallback(() => {
    heroRef.current?.style.setProperty('--hero-active', '1');
  }, []);

  const handleHeroLeave = useCallback(() => {
    heroRef.current?.style.setProperty('--hero-active', '0');
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="hero-mouse-zone relative pt-20 pb-0 overflow-hidden"
        onMouseMove={handleHeroMove}
        onMouseEnter={handleHeroEnter}
        onMouseLeave={handleHeroLeave}
      >
        {/* grid */}
        <div className="absolute inset-0 bg-dub-grid mask-fade-top" />
        {/* mouse spotlight layer (squares glow) */}
        <div className="hero-spotlight-layer" />
        {/* center radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-radial from-primary/6 to-transparent blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-[1100px] mx-auto px-6 sm:px-8 text-center">

          {/* Announcement pill */}
          <Reveal>
            <a href="#planes" className="inline-flex items-center gap-2 px-4 py-2 bg-background/90 border border-border/70 rounded-full text-sm text-foreground hover:border-primary/50 transition-all mb-8 group shadow-sm backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
              <span className="font-medium">Nuevo: Bonos de rango Corona disponibles</span>
              <span className="text-border mx-1">·</span>
              <span className="text-primary group-hover:text-primary/80 font-medium flex items-center gap-1 shrink-0">
                Ver más <ExternalLink className="w-3 h-3" />
              </span>
            </a>
          </Reveal>

          {/* Main heading */}
          <Reveal delay={80}>
            <h1 className="text-gold-glow text-5xl sm:text-6xl lg:text-7xl xl:text-[5.5rem] font-bold text-foreground leading-[1.03] tracking-[-0.02em] mb-6">
              Construye tu red.<br />
              <span className="text-gradient-animated">Cobra automático.</span>
            </h1>
          </Reveal>

          {/* Subtext */}
          <Reveal delay={150}>
            <p className="text-lg sm:text-xl text-muted-foreground/80 max-w-2xl mx-auto mb-10 leading-relaxed">
              La plataforma MLM líder en Latinoamérica. Comisiones en tiempo real, red interactiva y tienda integrada.
            </p>
          </Reveal>

          {/* CTAs */}
          <Reveal delay={220}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
              <Link
                to={user ? '/dashboard' : '/registro'}
                className="btn-gold-shimmer w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-foreground text-background font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-base shadow-lg"
              >
                {user ? 'Ir a mi Panel' : 'Empezar gratis'}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/planes"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-background/80 border border-border/70 text-foreground font-medium rounded-xl hover:border-primary/50 hover:text-primary transition-all text-base backdrop-blur-sm"
              >
                Ver planes
              </Link>
            </div>
          </Reveal>

          {/* Trust */}
          <Reveal delay={280}>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-muted-foreground/70 mb-12">
              {[
                { icon: Lock, text: 'SSL 256-bit', color: 'text-emerald-600 dark:text-emerald-400' },
                { icon: Shield, text: 'INDECOPI', color: 'text-primary' },
                { icon: Check, text: 'Sin permanencia', color: 'text-primary' },
                { icon: CreditCard, text: 'Pago quincenal', color: 'text-amber-600 dark:text-amber-400' },
              ].map(item => (
                <span key={item.text} className="flex items-center gap-1.5">
                  <item.icon className={cn('w-3.5 h-3.5', item.color)} />
                  {item.text}
                </span>
              ))}
            </div>
          </Reveal>

          {/* Feature tabs */}
          <Reveal delay={340}>
            <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
              {featureTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-all',
                    activeTab === tab.id
                      ? 'bg-foreground text-background border-foreground shadow-sm'
                      : 'bg-background/70 border-border/60 text-foreground/60 hover:border-primary/50 hover:text-foreground backdrop-blur-sm',
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
        <Reveal delay={420} className="relative max-w-[1100px] mx-auto px-8 sm:px-16 pb-0">
          <div className="relative">
            <AppMockup />
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          </div>
        </Reveal>
      </section>

      {/* ── STATS ───────────────────────────────────────────────────────────── */}
      <section className="py-16 bg-muted/20">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12">
            {[
              { value: '12,540+', label: 'Afiliados activos', icon: Users, color: 'text-primary' },
              { value: 'S/ 2.8M+', label: 'Comisiones pagadas', icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400' },
              { value: '8 países', label: 'Presencia regional', icon: Globe, color: 'text-primary' },
              { value: '+340%', label: 'Crecimiento anual', icon: TrendingUp, color: 'text-amber-600 dark:text-amber-400' },
            ].map((stat, i) => (
              <Reveal key={stat.label} delay={i * 60}>
                <div className="text-center">
                  <stat.icon className={cn('w-5 h-5 mx-auto mb-3', stat.color)} />
                  <div className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">{stat.value}</div>
                  <div className="text-sm text-muted-foreground/80 mt-1.5">{stat.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-dub-grid opacity-20 mask-fade-center" />
        <div className="relative max-w-[1100px] mx-auto px-6 sm:px-8">
          <Reveal className="mb-14">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Plataforma</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-3">
              Todo lo que necesitas<br />para <span className="text-gradient-animated">crecer</span>
            </h2>
            <p className="text-lg text-muted-foreground/80 max-w-xl">Cada herramienta resuelve un problema real del negocio multinivel.</p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <Reveal key={feat.label} delay={i * 50} className={feat.wide ? 'md:col-span-2' : ''}>
                  <div className="h-full bg-card/70 border border-border/50 rounded-2xl p-7 card-lift hover:border-primary/25 group backdrop-blur-sm">
                    <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-5', feat.bg)}>
                      <Icon className={cn('w-5.5 h-5.5', feat.color)} />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{feat.label}</h3>
                    <p className="text-sm text-muted-foreground/80 leading-relaxed">{feat.desc}</p>
                    {feat.tags && (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {feat.tags.map(tag => (
                          <span key={tag} className="px-3 py-1 bg-muted/60 rounded-full text-xs font-medium text-muted-foreground">{tag}</span>
                        ))}
                      </div>
                    )}
                    {feat.link && (
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

      <SectionDivider />

      {/* ── DARK PROMO ──────────────────────────────────────────────────────── */}
      <section className="relative py-28 overflow-hidden bg-[#0c0a08]">
        <div className="absolute inset-0 bg-dub-grid-dark" />
        {/* multi-layer gold glow */}
        <div className="absolute -top-1/4 -left-1/4 w-[70%] h-[70%] rounded-full bg-gradient-to-br from-primary/15 via-primary/5 to-transparent blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[60%] h-[60%] rounded-full bg-gradient-to-tl from-amber-900/20 to-transparent blur-[100px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />

        <div className="relative max-w-[1100px] mx-auto px-6 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/6 border border-white/10 rounded-full text-xs font-medium text-white/60 mb-6 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Sistema multinivel inteligente
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold text-white leading-[1.08] mb-5 tracking-tight">
                Potencia tu negocio<br />
                <span style={{ color: 'hsl(43 95% 62%)' }}>al máximo nivel</span>
              </h2>
              <p className="text-lg text-white/40 leading-relaxed mb-8 max-w-lg">
                Mientras duermes, el sistema calcula y distribuye comisiones a toda tu red. Sin errores, sin retrasos.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to={user ? '/dashboard' : '/registro'}
                  className="btn-gold-shimmer inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20 text-base"
                >
                  Empezar ahora <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/contacto"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/6 border border-white/12 text-white font-medium rounded-xl hover:bg-white/10 transition-all backdrop-blur-sm text-base"
                >
                  Hablar con ventas
                </Link>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="grid grid-cols-2 gap-3.5">
                {[
                  { icon: DollarSign, title: 'Comisiones en tiempo real', desc: 'Calculadas al instante en cada compra de tu red.', color: 'text-emerald-400' },
                  { icon: Zap, title: 'Pago automático', desc: 'Transferencias quincenales sin trámite de tu parte.', color: 'text-primary' },
                  { icon: Globe, title: 'Red internacional', desc: 'Tus afiliados pueden estar en toda Latinoamérica.', color: 'text-blue-400' },
                  { icon: TrendingUp, title: 'Crecimiento probado', desc: '+340% anual. Números reales, no promesas.', color: 'text-amber-400' },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="bg-white/4 border border-white/7 rounded-2xl p-5 hover:bg-white/7 transition-colors">
                      <Icon className={cn('w-6 h-6 mb-3', item.color)} />
                      <div className="text-sm font-semibold text-white/90 mb-1.5">{item.title}</div>
                      <div className="text-xs text-white/40 leading-relaxed">{item.desc}</div>
                    </div>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8">
          <Reveal className="mb-14">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Proceso</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
              De cero a <span className="text-gradient-animated">comisiones</span><br className="hidden sm:block" /> en minutos
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10">
            {steps.map((step, i) => (
              <Reveal key={step.n} delay={i * 80}>
                <div className="relative">
                  <div className="text-7xl font-black text-border/30 dark:text-border/20 mb-3 select-none leading-none">{step.n}</div>
                  <div className="mb-4"><step.icon className="w-8 h-8 text-primary" /></div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-muted-foreground/80 leading-relaxed text-sm">{step.desc}</p>
                  {i < steps.length - 1 && <div className="hidden md:block absolute top-10 left-[calc(100%+20px)] w-8 border-t-2 border-dashed border-border/40" />}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── TESTIMONIALS BENTO ──────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 mb-14">
          <Reveal>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Testimonios</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
              Miles ya <span className="text-gradient-animated">ganan</span> con Club 360
            </h2>
            <p className="text-lg text-muted-foreground/80 mt-3 max-w-xl">Historias reales de emprendedores en toda Latinoamérica.</p>
          </Reveal>
        </div>

        {/* dub.co bento grid */}
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 mb-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/50 sm:divide-y-0">
            {/* col 1 & 2: region + testimonial alternating */}
            <div className="p-8 sm:border-r border-border/50 flex flex-col items-center justify-center text-center">
              <div className="text-5xl mb-3">{regionStats[0].emoji}</div>
              <div className="text-2xl font-bold text-foreground">{regionStats[0].members}</div>
              <div className="text-sm text-muted-foreground/80 mt-1">afiliados en {regionStats[0].city}</div>
            </div>
            <div className="p-8 sm:border-r border-border/50 flex flex-col items-center justify-center text-center border-t border-border/50 sm:border-t-0">
              <div className="text-5xl mb-3">{regionStats[1].emoji}</div>
              <div className="text-2xl font-bold text-foreground">{regionStats[1].members}</div>
              <div className="text-sm text-muted-foreground/80 mt-1">afiliados en {regionStats[1].city}</div>
            </div>
            {/* Tall testimonial col 3 */}
            <div className="p-8 flex flex-col justify-between border-t border-border/50 sm:border-t-0 row-span-1 lg:row-span-2">
              <div className="flex gap-0.5 mb-4">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
              <p className="text-foreground/80 leading-relaxed mb-5 flex-1">"{allTestimonials[0].content}"</p>
              <div>
                <div className="flex gap-2 mb-4 flex-wrap">
                  {['Comisiones auto', 'Red binaria'].map(tag => (
                    <span key={tag} className="px-2.5 py-1 bg-primary/8 text-primary text-xs font-medium rounded-full border border-primary/15">{tag}</span>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <img src={allTestimonials[0].avatar} alt={allTestimonials[0].name} className="w-10 h-10 rounded-full object-cover" />
                  <div><div className="text-sm font-semibold text-foreground">{allTestimonials[0].name}</div><div className="text-xs text-muted-foreground">{allTestimonials[0].role}</div></div>
                  <div className="ml-auto text-sm font-bold text-emerald-600 dark:text-emerald-400">{allTestimonials[0].earnings}</div>
                </div>
              </div>
            </div>
            {/* second row */}
            <div className="p-8 border-t border-border/50 sm:border-r sm:col-span-2 lg:col-span-2 flex flex-col justify-between">
              <div className="flex gap-0.5 mb-4">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
              <p className="text-foreground/80 leading-relaxed mb-5">"{allTestimonials[1].content}"</p>
              <div className="flex items-center gap-3">
                <img src={allTestimonials[1].avatar} alt={allTestimonials[1].name} className="w-10 h-10 rounded-full object-cover" />
                <div><div className="text-sm font-semibold text-foreground">{allTestimonials[1].name}</div><div className="text-xs text-muted-foreground">{allTestimonials[1].role}</div></div>
                <div className="ml-auto text-sm font-bold text-emerald-600 dark:text-emerald-400">{allTestimonials[1].earnings}</div>
              </div>
            </div>
            {/* row 3 */}
            <div className="p-8 border-t border-border/50 sm:border-r border-border/50 flex flex-col items-center justify-center text-center">
              <div className="text-5xl mb-3">{regionStats[2].emoji}</div>
              <div className="text-2xl font-bold text-foreground">{regionStats[2].members}</div>
              <div className="text-sm text-muted-foreground/80 mt-1">afiliados en {regionStats[2].city}</div>
            </div>
            <div className="p-8 border-t border-border/50 sm:border-r border-border/50 flex flex-col items-center justify-center text-center">
              <div className="text-5xl mb-3">{regionStats[3].emoji}</div>
              <div className="text-2xl font-bold text-foreground">{regionStats[3].members}</div>
              <div className="text-sm text-muted-foreground/80 mt-1">afiliados en {regionStats[3].city}</div>
            </div>
            <div className="p-8 border-t border-border/50 flex flex-col justify-between">
              <div className="flex gap-0.5 mb-4">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
              <p className="text-foreground/80 leading-relaxed mb-5">"{allTestimonials[2].content}"</p>
              <div className="flex items-center gap-3">
                <img src={allTestimonials[2].avatar} alt={allTestimonials[2].name} className="w-10 h-10 rounded-full object-cover" />
                <div><div className="text-sm font-semibold text-foreground">{allTestimonials[2].name}</div><div className="text-xs text-muted-foreground">{allTestimonials[2].role}</div></div>
                <div className="ml-auto text-sm font-bold text-emerald-600 dark:text-emerald-400">{allTestimonials[2].earnings}</div>
              </div>
            </div>
          </div>
        </div>

        <TestimonialsCarousel />
      </section>

      <SectionDivider />

      {/* ── RANKS ───────────────────────────────────────────────────────────── */}
      {ranks.filter(r => r.is_active !== false).length > 0 && (
        <>
          <section className="py-24">
            <div className="max-w-[1100px] mx-auto px-6 sm:px-8">
              <div className="grid lg:grid-cols-[1fr_1.4fr] gap-12 lg:gap-16 items-start">
                <Reveal>
                  <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Rangos</span>
                  <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-4">
                    Cada nivel,<br /><span className="text-gradient-animated">más ingresos</span>
                  </h2>
                  <p className="text-muted-foreground/80 leading-relaxed mb-8 max-w-md">
                    El sistema premia tu esfuerzo con bonos progresivos. Desde Bronce hasta el nivel máximo Corona.
                  </p>
                  <Link to={user ? '/dashboard/rangos' : '/registro'} className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-semibold rounded-xl hover:opacity-90 transition-all">
                    {user ? 'Ver mis rangos' : 'Ver todos los rangos'} <ArrowRight className="w-4 h-4" />
                  </Link>
                </Reveal>

                <Reveal delay={80}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {ranks.filter(r => r.is_active !== false).slice(0, 6).map(r => (
                      <div key={r.id} className={cn('bg-card/70 rounded-2xl p-5 border transition-all card-lift text-center backdrop-blur-sm', r.border_color || 'border-border/50 hover:border-primary/25')}>
                        <div className="text-3xl mb-2">{r.icon}</div>
                        <div className={cn('font-bold text-sm mb-1.5', r.color || 'text-foreground')}>{r.name}</div>
                        <div className="text-xs text-muted-foreground/70 mb-1.5">Bono de rango</div>
                        <div className="text-base font-bold text-foreground">{formatPrice(r.bonus, currency, currencySymbol, exchangeRate)}</div>
                      </div>
                    ))}
                  </div>
                </Reveal>
              </div>
            </div>
          </section>
          <SectionDivider />
        </>
      )}

      {/* ── PLANS ───────────────────────────────────────────────────────────── */}
      {plans.length > 0 && (
        <>
          <section className="py-24" id="planes">
            <div className="max-w-[1100px] mx-auto px-6 sm:px-8">
              <Reveal className="mb-14">
                <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Precios</span>
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight mb-4">
                  Planes flexibles<br />que crecen contigo
                </h2>
                <p className="text-lg text-muted-foreground/80 max-w-lg">Comienza gratis y escala cuando tu negocio lo necesite.</p>
              </Reveal>

              <Reveal delay={60}>
                <div className={cn('grid gap-4 sm:gap-5', plans.length <= 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}>
                  {plans.map(plan => {
                    const isFree = plan.is_free || plan.price === 0;
                    const isCurrent = user && (user as any).plan === plan.slug;
                    return (
                      <div key={plan.id} className={cn('bg-card/70 rounded-2xl p-7 flex flex-col relative overflow-hidden transition-all card-lift backdrop-blur-sm', plan.is_popular ? 'border-2 border-foreground shadow-lg' : 'border border-border/50 hover:border-primary/30')}>
                        {plan.is_popular && (
                          <>
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-foreground/60 to-transparent" />
                            <div className="absolute top-5 right-5">
                              <span className="px-2.5 py-1 bg-foreground text-background text-[11px] font-bold rounded-full uppercase tracking-wide">Mejor valor</span>
                            </div>
                          </>
                        )}
                        <div className="mb-6">
                          <h3 className="text-2xl font-bold text-foreground mb-1.5">{plan.name}</h3>
                          <p className="text-sm text-muted-foreground/80">{plan.description}</p>
                        </div>
                        <div className="mb-7">
                          <span className="text-4xl font-bold text-foreground">{isFree ? 'Gratis' : formatPrice(plan.price, currency, currencySymbol, exchangeRate)}</span>
                          {!isFree && <span className="text-muted-foreground/70 text-base">/mes</span>}
                        </div>
                        {isCurrent ? (
                          <div className="py-3.5 text-center bg-emerald-500/8 rounded-xl border border-emerald-500/20 mb-6">
                            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Tu plan actual</span>
                          </div>
                        ) : (
                          <Link
                            to={user ? '/dashboard/mi-plan' : `/registro?plan=${plan.slug}`}
                            className={cn('py-3.5 mb-6 rounded-xl text-sm font-semibold text-center transition-all block', plan.is_popular ? 'bg-foreground text-background hover:opacity-90' : 'border border-border/60 hover:border-foreground/40 hover:bg-muted/60')}
                          >
                            {isFree ? 'Comenzar gratis' : 'Activar plan'}
                          </Link>
                        )}
                        <div className="border-t border-border/40 pt-5">
                          <div className="text-[11px] font-semibold text-foreground/60 mb-3 uppercase tracking-wider">{plan.is_popular ? 'Todo en Inicio, más:' : 'Incluye:'}</div>
                          <ul className="space-y-2.5">
                            {(plan.features || []).slice(0, 5).map((f: string) => (
                              <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground/80">
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

              <p className="text-center text-sm text-muted-foreground/70 mt-8">
                <Link to="/planes" className="text-primary font-medium hover:underline">Ver comparación completa de planes →</Link>
              </p>
            </div>
          </section>
          <SectionDivider />
        </>
      )}

      {/* ── STORE ───────────────────────────────────────────────────────────── */}
      <StoreSection />

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section className="relative py-24">
        <div className="absolute inset-0 bg-dub-grid opacity-15 mask-fade-center" />
        <div className="relative max-w-[720px] mx-auto px-6 sm:px-8">
          <Reveal className="mb-12">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">FAQ</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
              Preguntas <span className="text-gradient-animated">frecuentes</span>
            </h2>
          </Reveal>

          <Reveal delay={60}>
            <div className="divide-y divide-border/40 border border-border/50 rounded-2xl overflow-hidden">
              {faqItems.map((faq, i) => (
                <div key={i} className={cn('bg-card/60 transition-colors backdrop-blur-sm', openFaq === i && 'bg-muted/20')}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-7 py-5 text-left gap-4 group">
                    <span className="text-base font-semibold text-foreground">{faq.question}</span>
                    <ChevronDown className={cn('w-5 h-5 text-muted-foreground/60 transition-transform shrink-0', openFaq === i && 'rotate-180')} />
                  </button>
                  <div className={cn('grid transition-all', openFaq === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                    <div className="overflow-hidden">
                      <div className="px-7 pb-6 pt-0">
                        <p className="text-muted-foreground/80 leading-relaxed">{faq.answer}</p>
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
      <section className="relative py-36 overflow-hidden bg-[#0b0905]">
        <div className="absolute inset-0 bg-dub-grid-dark" />
        {/* layered gold glows */}
        <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-gradient-radial from-primary/15 to-transparent blur-[100px]" />
        <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-gradient-radial from-amber-900/20 to-transparent blur-[80px]" />
        {/* top/bottom vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 pointer-events-none" />

        <div className="relative z-10 max-w-[780px] mx-auto px-6 text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/6 border border-white/10 rounded-full text-xs font-medium text-white/60 mb-8 backdrop-blur-sm">
              <Zap className="w-3.5 h-3.5 text-primary" />
              Sin tarjeta de crédito
            </div>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-4 leading-[1.05] tracking-tight">
              Tu red no espera.
            </h2>
            <p className="text-2xl sm:text-3xl font-bold mb-5" style={{ color: 'hsl(43 95% 62%)' }}>
              Empieza hoy mismo.
            </p>
            <p className="text-lg text-white/35 max-w-lg mx-auto mb-12 leading-relaxed">
              Únete a miles de emprendedores que ya construyen libertad financiera con Club 360.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                to={user ? '/dashboard' : '/registro'}
                className="btn-gold-shimmer w-full sm:w-auto inline-flex items-center justify-center gap-2 px-9 py-4 bg-white text-black font-semibold rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all shadow-2xl shadow-white/10 text-base"
              >
                {user ? 'Ir a mi Panel' : 'Crear cuenta gratis'} <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/contacto"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-9 py-4 bg-white/5 border border-white/12 text-white font-medium rounded-xl hover:bg-white/9 transition-all text-base backdrop-blur-sm"
              >
                Hablar con ventas
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-sm text-white/30">
              {['Cuenta gratuita', 'Sin permanencia', 'Pago quincenal', 'Soporte 24/7'].map(t => (
                <span key={t} className="flex items-center gap-2"><Check className="w-4 h-4 text-white/45" /> {t}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
