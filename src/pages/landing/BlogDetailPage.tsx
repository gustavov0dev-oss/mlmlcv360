import { Link, useParams } from '@/lib/router';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Reveal } from '@/components/landing/Reveal';
import { Clock, Eye, Share2, Bookmark, ThumbsUp, Play, ArrowLeft, FileText, Video, Newspaper, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface RelatedItem { slug: string; title: string; image: string; type: string; }
interface Article {
  title: string; category: string; type: 'article' | 'video' | 'news';
  image: string; videoUrl?: string; duration?: string; views?: number; date: string;
  author: { name: string; role: string; avatar: string };
  content: string; related: RelatedItem[];
}

const articles: Record<string, Article> = {
  'alcanzar-rango-diamante-6-meses': {
    title: 'Cómo alcanzar el rango Diamante en 6 meses', category: 'Estrategia', type: 'article',
    image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200',
    date: '15 Jun 2025', views: 4280, author: { name: 'Carlos Mendoza', role: 'Líder Diamante', avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=120' },
    content: `<p>Alcanzar el rango Diamante no es cuestión de suerte, sino de sistema. En este artículo te comparto el método exacto que usé para llegar ahí en 6 meses.</p><h2>1. Define tu meta mensual</h2><p>Desglosa el volumen requerido en metas semanales. Si necesitas S/ 50,000 en volumen, son S/ 12,500 por semana. Esto hace que la meta sea manejable y medible.</p><h2>2. Enfócate en retener, no solo en reclutar</h2><p>Un afiliado activo vale 10 veces más que uno nuevo. Dedica el 60% de tu tiempo a retención: llamadas de seguimiento, reconocimiento y mentoría personalizada.</p><h2>3. Duplica tu sistema</h2><p>Documenta todo lo que funciona y enséñalo a tu equipo. La duplicación es la clave del crecimiento exponencial en MLM. Si tu sistema no se puede duplicar, tu red no crecerá.</p><h2>4. Eventos semanales</h2><p>Realiza mínimo 2 presentaciones por semana. La consistencia vence al talento. Cada presentación es una oportunidad de reclutar y de motivar a tu equipo existente.</p><h2>5. Mentoría uno a uno</h2><p>Identifica a los 3 afiliados con mayor potencial y dedícales tiempo personalizado. Ellos serán tus futuros líderes y multiplicarán tu red.</p>`,
    related: [
      { slug: 'comisiones-binarias-guia-2025', title: 'Comisiones binarias: Guía 2025', image: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'article' },
      { slug: 'retener-afiliados-activos', title: 'Retener afiliados activos', image: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'article' },
    ],
  },
  'tour-completo-dashboard': {
    title: 'Tour completo del dashboard', category: 'Tutoriales', type: 'video',
    image: 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=1200',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: '22:15', views: 6150, date: '12 Jun 2025',
    author: { name: 'Ana Rodríguez', role: 'Soporte', avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=120' },
    content: `<p>En este video recorremos cada función del panel de control de Cluv360, desde el resumen general hasta los reportes avanzados.</p><h2>Resumen general</h2><p>El dashboard muestra tus comisiones, red activa, rango actual y volumen mensual de un vistazo. Todo en tiempo real.</p><h2>Comisiones</h2><p>Ve cada comisión desglosada: directas, binarias, bonos de rango y residuales. Filtra por fecha y exporta en Excel.</p><h2>Mi Red</h2><p>El árbol genealógico interactivo te permite ver, filtrar y exportar tu red completa. Usa zoom, búsqueda y filtros avanzados.</p>`,
    related: [
      { slug: 'tutorial-arbol-genealogico', title: 'Tutorial: Árbol genealógico', image: 'https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'video' },
      { slug: 'comisiones-binarias-guia-2025', title: 'Comisiones binarias: Guía 2025', image: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'article' },
    ],
  },
  'comisiones-binarias-guia-2025': {
    title: 'Comisiones binarias: Guía definitiva 2025', category: 'Comisiones', type: 'article',
    image: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=1200',
    date: '10 Jun 2025', views: 3890, author: { name: 'Luis García', role: 'Analista', avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=120' },
    content: `<p>El sistema binario de Cluv360 es uno de los más eficientes del mercado. Aquí te explico cómo funciona y cómo maximizarlo.</p><h2>¿Cómo funciona?</h2><p>Tienes dos patas: izquierda y derecha. El sistema paga un porcentaje del volumen de tu pata menor, lo que incentiva el balance.</p><h2>Balance es clave</h2><p>Mantén tus dos patas lo más balanceadas posible para maximizar comisiones. Una pata muy grande y otra pequeña significa que estás dejando dinero en la mesa.</p><h2>Límite diario</h2><p>Cada rango tiene un límite de pago diario. Conoce el tuyo para optimizar tu estrategia y no perder volumen.</p>`,
    related: [
      { slug: 'alcanzar-rango-diamante-6-meses', title: 'Alcanzar Diamante en 6 meses', image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'article' },
      { slug: 'maximizar-comisiones-binarias', title: 'Maximiza comisiones binarias', image: 'https://images.pexels.com/photos/7688460/pexels-photo-7688460.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'video' },
    ],
  },
  '5-scripts-ventas-convierten': {
    title: '5 scripts de ventas que convierten', category: 'Marketing', type: 'video',
    image: 'https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=1200',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: '18:30', views: 5420, date: '8 Jun 2025',
    author: { name: 'María Torres', role: 'Coach', avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=120' },
    content: `<p>Los scripts de ventas son herramientas, no camisas de fuerza. Aquí te comparto 5 que funcionan en el mundo real.</p><h2>1. El invitar sin presionar</h2><p>"Tengo algo que te puede interesar, ¿tienes 10 minutos esta semana?" — simple, directo y sin presión.</p><h2>2. El de la curiosidad</h2><p>"Descubrí algo que está cambiando mi vida financiera, ¿quieres que te cuente?" — genera interés sin revelar demasiado.</p><h2>3. El del problema</h2><p>"¿Qué es lo que más te gustaría cambiar de tu situación actual?" — abre una conversación real sobre necesidades.</p>`,
    related: [
      { slug: 'marketing-digital-mlm', title: 'Marketing digital para MLM', image: 'https://images.pexels.com/photos/3194523/pexels-photo-3194523.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'article' },
      { slug: 'estrategias-duplicar-red-90-dias', title: 'Duplica tu red en 90 días', image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'video' },
    ],
  },
  'sistema-rangos-bronce-corona': {
    title: 'Sistema de rangos: del Bronce a la Corona', category: 'Rangos', type: 'article',
    image: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1200',
    date: '2 Jun 2025', views: 4100, author: { name: 'Ana Rodríguez', role: 'Soporte', avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=120' },
    content: `<p>El sistema de rangos de Cluv360 está diseñado para recompensar el esfuerzo y el liderazgo. Cada rango desbloquea nuevos bonos y beneficios.</p><h2>Bronce</h2><p>El punto de partida. Requiere 5 afiliados activos y S/ 2,000 en volumen mensual. Desbloquea comisiones directas.</p><h2>Plata</h2><p>15 afiliados y S/ 8,000 en volumen. Desbloquea bonos de equipo y comisiones binarias.</p><h2>Oro</h2><p>50 afiliados y S/ 20,000. Acceso a bonos de liderazgo y eventos exclusivos.</p><h2>Diamante</h2><p>500+ afiliados y S/ 50,000. Bono de rango completo y acceso a mentoría personalizada del equipo Cluv360.</p>`,
    related: [
      { slug: 'alcanzar-rango-diamante-6-meses', title: 'Alcanzar Diamante en 6 meses', image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'article' },
      { slug: 'comisiones-binarias-guia-2025', title: 'Comisiones binarias: Guía 2025', image: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'article' },
    ],
  },
  'nueva-funcion-comisiones-instantaneas': {
    title: 'Nueva función: Comisiones instantáneas', category: 'Noticias', type: 'news',
    image: 'https://images.pexels.com/photos/7688460/pexels-photo-7688460.jpeg?auto=compress&cs=tinysrgb&w=1200',
    date: '28 May 2025', views: 8200, author: { name: 'Equipo Cluv360', role: 'Producto', avatar: 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=120' },
    content: `<p>A partir de hoy, las comisiones de tu red se acreditan en menos de 60 segundos. Una mejora que cambia la experiencia de cada afiliado.</p><h2>¿Qué cambió?</h2><p>Mejoramos nuestro motor de procesamiento para que cada venta se refleje en tiempo real en tu dashboard. Sin esperas, sin solicitudes manuales.</p><h2>¿A quién aplica?</h2><p>A todos los afiliados activos, sin importar su rango. La función está disponible 24/7.</p><h2>¿Qué necesitas hacer?</h2><p>Nada. La función ya está activa en tu cuenta. Solo entra a tu dashboard y verás tus comisiones actualizadas en tiempo real.</p>`,
    related: [
      { slug: 'nuevas-pasarelas-pago-peru', title: 'Integramos Yape y Plin', image: 'https://images.pexels.com/photos/4968391/pexels-photo-4968391.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'news' },
      { slug: 'comisiones-binarias-guia-2025', title: 'Comisiones binarias: Guía 2025', image: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'article' },
    ],
  },
  'marketing-digital-mlm': {
    title: 'Marketing digital para MLM en 2025', category: 'Marketing', type: 'article',
    image: 'https://images.pexels.com/photos/3194523/pexels-photo-3194523.jpeg?auto=compress&cs=tinysrgb&w=1200',
    date: '1 Jun 2025', views: 2950, author: { name: 'Ana Ríos', role: 'Dir. Operaciones', avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=120' },
    content: `<p>El marketing digital es la palanca más poderosa para un afiliado moderno. Aquí te enseño cómo usarlo correctamente.</p><h2>Marca personal primero</h2><p>La gente no se une a empresas, se une a personas. Construye tu marca antes de vender. Comparte tu journey, tus valores y tu visión.</p><h2>Contenido que atrae</h2><p>Comparte tu journey, no solo resultados. La autenticidad convierte más que la perfección. Un post honesto sobre un desafío superado genera más engagement que uno de "gané S/ 10,000".</p><h2>Automatiza el seguimiento</h2><p>Usa herramientas de mensajería para no perder prospectos por falta de respuesta. El 80% de las ventas requieren 5+ contactos.</p>`,
    related: [
      { slug: '5-scripts-ventas-convierten', title: '5 scripts de ventas', image: 'https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'video' },
      { slug: 'estrategias-duplicar-red-90-dias', title: 'Duplica tu red en 90 días', image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'video' },
    ],
  },
  'tutorial-arbol-genealogico': {
    title: 'Tutorial: Árbol genealógico interactivo', category: 'Tutoriales', type: 'video',
    image: 'https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=1200',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: '15:20', views: 5420, date: '25 May 2025',
    author: { name: 'Carlos Torres', role: 'CTO', avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=120' },
    content: `<p>El árbol genealógico es la herramienta más poderosa de Cluv360. Aquí te enseño a usarlo como un profesional.</p><h2>Vista general</h2><p>El árbol muestra tu red binaria completa, con colores por rango y estado de actividad. Puedes ver toda tu organización de un vistazo.</p><h2>Filtros</h2><p>Filtra por rango, estado, fecha de ingreso y volumen. Encuentra rápidamente a los afiliados que necesitan tu atención.</p><h2>Zoom y navegación</h2><p>Usa los controles de zoom o el scroll del mouse para navegar por toda tu red. En móvil, usa gestos de pellizco.</p><h2>Exportación</h2><p>Exporta tu árbol en PDF o Excel para análisis offline. Ideal para presentaciones y planificación estratégica.</p>`,
    related: [
      { slug: 'tour-completo-dashboard', title: 'Tour completo del dashboard', image: 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'video' },
      { slug: 'sistema-rangos-bronce-corona', title: 'Sistema de rangos', image: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'article' },
    ],
  },
  'retener-afiliados-activos': {
    title: 'El arte de retener afiliados activos', category: 'Estrategia', type: 'article',
    image: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1200',
    date: '22 May 2025', views: 3650, author: { name: 'Gustavo Ortiz', role: 'CEO', avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=120' },
    content: `<p>La retención es el verdadero secreto del éxito en MLM. Aquí te enseño cómo lograrla con un sistema probado.</p><h2>Onboarding efectivo</h2><p>Los primeros 7 días son críticos. Acompaña a cada nuevo afiliado de cerca. Un buen onboarding aumenta la retención en un 300%.</p><h2>Reconocimiento constante</h2><p>Celebra los logros pequeños. El reconocimiento es el combustible del MLM. Un mensaje de felicitación puede marcar la diferencia.</p><h2>Sistema de mentoría</h2><p>Asigna un mentor a cada nuevo afiliado. La conexión humana retiene más que el dinero. Los afiliados con mentor tienen 5x más probabilidades de permanecer activos.</p>`,
    related: [
      { slug: 'alcanzar-rango-diamante-6-meses', title: 'Alcanzar Diamante en 6 meses', image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'article' },
      { slug: 'estrategias-duplicar-red-90-dias', title: 'Duplica tu red en 90 días', image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'video' },
    ],
  },
  'nuevas-pasarelas-pago-peru': {
    title: 'Integramos Yape y Plin como pasarelas de pago', category: 'Noticias', type: 'news',
    image: 'https://images.pexels.com/photos/4968391/pexels-photo-4968391.jpeg?auto=compress&cs=tinysrgb&w=1200',
    date: '18 May 2025', views: 7100, author: { name: 'Equipo Cluv360', role: 'Producto', avatar: 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=120' },
    content: `<p>Ahora puedes recibir tus comisiones directamente en Yape y Plin, las pasarelas de pago más usadas en Perú.</p><h2>¿Qué significa?</h2><p>Tus comisiones se acreditan instantáneamente en tu cuenta de Yape o Plin, sin esperas ni trámites adicionales.</p><h2>¿Cómo activarlo?</h2><p>Ve a Configuración > Métodos de pago y selecciona tu pasarela preferida. Solo necesitas tu número de celular registrado.</p><h2>Disponibilidad</h2><p>Disponible para todos los afiliados en Perú desde hoy. Próximamente en Colombia y Ecuador.</p>`,
    related: [
      { slug: 'nueva-funcion-comisiones-instantaneas', title: 'Comisiones instantáneas', image: 'https://images.pexels.com/photos/7688460/pexels-photo-7688460.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'news' },
      { slug: 'comisiones-binarias-guia-2025', title: 'Comisiones binarias: Guía 2025', image: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'article' },
    ],
  },
  'maximizar-comisiones-binarias': {
    title: 'Maximiza tus comisiones binarias', category: 'Comisiones', type: 'video',
    image: 'https://images.pexels.com/photos/7688460/pexels-photo-7688460.jpeg?auto=compress&cs=tinysrgb&w=1200',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: '8:30', views: 2180, date: '15 May 2025',
    author: { name: 'Carlos Torres', role: 'CTO', avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=120' },
    content: `<p>Aprende a optimizar el balance de tu red binaria para maximizar comisiones con estrategias prácticas.</p><h2>La regla del 60/40</h2><p>Mantén tu pata mayor al 60% y la menor al 40% para optimizar el pago. Esto evita que el volumen se quede sin cobrar.</p><h2>Monitoreo semanal</h2><p>Revisa el balance de tus patas cada semana y ajusta tu estrategia de reclutamiento. Un afiliado nuevo en la pata menor puede marcar la diferencia.</p>`,
    related: [
      { slug: 'comisiones-binarias-guia-2025', title: 'Comisiones binarias: Guía 2025', image: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'article' },
      { slug: 'sistema-rangos-bronce-corona', title: 'Sistema de rangos', image: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'article' },
    ],
  },
  'estrategias-duplicar-red-90-dias': {
    title: 'Estrategias para duplicar tu red en 90 días', category: 'Estrategia', type: 'video',
    image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: '12:45', views: 3420, date: '10 May 2025',
    author: { name: 'Gustavo Ortiz', role: 'CEO', avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=120' },
    content: `<p>Las 5 estrategias más efectivas que nuestros afiliados Diamante han utilizado para duplicar sus redes en menos de 3 meses.</p><h2>1. Seguimiento sistemático</h2><p>Tener un sistema de seguimiento automatizado más el toque personal marca la diferencia. Cada prospecto recibe mínimo 5 contactos.</p><h2>2. Eventos semanales</h2><p>Los líderes Diamante realizan mínimo 2 presentaciones semanales. La consistencia es la clave del crecimiento.</p><h2>3. Mentoría uno a uno</h2><p>Dedicar tiempo a los afiliados con mayor potencial multiplica resultados. Invierte en quienes invierten en sí mismos.</p><h2>4. Redes sociales inteligentes</h2><p>Comparte tu historia, no solo el producto. La autenticidad atrae afiliados de calidad.</p><h2>5. Duplicación de procesos</h2><p>Documenta todo lo que funcione y enséñalo a tu equipo. La duplicación es el motor del crecimiento exponencial.</p>`,
    related: [
      { slug: 'alcanzar-rango-diamante-6-meses', title: 'Alcanzar Diamante en 6 meses', image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'article' },
      { slug: 'retener-afiliados-activos', title: 'Retener afiliados activos', image: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=300', type: 'article' },
    ],
  },
};

const defaultArticle: Article = {
  title: 'Contenido no encontrado', category: '', type: 'article', image: '', date: '',
  author: { name: '', role: '', avatar: '' }, content: '<p>El contenido que buscas no existe o ha sido movido.</p>', related: [],
};

const typeMeta = {
  article: { label: 'Artículo', icon: FileText, badge: 'bg-primary/10 text-primary border-primary/20' },
  video: { label: 'Video', icon: Video, badge: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  news: { label: 'Noticia', icon: Newspaper, badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
};

export default function BlogDetailPage() {
  const { slug } = useParams();
  const article = articles[slug || ''] || defaultArticle;
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const TypeIcon = typeMeta[article.type].icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-28">
        {/* SEO breadcrumb — visually hidden */}
        <nav aria-label="breadcrumb" className="sr-only">
          <Link to="/">Inicio</Link> / <Link to="/blog">Novedades</Link> / <span>{article.title}</span>
        </nav>

        {/* Article */}
        <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Back link */}
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Volver a Novedades
          </Link>

          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border', typeMeta[article.type].badge)}>
                <TypeIcon className="w-3 h-3" /> {typeMeta[article.type].label}
              </span>
              <span className="text-xs text-muted-foreground/60">{article.category}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-5 leading-tight tracking-tight">{article.title}</h1>

            <div className="flex items-center gap-3 sm:gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2.5">
                {article.author.avatar && <img src={article.author.avatar} alt="" className="w-8 h-8 rounded-full" />}
                <div className="leading-tight">
                  <div className="font-medium text-foreground text-xs sm:text-sm">{article.author.name}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground/50">{article.author.role}</div>
                </div>
              </div>
              <span className="text-muted-foreground/30 hidden sm:inline">·</span>
              <span className="flex items-center gap-1 text-xs sm:text-sm"><Calendar className="w-3.5 h-3.5" />{article.date}</span>
              {article.duration && <><span className="text-muted-foreground/30">·</span><span className="flex items-center gap-1 text-xs sm:text-sm"><Clock className="w-3.5 h-3.5" />{article.duration}</span></>}
              {article.views != null && article.views > 0 && <><span className="text-muted-foreground/30 hidden sm:inline">·</span><span className="flex items-center gap-1 text-xs sm:text-sm"><Eye className="w-3.5 h-3.5" />{article.views.toLocaleString()}</span></>}
            </div>
          </header>

          {/* Cover image or video */}
          {article.type === 'video' && article.videoUrl ? (
            <div className="aspect-video rounded-2xl overflow-hidden bg-black border border-border mb-8 shadow-lg">
              <iframe src={article.videoUrl} className="w-full h-full" allowFullScreen title={article.title} />
            </div>
          ) : article.image ? (
            <div className="aspect-[16/9] rounded-2xl overflow-hidden border border-border mb-8 shadow-lg">
              <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex items-center gap-2 mb-8 pb-6 border-b border-border/40">
            <button onClick={() => setLiked(!liked)} className={cn('flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all', liked ? 'bg-primary/10 text-primary' : 'bg-muted hover:bg-muted/70 text-muted-foreground')}>
              <ThumbsUp className={cn('w-4 h-4', liked && 'fill-primary')} /> Me gusta
            </button>
            <button onClick={() => setSaved(!saved)} className={cn('flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all', saved ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-muted hover:bg-muted/70 text-muted-foreground')}>
              <Bookmark className={cn('w-4 h-4', saved && 'fill-amber-500')} /> Guardar
            </button>
            <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-muted hover:bg-muted/70 text-muted-foreground transition-all ml-auto">
              <Share2 className="w-4 h-4" /> Compartir
            </button>
          </div>

          {/* Content */}
          <div className="prose prose-sm dark:prose-invert max-w-none
            prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight
            prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:text-[15px]
            prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
            prose-a:text-primary prose-strong:text-foreground
            prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
            prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: article.content }} />
        </article>

        {/* Related */}
        {article.related.length > 0 && (
          <section className="py-12 sm:py-14 bg-muted/20 border-t border-border/40">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
              <Reveal>
                <h2 className="text-lg sm:text-xl font-bold text-foreground mb-5">Contenido relacionado</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {article.related.map((r) => {
                    const rel = articles[r.slug];
                    if (!rel) return null;
                    const RelIcon = typeMeta[rel.type as keyof typeof typeMeta].icon;
                    return (
                      <Link key={r.slug} to={`/blog/${r.slug}`} className="group block">
                        <div className="bg-card border border-border/50 rounded-xl overflow-hidden card-lift flex flex-col sm:flex-row">
                          <div className="relative sm:w-32 aspect-video sm:aspect-square overflow-hidden shrink-0">
                            <img src={r.image} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            {rel.type === 'video' && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                              </div>
                            )}
                          </div>
                          <div className="p-3.5 sm:p-4 flex-1 flex flex-col">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border', typeMeta[rel.type as keyof typeof typeMeta].badge)}>
                                <RelIcon className="w-2.5 h-2.5" />{typeMeta[rel.type as keyof typeof typeMeta].label}
                              </span>
                            </div>
                            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">{r.title}</h3>
                            <div className="flex items-center gap-2 mt-auto pt-2 text-[11px] text-muted-foreground/50">
                              <span>{rel.date}</span>
                              <span>·</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{rel.duration || '5 min'}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </Reveal>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
