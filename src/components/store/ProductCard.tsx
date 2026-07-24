import { cn } from '@/lib/utils';
import { ShoppingCart, Star, Heart } from 'lucide-react';
import type { Product, ProductVariant } from '@/lib/storeTypes';
import { useCart } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useConfig } from '@/store/configStore';
import { useNavigate } from '@/lib/router';
import { useDatabase } from '@/lib/backend';
import { toast } from 'sonner';
import { useState } from 'react';

function fmtPrice(n: number, showUsd: boolean, rate: number) {
  if (showUsd) return `$${(n / rate).toFixed(2)}`;
  return `S/ ${n.toFixed(2)}`;
}

interface ProductCardProps {
  product: Product;
  onWishlistToggle?: (id: string, wishlisted: boolean) => void;
  isWishlisted?: boolean;
  onCompareToggle?: (product: Product) => void;
  isComparing?: boolean;
}

export default function ProductCard({
  product,
  onWishlistToggle,
  isWishlisted: initialWishlisted = false,
  onCompareToggle,
  isComparing = false,
}: ProductCardProps) {
  const { addItem } = useCart();
  const { user } = useAuthStore();
  const { showUsd, exchangeRate } = useConfig();
  const navigate = useNavigate();
  const database = useDatabase();
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [adding, setAdding] = useState(false);

  const activeVariants = (product.variants || []).filter((v: any) => v.status === 'active');
  const firstVariant = activeVariants[0] as ProductVariant | undefined;

  const price = (firstVariant?.price && firstVariant.price > 0) ? firstVariant.price : product.base_price;
  const comparePrice = (firstVariant?.compare_price && firstVariant.compare_price > 0)
    ? firstVariant.compare_price : product.compare_price;
  const discount = comparePrice && comparePrice > price
    ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;

  const totalVariantStock = activeVariants.reduce((s, v: any) => s + (v.stock || 0), 0);
  const stock = activeVariants.length > 0 ? totalVariantStock : (product.general_stock ?? 99);
  const outOfStock = product.track_stock && stock === 0;
  const lowStock = product.track_stock && stock > 0 && stock <= 5;

  const img = product.images?.[0]?.url;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (outOfStock || adding) return;
    setAdding(true);
    addItem(product, firstVariant, 1);
    toast.success('Agregado', {
      description: product.name,
      action: { label: 'Ver carrito', onClick: () => navigate('/carrito') },
    });
    setTimeout(() => setAdding(false), 1200);
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    const next = !wishlisted;
    setWishlisted(next);
    if (next) {
      await database.insert('wishlists', { user_id: user.id, product_id: product.id });
      toast.success('Guardado en favoritos');
    } else {
      await database.deleteWhere('wishlists', { user_id: user.id, product_id: product.id });
    }
    onWishlistToggle?.(product.id, next);
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCompareToggle?.(product);
  };

  return (
    <div
      onClick={() => navigate(`/tienda/${product.slug}`)}
      className="group relative bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:shadow-xl hover:border-primary/40 transition-all duration-200 flex flex-col h-full"
    >
      {/* Image area */}
      <div className="relative w-full overflow-hidden bg-muted" style={{ paddingBottom: '100%' }}>
        <div className="absolute inset-0">
          {img
            ? <img src={img} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center"><ShoppingCart className="w-10 h-10 text-muted-foreground/15" /></div>}

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 hidden sm:block" />

          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
            {discount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow leading-none">
                -{discount}%
              </span>
            )}
            {outOfStock && (
              <span className="bg-gray-900/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow leading-none">
                Agotado
              </span>
            )}
            {lowStock && !outOfStock && (
              <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow leading-none">
                ¡Últimos!
              </span>
            )}
          </div>

          <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5 items-end">
            {product.featured && (
              <span className="bg-amber-400 text-amber-900 text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none">
                DEST
              </span>
            )}
            <button onClick={handleWishlist}
              className={cn('w-7 h-7 rounded-lg flex items-center justify-center shadow transition-all backdrop-blur-sm',
                wishlisted ? 'bg-red-500 text-white' : 'bg-card/90 text-muted-foreground hover:text-red-500 hover:bg-card opacity-100 sm:opacity-0 sm:group-hover:opacity-100')}>
              <Heart className={cn('w-3.5 h-3.5', wishlisted && 'fill-current')} />
            </button>
            {onCompareToggle && (
              <button onClick={handleCompare}
                className={cn('hidden sm:flex w-7 h-7 rounded-lg items-center justify-center shadow transition-all backdrop-blur-sm text-xs font-bold',
                  isComparing ? 'bg-primary text-white' : 'bg-card/90 text-muted-foreground hover:bg-primary hover:text-white opacity-0 group-hover:opacity-100')}>
                VS
              </button>
            )}
          </div>

          {/* Desktop hover: add to cart */}
          <button onClick={handleAdd} disabled={outOfStock || adding}
            className={cn('absolute inset-x-0 bottom-0 py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold transition-all duration-200',
              'translate-y-full group-hover:translate-y-0',
              'hidden sm:flex',
              outOfStock ? 'bg-gray-600 text-white cursor-not-allowed' :
              adding ? 'bg-green-500 text-white' :
              'bg-primary text-primary-foreground hover:bg-primary/90')}>
            <ShoppingCart className="w-3.5 h-3.5" />
            {outOfStock ? 'Sin stock' : adding ? '¡Agregado!' : 'Agregar al carrito'}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1 gap-1">
        {product.category && (
          <span className="text-[10px] font-bold text-primary/60 uppercase tracking-wide truncate">
            {(product.category as any).name}
          </span>
        )}

        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        {(product.review_count ?? 0) > 0 && (
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={cn('w-3 h-3', i < Math.round(product.avg_rating ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20')} />
            ))}
            <span className="text-[10px] text-muted-foreground ml-0.5">({product.review_count})</span>
          </div>
        )}

        <div className="mt-auto pt-1.5">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className={cn('text-base font-bold', outOfStock ? 'text-muted-foreground' : 'text-foreground')}>
              {fmtPrice(price, showUsd, exchangeRate)}
            </span>
            {comparePrice && comparePrice > price && (
              <span className="text-xs text-muted-foreground line-through">
                {fmtPrice(comparePrice, showUsd, exchangeRate)}
              </span>
            )}
          </div>
          {discount > 0 && !outOfStock && (
            <span className="text-[10px] text-green-600 dark:text-green-400 font-semibold">
              Ahorras {fmtPrice(comparePrice! - price, showUsd, exchangeRate)}
            </span>
          )}
        </div>

        {/* Mobile: add button */}
        <button onClick={handleAdd} disabled={outOfStock || adding}
          className={cn('sm:hidden mt-1.5 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95',
            outOfStock ? 'bg-muted text-muted-foreground cursor-not-allowed' :
            adding ? 'bg-green-500 text-white' :
            'bg-primary text-primary-foreground')}>
          <ShoppingCart className="w-3.5 h-3.5" />
          {outOfStock ? 'Sin stock' : adding ? '¡Agregado!' : 'Agregar'}
        </button>
      </div>
    </div>
  );
}
