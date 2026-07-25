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
      className={cn(
        'group relative bg-card border rounded-2xl overflow-hidden cursor-pointer flex flex-col h-full transition-all duration-200',
        isComparing
          ? 'border-primary/60 ring-1 ring-primary/30 shadow-md'
          : 'border-border/60 hover:border-border hover:shadow-md'
      )}
    >
      {/* Image */}
      <div className="relative w-full bg-muted/40" style={{ aspectRatio: '1 / 1' }}>
        {img
          ? <img src={img} alt={product.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" loading="lazy" />
          : <div className="absolute inset-0 flex items-center justify-center"><ShoppingCart className="w-8 h-8 text-muted-foreground/15" /></div>
        }

        {/* Overlay on hover - desktop */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/8 transition-colors duration-200 hidden sm:block pointer-events-none" />

        {/* Badges - left */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
          {discount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow leading-none">
              -{discount}%
            </span>
          )}
          {outOfStock && (
            <span className="bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow leading-none backdrop-blur-sm">
              Agotado
            </span>
          )}
          {lowStock && !outOfStock && (
            <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow leading-none">
              ¡Últimos!
            </span>
          )}
        </div>

        {/* Badges + actions - right */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5 items-end">
          {product.featured && (
            <span className="bg-amber-400 text-amber-900 text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none uppercase tracking-wide">
              Dest
            </span>
          )}
          <button
            onClick={handleWishlist}
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-all',
              wishlisted
                ? 'bg-red-500 text-white'
                : 'bg-card/90 text-muted-foreground hover:text-red-500 backdrop-blur-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
            )}
          >
            <Heart className={cn('w-3.5 h-3.5', wishlisted && 'fill-current')} />
          </button>
          {onCompareToggle && (
            <button
              onClick={handleCompare}
              className={cn(
                'hidden sm:flex w-7 h-7 rounded-full items-center justify-center shadow-md transition-all text-[10px] font-black backdrop-blur-sm',
                isComparing
                  ? 'bg-primary text-white opacity-100'
                  : 'bg-card/90 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-white'
              )}
            >
              VS
            </button>
          )}
        </div>

        {/* Add to cart - hover slide (desktop) */}
        {!outOfStock && (
          <button
            onClick={handleAdd}
            disabled={adding}
            className={cn(
              'absolute inset-x-0 bottom-0 h-9 hidden sm:flex items-center justify-center gap-1.5 text-xs font-bold',
              'translate-y-full group-hover:translate-y-0 transition-transform duration-200',
              adding ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-foreground'
            )}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {adding ? '¡Agregado!' : 'Agregar al carrito'}
          </button>
        )}
        {outOfStock && (
          <div className="absolute inset-x-0 bottom-0 h-9 hidden sm:flex items-center justify-center gap-1.5 text-xs font-bold translate-y-full group-hover:translate-y-0 transition-transform duration-200 bg-muted/90 text-muted-foreground backdrop-blur-sm">
            <ShoppingCart className="w-3.5 h-3.5" />
            Sin stock
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 flex flex-col flex-1 gap-0.5">
        {product.category && (
          <span className="text-[9px] font-black text-primary/50 uppercase tracking-widest truncate">
            {(product.category as any).name}
          </span>
        )}

        <h3 className="text-xs font-semibold text-foreground leading-snug line-clamp-2" style={{ minHeight: '2.4em' }}>
          {product.name}
        </h3>

        {(product.review_count ?? 0) > 0 && (
          <div className="flex items-center gap-0.5 mt-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn('w-2.5 h-2.5', i < Math.round(product.avg_rating ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20 fill-muted-foreground/10')}
              />
            ))}
            <span className="text-[9px] text-muted-foreground ml-0.5">({product.review_count})</span>
          </div>
        )}

        <div className="mt-auto pt-1.5">
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className={cn('text-sm font-black', outOfStock ? 'text-muted-foreground' : 'text-foreground')}>
              {fmtPrice(price, showUsd, exchangeRate)}
            </span>
            {comparePrice && comparePrice > price && (
              <span className="text-[10px] text-muted-foreground/60 line-through">
                {fmtPrice(comparePrice, showUsd, exchangeRate)}
              </span>
            )}
          </div>
          {discount > 0 && !outOfStock && (
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
              Ahorras {fmtPrice(comparePrice! - price, showUsd, exchangeRate)}
            </span>
          )}
        </div>

        {/* Mobile: add button */}
        <button
          onClick={handleAdd}
          disabled={outOfStock || adding}
          className={cn(
            'sm:hidden mt-2 w-full flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95',
            outOfStock
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : adding
                ? 'bg-emerald-500 text-white'
                : 'bg-primary text-primary-foreground'
          )}
        >
          <ShoppingCart className="w-3 h-3" />
          {outOfStock ? 'Agotado' : adding ? '¡Agregado!' : 'Agregar'}
        </button>
      </div>
    </div>
  );
}
