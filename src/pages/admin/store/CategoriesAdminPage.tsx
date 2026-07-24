import { useState, useEffect, useCallback } from 'react';
import { useDatabase, useStorage } from '@/lib/backend';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ProductCategory } from '@/lib/storeTypes';
import { Plus, Save, Loader as Loader2, Trash2, Pencil, X, Image, FolderOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';

const EMPTY: Partial<ProductCategory> = { name: '', slug: '', description: '', status: 'active', sort_order: 0 };

export default function CategoriesAdminPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<ProductCategory>>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductCategory | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const database = useDatabase();
  const storage = useStorage();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await database.select<ProductCategory>('product_categories', { order: { column: 'sort_order' } });
    setCategories((data as ProductCategory[]) || []);
    setLoading(false);
  }, [database]);

  useEffect(() => { load(); }, [load]);

  // Auto-slug from name
  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
    setForm(p => ({ ...p, name, ...(!p.id ? { slug } : {}) }));
  };

  const uploadImage = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('Máximo 5MB para imágenes de categoría'); return; }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `categories/${Date.now()}.${ext}`;
    const { success, url, error } = await storage.upload('products', path, file, { upsert: true });
    if (!success || !url) { toast.error(error || 'Error subiendo imagen'); setUploading(false); return; }
    setForm(p => ({ ...p, image_url: url }));
    setUploading(false);
  };

  const save = async () => {
    if (!form.name?.trim() || !form.slug?.trim()) { toast.error('Nombre y slug son requeridos'); return; }
    setSaving(true);
    // Auto sort_order for new categories
    let autoOrder = form.sort_order ?? 0;
    if (!form.id) {
      autoOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) + 1 : 0;
    }
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description || null,
      image_url: form.image_url || null,
      status: form.status || 'active',
      sort_order: autoOrder,
      parent_id: form.parent_id || null,
    };
    if (form.id) {
      const { error } = await database.update('product_categories', form.id, payload);
      if (error) { toast.error(error); setSaving(false); return; }
    } else {
      const { error } = await database.insert('product_categories', payload);
      if (error) { toast.error(error); setSaving(false); return; }
    }
    toast.success(form.id ? 'Categoría actualizada' : 'Categoría creada');
    setForm(EMPTY); setShowForm(false); setSaving(false); load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const { error } = await database.delete('product_categories', deleteTarget.id);
      if (error) { toast.error('No se puede eliminar — tiene productos asociados'); return; }
      toast.success('Categoría eliminada');
      load();
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  const updateSortOrder = async (id: string, newOrder: number) => {
    await database.update('product_categories', id, { sort_order: newOrder });
    load();
  };

  const rootCategories = categories.filter(c => !c.parent_id);
  const childCategories = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Categorías de Productos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{categories.length} categorías — aparecen en el carrusel de la tienda</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-md shadow-primary/25">
          <Plus className="w-4 h-4" /> Nueva categoría
        </button>
      </div>

      {/* Preview carousel */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Vista previa del carrusel</p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          <div className="flex-shrink-0 w-24 flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-xl bg-primary/15 border-2 border-primary flex items-center justify-center">
              <span className="text-lg">🏪</span>
            </div>
            <span className="text-[11px] font-bold text-primary">Todos</span>
          </div>
          {rootCategories.map(c => (
            <div key={c.id} className="flex-shrink-0 w-24 flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden border border-border">
                {c.image_url
                  ? <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><FolderOpen className="w-6 h-6 text-muted-foreground" /></div>}
              </div>
              <span className="text-[11px] font-semibold text-foreground text-center leading-tight line-clamp-2">{c.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category list */}
      {loading ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/30">{['Imagen','Nombre','Slug','Orden','Estado','Acciones'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>{Array.from({length:5}).map((_,i)=>(<tr key={i} className="border-b border-border/40"><td className="px-4 py-3"><Skeleton className="w-10 h-10 rounded-xl" /></td><td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td><td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td><td className="px-4 py-3"><Skeleton className="h-7 w-16 rounded-lg" /></td><td className="px-4 py-3"><Skeleton className="h-6 w-16 rounded-full" /></td><td className="px-4 py-3"><div className="flex gap-1"><Skeleton className="w-7 h-7 rounded-lg" /><Skeleton className="w-7 h-7 rounded-lg" /></div></td></tr>))}</tbody>
          </table>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Imagen','Nombre','Slug','Orden','Estado','Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rootCategories.map(cat => (
                <>
                  <tr key={cat.id} className="border-b border-border/40 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-xl bg-muted overflow-hidden border border-border">
                        {cat.image_url
                          ? <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                          : <FolderOpen className="w-5 h-5 text-muted-foreground m-2.5" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">{cat.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{cat.slug}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateSortOrder(cat.id, Math.max(0, cat.sort_order - 1))}
                          className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground text-sm font-bold transition-colors">↑</button>
                        <span className="w-8 text-center text-xs font-bold text-foreground bg-muted rounded-lg py-1.5">{cat.sort_order}</span>
                        <button onClick={() => updateSortOrder(cat.id, cat.sort_order + 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground text-sm font-bold transition-colors">↓</button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full',
                        cat.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground')}>
                        {cat.status === 'active' ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setForm(cat); setShowForm(true); }}
                          className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-primary">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(cat)}
                          className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {childCategories(cat.id).map(child => (
                    <tr key={child.id} className="border-b border-border/40 hover:bg-muted/20 bg-muted/5">
                      <td className="px-4 py-2 pl-8">
                        <div className="w-8 h-8 rounded-lg bg-muted overflow-hidden border border-border">
                          {child.image_url ? <img src={child.image_url} alt={child.name} className="w-full h-full object-cover" /> : <FolderOpen className="w-4 h-4 text-muted-foreground m-2" />}
                        </div>
                      </td>
                      <td className="px-4 py-2 pl-8 text-muted-foreground text-sm">↳ {child.name}</td>
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{child.slug}</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">{child.sort_order}</td>
                      <td className="px-4 py-2">
                        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                          child.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground')}>
                          {child.status === 'active' ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <button onClick={() => { setForm(child); setShowForm(true); }}
                          className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-primary">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
              {categories.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No hay categorías aún</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">{form.id ? 'Editar categoría' : 'Nueva categoría'}</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-2">Imagen de categoría</label>
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-xl bg-muted overflow-hidden border-2 border-dashed border-border flex items-center justify-center flex-shrink-0">
                  {form.image_url
                    ? <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                    : <Image className="w-6 h-6 text-muted-foreground" />}
                </div>
                <div className="flex-1 space-y-2">
                  <label className={cn('flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-semibold cursor-pointer hover:bg-muted transition-colors',
                    uploading && 'opacity-50 cursor-not-allowed')}>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                    {uploading ? 'Subiendo...' : 'Subir imagen'}
                    <input type="file" accept="image/*" className="hidden" disabled={uploading}
                      onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                  </label>
                  <input value={form.image_url || ''} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))}
                    placeholder="O pega una URL de imagen"
                    className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-xs text-foreground outline-none focus:border-primary" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">Nombre *</label>
              <input value={form.name || ''} onChange={e => handleNameChange(e.target.value)} placeholder="Salud y Bienestar"
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">Slug (URL) *</label>
              <input value={form.slug || ''} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="salud-bienestar"
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm font-mono text-foreground outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">Descripción</label>
              <textarea value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={2} placeholder="Descripción breve de la categoría"
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Categoría padre</label>
                <select value={form.parent_id || ''} onChange={e => setForm(p => ({ ...p, parent_id: e.target.value || null }))}
                  className="w-full px-3 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary">
                  <option value="">Sin padre (raíz)</option>
                  {rootCategories.filter(c => c.id !== form.id).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Orden</label>
                <input type="number" value={form.sort_order ?? 0} onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                  min="0" className="w-full px-3 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-foreground mb-1.5">Estado</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['active', 'inactive'] as const).map(s => (
                    <button key={s} onClick={() => setForm(p => ({ ...p, status: s }))}
                      className={cn('py-2.5 rounded-xl text-sm font-bold border-2 transition-colors',
                        form.status === s ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')}>
                      {s === 'active' ? 'Activa' : 'Inactiva'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-semibold hover:bg-muted">Cancelar</button>
              <button onClick={save} disabled={saving || uploading}
                className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleDelete}
        title="Eliminar categoría"
        description={<>Se eliminará permanentemente <strong>{deleteTarget?.name}</strong>. Esta acción no se puede deshacer.</>}
        loading={!!deletingId}
      />
    </div>
  );
}
