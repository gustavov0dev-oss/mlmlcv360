import { Link, useParams } from '@/lib/router';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Clock, Eye, ChevronRight, Share2, Bookmark, ThumbsUp, Facebook } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const articles: Record<string, any> = {
  'estrategias-duplicar-red-90-dias': {
    title: 'Estrategias para duplicar tu red en 90 días',
    category: 'Estrategia',
    type: 'video',
    image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '12:45',
    views: 3420,
    date: '15 Jun 2024',
    author: { name: 'Gustavo Ortiz', role: 'CEO', avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100' },
    content: `
      <p>En este artículo te compartiremos las 5 estrategias más efectivas que nuestros afiliados Diamante han utilizado para duplicar sus redes en menos de 3 meses.</p>
      <h2>1. Seguimiento sistemático</h2>
      <p>Tener un sistema de seguimiento automatizado más el toque personal marca la diferencia.</p>
      <h2>2. Eventos semanales</h2>
      <p>Los líderes Diamante realizan mínimo 2 presentaciones semanales.</p>
      <h2>3. Mentoría uno a uno</h2>
      <p>Dedicar tiempo a los afiliados con mayor potencial multiplica resultados.</p>
      <h2>4. Redes sociales inteligentes</h2>
      <p>Comparte tu historia, no solo el producto.</p>
      <h2>5. Duplicación de procesos</h2>
      <p>Documenta todo lo que funcione y enséñalo a tu equipo.</p>
    `,
    related: [
      { slug: 'como-alcanzar-rango-diamante', title: 'Guía para alcanzar Diamante', image: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=200' },
      { slug: 'maximizar-comisiones-binarias', title: 'Maximiza comisiones binarias', image: 'https://images.pexels.com/photos/7688460/pexels-photo-7688460.jpeg?auto=compress&cs=tinysrgb&w=200' },
    ],
  },
  'como-alcanzar-rango-diamante': {
    title: 'Guía para alcanzar el rango Diamante',
    category: 'Rangos',
    type: 'article',
    image: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=1200',
    date: '10 Jun 2024',
    author: { name: 'María González', role: 'Dir. Comercial', avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100' },
    content: `
      <p>El rango Diamante representa la cúspide del sistema MLM 360.</p>
      <h2>Requisitos</h2>
      <p>500+ afiliados, volumen mensual de S/ 50,000+, mantener rangos anteriores por 3 meses.</p>
      <h2>Mentalidad</h2>
      <p>Diamante es sobre liderazgo, no solo números.</p>
      <h2>Estrategia de retención</h2>
      <p>Un afiliado activo vale 10 veces más que uno nuevo.</p>
    `,
    related: [
      { slug: 'estrategias-duplicar-red-90-dias', title: 'Duplica tu red en 90 días', image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=200' },
      { slug: 'retener-afiliados-activos', title: 'Retener afiliados activos', image: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=200' },
    ],
  },
  'maximizar-comisiones-binarias': {
    title: 'Maximiza tus comisiones binarias',
    category: 'Comisiones',
    type: 'video',
    image: 'https://images.pexels.com/photos/7688460/pexels-photo-7688460.jpeg?auto=compress&cs=tinysrgb&w=1200',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '8:30',
    views: 2180,
    date: '5 Jun 2024',
    author: { name: 'Carlos Torres', role: 'CTO', avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100' },
    content: `<p>Aprende a optimizar el balance de tu red binaria.</p>`,
    related: [],
  },
  'marketing-digital-mlm': {
    title: 'Marketing digital para MLM',
    category: 'Marketing',
    type: 'article',
    image: 'https://images.pexels.com/photos/3194523/pexels-photo-3194523.jpeg?auto=compress&cs=tinysrgb&w=1200',
    date: '1 Jun 2024',
    author: { name: 'Ana Ríos', role: 'Dir. Operaciones', avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100' },
    content: `<p>Construye tu marca personal y atrae afiliados de calidad.</p>`,
    related: [],
  },
  'tutorial-arbol-genealogico': {
    title: 'Tutorial: Árbol genealógico',
    category: 'Tutoriales',
    type: 'video',
    image: 'https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=1200',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '15:20',
    views: 5420,
    date: '28 May 2024',
    author: { name: 'Carlos Torres', role: 'CTO', avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100' },
    content: `<p>Domina filtros, zoom, búsqueda y exportación de tu red.</p>`,
    related: [],
  },
  'retener-afiliados-activos': {
    title: 'El arte de retener afiliados activos',
    category: 'Liderazgo',
    type: 'article',
    image: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1200',
    date: '22 May 2024',
    author: { name: 'Gustavo Ortiz', role: 'CEO', avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100' },
    content: `<p>Técnicas de seguimiento y mentoring que multiplican la retención.</p>`,
    related: [],
  },
};

const defaultArticle = {
  title: 'Artículo no encontrado',
  category: '',
  type: 'article',
  image: '',
  date: '',
  author: { name: '', role: '', avatar: '' },
  content: '<p>No encontrado</p>',
  related: [],
};

export default function BlogDetailPage() {
  const { slug } = useParams();
  const article = articles[slug || ''] || defaultArticle;
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

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
              <Link to="/blog" className="hover:text-foreground">Novedades</Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground font-medium truncate max-w-[200px]">{article.title}</span>
            </nav>
          </div>
        </div>

        {/* Article */}
        <article className="max-w-4xl mx-auto px-6 py-10">
          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className={cn(
                'text-xs font-bold px-2 py-1 rounded',
                article.type === 'video' ? 'bg-red-500 text-white' : 'bg-primary/10 text-primary'
              )}>
                {article.type === 'video' ? 'Video' : 'Artículo'}
              </span>
              <span className="text-xs text-muted-foreground">{article.category}</span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">{article.title}</h1>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <img src={article.author.avatar} alt="" className="w-6 h-6 rounded-full" />
                <span className="font-medium text-foreground">{article.author.name}</span>
              </div>
              <span>{article.date}</span>
              {article.duration && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{article.duration}</span>}
              {article.views && <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{article.views.toLocaleString()}</span>}
            </div>
          </header>

          {/* Actions */}
          <div className="flex items-center gap-2 mb-8 pb-6 border-b border-border">
            <button onClick={() => setLiked(!liked)} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition', liked ? 'bg-primary/10 text-primary' : 'bg-muted hover:bg-muted/70')}>
              <ThumbsUp className="w-4 h-4" /> Me gusta
            </button>
            <button onClick={() => setSaved(!saved)} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition', saved ? 'bg-amber-500/10 text-amber-600' : 'bg-muted hover:bg-muted/70')}>
              <Bookmark className="w-4 h-4" /> Guardar
            </button>
            <div className="flex items-center gap-1 ml-auto">
              <button className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center"><Facebook className="w-4 h-4" /></button>
              <button className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center"><Share2 className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Video */}
          {article.type === 'video' && article.videoUrl && (
            <div className="aspect-video rounded-xl overflow-hidden bg-card border border-border mb-8">
              <iframe src={article.videoUrl} className="w-full h-full" allowFullScreen />
            </div>
          )}

          {/* Content */}
          <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground" dangerouslySetInnerHTML={{ __html: article.content }} />

          {/* Related */}
          {article.related?.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border">
              <h2 className="text-lg font-bold text-foreground mb-4">Relacionado</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {article.related.map((r: any) => (
                  <Link key={r.slug} to={`/blog/${r.slug}`} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/30 transition">
                    <img src={r.image} alt="" className="w-14 h-14 rounded object-cover" />
                    <span className="text-sm font-medium text-foreground">{r.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>
      <Footer />
    </div>
  );
}
