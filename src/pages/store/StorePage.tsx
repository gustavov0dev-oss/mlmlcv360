import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDatabase } from '@/lib/backend';
import { useCart } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useConfig } from '@/store/configStore';
import { useNavigate } from '@/lib/router';
import { Search, X, ShoppingCart, Package, SlidersHorizontal, Sparkles, TrendingUp, Clock, ArrowUpDown, Star, ChevronDown, LayoutGrid, DollarSign } from 'lucide-react';
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

function Skeleton() {
  return (
    <div className="bg-card rounded-xl overflow-hidden border border-border">
      <div className="aspect-square bg-muted animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-2.5 bg-muted rounded animate-pulse w-1/3" />
        <div className="h-4 bg-muted rounded animate-pulse" />
        <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
        <div className="h-6 bg-muted rounded animate-pulse w-1/2 mt-2" />
      </div>
    </div>
  );
}

function CompareBar({ products, onRemove, onClear }: {
  products: Product[]; onRemove: (id: string) => void; onClear: () => void;
}) {
  const navigate = useNavigate();
  if (products.length === 0) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm">
      <div className="bg-card border-2 border-primary rounded-xl shadow-2xl p-3 flex items-center gap-3">
        <div className="flex gap-2 flex-1 overflow-x-auto">
          {products.map(p => (
            <div key={p.id} className="relative flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-border">
              {p.images?.[0]?.url
                ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                : <Package className="w-full h-full p-2 text-muted-foreground/30" />}
              <button onClick={() => onRemove(p.id)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">×</button>
            </div>
          ))}
          {Array.from({ length: Math.max(0, 3 - products.length) }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-12 h-12 rounded-xl border-2 border-dashed border-border/40 flex items-center justify-center text-xl text-muted-foreground/30">+</div>
          ))}
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {products.length >= 2 && (
            <button onClick={() => navigate(`/tienda/comparar?ids=${products.map(p => p.id).join(',')}`)}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold">
              Comparar
            </button>
          )}
          <button onClick={onClear} className="p-2 border border-border rounded-xl hover:bg-muted">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniProductRow({ products, onCompare, compareIds, wishlist, onWishlist }: {
  products: Product[];
  onCompare?: (p: Product) => void;
  compareIds: Set<string>;
  wishlist: Set<string>;
  onWishlist: (id: string, v: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {products.map(p => (
        <ProductCard
          key={p.id} product={p}
          isWishlisted={wishlist.has(p.id)}
          onWishlistToggle={(id, w) => onWishlist(id, w)}
          onCompareToggle={onCompare}
          isComparing={compareIds.has(p.id)}
        />
      ))}
    </div>
  );
}

export default function StorePage() {
  const database = useDatabase();
  const { company, exchangeRate, showUsd, setShowUsd } = useConfig();
  const { user } = useAuthStore();
  const { itemCount, subtotal } = useCart();
  const navigate = useNavigate();

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
    setProducts(((prods || []) as Product[]));
    setCategories((cats || []) as ProductCategory[]);
    if (user) {
      const { data: wl } = await database.select('wishlists', { select: 'product_id', filter: { user_id: user.id } });
      if (wl) setWishlist(new Set((wl as any[]).map((w: any) => w.product_id)));
    }
    // Bestsellers last 30 days
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: orderItems } = await database.select<any>('order_items', { select: 'product_id, quantity', filter: [{ column: 'created_at', operator: 'gte', value: since }] });
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

      <main className="pt-16">
        {/* ── HERO HEADER ── */}
        <div className="bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <LayoutGrid className="w-5 h-5 opacity-70" />
                  <span className="text-sm font-semibold opacity-80">Catálogo</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold">{storeName}</h1>
                <p className="text-primary-foreground/70 text-sm mt-1">
                  {loading ? 'Cargando productos...' : `${filtered.length} productos disponibles${activeCat ? ` · ${activeCat.name}` : ''}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar productos..."
                    className="w-full pl-9 pr-4 py-2.5 bg-background/95 text-foreground rounded-xl text-sm outline-none" />
                  {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
                </div>
                <button onClick={() => navigate('/carrito')}
                  className="relative flex items-center gap-1.5 px-4 py-2.5 bg-background/15 hover:bg-background/25 backdrop-blur rounded-xl font-bold text-sm transition-colors flex-shrink-0">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline">{itemCount > 0 ? `(${itemCount})` : 'Carrito'}</span>
                  {itemCount > 0 && <span className="sm:hidden absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{itemCount > 9 ? '9+' : itemCount}</span>}
                </button>
                {/* Currency toggle */}
                <button onClick={() => setShowUsd(!showUsd)}
                  className={cn('flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-sm transition-colors flex-shrink-0',
                    showUsd ? 'bg-green-500 text-white' : 'bg-background/15 hover:bg-background/25 backdrop-blur text-primary-foreground')}>
                  <DollarSign className="w-4 h-4" />
                  <span className="hidden sm:inline">{showUsd ? `USD (S/${exchangeRate.toFixed(2)})` : 'USD'}</span>
                </button>
              </div>
            </div>
            {subtotal > 0 && (
              <div className="mt-4 max-w-xs">
                <FreeShippingBar subtotal={subtotal} threshold={freeShipThreshold} />
              </div>
            )}
          </div>
        </div>

        {/* ── CATEGORY BAR (sticky) ── */}
        <div className="sticky top-16 z-30 bg-card/95 backdrop-blur border-b border-border shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-1.5 py-2 overflow-x-auto scrollbar-hide">
              <button onClick={() => setCatFilter('')}
                className={cn('flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap',
                  !catFilter ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground hover:bg-muted')}>
                Todo
              </button>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setCatFilter(catFilter === cat.id ? '' : cat.id)}
                  className={cn('flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap',
                    catFilter === cat.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground hover:bg-muted')}>
                  {cat.image_url && <img src={cat.image_url} alt="" className="w-4 h-4 rounded-full object-cover" />}
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── FEATURED ── */}
        {showHomeSections && featured.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h2 className="text-base font-bold text-foreground uppercase tracking-wide">Productos destacados</h2>
            </div>
            <MiniProductRow products={featured.slice(0, 8)} onCompare={toggleCompare} compareIds={compareIds} wishlist={wishlist} onWishlist={handleWishlist} />
          </div>
        )}

        {/* ── BESTSELLERS (last 30 days) ── */}
        {showHomeSections && bestsellers.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <h2 className="text-base font-bold text-foreground uppercase tracking-wide">Más vendidos este mes</h2>
            </div>
            <MiniProductRow products={bestsellers} onCompare={toggleCompare} compareIds={compareIds} wishlist={wishlist} onWishlist={handleWishlist} />
          </div>
        )}

        {/* ── MAIN CATALOG ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
          {showHomeSections && (
            <div className="flex items-center gap-2 mb-4">
              <LayoutGrid className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-base font-bold text-foreground uppercase tracking-wide">Todos los productos</h2>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2 bg-card border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary min-w-0">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <button onClick={() => setShowFilters(v => !v)}
              className={cn('flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors flex-shrink-0',
                showFilters || hasActiveFilters ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:border-primary/40')}>
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
              {hasActiveFilters && <span className="w-2 h-2 bg-current rounded-full" />}
            </button>

            {catFilter && activeCat && (
              <button onClick={() => setCatFilter('')}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                {activeCat.name} <X className="w-3 h-3 ml-0.5" />
              </button>
            )}
            {search && (
              <button onClick={() => setSearch('')}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                "{search}" <X className="w-3 h-3 ml-0.5" />
              </button>
            )}
            <span className="ml-auto text-xs text-muted-foreground hidden sm:block">{filtered.length} productos</span>
          </div>

          {showFilters && (
            <div className="bg-card border border-border rounded-xl p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Precio mín. (S/)</label>
                <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="0"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Precio máx. (S/)</label>
                <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="Sin límite"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
              </div>
              {hasActiveFilters && (
                <div className="col-span-2 flex items-end">
                  <button onClick={() => { setPriceMin(''); setPriceMax(''); setSearch(''); setCatFilter(''); setShowFilters(false); }}
                    className="text-red-500 text-sm font-semibold hover:underline">
                    Limpiar filtros
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="sm:hidden text-xs text-muted-foreground mb-3">{filtered.length} resultados</div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/15" />
              <h3 className="text-lg font-bold text-foreground">Sin resultados</h3>
              <p className="text-muted-foreground text-sm mt-1 mb-4">Intenta con otros filtros o búsquedas</p>
              <button onClick={() => { setSearch(''); setCatFilter(''); setPriceMin(''); setPriceMax(''); }}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm">
                Ver todo
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
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
                  <button onClick={() => setPage(p => p + 1)}
                    className="inline-flex items-center gap-2 px-8 py-3 border-2 border-primary text-primary rounded-xl font-bold text-sm hover:bg-primary hover:text-primary-foreground transition-colors">
                    <ChevronDown className="w-4 h-4" />
                    Cargar más ({filtered.length - paginated.length} restantes)
                  </button>
                </div>
              )}
            </>
          )}
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
