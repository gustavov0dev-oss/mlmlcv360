import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDatabase, useStorage } from '@/lib/backend';
import { useCart } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useConfig } from '@/store/configStore';
import { setProductSchema, clearProductSchema } from '@/hooks/useSeo';
import ProductCard from '@/components/store/ProductCard';
import { useNavigate } from '@/lib/router';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Product, ProductVariant, ProductReview } from '@/lib/storeTypes';
import {
  ShoppingCart, Star, ChevronLeft, ChevronRight, Plus, Minus,
  Truck, Shield, RotateCcw, Heart, Share2, Package, Tag, MessageSquare,
  Layers, Upload, ThumbsUp, Flag, ChevronDown, CircleCheck as CheckCircle,
  Play, Download, Eye, Lock, Zap, Info, ExternalLink, Image as ImageIcon,
  SlidersHorizontal, X, Award,
} from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

/* ─── helpers ─── */
function fmtPrice(n: number, showUsd: boolean, rate: number, symbol: string) {
  if (showUsd) return `$${(n / rate).toFixed(2)}`;
  return `${symbol} ${n.toFixed(2)}`;
}

function StarsDisplay({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${value} de 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} style={{ width: size, height: size }}
          className={i < Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/25'} />
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const labels = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <button key={i} type="button"
            onMouseEnter={() => setHover(i + 1)} onMouseLeave={() => setHover(0)}
            onClick={() => onChange(i + 1)}
            className="transition-transform hover:scale-110 active:scale-95">
            <Star className={cn('w-8 h-8 sm:w-9 sm:h-9 transition-colors',
              i < (hover || value) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20')} />
          </button>
        ))}
      </div>
      {(hover || value) > 0 && (
        <span className="text-sm font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-lg">
          {labels[hover || value]}
        </span>
      )}
    </div>
  );
}

/* Rich description renderer */
function DescriptionRenderer({ text }: { text: string }) {
  if (!text) return <p className="text-muted-foreground italic text-sm">Sin descripción disponible.</p>;

  const blocks = text.split(/\n{2,}/g);
  return (
    <div className="space-y-4 max-w-none">
      {blocks.map((block, bi) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imgMatch) {
          return (
            <figure key={bi} className="rounded-xl overflow-hidden">
              <img src={imgMatch[2]} alt={imgMatch[1]}
                className="w-full object-cover max-h-[480px]" loading="lazy" />
              {imgMatch[1] && <figcaption className="text-xs text-muted-foreground text-center pt-2">{imgMatch[1]}</figcaption>}
            </figure>
          );
        }

        const galleryMatches = [...trimmed.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
        if (galleryMatches.length > 1) {
          return (
            <div key={bi} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {galleryMatches.map((m, i) => (
                <div key={i} className="rounded-xl overflow-hidden aspect-square">
                  <img src={m[2]} alt={m[1]} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          );
        }

        if (trimmed.startsWith('## ')) {
          return <h3 key={bi} className="text-lg font-semibold text-foreground pt-2">{trimmed.slice(3)}</h3>;
        }
        if (trimmed.startsWith('# ')) {
          return <h2 key={bi} className="text-xl font-semibold text-foreground pt-2">{trimmed.slice(2)}</h2>;
        }

        const lines = trimmed.split('\n');
        const isList = lines.every(l => l.startsWith('- ') || l.startsWith('* '));
        if (isList) {
          return (
            <ul key={bi} className="space-y-2">
              {lines.map((l, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/90 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span dangerouslySetInnerHTML={{ __html: l.slice(2).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') }} />
                </li>
              ))}
            </ul>
          );
        }

        const inlined = trimmed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
          (_, alt, src) => `<img src="${src}" alt="${alt}" class="inline rounded-lg max-w-[280px] my-2" />`
        ).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        return (
          <p key={bi} className="text-sm sm:text-[15px] text-foreground/80 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: inlined }} />
        );
      })}
    </div>
  );
}

/* ─── Swipe gallery: native scroll-snap + pointer drag ─── */
interface MediaItem { url: string; alt?: string; isVideo: boolean; thumbnail?: string }

function SwipeGallery({
  media, altName, discount, featured, isDigital, onOpenLightbox,
}: {
  media: MediaItem[]; altName: string; discount: number; featured: boolean; isDigital: boolean;
  onOpenLightbox: (url: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const dragState = useRef({ down: false, startX: 0, startScroll: 0, moved: false });

  const scrollToIdx = useCallback((idx: number, smooth = true) => {
    const el = trackRef.current;
    if (!el) return;
    const slide = el.children[idx] as HTMLElement | undefined;
    if (slide) slide.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', inline: 'center', block: 'nearest' });
  }, []);

  // Track active slide via scroll
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const slideW = el.clientWidth || 1;
        setActive(Math.round(el.scrollLeft / slideW));
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [media.length]);

  // Pointer drag for mouse/hybrid
  const onPointerDown = (e: React.PointerEvent) => {
    const el = trackRef.current; if (!el) return;
    if (e.pointerType === 'touch') return; // native scroll handles touch
    dragState.current = { down: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
    el.setPointerCapture(e.pointerId);
    el.style.scrollSnapType = 'none';
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = trackRef.current; if (!el) return;
    if (!dragState.current.down) return;
    const dx = e.clientX - dragState.current.startX;
    if (Math.abs(dx) > 4) dragState.current.moved = true;
    el.scrollLeft = dragState.current.startScroll - dx;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const el = trackRef.current; if (!el) return;
    dragState.current.down = false;
    el.releasePointerCapture(e.pointerId);
    el.style.scrollSnapType = 'x mandatory';
    if (dragState.current.moved) scrollToIdx(active, true);
  };

  if (media.length === 0) {
    return (
      <div className="relative w-full overflow-hidden bg-muted/30 rounded-2xl flex items-center justify-center" style={{ aspectRatio: '1 / 1' }}>
        <Package className="w-20 h-20 text-muted-foreground/20" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative w-full overflow-hidden bg-muted/30 rounded-2xl">
        {discount > 0 && (
          <span className="absolute top-3 left-3 z-20 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">-{discount}%</span>
        )}
        {featured && (
          <span className="absolute top-3 right-3 z-20 bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" /> Destacado
          </span>
        )}
        {isDigital && (
          <span className="absolute bottom-3 left-3 z-20 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
            <Zap className="w-3 h-3" /> Digital
          </span>
        )}

        {/* Track */}
        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide touch-pan-y"
          style={{ scrollSnapType: 'x mandatory', cursor: 'grab' }}
        >
          {media.map((m, i) => (
            <div key={i} className="snap-center shrink-0 w-full relative" style={{ aspectRatio: '1 / 1' }}>
              {m.isVideo ? (
                <video src={m.url} controls poster={m.thumbnail}
                  className="w-full h-full object-cover" />
              ) : (
                <img src={m.url} alt={m.alt || altName} draggable={false}
                  className="w-full h-full object-cover select-none"
                  onClick={(e) => { if (!dragState.current.moved) onOpenLightbox(m.url); e.stopPropagation(); }}
                  onDragStart={(e) => e.preventDefault()} loading={i === 0 ? 'eager' : 'lazy'} />
              )}
            </div>
          ))}
        </div>

        {/* Arrows (desktop) */}
        {media.length > 1 && (<>
          <button onClick={() => scrollToIdx(active - 1 < 0 ? media.length - 1 : active - 1)}
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-background/90 backdrop-blur-sm rounded-full items-center justify-center shadow-sm z-10 hover:bg-background transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => scrollToIdx(active + 1 >= media.length ? 0 : active + 1)}
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-background/90 backdrop-blur-sm rounded-full items-center justify-center shadow-sm z-10 hover:bg-background transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 right-3 z-20 bg-black/50 text-white text-[11px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm pointer-events-none">
            {active + 1} / {media.length}
          </div>
        </>)}
      </div>

      {/* Thumbnails */}
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {media.map((m, i) => (
            <button key={i} onClick={() => scrollToIdx(i)}
              className={cn('flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all',
                active === i ? 'border-primary' : 'border-transparent hover:border-primary/40 opacity-70 hover:opacity-100')}>
              {m.isVideo
                ? <div className="w-full h-full bg-muted flex items-center justify-center"><Play className="w-4 h-4 text-muted-foreground" /></div>
                : <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />}
            </button>
          ))}
        </div>
      )}

      {/* Dots (mobile) */}
      {media.length > 1 && (
        <div className="flex sm:hidden justify-center gap-1.5">
          {media.map((_, i) => (
            <button key={i} onClick={() => scrollToIdx(i)}
              className={cn('h-1.5 rounded-full transition-all', active === i ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30')}
              aria-label={`Imagen ${i + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Reviews section ─── */
type SortKey = 'helpful' | 'recent' | 'high' | 'low';

function ReviewsSection({
  reviews, avgRating, ratingDist, helpfulIds, reportedIds, onMarkHelpful, onReport, onOpenLightbox,
  reviewForm, setReviewForm, uploadingImg, onUploadImg, submittingReview, onSubmitReview, user, navigate,
}: {
  reviews: ProductReview[]; avgRating: number; ratingDist: { n: number; count: number; pct: number }[];
  helpfulIds: Set<string>; reportedIds: Set<string>;
  onMarkHelpful: (id: string, count: number) => void; onReport: (id: string) => void;
  onOpenLightbox: (url: string) => void;
  reviewForm: { rating: number; title: string; body: string; images: string[] };
  setReviewForm: React.Dispatch<React.SetStateAction<{ rating: number; title: string; body: string; images: string[] }>>;
  uploadingImg: boolean; onUploadImg: (f: File) => void;
  submittingReview: boolean; onSubmitReview: () => void;
  user: any; navigate: (path: string) => void;
}) {
  const [starFilter, setStarFilter] = useState(0);
  const [photosOnly, setPhotosOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('helpful');
  const [visible, setVisible] = useState(5);

  const allPhotos = useMemo(
    () => reviews.flatMap(r => (r.images || []).map(url => ({ url, reviewId: r.id }))),
    [reviews]
  );

  const filtered = useMemo(() => {
    let list = [...reviews];
    if (starFilter > 0) list = list.filter(r => r.rating === starFilter);
    if (photosOnly) list = list.filter(r => (r.images || []).length > 0);
    if (verifiedOnly) list = list.filter(r => r.verified_purchase);
    switch (sort) {
      case 'recent': list.sort((a, b) => b.created_at.localeCompare(a.created_at)); break;
      case 'high': list.sort((a, b) => b.rating - a.rating); break;
      case 'low': list.sort((a, b) => a.rating - b.rating); break;
      default: list.sort((a, b) => (b.helpful_count ?? 0) - (a.helpful_count ?? 0)); break;
    }
    return list;
  }, [reviews, starFilter, photosOnly, verifiedOnly, sort]);

  const featured = useMemo(() => {
    if (reviews.length === 0) return null;
    return [...reviews].sort((a, b) => (b.helpful_count ?? 0) - (a.helpful_count ?? 0))[0];
  }, [reviews]);

  const activeFilters = starFilter > 0 || photosOnly || verifiedOnly;
  const clearFilters = () => { setStarFilter(0); setPhotosOnly(false); setVerifiedOnly(false); };

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: 'helpful', label: 'Más útiles' },
    { value: 'recent', label: 'Más recientes' },
    { value: 'high', label: 'Mayor calificación' },
    { value: 'low', label: 'Menor calificación' },
  ];

  return (
    <div className="space-y-8">
      {/* ── Summary + distribution ── */}
      {reviews.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
          {/* Big score */}
          <div className="lg:col-span-4 flex flex-row lg:flex-col items-center lg:items-start gap-4 lg:gap-2">
            <div className="flex flex-col items-center lg:items-start">
              <span className="text-5xl lg:text-6xl font-semibold text-foreground leading-none tracking-tight">{avgRating.toFixed(1)}</span>
              <StarsDisplay value={avgRating} size={20} />
              <span className="text-sm text-muted-foreground mt-1">{reviews.length} reseñas en total</span>
            </div>
            <button onClick={() => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }}
              className="lg:mt-3 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all">
              Escribir reseña
            </button>
          </div>

          {/* Distribution */}
          <div className="lg:col-span-5 space-y-2">
            {ratingDist.map(({ n, count, pct }) => (
              <button key={n} onClick={() => setStarFilter(starFilter === n ? 0 : n)}
                className={cn('w-full flex items-center gap-2.5 group rounded-lg px-1 py-0.5 transition-colors',
                  starFilter === n ? 'bg-amber-50 dark:bg-amber-900/20' : 'hover:bg-muted/40')}>
                <div className="flex items-center gap-0.5 w-14 flex-shrink-0">
                  <span className="text-xs font-medium text-foreground w-3 text-right">{n}</span>
                  <Star className={cn('w-3.5 h-3.5 ml-0.5', count > 0 ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/25')} />
                </div>
                <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right flex-shrink-0">{count}</span>
              </button>
            ))}
          </div>

          {/* Aggregated photos */}
          {allPhotos.length > 0 && (
            <div className="lg:col-span-3">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" /> Fotos de clientes ({allPhotos.length})
              </p>
              <div className="grid grid-cols-4 lg:grid-cols-3 gap-1.5">
                {allPhotos.slice(0, 9).map((p, i) => (
                  <button key={i} onClick={() => onOpenLightbox(p.url)}
                    className="aspect-square rounded-lg overflow-hidden border border-border hover:scale-105 transition-transform">
                    <img src={p.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Filters + sort ── */}
      {reviews.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            {starFilter > 0 && (
              <button onClick={() => setStarFilter(0)}
                className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                {starFilter} ★ <X className="w-3 h-3" />
              </button>
            )}
            <button onClick={() => setPhotosOnly(v => !v)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                photosOnly ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40')}>
              <ImageIcon className="w-3.5 h-3.5" /> Con fotos
            </button>
            <button onClick={() => setVerifiedOnly(v => !v)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                verifiedOnly ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40')}>
              <CheckCircle className="w-3.5 h-3.5" /> Verificadas
            </button>
            {activeFilters && (
              <button onClick={clearFilters} className="text-xs text-red-500 hover:underline font-medium px-2">Limpiar</button>
            )}
          </div>

          <div className="relative sm:ml-auto">
            <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
              className="appearance-none pl-3 pr-8 py-1.5 bg-muted/40 border border-border rounded-lg text-xs font-medium text-foreground outline-none focus:border-primary cursor-pointer">
              {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      )}

      {/* ── Featured review ── */}
      {featured && !activeFilters && sort === 'helpful' && (
        <div className="rounded-2xl border border-amber-300/50 bg-amber-50/50 dark:bg-amber-900/10 p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
            <Award className="w-4 h-4" /> Reseña destacada
          </div>
          <ReviewCard r={featured} helpfulIds={helpfulIds} reportedIds={reportedIds}
            onMarkHelpful={onMarkHelpful} onReport={onReport} onOpenLightbox={onOpenLightbox} />
        </div>
      )}

      {/* ── Review list ── */}
      <div className="space-y-0 divide-y divide-border">
        {filtered.slice(0, visible).map(r => (
          <ReviewCard key={r.id} r={r} helpfulIds={helpfulIds} reportedIds={reportedIds}
            onMarkHelpful={onMarkHelpful} onReport={onReport} onOpenLightbox={onOpenLightbox} />
        ))}

        {filtered.length === 0 && reviews.length > 0 && (
          <div className="text-center py-12 space-y-2">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/20" />
            <p className="text-base font-semibold text-foreground">Sin reseñas con estos filtros</p>
            <button onClick={clearFilters} className="text-sm text-primary hover:underline font-medium">Ver todas las reseñas</button>
          </div>
        )}

        {reviews.length === 0 && (
          <div className="text-center py-12 space-y-2">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/20" />
            <p className="text-base font-semibold text-foreground">Sin reseñas aún</p>
            <p className="text-sm text-muted-foreground">Sé el primero en compartir tu experiencia</p>
          </div>
        )}

        {filtered.length > visible && (
          <button onClick={() => setVisible(v => v + 5)}
            className="w-full flex items-center justify-center gap-2 py-4 text-sm font-medium text-primary hover:bg-primary/5 rounded-xl transition-colors">
            <ChevronDown className="w-4 h-4" /> Ver más reseñas ({filtered.length - visible} restantes)
          </button>
        )}
      </div>

      {/* ── Write review ── */}
      <div className="pt-6 border-t border-border space-y-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">¿Ya compraste este producto?</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Comparte tu opinión con otros compradores</p>
        </div>

        {!user ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-foreground">Inicia sesión para escribir una reseña</p>
            <button onClick={() => navigate('/login')}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors">
              Iniciar sesión
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">1. ¿Cómo calificarías este producto? *</p>
              <StarPicker value={reviewForm.rating} onChange={v => setReviewForm(p => ({ ...p, rating: v }))} />
            </div>

            {reviewForm.rating > 0 && (<>
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">2. Ponle un título a tu reseña</p>
                <input value={reviewForm.title}
                  onChange={e => setReviewForm(p => ({ ...p, title: e.target.value }))}
                  placeholder={reviewForm.rating >= 4 ? 'Ej: Excelente calidad, muy recomendado' : reviewForm.rating === 3 ? 'Ej: Bueno pero mejorable' : 'Ej: No cumplió mis expectativas'}
                  maxLength={100}
                  className="w-full px-4 py-3 bg-muted/40 border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary transition-colors" />
              </div>

              <div>
                <p className="text-sm font-semibold text-foreground mb-2">3. Cuéntanos más</p>
                <textarea value={reviewForm.body}
                  onChange={e => setReviewForm(p => ({ ...p, body: e.target.value }))}
                  placeholder="¿Qué te gustó? ¿Qué no? ¿Volverías a comprarlo?"
                  rows={4} maxLength={1000}
                  className="w-full px-4 py-3 bg-muted/40 border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary resize-none transition-colors" />
                <p className="text-xs text-muted-foreground text-right mt-1">{reviewForm.body.length}/1000</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-foreground mb-2">4. Agrega fotos <span className="font-normal text-muted-foreground">(opcional)</span></p>
                <div className="flex gap-2 flex-wrap">
                  {reviewForm.images.map((img, i) => (
                    <div key={i} className="relative" style={{ width: 80, height: 80 }}>
                      <img src={img} alt="" className="w-full h-full rounded-xl object-cover border-2 border-primary/30" />
                      <button onClick={() => setReviewForm(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }))}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">×</button>
                    </div>
                  ))}
                  {reviewForm.images.length < 5 && (
                    <label className={cn('rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors group',
                      uploadingImg ? 'opacity-50 cursor-not-allowed border-border' : 'border-border hover:border-primary hover:bg-primary/5')}
                      style={{ width: 80, height: 80 }}>
                      {uploadingImg
                        ? <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        : <>
                          <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="text-[10px] text-muted-foreground mt-1 group-hover:text-primary transition-colors">Foto</span>
                        </>}
                      <input type="file" accept="image/*" className="hidden" disabled={uploadingImg}
                        onChange={e => e.target.files?.[0] && onUploadImg(e.target.files[0])} />
                    </label>
                  )}
                </div>
              </div>

              <button onClick={onSubmitReview}
                disabled={submittingReview || reviewForm.rating === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 active:scale-[0.98] transition-all">
                {submittingReview
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publicando...</>
                  : 'Publicar reseña'}
              </button>
            </>)}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewCard({
  r, helpfulIds, reportedIds, onMarkHelpful, onReport, onOpenLightbox,
}: {
  r: ProductReview; helpfulIds: Set<string>; reportedIds: Set<string>;
  onMarkHelpful: (id: string, count: number) => void; onReport: (id: string) => void;
  onOpenLightbox: (url: string) => void;
}) {
  return (
    <div className="py-5 first:pt-0 space-y-2.5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
            {((r.profile as any)?.full_name || 'U')[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{(r.profile as any)?.full_name || 'Cliente'}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
              {r.verified_purchase && (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Compra verificada
                </span>
              )}
            </div>
          </div>
        </div>
        <StarsDisplay value={r.rating} size={14} />
      </div>
      {r.title && <p className="text-sm font-semibold text-foreground">{r.title}</p>}
      {r.body && <p className="text-sm text-muted-foreground leading-relaxed">{r.body}</p>}
      {(r.images || []).length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(r.images as string[]).map((img, i) => (
            <button key={i} onClick={() => onOpenLightbox(img)}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-border hover:scale-105 transition-transform">
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-4 text-xs">
        <button onClick={() => onMarkHelpful(r.id, r.helpful_count ?? 0)} disabled={helpfulIds.has(r.id)}
          className={cn('flex items-center gap-1.5 font-medium transition-colors',
            helpfulIds.has(r.id) ? 'text-primary' : 'text-muted-foreground hover:text-primary')}>
          <ThumbsUp className={cn('w-3.5 h-3.5', helpfulIds.has(r.id) && 'fill-current')} />
          Útil ({r.helpful_count ?? 0})
        </button>
        <button onClick={() => onReport(r.id)} disabled={reportedIds.has(r.id)}
          className={cn('flex items-center gap-1.5 font-medium transition-colors',
            reportedIds.has(r.id) ? 'text-red-400' : 'text-muted-foreground hover:text-red-500')}>
          <Flag className="w-3.5 h-3.5" />
          {reportedIds.has(r.id) ? 'Reportada' : 'Reportar'}
        </button>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function ProductDetailPage() {
  const database = useDatabase();
  const storage = useStorage();
  const slug = window.location.pathname.split('/').filter(p => p && p !== 'tienda').pop() || '';
  const { addItem, items } = useCart();
  const { user } = useAuthStore();
  const { exchangeRate, showUsd, setShowUsd, company, currencySymbol } = useConfig();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews' | 'digital'>('description');
  const [reviewForm, setReviewForm] = useState({ rating: 0, title: '', body: '', images: [] as string[] });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [helpfulIds, setHelpfulIds] = useState<Set<string>>(new Set());
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const isAdmin = ['admin', 'super_admin'].includes((user as any)?.role || '');

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    const { data } = await database.select<Product>('products', {
      select: '*, category:product_categories(id,name,slug), variants:product_variants(*)',
      filter: [
        { column: 'slug', operator: 'eq', value: slug },
        { column: 'status', operator: 'eq', value: 'active' },
      ],
      maybeSingle: true,
    });

    if (!data) { setLoading(false); return; }
    const p = data as Product;
    setProduct(p);

    const activeVariants = ((p.variants || []) as ProductVariant[])
      .filter(v => v.status === 'active')
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    if (activeVariants.length > 0) {
      setSelectedVariant(activeVariants[0]);
      const initAttrs: Record<string, string> = {};
      Object.keys(activeVariants[0].attributes || {}).forEach(k => {
        initAttrs[k] = activeVariants[0].attributes[k];
      });
      setSelectedAttrs(initAttrs);
    }

    const [{ data: revs }, { data: wl }] = await Promise.all([
      database.select('product_reviews', {
        select: '*, profile:profiles(full_name,avatar_url)',
        filter: [
          { column: 'product_id', operator: 'eq', value: p.id },
          { column: 'status', operator: 'eq', value: 'approved' },
        ],
        order: { column: 'helpful_count', ascending: false },
      }),
      user ? database.select('wishlists', { select: 'id', filter: [{ column: 'user_id', operator: 'eq', value: user.id }, { column: 'product_id', operator: 'eq', value: p.id }], maybeSingle: true })
           : Promise.resolve({ data: null }),
    ]);
    setReviews((revs || []) as ProductReview[]);
    setIsWishlisted(!!wl);

    const saved = sessionStorage.getItem('compare');
    if (saved) setCompareList(JSON.parse(saved));

    if (p.category_id) {
      const { data: rel } = await database.select<Product>('products', {
        select: '*, variants:product_variants(id,price,stock,status,attributes,attribute_type,color_name)',
        filter: [
          { column: 'status', operator: 'eq', value: 'active' },
          { column: 'category_id', operator: 'eq', value: p.category_id },
          { column: 'id', operator: 'neq', value: p.id },
        ],
        limit: 8,
      });
      setRelated((rel as Product[]) || []);
    }
    setLoading(false);
  }, [slug, user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (product) {
      setProductSchema(product, {
        companyName: company.company_name || '',
        websiteUrl: company.website_url || window.location.origin,
      });
    } else {
      clearProductSchema();
    }
    return () => clearProductSchema();
  }, [product, company.company_name, company.website_url]);

  const variants = product
    ? ((product.variants || []) as ProductVariant[])
        .filter(v => v.status === 'active')
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    : [];

  const attrKeys = variants.length > 0
    ? [...new Set(variants.flatMap(v => Object.keys(v.attributes || {})))] : [];

  const resolveVariant = (attrs: Record<string, string>) =>
    variants.find(v => Object.keys(attrs).every(k => v.attributes[k] === attrs[k])) || null;

  const handleAttrSelect = (key: string, value: string) => {
    const newAttrs = { ...selectedAttrs, [key]: value };
    setSelectedAttrs(newAttrs);
    const found = resolveVariant(newAttrs);
    if (found) setSelectedVariant(found);
  };

  const currentPrice = (selectedVariant?.price && selectedVariant.price > 0)
    ? selectedVariant.price : (product?.base_price ?? 0);
  const currentCompare = (selectedVariant?.compare_price && selectedVariant.compare_price > 0)
    ? selectedVariant.compare_price : product?.compare_price;
  const discount = currentCompare && currentCompare > currentPrice
    ? Math.round(((currentCompare - currentPrice) / currentCompare) * 100) : 0;

  const hasVariants = variants.length > 0;
  const stock = selectedVariant
    ? selectedVariant.stock
    : hasVariants
    ? variants.reduce((s, v) => s + (v.stock || 0), 0)
    : (product?.general_stock ?? 99);
  const outOfStock = !!(product?.track_stock && stock === 0);
  const lowStock = !!(product?.track_stock && stock > 0 && stock <= 10);

  const allMedia: MediaItem[] = useMemo(() => [
    ...(product?.images || []).map(i => ({ url: i.url, alt: i.alt, isVideo: false })),
    ...(product?.videos || []).map(v => ({ url: v.url, alt: 'Video', isVideo: true, thumbnail: v.thumbnail })),
  ], [product]);

  const handleAdd = () => {
    if (!product || outOfStock) return;
    addItem(product, selectedVariant ?? undefined, qty);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 3000);
    toast.success('Agregado al carrito', {
      description: `${qty}× ${product.name}`,
      action: { label: 'Ir al carrito', onClick: () => navigate('/carrito') },
    });
  };

  const handleBuyNow = () => {
    if (!product || outOfStock) return;
    addItem(product, selectedVariant ?? undefined, qty);
    navigate('/checkout');
  };

  const toggleWishlist = async () => {
    if (!user) { navigate('/login'); return; }
    if (!product) return;
    if (isWishlisted) {
      await database.deleteWhere('wishlists', { user_id: user.id, product_id: product.id });
    } else {
      await database.insert('wishlists', { user_id: user.id, product_id: product.id });
      toast.success('Guardado en favoritos');
    }
    setIsWishlisted(v => !v);
  };

  const toggleCompare = () => {
    if (!product) return;
    const next = compareList.includes(product.id)
      ? compareList.filter(id => id !== product.id)
      : compareList.length >= 3
      ? (toast.error('Máximo 3 para comparar'), compareList)
      : [...compareList, product.id];
    setCompareList(next);
    sessionStorage.setItem('compare', JSON.stringify(next));
    if (!compareList.includes(product.id)) toast.success('Agregado para comparar');
  };

  const uploadReviewImg = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('Máx 5MB'); return; }
    setUploadingImg(true);
    const path = `reviews/${Date.now()}.${file.name.split('.').pop()}`;
    const { success, url } = await storage.upload('products', path, file, { upsert: false });
    if (success && url) {
      setReviewForm(p => ({ ...p, images: [...p.images, url] }));
    } else toast.error('Error al subir imagen');
    setUploadingImg(false);
  };

  const submitReview = async () => {
    if (!product || !user) { navigate('/login'); return; }
    if (reviewForm.rating === 0) { toast.error('Selecciona una calificación'); return; }
    setSubmittingReview(true);
    const { error } = await database.insert('product_reviews', {
      product_id: product.id, user_id: user.id,
      rating: reviewForm.rating, title: reviewForm.title || null,
      body: reviewForm.body || null, images: reviewForm.images,
    });
    if (error) toast.error('Error al enviar reseña. Intenta de nuevo.');
    else {
      toast.success('¡Reseña enviada! Estará visible tras aprobación.');
      setReviewForm({ rating: 0, title: '', body: '', images: [] });
    }
    setSubmittingReview(false);
  };

  const markHelpful = async (reviewId: string, currentCount: number) => {
    if (helpfulIds.has(reviewId)) return;
    setHelpfulIds(s => new Set([...s, reviewId]));
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, helpful_count: (r.helpful_count ?? 0) + 1 } : r));
    await database.update('product_reviews', reviewId, { helpful_count: currentCount + 1 });
    toast.success('Marcado como útil');
  };

  const reportReview = async (reviewId: string) => {
    if (reportedIds.has(reviewId)) { toast.info('Ya reportaste esta reseña'); return; }
    setReportedIds(s => new Set([...s, reviewId]));
    toast.success('Reseña reportada — la revisaremos pronto');
  };

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const ratingDist = [5, 4, 3, 2, 1].map(n => ({
    n, count: reviews.filter(r => r.rating === n).length,
    pct: reviews.length > 0 ? (reviews.filter(r => r.rating === n).length / reviews.length) * 100 : 0,
  }));

  const specs = (product as any)?.specs || {};
  const hasSpecs = Object.keys(specs).length > 0;
  const inCart = items.some(i => i.product.id === product?.id &&
    (!selectedVariant || i.variant?.id === selectedVariant.id));

  const tabs = [
    { id: 'description' as const, label: 'Descripción', icon: Info },
    ...(hasSpecs ? [{ id: 'specs' as const, label: 'Especificaciones', icon: Layers }] : []),
    { id: 'reviews' as const, label: `Reseñas (${reviews.length})`, icon: MessageSquare },
    ...(product?.is_digital ? [{ id: 'digital' as const, label: 'Producto digital', icon: Download }] : []),
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="pt-16 max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-3">
            <div className="aspect-square bg-muted rounded-2xl animate-pulse" />
            <div className="flex gap-2">{[...Array(4)].map((_, i) => <div key={i} className="w-16 h-16 bg-muted rounded-xl animate-pulse" />)}</div>
          </div>
          <div className="lg:col-span-7 space-y-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-6 bg-muted rounded animate-pulse" style={{ width: `${60 + i * 5}%` }} />)}
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="pt-16 flex flex-col items-center justify-center gap-4 px-4 text-center min-h-[60vh]">
          <Package className="w-16 h-16 text-muted-foreground/20" />
          <h2 className="text-xl font-semibold text-foreground">Producto no encontrado</h2>
          <button onClick={() => navigate('/tienda')}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm">
            Ir a la tienda
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Breadcrumb */}
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <button onClick={() => navigate('/')} className="hover:text-foreground transition-colors">Inicio</button>
          <span className="text-muted-foreground/40">/</span>
          <button onClick={() => navigate('/tienda')} className="hover:text-foreground transition-colors">Tienda</button>
          {product.category && (<>
            <span className="text-muted-foreground/40">/</span>
            <button onClick={() => navigate(`/tienda?cat=${product.category_id}`)} className="hover:text-foreground transition-colors capitalize">
              {(product.category as any).name}
            </button>
          </>)}
          <span className="text-muted-foreground/40">/</span>
          <span className="text-foreground font-medium truncate max-w-[140px] sm:max-w-[240px]">{product.name}</span>
          {isAdmin && (
            <button onClick={() => navigate(`/dashboard/admin/productos/${product.id}`)}
              className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors">
              Editar producto
            </button>
          )}
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

          {/* ── LEFT: Gallery ── */}
          <div className="lg:col-span-5 space-y-3">
            <SwipeGallery
              media={allMedia} altName={product.name}
              discount={discount} featured={product.featured} isDigital={!!product.is_digital}
              onOpenLightbox={setLightboxImg} />

            {/* Trust badges */}
            <div className="hidden sm:flex items-center gap-6 pt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-primary" /> Envío rápido</span>
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-primary" /> Pago seguro</span>
              <span className="flex items-center gap-1.5"><RotateCcw className="w-4 h-4 text-primary" /> 30 días devolución</span>
            </div>
          </div>

          {/* ── RIGHT: Info ── */}
          <div className="lg:col-span-7 space-y-5">
            {product.category && (
              <button onClick={() => navigate(`/tienda?cat=${product.category_id}`)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                <Tag className="w-3 h-3" />
                {(product.category as any).name}
              </button>
            )}

            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground leading-tight">{product.name}</h1>

            {reviews.length > 0 ? (
              <button onClick={() => { setActiveTab('reviews'); document.getElementById('product-tabs')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="flex items-center gap-2 group">
                <StarsDisplay value={avgRating} size={16} />
                <span className="text-sm font-semibold text-foreground">{avgRating.toFixed(1)}</span>
                <span className="text-sm text-primary underline-offset-2 group-hover:underline">
                  {reviews.length} valoraciones
                </span>
              </button>
            ) : (
              <button onClick={() => { setActiveTab('reviews'); document.getElementById('product-tabs')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Sin valoraciones — ¡sé el primero!
              </button>
            )}

            {/* Price */}
            <div className="space-y-1.5">
              <div className="flex items-end gap-3 flex-wrap">
                <span className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
                  {fmtPrice(currentPrice, showUsd, exchangeRate, currencySymbol)}
                </span>
                {currentCompare && currentCompare > currentPrice && (
                  <span className="text-lg text-muted-foreground line-through pb-1">
                    {fmtPrice(currentCompare, showUsd, exchangeRate, currencySymbol)}
                  </span>
                )}
                {discount > 0 && (
                  <span className="text-sm font-bold text-red-500">-{discount}% OFF</span>
                )}
              </div>
              {discount > 0 && (
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  Ahorras {fmtPrice(currentCompare! - currentPrice, showUsd, exchangeRate, currencySymbol)}
                </p>
              )}
              <div className="flex items-center gap-3 pt-1">
                {product.sku && (
                  <span className="text-xs text-muted-foreground">
                    SKU: <span className="font-mono">{selectedVariant?.sku || product.sku}</span>
                  </span>
                )}
                <button onClick={() => setShowUsd(!showUsd)}
                  className={cn('text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all',
                    showUsd ? 'bg-primary/10 text-primary border-primary/30' : 'text-muted-foreground border-border hover:border-primary/40 hover:text-foreground')}>
                  {showUsd ? 'USD' : 'PEN'}
                </button>
              </div>
            </div>

            {product.short_description && (
              <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed">{product.short_description}</p>
            )}

            {/* Variant selectors */}
            {attrKeys.map(key => {
              const uniqueVals = [...new Set(variants.map(v => v.attributes[key]).filter(Boolean))];
              if (!uniqueVals.length) return null;
              const isColorAttr = key.toLowerCase().includes('color');
              const selectedVal = selectedAttrs[key];

              return (
                <div key={key} className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{key}:</span>
                    {selectedVal && (
                      <span className="text-sm text-muted-foreground">
                        {(() => {
                          const v = variants.find(vv => vv.attributes[key] === selectedVal);
                          return (v as any)?.color_name || selectedVal;
                        })()}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {uniqueVals.map(val => {
                      const variantForVal = variants.find(v => v.attributes[key] === val);
                      const isSelected = selectedAttrs[key] === val;
                      const isOos = product.track_stock && variantForVal && variantForVal.stock === 0;
                      const attrType = (variantForVal as any)?.attribute_type || (isColorAttr ? 'color' : 'text');
                      const colorName = (variantForVal as any)?.color_name || val;
                      const isHex = /^#[0-9a-f]{3,8}$/i.test(val);

                      if (attrType === 'color' || (isColorAttr && isHex)) {
                        return (
                          <button key={val} onClick={() => !isOos && handleAttrSelect(key, val)}
                            disabled={!!isOos} title={colorName}
                            className={cn('relative w-10 h-10 rounded-full border-2 transition-all',
                              isSelected ? 'border-primary scale-110' : 'border-border hover:border-primary/50',
                              isOos && 'opacity-40 cursor-not-allowed')}
                            style={{ backgroundColor: val }}>
                            {isSelected && <div className="absolute inset-0 flex items-center justify-center"><div className="w-2.5 h-2.5 rounded-full bg-white shadow" /></div>}
                          </button>
                        );
                      }

                      const swatchImg = variantForVal?.images?.[0]?.url;
                      if (attrType === 'image' && swatchImg) {
                        return (
                          <button key={val} onClick={() => !isOos && handleAttrSelect(key, val)}
                            disabled={!!isOos} title={val}
                            className={cn('w-12 h-12 rounded-xl overflow-hidden border-2 transition-all',
                              isSelected ? 'border-primary' : 'border-border hover:border-primary/50',
                              isOos && 'opacity-40 cursor-not-allowed')}>
                            <img src={swatchImg} alt={val} className="w-full h-full object-cover" />
                          </button>
                        );
                      }

                      return (
                        <button key={val} onClick={() => !isOos && handleAttrSelect(key, val)}
                          disabled={!!isOos}
                          className={cn('px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                            isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:border-primary/50 hover:bg-muted/50',
                            isOos && 'opacity-40 cursor-not-allowed line-through')}>
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Stock indicator */}
            <div className="flex items-center gap-2">
              {outOfStock ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-500">
                  <span className="w-2 h-2 rounded-full bg-red-500" /> Sin stock
                </span>
              ) : lowStock ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-500">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  ¡Solo {stock} disponibles!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> En stock
                </span>
              )}
            </div>

            {/* Qty + actions */}
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center border border-border rounded-xl overflow-hidden">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-muted transition-colors active:bg-muted/80">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-11 text-center text-sm font-semibold select-none">{qty}</span>
                  <button onClick={() => !outOfStock && setQty(q => Math.min(q + 1, stock > 0 ? stock : 99))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-muted transition-colors active:bg-muted/80">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button onClick={toggleWishlist}
                  className={cn('w-10 h-10 rounded-xl border flex items-center justify-center transition-all',
                    isWishlisted ? 'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-500' : 'border-border text-muted-foreground hover:border-red-300 hover:text-red-400')}>
                  <Heart className={cn('w-5 h-5', isWishlisted && 'fill-current')} />
                </button>
                <button onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Enlace copiado'); }}
                  className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">
                  <Share2 className="w-4 h-4" />
                </button>
                <button onClick={toggleCompare}
                  className={cn('w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-bold transition-all',
                    compareList.includes(product.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground')}>
                  VS
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={handleBuyNow} disabled={outOfStock}
                  className={cn('flex items-center justify-center gap-2 py-3.5 sm:py-4 rounded-xl font-semibold text-sm transition-all',
                    outOfStock ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]')}>
                  <Zap className="w-4 h-4" />
                  {outOfStock ? 'Sin stock' : 'Comprar ahora'}
                </button>
                <button onClick={handleAdd} disabled={outOfStock}
                  className={cn('flex items-center justify-center gap-2 py-3.5 sm:py-4 rounded-xl font-semibold text-sm border-2 transition-all',
                    addedToCart ? 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' :
                    outOfStock ? 'border-border text-muted-foreground cursor-not-allowed' :
                    'border-primary text-primary hover:bg-primary/5 active:scale-[0.98]')}>
                  {addedToCart
                    ? <><CheckCircle className="w-4 h-4" /> ¡En tu carrito!</>
                    : <><ShoppingCart className="w-4 h-4" /> Agregar al carrito</>}
                </button>
              </div>

              {inCart && !addedToCart && (
                <button onClick={() => navigate('/carrito')}
                  className="w-full text-center text-sm text-primary font-medium hover:underline">
                  Ya tienes este producto en el carrito → ver carrito
                </button>
              )}

              {product.is_digital && (product as any).digital_demo_url && (
                <button onClick={() => setShowDemo(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-primary/30 text-primary bg-primary/5 rounded-xl font-semibold text-sm hover:bg-primary/10 transition-colors">
                  <Eye className="w-4 h-4" />
                  Ver demostración gratuita
                </button>
              )}
            </div>

            {compareList.length >= 2 && (
              <button onClick={() => navigate(`/tienda/comparar?ids=${compareList.join(',')}`)}
                className="w-full py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 rounded-xl transition-colors">
                Comparar {compareList.length} productos seleccionados →
              </button>
            )}
          </div>
        </div>

        {/* ── STICKY TABS ── */}
        <div className="mt-10 sm:mt-12" id="product-tabs">
          <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b border-border -mx-4 sm:mx-0 px-4 sm:px-0">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={cn('flex items-center gap-2 py-3.5 px-4 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors flex-shrink-0',
                    activeTab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content — uses full width for reviews, constrained for text */}
          <div className="pt-6 sm:pt-8">
            {activeTab === 'description' && (
              <div className="max-w-4xl">
                <DescriptionRenderer text={product.description || ''} />
              </div>
            )}

            {activeTab === 'specs' && hasSpecs && (
              <dl className="max-w-4xl grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                {Object.entries(specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-3 border-b border-border">
                    <dt className="text-sm font-semibold text-foreground capitalize flex-shrink-0">{k}</dt>
                    <dd className="text-sm text-muted-foreground text-right">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            )}

            {activeTab === 'digital' && product.is_digital && (
              <div className="max-w-4xl space-y-5">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Producto digital — entrega instantánea</p>
                    <p className="text-sm text-muted-foreground mt-1">Recibirás acceso inmediato tras confirmar el pago.</p>
                  </div>
                </div>
                {product.digital_instructions && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">Instrucciones de acceso</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{product.digital_instructions}</p>
                  </div>
                )}
                {(product as any).digital_demo_url && (
                  <button onClick={() => setShowDemo(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors">
                    <Play className="w-4 h-4" /> Ver demostración gratuita
                  </button>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <ReviewsSection
                reviews={reviews} avgRating={avgRating} ratingDist={ratingDist}
                helpfulIds={helpfulIds} reportedIds={reportedIds}
                onMarkHelpful={markHelpful} onReport={reportReview} onOpenLightbox={setLightboxImg}
                reviewForm={reviewForm} setReviewForm={setReviewForm}
                uploadingImg={uploadingImg} onUploadImg={uploadReviewImg}
                submittingReview={submittingReview} onSubmitReview={submitReview}
                user={user} navigate={navigate}
              />
            )}
          </div>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <div className="mt-12 sm:mt-16">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-5">También te puede interesar</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 lg:gap-6">
              {related.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-lg transition-colors">✕</button>
          <img src={lightboxImg} alt="" className="max-w-full max-h-full rounded-xl object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Digital demo modal */}
      {showDemo && (product as any).digital_demo_url && (() => {
        const raw: string = ((product as any).digital_demo_url as string).trim();
        const isVideoFile = /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(raw);
        const ytMatch = raw.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        const vimeoMatch = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        const embedUrl = ytMatch
          ? 'https://www.youtube.com/embed/' + ytMatch[1] + '?autoplay=1&rel=0'
          : vimeoMatch
          ? 'https://player.vimeo.com/video/' + vimeoMatch[1] + '?autoplay=1'
          : null;
        const isWebPage = !isVideoFile && !embedUrl;

        return (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowDemo(false)}>
            <div className="bg-card rounded-2xl overflow-hidden shadow-2xl w-full max-w-3xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <Eye className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="font-semibold text-foreground truncate">Demostración — {product.name}</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium flex-shrink-0">GRATIS</span>
                </div>
                <button onClick={() => setShowDemo(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground flex-shrink-0">✕</button>
              </div>

              {isWebPage ? (
                <div className="p-6 text-center space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                    <ExternalLink className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Demo disponible en sitio externo</p>
                    <p className="text-xs text-muted-foreground break-all mt-1">{raw}</p>
                  </div>
                  <a href={raw} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm transition-colors"
                    onClick={() => setShowDemo(false)}>
                    <ExternalLink className="w-4 h-4" /> Abrir demostración
                  </a>
                </div>
              ) : (
                <div className="aspect-video bg-black">
                  {isVideoFile ? (
                    <video src={raw} controls autoPlay className="w-full h-full" />
                  ) : (
                    <iframe src={embedUrl!} className="w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title="Demo" />
                  )}
                </div>
              )}

              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Contenido completo disponible tras la compra</span>
                </div>
                <button onClick={() => { setShowDemo(false); handleBuyNow(); }}
                  className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors flex-shrink-0">
                  Comprar ahora
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <Footer />
    </div>
  );
}
