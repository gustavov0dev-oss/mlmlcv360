import { Link } from "@/lib/router";
import {
  ArrowRight,
  Check,
  Star,
  ChevronDown,
  Zap,
  Globe,
  Award,
  DollarSign,
  TrendingUp,
  Users,
  Lock,
  ShoppingBag,
  Bell,
  Network,
  CreditCard,
  Sparkles,
  ChartBar as BarChart3,
  ExternalLink,
  Medal,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { useConfig, formatPrice, type Rank } from "@/store/configStore";
import { useDatabase } from "@/lib/backend";
import { supabase } from "@/lib/backend/client";
import { useCart } from "@/store/cartStore";
import type { Product, ProductCategory } from "@/lib/storeTypes";
import ProductCard from "@/components/store/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";

const rankIconMap: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  medal: Medal,
  crown: Crown,
  star: Star,
  award: Award,
  bronze: Medal,
  silver: Medal,
  gold: Medal,
  platinum: Medal,
  diamond: Crown,
};

function RankIcon({ rank, className }: { rank: Rank; className?: string }) {
  const icon = (rank.icon || "").trim();
  if (!icon) return <Award className={className} />;
  if (icon.toLowerCase().startsWith("<svg")) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center w-full h-full [&>svg]:w-full [&>svg]:h-full",
          className,
        )}
        dangerouslySetInnerHTML={{ __html: icon }}
      />
    );
  }
  if (icon.startsWith("http") || icon.startsWith("/"))
    return (
      <img
        src={icon}
        alt=""
        className={cn("w-full h-full object-contain", className)}
      />
    );
  const Comp = rankIconMap[icon.toLowerCase()];
  if (Comp) return <Comp className={className} />;
  if (icon.length <= 4 && !icon.includes("."))
    return (
      <span className="flex items-center justify-center leading-none">
        {icon}
      </span>
    );
  return <Award className={className} />;
}

const steps = [
  {
    n: "01",
    title: "Elige tu plan",
    desc: "Gratis, Pro o Elite. Sin permanencia, cambia cuando quieras.",
    icon: BarChart3,
    iconClass: "icon-primary",
  },
  {
    n: "02",
    title: "Comparte tu enlace",
    desc: "Tu código único conecta automáticamente a nuevos referidos.",
    icon: Network,
    iconClass: "icon-primary",
  },
  {
    n: "03",
    title: "Cobra tus comisiones",
    desc: "Pagos automáticos quincenales. Sin trámites, sin demoras.",
    icon: DollarSign,
    iconClass: "icon-primary",
  },
];

interface RegionStat {
  id: string;
  city: string;
  members: string;
  image_url: string;
  is_active: boolean;
  sort_order: number;
}

function useRegionStats() {
  const database = useDatabase();
  const [items, setItems] = useState<RegionStat[]>([]);
  useEffect(() => {
    const load = () => {
      supabase
        .from("testimonial_region_stats")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(5)
        .then(({ data }) => {
          if (data) setItems(data);
        });
    };
    load();
    const unsub = database.subscribe("testimonial_region_stats", load);
    return () => unsub();
  }, [database]);
  return items;
}

interface DBTestimonial {
  id: string;
  name: string;
  role: string;
  avatar_url: string;
  content: string;
  earnings: string;
  rating: number;
  is_active: boolean;
  sort_order: number;
}

function useTestimonials() {
  const database = useDatabase();
  const [items, setItems] = useState<DBTestimonial[]>([]);
  useEffect(() => {
    const load = () => {
      supabase
        .from("testimonials")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .then(({ data }) => {
          if (data) setItems(data);
        });
    };
    load();
    const unsub = database.subscribe("testimonials", load);
    return () => unsub();
  }, [database]);
  return items;
}

function StoreSection() {
  const database = useDatabase();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCat, setActiveCat] = useState("");
  const [loading, setLoading] = useState(true);
  const { itemCount } = useCart();

  const load = useCallback(async () => {
    setLoading(true);
    const [catsRes, prodsRes] = await Promise.all([
      database.select<ProductCategory>("product_categories", {
        filter: { status: "active" },
        order: { column: "sort_order" },
        limit: 8,
      }),
      database.select<Product>("products", {
        filter: { status: "active" },
        order: { column: "sort_order" },
        limit: 6,
      }),
    ]);
    setCategories((catsRes.data as ProductCategory[]) || []);
    setProducts((prodsRes.data as Product[]) || []);
    setLoading(false);
  }, [database]);

  useEffect(() => {
    load();
    const unsubCats = database.subscribe("product_categories", load);
    const unsubProds = database.subscribe("products", load);
    return () => {
      unsubCats();
      unsubProds();
    };
  }, [load, database]);

  const filtered = activeCat
    ? products.filter((p) => p.category_id === activeCat)
    : products;
  if (!loading && products.length === 0) return null;

  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">
              Tienda
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Compra y genera{" "}
              <span className="text-gradient-animated">ingresos</span>
            </h2>
            <p className="text-muted-foreground mt-2 max-w-md text-sm">
              Cada producto activa comisiones automáticas para toda tu red.
            </p>
          </div>
          <Link
            to="/tienda"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border/30 bg-white/60 dark:bg-white/[0.03] backdrop-blur-md text-sm font-medium hover:border-primary/50 hover:text-primary transition-all group shrink-0 self-start sm:self-auto"
          >
            Ver tienda completa
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            {itemCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                {itemCount}
              </span>
            )}
          </Link>
        </div>

        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => setActiveCat("")}
              className={cn(
                "shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                activeCat === ""
                  ? "bg-foreground/90 text-background backdrop-blur-md"
                  : "border border-border/30 bg-white/60 dark:bg-white/[0.03] backdrop-blur-md text-muted-foreground hover:text-foreground hover:border-foreground/30",
              )}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCat(activeCat === cat.id ? "" : cat.id)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                  activeCat === cat.id
                    ? "bg-foreground/90 text-background backdrop-blur-md"
                    : "border border-border/30 bg-white/60 dark:bg-white/[0.03] backdrop-blur-md text-muted-foreground hover:text-foreground hover:border-foreground/30",
                )}
              >
                {cat.image_url && (
                  <img
                    src={cat.image_url}
                    alt=""
                    className="w-4 h-4 rounded object-cover"
                  />
                )}
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/60 dark:bg-white/[0.03] rounded-xl overflow-hidden border border-border/30"
              >
                <Skeleton className="aspect-square" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-muted-foreground/50">
              No hay productos en esta categoría
            </p>
            <button
              onClick={() => setActiveCat("")}
              className="text-sm text-primary font-medium hover:underline"
            >
              Ver todos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {filtered.slice(0, 6).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AppMockup() {
  const appHost =
    typeof window !== "undefined" ? window.location.host : "app.cluv360.pe";
  return (
    <div className="relative w-full max-w-[780px] mx-auto">
      <div className="bg-transparent border border-border/30 rounded-2xl shadow-[0_24px_64px_-16px_rgba(0,0,0,0.08)] dark:shadow-[0_24px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-border/30 bg-muted/20 dark:bg-white/[0.02]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-background/40 border border-border/30 rounded-lg px-3 sm:px-4 py-1 text-[11px] sm:text-xs text-muted-foreground w-44 sm:w-56 text-center backdrop-blur-md truncate">
              {appHost}/dashboard
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] min-h-[280px] sm:min-h-[310px]">
          <div className="border-r border-border/30 p-3 bg-white/50 dark:bg-white/[0.02] hidden sm:block">
            <div className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-3 px-2">
              Panel
            </div>
            {[
              { icon: BarChart3, label: "Resumen", active: false },
              { icon: DollarSign, label: "Comisiones", active: true },
              { icon: Network, label: "Mi Red", active: false },
              { icon: Award, label: "Rangos", active: false },
              { icon: ShoppingBag, label: "Tienda", active: false },
            ].map((item) => (
              <div
                key={item.label}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium mb-0.5",
                  item.active
                    ? "bg-primary/12 text-primary font-semibold"
                    : "text-muted-foreground/70",
                )}
              >
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                {item.label}
              </div>
            ))}
          </div>
          <div className="p-3.5 sm:p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: "Comisiones", value: "S/ 3,240", sub: "+12% mes" },
                { label: "Mi Red", value: "48", sub: "afiliados" },
                { label: "Rango", value: "Platino", sub: "→ Diamante" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-muted/20 dark:bg-white/[0.03] rounded-xl p-2.5 sm:p-3 border border-border/20"
                >
                  <div className="text-[9px] sm:text-[10px] text-muted-foreground/70 mb-1">
                    {s.label}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-foreground">
                    {s.value}
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-medium mt-0.5 text-primary">
                    {s.sub}
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-muted/20 dark:bg-white/[0.02] rounded-xl p-3 border border-border/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] sm:text-[10px] text-muted-foreground/70 font-medium">
                  Comisiones — 12 semanas
                </span>
                <span className="text-[9px] sm:text-[10px] font-semibold text-primary">
                  +S/ 890
                </span>
              </div>
              <div className="flex items-end gap-0.5 sm:gap-1 h-[48px] sm:h-[60px]">
                {[28, 45, 38, 62, 50, 74, 58, 82, 68, 90, 78, 100].map(
                  (h, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 rounded-sm",
                        i === 11 ? "bg-primary" : "bg-primary/20",
                      )}
                      style={{ height: `${h}%` }}
                    />
                  ),
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              {[
                {
                  icon: DollarSign,
                  text: "Comisión directa acreditada",
                  val: "+S/ 120",
                },
                {
                  icon: TrendingUp,
                  text: "Bono de rango desbloqueado",
                  val: "+S/ 80",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 p-2 sm:p-2.5 rounded-xl bg-muted/20 dark:bg-white/[0.02] border border-border/20"
                >
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary">
                    <item.icon className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                  </div>
                  <span className="text-xs text-foreground flex-1 truncate">
                    {item.text}
                  </span>
                  <span className="text-xs font-semibold text-primary shrink-0">
                    {item.val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -top-4 sm:-top-5 -right-1 sm:-right-7 bg-white/80 dark:bg-white/[0.05] border border-primary/20 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 shadow-xl shadow-primary/5 backdrop-blur-md pointer-events-none">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground leading-tight">
              Comisión acreditada
            </div>
            <div className="text-sm font-bold text-primary">+S/ 320.50</div>
          </div>
        </div>
      </div>
    </div>
  );
}
function TestimonialCard({ t }: { t: DBTestimonial }) {
  const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=e2e8f0&color=64748b`;
  return (
    <div className="w-[280px] sm:w-[300px] shrink-0 border-r border-border/20 px-6 py-5 flex flex-col transition-colors hover:bg-foreground/[0.03]">
      <div className="flex gap-1 mb-3 flex-shrink-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "w-3 h-3",
              i < t.rating
                ? "fill-primary text-primary"
                : "text-muted-foreground/20",
            )}
          />
        ))}
      </div>
      <p className="text-sm text-foreground/75 leading-relaxed mb-4 flex-1 overflow-hidden">
        &#8220;{t.content}&#8221;
      </p>
      <div className="flex items-center gap-3 pt-3 border-t border-border/20 flex-shrink-0">
        <img
          src={t.avatar_url || avatarFallback}
          alt={t.name}
          className="w-8 h-8 rounded-full object-cover ring-1 ring-border/40 flex-shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src = avatarFallback;
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-foreground leading-tight truncate">
            {t.name}
          </div>
          <div className="text-[10px] text-muted-foreground/80 truncate">
            {t.role}
          </div>
        </div>
        {t.earnings && (
          <div className="text-xs font-semibold text-emerald-500 dark:text-emerald-400 shrink-0 tabular-nums">
            {t.earnings}
          </div>
        )}
      </div>
    </div>
  );
}

function TestimonialsCarousel({ items }: { items: DBTestimonial[] }) {
  if (items.length === 0) return null;
  const row = [...items, ...items, ...items, ...items, ...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-border/20">
      <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      <div className="flex border-b border-border/20 animate-marquee-left">
        {row.map((t, i) => (
          <TestimonialCard key={`r1-${i}`} t={t} />
        ))}
      </div>
      <div className="flex animate-marquee-right">
        {[...row].reverse().map((t, i) => (
          <TestimonialCard key={`r2-${i}`} t={t} />
        ))}
      </div>
    </div>
  );
}
function fmtNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".0", "")}K`;
  return n.toString();
}

function usePlatformStats() {
  const database = useDatabase();
  const [stats, setStats] = useState({
    totalAffiliates: 0,
    totalProducts: 0,
    loaded: false,
  });
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase.rpc("get_platform_stats");
        if (error) throw error;
        const result = (data ?? {}) as {
          total_affiliates?: number;
          total_products?: number;
        };
        setStats({
          totalAffiliates: result.total_affiliates ?? 0,
          totalProducts: result.total_products ?? 0,
          loaded: true,
        });
      } catch {
        setStats((s) => ({ ...s, loaded: true }));
      }
    };
    load();
    const unsubProfiles = database.subscribe("profiles", load);
    const unsubProducts = database.subscribe("products", load);
    return () => {
      unsubProfiles();
      unsubProducts();
    };
  }, [database]);
  return stats;
}

function useTopCategories() {
  const database = useDatabase();
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from("product_categories")
          .select("id, name")
          .eq("status", "active")
          .order("sort_order")
          .limit(4);
        if (data) setCategories(data);
      } catch {
        /* ignore */
      }
    };
    load();
    const unsub = database.subscribe("product_categories", load);
    return () => unsub();
  }, [database]);
  return categories;
}

function useFeatureProductImages() {
  const database = useDatabase();
  const [images, setImages] = useState<string[]>([]);
  useEffect(() => {
    const load = () => {
      supabase
        .from("products")
        .select("images")
        .eq("status", "active")
        .order("sort_order")
        .limit(6)
        .then(({ data }) => {
          if (data) {
            const imgs = data
              .flatMap((p: any) => (Array.isArray(p.images) ? p.images : []))
              .map((img: any) =>
                typeof img === "string" ? img : img?.url || img?.src || "",
              )
              .filter(Boolean)
              .slice(0, 4);
            if (imgs.length > 0) setImages(imgs);
          }
        });
    };
    load();
    const unsub = database.subscribe("products", load);
    return () => unsub();
  }, [database]);
  return images;
}

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const {
    plans: allPlans,
    ranks,
    currency,
    currencySymbol,
    exchangeRate,
  } = useConfig();
  const dbTestimonials = useTestimonials();
  const regionStats = useRegionStats();
  const plans = allPlans.filter((p) => p.is_active);
  const { user } = useAuthStore();
  const database = useDatabase();
  const platformStats = usePlatformStats();
  const topCategories = useTopCategories();
  const featureProductImages = useFeatureProductImages();

  const [faqItems, setFaqItems] = useState<
    { id: string; question: string; answer: string }[]
  >([]);
  useEffect(() => {
    const load = () => {
      supabase
        .from("faq_items")
        .select("id, question, answer")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .then(({ data }) => {
          if (data) setFaqItems(data);
        });
    };
    load();
    const unsub = database.subscribe("faq_items", load);
    return () => unsub();
  }, [database]);

  const faqLeft = faqItems.filter((_, i) => i % 2 === 0);
  const faqRight = faqItems.filter((_, i) => i % 2 !== 0);

  return (
    <>
      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-0 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.35] mask-fade-top pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/8 blur-[120px] pointer-events-none" />
        <div className="absolute top-28 right-1/4 w-[320px] h-[320px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-radial from-primary/6 to-transparent blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <a
            href="#planes"
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-white/60 dark:bg-white/[0.03] border border-border/30 rounded-full text-xs sm:text-sm text-foreground hover:border-primary/40 transition-all mb-7 sm:mb-8 group shadow-sm backdrop-blur-md"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
            <span className="font-medium">
              Nuevo: Bonos de rango Corona disponibles
            </span>
            <span className="text-border mx-1 hidden sm:inline">·</span>
            <span className="text-primary group-hover:text-primary/80 font-medium items-center gap-1 shrink-0 hidden sm:flex">
              Ver más <ExternalLink className="w-3 h-3" />
            </span>
          </a>

          <h1 className="text-gold-glow text-[2.6rem] sm:text-6xl lg:text-7xl font-bold text-foreground leading-[1.05] tracking-[-0.02em] mb-5 sm:mb-6">
            Construye tu red.
            <br />
            <span className="text-gradient-animated">Cobra automático.</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground/80 max-w-xl sm:max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            La plataforma MLM líder del mercado. Comisiones en tiempo real, red
            interactiva y tienda integrada.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mb-8 sm:mb-10">
            <Link
              to={user ? "/dashboard" : "/registro"}
              className="btn-gold-shimmer inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-3.5 bg-foreground/90 backdrop-blur-md text-background font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-base shadow-lg"
            >
              {user ? "Ir a mi Panel" : "Empezar gratis"}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/planes"
              className="inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-3.5 bg-white/60 dark:bg-white/[0.03] border border-border/30 text-foreground font-medium rounded-xl hover:border-primary/40 hover:text-primary transition-all text-base backdrop-blur-md"
            >
              Ver planes
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground/70 mb-10 sm:mb-12">
            {[
              { icon: Lock, text: "SSL 256-bit", iconClass: "icon-primary" },
              {
                icon: Check,
                text: "Sin permanencia",
                iconClass: "icon-primary",
              },
              {
                icon: CreditCard,
                text: "Pago quincenal",
                iconClass: "icon-primary",
              },
            ].map((item) => (
              <span key={item.text} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "w-5 h-5 rounded-md flex items-center justify-center shrink-0",
                    item.iconClass,
                  )}
                >
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
      <section className="py-16 sm:py-24">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-6">
            {[
              {
                value: !platformStats.loaded
                  ? "—"
                  : platformStats.totalAffiliates > 0
                    ? `${fmtNumber(platformStats.totalAffiliates)}+`
                    : "0",
                label: "Afiliados activos",
                sub: "en toda la red",
                icon: Users,
              },
              {
                value: !platformStats.loaded
                  ? "—"
                  : platformStats.totalProducts > 0
                    ? `${fmtNumber(platformStats.totalProducts)}+`
                    : "0",
                label: "Productos en catálogo",
                sub: "con comisiones automáticas",
                icon: ShoppingBag,
              },
              {
                value:
                  ranks.filter((r) => r.is_active !== false).length > 0
                    ? `${ranks.filter((r) => r.is_active !== false).length}`
                    : "—",
                label: "Rangos disponibles",
                sub: "con bonos progresivos",
                icon: Award,
              },
              {
                value: plans.length > 0 ? `${plans.length}` : "—",
                label: "Planes flexibles",
                sub: "desde gratis hasta elite",
                icon: BarChart3,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="relative text-center overflow-hidden"
              >
                <stat.icon
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 opacity-[0.05] text-foreground pointer-events-none select-none"
                  aria-hidden
                />
                <div className="relative">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight tabular-nums leading-none">
                    {stat.value}
                  </div>
                  <div className="text-sm font-semibold text-foreground/80 mt-2.5">
                    {stat.label}
                  </div>
                  <div className="text-xs text-muted-foreground/45 mt-0.5">
                    {stat.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.2] mask-fade-center pointer-events-none" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 sm:mb-16">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">
              Plataforma
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-3">
              Todo lo que necesitas
              <br />
              para <span className="text-gradient-animated">crecer</span>
            </h2>
            <p className="text-base text-muted-foreground/80 max-w-xl">
              Cada herramienta resuelve un problema real del negocio multinivel.
            </p>
          </div>

          <div className="flex flex-col">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center py-8 sm:py-10 lg:py-12 border-t border-border/10">
              <div>
                <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                    Analítica
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-3 sm:mb-4">
                  Reportes en tiempo real
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-sm">
                  Dashboard completo con métricas de red, volumen de ventas,
                  historial de ganancias y proyecciones de crecimiento.
                </p>
              </div>
              <div className="flex flex-col gap-7 sm:gap-8">
                <div className="grid grid-cols-3 divide-x divide-border/10">
                  {[
                    {
                      label: "Red activa",
                      value:
                        platformStats.totalAffiliates > 0
                          ? fmtNumber(platformStats.totalAffiliates)
                          : "—",
                    },
                    {
                      label: "Productos",
                      value:
                        platformStats.totalProducts > 0
                          ? fmtNumber(platformStats.totalProducts)
                          : "—",
                    },
                    { label: "Crecimiento", value: "+28%" },
                  ].map((s, i) => (
                    <div
                      key={s.label}
                      className={cn(
                        i > 0 && "pl-4 sm:pl-6",
                        i < 2 && "pr-4 sm:pr-6",
                      )}
                    >
                      <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tabular-nums">
                        {s.value}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-muted-foreground/60 mt-1 uppercase tracking-wide">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-end gap-1 sm:gap-1.5 h-14 sm:h-16">
                  {[40, 55, 45, 68, 58, 80, 65, 88, 72, 95, 82, 100].map(
                    (h, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex-1 rounded-sm transition-all",
                          i === 11 ? "bg-primary" : "bg-primary/15",
                        )}
                        style={{ height: `${h}%` }}
                      />
                    ),
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center py-8 sm:py-10 lg:py-12 border-t border-border/10">
              <div className="order-1 lg:order-2">
                <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
                  <Network className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                    Red multinivel
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-3 sm:mb-4">
                  Red genealógica
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-sm">
                  Panel visual con árbol binario interactivo, zoom dinámico y
                  estadísticas por nodo en tiempo real.
                </p>
              </div>
              <div className="order-2 lg:order-1 flex justify-center lg:justify-start">
                <svg
                  viewBox="0 0 320 160"
                  className="w-full max-w-[280px] sm:max-w-xs h-auto text-primary"
                >
                  <line
                    x1="160"
                    y1="30"
                    x2="90"
                    y2="85"
                    stroke="currentColor"
                    strokeOpacity="0.3"
                    strokeWidth="2"
                  />
                  <line
                    x1="160"
                    y1="30"
                    x2="230"
                    y2="85"
                    stroke="currentColor"
                    strokeOpacity="0.3"
                    strokeWidth="2"
                  />
                  <line
                    x1="90"
                    y1="85"
                    x2="45"
                    y2="135"
                    stroke="currentColor"
                    strokeOpacity="0.18"
                    strokeWidth="2"
                  />
                  <line
                    x1="90"
                    y1="85"
                    x2="135"
                    y2="135"
                    stroke="currentColor"
                    strokeOpacity="0.18"
                    strokeWidth="2"
                  />
                  <line
                    x1="230"
                    y1="85"
                    x2="185"
                    y2="135"
                    stroke="currentColor"
                    strokeOpacity="0.18"
                    strokeWidth="2"
                  />
                  <line
                    x1="230"
                    y1="85"
                    x2="275"
                    y2="135"
                    stroke="currentColor"
                    strokeOpacity="0.18"
                    strokeWidth="2"
                  />
                  <circle cx="160" cy="30" r="11" fill="currentColor" />
                  <circle
                    cx="90"
                    cy="85"
                    r="8"
                    fill="currentColor"
                    fillOpacity="0.65"
                  />
                  <circle
                    cx="230"
                    cy="85"
                    r="8"
                    fill="currentColor"
                    fillOpacity="0.65"
                  />
                  {[45, 135, 185, 275].map((x) => (
                    <circle
                      key={x}
                      cx={x}
                      cy="135"
                      r="6"
                      fill="currentColor"
                      fillOpacity="0.35"
                    />
                  ))}
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center py-8 sm:py-10 lg:py-12 border-t border-border/10">
              <div>
                <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
                  <Award className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                    Progresión
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-3 sm:mb-4">
                  Sistema de rangos
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-sm">
                  Cada nivel desbloquea bonos y beneficios exclusivos. Tu
                  esfuerzo siempre tiene recompensa, en orden.
                </p>
              </div>
              {(() => {
                const activeRanks = ranks.filter((r) => r.is_active !== false);
                const mid = Math.ceil(activeRanks.length / 2);
                const columns = [
                  activeRanks.slice(0, mid),
                  activeRanks.slice(mid),
                ];
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
                    {columns.map((col, colIdx) => (
                      <div key={colIdx} className="relative">
                        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/15" />
                        {col.map((r, i) => {
                          const globalIdx = colIdx === 0 ? i : mid + i;
                          const pct = Math.round(
                            ((globalIdx + 1) / activeRanks.length) * 100,
                          );
                          const rankColor = r.color?.startsWith("#")
                            ? r.color
                            : "#0ea5e9";
                          return (
                            <div
                              key={r.name}
                              className="relative flex items-start gap-3 py-2.5"
                            >
                              <div
                                className="relative z-10 w-5 h-5 flex items-center justify-center shrink-0"
                                style={{ color: rankColor }}
                              >
                                <RankIcon rank={r} className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0 -mt-0.5">
                                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                                  <span
                                    className="text-sm font-semibold"
                                    style={{ color: rankColor }}
                                  >
                                    {r.name}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground/50 tabular-nums shrink-0">
                                    {globalIdx + 1}/{activeRanks.length}
                                  </span>
                                </div>
                                <div className="h-[3px] rounded-full relative overflow-hidden bg-muted/20">
                                  <div
                                    className="absolute inset-y-0 left-0 rounded-full"
                                    style={{
                                      width: `${pct}%`,
                                      background: rankColor,
                                      opacity: 0.6,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center py-8 sm:py-10 lg:py-12 border-t border-b border-border/10">
              <div>
                <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
                  <ShoppingBag className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                    Catálogo
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-3 sm:mb-4">
                  Tienda integrada
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-sm mb-5">
                  Catálogo completo con categorías, filtros y carrito. Cada
                  compra activa bonos automáticos en tu red.
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6">
                  {(topCategories.length > 0
                    ? topCategories.map((c) => c.name)
                    : ["Vitaminas", "Bienestar", "Nutrición", "Cuidado"]
                  ).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs font-medium text-muted-foreground/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-8">
                  <Link
                    to="/tienda"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all group/link w-fit"
                  >
                    Explorar tienda{" "}
                    <ArrowRight className="w-4 h-4 group-hover/link:translate-x-0.5 transition-transform" />
                  </Link>
                  {platformStats.totalProducts > 0 && (
                    <div className="text-sm text-muted-foreground/60">
                      <span className="text-lg font-bold text-foreground tabular-nums">
                        {fmtNumber(platformStats.totalProducts)}
                      </span>{" "}
                      productos
                    </div>
                  )}
                </div>
              </div>

              {(() => {
                const fallback: string[] = [
                  "https://images.pexels.com/photos/3762879/pexels-photo-3762879.jpeg?auto=compress&cs=tinysrgb&w=200",
                  "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=200",
                  "https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=200",
                  "https://images.pexels.com/photos/4041392/pexels-photo-4041392.jpeg?auto=compress&cs=tinysrgb&w=200",
                  "https://images.pexels.com/photos/4041393/pexels-photo-4041393.jpeg?auto=compress&cs=tinysrgb&w=200",
                  "https://images.pexels.com/photos/3768916/pexels-photo-3768916.jpeg?auto=compress&cs=tinysrgb&w=200",
                  "https://images.pexels.com/photos/3765114/pexels-photo-3765114.jpeg?auto=compress&cs=tinysrgb&w=200",
                  "https://images.pexels.com/photos/3737576/pexels-photo-3737576.jpeg?auto=compress&cs=tinysrgb&w=200",
                ];
                const source: string[] =
                  featureProductImages.length > 0
                    ? featureProductImages
                    : fallback;

                const buildRows = (cols: number) => {
                  const maxTiles = cols * 2;
                  const total =
                    platformStats.totalProducts > 0
                      ? platformStats.totalProducts
                      : source.length;
                  const showCount = Math.min(total, maxTiles);
                  const overflow = total > maxTiles ? total - maxTiles : 0;
                  const items: string[] = Array.from(
                    { length: showCount },
                    (_, i) => source[i % source.length],
                  );
                  const rows: string[][] = [];
                  for (let i = 0; i < items.length; i += cols) {
                    rows.push(items.slice(i, i + cols));
                  }
                  return { rows, overflow };
                };

                const renderGallery = (cols: number) => {
                  const { rows, overflow } = buildRows(cols);
                  return (
                    <div className="flex flex-col gap-2 sm:gap-3 w-full">
                      {rows.map((row, rIdx) => {
                        const isLastRow = rIdx === rows.length - 1;
                        return (
                          <div key={rIdx} className="flex gap-2 sm:gap-3">
                            {row.map((src, i) => {
                              const isLastTile =
                                isLastRow && i === row.length - 1;
                              const showOverflow = isLastTile && overflow > 0;
                              return (
                                <Link
                                  key={i}
                                  to="/tienda"
                                  className="relative flex-1 aspect-square overflow-hidden bg-muted/10 block group/thumb"
                                >
                                  <img
                                    src={src}
                                    alt=""
                                    className="w-full h-full object-cover opacity-85 group-hover/thumb:opacity-100 transition-opacity duration-500"
                                  />
                                  {showOverflow && (
                                    <div className="absolute inset-0 bg-background/75 backdrop-blur-[2px] flex items-center justify-center">
                                      <span className="text-sm font-bold text-foreground">
                                        +{overflow}
                                      </span>
                                    </div>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                };

                return (
                  <div className="w-full">
                    <div className="block sm:hidden">{renderGallery(3)}</div>
                    <div className="hidden sm:block">{renderGallery(4)}</div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* ── DARK PROMO ────────────────────────────────────────────────────────── */}
      <section className="relative py-20 sm:py-28 overflow-hidden section-dark">
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none hidden dark:block" />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none hidden dark:block" />
        <div className="absolute inset-0 bg-grid opacity-[0.15] mask-fade-center pointer-events-none" />
        <div className="absolute -top-1/4 -left-1/4 w-[60%] h-[60%] rounded-full bg-primary/8 blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[50%] h-[50%] rounded-full bg-primary/5 blur-[130px] pointer-events-none" />

        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-widest mb-5 sm:mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                Sistema multinivel inteligente
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground dark:text-white leading-[1.08] mb-4 tracking-tight">
                Potencia tu negocio
                <br />
                <span className="text-gradient-animated">al máximo nivel</span>
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground dark:text-white/55 leading-relaxed mb-7 max-w-lg">
                Mientras duermes, el sistema calcula y distribuye comisiones a
                toda tu red. Sin errores, sin retrasos.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to={user ? "/dashboard" : "/registro"}
                  className="btn-gold-shimmer inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20 text-base"
                >
                  Empezar ahora <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/contacto"
                  className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 bg-muted/30 border border-border/40 text-foreground dark:bg-white/5 dark:border-white/10 dark:text-white font-medium rounded-xl hover:bg-muted/50 dark:hover:bg-white/8 transition-all backdrop-blur-md text-base"
                >
                  Hablar con ventas
                </Link>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
                {[
                  "Sin tarjeta de crédito",
                  "Sin permanencia",
                  "Pago quincenal",
                ].map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground/60 dark:text-white/35"
                  >
                    <Check className="w-3 h-3" /> {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
              {[
                {
                  icon: DollarSign,
                  title: "Comisiones en tiempo real",
                  desc: "Calculadas al instante en cada compra de tu red.",
                },
                {
                  icon: Zap,
                  title: "Pago automático",
                  desc: "Transferencias quincenales sin trámite de tu parte.",
                },
                {
                  icon: Globe,
                  title: "Red internacional",
                  desc: "Tus afiliados pueden estar en cualquier ciudad.",
                },
                {
                  icon: TrendingUp,
                  title: "Crecimiento probado",
                  desc: "+340% anual. Números reales, no promesas.",
                },
              ].map((item, i) => (
                <div
                  key={item.title}
                  className={cn(
                    "py-6 sm:py-7",
                    // Mobile: apilado en 1 columna -> línea en todos menos el último
                    i < 3 && "border-b border-border/10 dark:border-white/10",
                    "sm:border-b-0",
                    // Desktop/tablet: grid 2x2 -> línea solo en la fila superior
                    i < 2 &&
                      "sm:border-b sm:border-border/10 sm:dark:border-white/10",
                    i % 2 === 0 && "sm:pr-6",
                    i % 2 === 1 && "sm:pl-6",
                  )}
                >
                  <item.icon
                    className="w-5 h-5 text-primary mb-3"
                    strokeWidth={1.75}
                  />
                  <div className="text-sm sm:text-base font-semibold text-foreground dark:text-white mb-1.5">
                    {item.title}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground dark:text-white/45 leading-relaxed">
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      {/* ── HOW IT WORKS ──────────────────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.15] mask-fade-center pointer-events-none" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 sm:mb-14">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">
              Proceso
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              De cero a{" "}
              <span className="text-gradient-animated">comisiones</span>
              <br className="hidden sm:block" /> en minutos
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div
                key={step.n}
                className={cn(
                  "relative py-7 sm:py-0 sm:px-8",
                  i === 0 && "sm:pl-0",
                  i === steps.length - 1 && "sm:pr-0",
                )}
              >
                {/* separador mobile: línea horizontal debajo, excepto el último */}
                {i < steps.length - 1 && (
                  <div className="absolute left-0 right-0 -bottom-0 h-px bg-border/15 dark:bg-white/10 sm:hidden" />
                )}
                {/* separador desktop: línea vertical a la derecha, excepto el último */}
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-0 bottom-0 right-0 w-px bg-border/15 dark:bg-white/10" />
                )}

                <div className="flex items-center justify-between mb-4">
                  <step.icon
                    className="w-5 h-5 text-primary"
                    strokeWidth={1.75}
                  />
                  <span className="text-3xl sm:text-4xl font-black text-foreground/10 select-none leading-none tracking-tight">
                    {step.n}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground/75 leading-relaxed text-sm">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ── TESTIMONIALS ──────────────────────────────────────────────────────── */}
      {(dbTestimonials.length > 0 || regionStats.length > 0) && (
        <section className="py-16 sm:py-24 overflow-hidden">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 mb-10 sm:mb-14">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">
              Testimonios
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Miles ya <span className="text-gradient-animated">ganan</span> con
              Cluv 360
            </h2>
            <p className="text-base text-muted-foreground/80 mt-3 max-w-xl">
              Historias reales de emprendedores que ya ganan con la plataforma.
            </p>
          </div>

          {/* ── Bento grid — explicit placement, no divide-x/y ─────────────── */}
{(regionStats.length > 0 || dbTestimonials.length > 0) && (
            <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 mb-10 sm:mb-14">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 rounded-2xl border border-border/25 overflow-hidden">
                {regionStats[0] && (
                  <div className="group relative flex flex-col items-center justify-center text-center overflow-hidden min-h-[140px] border-b border-border/20 transition-colors hover:bg-foreground/[0.03]">
                    {regionStats[0].image_url && (
                      <img
                        src={regionStats[0].image_url}
                        alt={regionStats[0].city}
                        className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/55 to-background/20 pointer-events-none" />
                    <div className="relative z-10 px-5 py-7">
                      <div className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground tabular-nums">
                        {regionStats[0].members}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1.5">
                        afiliados en {regionStats[0].city}
                      </div>
                    </div>
                  </div>
                )}

                {regionStats[1] && (
                  <div className="group relative flex flex-col items-center justify-center text-center overflow-hidden min-h-[140px] border-b border-border/20 sm:border-l sm:border-border/20 transition-colors hover:bg-foreground/[0.03]">
                    {regionStats[1].image_url && (
                      <img
                        src={regionStats[1].image_url}
                        alt={regionStats[1].city}
                        className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/55 to-background/20 pointer-events-none" />
                    <div className="relative z-10 px-5 py-7">
                      <div className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground tabular-nums">
                        {regionStats[1].members}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1.5">
                        afiliados en {regionStats[1].city}
                      </div>
                    </div>
                  </div>
                )}

                <div className="group relative flex flex-col items-center justify-center text-center overflow-hidden min-h-[140px] border-b border-border/20 sm:border-l sm:border-border/20 lg:border-l transition-colors hover:bg-foreground/[0.03]">
                  {regionStats[4]?.image_url && (
                    <img
                      src={regionStats[4].image_url}
                      alt={regionStats[4]?.city}
                      className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/55 to-background/20 pointer-events-none" />
                  <div className="relative z-10 px-5 py-7">
                    {regionStats[4] && (
                      <>
                        <div className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground tabular-nums">
                          {regionStats[4].members}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground mt-1.5">
                          afiliados en {regionStats[4].city}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {dbTestimonials[0] && (
                  <div
                    className="group p-6 sm:p-7 flex flex-col justify-between border-b border-border/20 transition-colors hover:bg-foreground/[0.03]
                    sm:border-l sm:border-border/20
                    lg:col-start-3 lg:row-start-2 lg:border-l lg:border-b-0
                    min-h-[150px]"
                  >
                    <div>
                      <div className="flex gap-1 mb-2.5">
                        {Array.from({ length: dbTestimonials[0].rating }).map(
                          (_, i) => (
                            <Star
                              key={i}
                              className="w-3 h-3 fill-primary text-primary"
                            />
                          ),
                        )}
                      </div>
                      <p className="text-foreground/75 leading-relaxed text-sm sm:text-[15px] line-clamp-4">
                        "{dbTestimonials[0].content}"
                      </p>
                    </div>
                    <div className="flex items-center gap-3 pt-3 mt-4 border-t border-border/20">
                      <img
                        src={
                          dbTestimonials[0].avatar_url ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(dbTestimonials[0].name)}&background=e2e8f0&color=64748b`
                        }
                        alt={dbTestimonials[0].name}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-1 ring-border/40"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(dbTestimonials[0].name)}&background=e2e8f0&color=64748b`;
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {dbTestimonials[0].name}
                        </div>
                        <div className="text-xs text-muted-foreground/80 truncate">
                          {dbTestimonials[0].role}
                        </div>
                      </div>
                      {dbTestimonials[0].earnings && (
                        <div className="text-sm font-semibold text-emerald-500 dark:text-emerald-400 shrink-0 ml-2 tabular-nums">
                          {dbTestimonials[0].earnings}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {dbTestimonials[1] && (
                  <div
                    className="group p-6 sm:p-7 flex flex-col justify-between border-b border-border/20 transition-colors hover:bg-foreground/[0.03]
                    sm:border-b sm:border-border/20
                    lg:col-start-1 lg:col-span-2 lg:row-start-2 lg:border-l-0 lg:border-b-0
                    min-h-[150px]"
                  >
                    <div>
                      <div className="flex gap-1 mb-2.5">
                        {Array.from({ length: dbTestimonials[1].rating }).map(
                          (_, i) => (
                            <Star
                              key={i}
                              className="w-3 h-3 fill-primary text-primary"
                            />
                          ),
                        )}
                      </div>
                      <p className="text-foreground/75 leading-relaxed text-sm sm:text-[15px] line-clamp-3">
                        "{dbTestimonials[1].content}"
                      </p>
                    </div>
                    <div className="flex items-center gap-3 pt-3 mt-4 border-t border-border/20">
                      <img
                        src={
                          dbTestimonials[1].avatar_url ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(dbTestimonials[1].name)}&background=e2e8f0&color=64748b`
                        }
                        alt={dbTestimonials[1].name}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-1 ring-border/40"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(dbTestimonials[1].name)}&background=e2e8f0&color=64748b`;
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {dbTestimonials[1].name}
                        </div>
                        <div className="text-xs text-muted-foreground/80 truncate">
                          {dbTestimonials[1].role}
                        </div>
                      </div>
                      {dbTestimonials[1].earnings && (
                        <div className="text-sm font-semibold text-emerald-500 dark:text-emerald-400 shrink-0 ml-2 tabular-nums">
                          {dbTestimonials[1].earnings}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {regionStats[2] && (
                  <div className="group relative flex flex-col items-center justify-center text-center overflow-hidden min-h-[140px] border-b border-border/20 lg:border-b-0 lg:border-t lg:col-start-1 lg:row-start-3 transition-colors hover:bg-foreground/[0.03]">
                    {regionStats[2].image_url && (
                      <img
                        src={regionStats[2].image_url}
                        alt={regionStats[2].city}
                        className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/55 to-background/20 pointer-events-none" />
                    <div className="relative z-10 px-5 py-7">
                      <div className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground tabular-nums">
                        {regionStats[2].members}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1.5">
                        afiliados en {regionStats[2].city}
                      </div>
                    </div>
                  </div>
                )}

                {regionStats[3] && (
                  <div className="group relative flex flex-col items-center justify-center text-center overflow-hidden min-h-[140px] border-b border-border/20 sm:border-l lg:border-b-0 lg:border-t lg:col-start-2 lg:row-start-3 transition-colors hover:bg-foreground/[0.03]">
                    {regionStats[3].image_url && (
                      <img
                        src={regionStats[3].image_url}
                        alt={regionStats[3].city}
                        className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/55 to-background/20 pointer-events-none" />
                    <div className="relative z-10 px-5 py-7">
                      <div className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground tabular-nums">
                        {regionStats[3].members}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1.5">
                        afiliados en {regionStats[3].city}
                      </div>
                    </div>
                  </div>
                )}

                {dbTestimonials[2] && (
                  <div
                    className="group p-6 sm:p-7 flex flex-col justify-between transition-colors hover:bg-foreground/[0.03]
                    sm:border-l sm:border-border/20
                    lg:col-start-3 lg:col-span-1 lg:row-start-3 lg:border-l lg:border-t lg:border-border/20
                    min-h-[150px]"
                  >
                    <div>
                      <div className="flex gap-1 mb-2.5">
                        {Array.from({ length: dbTestimonials[2].rating }).map(
                          (_, i) => (
                            <Star
                              key={i}
                              className="w-3 h-3 fill-primary text-primary"
                            />
                          ),
                        )}
                      </div>
                      <p className="text-foreground/75 leading-relaxed text-sm line-clamp-4">
                        "{dbTestimonials[2].content}"
                      </p>
                    </div>
                    <div className="flex items-center gap-3 pt-3 mt-4 border-t border-border/20">
                      <img
                        src={
                          dbTestimonials[2].avatar_url ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(dbTestimonials[2].name)}&background=e2e8f0&color=64748b`
                        }
                        alt={dbTestimonials[2].name}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-1 ring-border/40"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(dbTestimonials[2].name)}&background=e2e8f0&color=64748b`;
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {dbTestimonials[2].name}
                        </div>
                        <div className="text-xs text-muted-foreground/80 truncate">
                          {dbTestimonials[2].role}
                        </div>
                      </div>
                      {dbTestimonials[2].earnings && (
                        <div className="text-sm font-semibold text-emerald-500 dark:text-emerald-400 shrink-0 ml-2 tabular-nums">
                          {dbTestimonials[2].earnings}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {dbTestimonials.length > 0 && (
            <TestimonialsCarousel items={dbTestimonials} />
          )}
        </section>
      )}

      {/* ── RANKS ─────────────────────────────────────────────────────────────── */}
   {ranks.filter((r) => r.is_active !== false).length > 0 && (
        <section className="py-16 sm:py-24">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-[1fr_1.4fr] gap-10 sm:gap-12 lg:gap-16 items-start">
              <div>
                <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">
                  Rangos
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
                  Cada nivel,
                  <br />
                  <span className="text-gradient-animated">más ingresos</span>
                </h2>
                <p className="text-muted-foreground/80 leading-relaxed mb-6 sm:mb-8 max-w-md text-sm">
                  El sistema premia tu esfuerzo con bonos progresivos. Desde
                  Bronce hasta el nivel máximo Corona.
                </p>
                <Link
                  to={user ? "/dashboard/rangos" : "/registro"}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-foreground/90 backdrop-blur-md text-background font-semibold rounded-xl hover:opacity-90 transition-all"
                >
                  {user ? "Ver mis rangos" : "Ver todos los rangos"}{" "}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div>
                {(() => {
                  const activeRanks = ranks.filter(
                    (r) => r.is_active !== false,
                  );
                  const count = activeRanks.length;
                  const gridClass =
                    count >= 6
                      ? "grid grid-cols-2 sm:grid-cols-3 gap-2"
                      : count >= 4
                        ? "grid grid-cols-1 sm:grid-cols-2 gap-2.5"
                        : "space-y-2.5";
                  const isCompact = count >= 6;
                  return (
                    <div className={gridClass}>
                      {activeRanks.map((r) => {
                        const iconColorStyle = r.color?.startsWith("#")
                          ? { color: r.color }
                          : undefined;
                        const textColorClass = r.color?.startsWith("#")
                          ? ""
                          : r.color || "";
                        return (
                          <div
                            key={r.id}
                            className={cn(
                              "group relative rounded-xl border border-border/15 overflow-hidden transition-colors hover:border-border/30 hover:bg-foreground/[0.02]",
                              isCompact ? "p-3" : "p-4",
                            )}
                          >
                            <div
                              className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                              aria-hidden
                            >
                              <div
                                className="w-16 h-16 opacity-[0.06] flex items-center justify-center"
                                style={iconColorStyle}
                              >
                                <Award className="w-full h-full" />
                              </div>
                            </div>
                            <div className="relative flex items-center gap-2.5">
                              <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                <div
                                  className={cn(
                                    "w-5 h-5 flex items-center justify-center",
                                    !iconColorStyle && "text-primary",
                                  )}
                                  style={iconColorStyle}
                                >
                                  <RankIcon rank={r} className="w-5 h-5" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div
                                  className={cn(
                                    "text-sm font-semibold leading-tight",
                                    isCompact && "text-[13px]",
                                    textColorClass,
                                  )}
                                  style={iconColorStyle}
                                >
                                  {r.name}
                                </div>
                                {r.min_affiliates > 0 && (
                                  <div className="text-[11px] text-muted-foreground/55">
                                    {r.min_affiliates} afil.
                                  </div>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-sm font-bold text-foreground tabular-nums">
                                  {formatPrice(
                                    r.bonus,
                                    currency,
                                    currencySymbol,
                                    exchangeRate,
                                  )}
                                </div>
                                <div className="text-[10px] text-muted-foreground/50">
                                  bono
                                </div>
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
      )}

      {/* ── PLANS ─────────────────────────────────────────────────────────────── */}
      {plans.length > 0 && (
        <section className="py-16 sm:py-24" id="planes">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10 sm:mb-14">
              <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">
                Precios
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight mb-2">
                <span className="text-gradient-animated">Planes flexibles</span>
                <br />
                <span className="text-foreground">que crecen contigo</span>
              </h2>
              <p className="text-base text-muted-foreground/80 max-w-lg mt-3">
                Comienza gratis y escala cuando tu negocio lo necesite.
              </p>
            </div>

            <div
              className={cn(
                "grid gap-4",
                plans.length === 1
                  ? "grid-cols-1 max-w-sm"
                  : plans.length === 2
                    ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
              )}
            >
              {plans.map((plan) => {
                const isFree = plan.is_free || plan.price === 0;
                const isCurrent = user && (user as any).plan === plan.slug;
                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "rounded-2xl p-6 flex flex-col relative transition-all backdrop-blur-md",
                      plan.is_popular
                        ? "bg-white/70 dark:bg-white/[0.04] border border-primary/30 shadow-lg shadow-primary/8"
                        : "bg-white/50 dark:bg-white/[0.02] border border-border/30 hover:border-border/50",
                    )}
                  >
                    {plan.is_popular && (
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                    )}
                    {plan.badge && (
                      <div
                        className={cn(
                          "absolute -top-3 left-4 text-xs font-bold px-3 py-1 rounded-full",
                          plan.is_popular
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                            : "bg-muted/40 text-foreground border border-border/30",
                        )}
                      >
                        {plan.badge}
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute -top-3 right-4 text-xs font-bold px-3 py-1 rounded-full bg-primary text-primary-foreground">
                        Actual
                      </div>
                    )}
                    <div className="mb-4 relative">
                      <h3 className="text-lg font-bold text-foreground">
                        {plan.name}
                      </h3>
                      {plan.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {plan.description}
                        </p>
                      )}
                    </div>
                    <div className="mb-5 relative">
                      <span className="text-3xl font-bold text-foreground tracking-tight">
                        {isFree
                          ? "Gratis"
                          : formatPrice(
                              plan.price,
                              currency,
                              currencySymbol,
                              exchangeRate,
                            )}
                      </span>
                      {!isFree && (
                        <span className="text-sm text-muted-foreground font-normal ml-1">
                          /mes
                        </span>
                      )}
                      {plan.trial_days > 0 && (
                        <span className="text-xs text-primary block mt-1">
                          {plan.trial_days} días de prueba
                        </span>
                      )}
                    </div>
                    <ul className="space-y-2 mb-6 flex-1 relative">
                      {(plan.features || []).slice(0, 5).map((f: string) => (
                        <li
                          key={f}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <div className="py-2.5 text-center border border-primary/20 rounded-xl bg-primary/5 relative">
                        <span className="text-sm font-medium text-primary">
                          Tu plan actual
                        </span>
                      </div>
                    ) : (
                      <Link
                        to={
                          user
                            ? "/dashboard/mi-plan"
                            : `/registro?plan=${plan.slug}`
                        }
                        className={cn(
                          "py-3 rounded-xl text-sm font-semibold text-center transition-all block backdrop-blur-md relative",
                          plan.is_popular
                            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/15"
                            : "border border-border/30 bg-white/60 dark:bg-white/[0.03] hover:bg-muted/20 dark:hover:bg-white/[0.05] text-foreground",
                        )}
                      >
                        {isFree ? "Comenzar gratis" : "Activar plan"}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-center text-sm text-muted-foreground/60 mt-8">
              <Link
                to="/planes"
                className="text-primary font-medium hover:underline"
              >
                Ver comparación completa de planes →
              </Link>
            </p>
          </div>
        </section>
      )}

      {/* ── STORE ─────────────────────────────────────────────────────────────── */}
      <StoreSection />

      {/* ── FAQ ───────────────────────────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.12] mask-fade-center pointer-events-none" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 sm:mb-14">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">
              FAQ
            </span>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-3">
                  Preguntas{" "}
                  <span className="text-gradient-animated">frecuentes</span>
                </h2>
                <p className="text-muted-foreground/70 text-sm sm:text-base max-w-md">
                  Todo lo que necesitas saber. Si tienes más preguntas, estamos
                  disponibles 24/7.
                </p>
              </div>
              <Link
                to="/contacto"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-border/30 bg-white/60 dark:bg-white/[0.03] backdrop-blur-md rounded-xl text-sm font-medium hover:border-primary/40 hover:text-primary transition-all group shrink-0"
              >
                Contactar soporte
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {faqItems.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground/50">
                No hay preguntas configuradas aún.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 lg:gap-x-12">
              <div>
                {faqLeft.map((faq) => {
                  const i = faqItems.indexOf(faq);
                  return (
                    <div
                      key={i}
                      className={cn(
                        "border-b border-border/20",
                        i === 0 && "border-t border-border/20",
                      )}
                    >
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between py-5 text-left gap-4 group"
                      >
                        <span
                          className={cn(
                            "text-sm sm:text-[15px] leading-snug transition-colors",
                            openFaq === i
                              ? "font-semibold text-foreground"
                              : "font-medium text-foreground/70 group-hover:text-foreground",
                          )}
                        >
                          {faq.question}
                        </span>
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200",
                            openFaq === i
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground/40 group-hover:text-foreground/60",
                          )}
                        >
                          <ChevronDown
                            className={cn(
                              "w-3.5 h-3.5 transition-transform duration-300",
                              openFaq === i && "rotate-180",
                            )}
                          />
                        </div>
                      </button>
                      <div
                        className={cn(
                          "overflow-hidden transition-all duration-300 ease-in-out",
                          openFaq === i ? "max-h-96 pb-5" : "max-h-0",
                        )}
                      >
                        <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div>
                {faqRight.map((faq) => {
                  const i = faqItems.indexOf(faq);
                  const isFirst = faqRight[0] === faq;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "border-b border-border/20",
                        isFirst && "border-t border-border/20",
                      )}
                    >
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between py-5 text-left gap-4 group"
                      >
                        <span
                          className={cn(
                            "text-sm sm:text-[15px] leading-snug transition-colors",
                            openFaq === i
                              ? "font-semibold text-foreground"
                              : "font-medium text-foreground/70 group-hover:text-foreground",
                          )}
                        >
                          {faq.question}
                        </span>
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200",
                            openFaq === i
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground/40 group-hover:text-foreground/60",
                          )}
                        >
                          <ChevronDown
                            className={cn(
                              "w-3.5 h-3.5 transition-transform duration-300",
                              openFaq === i && "rotate-180",
                            )}
                          />
                        </div>
                      </button>
                      <div
                        className={cn(
                          "overflow-hidden transition-all duration-300 ease-in-out",
                          openFaq === i ? "max-h-96 pb-5" : "max-h-0",
                        )}
                      >
                        <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </p>
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
        <div className="absolute inset-0 bg-grid opacity-[0.15] mask-fade-center pointer-events-none" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[450px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-15%] left-1/2 -translate-x-1/2 w-[400px] h-[280px] rounded-full bg-primary/6 blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-[680px] mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/30 border border-border/40 rounded-full text-xs font-medium text-muted-foreground dark:bg-white/5 dark:border-white/10 dark:text-white/55 mb-6 sm:mb-8 backdrop-blur-md">
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
            Unete a miles de emprendedores que ya construyen libertad financiera
            con Cluv 360.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mb-10">
            <Link
              to={user ? "/dashboard" : "/registro"}
              className="btn-gold-shimmer inline-flex items-center justify-center gap-2 px-7 sm:px-9 py-4 bg-foreground/90 backdrop-blur-md text-background font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-2xl shadow-black/20 text-base"
            >
              {user ? "Ir a mi Panel" : "Crear cuenta gratis"}{" "}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/contacto"
              className="inline-flex items-center justify-center gap-2 px-7 sm:px-9 py-4 bg-muted/30 border border-border/40 text-foreground dark:bg-white/5 dark:border-white/10 dark:text-white font-medium rounded-xl hover:bg-muted/50 dark:hover:bg-white/8 transition-all backdrop-blur-md text-base"
            >
              Hablar con ventas
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground/55 dark:text-white/30">
            {[
              "Cuenta gratuita",
              "Sin permanencia",
              "Pago quincenal",
              "Soporte 24/7",
            ].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-muted-foreground/70 dark:text-white/40" />{" "}
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
