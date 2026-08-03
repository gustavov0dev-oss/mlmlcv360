import { useState, useEffect } from 'react';
import { Link, useParams } from '@/lib/router';
import { supabase } from '@/lib/backend/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CircleAlert as AlertCircle } from 'lucide-react';

interface LegalPageData {
  title: string;
  content: string;
  updated_at: string;
}

export default function LegalPage() {
  const { slug } = useParams();
  const [page, setPage] = useState<LegalPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    supabase
      .from('legal_pages')
      .select('title, content, updated_at')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
          setPage(null);
        } else {
          setPage(data as LegalPageData);
        }
        setLoading(false);
      });
  }, [slug]);

  return (
    <main className="flex-1 py-12 sm:py-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        {/* Back link */}
        <nav className="mb-10">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
          </Link>
        </nav>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-3/4" />
            <div className="pt-6 space-y-2.5">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-3.5 w-full" />)}
            </div>
          </div>
        ) : notFound ? (
          <div className="py-20 text-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-foreground mb-1">Página no encontrada</h1>
            <p className="text-sm text-muted-foreground mb-6">La página que buscas no existe o no está disponible.</p>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors underline underline-offset-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
            </Link>
          </div>
        ) : page ? (
          <article>
            {/* Meta */}
            <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wider font-medium mb-3">
              {new Date(page.updated_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-10">
              {page.title}
            </h1>

            {/* Content — clean prose, no card wrapper */}
            <div
              className="prose prose-sm dark:prose-invert max-w-none
                [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3
                [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2
                [&_p]:text-sm [&_p]:text-foreground/75 [&_p]:leading-relaxed [&_p]:mb-4
                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:mb-4 [&_ul]:text-sm [&_ul]:text-foreground/75
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_ol]:mb-4 [&_ol]:text-sm [&_ol]:text-foreground/75
                [&_li]:text-sm [&_li]:text-foreground/75
                [&_strong]:font-semibold [&_strong]:text-foreground
                [&_a]:text-primary [&_a]:underline hover:[&_a]:text-primary/80
                [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-sm [&_blockquote]:text-foreground/60 [&_blockquote]:my-4"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </article>
        ) : null}
      </div>
    </main>
  );
}
