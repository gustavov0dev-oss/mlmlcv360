import { Link, useParams } from '@/lib/router';
import { Clock, Eye, Share2, Bookmark, ThumbsUp, Play, ArrowLeft, FileText, Video, Newspaper, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

import { useNews } from '@/hooks/useNews';
import { safeNewsHtml, videoEmbed, directVideoUrl } from '@/lib/newsContent';
import { LoadingRegion } from '@/components/ui/loading-region';

const defaultArticle = { videoUrl: '', duration: '', views: 0,
  title: 'Contenido no encontrado', category: '', type: 'article', image: '', date: '',
  author: { name: '', role: '', avatar: '' }, content: '<p>El contenido que buscas no existe o ha sido movido.</p>', related: [],
};

const typeMeta = {
  article: { label: 'Artículo', icon: FileText, badge: 'bg-primary/15 text-primary' },
  video: { label: 'Video', icon: Video, badge: 'bg-rose-500/15 text-rose-400' },
  news: { label: 'Noticia', icon: Newspaper, badge: 'bg-amber-500/15 text-amber-400' },
};

export default function BlogDetailPage() {
  const { slug } = useParams();
  const {rows,loading,error,reload}=useNews();
  const articles = Object.fromEntries(rows.map(row=>[row.slug,{...row.data,author:{name:row.data.author,role:row.data.authorRole,avatar:row.data.authorAvatar},related:rows.filter(r=>r.id!==row.id && r.data.category===row.data.category).slice(0,2).map(r=>({...r.data,slug:r.slug}))}]));
  const article = articles[slug || ''] || defaultArticle;
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const TypeIcon = typeMeta[article.type as keyof typeof typeMeta].icon;
  if(loading)return <LoadingRegion className="min-h-[70vh] pt-28"/>;
  if(error)return <div role="alert" className="pt-28 pb-20 text-center">No se pudo cargar esta publicación. <button className="text-primary" onClick={()=>void reload()}>Reintentar</button></div>;
  if(!articles[slug||''])return <div className="pt-28 pb-20 text-center"><h1 className="text-2xl font-bold">Publicación no disponible</h1><Link to="/blog" className="text-primary block mt-4">Volver a Novedades</Link></div>;

  return (
    <>
      <main className="flex-1 pt-20">
        <nav aria-label="breadcrumb" className="sr-only">
          <Link to="/">Inicio</Link> / <Link to="/blog">Novedades</Link> / <span>{article.title}</span>
        </nav>

        <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Volver a Novedades
          </Link>

          <header className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full', typeMeta[article.type as keyof typeof typeMeta].badge)}>
                <TypeIcon className="w-3 h-3" /> {typeMeta[article.type as keyof typeof typeMeta].label}
              </span>
              <span className="text-xs text-muted-foreground/70">{article.category}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-5 leading-tight tracking-tight">{article.title}</h1>

            <div className="flex items-center gap-3 sm:gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2.5">
                {article.author.avatar && <img src={article.author.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />}
                <div className="leading-tight">
                  <div className="font-medium text-foreground text-xs sm:text-sm">{article.author.name}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground/65">{article.author.role}</div>
                </div>
              </div>
              <span className="text-muted-foreground/40 hidden sm:inline">·</span>
              <span className="flex items-center gap-1 text-xs sm:text-sm"><Calendar className="w-3.5 h-3.5" />{article.date}</span>
              {article.duration && <><span className="text-muted-foreground/40">·</span><span className="flex items-center gap-1 text-xs sm:text-sm"><Clock className="w-3.5 h-3.5" />{article.duration}</span></>}
              {article.views != null && article.views > 0 && <><span className="text-muted-foreground/40 hidden sm:inline">·</span><span className="flex items-center gap-1 text-xs sm:text-sm"><Eye className="w-3.5 h-3.5" />{article.views.toLocaleString()}</span></>}
            </div>
          </header>

          {article.type === 'video' && directVideoUrl(article.videoUrl || '') ? <video src={article.videoUrl} controls preload="metadata" poster={article.image} className="w-full aspect-video rounded-lg bg-black mb-8"/> : article.type === 'video' && videoEmbed(article.videoUrl || '') ? (
            <div className="aspect-video rounded-lg overflow-hidden bg-black border border-border/40 mb-8">
              <iframe src={videoEmbed(article.videoUrl || '')} className="w-full h-full" allowFullScreen title={article.title} />
            </div>
          ) : article.image ? (
            <div className="aspect-[16/9] rounded-lg overflow-hidden border border-border/40 mb-8">
              <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
            </div>
          ) : null}

          <div className="flex items-center gap-2 mb-8 pb-6 border-b border-border/30">
            <button onClick={() => setLiked(!liked)} className={cn('flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium', liked ? 'bg-primary/10 text-primary' : 'bg-muted/50 text-muted-foreground')}>
              <ThumbsUp className={cn('w-4 h-4', liked && 'fill-primary')} /> Me gusta
            </button>
            <button onClick={() => setSaved(!saved)} className={cn('flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium', saved ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-muted/50 text-muted-foreground')}>
              <Bookmark className={cn('w-4 h-4', saved && 'fill-amber-500')} /> Guardar
            </button>
            <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-muted/50 text-muted-foreground ml-auto">
              <Share2 className="w-4 h-4" /> Compartir
            </button>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none
            prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight
            prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:text-[15px]
            prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
            prose-a:text-primary prose-strong:text-foreground
            prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
            prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: safeNewsHtml(article.content) }} />

          {article.related.length > 0 && (
            <section className="mt-12 sm:mt-14 pt-8 border-t border-border/30">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-5">Contenido relacionado</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {article.related.map((r) => {
                  const rel = articles[r.slug];
                  if (!rel) return null;
                  const RelIcon = typeMeta[rel.type as keyof typeof typeMeta].icon;
                  return (
                    <Link key={r.slug} to={`/blog/${r.slug}`} className="group block">
                      <div className="border border-border/40 hover:border-border/70 transition-colors rounded-lg overflow-hidden flex flex-col sm:flex-row">
                        <div className="relative sm:w-32 aspect-video sm:aspect-square overflow-hidden shrink-0">
                          <img src={r.image} alt="" loading="lazy" className="w-full h-full object-cover" />
                          {rel.type === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                            </div>
                          )}
                        </div>
                        <div className="p-3.5 sm:p-4 flex-1 flex flex-col">
                          <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded mb-1.5 self-start', typeMeta[rel.type as keyof typeof typeMeta].badge)}>
                            <RelIcon className="w-2.5 h-2.5" />{typeMeta[rel.type as keyof typeof typeMeta].label}
                          </span>
                          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary line-clamp-2 leading-snug">{r.title}</h3>
                          <div className="flex items-center gap-2 mt-auto pt-2 text-[11px] text-muted-foreground/70">
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
            </section>
          )}
        </article>
      </main>
    </>
  );
}