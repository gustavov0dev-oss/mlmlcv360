import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '@/lib/backend';
import { useAuthStore } from '@/store/authStore';
import { useCart } from '@/store/cartStore';
import { useNavigate } from '@/lib/router';
import { cn } from '@/lib/utils';
import type { Order, Product } from '@/lib/storeTypes';
import {
  Package, ChevronRight, ShoppingBag, Search, Heart, Scale, ShoppingCart,
  Trash2, Star, X,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  pending:    { label: 'Pendiente',   dot: 'bg-yellow-500',  text: 'text-yellow-700 dark:text-yellow-400',  bg: 'bg-yellow-500/10' },
  confirmed:  { label: 'Confirmado',  dot: 'bg-blue-500',    text: 'text-blue-700 dark:text-blue-400',      bg: 'bg-blue-500/10' },
  processing: { label: 'En proceso',  dot: 'bg-purple-500',  text: 'text-purple-700 dark:text-purple-400',  bg: 'bg-purple-500/10' },
  shipped:    { label: 'Enviado',     dot: 'bg-cyan-500',    text: 'text-cyan-700 dark:text-cyan-400',      bg: 'bg-cyan-500/10' },
  delivered:  { label: 'Entregado',   dot: 'bg-green-500',   text: 'text-green-700 dark:text-green-400',    bg: 'bg-green-500/10' },
  cancelled:  { label: 'Cancelado',   dot: 'bg-red-500',     text: 'text-red-700 dark:text-red-400',        bg: 'bg-red-500/10' },
  refunded:   { label: 'Reembolsado', dot: 'bg-orange-500',  text: 'text-orange-700 dark:text-orange-400',  bg: 'bg-orange-500/10' },
};

function fmt(n: number, c = 'PEN') { return c === 'USD' ? `$${n.toFixed(2)}` : `S/ ${n.toFixed(2)}`; }

type Tab = 'pedidos' | 'favoritos' | 'comparar';

export default function PedidosPage({ initialTab = 'pedidos' }: { initialTab?: Tab }) {
  const database = useDatabase();
  const { user } = useAuthStore();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState('');

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [loadingWishlist, setLoadingWishlist] = useState(true);

  const [compareItems, setCompareItems] = useState<Product[]>([]);
  const [loadingCompare, setLoadingCompare] = useState(true);

  const loadOrders = useCallback(async () => {
    if (!user) { navigate('/login'); return; }
    setLoadingOrders(true);
    const { data } = await database.select<Order>('orders', {
      select: '*, items:order_items(*)',
      filter: { user_id: user.id },
      order: { column: 'created_at', ascending: false },
    });
    const ordersData = (data as Order[]) || [];

    const productIds = Array.from(new Set(
      ordersData.flatMap(o => (o.items || []).map((i: any) => i.product_id).filter(Boolean))
    )) as string[];
    let productsById: Record<string, any> = {};
    if (productIds.length > 0) {
      const { data: prods } = await database.select('products', {
        select: 'id, name, slug, images',
        filter: [{ column: 'id', operator: 'in', value: productIds }],
      });
      ((prods as any[]) || []).forEach((p: any) => { productsById[p.id] = p; });
    }
    const enriched = ordersData.map(o => ({
      ...o,
      items: (o.items || []).map((it: any) => ({
        ...it,
        image_url: (it.product_id && productsById[it.product_id]?.images?.[0]?.url) || it.image_url || '',
      })),
    }));

    setOrders(enriched);
    setLoadingOrders(false);
  }, [user, navigate, database]);

  const loadWishlist = useCallback(async () => {
    if (!user) return;
    setLoadingWishlist(true);
    const { data } = await database.select('wishlists', {
      select: 'product_id, product:products(*, category:product_categories(id,name), variants:product_variants(*))',
      filter: { user_id: user.id },
    });
    if (data) setWishlist(((data as any[]) || []).map((w: any) => w.product).filter(Boolean));
    setLoadingWishlist(false);
  }, [user, database]);

  const loadCompare = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const ids = params.get('ids')?.split(',').filter(Boolean) || [];
    if (ids.length < 2) { setCompareItems([]); setLoadingCompare(false); return; }
    setLoadingCompare(true);
    const { data } = await database.select<Product>('products', {
      select: '*, category:product_categories(id,name), variants:product_variants(*)',
      filter: [{ column: 'id', operator: 'in', value: ids }],
    });
    setCompareItems((data as Product[]) || []);
    setLoadingCompare(false);
  }, [database]);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => { if (tab === 'favoritos') loadWishlist(); }, [tab, loadWishlist]);
  useEffect(() => { if (tab === 'comparar') loadCompare(); }, [tab, loadCompare]);

  const removeFromWishlist = async (productId: string) => {
    if (!user) return;
    await database.deleteWhere('wishlists', { user_id: user.id, product_id: productId });
    setWishlist(prev => prev.filter(p => p.id !== productId));
  };

  const removeFromCompare = (productId: string) => {
    const params = new URLSearchParams(window.location.search);
    const ids = (params.get('ids')?.split(',').filter(Boolean) || []).filter(id => id !== productId);
    const newUrl = ids.length > 0 ? `/tienda/comparar?ids=${ids.join(',')}` : '/tienda/comparar';
    window.history.replaceState({}, '', newUrl);
    setCompareItems(prev => prev.filter(p => p.id !== productId));
  };

  const filteredOrders = orders.filter(o => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (o.order_number || '').toLowerCase().includes(q) || (o.status || '').toLowerCase().includes(q);
  });

  const allSpecKeys = [...new Set(compareItems.flatMap(p => Object.keys((p as any).specs || {})))];
  const lowestPrice = compareItems.length > 1 ? Math.min(...compareItems.map(p => p.base_price)) : null;

  const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: 'pedidos',   label: 'Mis Pedidos', icon: Package, count: orders.length       },
    { id: 'favoritos', label: 'Favoritos',   icon: Heart,   count: wishlist.length      },
    { id: 'comparar',  label: 'Comparar',    icon: Scale,   count: compareItems.length  },
  ];

  return (
    <>
      <div className="flex-1 pt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 mb-6 text-xs text-muted-foreground">
            <button onClick={() => navigate('/')} className="hover:text-foreground transition-colors">Inicio</button>
            <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
            <span className="text-foreground font-medium">Mi Cuenta</span>
          </nav>

          {/* Tabs — minimal underline style */}
          <div className="flex items-center gap-1 border-b border-border mb-10 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setQuery(''); }}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative outline-none',
                  tab === t.id
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground/80',
                )}
              >
                <t.icon className="w-4 h-4" />
                <span>{t.label}</span>
                {t.count !== undefined && t.count > 0 && (
                  <span className={cn(
                    'text-[10px] font-semibold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center transition-colors',
                    tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}>{t.count}</span>
                )}
                {tab === t.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>

          {/* ── PEDIDOS ─────────────────────────────────── */}
          {tab === 'pedidos' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-semibold text-foreground tracking-tight">Mis Pedidos</h1>
                  <p className="text-muted-foreground text-sm mt-0.5">
                    {orders.length} pedido{orders.length !== 1 ? 's' : ''} en total
                  </p>
                </div>
                {orders.length > 0 && (
                  <div className="relative sm:w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Buscar pedidos..."
                      className="w-full pl-9 pr-4 py-2 bg-transparent border border-border rounded-md text-sm text-foreground outline-none focus:border-foreground/30 transition-colors"
                    />
                  </div>
                )}
              </div>

              {loadingOrders ? (
                <div className="divide-y divide-border">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="py-5 flex items-center gap-4">
                      <Skeleton className="w-12 h-12 rounded-md flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-16" /></div>
                        <Skeleton className="h-3 w-40" />
                      </div>
                      <Skeleton className="w-4 h-4 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">{orders.length === 0 ? 'No tienes pedidos aún' : 'Sin resultados'}</p>
                  <p className="text-xs text-muted-foreground">{orders.length === 0 ? 'Explora la tienda y realiza tu primera compra' : 'Prueba con otra búsqueda'}</p>
                  {orders.length === 0 && (
                    <button onClick={() => navigate('/tienda')}
                      className="mt-2 text-sm font-medium text-foreground hover:text-primary transition-colors underline underline-offset-4">
                      Ir a la tienda
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredOrders.map(order => {
                    const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                    const img = order.items?.[0]?.image_url;
                    const itemCount = order.items?.length || 0;
                    return (
                      <button
                        key={order.id}
                        onClick={() => navigate(`/dashboard/pedidos/${order.id}`)}
                        className="w-full py-4 flex items-center gap-4 text-left group outline-none"
                      >
                        <div className="w-12 h-12 rounded-md bg-muted overflow-hidden flex-shrink-0 ring-1 ring-border/50">
                          {img
                            ? <img src={img} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground/40" /></div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{order.order_number}</span>
                            <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full', sc.bg, sc.text)}>
                              <span className={cn('w-1.5 h-1.5 rounded-full', sc.dot)} />
                              {sc.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(order.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {' · '}{itemCount} producto{itemCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-foreground whitespace-nowrap">{fmt(order.total, order.currency)}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-colors flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── FAVORITOS ───────────────────────────────── */}
          {tab === 'favoritos' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-semibold text-foreground tracking-tight">Favoritos</h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                  {wishlist.length} producto{wishlist.length !== 1 ? 's' : ''} guardado{wishlist.length !== 1 ? 's' : ''}
                </p>
              </div>

              {loadingWishlist ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="aspect-square w-full rounded-md" />
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : wishlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No tienes favoritos</p>
                  <p className="text-xs text-muted-foreground">Guarda productos que te gusten para verlos aquí</p>
                  <button onClick={() => navigate('/tienda')}
                    className="mt-2 text-sm font-medium text-foreground hover:text-primary transition-colors underline underline-offset-4">
                    Explorar tienda
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                  {wishlist.map(p => {
                    const img = p.images?.[0]?.url;
                    return (
                      <div key={p.id} className="group">
                        <div className="relative aspect-square bg-muted rounded-md overflow-hidden cursor-pointer ring-1 ring-border/50" onClick={() => navigate(`/tienda/${p.slug}`)}>
                          {img
                            ? <img src={img} alt={p.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-muted-foreground/20" /></div>
                          }
                          <button
                            onClick={e => { e.stopPropagation(); removeFromWishlist(p.id); }}
                            className="absolute top-2 right-2 w-7 h-7 rounded-md bg-background/90 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 outline-none">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="mt-2.5 space-y-0.5">
                          {(p.category as any)?.name && (
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{(p.category as any).name}</p>
                          )}
                          <p className="text-sm font-medium text-foreground line-clamp-1 cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/tienda/${p.slug}`)}>{p.name}</p>
                          {(p.avg_rating ?? 0) > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span className="text-[11px] text-muted-foreground">{(p.avg_rating ?? 0).toFixed(1)} ({p.review_count})</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-sm font-semibold text-foreground">{fmt(p.base_price, p.currency)}</span>
                            <button onClick={() => { addItem(p as any); navigate('/carrito'); }}
                              className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors outline-none">
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── COMPARAR ────────────────────────────────── */}
          {tab === 'comparar' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-semibold text-foreground tracking-tight">Comparar Productos</h1>
                <p className="text-muted-foreground text-sm mt-0.5">{compareItems.length} productos en comparación</p>
              </div>

              {loadingCompare ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)}
                </div>
              ) : compareItems.length < 2 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                    <Scale className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Nada para comparar</p>
                  <p className="text-xs text-muted-foreground">Agrega al menos 2 productos desde la tienda para compararlos</p>
                  <button onClick={() => navigate('/tienda')}
                    className="mt-2 text-sm font-medium text-foreground hover:text-primary transition-colors underline underline-offset-4">
                    Ir a la tienda
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full border-collapse text-sm min-w-[600px]">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 bg-background text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wide w-28"></th>
                        {compareItems.map(p => {
                          const img = p.images?.[0]?.url;
                          return (
                            <th key={p.id} className="p-3 text-left min-w-[180px] align-top">
                              <div className="relative">
                                <button onClick={() => removeFromCompare(p.id)}
                                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-muted hover:bg-red-500 hover:text-white text-muted-foreground flex items-center justify-center transition-colors z-10 outline-none">
                                  <X className="w-3 h-3" />
                                </button>
                                <div className="w-16 h-16 rounded-md bg-muted overflow-hidden mb-2 cursor-pointer ring-1 ring-border/50" onClick={() => navigate(`/tienda/${p.slug}`)}>
                                  {img ? <img src={img} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-muted-foreground/20" /></div>}
                                </div>
                                <button onClick={() => navigate(`/tienda/${p.slug}`)} className="text-sm font-medium text-foreground hover:text-primary line-clamp-2 transition-colors text-left outline-none">{p.name}</button>
                                <p className={cn('text-sm font-semibold mt-1', p.base_price === lowestPrice ? 'text-primary' : 'text-foreground')}>
                                  {fmt(p.base_price, p.currency)}
                                  {p.base_price === lowestPrice && (
                                    <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary align-middle">Mejor precio</span>
                                  )}
                                </p>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-border">
                        <td className="sticky left-0 z-10 bg-background p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Categoría</td>
                        {compareItems.map(p => <td key={p.id} className="p-3 text-foreground/80">{(p.category as any)?.name || '—'}</td>)}
                      </tr>
                      <tr className="border-t border-border">
                        <td className="sticky left-0 z-10 bg-background p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Precio</td>
                        {compareItems.map(p => (
                          <td key={p.id} className={cn('p-3 font-semibold', p.base_price === lowestPrice ? 'text-primary' : 'text-foreground')}>
                            {fmt(p.base_price, p.currency)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-t border-border">
                        <td className="sticky left-0 z-10 bg-background p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Stock</td>
                        {compareItems.map(p => {
                          const stock = (p.variants || []).reduce((s: number, v: any) => s + (v.stock || 0), 0) || p.general_stock || 0;
                          return (
                            <td key={p.id} className={cn('p-3 font-medium', stock === 0 ? 'text-red-500' : stock <= 5 ? 'text-orange-500' : 'text-green-600')}>
                              {stock === 0 ? 'Sin stock' : stock}
                            </td>
                          );
                        })}
                      </tr>
                      <tr className="border-t border-border">
                        <td className="sticky left-0 z-10 bg-background p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Rating</td>
                        {compareItems.map(p => (
                          <td key={p.id} className="p-3">
                            {(p.avg_rating ?? 0) > 0 ? (
                              <div className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                <span className="font-medium">{(p.avg_rating ?? 0).toFixed(1)}</span>
                                <span className="text-xs text-muted-foreground">({p.review_count})</span>
                              </div>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                        ))}
                      </tr>
                      {allSpecKeys.map(key => (
                        <tr key={key} className="border-t border-border">
                          <td className="sticky left-0 z-10 bg-background p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide capitalize">{key}</td>
                          {compareItems.map(p => <td key={p.id} className="p-3 text-foreground/80">{(p as any).specs?.[key] || '—'}</td>)}
                        </tr>
                      ))}
                      <tr className="border-t border-border">
                        <td className="sticky left-0 z-10 bg-background p-3"></td>
                        {compareItems.map(p => (
                          <td key={p.id} className="p-3">
                            <button onClick={() => { addItem(p as any); navigate('/carrito'); }}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors outline-none">
                              <ShoppingCart className="w-3.5 h-3.5" /> Agregar
                            </button>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}