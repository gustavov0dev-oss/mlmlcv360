import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDatabase } from '@/lib/backend';
import { useAuthStore } from '@/store/authStore';
import { useConfig } from '@/store/configStore';
import { useNavigate } from '@/lib/router';
import {
  Search, X, Package, SlidersHorizontal,
  Sparkles, TrendingUp, ChevronDown, Truck, ShieldCheck,
  AlertTriangle, RefreshCw, Gift,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product, ProductCategory } from '@/lib/storeTypes';
import { toast } from 'sonner';
import ProductCard from '@/components/store/ProductCard';

const PAGE_MAX_W = 'max-w-[1100px]';

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

function CarouselSkeleton() {
  return (
    <div className="flex gap-4 sm:gap-5 overflow-hidden -mx-4 px-4 sm:mx-0 sm:px-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="shrink-0 w-[150px] sm:w-[190px]">
          <ProductRowSkeleton />
        </div>
      ))}
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
                  ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                  : <Package className="w-full h-full p-2 text-muted-foreground/30" />}
              </div>
              <button
                onClick={() => onRemove(p.id)}
                aria-label={`Quitar ${p.name} de comparar`}
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
          <button onClick={onClear} aria-label="Limpiar comparación" className="p-2 border border-border rounded-xl hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SortDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = SORT_OPTIONS.find(o => o.value === value) ?? SORT_OPTIONS[0];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 pl-3.5 pr-3 py-2 bg-transparent border border-border/50 rounded-full text-xs font-medium text-foreground outline-none focus:border-primary transition-colors"
      >
        {current.label}
        <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div role="listbox" className="absolute right-0 sm:left-0 top-full mt-1.5 z-40 min-w-[180px] bg-card border border-border rounded-xl shadow-xl py-1.5">
          {SORT_OPTIONS.map(o => (
            <button
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={cn(
                'w-full text-left px-3.5 py-2 text-xs font-medium transition-colors',
                o.value === value ? 'text-primary bg-primary/10' : 'text-foreground/80 hover:bg-muted'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StorePage() {
  const database = useDatabase();
  const { company, showUsd, setShowUsd, currencySymbol } = useConfig();
  const { user } = useAuthStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const initialParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [search, setSearch] = useState(initialParams.get('q') || '');
  const [searchFocused, setSearchFocused] = useState(false);
  const [catFilter, setCatFilter] = useState(initialParams.get('cat') || '');
  const [sort, setSort] = useState(initialParams.get('sort') || 'relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState(initialParams.get('min') || '');
  const [priceMax, setPriceMax] = useState(initialParams.get('max') || '');
  const [page, setPage] = useState(1);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const freeShipThreshold = parseFloat(company.free_shipping_threshold || '150');
  const PER_PAGE = 24;
  const catalogRef = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
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
    } catch (err) {
      console.error('Error cargando la tienda:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [catFilter, search, sort, priceMin, priceMax]);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [catFilter]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setSearchFocused(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (catFilter) params.set('cat', catFilter);
    if (search) params.set('q', search);
    if (sort !== 'relevance') params.set('sort', sort);
    if (priceMin) params.set('min', priceMin);
    if (priceMax) params.set('max', priceMax);
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', url);
  }, [catFilter, search, sort, priceMin, priceMax]);

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

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of products) if (p.category_id) map[p.category_id] = (map[p.category_id] || 0) + 1;
    return map;
  }, [products]);

  const searchSuggestions = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [products, search]);

  const categoryScoped = useMemo(
    () => (catFilter ? products.filter(p => p.category_id === catFilter) : products),
    [products, catFilter]
  );
  const featured = categoryScoped.filter(p => p.featured).slice(0, 8);
  const bestsellersScoped = catFilter ? bestsellers.filter(p => p.category_id === catFilter) : bestsellers;

  const paginated = filtered.slice(0, page * PER_PAGE);
  const hasMore = paginated.length < filtered.length;
  const hasActiveFilters = !!(priceMin || priceMax || search);
  const activeCat = categories.find(c => c.id === catFilter);
  const showPromoRails = !search.trim();
  const compareIds = new Set(compareList.map(p => p.id));
  const priceRangeInvalid = !!(priceMin && priceMax && parseFloat(priceMin) > parseFloat(priceMax));

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
  const clearAllFilters = () => { setPriceMin(''); setPriceMax(''); setSearch(''); setCatFilter(''); setShowFilters(false); };
  const selectSuggestion = (name: string) => { setSearch(name); setSearchFocused(false); };

  const categoryRail = (
    <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex items-center gap-4 overflow-x-auto touch-pan-x snap-x snap-proximity scroll-smooth scrollbar-hide pb-1">
        <button onClick={() => setCatFilter('')} className="flex flex-col items-center gap-1.5 shrink-0 w-16 snap-start">
          <div className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all',
            !catFilter ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'border-border/40 bg-muted/30'
          )}>
            <Package className={cn('w-6 h-6', !catFilter ? 'text-primary' : 'text-muted-foreground/50')} />
          </div>
          <span className={cn('text-[11px] font-semibold text-center', !catFilter ? 'text-primary' : 'text-foreground/70')}>Todo</span>
        </button>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setCatFilter(catFilter === cat.id ? '' : cat.id)} className="flex flex-col items-center gap-1.5 shrink-0 w-16 snap-start">
            <div className={cn(
              'w-14 h-14 rounded-full overflow-hidden flex items-center justify-center border-2 transition-all',
              catFilter === cat.id ? 'border-primary ring-2 ring-primary/20' : 'border-border/40 bg-muted/30'
            )}>
              {cat.image_url
                ? <img src={cat.image_url} alt={cat.name} loading="lazy" className="w-full h-full object-cover" />
                : <Package className="w-6 h-6 text-muted-foreground/40" />}
            </div>
            <span className={cn('text-[11px] font-semibold text-center leading-tight line-clamp-2', catFilter === cat.id ? 'text-primary' : 'text-foreground/70')}>
              {cat.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  const categoryList = (
    <div className="space-y-0.5">
      <button
        onClick={() => setCatFilter('')}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
          !catFilter ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground/70 hover:bg-muted hover:text-foreground'
        )}
      >
        <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Package className="w-3.5 h-3.5 text-muted-foreground/60" />
        </span>
        <span className="flex-1 text-left">Todo</span>
        <span className="text-xs text-muted-foreground/60">{products.length}</span>
      </button>
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => setCatFilter(catFilter === cat.id ? '' : cat.id)}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
            catFilter === cat.id ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground/70 hover:bg-muted hover:text-foreground'
          )}
        >
          <span className="w-6 h-6 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
            {cat.image_url
              ? <img src={cat.image_url} alt="" loading="lazy" className="w-full h-full object-cover" />
              : <Package className="w-3.5 h-3.5 text-muted-foreground/60" />}
          </span>
          <span className="flex-1 text-left truncate">{cat.name}</span>
          <span className="text-xs text-muted-foreground/60">{categoryCounts[cat.id] || 0}</span>
        </button>
      ))}
    </div>
  );

  const priceFields = (
    <div className="flex gap-3">
      <div className="flex-1">
        <label className="block text-[11px] font-medium text-muted-foreground/70 mb-1.5">Mín. ({currencySymbol})</label>
        <input type="number" inputMode="decimal" value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="0"
          className="w-full px-3 py-2 bg-muted/30 border border-border/40 rounded-lg text-sm outline-none focus:border-primary transition-colors" />
      </div>
      <div className="flex-1">
        <label className="block text-[11px] font-medium text-muted-foreground/70 mb-1.5">Máx. ({currencySymbol})</label>
        <input type="number" inputMode="decimal" value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="Sin límite"
          className="w-full px-3 py-2 bg-muted/30 border border-border/40 rounded-lg text-sm outline-none focus:border-primary transition-colors" />
      </div>
    </div>
  );

  return (
    <>
      <div className="bg-primary/10 border-b border-primary/10">
        <div className={cn(PAGE_MAX_W, 'mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-5 overflow-x-auto scrollbar-hide text-[11px] sm:text-xs font-semibold text-primary whitespace-nowrap')}>
          <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Envío gratis desde {currencySymbol} {freeShipThreshold.toFixed(0)}</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Pago 100% seguro</span>
          <span className="flex items-center gap-1.5"><Gift className="w-3.5 h-3.5" /> Gana comisiones con cada compra</span>
        </div>
      </div>

      <section className="relative pt-16 sm:pt-20 lg:pt-24 pb-8 border-b border-border/20">
        <div className={cn(PAGE_MAX_W, 'mx-auto px-4 sm:px-6 lg:px-8')}>
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-primary uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" />
                Tienda
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                Compra y genera <span className="text-gradient-animated">comisiones</span>
              </h1>
            </div>
          </div>

          <div className="relative flex items-center gap-2.5 mb-5" ref={searchBoxRef}>
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Buscar productos, marcas y más..."
                aria-label="Buscar productos"
                className="w-full pl-11 pr-10 py-3.5 bg-muted/40 text-foreground border border-transparent rounded-xl text-sm font-medium placeholder:text-muted-foreground/70 outline-none focus:border-primary focus:bg-card transition-all shadow-sm"
              />
              {search && (
                <button onClick={() => setSearch('')} aria-label="Borrar búsqueda" className="absolute right-4 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}

              {searchFocused && search.trim() && (
                <div className="absolute left-0 right-0 top-full mt-2 z-40 bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
                  {searchSuggestions.length > 0 ? (
                    searchSuggestions.map(p => (
                      <button
                        key={p.id}
                        onClick={() => selectSuggestion(p.name)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-muted shrink-0">
                          {p.images?.[0]?.url
                            ? <img src={p.images[0].url} alt="" loading="lazy" className="w-full h-full object-cover" />
                            : <Package className="w-full h-full p-2 text-muted-foreground/30" />}
                        </div>
                        <span className="flex-1 min-w-0 truncate text-sm text-foreground">{p.name}</span>
                        <span className="text-xs font-semibold text-muted-foreground shrink-0">{currencySymbol} {p.base_price.toFixed(2)}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-4 text-xs text-muted-foreground text-center">Sin coincidencias para "{search}"</div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowUsd(!showUsd)}
              aria-label={`Cambiar moneda a ${showUsd ? 'soles' : 'dólares'}`}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-3.5 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95',
                showUsd
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'bg-muted/40 text-foreground/70 border border-border/60 hover:bg-muted'
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

          {categoryRail}
        </div>
      </section>

      <div className="flex-1">
        <div className={cn(PAGE_MAX_W, 'mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8')}>

          {loadError && !loading ? (
            <div className="flex flex-col items-center text-center py-14 border border-red-500/20 bg-red-500/5 rounded-2xl">
              <AlertTriangle className="w-8 h-8 text-red-500 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No pudimos cargar la tienda</h3>
              <p className="text-muted-foreground text-xs mt-1 mb-5">Revisa tu conexión e intenta de nuevo</p>
              <button onClick={fetchData} className="inline-flex items-center gap-2 px-6 py-2.5 bg-foreground/90 text-background rounded-xl font-medium text-sm transition-all active:scale-95">
                <RefreshCw className="w-3.5 h-3.5" />
                Reintentar
              </button>
            </div>
          ) : (
            <>
              {showPromoRails && loading && <div className="mb-10"><CarouselSkeleton /></div>}
              {showPromoRails && !loading && featured.length > 0 && (
                <section className="mb-10">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h2 className="text-base font-semibold text-foreground">{activeCat ? `Destacados en ${activeCat.name}` : 'Destacados'}</h2>
                  </div>
                  <div className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
                    {featured.map(p => (
                      <div key={p.id} className="snap-start shrink-0 w-[150px] sm:w-[190px]">
                        <ProductCard product={p} isWishlisted={wishlist.has(p.id)} onWishlistToggle={handleWishlist} onCompareToggle={toggleCompare} isComparing={compareIds.has(p.id)} freeShipThreshold={freeShipThreshold} />
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {showPromoRails && !loading && bestsellersScoped.length > 0 && (
                <section className="mb-10">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <h2 className="text-base font-semibold text-foreground">{activeCat ? `Más vendidos en ${activeCat.name}` : 'Más vendidos'}</h2>
                  </div>
                  <div className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
                    {bestsellersScoped.map((p, i) => (
                      <div key={p.id} className="relative snap-start shrink-0 w-[150px] sm:w-[190px]">
                        {i < 3 && (
                          <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-foreground/90 text-background text-[11px] font-bold flex items-center justify-center">{i + 1}</div>
                        )}
                        <ProductCard product={p} isWishlisted={wishlist.has(p.id)} onWishlistToggle={handleWishlist} onCompareToggle={toggleCompare} isComparing={compareIds.has(p.id)} freeShipThreshold={freeShipThreshold} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div ref={catalogRef} className="scroll-mt-24 flex gap-8 pt-6 border-t border-border/20">

                <aside className="hidden lg:block w-60 shrink-0">
                  <div className="sticky top-24 space-y-6">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70 mb-3">Categorías</h3>
                      {categoryList}
                    </div>
                    <div className="pt-6 border-t border-border/20">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70 mb-3">Precio</h3>
                      {priceFields}
                      {priceRangeInvalid && <p className="text-[11px] text-red-500 mt-2">El mínimo no puede ser mayor al máximo</p>}
                    </div>
                    {hasActiveFilters && (
                      <button onClick={clearAllFilters} className="text-xs text-red-500 font-medium hover:underline">
                        Limpiar todos los filtros
                      </button>
                    )}
                  </div>
                </aside>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-foreground">
                      {activeCat ? activeCat.name : 'Todos los productos'}
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      {loading ? '...' : `${filtered.length} ${filtered.length === 1 ? 'producto' : 'productos'}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-6 flex-wrap">
                    <SortDropdown value={sort} onChange={setSort} />

                    <button
                      onClick={() => setShowFilters(true)}
                      className={cn(
                        'lg:hidden flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium border transition-colors',
                        hasActiveFilters ? 'bg-primary/10 text-primary border-primary/30' : 'border-border/50 text-foreground/60'
                      )}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Filtros
                      {hasActiveFilters && <span className="w-1.5 h-1.5 bg-primary rounded-full" />}
                    </button>

                    {(priceMin || priceMax) && (
                      <button onClick={() => { setPriceMin(''); setPriceMax(''); }} className="flex items-center gap-1 px-3 py-2 bg-primary/10 text-primary rounded-full text-xs font-medium">
                        Precio {priceMin || '0'}–{priceMax || '∞'} <X className="w-3 h-3" />
                      </button>
                    )}
                    {search && (
                      <button onClick={() => setSearch('')} className="flex items-center gap-1 px-3 py-2 bg-primary/10 text-primary rounded-full text-xs font-medium">
                        "{search}" <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {showFilters && (
                    <div className="lg:hidden fixed inset-0 z-50 flex items-end">
                      <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
                      <div className="relative w-full bg-card rounded-t-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto">
                        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-foreground">Filtros</h3>
                          <button onClick={() => setShowFilters(false)} aria-label="Cerrar filtros" className="p-1 rounded-full hover:bg-muted">
                            <X className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70 mb-2">Categorías</h4>
                        <div className="mb-6">{categoryList}</div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70 mb-2">Precio</h4>
                        {priceFields}
                        {priceRangeInvalid && <p className="text-[11px] text-red-500 mt-2">El mínimo no puede ser mayor al máximo</p>}
                        <div className="flex gap-2 mt-6">
                          {hasActiveFilters && (
                            <button onClick={clearAllFilters} className="flex-1 py-3 text-red-500 text-sm font-medium border border-red-500/30 rounded-xl">
                              Limpiar
                            </button>
                          )}
                          <button
                            onClick={() => setShowFilters(false)}
                            disabled={priceRangeInvalid}
                            className="flex-1 py-3 bg-foreground/90 text-background rounded-xl text-sm font-semibold disabled:opacity-40"
                          >
                            Ver {filtered.length} resultados
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
                      {Array.from({ length: 12 }).map((_, i) => <ProductRowSkeleton key={i} />)}
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
                        <Package className="w-7 h-7 text-muted-foreground/30" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">Sin resultados</h3>
                      <p className="text-muted-foreground text-xs mt-1 mb-5">Intenta con otros filtros o búsqueda</p>
                      <button onClick={clearAllFilters} className="px-6 py-2.5 bg-foreground/90 text-background rounded-xl font-medium text-sm transition-all active:scale-95">
                        Ver todo
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
                        {paginated.map(p => (
                          <ProductCard key={p.id} product={p} isWishlisted={wishlist.has(p.id)} onWishlistToggle={handleWishlist} onCompareToggle={toggleCompare} isComparing={compareIds.has(p.id)} freeShipThreshold={freeShipThreshold} />
                        ))}
                      </div>
                      {hasMore && (
                        <div className="text-center mt-10">
                          <button
                            onClick={() => setPage(p => p + 1)}
                            className="inline-flex items-center gap-2 px-8 py-3 border border-border/50 hover:border-foreground/30 text-foreground/80 hover:text-foreground rounded-xl font-medium text-sm transition-all"
                          >
                            <ChevronDown className="w-4 h-4" />
                            Ver más ({filtered.length - paginated.length} productos)
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <CompareBar products={compareList} onRemove={id => setCompareList(prev => prev.filter(p => p.id !== id))} onClear={() => setCompareList([])} />
    </>
  );
}