import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '@/lib/backend';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ProductReview } from '@/lib/storeTypes';
import {
  Star, Check, X, Trash2, MessageSquare,
  Search, Eye, ThumbsUp, RefreshCw, Package
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';

function StarsDisplay({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} style={{ width: size, height: size }}
          className={i < value ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'} />
      ))}
    </div>
  );
}

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  approved: { label: 'Aprobada', cls: 'bg-emerald-500/10 text-emerald-600 border-green-500/20' },
  rejected: { label: 'Rechazada', cls: 'bg-destructive/10 text-destructive border-red-500/20' },
};

type Tab = 'pending' | 'approved' | 'rejected' | 'all';

export default function ReviewsAdminPage() {
  const [reviews, setReviews] = useState<(ProductReview & { product: any; profile: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('pending');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<(ProductReview & { product: any; profile: any }) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<(ProductReview & { product: any; profile: any }) | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const database = useDatabase();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await database.select<ProductReview & { product: any; profile: any }>('product_reviews', {
      select: `*,
        profile:profiles(full_name, avatar_url),
        product:products(id, name, slug, images)`,
      order: { column: 'created_at', ascending: false },
    });
    setReviews((data as any) || []);
    setLoading(false);
  }, [database]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: 'approved' | 'rejected') => {
    await database.update('product_reviews', id, { status });
    toast.success(status === 'approved' ? 'Reseña aprobada' : 'Reseña rechazada');
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    if (preview?.id === id) setPreview(prev => prev ? { ...prev, status } : null);
  };

  const deleteReview = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await database.delete('product_reviews', deleteTarget.id);
      toast.success('Reseña eliminada');
      setReviews(prev => prev.filter(r => r.id !== deleteTarget.id));
      if (preview?.id === deleteTarget.id) setPreview(null);
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  const filteredReviews = reviews.filter(r => {
    if (tab !== 'all' && r.status !== tab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.product?.name?.toLowerCase().includes(q) ||
        r.profile?.full_name?.toLowerCase().includes(q) ||
        r.body?.toLowerCase().includes(q) ||
        r.title?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    all: reviews.length,
    pending: reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    rejected: reviews.filter(r => r.status === 'rejected').length,
  };

  const TABS: { id: Tab; label: string; color: string }[] = [
    { id: 'pending', label: 'Pendientes', color: 'text-amber-600' },
    { id: 'approved', label: 'Aprobadas', color: 'text-emerald-600' },
    { id: 'rejected', label: 'Rechazadas', color: 'text-destructive' },
    { id: 'all', label: 'Todas', color: 'text-foreground' },
  ];

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reseñas de productos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Modera y gestiona las valoraciones de tus clientes
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-sm hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4 text-muted-foreground" /> Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('p-4 rounded-xl border text-left transition-all',
              tab === t.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-primary/40')}>
            <p className={cn('text-3xl font-bold', t.color)}>{counts[t.id]}</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">{t.label}</p>
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por producto, usuario o contenido..."
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>}
        </div>
        <div className="flex gap-1 bg-muted p-1 rounded-xl overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors',
                tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {t.label}
              <span className={cn('ml-1.5 text-[10px] font-bold', t.color)}>{counts[t.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Reviews table / list */}
      {loading ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm min-w-[700px]">
            <thead><tr className="border-b border-border bg-muted/30">{['Producto','Cliente','Calificación','Reseña','Estado','Fecha','Acciones'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>{Array.from({length:7}).map((_,i)=>(<tr key={i} className="border-b border-border/50"><td className="px-4 py-3"><div className="flex items-center gap-2.5"><Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" /><Skeleton className="h-4 w-28" /></div></td><td className="px-4 py-3"><div className="flex items-center gap-2"><Skeleton className="w-7 h-7 rounded-full flex-shrink-0" /><Skeleton className="h-4 w-20" /></div></td><td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td><td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td><td className="px-4 py-3"><Skeleton className="h-6 w-20 rounded-full" /></td><td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td><td className="px-4 py-3"><div className="flex gap-1"><Skeleton className="w-7 h-7 rounded-lg" /><Skeleton className="w-7 h-7 rounded-lg" /><Skeleton className="w-7 h-7 rounded-lg" /></div></td></tr>))}</tbody>
          </table>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
          <p className="font-semibold text-foreground">No hay reseñas en esta categoría</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Producto', 'Cliente', 'Calificación', 'Reseña', 'Estado', 'Fecha', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="overflow-x-auto">
              {filteredReviews.map(r => {
                const cfg = STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                const img = r.product?.images?.[0]?.url;
                return (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    {/* Product */}
                    <td className="px-4 py-3 max-w-[160px]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <Package className="w-full h-full p-2 text-muted-foreground/30" />}
                        </div>
                        <span className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{r.product?.name || '—'}</span>
                      </div>
                    </td>
                    {/* Client */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                          {(r.profile?.full_name || 'U')[0].toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-foreground whitespace-nowrap">{r.profile?.full_name || 'Anónimo'}</span>
                      </div>
                    </td>
                    {/* Rating */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <StarsDisplay value={r.rating} size={12} />
                        <span className="text-xs font-bold text-foreground">{r.rating}/5</span>
                      </div>
                    </td>
                    {/* Review text */}
                    <td className="px-4 py-3 max-w-[200px]">
                      {r.title && <p className="text-xs font-bold text-foreground truncate">{r.title}</p>}
                      {r.body && <p className="text-xs text-muted-foreground truncate mt-0.5">{r.body}</p>}
                      {(r.images || []).length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {(r.images as string[]).slice(0, 3).map((img, i) => (
                            <img key={i} src={img} alt="" className="w-6 h-6 rounded object-cover border border-border" />
                          ))}
                          {(r.images as string[]).length > 3 && <span className="text-[10px] text-muted-foreground self-center">+{(r.images as string[]).length - 3}</span>}
                        </div>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-bold px-2 py-1 rounded-full border', cfg.cls)}>
                        {cfg.label}
                      </span>
                      {r.verified_purchase && <p className="text-[10px] text-emerald-600 mt-1">✓ Verificada</p>}
                    </td>
                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Preview */}
                        <button onClick={() => setPreview(r)} title="Ver detalle"
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {/* Approve */}
                        {r.status !== 'approved' && (
                          <button onClick={() => setStatus(r.id, 'approved')} title="Aprobar"
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 transition-colors">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {/* Reject */}
                        {r.status !== 'rejected' && (
                          <button onClick={() => setStatus(r.id, 'rejected')} title="Rechazar"
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {/* Delete */}
                        <button onClick={() => setDeleteTarget(r)} title="Eliminar"
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                {preview.product?.images?.[0]?.url && (
                  <img src={preview.product.images[0].url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                )}
                <div>
                  <p className="text-sm font-bold text-foreground">{preview.product?.name}</p>
                  <p className="text-xs text-muted-foreground">{preview.profile?.full_name || 'Anónimo'}</p>
                </div>
              </div>
              <button onClick={() => setPreview(null)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <StarsDisplay value={preview.rating} size={20} />
                <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full border',
                  STATUS_CONFIG[preview.status as keyof typeof STATUS_CONFIG]?.cls)}>
                  {STATUS_CONFIG[preview.status as keyof typeof STATUS_CONFIG]?.label}
                </span>
              </div>
              {preview.title && <p className="font-bold text-foreground">{preview.title}</p>}
              {preview.body && <p className="text-sm text-muted-foreground leading-relaxed">{preview.body}</p>}
              {(preview.images || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(preview.images as string[]).map((img, i) => (
                    <a key={i} href={img} target="_blank" rel="noreferrer">
                      <img src={img} alt="" className="w-20 h-20 rounded-xl object-cover border border-border hover:scale-105 transition-transform" />
                    </a>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
                <span>{new Date(preview.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                {preview.verified_purchase && <span className="text-emerald-600 font-semibold">✓ Compra verificada</span>}
                <span><ThumbsUp className="w-3 h-3 inline mr-0.5" />{preview.helpful_count ?? 0} útil</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-5 py-4 border-t border-border">
              {preview.status !== 'approved' && (
                <button onClick={() => setStatus(preview.id, 'approved')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors">
                  <Check className="w-4 h-4" /> Aprobar
                </button>
              )}
              {preview.status !== 'rejected' && (
                <button onClick={() => setStatus(preview.id, 'rejected')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors">
                  <X className="w-4 h-4" /> Rechazar
                </button>
              )}
              {deleteTarget?.id === preview.id ? (
                <button onClick={() => setDeleteTarget(preview)}
                  className="w-11 flex items-center justify-center border border-border rounded-xl hover:bg-destructive/10 hover:text-destructive hover:border-red-300 text-muted-foreground transition-colors"
                  title="Eliminar reseña">
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={() => setDeleteTarget(preview)}
                  className="w-11 flex items-center justify-center border border-border rounded-xl hover:bg-destructive/10 hover:text-destructive hover:border-red-300 text-muted-foreground transition-colors"
                  title="Eliminar reseña">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={deleteReview}
        title="Eliminar reseña"
        description={<>Se eliminará permanentemente la reseña de <strong>{deleteTarget?.profile?.full_name || 'Anónimo'}</strong>. Esta acción no se puede deshacer.</>}
        loading={!!deletingId}
      />
    </div>
  );
}
