import { useState, useMemo, useEffect } from 'react';
import { Link } from '@/lib/router';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Reveal } from '@/components/landing/Reveal';
import { Clock, Eye, ArrowRight, Video, Search, FileText, Newspaper, ChevronLeft, ChevronRight, Play, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

type ContentType = 'article' | 'video' | 'news';
type Category = 'Estrategia' | 'Rangos' | 'Comisiones' | 'Marketing' | 'Tutoriales' | 'Noticias';

interface ContentItem {
  slug: string;
  type: ContentType;
  category: Category;
  title: string;
  excerpt: string;
  author: string;
  authorRole: string;
  authorAvatar: string;
  date: string;
  readTime?: string;
  duration?: string;
  views: number;
  image: string;
  featured?: boolean;
}

const allItems: ContentItem[] = [
  { slug: 'alcanzar-rango-diamante-6-meses', type: 'article', category: 'Estrategia', title: 'Cómo alcanzar el rango Diamante en 6 meses', excerpt: 'Sistema comprobado para escalar rangos rápidamente sin saturar tu red.', author: 'Carlos Mendoza', authorRole: 'Líder Diamante', authorAvatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100', date: '15 Jun 2025', readTime: '8 min', views: 4280, image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800', featured: true },
  { slug: 'tour-completo-dashboard', type: 'video', category: 'Tutoriales', title: 'Tour completo del dashboard', excerpt: 'Recorrido por cada función del panel de control de Cluv360.', author: 'Ana Rodríguez', authorRole: 'Soporte', authorAvatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100', date: '12 Jun 2025', duration: '22:15', views: 6150, image: 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=800', featured: true },
  { slug: 'comisiones-binarias-guia-2025', type: 'article', category: 'Comisiones', title: 'Comisiones binarias: Guía definitiva 2025', excerpt: 'Algoritmo del sistema binario explicado paso a paso.', author: 'Luis García', authorRole: 'Analista', authorAvatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100', date: '10 Jun 2025', readTime: '6 min', views: 3890, image: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { slug: '5-scripts-ventas-convierten', type: 'video', category: 'Marketing', title: '5 scripts de ventas que convierten', excerpt: 'Guiones probados para invitar sin presionar.', author: 'María Torres', authorRole: 'Coach', authorAvatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100', date: '8 Jun 2025', duration: '18:30', views: 5420, image: 'https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { slug: 'sistema-rangos-bronce-corona', type: 'article', category: 'Rangos', title: 'Sistema de rangos: del Bronce a la Corona', excerpt: 'Requisitos, bonos y beneficios de cada nivel.', author: 'Ana Rodríguez', authorRole: 'Soporte', authorAvatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100', date: '2 Jun 2025', readTime: '5 min', views: 4100, image: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { slug: 'nueva-funcion-comisiones-instantaneas', type: 'news', category: 'Noticias', title: 'Nueva función: Comisiones instantáneas', excerpt: 'Ahora tus comisiones se acreditan en menos de 60 segundos.', author: 'Equipo Cluv360', authorRole: 'Producto', authorAvatar: 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=100', date: '28 May 2025', readTime: '3 min', views: 8200, image: 'https://images.pexels.com/photos/7688460/pexels-photo-7688460.jpeg?auto=compress&cs=tinysrgb&w=800', featured: true },
  { slug: 'marketing-digital-mlm', type: 'article', category: 'Marketing', title: 'Marketing digital para MLM en 2025', excerpt: 'Construye tu marca personal y atrae afiliados de calidad.', author: 'Ana Ríos', authorRole: 'Dir. Operaciones', authorAvatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100', date: '1 Jun 2025', readTime: '7 min', views: 2950, image: 'https://images.pexels.com/photos/3194523/pexels-photo-3194523.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { slug: 'tutorial-arbol-genealogico', type: 'video', category: 'Tutoriales', title: 'Tutorial: Árbol genealógico interactivo', excerpt: 'Domina filtros, zoom, búsqueda y exportación de tu red.', author: 'Carlos Torres', authorRole: 'CTO', authorAvatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100', date: '25 May 2025', duration: '15:20', views: 5420, image: 'https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { slug: 'retener-afiliados-activos', type: 'article', category: 'Estrategia', title: 'El arte de retener afiliados activos', excerpt: 'Técnicas de seguimiento y mentoring que multiplican la retención.', author: 'Gustavo Ortiz', authorRole: 'CEO', authorAvatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100', date: '22 May 2025', readTime: '6 min', views: 3650, image: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { slug: 'nuevas-pasarelas-pago-peru', type: 'news', category: 'Noticias', title: 'Integramos Yape y Plin como pasarelas de pago', excerpt: 'Ahora puedes cobrar comisiones directamente a Yape y Plin.', author: 'Equipo Cluv360', authorRole: 'Producto', authorAvatar: 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=100', date: '18 May 2025', readTime: '2 min', views: 7100, image: 'https://images.pexels.com/photos/4968391/pexels-photo-4968391.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { slug: 'maximizar-comisiones-binarias', type: 'video', category: 'Comisiones', title: 'Maximiza tus comisiones binarias', excerpt: 'Aprende a optimizar el balance de tu red binaria.', author: 'Carlos Torres', authorRole: 'CTO', authorAvatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100', date: '15 May 2025', duration: '8:30', views: 2180, image: 'https://images.pexels.com/photos/7688460/pexels-photo-7688460.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { slug: 'estrategias-duplicar-red-90-dias', type: 'video', category: 'Estrategia', title: 'Estrategias para duplicar tu red en 90 días', excerpt: '5 estrategias que los líderes Diamante usan para crecer rápido.', author: 'Gustavo Ortiz', authorRole: 'CEO', authorAvatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100', date: '10 May 2025', duration: '12:45', views: 3420, image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800' },
];

const categories: Category[] = ['Estrategia', 'Rangos', 'Comisiones', 'Marketing', 'Tutoriales', 'Noticias'];
const ITEMS_PER_PAGE = 6;

function formatViews(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString(); }

const typeMeta: Record<ContentType, { label: string; icon: typeof Video; badge: string; glow: string }> = {
  article: { label: 'Artículo', icon: FileText, badge: 'bg-primary/10 text-primary border-primary/20', glow: 'group-hover:border-primary/40' },
  video: { label: 'Video', icon: Video, badge: 'bg-rose-500/10 text-rose-500 border-rose-500/20', glow: 'group-hover:border-rose-500/40' },
  news: { label: 'Noticia', icon: Newspaper, badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', glow: 'group-hover:border-amber-500/40' },
};

function SkeletonCard() {
  return (
    <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
      <div className="aspect-video shimmer" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-20 shimmer rounded-full" />
        <div className="h-4 w-full shimmer rounded" />
        <div className="h-4 w-2/3 shimmer rounded" />
        <div className="flex items-center gap-2 pt-2">
          <div className="w-7 h-7 rounded-full shimmer" />
          <div className="h-3 w-24 shimmer rounded" />
        </div>
      </div>
    </div>
  );
}

function ContentCard({ item }: { item: ContentItem }) {
  const meta = typeMeta[item.type];
  return (
    <Link to={`/blog/${item.slug}`} className="group block h-full">
      <article className={cn('bg-card border border-border/50 rounded-2xl overflow-hidden card-lift h-full flex flex-col', meta.glow)}>
        <div className="relative aspect-video overflow-hidden">
          <img src={item.image} alt={item.title} loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
          <span className={cn('absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur-md', meta.badge)}>
            <meta.icon className="w-3 h-3" /> {meta.label}
          </span>
          {item.type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center group-hover:scale-110 group-hover:bg-white/25 transition-all duration-300">
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              </div>
            </div>
          )}
          {item.duration && (
            <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[10px] font-medium text-white">{item.duration}</span>
          )}
        </div>
        <div className="p-4 sm:p-5 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{item.category}</span>
            {item.featured && <Sparkles className="w-3 h-3 text-amber-500" />}
          </div>
          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug text-sm sm:text-base">{item.title}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground/60 line-clamp-2 mt-1.5 mb-4">{item.excerpt}</p>
          <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/30">
            <div className="flex items-center gap-2 min-w-0">
              <img src={item.authorAvatar} alt="" className="w-6 h-6 rounded-full shrink-0" />
              <span className="text-[11px] font-medium text-foreground/70 truncate">{item.author}</span>
            </div>
            <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground/50 shrink-0">
              {item.readTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.readTime}</span>}
              {item.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.duration}</span>}
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatViews(item.views)}</span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

function FeaturedCard({ item }: { item: ContentItem }) {
  const meta = typeMeta[item.type];
  return (
    <Link to={`/blog/${item.slug}`} className="group block h-full">
      <article className="relative h-full bg-card border border-border/50 rounded-3xl overflow-hidden card-lift flex flex-col sm:flex-row">
        <div className="relative sm:w-1/2 aspect-[16/9] sm:aspect-auto overflow-hidden">
          <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out" />
          <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/50 via-transparent to-transparent" />
          {item.type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center group-hover:scale-110 group-hover:bg-white/25 transition-all duration-300">
                <Play className="w-6 h-6 text-white fill-white ml-0.5" />
              </div>
            </div>
          )}
        </div>
        <div className="sm:w-1/2 p-6 sm:p-8 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border', meta.badge)}>
              <meta.icon className="w-3 h-3" /> {meta.label}
            </span>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{item.category}</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground group-hover:text-primary transition-colors leading-tight mb-2">{item.title}</h2>
          <p className="text-sm text-muted-foreground/70 line-clamp-2 mb-4">{item.excerpt}</p>
          <div className="flex items-center gap-3">
            <img src={item.authorAvatar} alt="" className="w-8 h-8 rounded-full" />
            <div className="leading-tight">
              <div className="text-xs font-medium text-foreground">{item.author}</div>
              <div className="text-[10px] text-muted-foreground/50">{item.date} · {formatViews(item.views)} vistas</div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default function BlogPage() {
  const [activeTab, setActiveTab] = useState<'all' | ContentType>('all');
  const [activeCategory, setActiveCategory] = useState<'Todas' | Category>('Todas');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, [activeTab, activeCategory, search]);

  const filtered = useMemo(() => {
    return allItems.filter(item => {
      if (activeTab !== 'all' && item.type !== activeTab) return false;
      if (activeCategory !== 'Todas' && item.category !== activeCategory) return false;
      if (search && !item.title.toLowerCase().includes(search.toLowerCase()) && !item.excerpt.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [activeTab, activeCategory, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const featured = allItems.filter(i => i.featured);
  const showFeatured = activeTab === 'all' && activeCategory === 'Todas' && !search && currentPage === 1;

  const handleTabChange = (tab: 'all' | ContentType) => { setActiveTab(tab); setPage(1); };
  const handleCategoryChange = (cat: 'Todas' | Category) => { setActiveCategory(cat); setPage(1); };
  const handleSearch = (val: string) => { setSearch(val); setPage(1); };

  const tabs = [
    { value: 'all', label: 'Todo', icon: null, count: allItems.length },
    { value: 'article', label: 'Artículos', icon: FileText, count: allItems.filter(i => i.type === 'article').length },
    { value: 'video', label: 'Videos', icon: Video, count: allItems.filter(i => i.type === 'video').length },
    { value: 'news', label: 'Noticias', icon: Newspaper, count: allItems.filter(i => i.type === 'news').length },
  ] as const;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-10 sm:pb-14 overflow-hidden">
        <div className="absolute inset-0 bg-dub-grid opacity-20 mask-fade-top" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="breadcrumb" className="sr-only">
            <Link to="/">Inicio</Link> / <span>Novedades</span>
          </nav>

          <Reveal>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/15 text-xs font-medium text-primary mb-5">
              <TrendingUp className="w-3.5 h-3.5" />
              Recursos Cluv360
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-4 leading-[1.05]">
              Novedades, guías y<br className="hidden sm:block" /> <span className="text-gradient-animated">tutoriales</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground/70 max-w-xl leading-relaxed">
              Aprende a escalar tu red, domina el sistema de comisiones y mantente al día con las novedades de la plataforma.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Featured ────────────────────────────────────────────────────── */}
      {showFeatured && (
        <section className="pb-6">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Destacados</h2>
              </div>
            </Reveal>
            <Reveal delay={50}>
              <FeaturedCard item={featured[0]} />
            </Reveal>
            {featured.length > 1 && (
              <Reveal delay={100}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  {featured.slice(1).map(item => <ContentCard key={item.slug} item={item} />)}
                </div>
              </Reveal>
            )}
          </div>
        </section>
      )}

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <section className="sticky top-[60px] z-30 py-3 border-y border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-muted rounded-xl overflow-x-auto scrollbar-hide">
              {tabs.map(tab => (
                <button key={tab.value} onClick={() => handleTabChange(tab.value)}
                  className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                    activeTab === tab.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                  {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
                  {tab.label}
                  <span className={cn('text-[10px]', activeTab === tab.value ? 'text-primary' : 'text-muted-foreground/40')}>{tab.count}</span>
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={search} onChange={e => handleSearch(e.target.value)} placeholder="Buscar contenido..."
                className="w-full pl-9 pr-4 py-2 bg-card border border-border/60 rounded-lg text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button onClick={() => handleCategoryChange('Todas')}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                activeCategory === 'Todas' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground')}>
              Todas
            </button>
            {categories.map(cat => (
              <button key={cat} onClick={() => handleCategoryChange(cat)}
                className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  activeCategory === cat ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground')}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Content grid ─────────────────────────────────────────────────── */}
      <section className="py-10 sm:py-12">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground text-sm mb-3">No se encontraron resultados para tu búsqueda.</p>
              <button onClick={() => { handleTabChange('all'); handleCategoryChange('Todas'); handleSearch(''); }}
                className="text-primary text-sm font-medium hover:underline">Limpiar filtros</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {paginated.map((item, i) => (
                  <Reveal key={item.slug} delay={i * 40}>
                    <ContentCard item={item} />
                  </Reveal>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-10">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm font-medium border border-border/60 hover:bg-muted transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Anterior</span>
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button key={p} onClick={() => setPage(p)}
                        className={cn('w-9 h-9 rounded-lg text-sm font-medium transition-all',
                          p === currentPage ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-muted')}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm font-medium border border-border/60 hover:bg-muted transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    <span className="hidden sm:inline">Siguiente</span> <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16 bg-muted/20 border-t border-border/40">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">¿Quieres más recursos?</h2>
          <p className="text-sm text-muted-foreground mb-5">Crea tu cuenta y accede a tutoriales exclusivos, guías avanzadas y contenido premium.</p>
          <Link to="/registro" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all text-sm">
            Crear cuenta gratis <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
