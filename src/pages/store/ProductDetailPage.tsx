import { useState, useEffect, useCallback } from 'react';
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
import { ShoppingCart, Star, ChevronLeft, ChevronRight, Plus, Minus, Truck, Shield, RotateCcw, Heart, Share2, Package, Tag, MessageSquare, Layers, Upload, ThumbsUp, Flag, ChevronDown, CircleCheck as CheckCircle, Play, Download, Eye, Lock, Zap, Info, CreditCard as Edit, DollarSign, ExternalLink } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

/* ─── helpers ─── */
function fmtPrice(n: number, showUsd: boolean, rate: number) {
  if (showUsd) return `$${(n / rate).toFixed(2)}`;
  return `S/ ${n.toFixed(2)}`;
}

function StarsDisplay({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} style={{ width: size, height: size }}
          className={i < Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'} />
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const labels = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <button key={i} type="button"
            onMouseEnter={() => setHover(i + 1)} onMouseLeave={() => setHover(0)}
            onClick={() => onChange(i + 1)}
            className="transition-transform hover:scale-110 active:scale-95">
            <Star className={cn('w-9 h-9 transition-colors',
              i < (hover || value) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20')} />
          </button>
        ))}
      </div>
      {(hover || value) > 0 && (
        <span className="text-sm font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-xl">
          {labels[hover || value]}
        </span>
      )}
    </div>
  );
}

/* Rich description renderer — parses markdown-like images, headers, bullets, bold */
function DescriptionRenderer({ text }: { text: string }) {
  if (!text) return <p className="text-muted-foreground italic">Sin descripción disponible.</p>;

  const blocks = text.split(/\n{2,}/g);
  return (
    <div className="space-y-4">
      {blocks.map((block, bi) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Standalone image: ![alt](url)
        const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imgMatch) {
          return (
            <div key={bi} className="rounded-xl overflow-hidden border border-border shadow-sm">
              <img src={imgMatch[2]} alt={imgMatch[1]}
                className="w-full object-cover max-h-[500px]"
                loading="lazy" />
              {imgMatch[1] && <p className="text-xs text-muted-foreground text-center py-2 bg-muted/30">{imgMatch[1]}</p>}
            </div>
          );
        }

        // Gallery row: multiple images on same line
        const galleryMatches = [...trimmed.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
        if (galleryMatches.length > 1) {
          return (
            <div key={bi} className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {galleryMatches.map((m, i) => (
                <div key={i} className="rounded-xl overflow-hidden border border-border aspect-square">
                  <img src={m[2]} alt={m[1]} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          );
        }

        // Heading: ## or #
        if (trimmed.startsWith('## ')) {
          return <h3 key={bi} className="text-lg font-bold text-foreground mt-2">{trimmed.slice(3)}</h3>;
        }
        if (trimmed.startsWith('# ')) {
          return <h2 key={bi} className="text-xl font-bold text-foreground mt-2">{trimmed.slice(2)}</h2>;
        }

        // Bullet list
        const lines = trimmed.split('\n');
        const isList = lines.every(l => l.startsWith('- ') || l.startsWith('* '));
        if (isList) {
          return (
            <ul key={bi} className="space-y-1.5 pl-2">
              {lines.map((l, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span dangerouslySetInnerHTML={{ __html: l.slice(2).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') }} />
                </li>
              ))}
            </ul>
          );
        }

        // Regular paragraph — inline bold + inline images
        const inlined = trimmed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
          (_, alt, src) => `<img src="${src}" alt="${alt}" class="inline rounded-lg max-w-[280px] my-1 border border-border" />`
        ).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        return (
          <p key={bi} className="text-sm text-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: inlined }} />
        );
      })}
    </div>
  );
}

export default function ProductDetailPage() {
  const database = useDatabase();
  const storage = useStorage();
  const slug = window.location.pathname.split('/').filter(p => p && p !== 'tienda').pop() || '';
  const { addItem, items } = useCart();
  const { user } = useAuthStore();
  const { exchangeRate, showUsd, setShowUsd, company } = useConfig();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews' | 'digital'>('description');
  const [reviewForm, setReviewForm] = useState({ rating: 0, title: '', body: '', images: [] as string[] });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(5);
  const [showDemo, setShowDemo] = useState(false);
  const [compareList, setCompareList] = useState<string[]>([]);
  // showUsd/setShowUsd from configStore — global currency preference
  // track helpful/reported per session
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

  // Inject dynamic Product JSON-LD schema using live product + company data
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

  const allMedia = [
    ...(product?.images || []).map(i => ({ ...i, isVideo: false })),
    ...(product?.videos || []).map(v => ({ url: v.url, alt: 'Video', isVideo: true, thumbnail: v.thumbnail })),
  ];

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="pt-16 max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            <div className="aspect-square bg-muted rounded-xl animate-pulse" />
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
          <h2 className="text-xl font-bold text-foreground">Producto no encontrado</h2>
          <button onClick={() => navigate('/tienda')}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm">
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
      <div className="pt-16 bg-card/50 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <button onClick={() => navigate('/')} className="hover:text-foreground">Inicio</button>
          <span>/</span>
          <button onClick={() => navigate('/tienda')} className="hover:text-foreground">Tienda</button>
          {product.category && (<>
            <span>/</span>
            <button onClick={() => navigate(`/tienda?cat=${product.category_id}`)} className="hover:text-foreground capitalize">
              {(product.category as any).name}
            </button>
          </>)}
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-[200px]">{product.name}</span>
          {/* Admin: Edit button in breadcrumb */}
          {isAdmin && (
            <button onClick={() => navigate(`/dashboard/admin/productos/${product.id}`)}
              className="ml-auto flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-xl transition-colors">
              <Edit className="w-3 h-3" /> Editar producto
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">

          {/* ── LEFT: Gallery ── */}
          <div className="lg:col-span-5 space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-muted border border-border" style={{ paddingBottom: '100%' }}>
              <div className="absolute inset-0">
                {discount > 0 && (
                  <span className="absolute top-3 left-3 z-10 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                    -{discount}%
                  </span>
                )}
                {product.featured && (
                  <span className="absolute top-3 right-14 z-10 bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full">
                    ★ Destacado
                  </span>
                )}
                {product.is_digital && (
                  <span className="absolute top-3 right-3 z-10 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Digital
                  </span>
                )}

                {allMedia.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-20 h-20 text-muted-foreground/20" />
                  </div>
                ) : (allMedia[imgIdx] as any).isVideo ? (
                  <video src={allMedia[imgIdx].url} controls className="w-full h-full object-cover" />
                ) : (
                  <img src={allMedia[imgIdx].url} alt={(allMedia[imgIdx] as any).alt || product.name}
                    className="w-full h-full object-cover transition-opacity duration-300 cursor-zoom-in"
                    onClick={() => setLightboxImg(allMedia[imgIdx].url)} />
                )}

                {allMedia.length > 1 && (<>
                  <button onClick={() => setImgIdx(i => (i - 1 + allMedia.length) % allMedia.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md z-10 hover:bg-background transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setImgIdx(i => (i + 1) % allMedia.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md z-10 hover:bg-background transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {allMedia.map((_, i) => (
                      <button key={i} onClick={() => setImgIdx(i)}
                        className={cn('h-1.5 rounded-full transition-all', i === imgIdx ? 'w-5 bg-primary' : 'w-1.5 bg-white/60')} />
                    ))}
                  </div>
                </>)}
              </div>
            </div>

            {allMedia.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allMedia.map((m, i) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    className={cn('flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all',
                      imgIdx === i ? 'border-primary shadow-md' : 'border-border hover:border-primary/50')}>
                    {(m as any).isVideo
                      ? <div className="w-full h-full bg-muted flex items-center justify-center"><Play className="w-4 h-4 text-muted-foreground" /></div>
                      : <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />}
                  </button>
                ))}
              </div>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Truck, label: 'Envío rápido', sub: 'Gratis desde S/150' },
                { icon: Shield, label: 'Compra segura', sub: 'Pago cifrado SSL' },
                { icon: RotateCcw, label: 'Devoluciones', sub: 'Hasta 30 días' },
              ].map(b => (
                <div key={b.label} className="flex flex-col items-center gap-1.5 p-3 bg-muted/50 rounded-xl text-center">
                  <b.icon className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-bold text-foreground leading-tight">{b.label}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{b.sub}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Info ── */}
          <div className="lg:col-span-7 space-y-4">

            {product.category && (
              <button onClick={() => navigate(`/tienda?cat=${product.category_id}`)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors">
                <Tag className="w-3 h-3" />
                {(product.category as any).name}
              </button>
            )}

            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight flex-1">{product.name}</h1>
              {isAdmin && (
                <button onClick={() => navigate(`/dashboard/admin/productos/${product.id}`)}
                  className="flex-shrink-0 flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-muted hover:bg-muted/80 hover:text-primary px-3 py-2 rounded-xl transition-colors">
                  <Edit className="w-3.5 h-3.5" /> Editar
                </button>
              )}
            </div>

            {reviews.length > 0 ? (
              <button onClick={() => setActiveTab('reviews')} className="flex items-center gap-2 group">
                <StarsDisplay value={avgRating} size={16} />
                <span className="text-sm font-bold text-foreground">{avgRating.toFixed(1)}</span>
                <span className="text-sm text-primary underline-offset-2 group-hover:underline">
                  {reviews.length} valoraciones
                </span>
              </button>
            ) : (
              <button onClick={() => setActiveTab('reviews')}
                className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Sin valoraciones — ¡sé el primero!
              </button>
            )}

            {/* Price block + currency toggle */}
            <div className="bg-gradient-to-br from-muted/60 to-muted/30 border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-end gap-3 flex-wrap">
                  <span className="text-4xl font-bold text-foreground tracking-tight">
                    {fmtPrice(currentPrice, showUsd, exchangeRate)}
                  </span>
                  {currentCompare && currentCompare > currentPrice && (
                    <span className="text-xl text-muted-foreground line-through pb-0.5">
                      {fmtPrice(currentCompare, showUsd, exchangeRate)}
                    </span>
                  )}
                  {discount > 0 && (
                    <span className="text-sm font-bold text-white bg-red-500 px-2.5 py-1 rounded-lg shadow">
                      -{discount}% OFF
                    </span>
                  )}
                </div>
                {/* Currency toggle */}
                <button onClick={() => setShowUsd(!showUsd)}
                  className={cn('flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all flex-shrink-0',
                    showUsd ? 'bg-green-500 text-white border-green-500' : 'bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground')}>
                  <DollarSign className="w-3.5 h-3.5" />
                  {showUsd ? `USD (T/C: S/${exchangeRate.toFixed(2)})` : 'Ver en USD'}
                </button>
              </div>
              {discount > 0 && (
                <p className="text-sm font-bold text-green-600 dark:text-green-400">
                  Ahorras {fmtPrice(currentCompare! - currentPrice, showUsd, exchangeRate)} en este producto
                </p>
              )}
              {product.sku && (
                <p className="text-xs text-muted-foreground">
                  SKU: <span className="font-mono">{selectedVariant?.sku || product.sku}</span>
                </p>
              )}
            </div>

            {product.short_description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{product.short_description}</p>
            )}

            {/* Variant selectors */}
            {attrKeys.map(key => {
              const uniqueVals = [...new Set(variants.map(v => v.attributes[key]).filter(Boolean))];
              if (!uniqueVals.length) return null;
              const isColorAttr = key.toLowerCase().includes('color');
              const selectedVal = selectedAttrs[key];

              return (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-sm font-bold text-foreground">{key}:</span>
                    {selectedVal && (
                      <span className="text-sm font-semibold text-primary">
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
                            className={cn('relative w-10 h-10 rounded-xl border-2 transition-all',
                              isSelected ? 'border-primary scale-110 shadow-lg ring-2 ring-primary/30' : 'border-border hover:border-primary/60 hover:scale-105',
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
                            className={cn('w-14 h-14 rounded-xl overflow-hidden border-2 transition-all',
                              isSelected ? 'border-primary shadow-md scale-105' : 'border-border hover:border-primary/50',
                              isOos && 'opacity-40 cursor-not-allowed')}>
                            <img src={swatchImg} alt={val} className="w-full h-full object-cover" />
                          </button>
                        );
                      }

                      return (
                        <button key={val} onClick={() => !isOos && handleAttrSelect(key, val)}
                          disabled={!!isOos}
                          className={cn('px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all',
                            isSelected ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-border text-foreground hover:border-primary/60 hover:bg-muted',
                            isOos && 'opacity-40 cursor-not-allowed line-through')}>
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Stock */}
            <div className="flex items-center gap-2 flex-wrap">
              {outOfStock ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-red-500" />Sin stock — no disponible
                </span>
              ) : lowStock ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 px-3 py-1.5 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  ¡Solo {stock} unidades disponibles!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-1.5 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-green-500" />En stock — despacho inmediato
                </span>
              )}
            </div>

            {/* Qty + actions */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-bold text-foreground">Cantidad:</span>
                <div className="flex items-center border-2 border-border rounded-xl overflow-hidden">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="w-11 h-11 flex items-center justify-center hover:bg-muted transition-colors active:bg-muted/80">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center text-sm font-bold select-none">{qty}</span>
                  <button onClick={() => !outOfStock && setQty(q => Math.min(q + 1, stock > 0 ? stock : 99))}
                    className="w-11 h-11 flex items-center justify-center hover:bg-muted transition-colors active:bg-muted/80">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={toggleWishlist}
                  className={cn('w-11 h-11 rounded-xl border-2 flex items-center justify-center transition-all',
                    isWishlisted ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-500' : 'border-border hover:border-red-300 text-muted-foreground hover:text-red-400')}>
                  <Heart className={cn('w-5 h-5', isWishlisted && 'fill-current')} />
                </button>
                <button onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Enlace copiado'); }}
                  className="w-11 h-11 rounded-xl border-2 border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">
                  <Share2 className="w-4 h-4" />
                </button>
                <button onClick={toggleCompare}
                  className={cn('hidden sm:flex w-11 h-11 rounded-xl border-2 items-center justify-center transition-all text-xs font-bold',
                    compareList.includes(product.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                  VS
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button onClick={handleBuyNow} disabled={outOfStock}
                  className={cn('flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm transition-all',
                    outOfStock ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 active:scale-[0.98]')}>
                  <Zap className="w-4 h-4" />
                  {outOfStock ? 'Sin stock' : 'Comprar ahora'}
                </button>
                <button onClick={handleAdd} disabled={outOfStock}
                  className={cn('flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm border-2 transition-all',
                    addedToCart ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20' :
                    outOfStock ? 'border-border text-muted-foreground cursor-not-allowed' :
                    'border-primary text-primary hover:bg-primary/5 active:scale-[0.98]')}>
                  {addedToCart
                    ? <><CheckCircle className="w-4 h-4" /> ¡En tu carrito!</>
                    : <><ShoppingCart className="w-4 h-4" /> Agregar al carrito</>}
                </button>
              </div>

              {inCart && !addedToCart && (
                <button onClick={() => navigate('/carrito')}
                  className="w-full text-center text-sm text-primary font-semibold hover:underline">
                  Ya tienes este producto en el carrito → ver carrito
                </button>
              )}

              {product.is_digital && (product as any).digital_demo_url && (
                <button onClick={() => setShowDemo(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-primary/30 text-primary bg-primary/5 rounded-xl font-bold text-sm hover:bg-primary/10 transition-colors">
                  <Eye className="w-4 h-4" />
                  Ver demostración gratuita
                </button>
              )}
            </div>

            {compareList.length >= 2 && (
              <button onClick={() => navigate(`/tienda/comparar?ids=${compareList.join(',')}`)}
                className="w-full py-2.5 bg-muted text-foreground rounded-xl text-sm font-bold hover:bg-muted/80 transition-colors">
                Comparar {compareList.length} productos seleccionados →
              </button>
            )}
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="mt-8 bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex border-b border-border overflow-x-auto">
            {[
              { id: 'description', label: 'Descripción', icon: Info },
              ...(hasSpecs ? [{ id: 'specs', label: 'Especificaciones', icon: Layers }] : []),
              { id: 'reviews', label: `Reseñas (${reviews.length})`, icon: MessageSquare },
              ...(product.is_digital ? [{ id: 'digital', label: 'Producto digital', icon: Download }] : []),
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                className={cn('flex items-center gap-2 px-5 py-4 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors flex-shrink-0',
                  activeTab === t.id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30')}>
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>

          <div className="p-5 sm:p-6">
            {/* Description — rich renderer */}
            {activeTab === 'description' && (
              <DescriptionRenderer text={product.description || ''} />
            )}

            {/* Specs — proper table */}
            {activeTab === 'specs' && hasSpecs && (
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide w-1/3">Característica</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(specs).map(([k, v], i) => (
                      <tr key={k} className={cn('border-b border-border/50 last:border-0', i % 2 === 0 ? 'bg-muted/20' : '')}>
                        <td className="px-4 py-3 font-semibold text-foreground capitalize">{k}</td>
                        <td className="px-4 py-3 text-foreground">{String(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Digital */}
            {activeTab === 'digital' && product.is_digital && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <Zap className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-foreground">Producto digital — entrega instantánea</p>
                    <p className="text-xs text-muted-foreground mt-1">Recibirás acceso inmediato tras confirmar el pago.</p>
                  </div>
                </div>
                {product.digital_instructions && (
                  <div className="p-4 bg-muted/40 rounded-xl">
                    <h4 className="text-sm font-bold text-foreground mb-2">Instrucciones de acceso</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{product.digital_instructions}</p>
                  </div>
                )}
                {(product as any).digital_demo_url && (
                  <button onClick={() => setShowDemo(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors">
                    <Play className="w-4 h-4" /> Ver demostración gratuita
                  </button>
                )}
              </div>
            )}

            {/* Reviews — MercadoLibre style */}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {/* Rating overview */}
                {reviews.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 p-5 bg-muted/30 rounded-xl border border-border">
                    <div className="sm:col-span-2 flex flex-col items-center justify-center gap-2 py-2">
                      <span className="text-6xl font-bold text-foreground leading-none">{avgRating.toFixed(1)}</span>
                      <StarsDisplay value={avgRating} size={20} />
                      <span className="text-sm text-muted-foreground font-medium">{reviews.length} reseñas</span>
                    </div>
                    <div className="sm:col-span-3 space-y-2 py-2">
                      {ratingDist.map(({ n, count, pct }) => (
                        <div key={n} className="flex items-center gap-2.5">
                          <div className="flex items-center gap-0.5 w-14 flex-shrink-0">
                            <span className="text-xs text-muted-foreground w-3 text-right">{n}</span>
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 ml-0.5" />
                          </div>
                          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-5 text-right flex-shrink-0">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review list */}
                <div className="space-y-3">
                  {reviews.slice(0, reviewsPage).map(r => (
                    <div key={r.id} className="border border-border rounded-xl p-4 sm:p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                            {((r.profile as any)?.full_name || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{(r.profile as any)?.full_name || 'Cliente'}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs text-muted-foreground">
                                {new Date(r.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                              </p>
                              {r.verified_purchase && (
                                <span className="text-xs text-green-600 font-bold bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                                  ✓ Compra verificada
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <StarsDisplay value={r.rating} size={15} />
                      </div>
                      {r.title && <p className="text-sm font-bold text-foreground">{r.title}</p>}
                      {r.body && <p className="text-sm text-muted-foreground leading-relaxed">{r.body}</p>}
                      {(r.images || []).length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {(r.images as string[]).map((img, i) => (
                            <button key={i} onClick={() => setLightboxImg(img)}
                              className="w-20 h-20 rounded-xl overflow-hidden border border-border hover:scale-105 transition-transform">
                              <img src={img} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-4 pt-1 border-t border-border/50 text-xs">
                        <button
                          onClick={() => markHelpful(r.id, r.helpful_count ?? 0)}
                          disabled={helpfulIds.has(r.id)}
                          className={cn('flex items-center gap-1.5 font-semibold transition-colors',
                            helpfulIds.has(r.id) ? 'text-primary' : 'text-muted-foreground hover:text-primary')}>
                          <ThumbsUp className={cn('w-3.5 h-3.5', helpfulIds.has(r.id) && 'fill-current')} />
                          Útil ({r.helpful_count ?? 0})
                        </button>
                        <button
                          onClick={() => reportReview(r.id)}
                          disabled={reportedIds.has(r.id)}
                          className={cn('flex items-center gap-1.5 font-semibold transition-colors',
                            reportedIds.has(r.id) ? 'text-red-400' : 'text-muted-foreground hover:text-red-500')}>
                          <Flag className="w-3.5 h-3.5" />
                          {reportedIds.has(r.id) ? 'Reportada' : 'Reportar'}
                        </button>
                      </div>
                    </div>
                  ))}

                  {reviews.length === 0 && (
                    <div className="text-center py-12 space-y-3">
                      <MessageSquare className="w-14 h-14 mx-auto text-muted-foreground/20" />
                      <p className="text-base font-bold text-foreground">Sin reseñas aún</p>
                      <p className="text-sm text-muted-foreground">Sé el primero en compartir tu experiencia</p>
                    </div>
                  )}

                  {reviews.length > reviewsPage && (
                    <button onClick={() => setReviewsPage(p => p + 5)}
                      className="w-full flex items-center justify-center gap-2 py-3 border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-colors">
                      <ChevronDown className="w-4 h-4" /> Ver más reseñas
                    </button>
                  )}
                </div>

                {/* ── Write review — MercadoLibre style ── */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="bg-muted/40 px-5 py-4 border-b border-border">
                    <h3 className="text-base font-bold text-foreground">¿Ya compraste este producto?</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Comparte tu opinión con otros compradores</p>
                  </div>

                  {!user ? (
                    <div className="p-6 text-center space-y-3">
                      <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/20" />
                      <p className="text-sm text-foreground font-semibold">Inicia sesión para escribir una reseña</p>
                      <button onClick={() => navigate('/login')}
                        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors">
                        Iniciar sesión
                      </button>
                    </div>
                  ) : (
                    <div className="p-5 space-y-5">
                      {/* Step 1: Rating */}
                      <div>
                        <p className="text-sm font-bold text-foreground mb-3">1. ¿Cómo calificarías este producto? *</p>
                        <StarPicker value={reviewForm.rating} onChange={v => setReviewForm(p => ({ ...p, rating: v }))} />
                      </div>

                      {reviewForm.rating > 0 && (
                        <>
                          {/* Step 2: Title */}
                          <div>
                            <p className="text-sm font-bold text-foreground mb-2">2. Ponle un título a tu reseña</p>
                            <input value={reviewForm.title}
                              onChange={e => setReviewForm(p => ({ ...p, title: e.target.value }))}
                              placeholder={reviewForm.rating >= 4 ? 'Ej: Excelente calidad, muy recomendado' : reviewForm.rating === 3 ? 'Ej: Bueno pero mejorable' : 'Ej: No cumplió mis expectativas'}
                              maxLength={100}
                              className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary transition-colors" />
                          </div>

                          {/* Step 3: Body */}
                          <div>
                            <p className="text-sm font-bold text-foreground mb-2">3. Cuéntanos más</p>
                            <textarea value={reviewForm.body}
                              onChange={e => setReviewForm(p => ({ ...p, body: e.target.value }))}
                              placeholder="¿Qué te gustó? ¿Qué no te gustó? ¿Volvería a comprarlo? Sé específico para ayudar a otros compradores."
                              rows={4} maxLength={1000}
                              className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary resize-none transition-colors" />
                            <p className="text-xs text-muted-foreground text-right mt-1">{reviewForm.body.length}/1000</p>
                          </div>

                          {/* Step 4: Photos */}
                          <div>
                            <p className="text-sm font-bold text-foreground mb-2">4. Agrega fotos <span className="font-normal text-muted-foreground">(opcional)</span></p>
                            <div className="flex gap-2 flex-wrap">
                              {reviewForm.images.map((img, i) => (
                                <div key={i} className="relative">
                                  <img src={img} alt="" className="w-20 h-20 rounded-xl object-cover border-2 border-primary/30" />
                                  <button onClick={() => setReviewForm(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }))}
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">×</button>
                                </div>
                              ))}
                              {reviewForm.images.length < 5 && (
                                <label className={cn('w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors group',
                                  uploadingImg ? 'opacity-50 cursor-not-allowed border-border' : 'border-border hover:border-primary hover:bg-primary/5')}>
                                  {uploadingImg
                                    ? <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    : <>
                                      <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                      <span className="text-[10px] text-muted-foreground mt-1 group-hover:text-primary transition-colors">Agregar foto</span>
                                    </>}
                                  <input type="file" accept="image/*" className="hidden" disabled={uploadingImg}
                                    onChange={e => e.target.files?.[0] && uploadReviewImg(e.target.files[0])} />
                                </label>
                              )}
                            </div>
                          </div>

                          <button onClick={submitReview}
                            disabled={submittingReview || reviewForm.rating === 0}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50 active:scale-[0.98] transition-all">
                            {submittingReview
                              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publicando...</>
                              : 'Publicar reseña'}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <div className="mt-8 sm:mt-10">
            <h2 className="text-xl font-bold text-foreground mb-4">También te puede interesar</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
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

        const ytMatch = raw.match(
          /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
        );
        const vimeoMatch = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/);

        const embedUrl = ytMatch
          ? 'https://www.youtube.com/embed/' + ytMatch[1] + '?autoplay=1&rel=0'
          : vimeoMatch
          ? 'https://player.vimeo.com/video/' + vimeoMatch[1] + '?autoplay=1'
          : null;

        const isWebPage = !isVideoFile && !embedUrl;

        return (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowDemo(false)}>
            <div
              className={cn('bg-card rounded-xl overflow-hidden shadow-2xl w-full', isWebPage ? 'max-w-sm' : 'max-w-3xl')}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-500" />
                  <span className="font-bold text-foreground">Demostración — {product.name}</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold ml-1">GRATIS</span>
                </div>
                <button onClick={() => setShowDemo(false)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted text-muted-foreground">✕</button>
              </div>

              {isWebPage ? (
                <div className="p-6 text-center space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                    <ExternalLink className="w-7 h-7 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Demo disponible en sitio externo</p>
                    <p className="text-xs text-muted-foreground break-all mt-1">{raw}</p>
                  </div>
                  <a
                    href={raw}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors"
                    onClick={() => setShowDemo(false)}
                  >
                    <ExternalLink className="w-4 h-4" /> Abrir demostración
                  </a>
                </div>
              ) : (
                <div className="aspect-video bg-black">
                  {isVideoFile ? (
                    <video src={raw} controls autoPlay className="w-full h-full" />
                  ) : (
                    <iframe
                      src={embedUrl!}
                      className="w-full h-full"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      title="Demo"
                    />
                  )}
                </div>
              )}

              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span>Contenido completo disponible tras la compra</span>
                </div>
                <button onClick={() => { setShowDemo(false); handleBuyNow(); }}
                  className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors flex-shrink-0">
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
