import { cn } from '@/lib/utils';
import { ShoppingBag, Star, Heart, GitCompareArrows, Truck } from 'lucide-react';
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
        'group relative flex flex-col cursor-pointer select-none h-full',
        isComparing && 'ring-2 ring-primary ring-offset-2 rounded-xl'
      )}
    >
      {/* ── IMAGE ── */}
      <div className="relative w-full overflow-hidden bg-muted/30 flex-shrink-0 rounded-lg" style={{ aspectRatio: '1 / 1' }}>
        {img
          ? <img src={img} alt={product.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out" loading="lazy" />
          : <div className="absolute inset-0 flex items-center justify-center"><ShoppingBag className="w-10 h-10 text-muted-foreground/15" /></div>
        }

        {/* Badge top-left — discount always wins the top spot; agotado stacks below it */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
          {discount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md leading-none shadow-sm">
              -{discount}%
            </span>
          )}
          {!outOfStock && lowStock && discount <= 0 && (
            <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md leading-none shadow-sm">
              ¡Últimos!
            </span>
          )}
          {outOfStock && (
            <span className="bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md leading-none backdrop-blur-sm shadow-sm">
              Agotado
            </span>
          )}
        </div>

        {/* Top-right: wishlist + compare */}
        <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1.5">
          <button
            onClick={handleWishlist}
            aria-label="Favoritos"
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-all duration-150',
              wishlisted
                ? 'bg-red-500 text-white'
                : 'bg-white/90 dark:bg-black/60 text-muted-foreground hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 opacity-100'
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
                  : 'bg-white/90 dark:bg-black/60 text-muted-foreground hover:bg-primary hover:text-primary-foreground sm:opacity-0 sm:group-hover:opacity-100 opacity-100'
              )}
            >
              <GitCompareArrows className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Add to cart button — icon-only on mobile/tablet, icon+text pill on desktop hover */}
        {!outOfStock && (
          <button
            onClick={handleAdd}
            disabled={adding}
            aria-label="Agregar al carrito"
            className={cn(
              'absolute bottom-2.5 right-2.5 z-10 flex items-center justify-center gap-1.5 rounded-full shadow-md transition-all duration-200 font-semibold whitespace-nowrap',
              adding
                ? 'bg-emerald-500 text-white'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95',
              // Mobile/tablet (below lg): round icon-only, always visible
              'w-8 h-8 lg:w-auto lg:h-auto',
              // Desktop (lg+): pill with text, hidden until hover
              'lg:opacity-0 lg:group-hover:opacity-100 lg:translate-y-1 lg:group-hover:translate-y-0',
              'lg:px-3.5 lg:py-2 lg:text-xs',
              'opacity-100'
            )}
          >
            <ShoppingBag className={cn('w-4 h-4', adding && 'animate-bounce')} />
            <span className="hidden lg:inline">{adding ? 'Agregado' : 'Agregar'}</span>
          </button>
        )}
      </div>

      {/* ── INFO ── */}
      <div className="pt-3 flex flex-col gap-1">

        {/* Category label */}
        {product.category && (
          <span className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground/60 truncate leading-none">
            {(product.category as any).name}
          </span>
        )}

        {/* Name */}
        <h3 className="text-[13px] leading-snug line-clamp-2 text-foreground font-medium">
          {product.name}
        </h3>

        {/* Rating — only if reviews exist, NO placeholder space */}
        {reviewCount > 0 && (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={cn('w-3 h-3', i < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20')} />
            ))}
            <span className="text-[10px] text-muted-foreground ml-1">({reviewCount})</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
          <span className={cn('text-base font-semibold', outOfStock ? 'text-muted-foreground' : 'text-foreground')}>
            {fmtPrice(price, showUsd, exchangeRate, currencySymbol)}
          </span>
          {comparePrice && comparePrice > price && (
            <span className="text-xs text-muted-foreground/50 line-through">
              {fmtPrice(comparePrice, showUsd, exchangeRate, currencySymbol)}
            </span>
          )}
        </div>

        {/* Discount */}
        {!outOfStock && discount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{discount}% OFF</span>
            {comparePrice && (
              <span className="text-[10px] text-muted-foreground">
                Ahorras {fmtPrice(comparePrice - price, showUsd, exchangeRate, currencySymbol)}
              </span>
            )}
          </div>
        )}

        {/* Free shipping */}
        {!outOfStock && qualifiesFreeShip && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <Truck className="w-3 h-3" />
            Envío gratis
          </span>
        )}
      </div>
    </div>
  );
}
