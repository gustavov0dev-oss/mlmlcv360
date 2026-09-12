import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProductReviews } from '@/hooks/useProductReviews';
import { supabase } from '@/lib/backend/client';
import { LoadingRegion } from '@/components/ui/loading-region';
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
import type { Product, ProductVariant, ProductReview, ProductReviewReply } from '@/lib/storeTypes';
import {
  ShoppingCart, Star, ChevronLeft, ChevronRight, Plus, Minus,
  Truck, Shield, RotateCcw, Heart, Share2, Package, Tag, MessageSquare,
  Layers, Upload, ThumbsUp, Flag, CircleCheck as CheckCircle,
  Play, Eye, Lock, Zap, Info, ExternalLink, Image as ImageIcon,
  SlidersHorizontal, X, CornerDownRight, MessageCircle, Send,
  BadgeCheck,
} from 'lucide-react';

/* ─── helpers ─── */
function fmtPrice(n: number, showUsd: boolean, rate: number, symbol: string) {
  if (showUsd) return `${(n / rate).toFixed(2)}`;
  return `${symbol} ${n.toFixed(2)}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const month = Math.floor(day / 30);
  const year = Math.floor(day / 365);
  if (year >= 1) return `hace ${year} ${year === 1 ? 'año' : 'años'}`;
  if (month >= 1) return `hace ${month} ${month === 1 ? 'mes' : 'meses'}`;
  if (day >= 1) return `hace ${day} ${day === 1 ? 'día' : 'días'}`;
  if (hr >= 1) return `hace ${hr} ${hr === 1 ? 'hora' : 'horas'}`;
  if (min >= 1) return `hace ${min} ${min === 1 ? 'minuto' : 'minutos'}`;
  return 'hace un momento';
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
            onClick={() => onChange(i + 1)} aria-label={`${i + 1} de 5 estrellas`} aria-pressed={value === i + 1} className="p-1 rounded-md focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary">
            <Star className={cn('w-7 h-7 transition-colors',
              i < (hover || value) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20')} />
          </button>
        ))}
      </div>
      {(hover || value) > 0 && (
        <span className="text-xs font-medium text-muted-foreground">
          {labels[hover || value]}
        </span>
      )}
    </div>
  );
}

/* Rich description renderer */
function DescriptionRenderer({ text }: { text: string }) {
  if (!text) return <p className="text-muted-foreground text-sm">Sin descripción disponible.</p>;

  const blocks = text.split(/\n{2,}/g);
  return (
    <div className="space-y-4 max-w-3xl">
      {blocks.map((block, bi) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imgMatch) {
          return (
            <figure key={bi} className="rounded-lg overflow-hidden">
              <img src={imgMatch[2]} alt={imgMatch[1]}
                className="w-full object-cover max-h-[420px]" loading="lazy" />
              {imgMatch[1] && <figcaption className="text-xs text-muted-foreground text-center pt-2">{imgMatch[1]}</figcaption>}
            </figure>
          );
        }

        const galleryMatches = [...trimmed.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
        if (galleryMatches.length > 1) {
          return (
            <div key={bi} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {galleryMatches.map((m, i) => (
                <div key={i} className="rounded-lg overflow-hidden aspect-square">
                  <img src={m[2]} alt={m[1]} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          );
        }

        if (trimmed.startsWith('## ')) {
          return <h3 key={bi} className="text-base font-semibold text-foreground pt-2">{trimmed.slice(3)}</h3>;
        }
        if (trimmed.startsWith('# ')) {
          return <h2 key={bi} className="text-lg font-semibold text-foreground pt-2">{trimmed.slice(2)}</h2>;
        }

        const lines = trimmed.split('\n');
        const isList = lines.every(l => l.startsWith('- ') || l.startsWith('* '));
        if (isList) {
          return (
            <ul key={bi} className="space-y-2">
              {lines.map((l, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80 leading-relaxed">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/40 mt-2 flex-shrink-0" />
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
          <p key={bi} className="text-sm text-foreground/70 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: inlined }} />
        );
      })}
    </div>
  );
}

/* ─── Swipe gallery ─── */
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
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50, active: false });

  const scrollToIdx = useCallback((idx: number, smooth = true) => {
    const el = trackRef.current;
    if (!el) return;
    const slide = el.children[idx] as HTMLElement | undefined;
    if (slide) slide.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', inline: 'center', block: 'nearest' });
  }, []);

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

  const onPointerDown = (e: React.PointerEvent) => {
    const el = trackRef.current; if (!el) return;
    if (e.pointerType === 'touch') return;
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

  const onZoomMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!media[active] || media[active].isVideo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y, active: true });
  };

  if (media.length === 0) {
    return (
      <div className="relative w-full overflow-hidden bg-muted/30 rounded-lg flex items-center justify-center border border-border" style={{ aspectRatio: '1 / 1' }}>
        <Package className="w-16 h-16 text-muted-foreground/20" />
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="relative w-full overflow-hidden bg-muted/20 rounded-lg border border-border group">
        {discount > 0 && (
          <span className="absolute top-3 left-3 z-20 bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1">
            <Tag className="w-3 h-3" /> -{discount}%
          </span>
        )}
        {featured && (
          <span className="absolute top-3 right-3 z-20 bg-foreground text-background text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" /> Destacado
          </span>
        )}
        {isDigital && (
          <span className="absolute bottom-3 left-3 z-20 bg-foreground/80 text-background text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1">
            <Zap className="w-3 h-3" /> Digital
          </span>
        )}

        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide touch-pan-y"
          style={{ scrollSnapType: 'x mandatory', cursor: 'zoom-in' }}
        >
          {media.map((m, i) => (
            <div
              key={i}
              className="snap-center shrink-0 w-full relative"
              style={{ aspectRatio: '1 / 1' }}
              onMouseMove={onZoomMove}
              onMouseLeave={() => setZoomPos(p => ({ ...p, active: false }))}
            >
              {m.isVideo ? (
                <video src={m.url} controls poster={m.thumbnail}
                  className="w-full h-full object-cover" />
              ) : (
                <img
                  src={m.url}
                  alt={m.alt || altName}
                  draggable={false}
                  className="w-full h-full object-cover select-none transition-transform duration-200"
                  style={
                    i === active && zoomPos.active
                      ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`, transform: 'scale(1.8)' }
                      : undefined
                  }
                  onClick={(e) => { if (!dragState.current.moved) onOpenLightbox(m.url); e.stopPropagation(); }}
                  onDragStart={(e) => e.preventDefault()}
                  loading={i === 0 ? 'eager' : 'lazy'}
                />
              )}
            </div>
          ))}
        </div>

        {media.length > 1 && (<>
          <button onClick={() => scrollToIdx(active - 1 < 0 ? media.length - 1 : active - 1)}
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-background/90 border border-border rounded-full items-center justify-center z-10 hover:bg-background transition-colors text-foreground">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => scrollToIdx(active + 1 >= media.length ? 0 : active + 1)}
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-background/90 border border-border rounded-full items-center justify-center z-10 hover:bg-background transition-colors text-foreground">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 right-3 z-20 bg-foreground/70 text-background text-[11px] font-medium px-2 py-0.5 rounded-md sm:hidden">
            {active + 1} / {media.length}
          </div>
        </>)}
      </div>

      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {media.map((m, i) => (
            <button key={i} onClick={() => scrollToIdx(i)}
              className={cn(
                'flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-md overflow-hidden border transition-colors',
                active === i ? 'border-primary' : 'border-border hover:border-muted-foreground/40'
              )}>
              {m.isVideo
                ? <div className="w-full h-full bg-muted flex items-center justify-center"><Play className="w-3.5 h-3.5 text-muted-foreground" /></div>
                : <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Benefits strip — plain inline row, no cards ─── */
function BenefitsStrip() {
  const items = [
    { icon: Truck, label: 'Envío rápido' },
    { icon: Shield, label: 'Pago seguro' },
    { icon: RotateCcw, label: '30 días de devolución' },
    { icon: BadgeCheck, label: 'Garantía' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5 text-sm text-muted-foreground">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <item.icon className="w-4 h-4 flex-shrink-0" />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Reviews section ─── */
type SortKey = 'helpful' | 'recent' | 'high' | 'low';

function ReviewsSection({
  reviews, avgRating, ratingDist, total, loadingReviews, reviewError, hasMore, loadMore, filters, setFilters, helpfulIds, reportedIds, likedReplyIds,
  onMarkHelpful, onLikeReply, onReport, onOpenLightbox, onReply,
  reviewForm, setReviewForm, uploadingImg, onUploadImg, submittingReview, onSubmitReview, user, navigate,
}: {
  total: number; loadingReviews: boolean; reviewError: string; hasMore: boolean; loadMore: () => void;
  filters: { sort: SortKey; star: number; photos: boolean; verified: boolean };
  setFilters: React.Dispatch<React.SetStateAction<{ sort: SortKey; star: number; photos: boolean; verified: boolean }>>;
  reviews: ProductReview[]; avgRating: number; ratingDist: { n: number; count: number; pct: number }[];
  helpfulIds: Set<string>; reportedIds: Set<string>; likedReplyIds: Set<string>;
  onMarkHelpful: (id: string, count: number) => void;
  onLikeReply: (id: string) => void;
  onReport: (id: string) => void;
  onOpenLightbox: (url: string) => void;
  onReply: (reviewId: string, body: string) => Promise<void>;
  reviewForm: { rating: number; title: string; body: string; images: string[] };
  setReviewForm: React.Dispatch<React.SetStateAction<{ rating: number; title: string; body: string; images: string[] }>>;
  uploadingImg: boolean; onUploadImg: (f: File) => void;
  submittingReview: boolean; onSubmitReview: () => void;
  user: any; navigate: (path: string) => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  useEffect(() => {
    if (formOpen) document.getElementById('product-review-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [formOpen]);
  const sentinel = useRef<HTMLDivElement>(null);
  const { star: starFilter, photos: photosOnly, verified: verifiedOnly, sort } = filters;
  const setStarFilter = (star: number) => setFilters(p => ({ ...p, star }));
  const activeFilters = starFilter > 0 || photosOnly || verifiedOnly;
  const clearFilters = () => setFilters(p => ({ ...p, star: 0, photos: false, verified: false }));
  useEffect(() => {
    if (!hasMore || loadingReviews || reviewError) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: '240px' });
    if (sentinel.current) observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [hasMore, loadingReviews, reviewError, loadMore]);
  const wasSubmitting = useRef(false);
  useEffect(() => {
    if (wasSubmitting.current && !submittingReview && reviewForm.rating === 0) setFormOpen(false);
    wasSubmitting.current = submittingReview;
  }, [submittingReview, reviewForm.rating]);
  const sortOptions: { value: SortKey; label: string }[] = [
    { value: 'helpful', label: 'Más útiles' },
    { value: 'recent', label: 'Más recientes' },
    { value: 'high', label: 'Mayor calificación' },
    { value: 'low', label: 'Menor calificación' },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12 py-6 max-w-6xl mx-auto">
      <aside className="self-start lg:sticky lg:top-24 space-y-5">
        <div>
          <h3 className="text-base font-semibold mb-3">Opiniones de clientes</h3>
          <div className="flex items-center gap-3">
            <span className="text-5xl font-semibold tracking-tight">{total ? avgRating.toFixed(1) : '—'}</span>
            <div className="space-y-1"><StarsDisplay value={avgRating} size={17} />
              <p className="text-sm text-muted-foreground">{total.toLocaleString('es-PE')} {total === 1 ? 'opinión' : 'opiniones'}</p>
            </div>
          </div>
        </div>
        <div className="space-y-1 max-w-sm">
          {ratingDist.map(({ n, count, pct }) => (
            <button key={n} onClick={() => setStarFilter(starFilter === n ? 0 : n)} aria-label={`Filtrar por ${n} estrellas: ${count} opiniones`} aria-pressed={starFilter === n}
              className={cn('w-full flex items-center gap-2 py-1 rounded-md text-sm hover:bg-muted/50', starFilter === n && 'text-primary bg-primary/5')}>
              <span>{n}</span><Star className="w-3 h-3 text-primary fill-primary" />
              <span className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"><span className="block h-full bg-primary rounded-full" style={{ width: `${pct}%` }} /></span>
              <span className="w-10 text-right text-xs text-muted-foreground">{Math.round(pct)}%</span>
            </button>
          ))}
        </div>
        <button aria-expanded={formOpen} aria-controls="product-review-form" onClick={() => { setFormOpen(v => !v); }} className="w-full sm:w-auto lg:w-full px-5 py-2.5 rounded-lg border border-primary/60 text-primary text-sm font-medium hover:bg-primary/10 transition-colors">Escribir reseña</button>
      </aside>
      <div className="min-w-0 space-y-5">
        {formOpen && <section id="product-review-form" aria-label="Escribir reseña" className="scroll-mt-28 max-w-xl space-y-4 pb-5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-semibold">Escribe tu reseña</h3>
            <button type="button" onClick={() => setFormOpen(false)} className="text-sm text-muted-foreground hover:text-foreground px-2 py-2">Cerrar</button>
          </div>
        {!user ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-foreground">Inicia sesión para escribir una reseña</p>
            <button onClick={() => navigate('/login')}
              className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors">
              Iniciar sesión
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-foreground mb-2.5">¿Cómo calificarías tu compra?</p>
              <StarPicker value={reviewForm.rating} onChange={v => setReviewForm(p => ({ ...p, rating: v }))} />
            </div>

            {reviewForm.rating > 0 && (<>
              <div>
                <label htmlFor="review-title" className="block text-sm font-medium mb-2">Título (opcional)</label>
                <input id="review-title" value={reviewForm.title}
                  onChange={e => setReviewForm(p => ({ ...p, title: e.target.value }))}
                  placeholder={reviewForm.rating >= 4 ? 'Ej: Excelente calidad, muy recomendado' : reviewForm.rating === 3 ? 'Ej: Bueno pero mejorable' : 'Ej: No cumplió mis expectativas'}
                  maxLength={100}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors" />
              </div>

              <div>
                <label htmlFor="review-body" className="block text-sm font-medium mb-2">Tu opinión</label>
                <textarea id="review-body" value={reviewForm.body}
                  onChange={e => setReviewForm(p => ({ ...p, body: e.target.value }))}
                  placeholder="¿Qué te gustó? ¿Qué no? ¿Volverías a comprarlo?"
                  rows={4} maxLength={1000}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary resize-none transition-colors" />
                <p className="text-xs text-muted-foreground text-right mt-1">{reviewForm.body.length}/1000</p>
              </div>

              <div>
                <p className="text-xs font-medium text-foreground mb-2">Fotos <span className="font-normal text-muted-foreground">(opcional)</span></p>
                <div className="flex gap-2 flex-wrap">
                  {reviewForm.images.map((img, i) => (
                    <div key={i} className="relative" style={{ width: 72, height: 72 }}>
                      <img src={img} alt="" className="w-full h-full rounded-lg object-cover border border-border" />
                      <button onClick={() => setReviewForm(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-foreground text-background rounded-full flex items-center justify-center text-xs font-bold">×</button>
                    </div>
                  ))}
                  {reviewForm.images.length < 5 && (
                    <label className={cn('rounded-lg border border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors',
                      uploadingImg ? 'opacity-50 cursor-not-allowed border-border' : 'border-border hover:border-primary')}
                      style={{ width: 72, height: 72 }}>
                      {uploadingImg
                        ? <span className="text-xs">Subiendo…</span>
                        : <>
                          <Upload className="w-4 h-4 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground mt-1">Foto</span>
                        </>}
                      <input type="file" accept="image/*" className="hidden" disabled={uploadingImg}
                        onChange={e => e.target.files?.[0] && onUploadImg(e.target.files[0])} />
                    </label>
                  )}
                </div>
              </div>

              <button onClick={onSubmitReview}
                disabled={submittingReview || uploadingImg || reviewForm.rating === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {submittingReview
                  ? 'Publicando…'
                  : 'Publicar reseña'}
              </button>
            </>)}
          </div>
        )}
        </section>}

      {total > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            {starFilter > 0 && (
              <button onClick={() => setStarFilter(0)}
                className="flex items-center gap-1 px-2.5 py-1 bg-muted text-foreground rounded-md text-xs font-medium">
                {starFilter} ★ <X className="w-3 h-3" />
              </button>
            )}
            <button aria-pressed={photosOnly} onClick={() => setFilters(p => ({ ...p, photos: !p.photos }))}
              className={cn('flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border transition-colors',
                photosOnly ? 'bg-primary/10 text-primary border-primary/40' : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40')}>
              <ImageIcon className="w-3.5 h-3.5" /> Con fotos
            </button>
            <button aria-pressed={verifiedOnly} onClick={() => setFilters(p => ({ ...p, verified: !p.verified }))}
              className={cn('flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border transition-colors',
                verifiedOnly ? 'bg-primary/10 text-primary border-primary/40' : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40')}>
              <CheckCircle className="w-3.5 h-3.5" /> Verificadas
            </button>
            {activeFilters && (
              <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground font-medium px-1 underline">Limpiar</button>
            )}
          </div>

          <Select value={sort} onValueChange={value => setFilters(p => ({ ...p, sort: value as SortKey }))}>
            <SelectTrigger aria-label="Ordenar opiniones" className="w-full sm:w-44 sm:ml-auto bg-background text-foreground shadow-none"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover text-popover-foreground border-border">
              {sortOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="min-h-[180px] space-y-0 divide-y divide-border/50">
        {reviews.map(r => (
          <div key={r.id} className="py-3">

          <ReviewCard r={r} helpfulIds={helpfulIds} reportedIds={reportedIds} likedReplyIds={likedReplyIds}
            onMarkHelpful={onMarkHelpful} onLikeReply={onLikeReply} onReport={onReport} onOpenLightbox={onOpenLightbox}
            onReply={onReply} user={user} />
          </div>
        ))}

        {reviews.length === 0 && total > 0 && !loadingReviews && !reviewError && (
          <div className="text-center py-10 space-y-2">
            <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/20" />
            <p className="text-sm font-medium text-foreground">Sin reseñas con estos filtros</p>
            <button onClick={clearFilters} className="text-xs text-primary hover:underline font-medium">Ver todas</button>
          </div>
        )}

        {total === 0 && !loadingReviews && !reviewError && (
          <div className="text-center py-10 space-y-2">
            <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/20" />
            <p className="text-sm font-medium text-foreground">Sin reseñas aún</p>
            <p className="text-xs text-muted-foreground">Sé el primero en compartir tu experiencia</p>
          </div>
        )}

      </div>
        <div ref={sentinel} className="min-h-10 text-center text-sm text-muted-foreground" aria-live="polite">
          {loadingReviews ? 'Cargando opiniones…' : reviewError ? <><p>{reviewError}</p><button className="text-primary py-2" onClick={loadMore}>Reintentar</button></> : hasMore ? <button className="text-primary py-2" onClick={loadMore}>Ver más opiniones</button> : reviews.length > 0 ? 'Has visto todas las opiniones' : null}
        </div>
      </div>

    </div>
  );
}

function ReviewCard({
  r, helpfulIds, reportedIds, likedReplyIds, onMarkHelpful, onLikeReply, onReport, onOpenLightbox,
  onReply, user,
}: {
  r: ProductReview; helpfulIds: Set<string>; reportedIds: Set<string>;
  likedReplyIds: Set<string>;
  onMarkHelpful: (id: string, count: number) => void;
  onLikeReply: (id: string) => void;
  onReport: (id: string) => void;
  onOpenLightbox: (url: string) => void;
  onReply: (reviewId: string, body: string) => Promise<void>;
  user: any;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyOpen, setReplyOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showFullMedia, setShowFullMedia] = useState(false);

  const [extraReplies, setExtraReplies] = useState<ProductReviewReply[]>([]);
  const [moreReplies, setMoreReplies] = useState((r.replies?.length || 0) >= 3);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const replies = [...((r.replies as ProductReviewReply[]) || []), ...extraReplies].filter((reply, i, list) => list.findIndex(p => p.id === reply.id) === i);
  const loadReplies = async () => {
    if (loadingReplies) return;
    setLoadingReplies(true);
    const { data, error } = await supabase.from('product_review_replies').select('*').eq('review_id', r.id)
      .order('created_at').order('id').range(replies.length, replies.length + 9);
    if (error) toast.error('No pudimos cargar las respuestas');
    else { setExtraReplies(previous => [...previous, ...(data || [])]); setMoreReplies((data || []).length === 10); }
    setLoadingReplies(false);
  };
  const isLong = (r.body || '').length > 280;
  const displayBody = expanded || !isLong ? r.body : (r.body || '').slice(0, 280) + '…';
  const media = (r.images as string[]) || [];
  const visibleMedia = showFullMedia ? media : media.slice(0, 4);
  const fullName = (r.profile as any)?.full_name || 'Cliente';
  const avatarUrl = (r.profile as any)?.avatar_url;

  const handleReplySubmit = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    await onReply(r.id, replyText.trim());
    setReplyText('');
    setReplyOpen(false);
    setShowReplies(true);
    setSubmitting(false);
  };

  return (
    <div className="py-2">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full overflow-hidden bg-muted flex items-center justify-center text-muted-foreground font-medium text-xs flex-shrink-0">
          {avatarUrl
            ? <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
            : <span>{fullName[0].toUpperCase()}</span>}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">{fullName}</span>
            {r.verified_purchase && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle className="w-3 h-3" /> Compra verificada
              </span>
            )}
            <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
            <StarsDisplay value={r.rating} size={12} />
          </div>

          {r.title && <p className="text-sm font-medium text-foreground">{r.title}</p>}

          {displayBody && (
            <p className="text-base text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {displayBody}
              {isLong && (
                <button onClick={() => setExpanded(v => !v)}
                  className="ml-1.5 text-xs font-medium text-primary hover:underline">
                  {expanded ? 'Mostrar menos' : 'Mostrar más'}
                </button>
              )}
            </p>
          )}

          {media.length > 0 && (
            <div className="flex gap-2 flex-wrap pt-1">
              {visibleMedia.map((img, i) => (
                <button key={i} onClick={() => onOpenLightbox(img)}
                  className="rounded-md overflow-hidden border border-border hover:border-muted-foreground/40 transition-colors"
                  style={{ width: 72, height: 72 }}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
              {media.length > 4 && !showFullMedia && (
                <button onClick={() => setShowFullMedia(true)}
                  className="rounded-md border border-border bg-muted/30 flex items-center justify-center text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                  style={{ width: 72, height: 72 }}>
                  +{media.length - 4}
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 pt-1">
            <button onClick={() => onMarkHelpful(r.id, r.helpful_count ?? 0)} disabled={helpfulIds.has(r.id)}
              className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors',
                helpfulIds.has(r.id) ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50')}>
              <ThumbsUp className={cn('w-3.5 h-3.5', helpfulIds.has(r.id) && 'fill-current')} />
              Útil ({r.helpful_count ?? 0})
            </button>
            <button onClick={() => setReplyOpen(v => !v)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <MessageCircle className="w-3.5 h-3.5" /> Responder
            </button>
            <button onClick={() => onReport(r.id)} disabled={reportedIds.has(r.id)}
              className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors',
                reportedIds.has(r.id) ? 'text-muted-foreground/50' : 'text-muted-foreground/60 hover:text-foreground')}>
              <Flag className="w-3.5 h-3.5" />{reportedIds.has(r.id) ? "Reportada" : "Reportar"}
            </button>
          </div>

          {replyOpen && (
            <div className="flex gap-2 pt-1.5">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium text-[11px] flex-shrink-0">
                {user?.full_name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 space-y-2">
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Escribe una respuesta..."
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground outline-none focus:border-primary resize-none placeholder:text-muted-foreground"
                />
                <div className="flex items-center gap-2 justify-end">
                  <button onClick={() => { setReplyOpen(false); setReplyText(''); }}
                    className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleReplySubmit} disabled={!replyText.trim() || submitting}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {submitting ? <div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <Send className="w-3 h-3" />}
                    Responder
                  </button>
                </div>
              </div>
            </div>
          )}

          {replies.length > 0 && (
            <button onClick={() => setShowReplies(v => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline pt-1">
              <CornerDownRight className="w-3.5 h-3.5" />
              {showReplies ? 'Ocultar' : `Ver respuestas${moreReplies ? '' : ` (${replies.length})`}`}
            </button>
          )}

          {showReplies && replies.length > 0 && (
            <div className="space-y-3 pt-2 pl-2 border-l border-border ml-1">
              {replies.map(reply => (
                <ReplyCard
                  key={reply.id}
                  reply={reply}
                  liked={likedReplyIds.has(reply.id)}
                  onLike={() => onLikeReply(reply.id)}
                />
              ))}
              {moreReplies && <button disabled={loadingReplies} onClick={loadReplies} className="text-sm text-primary py-2">{loadingReplies ? 'Cargando respuestas…' : 'Ver más respuestas'}</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReplyCard({ reply, liked, onLike }: {
  reply: ProductReviewReply; liked: boolean; onLike: () => void;
}) {
  return (
    <div className="flex gap-2.5">
      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center font-medium text-[11px] flex-shrink-0',
        reply.is_company ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
        {reply.author_name?.[0]?.toUpperCase() || 'U'}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-foreground">{reply.author_name}</span>
          {reply.is_company && (
            <span className="text-[10px] font-medium text-primary">Empresa</span>
          )}
          {reply.author_role && !reply.is_company && (
            <span className="text-[10px] text-muted-foreground">{reply.author_role}</span>
          )}
          <span className="text-[11px] text-muted-foreground">{timeAgo(reply.created_at)}</span>
        </div>
        <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">{reply.body}</p>
        <button onClick={onLike} disabled={liked}
          className={cn('flex items-center gap-1 text-xs font-medium transition-colors',
            liked ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
          <ThumbsUp className={cn('w-3 h-3', liked && 'fill-current')} />
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
  const { exchangeRate, showUsd, company, currencySymbol } = useConfig();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const { reviews, setReviews, summary, filters, setFilters, loading: loadingReviews, error: reviewError, hasMore, loadMore } = useProductReviews(product?.id);
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
  const [likedReplyIds, setLikedReplyIds] = useState<Set<string>>(new Set());
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
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

    const { data: wl } = user ? await database.select('wishlists', { select: 'id', filter: [{ column: 'user_id', operator: 'eq', value: user.id }, { column: 'product_id', operator: 'eq', value: p.id }], maybeSingle: true }) : { data: null };
    setIsWishlisted(!!wl);

    const saved = sessionStorage.getItem('compare');
    if (saved) setCompareList(JSON.parse(saved));

    {
      const { data: rel } = await database.select<Product>('products', {
        select: '*, variants:product_variants(id,price,stock,status,attributes,attribute_type,color_name)',
        filter: [
          { column: 'status', operator: 'eq', value: 'active' },
          { column: 'id', operator: 'neq', value: p.id },
        ],
        limit: 8,
      });
      setRelated(((rel as Product[]) || []).sort((a,b)=>Number(b.category_id===p.category_id)-Number(a.category_id===p.category_id)).slice(0,5));
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

  useEffect(() => {
    const handler = () => {
      const buySection = document.getElementById('buy-section');
      if (!buySection) return;
      const rect = buySection.getBoundingClientRect();
      setShowStickyBar(rect.bottom < 80);
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [loading]);

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

  const handleAdd = async () => {
    if (!product || outOfStock) return;
    if (!await addItem(product, selectedVariant ?? undefined, qty)) return;
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 3000);
    toast.success('Agregado al carrito', {
      description: `${qty}× ${product.name}`,
      action: { label: 'Ir al carrito', onClick: () => navigate('/carrito') },
    });
  };

  const handleBuyNow = async () => {
    if (!product || outOfStock) return;
    if (!await addItem(product, selectedVariant ?? undefined, qty)) return;
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

  const feedbackBusy = useRef(new Set<string>());
  useEffect(() => {
    let active=true;
    setHelpfulIds(new Set()); setReportedIds(new Set());
    if(user && reviews.length) void database.select<{review_id:string;kind:string}>('review_feedback',{filter:[{column:'user_id',operator:'eq',value:user.id},{column:'review_id',operator:'in',value:reviews.map(r=>r.id)}]}).then(({data})=>{
      if(!active)return;
      const rows=(data || []) as {review_id:string;kind:string}[];
      setHelpfulIds(new Set(rows.filter(r=>r.kind==='helpful').map(r=>r.review_id)));
      setReportedIds(new Set(rows.filter(r=>r.kind==='report').map(r=>r.review_id)));
    });
    return()=>{active=false;};
  },[user?.id,database,reviews.map(r=>r.id).join(',')]);
  const sendFeedback = async (reviewId:string,kind:'helpful'|'report') => {
    if(!user){toast.info('Inicia sesión para participar');navigate('/login');return;}
    const key=reviewId+kind;
    if(feedbackBusy.current.has(key))return;
    feedbackBusy.current.add(key);
    try {
      const {data,error}=await supabase.rpc('submit_review_feedback',{p_review_id:reviewId,p_kind:kind});
      if(error){toast.error('No se pudo guardar. Inténtalo de nuevo.');return;}
      if(kind==='helpful') {setHelpfulIds(s=>new Set([...s,reviewId]));setReviews(rs=>rs.map(r=>r.id===reviewId?{...r,helpful_count:Number(data)}:r));}
      else setReportedIds(s=>new Set([...s,reviewId]));
      toast.success(kind==='helpful'?'Voto guardado':'Reporte enviado al administrador');
    } finally {feedbackBusy.current.delete(key);}
  };
  const markHelpful = (id:string) => sendFeedback(id,'helpful');
  const reportReview = (id:string) => sendFeedback(id,'report');

  const submitReply = async (reviewId: string, body: string) => {
    if (!user) { navigate('/login'); return; }
    if (!body.trim()) { toast.error('Escribe una respuesta'); return; }
    const role = (user as any)?.role || 'user';
    const isCompany = role === 'admin' || role === 'super_admin';
    const authorName = user.full_name || user.username || user.email || 'Usuario';
    const authorRole = isCompany ? 'Empresa' : (role === 'support' ? 'Soporte' : null);
    const { data, error } = await database.insert<ProductReviewReply>('product_review_replies', {
      review_id: reviewId,
      user_id: user.id,
      author_name: authorName,
      author_role: authorRole,
      is_company: isCompany,
      body: body.trim(),
    });
    if (error) { toast.error('Error al enviar respuesta'); return; }
    const newReply = data as ProductReviewReply;
    setReviews(prev => prev.map(r => r.id === reviewId
      ? { ...r, replies: [...(r.replies || []), newReply] }
      : r));
    toast.success('Respuesta publicada');
  };

  const onLikeReply = (replyId: string) => {
    setLikedReplyIds(prev => {
      const next = new Set(prev);
      if (next.has(replyId)) next.delete(replyId);
      else next.add(replyId);
      return next;
    });
  };

  const reviewTotal = summary.total;
  const avgRating = summary.average;
  const ratingDist = [5, 4, 3, 2, 1].map(n => ({
    n, count: summary.stars[n - 1] || 0,
    pct: reviewTotal ? ((summary.stars[n - 1] || 0) / reviewTotal) * 100 : 0,
  }));

  const specs = (product as any)?.specs || {};
  const hasSpecs = Object.keys(specs).length > 0;
  const inCart = items.some(i => i.product.id === product?.id &&
    (!selectedVariant || i.variant?.id === selectedVariant.id));

  const tabs = [
    { id: 'description' as const, label: 'Descripción', icon: Info },
    ...(hasSpecs ? [{ id: 'specs' as const, label: 'Especificaciones', icon: Layers }] : []),
    { id: 'reviews' as const, label: `Reseñas (${reviewTotal.toLocaleString('es-PE')})`, icon: MessageSquare },
  ];

  if (loading) {
    return <LoadingRegion className="min-h-[calc(100dvh-8rem)]" />;
  }

  if (!product) {
    return (
      <>
        <div className="pt-16 flex flex-col items-center justify-center gap-4 px-4 text-center min-h-[60vh]">
          <Package className="w-14 h-14 text-muted-foreground/20" />
          <h2 className="text-lg font-semibold text-foreground">Producto no encontrado</h2>
          <button onClick={() => navigate('/tienda')}
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors">
            Ir a la tienda
          </button>
        </div>
      </>
    );
  }

  return (
    <>

      {/* Breadcrumb */}
      <div className="pt-20 sm:pt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
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
              className="ml-auto text-xs font-medium text-primary hover:underline">
              Editar producto
            </button>
          )}
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">

          {/* LEFT: Gallery */}
          <div>
            <SwipeGallery
              media={allMedia} altName={product.name}
              discount={discount} featured={product.featured} isDigital={!!product.is_digital}
              onOpenLightbox={setLightboxImg} />
          </div>

          {/* RIGHT: Info — flows with spacing & typography, minimal cards */}
          <div className="space-y-4">

            {/* Category + actions */}
            <div className="flex items-center justify-between">
              {product.category ? (
                <button onClick={() => navigate(`/tienda?cat=${product.category_id}`)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <Tag className="w-3 h-3" />
                  {(product.category as any).name}
                </button>
              ) : <span />}
              <div className="flex items-center gap-1.5">
                <button onClick={toggleWishlist} title={isWishlisted ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  className={cn('w-8 h-8 rounded-lg border flex items-center justify-center transition-colors',
                    isWishlisted ? 'border-red-300 text-red-500' : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40')}>
                  <Heart className={cn('w-4 h-4', isWishlisted && 'fill-current')} />
                </button>
                <button title="Compartir" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Enlace copiado'); }}
                  className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-colors">
                  <Share2 className="w-4 h-4" />
                </button>
                <button title="Comparar" onClick={toggleCompare}
                  className={cn('w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-bold transition-colors',
                    compareList.includes(product.id) ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40')}>
                  VS
                </button>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground leading-snug">{product.name}</h1>

            {/* Rating */}
            <div>
              {reviewTotal > 0 ? (
                <button onClick={() => { setActiveTab('reviews'); document.getElementById('product-tabs')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="flex items-center gap-2 group">
                  <StarsDisplay value={avgRating} size={15} />
                  <span className="text-sm font-medium text-foreground">{avgRating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    ({reviewTotal.toLocaleString('es-PE')} {reviewTotal === 1 ? 'valoración' : 'valoraciones'})
                  </span>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> {summary.verified.toLocaleString('es-PE')} verificadas
                  </span>
                </button>
              ) : (
                <button onClick={() => { setActiveTab('reviews'); document.getElementById('product-tabs')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Sin valoraciones — ¡sé el primero!
                </button>
              )}
            </div>

            {/* ── PRICE — pure typography, no card ── */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-3 flex-wrap">
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-medium text-muted-foreground">{showUsd ? '$' : currencySymbol}</span>
                  <span className="text-4xl font-semibold text-foreground tracking-tight tabular-nums">
                    {showUsd ? fmtPrice(currentPrice, true, exchangeRate, currencySymbol) : currentPrice.toFixed(2)}
                  </span>
                </div>
                {currentCompare && currentCompare > currentPrice && (
                  <span className="text-base text-muted-foreground line-through">
                    {fmtPrice(currentCompare, showUsd, exchangeRate, currencySymbol)}
                  </span>
                )}
                {discount > 0 && (
                  <span className="text-sm font-semibold text-red-500">-{discount}%</span>
                )}
              </div>

              {/* Stock + savings — clean info row */}
              <div className="flex items-center gap-3 flex-wrap text-sm">
                {discount > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Ahorras {fmtPrice(currentCompare! - currentPrice, showUsd, exchangeRate, currencySymbol)}
                  </span>
                )}
                {outOfStock ? (
                  <span className="flex items-center gap-1.5 text-red-500 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Sin stock
                  </span>
                ) : lowStock ? (
                  <span className="flex items-center gap-1.5 text-orange-500 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Solo {stock} disponibles
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> En stock
                  </span>
                )}

              </div>

              {/* SKU — subtle standalone line */}
              {product.sku && (
                <p className="text-xs text-muted-foreground">
                  SKU <span className="font-mono text-foreground/60">{selectedVariant?.sku || product.sku}</span>
                </p>
              )}
            </div>

            {/* Short description */}
            {product.short_description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{product.short_description}</p>
            )}

            {/* Variant selectors */}
            {attrKeys.length > 0 && (
              <div className="space-y-3.5">
                {attrKeys.map(key => {
                  const uniqueVals = [...new Set(variants.map(v => v.attributes[key]).filter(Boolean))];
                  if (!uniqueVals.length) return null;
                  const isColorAttr = key.toLowerCase().includes('color');
                  const selectedVal = selectedAttrs[key];

                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground capitalize">{key}:</span>
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
                                className={cn('relative w-9 h-9 rounded-full border transition-colors',
                                  isSelected ? 'border-primary' : 'border-border hover:border-muted-foreground/50',
                                  isOos && 'opacity-40 cursor-not-allowed')}
                                style={{ backgroundColor: val }}>
                                {isSelected && <div className="absolute inset-0 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-white" /></div>}
                              </button>
                            );
                          }

                          const swatchImg = variantForVal?.images?.[0]?.url;
                          if (attrType === 'image' && swatchImg) {
                            return (
                              <button key={val} onClick={() => !isOos && handleAttrSelect(key, val)}
                                disabled={!!isOos} title={val}
                                className={cn('w-11 h-11 rounded-md overflow-hidden border transition-colors',
                                  isSelected ? 'border-primary' : 'border-border hover:border-muted-foreground/50',
                                  isOos && 'opacity-40 cursor-not-allowed')}>
                                <img src={swatchImg} alt={val} className="w-full h-full object-cover" />
                              </button>
                            );
                          }

                          return (
                            <button key={val} onClick={() => !isOos && handleAttrSelect(key, val)}
                              disabled={!!isOos}
                              className={cn('px-3.5 py-2 rounded-md text-sm font-medium border transition-colors',
                                isSelected ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground hover:border-muted-foreground/50',
                                isOos && 'opacity-40 cursor-not-allowed line-through')}>
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── QUANTITY + CTA — stepper paired with add-to-cart, buy-now full width below ── */}
            <div id="buy-section" className="space-y-2.5">
              {/* Row 1: quantity stepper + add to cart */}
              <div className="flex items-center gap-2.5">
                <div className="flex items-center border border-border rounded-lg overflow-hidden bg-background flex-shrink-0">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="w-11 h-11 flex items-center justify-center hover:bg-muted/50 transition-colors disabled:opacity-40"
                    disabled={qty <= 1}>
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-11 text-center text-sm font-medium select-none tabular-nums">{qty}</span>
                  <button onClick={() => !outOfStock && setQty(q => Math.min(q + 1, stock > 0 ? stock : 99))}
                    className="w-11 h-11 flex items-center justify-center hover:bg-muted/50 transition-colors disabled:opacity-40"
                    disabled={outOfStock || (stock > 0 && qty >= stock)}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={handleAdd} disabled={outOfStock}
                  className={cn('flex-1 flex items-center justify-center gap-2 h-11 rounded-lg font-medium text-sm border transition-colors',
                    outOfStock ? 'border-border text-muted-foreground cursor-not-allowed' :
                    addedToCart ? 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' :
                    'border-primary text-primary hover:bg-primary/5')}>
                  {addedToCart
                    ? <><CheckCircle className="w-4 h-4" /> ¡Agregado!</>
                    : <><ShoppingCart className="w-4 h-4" /> Agregar al carrito</>}
                </button>
              </div>

              {/* Row 2: buy now — full width primary CTA */}
              <button onClick={handleBuyNow} disabled={outOfStock}
                className={cn('w-full flex items-center justify-center gap-2 h-12 rounded-lg font-medium text-sm transition-colors',
                  outOfStock ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary text-primary-foreground hover:bg-primary/90')}>
                <Zap className="w-4 h-4" />
                {outOfStock ? 'Sin stock' : 'Comprar ahora'}
              </button>

              {stock > 0 && stock <= 10 && product.track_stock && (
                <p className="text-xs text-muted-foreground font-medium">Solo {stock} disponibles</p>
              )}

              {(inCart || addedToCart) && (
                <button onClick={() => navigate('/carrito')}
                  className="text-xs text-primary font-medium hover:underline transition-colors">
                  Ver carrito →
                </button>
              )}

              {product.is_digital && (product as any).digital_demo_url && (
                <button onClick={() => setShowDemo(true)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium hover:text-foreground transition-colors">
                  <Eye className="w-4 h-4" />
                  Ver demostración gratuita
                </button>
              )}
            </div>

            {/* Benefits — separated inline row with breathing room */}
            <div className="pt-5 border-t border-border/60">
              <BenefitsStrip />
            </div>

            {compareList.length >= 2 && (
              <button onClick={() => navigate(`/tienda/comparar?ids=${compareList.join(',')}`)}
                className="text-sm font-medium text-primary hover:underline transition-colors">
                Comparar {compareList.length} productos seleccionados →
              </button>
            )}
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="mt-4" id="product-tabs">
          <div className="sticky top-16 z-30 bg-background border-b border-border -mx-4 sm:mx-0 px-4 sm:px-0">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={cn('flex items-center gap-2 py-3 px-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors flex-shrink-0',
                    activeTab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4">
            {activeTab === 'description' && (
              <div className="space-y-4">
                <DescriptionRenderer text={product.description || ''} />
                {product.is_digital && (
                  <div className="flex items-start gap-2.5 pt-1">
                    <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Producto digital — entrega instantánea</p>
                      <p className="text-sm text-muted-foreground">Recibirás acceso inmediato tras confirmar el pago.</p>
                      {product.digital_instructions && (
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line pt-1">{product.digital_instructions}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'specs' && hasSpecs && (
              <dl className="max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                {Object.entries(specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-3 border-b border-border">
                    <dt className="text-sm font-medium text-foreground capitalize flex-shrink-0">{k}</dt>
                    <dd className="text-sm text-muted-foreground text-right">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            )}

            {activeTab === 'reviews' && (
              <ReviewsSection
                reviews={reviews} avgRating={avgRating} ratingDist={ratingDist}
                total={reviewTotal} loadingReviews={loadingReviews} reviewError={reviewError} hasMore={hasMore} loadMore={loadMore} filters={filters} setFilters={setFilters}
                helpfulIds={helpfulIds} reportedIds={reportedIds} likedReplyIds={likedReplyIds}
                onMarkHelpful={markHelpful} onLikeReply={onLikeReply} onReport={reportReview} onOpenLightbox={setLightboxImg}
                onReply={submitReply}
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
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">También te puede interesar</h2>
              <button onClick={() => navigate(`/tienda?cat=${product.category_id}`)}
                className="text-xs font-medium text-primary hover:underline whitespace-nowrap">
                Ver más →
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
              {related.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile sticky buy bar */}
      {showStickyBar && !outOfStock && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] px-3">
          <div className="flex items-center gap-2.5">
            <div className="flex-shrink-0">
              <div className="flex items-baseline gap-0.5">
                <span className="text-xs font-medium text-muted-foreground">{showUsd ? '$' : currencySymbol}</span>
                <span className="text-base font-semibold text-foreground tabular-nums">
                  {showUsd ? fmtPrice(currentPrice, true, exchangeRate, currencySymbol) : currentPrice.toFixed(2)}
                </span>
              </div>
              {discount > 0 && (
                <span className="text-[10px] text-muted-foreground line-through">
                  {fmtPrice(currentCompare!, showUsd, exchangeRate, currencySymbol)}
                </span>
              )}
            </div>

            <button onClick={handleBuyNow}
              className="flex-1 flex items-center justify-center gap-1.5 h-10 bg-primary text-primary-foreground rounded-lg font-medium text-sm">
              <Zap className="w-4 h-4" /> Comprar ahora
            </button>

            <button onClick={handleAdd}
              className={cn('w-10 h-10 flex items-center justify-center rounded-lg border transition-colors',
                addedToCart ? 'border-emerald-500 text-emerald-600' : 'border-primary text-primary')}>
              {addedToCart ? <CheckCircle className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-50 app-modal-overlay flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}>
          <button className="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">✕</button>
          <img src={lightboxImg} alt="" className="max-w-full max-h-full rounded-lg object-contain" onClick={e => e.stopPropagation()} />
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
          <div className="fixed inset-0 z-50 app-modal-overlay flex items-center justify-center p-4" onClick={() => setShowDemo(false)}>
            <div className="bg-card rounded-lg overflow-hidden border border-border w-full max-w-3xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <Eye className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="font-medium text-foreground text-sm truncate">Demostración — {product.name}</span>
                  <span className="text-[11px] text-primary font-medium flex-shrink-0">GRATIS</span>
                </div>
                <button onClick={() => setShowDemo(false)} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground flex-shrink-0">✕</button>
              </div>

              {isWebPage ? (
                <div className="p-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center mx-auto">
                    <ExternalLink className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm mb-1">Demo disponible en sitio externo</p>
                    <p className="text-xs text-muted-foreground break-all mt-1">{raw}</p>
                  </div>
                  <a href={raw} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm transition-colors"
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

              <div className="p-4 flex items-center justify-between gap-3 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate text-xs">Contenido completo disponible tras la compra</span>
                </div>
                <button onClick={() => { setShowDemo(false); handleBuyNow(); }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors flex-shrink-0">
                  Comprar ahora
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </>
  );
}
