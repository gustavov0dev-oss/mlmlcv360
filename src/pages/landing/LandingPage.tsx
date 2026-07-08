import { Link } from '@/lib/router';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { testimonials, faqItems } from '@/lib/mockData';
import {
  ArrowRight, Check, Star, ChevronDown, Zap, Globe, Award, DollarSign,
  TrendingUp, Users, Lock, ShoppingBag, Bell, Network, CreditCard, Sparkles,
  ChartBar as BarChart3, Wallet, ExternalLink, Medal, Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useConfig, formatPrice, type Rank } from '@/store/configStore';
import { useDatabase } from '@/lib/backend';
import { supabase } from '@/lib/backend/client';
import { useCart } from '@/store/cartStore';
import type { Product, ProductCategory } from '@/lib/storeTypes';
import ProductCard from '@/components/store/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';

// ─── rank icon renderer (matches Navbar logic) ────────────────────────────────
const rankIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  medal: Medal, crown: Crown, star: Star, award: Award,
  bronze: Medal, silver: Medal, gold: Medal, platinum: Medal, diamond: Crown,
};

function RankIcon({ rank, className }: { rank: Rank; className?: string }) {
  const icon = (rank.icon || '').trim();
  if (!icon) return <Award className={className} />;
  if (icon.toLowerCase().startsWith('<svg')) {
    return (
      <span
        className={cn('inline-flex items-center justify-center w-full h-full [&>svg]:w-full [&>svg]:h-full', className)}
        dangerouslySetInnerHTML={{ __html: icon }}
      />
    );
  }
  if (icon.startsWith('http') || icon.startsWith('/')) return <img src={icon} alt="" className={cn('w-full h-full object-contain', className)} />;
  const Comp = rankIconMap[icon.toLowerCase()];
  if (Comp) return <Comp className={className} />;
  if (icon.length <= 4 && !icon.includes('.')) return <span className="flex items-center justify-center leading-none">{icon}</span>;
  return <Award className={className} />;
}

// ─── steps ───────────────────────────────────────────────────────────────────
const steps = [
  { n: '01', title: 'Elige tu plan', desc: 'Gratis, Pro o Elite. Sin permanencia, cambia cuando quieras.', icon: BarChart3, iconClass: 'icon-blue' },
  { n: '02', title: 'Comparte tu enlace', desc: 'Tu código único conecta automáticamente a nuevos referidos.', icon: Network, iconClass: 'icon-emerald' },
  { n: '03', title: 'Cobra tus comisiones', desc: 'Pagos automáticos quincenales. Sin trámites, sin demoras.', icon: DollarSign, iconClass: 'icon-amber' },
];

// ─── region stats ─────────────────────────────────────────────────────────────
const regionStats = [
  { city: 'Lima', members: '4,820+', img: 'https://images.pexels.com/photos/2610756/pexels-photo-2610756.jpeg?auto=compress&cs=tinysrgb&w=120' },
  { city: 'Arequipa', members: '1,940+', img: 'https://images.pexels.com/photos/2166553/pexels-photo-2166553.jpeg?auto=compress&cs=tinysrgb&w=120' },
  { city: 'Trujillo', members: '1,560+', img: 'https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=120' },
  { city: 'Cusco', members: '980+', img: 'https://images.pexels.com/photos/2325446/pexels-photo-2325446.jpeg?auto=compress&cs=tinysrgb&w=120' },
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
];

// ─── extended testimonials ────────────────────────────────────────────────────
const allTestimonials = [
  ...testimonials,
  {
    id: '4', name: 'Sandra Palomino', role: 'Emprendedora', city: 'Trujillo',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=80',
    content: 'La automatización de comisiones me ahorró horas de trabajo. Ahora me enfoco en expandir mi red.',
    rank: 'Platino', earnings: 'S/ 6,100/mes',
  },
  {
    id: '5', name: 'Diego Ramírez', role: 'Profesional', city: 'Piura',
    avatar: 'https://images.pexels.com/photos/1680172/pexels-photo-1680172.jpeg?auto=compress&cs=tinysrgb&w=80',
    content: 'Escalé de Bronce a Platino en 4 meses. Los reportes me muestran exactamente qué necesita mi red.',
    rank: 'Platino', earnings: 'S/ 5,500/mes',
  },
  {
    id: '6', name: 'Luciana Flores', role: 'Comerciante', city: 'Ica',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=80',
    content: 'El soporte 24/7 es increíble. Tuve una duda un domingo y en 15 minutos tenía respuesta.',
    rank: 'Oro', earnings: 'S/ 3,800/mes',
  },
];

function SectionDivider() {
  return <div className="section-divider mx-auto max-w-[1100px]" />;
}

// ─── brands marquee ───────────────────────────────────────────────────────────
function BrandBadge({ b }: { b: typeof paymentBrands[0] }) {
  return (
    <div className="shrink-0 mx-2 select-none">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm cursor-default">
        <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black leading-none shrink-0" style={{ backgroundColor: b.bg, color: b.color }}>
          {b.abbr.slice(0, 2)}
        </div>
        <span className="text-[13px] font-medium text-foreground/60">{b.name}</span>
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
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest mb-3 block">Tienda</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Compra y genera <span className="text-gradient-animated">ingresos</span>
              </h2>
              <p className="text-muted-foreground mt-2 max-w-md text-sm">Cada producto activa comisiones automáticas para toda tu red.</p>
            </div>
            <Link to="/tienda" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border/60 bg-background/60 backdrop-blur-sm text-sm font-medium hover:border-primary/50 hover:text-primary transition-all group shrink-0 self-start sm:self-auto">
              Ver tienda completa
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              {itemCount > 0 && <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">{itemCount}</span>}
            </Link>
          </div>

          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
              <button
                onClick={() => setActiveCat('')}
                className={cn(
                  'shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                  activeCat === ''
                    ? 'bg-foreground/90 text-background backdrop-blur-sm'
                    : 'border border-border/60 bg-background/50 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:border-foreground/30',
                )}
              >
                <ShoppingBag className="w-3.5 h-3.5" /> Todos
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(activeCat === cat.id ? '' : cat.id)}
                  className={cn(
                    'shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                    activeCat === cat.id
                      ? 'bg-foreground/90 text-background backdrop-blur-sm'
                      : 'border border-border/60 bg-background/50 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:border-foreground/30',
                  )}
                >
                  {cat.image_url && <img src={cat.image_url} alt="" className="w-4 h-4 rounded object-cover" />}
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card rounded-xl overflow-hidden border border-border/60"><Skeleton className="aspect-square" /></div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm text-muted-foreground/50">No hay productos en esta categoría</p>
              <button onClick={() => setActiveCat('')} className="text-sm text-primary font-medium hover:underline">Ver todos</button>
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
      <div className="bg-card/80 border border-border/60 rounded-2xl shadow-[0_24px_64px_-16px_rgba(0,0,0,0.12)] dark:shadow-[0_24px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-border/50 bg-muted/20">
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
                <item.icon className="w-3.5 h-3.5 shrink-0" />{item.label}
              </div>
            ))}
          </div>
          <div className="p-3.5 sm:p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: 'Comisiones', value: 'S/ 3,240', sub: '+12% mes', subColor: 'text-emerald-500' },
                { label: 'Mi Red', value: '48', sub: 'afiliados', subColor: 'text-blue-500' },
                { label: 'Rango', value: 'Platino', sub: '→ Diamante', subColor: 'text-amber-500' },
              ].map(s => (
                <div key={s.label} className="bg-muted/30 rounded-xl p-2.5 sm:p-3 border border-border/40">
                  <div className="text-[9px] sm:text-[10px] text-muted-foreground/70 mb-1">{s.label}</div>
                  <div className="text-xs sm:text-sm font-bold text-foreground">{s.value}</div>
                  <div className={cn('text-[9px] sm:text-[10px] font-medium mt-0.5', s.subColor)}>{s.sub}</div>
                </div>
              ))}
            </div>
            <div className="bg-muted/20 rounded-xl p-3 border border-border/40">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] sm:text-[10px] text-muted-foreground/70 font-medium">Comisiones — 12 semanas</span>
                <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-500">+S/ 890</span>
              </div>
              <div className="flex items-end gap-0.5 sm:gap-1 h-[48px] sm:h-[60px]">
                {[28, 45, 38, 62, 50, 74, 58, 82, 68, 90, 78, 100].map((h, i) => (
                  <div key={i} className={cn('flex-1 rounded-sm', i === 11 ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-emerald-500/18 dark:bg-emerald-400/18')} style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              {[
                { icon: DollarSign, text: 'Comisión directa acreditada', val: '+S/ 120', valColor: 'text-emerald-500', bg: 'bg-emerald-500/10 text-emerald-500' },
                { icon: TrendingUp, text: 'Bono de rango desbloqueado', val: '+S/ 80', valColor: 'text-blue-500', bg: 'bg-blue-500/10 text-blue-500' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2 sm:p-2.5 rounded-xl bg-muted/20 border border-border/40">
                  <div className={cn('w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center flex-shrink-0', item.bg)}><item.icon className="w-3 sm:w-3.5 h-3 sm:h-3.5" /></div>
                  <span className="text-xs text-foreground flex-1 truncate">{item.text}</span>
                  <span className={cn('text-xs font-semibold shrink-0', item.valColor)}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating notification cards */}
      <div className="absolute -top-4 sm:-top-5 -right-1 sm:-right-7 bg-card/90 border border-primary/20 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 shadow-xl shadow-primary/5 backdrop-blur-sm pointer-events-none">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground leading-tight">Comisión acreditada</div>
            <div className="text-sm font-bold text-primary">+S/ 320.50</div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-4 sm:-bottom-5 -left-1 sm:-left-7 bg-card/90 border border-border/60 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 shadow-xl shadow-black/5 backdrop-blur-sm pointer-events-none">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground leading-tight">Nuevo rango</div>
            <div className="text-sm font-bold text-amber-500 dark:text-amber-400">Diamante alcanzado</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── testimonial carousel ─────────────────────────────────────────────────────
function TestimonialCard({ t }: { t: (typeof allTestimonials)[0] }) {
  return (
    <div className="w-[280px] sm:w-[300px] shrink-0 bg-card/70 border border-border/60 rounded-2xl p-5 mx-2 backdrop-blur-sm">
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
      </div>
      <p className="text-sm text-foreground/75 leading-relaxed mb-4">"{t.content}"</p>
      <div className="flex items-center gap-3 pt-3 border-t border-border/50">
        <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/15" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground leading-tight">{t.name}</div>
          <div className="text-xs text-muted-foreground">{t.role}{(t as any).city ? `, ${(t as any).city}` : ''}</div>
        </div>
        <div className="text-sm font-bold text-primary shrink-0">{t.earnings}</div>
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

function fmtNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace('.0', '')}K`;
  return n.toString();
}

function usePlatformStats() {
  const [stats, setStats] = useState({ totalAffiliates: 0, totalProducts: 0, loaded: false });
  useEffect(() => {
    const load = async () => {
      try {
        const [affiliatesRes, productsRes] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        ]);
        setStats({ totalAffiliates: affiliatesRes.count ?? 0, totalProducts: productsRes.count ?? 0, loaded: true });
      } catch {
        setStats(s => ({ ...s, loaded: true }));
      }
    };
    load();
  }, []);
  return stats;
}

function useTopCategories() {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.from('product_categories').select('id, name').eq('status', 'active').order('sort_order').limit(4);
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

  // Split FAQ into two columns
  const faqLeft = faqItems.filter((_, i) => i % 2 === 0);
  const faqRight = faqItems.filter((_, i) => i % 2 !== 0);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-0 overflow-hidden">
        {/* Grid - slightly more visible */}
        <div className="absolute inset-0 bg-grid opacity-[0.6] mask-fade-top pointer-events-none" />
        {/* Auras */}
        <div className="absolute top-20 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/8 blur-[110px] pointer-events-none" />
        <div className="absolute top-28 right-1/4 w-[320px] h-[320px] rounded-full bg-sky-500/6 blur-[100px] pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-radial from-primary/6 to-transparent blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <a
            href="#planes"
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-background/80 border border-border/60 rounded-full text-xs sm:text-sm text-foreground hover:border-primary/40 transition-all mb-7 sm:mb-8 group shadow-sm backdrop-blur-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
            <span className="font-medium">Nuevo: Bonos de rango Corona disponibles</span>
            <span className="text-border mx-1 hidden sm:inline">·</span>
            <span className="text-primary group-hover:text-primary/80 font-medium items-center gap-1 shrink-0 hidden sm:flex">
              Ver más <ExternalLink className="w-3 h-3" />
            </span>
          </a>

          <h1 className="text-gold-glow text-[2.6rem] sm:text-6xl lg:text-7xl font-bold text-foreground leading-[1.05] tracking-[-0.02em] mb-5 sm:mb-6">
            Construye tu red.<br />
            <span className="text-gradient-animated">Cobra automático.</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground/80 max-w-xl sm:max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            La plataforma MLM líder en Latinoamérica. Comisiones en tiempo real, red interactiva y tienda integrada.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mb-8 sm:mb-10">
            <Link
              to={user ? '/dashboard' : '/registro'}
              className="btn-gold-shimmer inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-3.5 bg-foreground/90 backdrop-blur-sm text-background font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-base shadow-lg"
            >
              {user ? 'Ir a mi Panel' : 'Empezar gratis'}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/planes"
              className="inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-3.5 bg-background/60 border border-border/60 text-foreground font-medium rounded-xl hover:border-primary/40 hover:text-primary transition-all text-base backdrop-blur-sm"
            >
              Ver planes
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground/70 mb-10 sm:mb-12">
            {[
              { icon: Lock, text: 'SSL 256-bit', iconClass: 'icon-sky' },
              { icon: Check, text: 'Sin permanencia', iconClass: 'icon-emerald' },
              { icon: CreditCard, text: 'Pago quincenal', iconClass: 'icon-blue' },
            ].map(item => (
              <span key={item.text} className="flex items-center gap-1.5">
                <span className={cn('w-5 h-5 rounded-md flex items-center justify-center shrink-0', item.iconClass)}>
                  <item.icon className="w-3 h-3" />
                </span>
                {item.text}
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10 max-w-[1100px] mx-auto px-4 sm:px-10 lg:px-16 pb-0">
          <div className="relative">
            <AppMockup />
            <div className="absolute bottom-0 left-0 right-0 h-32 sm:h-40 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────────────── */}
      <section className="relative py-10 sm:py-14 border-y border-border/40 bg-muted/5 overflow-hidden">
        <div className="absolute -left-32 top-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-blue-500/4 blur-[80px] pointer-events-none" />
        <div className="absolute -right-32 top-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full bg-emerald-500/4 blur-[80px] pointer-events-none" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y-2 divide-x-0 sm:divide-y-0 sm:divide-x divide-border/30">
            {[
              {
                value: !platformStats.loaded ? '—' : platformStats.totalAffiliates > 0 ? `${fmtNumber(platformStats.totalAffiliates)}+` : '0',
                label: 'Afiliados activos',
                sub: 'en toda Latinoamérica',
                icon: Users,
                iconClass: 'icon-blue',
                iconColor: 'text-blue-500 dark:text-blue-400',
              },
              {
                value: !platformStats.loaded ? '—' : platformStats.totalProducts > 0 ? `${fmtNumber(platformStats.totalProducts)}+` : '0',
                label: 'Productos en catálogo',
                sub: 'con comisiones automáticas',
                icon: ShoppingBag,
                iconClass: 'icon-emerald',
                iconColor: 'text-emerald-500 dark:text-emerald-400',
              },
              {
                value: ranks.filter(r => r.is_active !== false).length > 0 ? `${ranks.filter(r => r.is_active !== false).length}` : '—',
                label: 'Rangos disponibles',
                sub: 'con bonos progresivos',
                icon: Award,
                iconClass: 'icon-amber',
                iconColor: 'text-amber-500 dark:text-amber-400',
              },
              {
                value: plans.length > 0 ? `${plans.length}` : '—',
                label: 'Planes flexibles',
                sub: 'desde gratis hasta elite',
                icon: BarChart3,
                iconClass: 'icon-sky',
                iconColor: 'text-sky-500 dark:text-sky-400',
              },
            ].map((stat) => (
              <div key={stat.label} className="relative text-center sm:px-6 lg:px-10 py-8 sm:py-6 overflow-hidden">
                {/* Large icon as decorative background with color */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
                  <stat.icon className={cn('w-32 h-32 opacity-[0.13]', stat.iconColor)} />
                </div>
                <div className="relative z-10">
                  <div className="text-3xl sm:text-4xl font-black text-foreground tracking-tight tabular-nums">{stat.value}</div>
                  <div className="text-sm font-semibold text-foreground/80 mt-1.5">{stat.label}</div>
                  <div className="text-xs text-muted-foreground/50 mt-0.5">{stat.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BRANDS MARQUEE ────────────────────────────────────────────────────── */}
      <section className="py-10 sm:py-12">
        <p className="text-center text-[11px] font-semibold text-muted-foreground/40 uppercase tracking-widest mb-5">
          Métodos de pago aceptados
        </p>
        <BrandsCarousel />
      </section>

      <SectionDivider />

      {/* ── FEATURES BENTO ────────────────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.35] mask-fade-center pointer-events-none" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 sm:mb-14">
            <span className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-3 block">Plataforma</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-3">
              Todo lo que necesitas<br />para <span className="text-gradient-animated">crecer</span>
            </h2>
            <p className="text-base text-muted-foreground/80 max-w-xl">Cada herramienta resuelve un problema real del negocio multinivel.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {/* Card 1: Comisiones — wide */}
            <div className="md:col-span-2">
              <div className="h-full bg-card/50 border border-border/50 rounded-2xl p-5 sm:p-7 hover:border-emerald-500/20 group backdrop-blur-sm overflow-hidden transition-colors">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl icon-emerald flex items-center justify-center shrink-0">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground">Comisiones automáticas</h3>
                  </div>
                  {platformStats.totalAffiliates > 0 && (
                    <div className="text-right shrink-0">
                      <div className="text-xl font-bold text-primary">{fmtNumber(platformStats.totalAffiliates)}</div>
                      <div className="text-xs text-muted-foreground/60">afiliados</div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">Comisiones directas, binarias y unilevel. Cálculo en tiempo real, pago quincenal automático sin trámites.</p>
                <div className="flex items-end gap-1 h-14 mb-4 px-1">
                  {[28, 45, 38, 62, 50, 74, 58, 82, 68, 90, 78, 100].map((h, i) => (
                    <div key={i} className={cn('flex-1 rounded-sm', i === 11 ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-emerald-500/15 dark:bg-emerald-400/15')} style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Comisión directa', 'Red binaria', 'Unilevel', 'Pago quincenal'].map(tag => (
                    <span key={tag} className="px-2.5 py-1 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-medium border border-emerald-500/15">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2: Red genealógica */}
            <div>
              <div className="h-full bg-card/50 border border-border/50 rounded-2xl p-5 sm:p-7 hover:border-blue-500/20 group backdrop-blur-sm flex flex-col transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl icon-blue flex items-center justify-center shrink-0">
                    <Network className="w-5 h-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">Red genealógica</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">Panel visual con árbol binario, zoom dinámico y estadísticas por nodo en tiempo real.</p>
                <div className="relative flex flex-col items-center gap-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500/15 border-2 border-blue-500/40 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                  </div>
                  <div className="flex items-center gap-6">
                    {[0, 1].map(k => (
                      <div key={k} className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center"><div className="w-2.5 h-2.5 rounded-full bg-blue-500/60" /></div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="w-5 h-5 rounded-full bg-muted border border-border/60 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-muted-foreground/40" /></div>
                    ))}
                  </div>
                  {platformStats.totalAffiliates > 0 && (
                    <div className="text-xs text-muted-foreground font-medium">{fmtNumber(platformStats.totalAffiliates)}+ en la red</div>
                  )}
                </div>
              </div>
            </div>

            {/* Card 3: Sistema de rangos */}
            <div>
              <div className="h-full bg-card/50 border border-border/50 rounded-2xl p-5 sm:p-7 hover:border-amber-500/20 group backdrop-blur-sm flex flex-col transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl icon-amber flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">Sistema de rangos</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">Cada nivel desbloquea bonos y beneficios exclusivos. Tu esfuerzo tiene recompensa.</p>
                <div className="space-y-1.5">
                  {(ranks.filter(r => r.is_active !== false).length > 0
                    ? ranks.filter(r => r.is_active !== false).slice(0, 5)
                    : [{ name: 'Bronce' }, { name: 'Plata' }, { name: 'Oro' }, { name: 'Platino' }, { name: 'Corona' }]
                  ).map((r, idx, arr) => {
                    const pct = Math.round(((idx + 1) / arr.length) * 100);
                    return (
                      <div key={r.name} className="flex items-center gap-2">
                        <div className="h-5 rounded-full bg-amber-500/15 border border-amber-500/20 flex items-center px-2.5" style={{ width: `${pct}%` }}>
                          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 truncate">{r.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Card 4: Tienda */}
            <div className="md:col-span-2">
              <div className="h-full bg-card/50 border border-border/50 rounded-2xl p-5 sm:p-7 hover:border-rose-500/20 group backdrop-blur-sm flex flex-col sm:flex-row gap-5 overflow-hidden transition-colors">
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl icon-rose flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-foreground">Tienda integrada</h3>
                    </div>
                    {platformStats.totalProducts > 0 && (
                      <div className="text-right shrink-0">
                        <div className="text-xl font-bold text-primary">{fmtNumber(platformStats.totalProducts)}</div>
                        <div className="text-xs text-muted-foreground/60">productos</div>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">Catálogo completo. Cada compra activa comisiones automáticas en toda tu red de forma instantánea.</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(topCategories.length > 0 ? topCategories.map(c => c.name) : ['Vitaminas', 'Bienestar', 'Nutrición', 'Cuidado personal']).map(tag => (
                      <span key={tag} className="px-2.5 py-1 bg-rose-500/8 text-rose-600 dark:text-rose-400 rounded-full text-xs font-medium border border-rose-500/15">{tag}</span>
                    ))}
                  </div>
                  <Link to="/tienda" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all group/link">
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
                    <div key={i} className="rounded-xl aspect-square border border-border/40 overflow-hidden bg-muted/30">
                      <img src={src} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── DARK PROMO ────────────────────────────────────────────────────────── */}
      <section className="relative py-20 sm:py-28 overflow-hidden section-dark">
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none hidden dark:block" />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none hidden dark:block" />
        <div className="absolute inset-0 bg-grid opacity-[0.25] mask-fade-center pointer-events-none" />
        <div className="absolute -top-1/4 -left-1/4 w-[60%] h-[60%] rounded-full bg-primary/8 blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[50%] h-[50%] rounded-full bg-sky-500/6 blur-[130px] pointer-events-none" />

        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 border border-border/60 rounded-full text-xs font-medium text-muted-foreground dark:bg-white/8 dark:border-white/15 dark:text-white/60 mb-5 sm:mb-6 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Sistema multinivel inteligente
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground dark:text-white leading-[1.08] mb-4 tracking-tight">
                Potencia tu negocio<br />
                <span className="text-gradient-animated">al máximo nivel</span>
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground dark:text-white/55 leading-relaxed mb-7 max-w-lg">
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
                  className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 bg-muted/40 border border-border/60 text-foreground dark:bg-white/8 dark:border-white/15 dark:text-white font-medium rounded-xl hover:bg-muted/60 dark:hover:bg-white/12 transition-all backdrop-blur-sm text-base"
                >
                  Hablar con ventas
                </Link>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
                {['Sin tarjeta de crédito', 'Sin permanencia', 'Pago quincenal'].map(t => (
                  <span key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground/60 dark:text-white/35">
                    <Check className="w-3 h-3" /> {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: DollarSign, title: 'Comisiones en tiempo real', desc: 'Calculadas al instante en cada compra de tu red.', iconClass: 'icon-emerald' },
                { icon: Zap, title: 'Pago automático', desc: 'Transferencias quincenales sin trámite de tu parte.', iconClass: 'icon-amber' },
                { icon: Globe, title: 'Red internacional', desc: 'Tus afiliados pueden estar en toda Latinoamérica.', iconClass: 'icon-blue' },
                { icon: TrendingUp, title: 'Crecimiento probado', desc: '+340% anual. Números reales, no promesas.', iconClass: 'icon-sky' },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl p-4 sm:p-5 border bg-muted/25 border-border/40 dark:bg-white/5 dark:border-white/8 backdrop-blur-sm">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', item.iconClass)}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-foreground dark:text-white mb-1">{item.title}</div>
                  <div className="text-xs text-muted-foreground dark:text-white/45 leading-relaxed">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.3] mask-fade-center pointer-events-none" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 sm:mb-14">
            <span className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-3 block">Proceso</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              De cero a <span className="text-gradient-animated">comisiones</span><br className="hidden sm:block" /> en minutos
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {steps.map((step, i) => (
              <div key={step.n} className="relative bg-card/50 border border-border/50 rounded-2xl p-6 sm:p-7 backdrop-blur-sm h-full">
                <div className="flex items-start justify-between mb-5">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', step.iconClass)}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className="text-4xl sm:text-5xl font-black text-muted-foreground/20 select-none leading-none tracking-tight">{step.n}</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground/75 leading-relaxed text-sm">{step.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden sm:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-background border border-border/60 items-center justify-center pointer-events-none">
                    <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <div className="absolute -top-20 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/3 blur-[120px] pointer-events-none" />
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 mb-10 sm:mb-14">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Testimonios</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Miles ya <span className="text-gradient-animated">ganan</span> con Cluv 360
          </h2>
          <p className="text-base text-muted-foreground/80 mt-3 max-w-xl">Historias reales de emprendedores en toda Latinoamérica.</p>
        </div>

        {/* Bento testimonials */}
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 mb-10 sm:mb-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border border-border/50 rounded-2xl overflow-hidden">
            {regionStats.slice(0, 2).map((stat, idx) => (
              <div
                key={stat.city}
                className={cn(
                  'relative p-6 sm:p-8 flex flex-col items-center justify-center text-center border-b border-border/50 min-h-[160px] overflow-hidden',
                  idx === 0 ? 'sm:border-r border-border/50' : 'sm:border-r border-border/50'
                )}
              >
                <div className="absolute inset-0 pointer-events-none">
                  <img src={stat.img} alt={stat.city} className="w-full h-full object-cover opacity-35" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/75 to-background/50" />
                </div>
                <div className="relative z-10">
                  <div className="text-2xl font-bold text-foreground">{stat.members}</div>
                  <div className="text-sm text-muted-foreground mt-1">afiliados en {stat.city}</div>
                </div>
              </div>
            ))}

            <div className="p-6 sm:p-8 flex flex-col justify-between border-b border-border/50 row-span-1 lg:row-span-2 bg-card/40 backdrop-blur-sm">
              <div className="flex gap-0.5 mb-4">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
              <p className="text-foreground/80 leading-relaxed mb-5 flex-1 text-sm sm:text-base">"{allTestimonials[0].content}"</p>
              <div>
                <div className="flex gap-2 mb-3 flex-wrap">
                  {['Comisiones auto', 'Red binaria'].map(tag => (
                    <span key={tag} className="px-2.5 py-1 bg-primary/8 text-primary text-xs font-medium rounded-full border border-primary/15">{tag}</span>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <img src={allTestimonials[0].avatar} alt={allTestimonials[0].name} className="w-9 h-9 rounded-full object-cover" />
                  <div><div className="text-sm font-semibold text-foreground">{allTestimonials[0].name}</div><div className="text-xs text-muted-foreground">{allTestimonials[0].role}</div></div>
                  <div className="ml-auto text-sm font-bold text-primary">{allTestimonials[0].earnings}</div>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 border-b border-border/50 sm:border-r sm:col-span-2 lg:col-span-2 flex flex-col justify-between bg-card/40 backdrop-blur-sm">
              <div className="flex gap-0.5 mb-4">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
              <p className="text-foreground/80 leading-relaxed mb-5 text-sm sm:text-base">"{allTestimonials[1].content}"</p>
              <div className="flex items-center gap-3">
                <img src={allTestimonials[1].avatar} alt={allTestimonials[1].name} className="w-9 h-9 rounded-full object-cover" />
                <div><div className="text-sm font-semibold text-foreground">{allTestimonials[1].name}</div><div className="text-xs text-muted-foreground">{allTestimonials[1].role}</div></div>
                <div className="ml-auto text-sm font-bold text-primary">{allTestimonials[1].earnings}</div>
              </div>
            </div>

            {regionStats.slice(2, 4).map((stat, idx) => (
              <div
                key={stat.city}
                className={cn(
                  'relative p-6 sm:p-8 flex flex-col items-center justify-center text-center border-t border-border/50 min-h-[160px] overflow-hidden',
                  idx === 0 ? 'sm:border-r border-border/50' : 'sm:border-r border-border/50'
                )}
              >
                <div className="absolute inset-0 pointer-events-none">
                  <img src={stat.img} alt={stat.city} className="w-full h-full object-cover opacity-35" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/75 to-background/50" />
                </div>
                <div className="relative z-10">
                  <div className="text-2xl font-bold text-foreground">{stat.members}</div>
                  <div className="text-sm text-muted-foreground mt-1">afiliados en {stat.city}</div>
                </div>
              </div>
            ))}

            <div className="p-6 sm:p-8 border-t border-border/50 flex flex-col justify-between bg-card/40 backdrop-blur-sm">
              <div className="flex gap-0.5 mb-4">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
              <p className="text-foreground/80 leading-relaxed mb-5 text-sm">{allTestimonials[2].content}</p>
              <div className="flex items-center gap-3">
                <img src={allTestimonials[2].avatar} alt={allTestimonials[2].name} className="w-9 h-9 rounded-full object-cover" />
                <div><div className="text-sm font-semibold text-foreground">{allTestimonials[2].name}</div><div className="text-xs text-muted-foreground">{allTestimonials[2].role}</div></div>
                <div className="ml-auto text-sm font-bold text-primary">{allTestimonials[2].earnings}</div>
              </div>
            </div>
          </div>
        </div>

        <TestimonialsCarousel />
      </section>

      <SectionDivider />

      {/* ── RANKS ─────────────────────────────────────────────────────────────── */}
      {ranks.filter(r => r.is_active !== false).length > 0 && (
        <>
          <section className="relative py-16 sm:py-24 overflow-hidden">
            <div className="absolute top-1/3 -right-40 w-[400px] h-[400px] rounded-full bg-amber-500/4 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/3 -left-40 w-[350px] h-[350px] rounded-full bg-primary/4 blur-[100px] pointer-events-none" />
            <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-[1fr_1.4fr] gap-10 sm:gap-12 lg:gap-16 items-start">
                <div>
                  <span className="text-xs font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-widest mb-3 block">Rangos</span>
                  <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
                    Cada nivel,<br /><span className="text-gradient-animated">más ingresos</span>
                  </h2>
                  <p className="text-muted-foreground/80 leading-relaxed mb-6 sm:mb-8 max-w-md text-sm">
                    El sistema premia tu esfuerzo con bonos progresivos. Desde Bronce hasta el nivel máximo Corona.
                  </p>
                  <Link to={user ? '/dashboard/rangos' : '/registro'} className="inline-flex items-center gap-2 px-6 py-3 bg-foreground/90 backdrop-blur-sm text-background font-semibold rounded-xl hover:opacity-90 transition-all">
                    {user ? 'Ver mis rangos' : 'Ver todos los rangos'} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                <div>
                  {(() => {
                    const activeRanks = ranks.filter(r => r.is_active !== false).slice(0, 8);
                    const count = activeRanks.length;
                    const gridClass = count >= 6
                      ? 'grid grid-cols-2 sm:grid-cols-3 gap-2'
                      : count >= 4
                        ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5'
                        : 'space-y-2.5';
                    const isCompact = count >= 6;
                    return (
                      <div className={gridClass}>
                        {activeRanks.map((r) => {
                          const iconBgStyle = r.color?.startsWith('#') ? { backgroundColor: `${r.color}18` } : undefined;
                          const iconColorStyle = r.color?.startsWith('#') ? { color: r.color } : undefined;
                          const iconBorderStyle = r.color?.startsWith('#') ? { borderColor: `${r.color}28` } : undefined;
                          const textColorClass = r.color?.startsWith('#') ? '' : (r.color || '');
                          return (
                            <div
                              key={r.id}
                              className={cn(
                                'relative rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden',
                                isCompact ? 'p-3' : 'p-4',
                              )}
                            >
                              {/* Large icon as background */}
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden>
                                <div className="w-16 h-16 opacity-[0.07] flex items-center justify-center" style={iconColorStyle}>
                                  <Award className="w-full h-full" />
                                </div>
                              </div>
                              <div className="relative flex items-center gap-2.5">
                                {/* DB icon rendering */}
                                <div
                                  className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border', !iconBgStyle && 'icon-amber')}
                                  style={{ ...iconBgStyle, ...iconBorderStyle }}
                                >
                                  <div className={cn('w-5 h-5 flex items-center justify-center', !iconColorStyle && 'text-amber-500 dark:text-amber-400')} style={iconColorStyle}>
                                    <RankIcon rank={r} className="w-5 h-5" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div
                                    className={cn('text-sm font-bold leading-tight', isCompact && 'text-[13px]', textColorClass)}
                                    style={iconColorStyle}
                                  >
                                    {r.name}
                                  </div>
                                  {r.min_affiliates > 0 && (
                                    <div className="text-[11px] text-muted-foreground/55">{r.min_affiliates} afil.</div>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-sm font-black text-foreground">{formatPrice(r.bonus, currency, currencySymbol, exchangeRate)}</div>
                                  <div className="text-[10px] text-muted-foreground/50">bono</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </section>
          <SectionDivider />
        </>
      )}

      {/* ── PLANS ─────────────────────────────────────────────────────────────── */}
      {plans.length > 0 && (
        <>
          <section className="relative py-16 sm:py-24 overflow-hidden" id="planes">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-primary/4 blur-[120px] pointer-events-none" />
            <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-10 sm:mb-14">
                <span className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-3 block">Precios</span>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight mb-2">
                  <span className="text-gradient-animated">Planes flexibles</span><br />
                  <span className="text-foreground">que crecen contigo</span>
                </h2>
                <p className="text-base text-muted-foreground/80 max-w-lg mt-3">Comienza gratis y escala cuando tu negocio lo necesite.</p>
              </div>

              <div className={cn('grid gap-4', plans.length === 1 ? 'grid-cols-1 max-w-sm' : plans.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
                {plans.map(plan => {
                  const isFree = plan.is_free || plan.price === 0;
                  const isCurrent = user && (user as any).plan === plan.slug;
                  return (
                    <div key={plan.id} className={cn(
                      'rounded-2xl p-6 flex flex-col relative transition-all backdrop-blur-sm',
                      plan.is_popular
                        ? 'bg-card/80 border border-primary/30 shadow-lg shadow-primary/8'
                        : 'bg-card/50 border border-border/50 hover:border-border/80',
                    )}>
                      {plan.is_popular && (
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                      )}
                      {plan.badge && (
                        <div className={cn(
                          'absolute -top-3 left-4 text-xs font-bold px-3 py-1 rounded-full',
                          plan.is_popular
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                            : 'bg-muted text-foreground border border-border/50',
                        )}>
                          {plan.badge}
                        </div>
                      )}
                      {isCurrent && (
                        <div className="absolute -top-3 right-4 text-xs font-bold px-3 py-1 rounded-full bg-primary text-primary-foreground">Actual</div>
                      )}
                      <div className="mb-4 relative">
                        <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                        {plan.description && <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>}
                      </div>
                      <div className="mb-5 relative">
                        <span className="text-3xl font-bold text-foreground tracking-tight">{isFree ? 'Gratis' : formatPrice(plan.price, currency, currencySymbol, exchangeRate)}</span>
                        {!isFree && <span className="text-sm text-muted-foreground font-normal ml-1">/mes</span>}
                        {plan.trial_days > 0 && <span className="text-xs text-primary block mt-1">{plan.trial_days} días de prueba</span>}
                      </div>
                      <ul className="space-y-2 mb-6 flex-1 relative">
                        {(plan.features || []).slice(0, 5).map((f: string) => (
                          <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      {isCurrent ? (
                        <div className="py-2.5 text-center border border-primary/20 rounded-xl bg-primary/5 relative">
                          <span className="text-sm font-medium text-primary">Tu plan actual</span>
                        </div>
                      ) : (
                        <Link
                          to={user ? '/dashboard/mi-plan' : `/registro?plan=${plan.slug}`}
                          className={cn(
                            'py-3 rounded-xl text-sm font-semibold text-center transition-all block backdrop-blur-sm relative',
                            plan.is_popular
                              ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/15'
                              : 'border border-border/60 bg-background/50 hover:bg-muted/50 text-foreground',
                          )}
                        >
                          {isFree ? 'Comenzar gratis' : 'Activar plan'}
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-center text-sm text-muted-foreground/60 mt-8">
                <Link to="/planes" className="text-primary font-medium hover:underline">Ver comparación completa de planes →</Link>
              </p>
            </div>
          </section>
          <SectionDivider />
        </>
      )}

      {/* ── STORE ─────────────────────────────────────────────────────────────── */}
      <StoreSection />

      {/* ── FAQ ───────────────────────────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.2] mask-fade-center pointer-events-none" />
        <div className="absolute top-1/4 -left-40 w-[350px] h-[350px] rounded-full bg-primary/3 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-40 w-[300px] h-[300px] rounded-full bg-sky-500/3 blur-[90px] pointer-events-none" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-10 sm:mb-14">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">FAQ</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
              Preguntas <span className="text-gradient-animated">frecuentes</span>
            </h2>
            <p className="text-muted-foreground/70 text-sm sm:text-base max-w-md mx-auto mb-5">
              Todo lo que necesitas saber. Si tienes más preguntas, estamos disponibles 24/7.
            </p>
            <Link to="/contacto" className="inline-flex items-center gap-2 px-5 py-2.5 border border-border/60 bg-background/60 backdrop-blur-sm rounded-xl text-sm font-medium hover:border-primary/40 hover:text-primary transition-all group">
              Contactar soporte
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {faqItems.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground/50">No hay preguntas configuradas aún.</p>
            </div>
          ) : (
            /* Two equal columns */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 lg:gap-x-12">
              {/* Left column */}
              <div>
                {faqLeft.map((faq) => {
                  const i = faqItems.indexOf(faq);
                  return (
                    <div key={i} className={cn('border-b border-border/40', i === 0 && 'border-t border-border/40')}>
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
                      <div className={cn('overflow-hidden transition-all duration-300 ease-in-out', openFaq === i ? 'max-h-96 pb-5' : 'max-h-0')}>
                        <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed">{faq.answer}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Right column */}
              <div>
                {faqRight.map((faq) => {
                  const i = faqItems.indexOf(faq);
                  const isFirst = faqRight[0] === faq;
                  return (
                    <div key={i} className={cn('border-b border-border/40', isFirst && 'border-t border-border/40')}>
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
                      <div className={cn('overflow-hidden transition-all duration-300 ease-in-out', openFaq === i ? 'max-h-96 pb-5' : 'max-h-0')}>
                        <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed">{faq.answer}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <section className="relative py-20 sm:py-28 overflow-hidden section-dark">
        <div className="absolute top-0 left-0 right-0 h-20 sm:h-28 bg-gradient-to-b from-background to-transparent z-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-20 sm:h-28 bg-gradient-to-t from-background to-transparent z-20 pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-[0.3] mask-fade-center pointer-events-none" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[450px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-15%] left-1/2 -translate-x-1/2 w-[400px] h-[280px] rounded-full bg-sky-500/8 blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-[680px] mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/40 border border-border/50 rounded-full text-xs font-medium text-muted-foreground dark:bg-white/8 dark:border-white/10 dark:text-white/55 mb-6 sm:mb-8 backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5 text-primary" />
            Sin tarjeta de crédito
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground dark:text-white mb-3 leading-[1.05] tracking-tight">
            Tu red no espera.
          </h2>
          <p className="text-2xl sm:text-3xl font-bold mb-4 text-gradient-animated">
            Empieza hoy mismo.
          </p>
          <p className="text-sm sm:text-base text-muted-foreground dark:text-white/40 max-w-md mx-auto mb-10 leading-relaxed">
            Unete a miles de emprendedores que ya construyen libertad financiera con Cluv 360.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mb-10">
            <Link
              to={user ? '/dashboard' : '/registro'}
              className="btn-gold-shimmer inline-flex items-center justify-center gap-2 px-7 sm:px-9 py-4 bg-foreground/90 backdrop-blur-sm text-background font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-2xl shadow-black/20 text-base"
            >
              {user ? 'Ir a mi Panel' : 'Crear cuenta gratis'} <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/contacto"
              className="inline-flex items-center justify-center gap-2 px-7 sm:px-9 py-4 bg-muted/40 border border-border/50 text-foreground dark:bg-white/5 dark:border-white/10 dark:text-white font-medium rounded-xl hover:bg-muted/60 dark:hover:bg-white/8 transition-all backdrop-blur-sm text-base"
            >
              Hablar con ventas
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground/55 dark:text-white/30">
            {['Cuenta gratuita', 'Sin permanencia', 'Pago quincenal', 'Soporte 24/7'].map(t => (
              <span key={t} className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-muted-foreground/70 dark:text-white/40" /> {t}</span>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
