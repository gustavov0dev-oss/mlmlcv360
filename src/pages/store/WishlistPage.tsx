import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '@/lib/backend';
import { useAuthStore } from '@/store/authStore';
import { useCart } from '@/store/cartStore';
import { useNavigate } from '@/lib/router';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Product } from '@/lib/storeTypes';
import { Heart, Trash2, ShoppingCart, Package, Star, Grid3x3 as Grid3X3, List } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

function fmt(n: number, c = 'PEN') { return c === 'USD' ? `$${n.toFixed(2)}` : `S/ ${n.toFixed(2)}`; }

export default function WishlistPage() {
  const database = useDatabase();
  const { user } = useAuthStore();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const load = useCallback(async () => {
    if (!user) { navigate('/login'); return; }
    setLoading(true);
    const { data } = await database.select('wishlists', {
      select: 'product_id, product:products(*, category:product_categories(id,name), variants:product_variants(*))',
      filter: { user_id: user.id },
    });
    if (data) { setProducts(((data as any[]) || []).map((w: any) => w.product).filter(Boolean)); }
    setLoading(false);
  }, [user, navigate]);

  useEffect(() => { load(); }, [load]);

  const removeFromWishlist = async (productId: string) => {
    if (!user) return;
    await database.deleteWhere('wishlists', { user_id: user.id, product_id: productId });
    setProducts(prev => prev.filter(p => p.id !== productId));
    toast.success('Eliminado de favoritos');
  };

  const moveToCart = async (p: Product) => {
    addItem(p);
    await removeFromWishlist(p.id);
    toast.success('Movido al carrito');
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="pt-16 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1.5"><Skeleton className="h-8 w-36" /><Skeleton className="h-4 w-28" /></div>
          <Skeleton className="h-9 w-20 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({length:10}).map((_,i)=>(
            <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <div className="p-3 space-y-2"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-5 w-1/2" /><div className="flex gap-2 mt-2"><Skeleton className="flex-1 h-9 rounded-xl" /><Skeleton className="w-9 h-9 rounded-xl" /></div></div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="pt-16 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mis Favoritos</h1>
            <p className="text-sm text-muted-foreground">{products.length} productos guardados</p>
          </div>
          <div className="flex bg-card border border-border rounded-xl p-1 gap-0.5">
            {(['grid', 'list'] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                className={cn('p-2 rounded-lg transition-colors', viewMode === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}>
                {v === 'grid' ? <Grid3X3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <Heart className="w-16 h-16 text-muted-foreground/30" />
            <div>
              <p className="font-bold text-foreground">No tienes favoritos</p>
              <p className="text-sm text-muted-foreground mt-1">Guarda productos que te interesen</p>
            </div>
            <button onClick={() => navigate('/tienda')} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90">Ir a la tienda</button>
          </div>
        ) : (
          <div className={cn('grid gap-4', viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1')}>
            {products.map(p => {
              const img = p.images?.[0]?.url;
              const firstVariant = (p.variants || []).find((v: any) => v.status === 'active');
              const price = firstVariant?.price ?? p.base_price;
              const stock = (p.variants || []).reduce((s: number, v: any) => s + (v.stock || 0), 0);
              const outOfStock = p.track_stock && stock === 0;

              return (
                <div key={p.id} className={cn('group relative bg-card border border-border rounded-xl overflow-hidden hover:shadow-xl transition-all', viewMode === 'grid' ? '' : 'flex items-center gap-4 p-4')}>
                  <div onClick={() => navigate(`/tienda/${p.slug}`)} className={cn('cursor-pointer', viewMode === 'grid' ? 'aspect-square overflow-hidden bg-muted' : 'w-24 h-24 rounded-xl overflow-hidden flex-shrink-0')}>
                    {img ? <img src={img} alt={p.name} className="w-full h-full object-cover" /> : <Package className="w-full h-full text-muted-foreground/20 p-8" />}
                  </div>
                  <div className={cn('flex-1', viewMode === 'grid' ? 'p-3 space-y-2' : 'space-y-1')}>
                    {p.category && <span className="text-[10px] font-bold text-primary/70 uppercase">{(p.category as any).name}</span>}
                    <h3 onClick={() => navigate(`/tienda/${p.slug}`)} className="text-sm font-bold text-foreground line-clamp-2 cursor-pointer hover:text-primary">{p.name}</h3>
                    {(p.review_count ?? 0) > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn('w-3 h-3', i < Math.round(p.avg_rating ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-border')} />)}</div>
                        <span className="text-[10px] text-muted-foreground">({p.review_count})</span>
                      </div>
                    )}
                    {outOfStock && <span className="text-[10px] text-red-500 font-bold">Sin stock</span>}
                    <div className="flex items-end gap-2">
                      <span className="text-base font-bold text-foreground">{fmt(price, p.currency)}</span>
                      {p.compare_price && p.compare_price > price && <span className="text-xs text-muted-foreground line-through">{fmt(p.compare_price, p.currency)}</span>}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => !outOfStock && moveToCart(p)} disabled={outOfStock} className={cn('flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-colors', outOfStock ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90')}>
                        <ShoppingCart className="w-3.5 h-3.5" /> Agregar
                      </button>
                      <button onClick={() => removeFromWishlist(p.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
