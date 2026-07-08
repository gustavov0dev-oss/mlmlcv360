import { useState, useEffect, useRef } from 'react';
import { useDatabase, useStorage } from '@/lib/backend';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Plus, Trash2, Pencil, X, Save, RefreshCw, Star, Eye,
  Upload, Link as LinkIcon, GripVertical, ToggleLeft, ToggleRight,
  Quote, Lock,
} from 'lucide-react';
// ── Types ──────────────────────────────────────────────────────────────────────
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

const emptyForm = (): FormData => ({
  name: '',
  role: '',
  avatar_url: '',
  content: '',
  earnings: '',
  rating: 5,
  is_active: true,
  sort_order: 0,
});

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

// ── Avatar Input: URL or File upload ──────────────────────────────────────────
function AvatarInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
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
      if (result.success && result.url) {
        onChange(result.url);
        toast.success('Imagen subida correctamente');
      } else {
        throw new Error(result.error || 'Error al subir');
      }
    } catch (err: any) {
      toast.error('Error al subir la imagen: ' + (err?.message || 'desconocido'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setMode('url')}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors', mode === 'url' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
        >
          <LinkIcon className="w-3.5 h-3.5" /> URL
        </button>
        <button
          type="button"
          onClick={() => setMode('file')}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors', mode === 'file' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
        >
          <Upload className="w-3.5 h-3.5" /> Archivo
        </button>
      </div>

      {mode === 'url' ? (
        <input
          type="url"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://images.pexels.com/..."
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors"
        />
      ) : (
        <label className={cn(
          'flex items-center justify-center gap-2 w-full h-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-sm',
          uploading ? 'opacity-50 pointer-events-none border-border' : 'border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary',
        )}>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleFile} disabled={uploading} />
          {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Subiendo...' : 'Seleccionar imagen (PNG, JPG, WebP — max 3 MB)'}
        </label>
      )}

      {/* Preview */}
      {value && (
        <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg border border-border">
          <img
            src={value}
            alt="preview"
            className="w-10 h-10 rounded-full object-cover border border-border flex-shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="text-xs text-muted-foreground truncate flex-1">{value}</span>
          <button type="button" onClick={() => onChange('')} className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Form Modal ─────────────────────────────────────────────────────────────────
function TestimonialFormModal({
  testimonial,
  onSave,
  onClose,
  saving,
}: {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">{testimonial ? 'Editar testimonio' : 'Nuevo testimonio'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name + Role */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Nombre completo *</label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Roberto Mendoza"
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Cargo / Ciudad</label>
              <input
                value={form.role}
                onChange={e => set('role', e.target.value)}
                placeholder="Emprendedor, Lima"
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Avatar */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Foto de perfil</label>
            <AvatarInput value={form.avatar_url} onChange={url => set('avatar_url', url)} />
          </div>

          {/* Testimonial content */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Testimonio *</label>
            <textarea
              value={form.content}
              onChange={e => set('content', e.target.value)}
              rows={4}
              placeholder="Escribe aquí el testimonio del cliente..."
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors resize-none"
            />
            <p className="text-[10px] text-muted-foreground mt-1">{form.content.length} caracteres</p>
          </div>

          {/* Earnings + Rating */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Ingresos mostrados</label>
              <input
                value={form.earnings}
                onChange={e => set('earnings', e.target.value)}
                placeholder="S/ 4,800/mes"
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Calificacion</label>
              <div className="flex items-center h-9">
                <StarRating value={form.rating} onChange={v => set('rating', v)} />
              </div>
            </div>
          </div>

          {/* Sort + Active */}
          <div className="flex items-center gap-6 pt-1">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Orden</label>
              <input
                type="number"
                min={0}
                value={form.sort_order}
                onChange={e => set('sort_order', parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary text-center"
              />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => set('is_active', !form.is_active)}
                className={cn('w-10 h-6 rounded-full relative transition-colors', form.is_active ? 'bg-primary' : 'bg-muted-foreground/30')}
              >
                <div className={cn('w-4 h-4 bg-white rounded-full absolute top-1 transition-transform', form.is_active ? 'translate-x-5' : 'translate-x-1')} />
              </button>
              <span className="text-sm font-medium text-foreground">{form.is_active ? 'Activo (visible)' : 'Inactivo (oculto)'}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-border">
            <button type="button" onClick={onClose} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {testimonial ? 'Guardar cambios' : 'Crear testimonio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm ─────────────────────────────────────────────────────────────
function DeleteConfirm({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-foreground text-center mb-1">Eliminar testimonio</h3>
        <p className="text-sm text-muted-foreground text-center mb-6">
          ¿Eliminar el testimonio de <span className="font-semibold text-foreground">{name}</span>? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-700 transition-colors">Eliminar</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function TestimonialsAdminPage() {
  const database = useDatabase();
  const { user } = useAuthStore();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [deleteItem, setDeleteItem] = useState<Testimonial | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

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
    const payload = { ...fields, updated_at: new Date().toISOString() };
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
    if (!deleteItem) return;
    await database.delete('testimonials', deleteItem.id);
    toast.success('Testimonio eliminado');
    setDeleteItem(null);
    fetchAll();
  };

  const toggleActive = async (t: Testimonial) => {
    await database.update('testimonials', t.id, { is_active: !t.is_active, updated_at: new Date().toISOString() });
    setTestimonials(prev => prev.map(x => x.id === t.id ? { ...x, is_active: !x.is_active } : x));
    toast.success(t.is_active ? 'Testimonio desactivado' : 'Testimonio activado');
  };

  const filtered = testimonials.filter(t =>
    filterActive === 'all' ? true : filterActive === 'active' ? t.is_active : !t.is_active
  );

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-center">
        <div>
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Testimonios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestiona los testimonios que aparecen en la página de inicio.
            <span className="ml-2 font-medium text-green-500">{testimonials.filter(t => t.is_active).length} activos</span>
            {' · '}
            <span className="text-muted-foreground">{testimonials.length} total</span>
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo testimonio
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {(['all', 'active', 'inactive'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterActive(f)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              filterActive === f ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Inactivos'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 bg-muted rounded w-32" />
                  <div className="h-2.5 bg-muted rounded w-24" />
                </div>
              </div>
              <div className="h-3 bg-muted rounded w-full mb-1.5" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <Quote className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No hay testimonios {filterActive !== 'all' ? `(${filterActive === 'active' ? 'activos' : 'inactivos'})` : ''}.</p>
          <p className="text-sm text-muted-foreground mt-1">
            {filterActive === 'all' ? 'Crea el primero usando el botón de arriba.' : 'Cambia el filtro para ver otros.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <div
              key={t.id}
              className={cn(
                'bg-card border rounded-xl p-4 flex items-start gap-4 transition-all',
                t.is_active ? 'border-border' : 'border-border/50 opacity-70'
              )}
            >
              {/* Drag handle (visual only) */}
              <div className="flex-shrink-0 pt-1 text-muted-foreground/30">
                <GripVertical className="w-4 h-4" />
              </div>

              {/* Avatar */}
              {t.avatar_url ? (
                <img
                  src={t.avatar_url}
                  alt={t.name}
                  className="w-12 h-12 rounded-full object-cover border border-border flex-shrink-0"
                  onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=e2e8f0&color=64748b`; }}
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-muted border border-border flex-shrink-0 flex items-center justify-center text-lg font-bold text-muted-foreground">
                  {t.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-foreground text-sm">{t.name}</span>
                  <span className="text-xs text-muted-foreground">{t.role}</span>
                  {t.earnings && (
                    <span className="text-xs font-bold text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">{t.earnings}</span>
                  )}
                  {!t.is_active && (
                    <span className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">Inactivo</span>
                  )}
                </div>
                <div className="flex gap-0.5 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn('w-3 h-3', i < t.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20')} />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">"{t.content}"</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1.5">Orden: {t.sort_order}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => toggleActive(t)}
                  className={cn('p-2 rounded-lg transition-colors', t.is_active ? 'text-green-500 hover:bg-green-500/10' : 'text-muted-foreground hover:bg-muted')}
                  title={t.is_active ? 'Desactivar' : 'Activar'}
                >
                  {t.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => { setEditing(t); setShowForm(true); }}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-blue-500 transition-colors"
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteItem(t)}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-red-500 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info panel */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300">
        <div className="font-semibold mb-1 flex items-center gap-2">
          <Eye className="w-4 h-4" /> Visibilidad en el landing
        </div>
        <p className="text-xs">Solo los testimonios con estado <strong>Activo</strong> aparecen en el carrusel de la página de inicio. El campo <strong>Orden</strong> controla la secuencia (menor = primero).</p>
      </div>

      {/* Modals */}
      {showForm && (
        <TestimonialFormModal
          testimonial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
          saving={saving}
        />
      )}
      {deleteItem && (
        <DeleteConfirm
          name={deleteItem.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
        />
      )}
    </div>
  );
}
