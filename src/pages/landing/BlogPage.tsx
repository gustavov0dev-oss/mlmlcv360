import { useState, useMemo } from 'react';
import { Link } from '@/lib/router';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Reveal } from '@/components/landing/Reveal';
import { Clock, Eye, ArrowRight, Video, Search, FileText, Newspaper, ChevronLeft, ChevronRight, Play } from 'lucide-react';
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
  date: string;
  readTime: string;
  views: number;
  image: string;
  featured?: boolean;
}

const allItems: ContentItem[] = [
  { slug: 'alcanzar-rango-diamante-6-meses', type: 'article', category: 'Estrategia', title: 'Cómo alcanzar el rango Diamante en 6 meses', excerpt: 'Sistema comprobado para escalar rangos rápidamente sin saturar tu red.', author: 'Carlos Mendoza', authorRole: 'Líder Diamante', date: '15 Jun 2025', readTime: '8 min', views: 4280, image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800', featured: true },
  { slug: 'tour-completo-dashboard', type: 'video', category: 'Tutoriales', title: 'Tour completo del dashboard', excerpt: 'Recorrido por cada función del panel de control de Cluv360.', author: 'Ana Rodríguez', authorRole: 'Soporte', date: '12 Jun 2025', readTime: '22 min', views: 6150, image: 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=800', featured: true },
  { slug: 'comisiones-binarias-guia-2025', type: 'article', category: 'Comisiones', title: 'Comisiones binarias: Guía definitiva 2025', excerpt: 'Algoritmo del sistema binario explicado paso a paso.', author: 'Luis García', authorRole: 'Analista', date: '10 Jun 2025', readTime: '6 min', views: 3890, image: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { slug: '5-scripts-ventas-convierten', type: 'video', category: 'Marketing', title: '5 scripts de ventas que convierten', excerpt: 'Guiones probados para invitar sin presionar.', author: 'María Torres', authorRole: 'Coach', date: '8 Jun 2025', readTime: '18 min', views: 5420, image: 'https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { slug: 'sistema-rangos-bronce-corona', type: 'article', category: 'Rangos', title: 'Sistema de rangos: del Bronce a la Corona', excerpt: 'Requisitos, bonos y beneficios de cada nivel.', author: 'Ana Rodríguez', authorRole: 'Soporte', date: '2 Jun 2025', readTime: '5 min', views: 4100, image: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { slug: 'nueva-funcion-comisiones-instantaneas', type: 'news', category: 'Noticias', title: 'Nueva función: Comisiones instantáneas', excerpt: 'Ahora tus comisiones se acreditan en menos de 60 segundos.', author: 'Equipo Cluv360', authorRole: 'Producto', date: '28 May 2025', readTime: '3 min', views: 8200, image: 'https://images.pexels.com/photos/7688460/pexels-photo-7688460.jpeg?auto=compress&cs=tinysrgb&w=800', featured: true },
  { slug: 'marketing-digital-mlm', type: 'article', category: 'Marketing', title: 'Marketing digital para MLM en 2025', excerpt: 'Construye tu marca personal y atrae afiliados de calidad.', author: 'Ana Ríos', authorRole: 'Dir. Operaciones', date: '1 Jun 2025', readTime: '7 min', views: 2950, image: 'https://images.pexels.com/photos/3194523/pexels-photo-3194523.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { slug: 'tutorial-arbol-genealogico', type: 'video', category: 'Tutoriales', title: 'Tutorial: Árbol genealógico interactivo', excerpt: 'Domina filtros, zoom, búsqueda y exportación de tu red.', author: 'Carlos Torres', authorRole: 'CTO', date: '25 May 2025', readTime: '15 min', views: 5420, image: 'https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { slug: 'retener-afiliados-activos', type: 'article', category: 'Estrategia', title: 'El arte de retener afiliados activos', excerpt: 'Técnicas de seguimiento y mentoring que multiplican la retención.', author: 'Gustavo Ortiz', authorRole: 'CEO', date: '22 May 2025', readTime: '6 min', views: 3650, image: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { slug: 'nuevas-pasarelas-pago-peru', type: 'news', category: 'Noticias', title: 'Integramos Yape y Plin como pasarelas de pago', excerpt: 'Ahora puedes cobrar comisiones directamente a Yape y Plin.', author: 'Equipo Cluv360', authorRole: 'Producto', date: '18 May 2025', readTime: '2 min', views: 7100, image: 'https://images.pexels.com/photos/4968391/pexels-photo-4968391.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { slug: 'maximizar-comisiones-binarias', type: 'video', category: 'Comisiones', title: 'Maximiza tus comisiones binarias', excerpt: 'Aprende a optimizar el balance de tu red binaria.', author: 'Carlos Torres', authorRole: 'CTO', date: '15 May 2025', readTime: '8 min', views: 2180, image: 'https://images.pexels.com/photos/7688460/pexels-photo-7688460.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { slug: 'estrategias-duplicar-red-90-dias', type: 'video', category: 'Estrategia', title: 'Estrategias para duplicar tu red en 90 días', excerpt: '5 estrategias que los líderes Diamante usan para crecer rápido.', author: 'Gustavo Ortiz', authorRole: 'CEO', date: '10 May 2025', readTime: '12 min', views: 3420, image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800' },
];

const categories: Category[] = ['Estrategia', 'Rangos', 'Comisiones', 'Marketing', 'Tutoriales', 'Noticias'];
const ITEMS_PER_PAGE = 6;

function formatViews(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString(); }

const typeConfig: Record<ContentType, { label: string; icon: typeof Video; badge: string; badgeText: string }> = {
  article: { label: 'Artículo', icon: FileText, badge: 'bg-primary/10 text-primary', badgeText: 'Artículo' },
  video: { label: 'Video', icon: Video, badge: 'bg-rose-500/10 text-rose-500', badgeText: 'Video' },
  news: { label: 'Noticia', icon: Newspaper, badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', badgeText: 'Noticia' },
};

export default function BlogPage() {
  const [activeTab, setActiveTab] = useState<'all' | ContentType>('all');
  const [activeCategory, setActiveCategory] = useState<'Todas' | Category>('Todas');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return allItems.filter(item => {
      if (activeTab !== 'all' && item.type !== activeTab) return false;
      if (activeCategory !== 'Todas' && item.category !== activeCategory) return false;
      if (search && !item.title.toLowerCase().includes(search.toLowerCase()) && !item.excerpt.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [activeTab, activeCategory, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const featured = allItems.filter(i => i.featured);

  // Reset page when filters change
  const handleTabChange = (tab: 'all' | ContentType) => { setActiveTab(tab); setPage(1); };
  const handleCategoryChange = (cat: 'Todas' | Category) => { setActiveCategory(cat); setPage(1); };
  const handleSearch = (val: string) => { setSearch(val); setPage(1); };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-10 sm:pt-16 sm:pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-dub-grid opacity-20 mask-fade-center" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/" className="hover:text-foreground transition-colors">Inicio</Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-foreground font-medium">Novedades</span>
          </nav>

          <Reveal>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Recursos</span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight mb-3">
              Novedades, guías y tutoriales
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground/70 max-w-xl">
              Aprende a escalar tu red, domina el sistema de comisiones y mantente al día con las novedades de Cluv360.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Featured ──────────────────────────────────────────────────────── */}
      {activeTab === 'all' && activeCategory === 'Todas' && !search && (
        <section className="pb-8">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                {featured.map((item, i) => (
                  <Link key={item.slug} to={`/blog/${item.slug}`} className={cn('group block', i === 0 && 'md:col-span-2 md:row-span-2')}>
                    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all h-full flex flex-col">
                      <div className={cn('relative overflow-hidden', i === 0 ? 'aspect-[16/9]' : 'aspect-video')}>
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        {item.type === 'video' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                            </div>
                          </div>
                        )}
                        <span className={cn('absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm', typeConfig[item.type].badge)}>
                          {typeConfig[item.type].badgeText}
                        </span>
                      </div>
                      <div className="p-4 sm:p-5 flex-1 flex flex-col">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wide mb-1.5">{item.category}</span>
                        <h3 className={cn('font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2', i === 0 ? 'text-lg sm:text-xl' : 'text-sm sm:text-base')}>
                          {item.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground/60 line-clamp-2 mt-1.5 mb-3">{item.excerpt}</p>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground/50 mt-auto">
                          <span className="font-medium text-foreground/70">{item.author}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.readTime}</span>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatViews(item.views)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ── Filters bar ───────────────────────────────────────────────────── */}
      <section className="py-6 border-y border-border/40 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4">
            {/* Tabs + search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
                {([
                  { value: 'all', label: 'Todo', icon: null },
                  { value: 'article', label: 'Artículos', icon: FileText },
                  { value: 'video', label: 'Videos', icon: Video },
                  { value: 'news', label: 'Noticias', icon: Newspaper },
                ] as const).map(tab => (
                  <button key={tab.value} onClick={() => handleTabChange(tab.value)}
                    className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      activeTab === tab.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                    {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={search} onChange={e => handleSearch(e.target.value)} placeholder="Buscar..."
                  className="w-full pl-9 pr-4 py-2 bg-card border border-border/60 rounded-lg text-sm outline-none focus:border-primary transition-all" />
              </div>
            </div>

            {/* Category pills */}
            <div className="flex flex-wrap items-center gap-2">
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
        </div>
      </section>

      {/* ── Content grid ──────────────────────────────────────────────────── */}
      <section className="py-10 sm:py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {paginated.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground text-sm mb-3">No se encontraron resultados.</p>
              <button onClick={() => { handleTabChange('all'); handleCategoryChange('Todas'); handleSearch(''); }}
                className="text-primary text-sm font-medium hover:underline">Limpiar filtros</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginated.map(item => (
                  <Link key={item.slug} to={`/blog/${item.slug}`} className="group block">
                    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-md transition-all h-full flex flex-col">
                      <div className="relative aspect-video overflow-hidden">
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        {item.type === 'video' && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                            </div>
                          </div>
                        )}
                        <span className={cn('absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm', typeConfig[item.type].badge)}>
                          {typeConfig[item.type].badgeText}
                        </span>
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wide mb-1.5">{item.category}</span>
                        <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors line-clamp-2 mb-1.5">{item.title}</h3>
                        <p className="text-xs text-muted-foreground/60 line-clamp-2 mb-3">{item.excerpt}</p>
                        <div className="flex items-center justify-between mt-auto text-[11px] text-muted-foreground/50">
                          <span className="font-medium text-foreground/70 truncate">{item.author}</span>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.readTime}</span>
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatViews(item.views)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-border/60 hover:bg-muted transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button key={p} onClick={() => setPage(p)}
                        className={cn('w-9 h-9 rounded-lg text-sm font-medium transition-all',
                          p === page ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted')}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-border/60 hover:bg-muted transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    Siguiente <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
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
