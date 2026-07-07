import { Link } from '@/lib/router';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Reveal } from '@/components/landing/Reveal';
import { testimonials, faqItems } from '@/lib/mockData';
import {
  ArrowRight, Check, Star, ChevronDown, Zap, Globe, Award, DollarSign,
  TrendingUp, Users, Lock, ShoppingBag, Bell, Network, CreditCard, Sparkles,
  ChartBar as BarChart3, Wallet, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useConfig, formatPrice } from '@/store/configStore';
import { useDatabase } from '@/lib/backend';
import { supabase } from '@/lib/backend/client';
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

// ─── region stats ─────────────────────────────────────────────────────────────
const regionStats = [
  { city: 'Lima', members: '4,820+', img: 'https://images.pexels.com/photos/2610756/pexels-photo-2610756.jpeg?auto=compress&cs=tinysrgb&w=120' },
  { city: 'Arequipa', members: '1,940+', img: 'https://images.pexels.com/photos/2166553/pexels-photo-2166553.jpeg?auto=compress&cs=tinysrgb&w=120' },
  { city: 'Trujillo', members: '1,560+', img: 'https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=120' },
  { city: 'Cusco', members: '980+', img: 'https://images.pexels.com/photos/2325446/pexels-photo-2325446.jpeg?auto=compress&cs=tinysrgb&w=120' },
  { city: 'Piura', members: '760+', img: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=120' },
  { city: 'Ica', members: '480+', img: 'https://images.pexels.com/photos/2872580/pexels-photo-2872580.jpeg?auto=compress&cs=tinysrgb&w=120' },
];

// ─── payment brands ───────────────────────────────────────────────────────────
const paymentBrands = [
  { name: 'Visa', abbr: 'VISA', color: '#1a1f71', bg: '#e8eaf6' },
  { name: 'Mastercard', abbr: 'MC', color: '#eb001b', bg: '#fdecea' },
  { name: 'Yape', abbr: 'YP', color: '#6c1d8e', bg: '#f3e5f5' },
  { name: 'Plin', abbr: 'PL', color: '#0099cc', bg: '#e0f7fa' },
  { name: 'BCP', abbr: 'BCP', color: '#0047bb', bg: '#e3f2fd' },
  { name: 'BBVA', abbr: 'BB', color: '#004b9a', bg: '#e8edf7' },
  { name: 'Culqi', abbr: 'CQ', color: '#e63946', bg: '#fdecea' },
  { name: 'Izipay', abbr: 'IZ', color: '#ff6b00', bg: '#fff3e0' },
  { name: 'PayPal', abbr: 'PP', color: '#003087', bg: '#e3f0fd' },
  { name: 'Interbank', abbr: 'IB', color: '#00873d', bg: '#e6f7ed' },
  { name: 'Scotiabank', abbr: 'SB', color: '#ec0000', bg: '#fdecea' },
  { name: 'Niubiz', abbr: 'NB', color: '#004b93', bg: '#e3eef9' },
  { name: 'SafetyPay', abbr: 'SP', color: '#856404', bg: '#fef9e7' },
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

function SectionDivider() {
  return <div className="section-divider mx-auto max-w-[1100px]" />;
}

// ─── brands marquee ───────────────────────────────────────────────────────────
function BrandBadge({ b }: { b: typeof paymentBrands[0] }) {
  return (
    <div className="shrink-0 mx-2.5 select-none">
      <div
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm hover:border-border/70 hover:bg-card transition-all duration-200 cursor-default"
      >
        {/* Color dot avatar */}
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black leading-none shrink-0"
          style={{ backgroundColor: b.bg, color: b.color }}
        >
          {b.abbr.slice(0, 2)}
        </div>
        <span className="text-[13px] font-semibold text-foreground/70">{b.name}</span>
      </div>
    </div>
  );
}

function BrandsCarousel() {
  const row = [...paymentBrands, ...paymentBrands];
  return (
    <div className="relative overflow-hidden py-2">
      <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-40 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-40 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      <div className="flex items-center animate-marquee-brands">
        {row.map((b, i) => <BrandBadge key={`b-${i}`} b={b} />)}
      </div>
    </div>
  );
}

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
    <>
      <SectionDivider />
      <section className="py-16 sm:py-24">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Tienda</span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                Compra y genera <span className="text-gradient-animated">ingresos</span>
              </h2>
              <p className="text-muted-foreground mt-2 max-w-md text-sm sm:text-base">Cada producto activa comisiones automáticas para toda tu red.</p>
            </div>
            <Link to="/tienda" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border/70 text-sm font-medium hover:border-primary/50 hover:text-primary transition-all group shrink-0 self-start sm:self-auto">
              Ver tienda completa
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              {itemCount > 0 && <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">{itemCount}</span>}
            </Link>
          </Reveal>

          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
              <button
                onClick={() => setActiveCat('')}
                className={cn(
                  'shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                  activeCat === ''
                    ? 'bg-foreground text-background shadow-sm'
                    : 'border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-transparent',
                )}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Todos
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(activeCat === cat.id ? '' : cat.id)}
                  className={cn(
                    'shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                    activeCat === cat.id
                      ? 'bg-foreground text-background shadow-sm'
                      : 'border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-transparent',
                  )}
                >
                  {cat.image_url && (
                    <img src={cat.image_url} alt="" className="w-4 h-4 rounded object-cover" />
                  )}
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-card rounded-xl overflow-hidden border border-border/60"><Skeleton className="aspect-square" /></div>)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm text-muted-foreground/50">No hay productos en esta categoría</p>
              <button onClick={() => setActiveCat('')} className="text-sm text-primary font-medium hover:underline transition-colors">Ver todos los productos</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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
  const appHost = typeof window !== 'undefined' ? window.location.host : 'app.cluv360.pe';
  return (
    <div className="relative w-full max-w-[780px] mx-auto">
      <div className="bg-card border border-border/60 rounded-2xl shadow-[0_24px_64px_-16px_rgba(0,0,0,0.12)] dark:shadow-[0_24px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 border-b border-border/50 bg-muted/20">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-background/80 border border-border/50 rounded-lg px-3 sm:px-4 py-1 text-[11px] sm:text-xs text-muted-foreground w-44 sm:w-56 text-center backdrop-blur-sm truncate">
              {appHost}/dashboard
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] min-h-[280px] sm:min-h-[310px]">
          <div className="border-r border-border/40 p-3 bg-muted/10 hidden sm:block">
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
          <div className="p-3.5 sm:p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: 'Comisiones', value: 'S/ 3,240', sub: '+12% mes', c: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Mi Red', value: '48', sub: 'afiliados', c: 'text-primary' },
                { label: 'Rango', value: 'Platino', sub: '→ Diamante', c: 'text-amber-600 dark:text-amber-400' },
              ].map(s => (
                <div key={s.label} className="bg-muted/30 rounded-xl p-2.5 sm:p-3 border border-border/40">
                  <div className="text-[9px] sm:text-[10px] text-muted-foreground/70 mb-1">{s.label}</div>
                  <div className="text-xs sm:text-sm font-bold text-foreground">{s.value}</div>
                  <div className={cn('text-[9px] sm:text-[10px] font-medium mt-0.5', s.c)}>{s.sub}</div>
                </div>
              ))}
            </div>
            <div className="bg-muted/20 rounded-xl p-3 sm:p-3.5 border border-border/40">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] sm:text-[10px] text-muted-foreground/70 font-medium">Comisiones — últimas 12 semanas</span>
                <span className="text-[9px] sm:text-[10px] font-semibold text-primary">+S/ 890</span>
              </div>
              <div className="flex items-end gap-0.5 sm:gap-1 h-[48px] sm:h-[60px]">
                {[28, 45, 38, 62, 50, 74, 58, 82, 68, 90, 78, 100].map((h, i) => (
                  <div key={i} className={cn('flex-1 rounded-sm', i === 11 ? 'bg-primary' : 'bg-primary/20')} style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              {[
                { icon: DollarSign, text: 'Comisión directa acreditada', val: '+S/ 120', ic: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
                { icon: TrendingUp, text: 'Bono de rango desbloqueado', val: '+S/ 80', ic: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 rounded-xl bg-muted/20 border border-border/40">
                  <div className={cn('w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center flex-shrink-0', item.ic)}><item.icon className="w-3 sm:w-3.5 h-3 sm:h-3.5" /></div>
                  <span className="text-xs text-foreground flex-1 truncate">{item.text}</span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -top-4 sm:-top-5 -right-1 sm:-right-7 bg-card border border-primary/20 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-xl shadow-primary/5">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight">Comisión acreditada</div>
            <div className="text-sm font-bold text-primary">+S/ 320.50</div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-4 sm:-bottom-5 -left-1 sm:-left-7 bg-card border border-amber-500/20 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-xl shadow-amber-500/5">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight">Nuevo rango</div>
            <div className="text-sm font-bold text-amber-600 dark:text-amber-400">Diamante alcanzado</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── testimonial carousel ─────────────────────────────────────────────────────
function TestimonialCard({ t }: { t: (typeof allTestimonials)[0] }) {
  return (
    <div className="w-[280px] sm:w-[320px] shrink-0 bg-card border border-border/60 rounded-2xl p-5 mx-2">
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
      <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      <div className="flex mb-3 animate-marquee-left">
        {row1.map((t, i) => <TestimonialCard key={`r1-${i}`} t={t} />)}
      </div>
      <div className="flex animate-marquee-right">
        {row2.map((t, i) => <TestimonialCard key={`r2-${i}`} t={t} />)}
      </div>
    </div>
  );
}

// ─── number formatter K/M ─────────────────────────────────────────────────────
function fmtNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace('.0', '')}K`;
  return n.toString();
}

// ─── platform stats hook ───────────────────────────────────────────────────────
function usePlatformStats() {
  const [stats, setStats] = useState({ totalAffiliates: 0, totalProducts: 0, loaded: false });

  useEffect(() => {
    const load = async () => {
      try {
        const [affiliatesRes, productsRes] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        ]);
        setStats({
          totalAffiliates: affiliatesRes.count ?? 0,
          totalProducts: productsRes.count ?? 0,
          loaded: true,
        });
      } catch {
        setStats(s => ({ ...s, loaded: true }));
      }
    };
    load();
  }, []);

  return stats;
}

// ─── top categories hook ───────────────────────────────────────────────────────
function useTopCategories() {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from('product_categories')
          .select('id, name')
          .eq('status', 'active')
          .order('sort_order')
          .limit(4);
        if (data) setCategories(data);
      } catch { /* ignore */ }
    };
    load();
  }, []);

  return categories;
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { plans: allPlans, ranks, currency, currencySymbol, exchangeRate } = useConfig();
  const plans = allPlans.filter(p => p.is_active);
  const { user } = useAuthStore();
  const platformStats = usePlatformStats();
  const topCategories = useTopCategories();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />

      {/* ── HERO ──────────────────────────────────────────────────────────────*/}
      <section className="relative pt-20 pb-0 overflow-hidden">
        <div className="absolute inset-0 bg-dub-grid mask-fade-top" />
        {/* Subtle hero auras */}
        <div className="absolute top-20 left-1/4 w-[350px] h-[350px] rounded-full bg-primary/4 blur-[100px] pointer-events-none" />
        <div className="absolute top-32 right-1/4 w-[300px] h-[300px] rounded-full bg-amber-500/4 blur-[90px] pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-radial from-primary/5 to-transparent blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Reveal>
            <a href="#planes" className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-background/90 border border-border/70 rounded-full text-xs sm:text-sm text-foreground hover:border-primary/50 transition-all mb-7 sm:mb-8 group shadow-sm backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
              <span className="font-medium">Nuevo: Bonos de rango Corona disponibles</span>
              <span className="text-border mx-1 hidden sm:inline">·</span>
              <span className="text-primary group-hover:text-primary/80 font-medium items-center gap-1 shrink-0 hidden sm:flex">
                Ver más <ExternalLink className="w-3 h-3" />
              </span>
            </a>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="text-gold-glow text-[2.6rem] sm:text-6xl lg:text-7xl xl:text-[5.5rem] font-bold text-foreground leading-[1.05] tracking-[-0.02em] mb-5 sm:mb-6">
              Construye tu red.<br />
              <span className="text-gradient-animated">Cobra automático.</span>
            </h1>
          </Reveal>

          <Reveal delay={150}>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground/80 max-w-xl sm:max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
              La plataforma MLM líder en Latinoamérica. Comisiones en tiempo real, red interactiva y tienda integrada.
            </p>
          </Reveal>

          <Reveal delay={220}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 sm:mb-10">
              <Link
                to={user ? '/dashboard' : '/registro'}
                className="btn-gold-shimmer w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-3.5 bg-foreground text-background font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-base shadow-lg"
              >
                {user ? 'Ir a mi Panel' : 'Empezar gratis'}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/planes"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-3.5 bg-background/80 border border-border/70 text-foreground font-medium rounded-xl hover:border-primary/50 hover:text-primary transition-all text-base backdrop-blur-sm"
              >
                Ver planes
              </Link>
            </div>
          </Reveal>

          <Reveal delay={280}>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground/70 mb-10 sm:mb-12">
              {[
                { icon: Lock, text: 'SSL 256-bit', color: 'text-emerald-600 dark:text-emerald-400' },
                { icon: Check, text: 'Sin permanencia', color: 'text-primary' },
                { icon: CreditCard, text: 'Pago quincenal', color: 'text-amber-600 dark:text-amber-400' },
              ].map(item => (
                <span key={item.text} className="flex items-center gap-1.5">
                  <item.icon className={cn('w-3 sm:w-3.5 h-3 sm:h-3.5', item.color)} />
                  {item.text}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={340} className="relative max-w-[1100px] mx-auto px-4 sm:px-10 lg:px-16 pb-0">
          <div className="relative">
            <AppMockup />
            <div className="absolute bottom-0 left-0 right-0 h-32 sm:h-40 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          </div>
        </Reveal>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────────────*/}
      <section className="py-12 sm:py-16 border-y border-border/40 bg-muted/10">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-4 lg:gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border/40">
            {[
              {
                value: !platformStats.loaded ? '—' : platformStats.totalAffiliates > 0 ? `${fmtNumber(platformStats.totalAffiliates)}+` : '0',
                label: 'Afiliados activos',
                sub: 'en toda Latinoamérica',
                icon: Users,
                color: 'text-primary',
                iconBg: 'bg-primary/10',
              },
              {
                value: !platformStats.loaded ? '—' : platformStats.totalProducts > 0 ? `${fmtNumber(platformStats.totalProducts)}+` : '0',
                label: 'Productos en catálogo',
                sub: 'con comisiones automáticas',
                icon: ShoppingBag,
                color: 'text-blue-600 dark:text-blue-400',
                iconBg: 'bg-blue-500/10',
              },
              {
                value: ranks.filter(r => r.is_active !== false).length > 0 ? `${ranks.filter(r => r.is_active !== false).length}` : '—',
                label: 'Rangos disponibles',
                sub: 'con bonos progresivos',
                icon: Award,
                color: 'text-amber-600 dark:text-amber-400',
                iconBg: 'bg-amber-500/10',
              },
              {
                value: plans.length > 0 ? `${plans.length}` : '—',
                label: 'Planes flexibles',
                sub: 'desde gratis hasta elite',
                icon: BarChart3,
                color: 'text-emerald-600 dark:text-emerald-400',
                iconBg: 'bg-emerald-500/10',
              },
            ].map((stat, i) => (
              <Reveal key={stat.label} delay={i * 60}>
                <div className="text-center sm:px-8 py-2 sm:py-0 first:pt-0 sm:first:pt-0">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3', stat.iconBg)}>
                    <stat.icon className={cn('w-5 h-5', stat.color)} />
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-foreground tracking-tight tabular-nums">{stat.value}</div>
                  <div className="text-sm font-semibold text-foreground/80 mt-1">{stat.label}</div>
                  <div className="text-xs text-muted-foreground/60 mt-0.5">{stat.sub}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── BRANDS MARQUEE ────────────────────────────────────────────────────*/}
      <section className="py-10 sm:py-14">
        <Reveal>
          <p className="text-center text-[11px] font-semibold text-muted-foreground/40 uppercase tracking-widest mb-6">
            Métodos de pago aceptados
          </p>
        </Reveal>
        <BrandsCarousel />
      </section>

      <SectionDivider />

      {/* ── FEATURES BENTO ────────────────────────────────────────────────────*/}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-dub-grid opacity-40 mask-fade-center" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-10 sm:mb-14">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Plataforma</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight mb-3">
              Todo lo que necesitas<br />para <span className="text-gradient-animated">crecer</span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground/80 max-w-xl">Cada herramienta resuelve un problema real del negocio multinivel.</p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {/* Card 1: Comisiones — wide */}
            <Reveal className="md:col-span-2">
              <div className="h-full bg-card/70 border border-border/50 rounded-2xl p-5 sm:p-7 card-lift hover:border-emerald-500/20 group backdrop-blur-sm overflow-hidden">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground">Comisiones automáticas</h3>
                  </div>
                  {platformStats.totalAffiliates > 0 && (
                    <div className="text-right shrink-0">
                      <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{fmtNumber(platformStats.totalAffiliates)}</div>
                      <div className="text-xs text-muted-foreground/60">afiliados activos</div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">Comisiones directas, binarias y unilevel. Cálculo en tiempo real, pago quincenal automático sin trámites.</p>
                {/* mini chart */}
                <div className="flex items-end gap-1 h-14 mb-4 px-1">
                  {[28, 45, 38, 62, 50, 74, 58, 82, 68, 90, 78, 100].map((h, i) => (
                    <div key={i} className={cn('flex-1 rounded-sm transition-all group-hover:opacity-90', i === 11 ? 'bg-emerald-500' : 'bg-emerald-500/20')} style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Comisión directa', 'Red binaria', 'Unilevel', 'Pago quincenal'].map(tag => (
                    <span key={tag} className="px-2.5 py-1 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium border border-emerald-500/15">{tag}</span>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Card 2: Red genealógica — narrow */}
            <Reveal>
              <div className="h-full bg-card/70 border border-border/50 rounded-2xl p-5 sm:p-7 card-lift hover:border-primary/20 group backdrop-blur-sm flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Network className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">Red genealógica</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">Panel visual con árbol binario, zoom dinámico y estadísticas por nodo en tiempo real.</p>
                {/* mini network tree */}
                <div className="relative flex flex-col items-center gap-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center"><div className="w-2.5 h-2.5 rounded-full bg-primary/60" /></div>
                    <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center"><div className="w-2.5 h-2.5 rounded-full bg-primary/60" /></div>
                  </div>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="w-5 h-5 rounded-full bg-muted border border-border/60 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-muted-foreground/40" /></div>
                    ))}
                  </div>
                  {platformStats.totalAffiliates > 0 && (
                    <div className="text-xs text-muted-foreground font-medium">{fmtNumber(platformStats.totalAffiliates)}+ afiliados en la red</div>
                  )}
                </div>
              </div>
            </Reveal>

            {/* Card 3: Sistema de rangos — narrow */}
            <Reveal>
              <div className="h-full bg-card/70 border border-border/50 rounded-2xl p-5 sm:p-7 card-lift hover:border-amber-500/20 group backdrop-blur-sm flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">Sistema de rangos</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">Cada nivel desbloquea bonos y beneficios exclusivos. Tu esfuerzo tiene recompensa.</p>
                {/* rank ladder from DB */}
                <div className="space-y-1.5">
                  {(ranks.filter(r => r.is_active !== false).length > 0
                    ? ranks.filter(r => r.is_active !== false).slice(0, 5)
                    : [{ name: 'Bronce', sort_order: 1 }, { name: 'Plata', sort_order: 2 }, { name: 'Oro', sort_order: 3 }, { name: 'Platino', sort_order: 4 }, { name: 'Corona', sort_order: 5 }]
                  ).map((r, idx, arr) => {
                    const pct = Math.round(((idx + 1) / arr.length) * 100);
                    return (
                      <div key={r.name} className="flex items-center gap-2">
                        <div className="h-5 rounded-full bg-amber-500/20 border border-amber-500/20 flex items-center px-2.5 transition-all" style={{ width: `${pct}%` }}>
                          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 truncate">{r.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Reveal>

            {/* Card 4: Tienda — wide */}
            <Reveal className="md:col-span-2">
              <div className="h-full bg-card/70 border border-border/50 rounded-2xl p-5 sm:p-7 card-lift hover:border-blue-500/20 group backdrop-blur-sm flex flex-col sm:flex-row gap-5 overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-foreground">Tienda integrada</h3>
                    </div>
                    {platformStats.totalProducts > 0 && (
                      <div className="text-right shrink-0">
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{fmtNumber(platformStats.totalProducts)}</div>
                        <div className="text-xs text-muted-foreground/60">productos</div>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">Catálogo completo. Cada compra activa comisiones automáticas en toda tu red de forma instantánea.</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(topCategories.length > 0 ? topCategories.map(c => c.name) : ['Vitaminas', 'Bienestar', 'Nutrición', 'Cuidado personal']).map(tag => (
                      <span key={tag} className="px-2.5 py-1 bg-blue-500/8 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium border border-blue-500/15">{tag}</span>
                    ))}
                  </div>
                  <Link to="/tienda" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all group/link">
                    Explorar tienda <ArrowRight className="w-4 h-4 group-hover/link:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
                {/* mini product grid with real photos */}
                <div className="grid grid-cols-2 gap-2 sm:w-48 shrink-0">
                  {[
                    'https://images.pexels.com/photos/3762879/pexels-photo-3762879.jpeg?auto=compress&cs=tinysrgb&w=200',
                    'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=200',
                    'https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=200',
                    'https://images.pexels.com/photos/4041392/pexels-photo-4041392.jpeg?auto=compress&cs=tinysrgb&w=200',
                  ].map((src, i) => (
                    <div key={i} className="rounded-xl aspect-square border border-border/40 overflow-hidden bg-muted/30 relative">
                      <img src={src} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── DARK PROMO ────────────────────────────────────────────────────────*/}
      <section className="relative py-20 sm:py-28 lg:py-32 overflow-hidden bg-zinc-950 dark:bg-[#0c0a07]">
        {/* Fade top/bottom only in dark mode — in light mode they create ugly white bands */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none hidden dark:block" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none hidden dark:block" />
        <div className="absolute inset-0 bg-dub-grid-dark opacity-40 mask-fade-center" />
        {/* Atmospheric glow blobs */}
        <div className="absolute -top-1/4 -left-1/4 w-[65%] h-[65%] rounded-full bg-primary/10 blur-[150px] pointer-events-none" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[55%] h-[55%] rounded-full bg-amber-700/8 dark:bg-amber-900/10 blur-[140px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35%] h-[35%] rounded-full bg-primary/6 blur-[110px] pointer-events-none" />

        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-16 items-center">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-full text-xs font-medium text-white/70 mb-5 sm:mb-6 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Sistema multinivel inteligente
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-[1.08] mb-4 sm:mb-5 tracking-tight">
                Potencia tu negocio<br />
                <span className="text-gradient-animated">al máximo nivel</span>
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-white/60 leading-relaxed mb-7 sm:mb-8 max-w-lg">
                Mientras duermes, el sistema calcula y distribuye comisiones a toda tu red. Sin errores, sin retrasos.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to={user ? '/dashboard' : '/registro'}
                  className="btn-gold-shimmer inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20 text-base"
                >
                  Empezar ahora <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/contacto"
                  className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 bg-white/10 border border-white/20 text-white font-medium rounded-xl hover:bg-white/15 transition-all backdrop-blur-sm text-base"
                >
                  Hablar con ventas
                </Link>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
                {['Sin tarjeta de crédito', 'Sin permanencia', 'Pago quincenal'].map(t => (
                  <span key={t} className="flex items-center gap-1.5 text-xs text-white/40">
                    <Check className="w-3 h-3 text-white/30" /> {t}
                  </span>
                ))}
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: DollarSign, title: 'Comisiones en tiempo real', desc: 'Calculadas al instante en cada compra de tu red.', iconCls: 'text-emerald-400', iconBg: 'bg-emerald-500/20', cardBg: 'bg-emerald-500/6 hover:bg-emerald-500/10 border-emerald-500/15' },
                  { icon: Zap, title: 'Pago automático', desc: 'Transferencias quincenales sin trámite de tu parte.', iconCls: 'text-amber-400', iconBg: 'bg-amber-500/20', cardBg: 'bg-amber-500/6 hover:bg-amber-500/10 border-amber-500/15' },
                  { icon: Globe, title: 'Red internacional', desc: 'Tus afiliados pueden estar en toda Latinoamérica.', iconCls: 'text-sky-400', iconBg: 'bg-sky-500/20', cardBg: 'bg-sky-500/6 hover:bg-sky-500/10 border-sky-500/15' },
                  { icon: TrendingUp, title: 'Crecimiento probado', desc: '+340% anual. Números reales, no promesas.', iconCls: 'text-rose-400', iconBg: 'bg-rose-500/20', cardBg: 'bg-rose-500/6 hover:bg-rose-500/10 border-rose-500/15' },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className={cn('rounded-2xl p-4 sm:p-5 transition-all backdrop-blur-sm border border-white/10', item.cardBg)}>
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', item.iconBg)}>
                        <Icon className={cn('w-5 h-5', item.iconCls)} />
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-white mb-1 sm:mb-1.5">{item.title}</div>
                      <div className="text-xs text-white/50 leading-relaxed">{item.desc}</div>
                    </div>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────────*/}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-dub-grid opacity-30 mask-fade-center" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-10 sm:mb-14">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Proceso</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
              De cero a <span className="text-gradient-animated">comisiones</span><br className="hidden sm:block" /> en minutos
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {steps.map((step, i) => (
              <Reveal key={step.n} delay={i * 80}>
                <div className="relative bg-card/60 border border-border/50 rounded-2xl p-6 sm:p-7 card-lift backdrop-blur-sm h-full group">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <step.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-4xl sm:text-5xl font-black text-muted-foreground/25 select-none leading-none tracking-tight">{step.n}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-muted-foreground/75 leading-relaxed text-sm">{step.desc}</p>
                  {i < steps.length - 1 && (
                    <div className="hidden sm:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-background border border-border/60 items-center justify-center">
                      <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────────*/}
      <section className="py-16 sm:py-24">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 mb-10 sm:mb-14">
          <Reveal>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Testimonios</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
              Miles ya <span className="text-gradient-animated">ganan</span> con Cluv 360
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground/80 mt-3 max-w-xl">Historias reales de emprendedores en toda Latinoamérica.</p>
          </Reveal>
        </div>

        {/* bento grid */}
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 mb-10 sm:mb-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border border-border/50 rounded-2xl overflow-hidden">
            {/* region stats row - background images with overlaid info */}
            {[regionStats[0], regionStats[1]].map((stat, idx) => (
              <div
                key={stat.city}
                className={cn(
                  'relative p-6 sm:p-8 flex flex-col items-center justify-center text-center border-b border-border/50 min-h-[160px] overflow-hidden group',
                  idx === 0 ? 'sm:border-r border-border/50' : 'sm:border-r border-border/50'
                )}
              >
                <div className="absolute inset-0">
                  <img src={stat.img} alt={stat.city} className="w-full h-full object-cover opacity-40 group-hover:opacity-50 group-hover:scale-105 transition-all duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/80 to-background/60" />
                </div>
                <div className="relative z-10">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{stat.members}</div>
                  <div className="text-sm text-muted-foreground mt-1">afiliados en {stat.city}</div>
                </div>
              </div>
            ))}

            <div className="p-6 sm:p-8 flex flex-col justify-between border-b border-border/50 row-span-1 lg:row-span-2">
              <div className="flex gap-0.5 mb-4">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
              <p className="text-foreground/80 leading-relaxed mb-5 flex-1 text-sm sm:text-base">"{allTestimonials[0].content}"</p>
              <div>
                <div className="flex gap-2 mb-3 sm:mb-4 flex-wrap">
                  {['Comisiones auto', 'Red binaria'].map(tag => (
                    <span key={tag} className="px-2.5 py-1 bg-primary/8 text-primary text-xs font-medium rounded-full border border-primary/15">{tag}</span>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <img src={allTestimonials[0].avatar} alt={allTestimonials[0].name} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover" />
                  <div><div className="text-sm font-semibold text-foreground">{allTestimonials[0].name}</div><div className="text-xs text-muted-foreground">{allTestimonials[0].role}</div></div>
                  <div className="ml-auto text-sm font-bold text-emerald-600 dark:text-emerald-400">{allTestimonials[0].earnings}</div>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 border-b border-border/50 sm:border-r sm:col-span-2 lg:col-span-2 flex flex-col justify-between">
              <div className="flex gap-0.5 mb-4">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
              <p className="text-foreground/80 leading-relaxed mb-5 text-sm sm:text-base">"{allTestimonials[1].content}"</p>
              <div className="flex items-center gap-3">
                <img src={allTestimonials[1].avatar} alt={allTestimonials[1].name} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover" />
                <div><div className="text-sm font-semibold text-foreground">{allTestimonials[1].name}</div><div className="text-xs text-muted-foreground">{allTestimonials[1].role}</div></div>
                <div className="ml-auto text-sm font-bold text-emerald-600 dark:text-emerald-400">{allTestimonials[1].earnings}</div>
              </div>
            </div>

            {[regionStats[2], regionStats[3]].map((stat, idx) => (
              <div
                key={stat.city}
                className={cn(
                  'relative p-6 sm:p-8 flex flex-col items-center justify-center text-center border-t border-border/50 min-h-[160px] overflow-hidden group',
                  idx === 0 ? 'sm:border-r border-border/50' : 'sm:border-r border-border/50'
                )}
              >
                <div className="absolute inset-0">
                  <img src={stat.img} alt={stat.city} className="w-full h-full object-cover opacity-40 group-hover:opacity-50 group-hover:scale-105 transition-all duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/80 to-background/60" />
                </div>
                <div className="relative z-10">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{stat.members}</div>
                  <div className="text-sm text-muted-foreground mt-1">afiliados en {stat.city}</div>
                </div>
              </div>
            ))}

            <div className="p-6 sm:p-8 border-t border-border/50 flex flex-col justify-between">
              <div className="flex gap-0.5 mb-4">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
              <p className="text-foreground/80 leading-relaxed mb-5 text-sm sm:text-base">"{allTestimonials[2].content}"</p>
              <div className="flex items-center gap-3">
                <img src={allTestimonials[2].avatar} alt={allTestimonials[2].name} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover" />
                <div><div className="text-sm font-semibold text-foreground">{allTestimonials[2].name}</div><div className="text-xs text-muted-foreground">{allTestimonials[2].role}</div></div>
                <div className="ml-auto text-sm font-bold text-emerald-600 dark:text-emerald-400">{allTestimonials[2].earnings}</div>
              </div>
            </div>
          </div>
        </div>

        <TestimonialsCarousel />
      </section>

      <SectionDivider />

      {/* ── RANKS ─────────────────────────────────────────────────────────────*/}
      {ranks.filter(r => r.is_active !== false).length > 0 && (
        <>
          <section className="py-16 sm:py-24">
            <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-[1fr_1.4fr] gap-10 sm:gap-12 lg:gap-16 items-start">
                <Reveal>
                  <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Rangos</span>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight mb-4">
                    Cada nivel,<br /><span className="text-gradient-animated">más ingresos</span>
                  </h2>
                  <p className="text-muted-foreground/80 leading-relaxed mb-6 sm:mb-8 max-w-md text-sm sm:text-base">
                    El sistema premia tu esfuerzo con bonos progresivos. Desde Bronce hasta el nivel máximo Corona.
                  </p>
                  <Link to={user ? '/dashboard/rangos' : '/registro'} className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-semibold rounded-xl hover:opacity-90 transition-all">
                    {user ? 'Ver mis rangos' : 'Ver todos los rangos'} <ArrowRight className="w-4 h-4" />
                  </Link>
                </Reveal>

                <Reveal delay={80}>
                  {(() => {
                    const activeRanks = ranks.filter(r => r.is_active !== false).slice(0, 8);
                    const count = activeRanks.length;
                    // Adaptive grid: 3 cols for 6+, 2 cols for 4-5, list for 3 or fewer
                    const gridClass = count >= 6
                      ? 'grid grid-cols-2 sm:grid-cols-3 gap-2'
                      : count >= 4
                        ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5'
                        : 'space-y-2.5';
                    const isCompact = count >= 6;
                    return (
                      <div className={cn(gridClass)}>
                        {activeRanks.map((r) => {
                          const borderStyle = r.border_color?.startsWith('#') ? { borderColor: r.border_color } : undefined;
                          const borderClass = r.border_color?.startsWith('#') ? 'border' : cn('border', r.border_color || 'border-border/40');
                          const colorStyle = r.color?.startsWith('#') ? { color: r.color } : undefined;
                          const colorClass = r.color?.startsWith('#') ? '' : (r.color || 'text-amber-500');
                          const bgHex = r.bg_color?.startsWith('#') ? r.bg_color : null;
                          return (
                            <div
                              key={r.id}
                              className={cn(
                                'group relative rounded-xl p-4 transition-all backdrop-blur-sm overflow-hidden cursor-default',
                                borderClass,
                                isCompact && 'sm:p-3',
                              )}
                              style={borderStyle}
                            >
                              {bgHex && <div className="absolute inset-0 opacity-10 group-hover:opacity-15 transition-opacity" style={{ backgroundColor: bgHex }} />}
                              <div className={cn('relative flex items-center gap-3', isCompact && 'gap-2.5 sm:gap-2')}>
                                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-muted/60', isCompact && 'sm:w-8 sm:h-8')} style={bgHex ? { backgroundColor: bgHex + '25' } : undefined}>
                                  <Award className={cn('w-4 h-4', colorClass, isCompact && 'sm:w-3.5 sm:h-3.5')} style={colorStyle} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={cn('text-sm font-bold', isCompact && 'sm:text-[13px]')} style={colorStyle}>
                                    <span className={colorClass}>{r.name}</span>
                                  </div>
                                  {r.min_affiliates > 0 && (
                                    <div className={cn('text-[11px] text-muted-foreground/55 mt-0.5', isCompact && 'sm:text-[10px]')}>{r.min_affiliates} afil.</div>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <div className={cn('text-sm font-black text-foreground', isCompact && 'sm:text-[13px]')}>{formatPrice(r.bonus, currency, currencySymbol, exchangeRate)}</div>
                                  <div className={cn('text-[10px] text-muted-foreground/50', isCompact && 'sm:hidden')}>bono</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </Reveal>
              </div>
            </div>
          </section>
          <SectionDivider />
        </>
      )}

      {/* ── PLANS ─────────────────────────────────────────────────────────────*/}
      {plans.length > 0 && (
        <>
          <section className="py-16 sm:py-24" id="planes">
            <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
              <Reveal className="mb-10 sm:mb-14">
                <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Precios</span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground tracking-tight leading-tight mb-4">
                  Planes flexibles<br />que crecen contigo
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground/80 max-w-lg">Comienza gratis y escala cuando tu negocio lo necesite.</p>
              </Reveal>

              <Reveal delay={60}>
                <div className={cn('grid gap-4', plans.length === 1 ? 'grid-cols-1 max-w-sm' : plans.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
                  {plans.map(plan => {
                    const isFree = plan.is_free || plan.price === 0;
                    const isCurrent = user && (user as any).plan === plan.slug;
                    return (
                      <div key={plan.id} className={cn(
                        'bg-card rounded-xl p-6 flex flex-col relative transition-all card-lift',
                        plan.is_popular
                          ? 'border-2 border-primary ring-4 ring-primary/10'
                          : 'border border-border hover:border-primary/30',
                      )}>
                        {plan.badge && (
                          <div className={cn('absolute -top-2.5 left-4 text-xs font-bold px-3 py-1 rounded-full', plan.is_popular ? 'bg-primary text-primary-foreground' : 'bg-amber-500 text-white')}>
                            {plan.badge}
                          </div>
                        )}
                        {isCurrent && (
                          <div className="absolute -top-2.5 right-4 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500 text-white">Actual</div>
                        )}
                        <div className="mb-4">
                          <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                          {plan.description && <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>}
                        </div>
                        <div className="mb-4">
                          <span className="text-3xl font-bold text-foreground tracking-tight">{isFree ? 'Gratis' : formatPrice(plan.price, currency, currencySymbol, exchangeRate)}</span>
                          {!isFree && <span className="text-sm text-muted-foreground font-normal">/mes</span>}
                          {plan.trial_days > 0 && <span className="text-xs text-emerald-600 dark:text-emerald-400 block mt-1">{plan.trial_days} días de prueba</span>}
                        </div>
                        <ul className="space-y-1.5 mb-5 flex-1">
                          {(plan.features || []).slice(0, 5).map((f: string) => (
                            <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                        {isCurrent ? (
                          <div className="py-2.5 text-center border border-emerald-500/30 rounded-lg bg-emerald-500/5">
                            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Tu plan actual</span>
                          </div>
                        ) : (
                          <Link
                            to={user ? '/dashboard/mi-plan' : `/registro?plan=${plan.slug}`}
                            className={cn(
                              'py-2.5 rounded-lg text-sm font-semibold text-center transition-all block',
                              plan.is_popular
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                : 'border border-border hover:bg-muted text-foreground',
                            )}
                          >
                            {isFree ? 'Comenzar gratis' : 'Activar plan'}
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Reveal>

              <Reveal delay={120}>
                <p className="text-center text-sm text-muted-foreground/60 mt-8">
                  <Link to="/planes" className="text-primary font-medium hover:underline">Ver comparación completa de planes →</Link>
                </p>
              </Reveal>
            </div>
          </section>
          <SectionDivider />
        </>
      )}

      {/* ── STORE ─────────────────────────────────────────────────────────────*/}
      <StoreSection />

      {/* ── FAQ ───────────────────────────────────────────────────────────────*/}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-dub-grid opacity-20 mask-fade-center pointer-events-none" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[380px_1fr] gap-10 lg:gap-16 items-start">
            <Reveal>
              <div className="lg:sticky lg:top-24">
                <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">FAQ</span>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
                  Preguntas <span className="text-gradient-animated">frecuentes</span>
                </h2>
                <p className="text-muted-foreground/70 leading-relaxed text-sm sm:text-base mb-8">
                  Todo lo que necesitas saber antes de empezar. Si tienes más preguntas, estamos disponibles 24/7.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/20 mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-xs font-medium text-primary">{faqItems.length} preguntas</span>
                </div>
                <Link to="/contacto" className="inline-flex items-center gap-2 px-5 py-2.5 border border-border/60 rounded-xl text-sm font-medium hover:border-primary/40 hover:text-primary transition-all group">
                  Contactar soporte
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </Reveal>
            <Reveal delay={80}>
              {faqItems.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-sm text-muted-foreground/50">No hay preguntas configuradas aún.</p>
                </div>
              ) : (
                <div>
                  {faqItems.map((faq, i) => (
                    <div
                      key={i}
                      className={cn('border-b border-border/40', i === 0 && 'border-t border-border/40')}
                    >
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between py-5 text-left gap-4 group"
                      >
                        <span className={cn(
                          'text-sm sm:text-[15px] leading-snug transition-colors',
                          openFaq === i ? 'font-semibold text-foreground' : 'font-medium text-foreground/70 group-hover:text-foreground',
                        )}>
                          {faq.question}
                        </span>
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200',
                          openFaq === i ? 'bg-primary/10 text-primary' : 'text-muted-foreground/40 group-hover:text-foreground/60',
                        )}>
                          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-300', openFaq === i && 'rotate-180')} />
                        </div>
                      </button>
                      <div className={cn(
                        'overflow-hidden transition-all duration-300 ease-in-out',
                        openFaq === i ? 'max-h-96 pb-5' : 'max-h-0',
                      )}>
                        <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed">{faq.answer}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────────*/}
      <section className="relative py-20 sm:py-28 lg:py-36 overflow-hidden bg-zinc-950 dark:bg-[#0b0905]">
        {/* Seamless fade — mirrors the dark promo section */}
        <div className="absolute top-0 left-0 right-0 h-24 sm:h-32 bg-gradient-to-b from-background to-transparent z-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 bg-gradient-to-t from-background to-transparent z-20 pointer-events-none" />
        <div className="absolute inset-0 bg-dub-grid-dark opacity-50 mask-fade-center" />
        {/* Visible aura effects */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-primary/12 blur-[130px]" />
        <div className="absolute bottom-[-15%] left-1/2 -translate-x-1/2 w-[500px] h-[320px] rounded-full bg-amber-600/10 blur-[110px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/6 blur-[90px]" />

        <div className="relative z-10 max-w-[700px] mx-auto px-4 sm:px-6 text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/8 border border-white/10 rounded-full text-xs font-medium text-white/60 mb-6 sm:mb-8 backdrop-blur-sm">
              <Zap className="w-3.5 h-3.5 text-primary" />
              Sin tarjeta de crédito
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-3 sm:mb-4 leading-[1.05] tracking-tight">
              Tu red no espera.
            </h2>
            <p className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-5 text-gradient-animated">
              Empieza hoy mismo.
            </p>
            <p className="text-sm sm:text-base lg:text-lg text-white/45 max-w-md sm:max-w-lg mx-auto mb-10 sm:mb-12 leading-relaxed">
              Unete a miles de emprendedores que ya construyen libertad financiera con Cluv 360.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10 sm:mb-12">
              <Link
                to={user ? '/dashboard' : '/registro'}
                className="btn-gold-shimmer w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 sm:px-9 py-4 bg-white text-zinc-900 font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-2xl shadow-white/10 text-base"
              >
                {user ? 'Ir a mi Panel' : 'Crear cuenta gratis'} <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/contacto"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 sm:px-9 py-4 bg-white/5 border border-white/12 text-white font-medium rounded-xl hover:bg-white/10 transition-all text-base backdrop-blur-sm"
              >
                Hablar con ventas
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 lg:gap-8 text-xs sm:text-sm text-white/35">
              {['Cuenta gratuita', 'Sin permanencia', 'Pago quincenal', 'Soporte 24/7'].map(t => (
                <span key={t} className="flex items-center gap-1.5 sm:gap-2"><Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/45" /> {t}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
