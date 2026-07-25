import { cn } from '@/lib/utils';
import { ShoppingCart, Star, Heart, GitCompareArrows, Truck } from 'lucide-react';
import type { Product, ProductVariant } from '@/lib/storeTypes';
import { useCart } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useConfig } from '@/store/configStore';
import { useNavigate } from '@/lib/router';
import { useDatabase } from '@/lib/backend';
import { toast } from 'sonner';
import { useState } from 'react';

function fmtPrice(n: number, showUsd: boolean, rate: number, symbol: string) {
  if (showUsd) return `$${(n / rate).toFixed(2)}`;
  return `${symbol} ${n.toFixed(2)}`;
}

interface ProductCardProps {
  product: Product;
  onWishlistToggle?: (id: string, wishlisted: boolean) => void;
  isWishlisted?: boolean;
  onCompareToggle?: (product: Product) => void;
  isComparing?: boolean;
  freeShipThreshold?: number;
}

export default function ProductCard({
  product,
  onWishlistToggle,
  isWishlisted: initialWishlisted = false,
  onCompareToggle,
  isComparing = false,
  freeShipThreshold,
}: ProductCardProps) {
  const { addItem } = useCart();
  const { user } = useAuthStore();
  const { showUsd, exchangeRate, currencySymbol } = useConfig();
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
  const qualifiesFreeShip = freeShipThreshold ? price >= freeShipThreshold : false;

  const img = product.images?.[0]?.url;
  const rating = product.avg_rating ?? 0;
  const reviewCount = product.review_count ?? 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (outOfStock || adding) return;
    setAdding(true);
    addItem(product, firstVariant, 1);
    toast.success('¡Agregado al carrito!', {
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
        'group relative flex flex-col cursor-pointer select-none',
        isComparing && 'ring-2 ring-primary ring-offset-1 rounded-xl'
      )}
    >
      {/* ── IMAGE ── */}
      <div className="relative w-full rounded-xl overflow-hidden bg-muted/30" style={{ aspectRatio: '1 / 1' }}>
        {img
          ? <img
              src={img}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
              loading="lazy"
            />
          : <div className="absolute inset-0 flex items-center justify-center">
              <ShoppingCart className="w-10 h-10 text-muted-foreground/15" />
            </div>
        }

        {/* Discount badge — top left */}
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded leading-none z-10 select-none">
            -{discount}%
          </span>
        )}
        {outOfStock && (
          <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded leading-none z-10 backdrop-blur-sm select-none">
            Agotado
          </span>
        )}
        {lowStock && !outOfStock && !discount && (
          <span className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded leading-none z-10 select-none">
            ¡Últimos!
          </span>
        )}

        {/* Action buttons — top right */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5 items-end">
          <button
            onClick={handleWishlist}
            aria-label="Guardar en favoritos"
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-all duration-150',
              wishlisted
                ? 'bg-red-500 text-white'
                : 'bg-white/90 text-muted-foreground hover:text-red-500 dark:bg-black/60 sm:opacity-0 sm:group-hover:opacity-100 opacity-100'
            )}
          >
            <Heart className={cn('w-3.5 h-3.5', wishlisted && 'fill-current')} />
          </button>
          {onCompareToggle && (
            <button
              onClick={handleCompare}
              aria-label="Comparar"
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-all duration-150',
                isComparing
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white/90 text-muted-foreground dark:bg-black/60 hover:bg-primary hover:text-primary-foreground sm:opacity-0 sm:group-hover:opacity-100 opacity-100'
              )}
            >
              <GitCompareArrows className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Desktop cart button — slides up INSIDE image, covers bottom 25% only */}
        {!outOfStock && (
          <button
            onClick={handleAdd}
            disabled={adding}
            aria-label="Agregar al carrito"
            className={cn(
              'absolute inset-x-0 bottom-0 hidden sm:flex items-center justify-center gap-1.5',
              'h-10 text-xs font-bold select-none',
              'translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out',
              adding ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-foreground'
            )}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {adding ? '¡Agregado!' : 'Agregar al carrito'}
          </button>
        )}
      </div>

      {/* ── INFO ── */}
      <div className="pt-2.5 flex flex-col">
        {/* Category */}
        {product.category && (
          <span className="text-[9px] font-black tracking-widest uppercase text-muted-foreground/50 truncate leading-none mb-1">
            {(product.category as any).name}
          </span>
        )}

        {/* Name — natural height, no min-height so no blank space */}
        <h3 className="text-[13px] text-foreground leading-snug line-clamp-2 mb-1.5">
          {product.name}
        </h3>

        {/* Stars — only rendered when there are reviews */}
        {reviewCount > 0 && (
          <div className="flex items-center gap-0.5 mb-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'w-3 h-3',
                  i < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20'
                )}
              />
            ))}
            <span className="text-[10px] text-muted-foreground ml-0.5">({reviewCount})</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className={cn('text-base font-bold', outOfStock ? 'text-muted-foreground' : 'text-foreground')}>
            {fmtPrice(price, showUsd, exchangeRate, currencySymbol)}
          </span>
          {comparePrice && comparePrice > price && (
            <span className="text-xs text-muted-foreground/60 line-through">
              {fmtPrice(comparePrice, showUsd, exchangeRate, currencySymbol)}
            </span>
          )}
          {discount > 0 && !outOfStock && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              {discount}% OFF
            </span>
          )}
        </div>

        {/* Savings */}
        {discount > 0 && comparePrice && !outOfStock && (
          <span className="text-[10px] text-muted-foreground">
            Ahorras {fmtPrice(comparePrice - price, showUsd, exchangeRate, currencySymbol)}
          </span>
        )}

        {/* Free shipping label */}
        {qualifiesFreeShip && !outOfStock && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
            <Truck className="w-3 h-3" />
            Envío gratis
          </span>
        )}

        {/* Mobile add button */}
        <button
          onClick={handleAdd}
          disabled={outOfStock || adding}
          className={cn(
            'sm:hidden mt-2 w-full flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold transition-all active:scale-95',
            outOfStock
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : adding
                ? 'bg-emerald-500 text-white'
                : 'bg-primary/10 text-primary border border-primary/20'
          )}
        >
          <ShoppingCart className="w-3 h-3" />
          {outOfStock ? 'Agotado' : adding ? '¡Agregado!' : 'Agregar'}
        </button>
      </div>
    </div>
  );
}
