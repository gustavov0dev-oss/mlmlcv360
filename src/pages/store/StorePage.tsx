import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDatabase } from '@/lib/backend';
import { useCart } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useConfig } from '@/store/configStore';
import { useNavigate } from '@/lib/router';
import {
  Search, X, Package, SlidersHorizontal,
  Sparkles, TrendingUp, ChevronDown, Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product, ProductCategory } from '@/lib/storeTypes';
import { toast } from 'sonner';
import ProductCard from '@/components/store/ProductCard';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Más relevantes' },
  { value: 'best_sellers', label: 'Más vendidos' },
  { value: 'newest', label: 'Más recientes' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
  { value: 'rating', label: 'Mejor valorados' },
];

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg', className)} />;
}

function ProductRowSkeleton() {
  return (
    <div className="flex flex-col">
      <Skeleton className="aspect-square bg-muted w-full" />
      <div className="pt-3 space-y-2">
        <Skeleton className="h-2 w-1/3 bg-muted rounded-full" />
        <Skeleton className="h-3 w-full bg-muted rounded" />
        <Skeleton className="h-3 w-4/5 bg-muted rounded" />
        <Skeleton className="h-4 w-2/5 bg-muted rounded mt-1" />
      </div>
    </div>
  );
}

function CompareBar({ products, onRemove, onClear }: {
  products: Product[];
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const navigate = useNavigate();
  if (products.length === 0) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-md pointer-events-none">
      <div className="bg-card border border-border shadow-2xl shadow-black/20 rounded-2xl p-3 flex items-center gap-3 pointer-events-auto">
        <div className="flex gap-2 flex-1 min-w-0">
          {products.map(p => (
            <div key={p.id} className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-xl overflow-hidden border border-border bg-muted">
                {p.images?.[0]?.url
                  ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                  : <Package className="w-full h-full p-2 text-muted-foreground/30" />}
              </div>
              <button
                onClick={() => onRemove(p.id)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow z-10 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
          {Array.from({ length: Math.max(0, 3 - products.length) }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-11 h-11 rounded-xl border-2 border-dashed border-border/40 flex items-center justify-center text-muted-foreground/30 text-xl font-light">+</div>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {products.length >= 2 && (
            <button
              onClick={() => navigate(`/tienda/comparar?ids=${products.map(p => p.id).join(',')}`)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold transition-all active:scale-95"
            >
              Comparar
            </button>
          )}
          <button onClick={onClear} className="p-2 border border-border rounded-xl hover:bg-muted transition-colors" title="Limpiar">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StorePage() {
  const database = useDatabase();
  const { company, showUsd, setShowUsd, currencySymbol } = useConfig();
  const { user } = useAuthStore();
  const { subtotal } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState(() => new URLSearchParams(window.location.search).get('cat') || '');
  const [sort, setSort] = useState('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [page, setPage] = useState(1);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const freeShipThreshold = parseFloat(company.free_shipping_threshold || '150');
  const PER_PAGE = 24;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: prods }, { data: cats }] = await Promise.all([
      database.select<Product>('products', {
        select: '*, category:product_categories(id,name,slug), variants:product_variants(id,name,sku,price,compare_price,stock,attributes,images,status,sort_order,attribute_type,color_name)',
        filter: { status: 'active' },
        order: { column: 'sort_order' },
      }),
      database.select<ProductCategory>('product_categories', {
        filter: { status: 'active' }, order: { column: 'sort_order' },
      }),
    ]);
    setProducts((prods || []) as Product[]);
    setCategories((cats || []) as ProductCategory[]);

    if (user) {
      const { data: wl } = await database.select('wishlists', { select: 'product_id', filter: { user_id: user.id } });
      if (wl) setWishlist(new Set((wl as any[]).map((w: any) => w.product_id)));
    }

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: oi } = await database.select<any>('order_items', {
      select: 'product_id, quantity',
      filter: [{ column: 'created_at', operator: 'gte', value: since }],
    });
    if (oi && prods) {
      const map: Record<string, number> = {};
      for (const x of oi as any[]) if (x.product_id) map[x.product_id] = (map[x.product_id] || 0) + x.quantity;
      setBestsellers(
        Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
          .map(([id]) => (prods as any[]).find(p => p.id === id)).filter(Boolean) as Product[]
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [catFilter, search, sort, priceMin, priceMax]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (catFilter) list = list.filter(p => p.category_id === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.short_description || '').toLowerCase().includes(q) ||
        (p.tags || []).some((t: string) => t.toLowerCase().includes(q))
      );
    }
    if (priceMin) list = list.filter(p => p.base_price >= parseFloat(priceMin));
    if (priceMax) list = list.filter(p => p.base_price <= parseFloat(priceMax));
    switch (sort) {
      case 'price_asc': list.sort((a, b) => a.base_price - b.base_price); break;
      case 'price_desc': list.sort((a, b) => b.base_price - a.base_price); break;
      case 'newest': list.sort((a, b) => b.created_at.localeCompare(a.created_at)); break;
      case 'rating': list.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0)); break;
      case 'best_sellers': list.sort((a, b) => ((b as any).sales_count ?? 0) - ((a as any).sales_count ?? 0)); break;
      default: list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)); break;
    }
    return list;
  }, [products, catFilter, search, sort, priceMin, priceMax]);

  const featured = products.filter(p => p.featured).slice(0, 8);
  const paginated = filtered.slice(0, page * PER_PAGE);
  const hasMore = paginated.length < filtered.length;
  const hasActiveFilters = !!(priceMin || priceMax || search);
  const activeCat = categories.find(c => c.id === catFilter);
  const showHome = !catFilter && !search;
  const compareIds = new Set(compareList.map(p => p.id));

  const toggleCompare = (product: Product) => {
    setCompareList(prev => {
      if (prev.find(p => p.id === product.id)) return prev.filter(p => p.id !== product.id);
      if (prev.length >= 3) { toast.error('Máximo 3 productos para comparar'); return prev; }
      toast.success('Agregado para comparar');
      return [...prev, product];
    });
  };
  const handleWishlist = (id: string, w: boolean) => {
    setWishlist(prev => { const s = new Set(prev); w ? s.add(id) : s.delete(id); return s; });
  };

  return (
    <>

      {/* ── SEARCH BAR ── */}
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2.5">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar productos, marcas y más..."
                className="w-full pl-10 pr-9 py-2.5 bg-muted/50 text-foreground border border-border/60 rounded-xl text-sm font-medium placeholder:text-muted-foreground/70 outline-none focus:border-primary focus:bg-card transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Currency converter toggle */}
            <button
              onClick={() => setShowUsd(!showUsd)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all active:scale-95',
                showUsd
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'bg-muted/50 text-foreground/70 border border-border/60 hover:bg-muted'
              )}
              title="Cambiar moneda"
            >
              <span className={cn('w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black',
                showUsd ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground')}>
                {showUsd ? '$' : 'S'}
              </span>
              {showUsd ? 'USD' : 'PEN'}
            </button>
          </div>
        </div>
      </div>

      {/* ── CATEGORIES BAR (sticky) ── */}
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setCatFilter('')}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                !catFilter
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground/60 hover:text-foreground hover:bg-muted/60'
              )}
            >
              <Package className="w-3.5 h-3.5" />
              Todo
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCatFilter(catFilter === cat.id ? '' : cat.id)}
                className={cn(
                  'flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                  catFilter === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground/60 hover:text-foreground hover:bg-muted/60'
                )}
              >
                {cat.image_url
                  ? <img src={cat.image_url} alt="" className="w-4 h-4 rounded object-cover" />
                  : <span className="w-1 h-1 rounded-full bg-current opacity-40" />}
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── PAGE CONTENT ── */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

          {/* Free shipping notice */}
          {subtotal > 0 && subtotal < freeShipThreshold && (
            <div className="mb-6 flex items-center gap-2.5">
              <Truck className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="text-xs text-muted-foreground">
                Agrega <strong className="text-primary">{currencySymbol} {(freeShipThreshold - subtotal).toFixed(2)}</strong> más para envío gratis
              </div>
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden ml-2 max-w-xs">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((subtotal / freeShipThreshold) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
          {subtotal >= freeShipThreshold && subtotal > 0 && (
            <div className="mb-6 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Truck className="w-4 h-4" />
              ¡Tienes envío gratis en tu pedido!
            </div>
          )}

          {/* ── FEATURED SECTION ── */}
          {showHome && !loading && featured.length > 0 && (
            <section className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h2 className="text-base font-semibold text-foreground">Destacados</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 lg:gap-6">
                {featured.map(p => (
                  <ProductCard key={p.id} product={p} isWishlisted={wishlist.has(p.id)} onWishlistToggle={handleWishlist} onCompareToggle={toggleCompare} isComparing={compareIds.has(p.id)} freeShipThreshold={freeShipThreshold} />
                ))}
              </div>
            </section>
          )}

          {/* ── BESTSELLERS ── */}
          {showHome && !loading && bestsellers.length > 0 && (
            <section className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <h2 className="text-base font-semibold text-foreground">Más vendidos</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 lg:gap-6">
                {bestsellers.map(p => (
                  <ProductCard key={p.id} product={p} isWishlisted={wishlist.has(p.id)} onWishlistToggle={handleWishlist} onCompareToggle={toggleCompare} isComparing={compareIds.has(p.id)} freeShipThreshold={freeShipThreshold} />
                ))}
              </div>
            </section>
          )}

          {/* ── CATALOG ── */}
          <section>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">
                {activeCat ? activeCat.name : 'Todos los productos'}
              </h2>
              <span className="text-xs text-muted-foreground">
                {loading ? '...' : `${filtered.length} ${filtered.length === 1 ? 'producto' : 'productos'}`}
              </span>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <div className="relative">
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  className="has-chevron appearance-none pl-3 pr-8 py-1.5 bg-muted/40 border border-border/60 rounded-lg text-xs font-medium text-foreground outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              </div>

              <button
                onClick={() => setShowFilters(v => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  showFilters || hasActiveFilters ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted/40 text-foreground/60 border-border/60 hover:bg-muted'
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filtros
                {hasActiveFilters && <span className="w-1.5 h-1.5 bg-primary rounded-full" />}
              </button>

              {catFilter && activeCat && (
                <button onClick={() => setCatFilter('')} className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                  {activeCat.name} <X className="w-3 h-3" />
                </button>
              )}
              {search && (
                <button onClick={() => setSearch('')} className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                  "{search}" <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div className="mb-6 flex flex-wrap gap-4 items-end pb-5 border-b border-border/40">
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Precio mín. ({currencySymbol})</label>
                  <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="0"
                    className="w-full px-3 py-2 bg-muted/40 border border-border/60 rounded-lg text-sm outline-none focus:border-primary transition-colors" />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Precio máx. ({currencySymbol})</label>
                  <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="Sin límite"
                    className="w-full px-3 py-2 bg-muted/40 border border-border/60 rounded-lg text-sm outline-none focus:border-primary transition-colors" />
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={() => { setPriceMin(''); setPriceMax(''); setSearch(''); setCatFilter(''); setShowFilters(false); }}
                    className="px-3 py-2 text-red-500 text-xs font-medium bg-red-500/10 hover:bg-red-500/15 rounded-lg transition-colors"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            )}

            {/* Product grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 lg:gap-6">
                {Array.from({ length: 12 }).map((_, i) => <ProductRowSkeleton key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Package className="w-7 h-7 text-muted-foreground/30" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Sin resultados</h3>
                <p className="text-muted-foreground text-xs mt-1 mb-5">Intenta con otros filtros o búsqueda</p>
                <button
                  onClick={() => { setSearch(''); setCatFilter(''); setPriceMin(''); setPriceMax(''); }}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm transition-all active:scale-95"
                >
                  Ver todo
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 lg:gap-6">
                  {paginated.map(p => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      isWishlisted={wishlist.has(p.id)}
                      onWishlistToggle={handleWishlist}
                      onCompareToggle={toggleCompare}
                      isComparing={compareIds.has(p.id)}
                      freeShipThreshold={freeShipThreshold}
                    />
                  ))}
                </div>
                {hasMore && (
                  <div className="text-center mt-10">
                    <button
                      onClick={() => setPage(p => p + 1)}
                      className="inline-flex items-center gap-2 px-8 py-3 bg-muted/50 hover:bg-muted text-foreground/80 hover:text-foreground rounded-xl font-medium text-sm transition-all"
                    >
                      <ChevronDown className="w-4 h-4" />
                      Ver más ({filtered.length - paginated.length} productos)
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      <CompareBar
        products={compareList}
        onRemove={id => setCompareList(prev => prev.filter(p => p.id !== id))}
        onClear={() => setCompareList([])}
      />

    </>
  );
}
