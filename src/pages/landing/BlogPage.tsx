import { useState } from 'react';
import { Link } from '@/lib/router';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Play, Eye, ChevronRight, Video, Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  type: 'article' | 'video';
  category: string;
  image: string;
  duration?: string;
  views?: number;
  date: string;
  author: { name: string; avatar: string };
}

const articles: Article[] = [
  {
    id: '1', slug: 'estrategias-duplicar-red-90-dias', title: 'Estrategias para duplicar tu red en 90 días',
    excerpt: 'Técnicas probadas por los líderes Diamante para crecimiento exponencial.',
    type: 'video', category: 'Estrategia',
    image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=600',
    duration: '12:45', views: 3420, date: '15 Jun',
    author: { name: 'Gustavo Ortiz', avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100' },
  },
  {
    id: '2', slug: 'como-alcanzar-rango-diamante', title: 'Guía para alcanzar el rango Diamante',
    excerpt: 'Requisitos, estrategias y mentalidad para el máximo rango.',
    type: 'article', category: 'Rangos',
    image: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=600',
    date: '10 Jun',
    author: { name: 'María González', avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100' },
  },
  {
    id: '3', slug: 'maximizar-comisiones-binarias', title: 'Maximiza tus comisiones binarias',
    excerpt: 'Optimiza el balance de tu red para cobrar el máximo cada quincena.',
    type: 'video', category: 'Comisiones',
    image: 'https://images.pexels.com/photos/7688460/pexels-photo-7688460.jpeg?auto=compress&cs=tinysrgb&w=600',
    duration: '8:30', views: 2180, date: '5 Jun',
    author: { name: 'Carlos Torres', avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100' },
  },
  {
    id: '4', slug: 'marketing-digital-mlm', title: 'Marketing digital para MLM',
    excerpt: 'Construye tu marca personal y atrae afiliados de calidad.',
    type: 'article', category: 'Marketing',
    image: 'https://images.pexels.com/photos/3194523/pexels-photo-3194523.jpeg?auto=compress&cs=tinysrgb&w=600',
    date: '1 Jun',
    author: { name: 'Ana Ríos', avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100' },
  },
  {
    id: '5', slug: 'tutorial-arbol-genealogico', title: 'Tutorial: Árbol genealógico',
    excerpt: 'Domina filtros, zoom, búsqueda y exportación de tu red.',
    type: 'video', category: 'Tutoriales',
    image: 'https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=600',
    duration: '15:20', views: 5420, date: '28 May',
    author: { name: 'Carlos Torres', avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100' },
  },
  {
    id: '6', slug: 'retener-afiliados-activos', title: 'El arte de retener afiliados activos',
    excerpt: 'Técnicas de seguimiento y mentoring que multiplican la retención.',
    type: 'article', category: 'Liderazgo',
    image: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=600',
    date: '22 May',
    author: { name: 'Gustavo Ortiz', avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100' },
  },
];

const categories = ['Todos', 'Estrategia', 'Rangos', 'Comisiones', 'Marketing', 'Tutoriales', 'Liderazgo'];

export default function BlogPage() {
  const [category, setCategory] = useState('Todos');
  const [format, setFormat] = useState<'all' | 'video' | 'article'>('all');

  const filtered = articles.filter(a => {
    const cat = category === 'Todos' || a.category === category;
    const fmt = format === 'all' || a.type === format;
    return cat && fmt;
  });

  const videos = filtered.filter(a => a.type === 'video');
  const posts = filtered.filter(a => a.type === 'article');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-foreground">Inicio</Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground font-medium">Novedades</span>
            </nav>
          </div>
        </div>

        {/* Header + Filters */}
        <section className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-10">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">Novedades</h1>
                <p className="text-muted-foreground">Videos, tutoriales y artículos para crecer tu negocio.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Format toggle */}
                <div className="flex bg-muted/50 rounded-lg p-1">
                  {[
                    { key: 'all', label: 'Todo' },
                    { key: 'video', label: 'Videos', icon: Video },
                    { key: 'article', label: 'Artículos', icon: Newspaper },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFormat(f.key as any)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition',
                        format === f.key
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {f.icon && <f.icon className="w-3.5 h-3.5" />}
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Category select */}
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="px-3 py-1.5 bg-muted/50 border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
                >
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Content Grid */}
        <section className="py-8">
          <div className="max-w-6xl mx-auto px-6">
            {/* Videos Section */}
            {(format === 'all' || format === 'video') && videos.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-5">
                  <Video className="w-5 h-5 text-red-500" />
                  <h2 className="text-lg font-bold text-foreground">Videos</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {videos.map((v) => (
                    <Link key={v.id} to={`/blog/${v.slug}`} className="group">
                      <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition">
                        <div className="relative aspect-video">
                          <img src={v.image} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                              <Play className="w-5 h-5 text-red-500 ml-0.5" fill="currentColor" />
                            </div>
                          </div>
                          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">{v.duration}</span>
                          <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded">{v.category}</span>
                        </div>
                        <div className="p-4">
                          <h3 className="font-medium text-foreground text-sm mb-2 line-clamp-2 group-hover:text-primary">{v.title}</h3>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{v.author.name}</span>
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{v.views?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Articles Section */}
            {(format === 'all' || format === 'article') && posts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <Newspaper className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">Artículos</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {posts.map((a) => (
                    <Link key={a.id} to={`/blog/${a.slug}`} className="group">
                      <div className="bg-card border border-border rounded-xl p-4 flex gap-4 hover:border-primary/30 transition">
                        <img src={a.image} alt={a.title} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-primary font-semibold">{a.category}</span>
                          <h3 className="font-medium text-foreground text-sm mb-1 line-clamp-2 group-hover:text-primary">{a.title}</h3>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{a.author.name}</span>
                            <span>{a.date}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Empty */}
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No hay contenido con estos filtros.</p>
                <button onClick={() => { setCategory('Todos'); setFormat('all'); }} className="text-primary font-medium">
                  Ver todo
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
