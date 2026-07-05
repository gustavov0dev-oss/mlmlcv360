import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Calendar, User, ArrowRight, Tag } from 'lucide-react';

const posts = [
  {
    id: '1', title: '5 estrategias para duplicar tu red de afiliados en 90 días',
    excerpt: 'Descubre las técnicas probadas que usan los líderes Diamante para acelerar el crecimiento de su red y multiplicar sus ingresos.',
    category: 'Estrategias', author: 'Gustavo Ortiz', date: '15 Jun 2024',
    img: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=600',
    readTime: '5 min',
  },
  {
    id: '2', title: 'Cómo alcanzar el rango Diamante: Guía completa 2024',
    excerpt: 'Todo lo que necesitas saber sobre los requisitos, estrategias y mentalidad para llegar al rango Diamante en MLM 360.',
    category: 'Rangos', author: 'María González', date: '10 Jun 2024',
    img: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=600',
    readTime: '8 min',
  },
  {
    id: '3', title: 'Maximiza tus comisiones binarias: Tips de expertos',
    excerpt: 'Aprende a optimizar el balance de tu red binaria para maximizar el cobro de comisiones cada quincena.',
    category: 'Comisiones', author: 'Carlos Torres', date: '5 Jun 2024',
    img: 'https://images.pexels.com/photos/7688460/pexels-photo-7688460.jpeg?auto=compress&cs=tinysrgb&w=600',
    readTime: '6 min',
  },
  {
    id: '4', title: 'Marketing digital para MLM: Construye tu marca personal',
    excerpt: 'Las redes sociales y el marketing de contenido son tus aliados. Aprende a usarlos para atraer afiliados de calidad.',
    category: 'Marketing', author: 'Ana Ríos', date: '1 Jun 2024',
    img: 'https://images.pexels.com/photos/3194523/pexels-photo-3194523.jpeg?auto=compress&cs=tinysrgb&w=600',
    readTime: '7 min',
  },
  {
    id: '5', title: 'El poder del seguimiento: Cómo retener afiliados activos',
    excerpt: 'Un afiliado activo vale más que diez nuevos. Descubre las mejores técnicas de seguimiento y mentoring.',
    category: 'Liderazgo', author: 'Gustavo Ortiz', date: '28 May 2024',
    img: 'https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=600',
    readTime: '4 min',
  },
  {
    id: '6', title: 'Automatiza tu negocio MLM con las herramientas de MLM 360',
    excerpt: 'Conoce todas las funciones de automatización que ofrece la plataforma para gestionar tu red de forma eficiente.',
    category: 'Tecnología', author: 'Carlos Torres', date: '22 May 2024',
    img: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=600',
    readTime: '5 min',
  },
];

const categories = ['Todos', 'Estrategias', 'Rangos', 'Comisiones', 'Marketing', 'Liderazgo', 'Tecnología'];
const categoryColors: Record<string, string> = {
  Estrategias: 'bg-blue-500/10 text-blue-500',
  Rangos: 'bg-yellow-500/10 text-yellow-500',
  Comisiones: 'bg-green-500/10 text-green-500',
  Marketing: 'bg-purple-500/10 text-purple-500',
  Liderazgo: 'bg-red-500/10 text-red-500',
  Tecnología: 'bg-cyan-500/10 text-cyan-500',
};

export default function BlogPage() {
  return (
    <div className="h-screen bg-background overflow-y-auto overflow-x-hidden">
      <Navbar />
      <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h1 className="text-5xl font-bold text-foreground mb-4">Blog MLM 360</h1>
              <p className="text-xl text-muted-foreground">Estrategias, consejos y noticias para hacer crecer tu negocio.</p>
            </div>

            {/* Category filters */}
            <div className="flex flex-wrap gap-2 mb-10 justify-center">
              {categories.map(cat => (
                <button key={cat} className={cat === 'Todos' ? 'px-4 py-1.5 bg-primary text-white rounded-full text-sm font-medium' : 'px-4 py-1.5 bg-muted text-muted-foreground rounded-full text-sm hover:bg-muted/80 transition-colors'}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Featured post */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden mb-8 hover:border-primary/30 hover:shadow-lg transition-all group">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <img src={posts[0].img} alt={posts[0].title} className="w-full h-64 md:h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="p-8 flex flex-col justify-center">
                  <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full w-fit mb-4 ${categoryColors[posts[0].category] || 'bg-muted text-muted-foreground'}`}>
                    <Tag className="w-3 h-3" />
                    {posts[0].category}
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-3">{posts[0].title}</h2>
                  <p className="text-muted-foreground mb-5 leading-relaxed">{posts[0].excerpt}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-5">
                    <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{posts[0].author}</span>
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{posts[0].date}</span>
                    <span>{posts[0].readTime} lectura</span>
                  </div>
                  <button className="flex items-center gap-2 text-primary font-medium text-sm hover:gap-3 transition-all">
                    Leer artículo <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.slice(1).map(post => (
                <div key={post.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all group cursor-pointer">
                  <div className="overflow-hidden h-48">
                    <img src={post.img} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-5">
                    <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full mb-3 ${categoryColors[post.category] || 'bg-muted text-muted-foreground'}`}>
                      <Tag className="w-3 h-3" />
                      {post.category}
                    </div>
                    <h3 className="font-bold text-foreground mb-2 line-clamp-2">{post.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.author}</span>
                      <span>{post.readTime} lectura</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      <Footer />
    </div>
  );
}
