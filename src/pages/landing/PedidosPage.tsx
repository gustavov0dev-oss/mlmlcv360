import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '@/lib/backend';
import { useAuthStore } from '@/store/authStore';
import { useCart } from '@/store/cartStore';
import { useNavigate } from '@/lib/router';
import { cn } from '@/lib/utils';
import type { Order, Product } from '@/lib/storeTypes';
import {
  Package, ChevronRight, ShoppingBag, Search, Heart, Scale, ShoppingCart,
  Trash2, Star, Grid3x3 as Grid3X3, List,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pendiente',   color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
  confirmed:  { label: 'Confirmado',  color: 'text-blue-600',   bg: 'bg-blue-500/10'  },
  processing: { label: 'En proceso',  color: 'text-purple-600', bg: 'bg-purple-500/10'},
  shipped:    { label: 'Enviado',     color: 'text-cyan-600',   bg: 'bg-cyan-500/10'  },
  delivered:  { label: 'Entregado',   color: 'text-green-600',  bg: 'bg-green-500/10' },
  cancelled:  { label: 'Cancelado',   color: 'text-red-600',    bg: 'bg-red-500/10'   },
  refunded:   { label: 'Reembolsado', color: 'text-orange-600', bg: 'bg-orange-500/10'},
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

    // Enrich items with live product images from products table
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

  const filteredOrders = orders.filter(o => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (o.order_number || '').toLowerCase().includes(q) || (o.status || '').toLowerCase().includes(q);
  });

  const allSpecKeys = [...new Set(compareItems.flatMap(p => Object.keys((p as any).specs || {})))];

  const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: 'pedidos',   label: 'Mis Pedidos', icon: Package, count: orders.length       },
    { id: 'favoritos', label: 'Favoritos',   icon: Heart,   count: wishlist.length      },
    { id: 'comparar',  label: 'Comparar',    icon: Scale,   count: compareItems.length  },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Navbar />

      <div className="flex-1 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6 text-sm">
            <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">Inicio</button>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
            <span className="text-foreground font-medium">Mi Cuenta</span>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <aside className="lg:w-56 flex-shrink-0">
              <div className="bg-card border border-border rounded-2xl p-2 lg:sticky lg:top-24">
                <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
                  {tabs.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setTab(t.id); setQuery(''); }}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 lg:w-full',
                        tab === t.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-muted',
                      )}
                    >
                      <t.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 text-left">{t.label}</span>
                      {t.count !== undefined && t.count > 0 && (
                        <span className={cn(
                          'text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                          tab === t.id ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground',
                        )}>{t.count}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Content */}
            <div className="flex-1 min-w-0">

              {/* ── PEDIDOS ─────────────────────────────────── */}
              {tab === 'pedidos' && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h1 className="text-2xl font-black text-foreground">Mis Pedidos</h1>
                      <p className="text-muted-foreground text-sm mt-0.5">
                        {orders.length} pedido{orders.length !== 1 ? 's' : ''} en total
                      </p>
                    </div>
                    <div className="relative sm:w-60">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Buscar pedidos..."
                        className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  {loadingOrders ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
                          <Skeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-5 w-16 rounded-full" /></div>
                            <Skeleton className="h-3 w-40" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                          <Skeleton className="w-4 h-4 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  ) : filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 bg-card border border-border rounded-2xl">
                      <ShoppingBag className="w-12 h-12 text-muted-foreground/30" />
                      <div className="text-center">
                        <p className="font-semibold text-foreground">{orders.length === 0 ? 'No tienes pedidos aún' : 'Sin resultados'}</p>
                        <p className="text-sm text-muted-foreground mt-1">{orders.length === 0 ? 'Explora la tienda y realiza tu primera compra' : 'Prueba con otra búsqueda'}</p>
                      </div>
                      {orders.length === 0 && (
                        <button onClick={() => navigate('/tienda')}
                          className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors">
                          Ir a la tienda
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredOrders.map(order => {
                        const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                        const img = order.items?.[0]?.image_url;
                        const itemCount = order.items?.length || 0;
                        return (
                          <button
                            key={order.id}
                            onClick={() => navigate(`/dashboard/pedidos/${order.id}`)}
                            className="w-full bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-primary/50 hover:shadow-md transition-all text-left group"
                          >
                            <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                              {img
                                ? <img src={img} alt="" className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-muted-foreground/40" /></div>
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-black text-foreground">{order.order_number}</span>
                                <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full', sc.color, sc.bg)}>{sc.label}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(order.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                {' · '}{itemCount} producto{itemCount !== 1 ? 's' : ''}
                              </p>
                              <p className="text-sm font-black text-foreground mt-0.5">S/ {order.total.toFixed(2)}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── FAVORITOS ───────────────────────────────── */}
              {tab === 'favoritos' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h1 className="text-2xl font-black text-foreground">Favoritos</h1>
                      <p className="text-muted-foreground text-sm mt-0.5">
                        {wishlist.length} producto{wishlist.length !== 1 ? 's' : ''} guardado{wishlist.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {wishlist.length > 0 && (
                      <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
                        <button onClick={() => setViewMode('grid')}
                          className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-colors', viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}>
                          <Grid3X3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setViewMode('list')}
                          className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-colors', viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}>
                          <List className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {loadingWishlist ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden">
                          <Skeleton className="aspect-square w-full" />
                          <div className="p-3 space-y-2">
                            <Skeleton className="h-3 w-1/3" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-5 w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : wishlist.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 bg-card border border-border rounded-2xl">
                      <Heart className="w-12 h-12 text-muted-foreground/30" />
                      <div className="text-center">
                        <p className="font-semibold text-foreground">No tienes favoritos</p>
                        <p className="text-sm text-muted-foreground mt-1">Guarda productos que te gusten para verlos aquí</p>
                      </div>
                      <button onClick={() => navigate('/tienda')}
                        className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors">
                        Explorar tienda
                      </button>
                    </div>
                  ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {wishlist.map(p => {
                        const img = p.images?.[0]?.url;
                        return (
                          <div key={p.id} className="bg-card border border-border rounded-2xl overflow-hidden group hover:shadow-lg transition-all hover:border-primary/30">
                            <div className="relative aspect-square bg-muted overflow-hidden cursor-pointer" onClick={() => navigate(`/tienda/${p.slug}`)}>
                              {img
                                ? <img src={img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                : <Package className="w-12 h-12 text-muted-foreground/20 absolute inset-0 m-auto" />
                              }
                              <button
                                onClick={e => { e.stopPropagation(); removeFromWishlist(p.id); }}
                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="p-3 space-y-1">
                              {(p.category as any)?.name && (
                                <p className="text-[10px] font-bold text-primary/70 uppercase tracking-wide">{(p.category as any).name}</p>
                              )}
                              <p className="text-sm font-semibold text-foreground line-clamp-2 cursor-pointer hover:text-primary" onClick={() => navigate(`/tienda/${p.slug}`)}>{p.name}</p>
                              {(p.avg_rating ?? 0) > 0 && (
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} className={cn('w-3 h-3', i < Math.round(p.avg_rating ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-border')} />
                                  ))}
                                  <span className="text-[10px] text-muted-foreground">({p.review_count})</span>
                                </div>
                              )}
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-sm font-black text-foreground">{fmt(p.base_price, p.currency)}</span>
                                <button onClick={() => { addItem(p as any); navigate('/carrito'); }}
                                  className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors">
                                  <ShoppingCart className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {wishlist.map(p => {
                        const img = p.images?.[0]?.url;
                        return (
                          <div key={p.id} className="bg-card border border-border rounded-2xl p-3 flex items-center gap-4 hover:border-primary/30 hover:shadow-md transition-all">
                            <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden flex-shrink-0 cursor-pointer" onClick={() => navigate(`/tienda/${p.slug}`)}>
                              {img ? <img src={img} alt={p.name} className="w-full h-full object-cover" /> : <Package className="w-8 h-8 text-muted-foreground/20 m-auto mt-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate cursor-pointer hover:text-primary" onClick={() => navigate(`/tienda/${p.slug}`)}>{p.name}</p>
                              <p className="text-xs text-muted-foreground">{(p.category as any)?.name}</p>
                              <p className="text-sm font-black text-foreground mt-0.5">{fmt(p.base_price, p.currency)}</p>
                            </div>
                            <button onClick={() => { addItem(p as any); navigate('/carrito'); }}
                              className="px-3 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors flex items-center gap-1.5 flex-shrink-0">
                              <ShoppingCart className="w-3.5 h-3.5" /> Agregar
                            </button>
                            <button onClick={() => removeFromWishlist(p.id)}
                              className="w-9 h-9 rounded-xl text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-colors flex-shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── COMPARAR ────────────────────────────────── */}
              {tab === 'comparar' && (
                <div className="space-y-5">
                  <div>
                    <h1 className="text-2xl font-black text-foreground">Comparar Productos</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">{compareItems.length} productos en comparación</p>
                  </div>

                  {loadingCompare ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
                    </div>
                  ) : compareItems.length < 2 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 bg-card border border-border rounded-2xl">
                      <Scale className="w-12 h-12 text-muted-foreground/30" />
                      <div className="text-center">
                        <p className="font-semibold text-foreground">Nada para comparar</p>
                        <p className="text-sm text-muted-foreground mt-1">Agrega al menos 2 productos desde la tienda para compararlos</p>
                      </div>
                      <button onClick={() => navigate('/tienda')}
                        className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors">
                        Ir a la tienda
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-border">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="text-left p-4 font-bold text-muted-foreground text-xs uppercase tracking-wide w-32 sticky left-0 bg-muted/30">Característica</th>
                            {compareItems.map(p => {
                              const img = p.images?.[0]?.url;
                              return (
                                <th key={p.id} className="p-4 text-center min-w-[160px]">
                                  <div className="w-20 h-20 rounded-xl bg-background overflow-hidden mx-auto mb-2 border border-border">
                                    {img ? <img src={img} alt={p.name} className="w-full h-full object-cover" /> : <Package className="w-8 h-8 text-muted-foreground/20 m-auto mt-6" />}
                                  </div>
                                  <button onClick={() => navigate(`/tienda/${p.slug}`)} className="text-sm font-bold text-foreground hover:text-primary line-clamp-2 transition-colors">{p.name}</button>
                                  <p className="text-base font-black text-primary mt-1">{fmt(p.base_price, p.currency)}</p>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-border">
                            <td className="p-4 font-semibold text-muted-foreground text-xs uppercase sticky left-0 bg-background">Categoría</td>
                            {compareItems.map(p => <td key={p.id} className="p-4 text-center">{(p.category as any)?.name || '-'}</td>)}
                          </tr>
                          <tr className="border-b border-border">
                            <td className="p-4 font-semibold text-muted-foreground text-xs uppercase sticky left-0 bg-background">Precio</td>
                            {compareItems.map(p => <td key={p.id} className="p-4 text-center font-black">{fmt(p.base_price, p.currency)}</td>)}
                          </tr>
                          <tr className="border-b border-border">
                            <td className="p-4 font-semibold text-muted-foreground text-xs uppercase sticky left-0 bg-background">Stock</td>
                            {compareItems.map(p => {
                              const stock = (p.variants || []).reduce((s: number, v: any) => s + (v.stock || 0), 0) || p.general_stock || 0;
                              return (
                                <td key={p.id} className={cn('p-4 text-center font-semibold', stock === 0 ? 'text-red-500' : stock <= 5 ? 'text-orange-500' : 'text-green-600')}>
                                  {stock === 0 ? 'Sin stock' : stock}
                                </td>
                              );
                            })}
                          </tr>
                          <tr className="border-b border-border">
                            <td className="p-4 font-semibold text-muted-foreground text-xs uppercase sticky left-0 bg-background">Rating</td>
                            {compareItems.map(p => (
                              <td key={p.id} className="p-4 text-center">
                                {(p.avg_rating ?? 0) > 0 ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                    <span className="font-semibold">{(p.avg_rating ?? 0).toFixed(1)}</span>
                                    <span className="text-xs text-muted-foreground">({p.review_count})</span>
                                  </div>
                                ) : <span className="text-muted-foreground">-</span>}
                              </td>
                            ))}
                          </tr>
                          {allSpecKeys.map(key => (
                            <tr key={key} className="border-b border-border">
                              <td className="p-4 font-semibold text-muted-foreground text-xs uppercase sticky left-0 bg-background capitalize">{key}</td>
                              {compareItems.map(p => <td key={p.id} className="p-4 text-center text-muted-foreground">{(p as any).specs?.[key] || '-'}</td>)}
                            </tr>
                          ))}
                          <tr>
                            <td className="p-4 sticky left-0 bg-background"></td>
                            {compareItems.map(p => (
                              <td key={p.id} className="p-4 text-center">
                                <button onClick={() => { addItem(p as any); navigate('/carrito'); }}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors">
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
        </div>
      </div>

      <Footer />
    </div>
  );
}
