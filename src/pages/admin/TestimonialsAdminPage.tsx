import { useState, useEffect, useRef, useCallback } from 'react';
import { useDatabase, useStorage } from '@/lib/backend';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import {
  Plus, Trash2, Pencil, X, Save, RefreshCw, Star, Eye,
  Upload, Link as LinkIcon, GripVertical, ToggleLeft, ToggleRight,
  Quote, Lock,
} from 'lucide-react';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatar_url: string;
  content: string;
  earnings: string;
  rating: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

type FormData = Omit<Testimonial, 'id' | 'created_at' | 'updated_at'>;
const emptyForm = (): FormData => ({ name: '', role: '', avatar_url: '', content: '', earnings: '', rating: 5, is_active: true, sort_order: 0 });

// ── Star Rating ────────────────────────────────────────────────────────────────
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}>
          <Star className={cn('w-5 h-5 transition-colors', n <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30 hover:text-amber-300')} />
        </button>
      ))}
    </div>
  );
}

// ── Avatar Input ───────────────────────────────────────────────────────────────
function AvatarInput({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const storage = useStorage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'url' | 'file'>('url');
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Solo imágenes'); return; }
    if (file.size > 3 * 1024 * 1024) { toast.error('Máximo 3 MB'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `testimonials/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const result = await storage.upload('logos', path, file, { contentType: file.type, upsert: true });
      if (result.success && result.url) { onChange(result.url); toast.success('Imagen subida'); }
      else throw new Error(result.error || 'Error al subir');
    } catch (err: any) {
      toast.error('Error al subir: ' + (err?.message || 'desconocido'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {(['url', 'file'] as const).map(m => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {m === 'url' ? <><LinkIcon className="w-3.5 h-3.5" /> URL</> : <><Upload className="w-3.5 h-3.5" /> Archivo</>}
          </button>
        ))}
      </div>
      {mode === 'url' ? (
        <input type="url" value={value} onChange={e => onChange(e.target.value)}
          placeholder="https://images.pexels.com/..."
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors" />
      ) : (
        <label className={cn('flex items-center justify-center gap-2 w-full h-10 border-2 border-dashed rounded-lg cursor-pointer text-sm transition-colors',
          uploading ? 'opacity-50 pointer-events-none border-border' : 'border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary')}>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleFile} disabled={uploading} />
          {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Subiendo...' : 'Seleccionar imagen (PNG/JPG/WebP — max 3 MB)'}
        </label>
      )}
      {value && (
        <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg border border-border">
          <img src={value} alt="preview" className="w-10 h-10 rounded-full object-cover border border-border flex-shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span className="text-xs text-muted-foreground truncate flex-1">{value}</span>
          <button type="button" onClick={() => onChange('')} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Form Modal ─────────────────────────────────────────────────────────────────
function TestimonialFormModal({ testimonial, onSave, onClose, saving }: {
  testimonial: Testimonial | null;
  onSave: (data: FormData & { id?: string }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormData>(() =>
    testimonial
      ? { name: testimonial.name, role: testimonial.role, avatar_url: testimonial.avatar_url, content: testimonial.content, earnings: testimonial.earnings, rating: testimonial.rating, is_active: testimonial.is_active, sort_order: testimonial.sort_order }
      : emptyForm()
  );
  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return; }
    if (!form.content.trim()) { toast.error('El testimonio es requerido'); return; }
    onSave({ ...(testimonial?.id ? { id: testimonial.id } : {}), ...form });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-foreground">{testimonial ? 'Editar testimonio' : 'Nuevo testimonio'}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Todos los campos marcados con * son obligatorios</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto flex-1 p-6 space-y-5">
            {/* Name + Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Nombre completo *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Roberto Mendoza"
                  className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Cargo / Ciudad</label>
                <input value={form.role} onChange={e => set('role', e.target.value)} placeholder="Emprendedor, Lima"
                  className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all" />
              </div>
            </div>

            {/* Avatar */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Foto de perfil</label>
              <AvatarInput value={form.avatar_url} onChange={url => set('avatar_url', url)} />
            </div>

            {/* Content */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Testimonio *</label>
              <textarea value={form.content} onChange={e => set('content', e.target.value)} rows={4}
                placeholder="Escribe aquí el testimonio del cliente..."
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all resize-none" />
              <p className="text-[10px] text-muted-foreground mt-1">{form.content.length} caracteres</p>
            </div>

            {/* Earnings + Rating */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Ingresos mostrados</label>
                <input value={form.earnings} onChange={e => set('earnings', e.target.value)} placeholder="S/ 4,800/mes"
                  className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Calificación</label>
                <div className="flex items-center h-10">
                  <StarRating value={form.rating} onChange={v => set('rating', v)} />
                </div>
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border">
              <button type="button" onClick={() => set('is_active', !form.is_active)}
                className={cn('w-11 h-6 rounded-full relative transition-colors flex-shrink-0', form.is_active ? 'bg-primary' : 'bg-muted-foreground/30')}>
                <div className={cn('w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] shadow transition-transform', form.is_active ? 'translate-x-[22px]' : 'translate-x-[3px]')} style={{ width: '18px', height: '18px' }} />
              </button>
              <div>
                <p className="text-sm font-medium text-foreground leading-tight">{form.is_active ? 'Activo — visible en el landing' : 'Inactivo — oculto del landing'}</p>
                <p className="text-xs text-muted-foreground">Solo los testimonios activos aparecen en el carrusel</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-border flex-shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition-colors text-foreground">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {testimonial ? 'Guardar cambios' : 'Crear testimonio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Draggable Row ─────────────────────────────────────────────────────────────
function DraggableRow({
  t, onDragStart, onDragOver, onDrop, isDragOver,
  onToggle, onEdit, onDelete,
}: {
  t: Testimonial;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  isDragOver: boolean;
  onToggle: (t: Testimonial) => void;
  onEdit: (t: Testimonial) => void;
  onDelete: (t: Testimonial) => void;
}) {
  const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=e2e8f0&color=64748b&size=48`;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(t.id)}
      onDragOver={e => { e.preventDefault(); onDragOver(e, t.id); }}
      onDrop={e => onDrop(e, t.id)}
      className={cn(
        'flex items-start gap-3 px-4 py-3.5 transition-all cursor-default select-none',
        isDragOver ? 'border-t-2 border-primary bg-primary/5' : 'hover:bg-muted/30',
        !t.is_active && 'opacity-60',
      )}
    >
      {/* Drag handle */}
      <div className="flex-shrink-0 pt-1 text-muted-foreground/40 cursor-grab active:cursor-grabbing touch-none">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Avatar */}
      <img
        src={t.avatar_url || avatarFallback}
        alt={t.name}
        className="w-11 h-11 rounded-full object-cover border-2 border-border flex-shrink-0 mt-0.5"
        onError={e => { (e.target as HTMLImageElement).src = avatarFallback; }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap mb-1">
          <span className="font-semibold text-foreground text-sm leading-tight">{t.name}</span>
          {t.role && <span className="text-xs text-muted-foreground leading-tight">{t.role}</span>}
        </div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={cn('w-3 h-3', i < t.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20')} />
            ))}
          </div>
          {t.earnings && (
            <span className="text-xs font-bold text-emerald-600 dark:text-green-400 bg-emerald-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">{t.earnings}</span>
          )}
          {!t.is_active && (
            <span className="text-[10px] font-medium text-destructive bg-destructive/10 border border-red-500/20 px-2 py-0.5 rounded-full">Inactivo</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">"{t.content}"</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-1 flex-shrink-0">
        <button onClick={() => onToggle(t)}
          className={cn('p-2 rounded-lg transition-colors', t.is_active ? 'text-green-500 hover:bg-emerald-500/10' : 'text-muted-foreground hover:bg-muted')}
          title={t.is_active ? 'Desactivar' : 'Activar'}>
          {t.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
        </button>
        <button onClick={() => onEdit(t)}
          className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-primary transition-colors" title="Editar">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={() => onDelete(t)}
          className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive transition-colors" title="Eliminar">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function TestimonialsAdminPage() {
  const database = useDatabase();
  const { user } = useAuthStore();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Testimonial | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await database.select<Testimonial>('testimonials', {
      order: { column: 'sort_order', ascending: true },
    });
    setTestimonials((data as Testimonial[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSave = async (data: FormData & { id?: string }) => {
    setSaving(true);
    const { id, ...fields } = data;
    const nextOrder = id ? fields.sort_order : testimonials.length;
    const payload = { ...fields, sort_order: nextOrder, updated_at: new Date().toISOString() };
    if (id) {
      await database.update('testimonials', id, payload);
      toast.success('Testimonio actualizado');
    } else {
      await database.insert('testimonials', payload);
      toast.success('Testimonio creado');
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await database.delete('testimonials', deleteTarget.id);
      toast.success('Testimonio eliminado');
      fetchAll();
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  const toggleActive = async (t: Testimonial) => {
    await database.update('testimonials', t.id, { is_active: !t.is_active, updated_at: new Date().toISOString() });
    setTestimonials(prev => prev.map(x => x.id === t.id ? { ...x, is_active: !x.is_active } : x));
    toast.success(t.is_active ? 'Desactivado' : 'Activado');
  };

  // Drag & drop reorder
  const handleDragStart = useCallback((id: string) => { setDragId(id); }, []);

  const handleDragOver = useCallback((_e: React.DragEvent, id: string) => {
    if (id !== dragId) setDragOverId(id);
  }, [dragId]);

  const handleDrop = useCallback(async (_e: React.DragEvent, targetId: string) => {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const reordered = [...testimonials];
    const fromIdx = reordered.findIndex(x => x.id === dragId);
    const toIdx = reordered.findIndex(x => x.id === targetId);
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const updated = reordered.map((t, i) => ({ ...t, sort_order: i }));
    setTestimonials(updated);
    setDragId(null);
    setDragOverId(null);
    await Promise.all(updated.map(t => database.update('testimonials', t.id, { sort_order: t.sort_order })));
    toast.success('Orden guardado');
  }, [dragId, testimonials, database]);

  const filtered = filterActive === 'all' ? testimonials
    : testimonials.filter(t => filterActive === 'active' ? t.is_active : !t.is_active);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-center">
        <div>
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Sin permisos de administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Testimonios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Arrastra para reordenar · <span className="text-green-500 font-medium">{testimonials.filter(t => t.is_active).length} activos</span>
            {' · '}{testimonials.length} total
          </p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all">
          <Plus className="w-4 h-4" /> Nuevo testimonio
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {([['all', 'Todos'], ['active', 'Activos'], ['inactive', 'Inactivos']] as const).map(([val, label]) => (
          <button key={val} onClick={() => setFilterActive(val as typeof filterActive)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              filterActive === val ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="border border-border/60 rounded-xl overflow-hidden bg-card">
        {loading ? (
          <div className="divide-y divide-border/50">
            {[0,1,2].map(i => (
              <div key={i} className="p-4 flex gap-4 items-start">
                <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-16 rounded-lg" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
              <Quote className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground mb-0.5">
              {filterActive === 'all' ? 'Sin testimonios aún' : 'Sin resultados'}
            </p>
            <p className="text-xs text-muted-foreground/60">
              {filterActive === 'all' ? 'Crea el primero con el botón de arriba.' : 'Prueba con otro filtro.'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-muted/20">
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground/50">Arrastra para reordenar</p>
            </div>
            <div className="divide-y divide-border/50">
              {filtered.map(t => (
                <DraggableRow
                  key={t.id}
                  t={t}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  isDragOver={dragOverId === t.id}
                  onToggle={toggleActive}
                  onEdit={t => { setEditing(t); setShowForm(true); }}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Hint */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
          <Eye className="w-4 h-4" /> Visibilidad en el landing
        </div>
        <p className="text-xs text-primary/80">
          Solo los testimonios <strong>Activos</strong> aparecen en la sección de testimonios. Arrastra las filas para cambiar el orden de aparición.
        </p>
      </div>

      {showForm && (
        <TestimonialFormModal
          testimonial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
          saving={saving}
        />
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleDelete}
        title="Eliminar testimonio"
        description={<>Se eliminará permanentemente el testimonio de <strong>{deleteTarget?.name}</strong>. Esta acción no se puede deshacer.</>}
        loading={!!deletingId}
      />
    </div>
  );
}
