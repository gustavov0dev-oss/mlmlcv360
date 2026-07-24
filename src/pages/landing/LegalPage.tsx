import { useState, useEffect } from 'react';
import { Link, useParams } from '@/lib/router';
import { supabase } from '@/lib/backend/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, FileText, CircleAlert as AlertCircle } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

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
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 py-10 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          {/* Back */}
          <nav className="mb-8">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
            </Link>
          </nav>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <div className="pt-4 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
              </div>
            </div>
          ) : notFound ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Página no encontrada</h1>
              <p className="text-sm text-muted-foreground mb-8">
                La página que buscas no existe o no está disponible.
              </p>
              <Button asChild>
                <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" />Volver al inicio</Link>
              </Button>
            </div>
          ) : page ? (
            <article>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground/60 uppercase tracking-wider font-semibold">
                  {new Date(page.updated_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-8 pb-4 border-b border-border/60">
                {page.title}
              </h1>
              <div
                className="prose prose-sm dark:prose-invert max-w-none
                  [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3
                  [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2
                  [&_p]:text-sm [&_p]:text-foreground/80 [&_p]:leading-relaxed [&_p]:mb-4
                  [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:mb-4 [&_ul]:text-sm [&_ul]:text-foreground/80
                  [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_ol]:mb-4 [&_ol]:text-sm [&_ol]:text-foreground/80
                  [&_li]:text-sm [&_li]:text-foreground/80
                  [&_strong]:font-semibold [&_strong]:text-foreground
                  [&_a]:text-primary [&_a]:underline hover:[&_a]:text-primary/80
                  [&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:bg-muted/30 [&_blockquote]:rounded-r-lg [&_blockquote]:text-sm [&_blockquote]:text-foreground/70 [&_blockquote]:my-4"
                dangerouslySetInnerHTML={{ __html: page.content }}
              />
            </article>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}
