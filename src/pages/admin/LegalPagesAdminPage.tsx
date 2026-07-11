import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/backend/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  FileText, Plus, Search, RefreshCw, Trash2, Pencil, GripVertical,
  ArrowUp, ArrowDown, ExternalLink, Loader as Loader2, Save,
} from 'lucide-react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { cn } from '@/lib/utils';
import { Link } from '@/lib/router';

interface LegalPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  is_published: boolean;
  sort_order: number;
  show_in_footer: boolean;
  created_at: string;
  updated_at: string;
}

function slugify(s: string) {
  return s.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function LegalPagesAdminPage() {
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<LegalPage | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LegalPage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Editor form state
  const [form, setForm] = useState({ slug: '', title: '', content: '', is_published: false, show_in_footer: true });

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { data, error } = await supabase.from('legal_pages').select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      setPages((data as LegalPage[]) ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = pages.filter(p => {
    const q = search.trim().toLowerCase();
    return !q || p.title.toLowerCase().includes(q) || p.slug.includes(q);
  });

  const openNew = () => {
    setForm({ slug: '', title: '', content: '', is_published: false, show_in_footer: true });
    setIsNew(true);
    setEditing({} as LegalPage);
  };

  const openEdit = (p: LegalPage) => {
    setForm({ slug: p.slug, title: p.title, content: p.content, is_published: p.is_published, show_in_footer: p.show_in_footer });
    setIsNew(false);
    setEditing(p);
  };

  const closeEditor = () => {
    setEditing(null);
    setIsNew(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('El título es obligatorio'); return; }
    if (!form.slug.trim()) { toast.error('El slug es obligatorio'); return; }
    setSaving(true);
    try {
      const slug = slugify(form.slug);
      if (isNew) {
        const { error } = await supabase.from('legal_pages').insert({
          slug, title: form.title.trim(), content: form.content,
          is_published: form.is_published, show_in_footer: form.show_in_footer,
          sort_order: pages.length,
        });
        if (error) throw error;
        toast.success('Página creada');
      } else if (editing) {
        const { error } = await supabase.from('legal_pages').update({
          slug, title: form.title.trim(), content: form.content,
          is_published: form.is_published, show_in_footer: form.show_in_footer,
          updated_at: new Date().toISOString(),
        }).eq('id', editing.id);
        if (error) throw error;
        toast.success('Página actualizada');
      }
      closeEditor();
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const { error } = await supabase.from('legal_pages').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setPages(prev => prev.filter(p => p.id !== deleteTarget.id));
      toast.success('Página eliminada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  const movePage = async (index: number, dir: 'up' | 'down') => {
    const swapIndex = dir === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= filtered.length) return;
    const a = filtered[index];
    const b = filtered[swapIndex];
    setReordering(true);
    try {
      await Promise.all([
        supabase.from('legal_pages').update({ sort_order: b.sort_order }).eq('id', a.id),
        supabase.from('legal_pages').update({ sort_order: a.sort_order }).eq('id', b.id),
      ]);
      load();
    } catch {
      toast.error('Error al reordenar');
    } finally {
      setReordering(false);
    }
  };

  const togglePublished = async (p: LegalPage) => {
    setTogglingId(p.id);
    try {
      const { data, error } = await supabase.from('legal_pages')
        .update({ is_published: !p.is_published, updated_at: new Date().toISOString() })
        .eq('id', p.id)
        .select('id,is_published').single();
      if (error) throw error;
      if (!data) { toast.error('No se pudo actualizar: verifica que tienes permisos de administrador'); return; }
      setPages(prev => prev.map(x => x.id === p.id ? { ...x, is_published: !p.is_published } : x));
      toast.success(p.is_published ? 'Despublicado' : 'Publicado');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al actualizar';
      toast.error(msg.includes('row-level security') || msg.includes('rls') ? 'Sin permisos: tu cuenta no tiene rol de administrador' : msg);
    } finally {
      setTogglingId(null);
    }
  };

  const toggleFooter = async (p: LegalPage) => {
    setTogglingId(p.id);
    try {
      const { data, error } = await supabase.from('legal_pages')
        .update({ show_in_footer: !p.show_in_footer, updated_at: new Date().toISOString() })
        .eq('id', p.id)
        .select('id,show_in_footer').single();
      if (error) throw error;
      if (!data) { toast.error('No se pudo actualizar: verifica que tienes permisos de administrador'); return; }
      setPages(prev => prev.map(x => x.id === p.id ? { ...x, show_in_footer: !p.show_in_footer } : x));
      toast.success(p.show_in_footer ? 'Quitado del footer' : 'Agregado al footer');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al actualizar';
      toast.error(msg.includes('row-level security') || msg.includes('rls') ? 'Sin permisos: tu cuenta no tiene rol de administrador' : msg);
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex justify-between items-center">
          <div className="space-y-1.5"><Skeleton className="h-7 w-52" /><Skeleton className="h-4 w-72" /></div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Páginas Legales</h1>
          <p className="text-sm text-muted-foreground">Términos, políticas, avisos y páginas informativas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
            Actualizar
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva página
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input placeholder="Buscar por título o slug…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* List */}
      <div className="border border-border/60 rounded-xl overflow-hidden bg-card">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-10 h-10 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground mb-0.5">
              {pages.length === 0 ? 'Sin páginas legales' : 'Sin resultados'}
            </p>
            <p className="text-xs text-muted-foreground/60">
              {pages.length === 0 ? 'Crea tu primera página legal.' : 'Prueba con otra búsqueda.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors group">
                {/* Order controls */}
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => movePage(i, 'up')}
                    disabled={reordering || i === 0}
                    className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30" />
                  <button
                    onClick={() => movePage(i, 'down')}
                    disabled={reordering || i === filtered.length - 1}
                    className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Title + slug */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(p)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground truncate">{p.title}</span>
                    {p.is_published
                      ? <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Publicado</Badge>
                      : <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-muted text-muted-foreground border-border">Borrador</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground/50 mt-0.5 font-mono">/legal/{p.slug}</p>
                </div>

                {/* Footer toggle */}
                <button
                  onClick={() => toggleFooter(p)}
                  disabled={togglingId === p.id}
                  className={cn(
                    'hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors shrink-0 disabled:opacity-50',
                    p.show_in_footer
                      ? 'text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/25'
                      : 'text-muted-foreground bg-muted/50 border-border/50'
                  )}
                  title="Mostrar en footer"
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', p.show_in_footer ? 'bg-blue-500' : 'bg-muted-foreground/40')} />
                  Footer
                </button>

                {/* Published toggle */}
                <Switch 
                  checked={p.is_published} 
                  onCheckedChange={() => togglePublished(p)}
                  disabled={togglingId === p.id}
                  aria-label="Publicar" 
                  className="shrink-0" 
                />

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {p.is_published && (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                      <Link to={`/legal/${p.slug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(p)} title="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(p)} disabled={deletingId === p.id}>
                    {deletingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor dialog */}
      {editing && (
        <Dialog open onOpenChange={open => { if (!open) closeEditor(); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0">
            <DialogHeader className="px-5 py-4 border-b border-border/50 shrink-0">
              <DialogTitle className="text-base font-bold">
                {isNew ? 'Nueva página legal' : 'Editar página'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isNew ? 'Crea una nueva página informativa o legal.' : 'Edita el contenido y configuración.'}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Título</label>
                  <Input
                    value={form.title}
                    onChange={e => {
                      const title = e.target.value;
                      setForm(f => ({ ...f, title, slug: isNew ? slugify(title) : f.slug }));
                    }}
                    placeholder="Ej. Términos y Condiciones"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Slug (URL)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono shrink-0">/legal/</span>
                    <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))} placeholder="terminos" className="font-mono text-sm" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Contenido</label>
                <RichTextEditor
                  value={form.content}
                  onChange={html => setForm(f => ({ ...f, content: html }))}
                  minHeight={280}
                />
              </div>

              <div className="flex items-center gap-6 pt-2 border-t border-border/50">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <Switch checked={form.is_published} onCheckedChange={v => setForm(f => ({ ...f, is_published: v }))} />
                  <div>
                    <p className="text-sm font-medium text-foreground">Publicado</p>
                    <p className="text-xs text-muted-foreground/60">Visible al público</p>
                  </div>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <Switch checked={form.show_in_footer} onCheckedChange={v => setForm(f => ({ ...f, show_in_footer: v }))} />
                  <div>
                    <p className="text-sm font-medium text-foreground">Mostrar en footer</p>
                    <p className="text-xs text-muted-foreground/60">Link en el pie de página</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="shrink-0 px-5 py-4 border-t border-border/50 flex items-center justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={closeEditor}>Cancelar</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                {isNew ? 'Crear página' : 'Guardar cambios'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta página?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente la página <strong>{deleteTarget?.title}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
