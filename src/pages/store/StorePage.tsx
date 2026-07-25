import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDatabase } from '@/lib/backend';
import { useCart } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useConfig } from '@/store/configStore';
import { useNavigate } from '@/lib/router';
import {
  Search, X, ShoppingCart, Package, SlidersHorizontal,
  Sparkles, TrendingUp, Clock, ArrowUpDown, Star, ChevronDown,
  DollarSign, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product, ProductCategory } from '@/lib/storeTypes';
import { toast } from 'sonner';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import FreeShippingBar from '@/components/store/FreeShippingBar';
import ProductCard from '@/components/store/ProductCard';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevancia', icon: Sparkles },
  { value: 'best_sellers', label: 'Más vendidos', icon: TrendingUp },
  { value: 'newest', label: 'Más recientes', icon: Clock },
  { value: 'price_asc', label: 'Menor precio', icon: ArrowUpDown },
  { value: 'price_desc', label: 'Mayor precio', icon: ArrowUpDown },
  { value: 'rating', label: 'Mejor valorados', icon: Star },
];

function CardSkeleton() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border/50">
      <div className="aspect-square bg-muted animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-2 bg-muted rounded animate-pulse w-1/3" />
        <div className="h-3.5 bg-muted rounded animate-pulse" />
        <div className="h-3.5 bg-muted rounded animate-pulse w-3/4" />
        <div className="h-5 bg-muted rounded animate-pulse w-1/2 mt-3" />
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
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xl shadow-black/30 p-3 flex items-center gap-3 pointer-events-auto">
        {/* Thumbnails */}
        <div className="flex gap-2 flex-1">
          {products.map(p => (
            <div key={p.id} className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-border bg-muted">
                {p.images?.[0]?.url
                  ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                  : <Package className="w-full h-full p-2.5 text-muted-foreground/30" />}
              </div>
              <button
                onClick={() => onRemove(p.id)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors z-10"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {Array.from({ length: Math.max(0, 3 - products.length) }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-12 h-12 rounded-xl border-2 border-dashed border-border/40 flex items-center justify-center text-lg text-muted-foreground/30 font-light">+</div>
          ))}
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {products.length >= 2 && (
            <button
              onClick={() => navigate(`/tienda/comparar?ids=${products.map(p => p.id).join(',')}`)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold transition-all active:scale-95"
            >
              Comparar
            </button>
          )}
          <button
            onClick={onClear}
            className="p-2 border border-border/60 rounded-xl hover:bg-muted transition-colors"
            title="Limpiar comparación"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, onSeeAll }: { icon: React.ReactNode; title: string; onSeeAll?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">{title}</h2>
      </div>
      {onSeeAll && (
        <button onClick={onSeeAll} className="flex items-center gap-0.5 text-xs text-primary font-semibold">
          Ver todo <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default function StorePage() {
  const database = useDatabase();
  const { company, showUsd, setShowUsd } = useConfig();
  const { user } = useAuthStore();
  const { itemCount, subtotal } = useCart();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get('cat') || '';
  });
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
      database.select<ProductCategory>('product_categories', { filter: { status: 'active' }, order: { column: 'sort_order' } }),
    ]);
    setProducts((prods || []) as Product[]);
    setCategories((cats || []) as ProductCategory[]);

    if (user) {
      const { data: wl } = await database.select('wishlists', { select: 'product_id', filter: { user_id: user.id } });
      if (wl) setWishlist(new Set((wl as any[]).map((w: any) => w.product_id)));
    }

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: orderItems } = await database.select<any>('order_items', {
      select: 'product_id, quantity',
      filter: [{ column: 'created_at', operator: 'gte', value: since }],
    });
    const oiArr = (orderItems || []) as any[];
    if (oiArr.length > 0 && prods) {
      const countMap: Record<string, number> = {};
      for (const oi of oiArr) {
        if (oi.product_id) countMap[oi.product_id] = (countMap[oi.product_id] || 0) + oi.quantity;
      }
      const sorted = Object.entries(countMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([id]) => (prods as any[]).find(p => p.id === id))
        .filter(Boolean) as Product[];
      setBestsellers(sorted);
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
  const storeName = company.store_name || 'Tienda';
  const showHomeSections = !catFilter && !search;
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
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="pt-16 flex-1">

        {/* ── SEARCH BAR ── */}
        <div className="bg-card border-b border-border/60">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3">
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={`Buscar en ${storeName}...`}
                  className="w-full pl-9 pr-8 py-2.5 bg-muted/60 border border-border/60 rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 focus:bg-background transition-colors"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Cart */}
              <button
                onClick={() => navigate('/carrito')}
                className="relative flex items-center gap-1.5 px-3.5 py-2.5 bg-muted/60 border border-border/60 hover:border-primary/40 rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline text-foreground">Carrito</span>
                {itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </button>

              {/* Currency */}
              <button
                onClick={() => setShowUsd(!showUsd)}
                className={cn(
                  'flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors flex-shrink-0',
                  showUsd
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400'
                    : 'bg-muted/60 border-border/60 text-muted-foreground hover:border-primary/40'
                )}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{showUsd ? 'USD' : 'PEN'}</span>
              </button>
            </div>

            {subtotal > 0 && (
              <div className="mt-2">
                <FreeShippingBar subtotal={subtotal} threshold={freeShipThreshold} />
              </div>
            )}
          </div>
        </div>

        {/* ── CATEGORY PILLS (sticky) ── */}
        <div className="sticky top-16 z-30 bg-card/98 backdrop-blur-md border-b border-border/60 shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-6">
            <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setCatFilter('')}
                className={cn(
                  'flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all',
                  !catFilter ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/70 hover:text-foreground hover:bg-muted/80'
                )}
              >
                Todo
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCatFilter(catFilter === cat.id ? '' : cat.id)}
                  className={cn(
                    'flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all',
                    catFilter === cat.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/70 hover:text-foreground hover:bg-muted/80'
                  )}
                >
                  {cat.image_url && <img src={cat.image_url} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />}
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">

          {/* ── FEATURED ── */}
          {showHomeSections && !loading && featured.length > 0 && (
            <section>
              <SectionHeader
                icon={<Sparkles className="w-4 h-4 text-amber-500" />}
                title="Destacados"
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                {featured.map(p => (
                  <ProductCard
                    key={p.id} product={p}
                    isWishlisted={wishlist.has(p.id)}
                    onWishlistToggle={handleWishlist}
                    onCompareToggle={toggleCompare}
                    isComparing={compareIds.has(p.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── BESTSELLERS ── */}
          {showHomeSections && !loading && bestsellers.length > 0 && (
            <section>
              <SectionHeader
                icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
                title="Más vendidos"
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                {bestsellers.map(p => (
                  <ProductCard
                    key={p.id} product={p}
                    isWishlisted={wishlist.has(p.id)}
                    onWishlistToggle={handleWishlist}
                    onCompareToggle={toggleCompare}
                    isComparing={compareIds.has(p.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── CATALOG ── */}
          <section>
            {showHomeSections && (
              <SectionHeader
                icon={<Package className="w-4 h-4 text-muted-foreground" />}
                title={activeCat ? activeCat.name : 'Todos los productos'}
              />
            )}

            {/* Toolbar */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div className="relative flex-shrink-0">
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 bg-muted/60 border border-border/60 rounded-xl text-xs font-semibold text-foreground outline-none focus:border-primary/60 transition-colors cursor-pointer"
                >
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              </div>

              <button
                onClick={() => setShowFilters(v => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors flex-shrink-0',
                  showFilters || hasActiveFilters
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-muted/60 text-foreground/70 border-border/60 hover:border-primary/40'
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filtros
                {hasActiveFilters && <span className="w-1.5 h-1.5 bg-primary rounded-full" />}
              </button>

              {catFilter && activeCat && (
                <button onClick={() => setCatFilter('')} className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                  {activeCat.name} <X className="w-3 h-3" />
                </button>
              )}
              {search && (
                <button onClick={() => setSearch('')} className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                  "{search}" <X className="w-3 h-3" />
                </button>
              )}

              <span className="ml-auto text-xs text-muted-foreground">
                {loading ? '...' : `${filtered.length} productos`}
              </span>
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div className="bg-muted/40 border border-border/60 rounded-xl p-3 mb-3 flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs font-bold text-foreground/70 mb-1">Precio mín. (S/)</label>
                  <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="0"
                    className="w-full px-3 py-2 bg-card border border-border/60 rounded-xl text-sm outline-none focus:border-primary/60 transition-colors" />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs font-bold text-foreground/70 mb-1">Precio máx. (S/)</label>
                  <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="Sin límite"
                    className="w-full px-3 py-2 bg-card border border-border/60 rounded-xl text-sm outline-none focus:border-primary/60 transition-colors" />
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={() => { setPriceMin(''); setPriceMax(''); setSearch(''); setCatFilter(''); setShowFilters(false); }}
                    className="text-red-500 text-xs font-bold py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors"
                  >
                    Limpiar todo
                  </button>
                )}
              </div>
            )}

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                {Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <h3 className="text-base font-bold text-foreground">Sin resultados</h3>
                <p className="text-muted-foreground text-sm mt-1 mb-5">Intenta con otros filtros o búsqueda</p>
                <button
                  onClick={() => { setSearch(''); setCatFilter(''); setPriceMin(''); setPriceMax(''); }}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm transition-all active:scale-95"
                >
                  Ver todo
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                  {paginated.map(p => (
                    <ProductCard
                      key={p.id} product={p}
                      isWishlisted={wishlist.has(p.id)}
                      onWishlistToggle={handleWishlist}
                      onCompareToggle={toggleCompare}
                      isComparing={compareIds.has(p.id)}
                    />
                  ))}
                </div>
                {hasMore && (
                  <div className="text-center mt-8">
                    <button
                      onClick={() => setPage(p => p + 1)}
                      className="inline-flex items-center gap-2 px-8 py-3 border-2 border-border hover:border-primary text-foreground hover:text-primary rounded-xl font-bold text-sm transition-all"
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
      </main>

      <CompareBar
        products={compareList}
        onRemove={id => setCompareList(prev => prev.filter(p => p.id !== id))}
        onClear={() => setCompareList([])}
      />

      <Footer />
    </div>
  );
}
