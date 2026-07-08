import { useState, useEffect, useRef } from 'react';
import { useDatabase, useStorage } from '@/lib/backend';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Plus, Trash2, Pencil, X, Save, RefreshCw, GripVertical,
  ToggleLeft, ToggleRight, Upload, Link as LinkIcon, MapPin, Lock,
} from 'lucide-react';

interface RegionStat {
  id: string;
  city: string;
  members: string;
  image_url: string;
  is_active: boolean;
  sort_order: number;
}

type FormData = Omit<RegionStat, 'id'>;
const emptyForm = (): FormData => ({ city: '', members: '', image_url: '', is_active: true, sort_order: 0 });

// ── Avatar/Image Input ─────────────────────────────────────────────────────────
function ImageInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const storage = useStorage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'url' | 'file'>('url');
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Solo imágenes'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Máximo 5 MB'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `regions/${Date.now()}.${ext}`;
      const res = await storage.upload('logos', path, file, { contentType: file.type, upsert: true });
      if (res.success && res.url) { onChange(res.url); toast.success('Imagen subida'); }
      else throw new Error(res.error || 'Error al subir');
    } catch (err: any) {
      toast.error('Error: ' + (err?.message || 'desconocido'));
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
            {m === 'url' ? <><LinkIcon className="w-3 h-3" /> URL</> : <><Upload className="w-3 h-3" /> Archivo</>}
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
          {uploading ? 'Subiendo...' : 'Seleccionar imagen (max 5 MB)'}
        </label>
      )}
      {value && (
        <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg border border-border">
          <img src={value} alt="preview" className="w-12 h-8 rounded object-cover border border-border flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span className="text-xs text-muted-foreground truncate flex-1">{value}</span>
          <button type="button" onClick={() => onChange('')} className="text-muted-foreground hover:text-red-500 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Form Modal ─────────────────────────────────────────────────────────────────
function RegionFormModal({ item, onSave, onClose, saving }: {
  item: RegionStat | null;
  onSave: (d: FormData & { id?: string }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormData>(() =>
    item ? { city: item.city, members: item.members, image_url: item.image_url, is_active: item.is_active, sort_order: item.sort_order } : emptyForm()
  );
  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => setForm(p => ({ ...p, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.city.trim()) { toast.error('La ciudad es requerida'); return; }
    if (!form.members.trim()) { toast.error('El número de afiliados es requerido'); return; }
    onSave({ ...(item?.id ? { id: item.id } : {}), ...form });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">{item ? 'Editar ciudad' : 'Nueva ciudad'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Ciudad *</label>
              <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Lima"
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Afiliados *</label>
              <input value={form.members} onChange={e => set('members', e.target.value)} placeholder="4,820+"
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Imagen de fondo</label>
            <ImageInput value={form.image_url} onChange={v => set('image_url', v)} />
          </div>
          <div className="flex items-center gap-6">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Orden</label>
              <input type="number" min={0} value={form.sort_order} onChange={e => set('sort_order', parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary text-center" />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button type="button" onClick={() => set('is_active', !form.is_active)}
                className={cn('w-10 h-6 rounded-full relative transition-colors', form.is_active ? 'bg-primary' : 'bg-muted-foreground/30')}>
                <div className={cn('w-4 h-4 bg-white rounded-full absolute top-1 transition-transform', form.is_active ? 'translate-x-5' : 'translate-x-1')} />
              </button>
              <span className="text-sm font-medium text-foreground">{form.is_active ? 'Activa' : 'Inactiva'}</span>
            </div>
          </div>
          <div className="flex gap-3 pt-2 border-t border-border">
            <button type="button" onClick={onClose} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {item ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirm({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-base font-bold text-foreground mb-1">Eliminar ciudad</h3>
        <p className="text-sm text-muted-foreground mb-6">¿Eliminar <span className="font-semibold text-foreground">{name}</span>? Esta acción no se puede deshacer.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-700 transition-colors">Eliminar</button>
        </div>
      </div>
    </div>
  );
}

export default function RegionStatsAdminPage() {
  const database = useDatabase();
  const { user } = useAuthStore();
  const [items, setItems] = useState<RegionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RegionStat | null>(null);
  const [deleteItem, setDeleteItem] = useState<RegionStat | null>(null);
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await database.select<RegionStat>('testimonial_region_stats', {
      order: { column: 'sort_order', ascending: true },
    });
    setItems((data as RegionStat[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSave = async (data: FormData & { id?: string }) => {
    setSaving(true);
    const { id, ...fields } = data;
    const payload = { ...fields, updated_at: new Date().toISOString() };
    if (id) {
      await database.update('testimonial_region_stats', id, payload);
      toast.success('Ciudad actualizada');
    } else {
      await database.insert('testimonial_region_stats', payload);
      toast.success('Ciudad creada');
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    await database.delete('testimonial_region_stats', deleteItem.id);
    toast.success('Ciudad eliminada');
    setDeleteItem(null);
    fetchAll();
  };

  const toggleActive = async (item: RegionStat) => {
    await database.update('testimonial_region_stats', item.id, { is_active: !item.is_active, updated_at: new Date().toISOString() });
    setItems(prev => prev.map(x => x.id === item.id ? { ...x, is_active: !x.is_active } : x));
    toast.success(item.is_active ? 'Ciudad desactivada' : 'Ciudad activada');
  };

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
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Ciudades destacadas</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Aparecen en el bento de la sección testimonios.
            <span className="ml-2 font-medium text-green-500">{items.filter(i => i.is_active).length} activas</span>
            {' · '}<span className="text-muted-foreground">{items.length} total (máx. 4 visibles)</span>
          </p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Nueva ciudad
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <MapPin className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No hay ciudades configuradas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className={cn('bg-card border rounded-xl p-4 flex items-center gap-4 transition-all', item.is_active ? 'border-border' : 'border-border/50 opacity-60')}>
              <div className="flex-shrink-0 text-muted-foreground/30"><GripVertical className="w-4 h-4" /></div>
              {item.image_url ? (
                <img src={item.image_url} alt={item.city} className="w-14 h-10 rounded-lg object-cover border border-border flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="w-14 h-10 rounded-lg bg-muted border border-border flex-shrink-0 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-muted-foreground/40" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">{item.city}</span>
                  <span className="text-sm font-bold text-green-500">{item.members}</span>
                  {!item.is_active && <span className="text-[10px] text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">Inactiva</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Orden: {item.sort_order}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => toggleActive(item)}
                  className={cn('p-2 rounded-lg transition-colors', item.is_active ? 'text-green-500 hover:bg-green-500/10' : 'text-muted-foreground hover:bg-muted')}
                  title={item.is_active ? 'Desactivar' : 'Activar'}>
                  {item.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                </button>
                <button onClick={() => { setEditing(item); setShowForm(true); }}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-blue-500 transition-colors" title="Editar">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteItem(item)}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-red-500 transition-colors" title="Eliminar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300">
        <p className="text-xs">Solo los primeros <strong>4 activos</strong> (ordenados por "Orden") aparecen en el bento del landing. La imagen se usa como fondo semitransparente.</p>
      </div>

      {showForm && (
        <RegionFormModal item={editing} onSave={handleSave} onClose={() => { setShowForm(false); setEditing(null); }} saving={saving} />
      )}
      {deleteItem && (
        <DeleteConfirm name={deleteItem.city} onConfirm={handleDelete} onCancel={() => setDeleteItem(null)} />
      )}
    </div>
  );
}
