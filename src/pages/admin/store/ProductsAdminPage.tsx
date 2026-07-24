import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '@/lib/backend';
import { useNavigate } from '@/lib/router';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Product, ProductCategory } from '@/lib/storeTypes';
import { Plus, Search, Pencil, Trash2, Copy, Eye, EyeOff, Package, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';

function fmt(n: number) { return `S/ ${n.toFixed(2)}`; }

const STATUS_MAP = { active: { label: 'Activo', cl: 'text-emerald-600 bg-emerald-500/10' }, draft: { label: 'Borrador', cl: 'text-amber-600 bg-amber-500/10' }, archived: { label: 'Archivado', cl: 'text-muted-foreground bg-muted' } };

export default function ProductsAdminPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const database = useDatabase();

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: prods }, { data: cats }] = await Promise.all([
      database.select<Product>('products', { select: '*, category:product_categories(id,name), variants:product_variants(id,stock,price)', order: { column: 'created_at', ascending: false } }),
      database.select<ProductCategory>('product_categories', { order: { column: 'sort_order' } }),
    ]);
    setProducts((prods as Product[]) || []);
    setCategories((cats as ProductCategory[]) || []);
    setLoading(false);
  }, [database]);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter(p => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (catFilter && p.category_id !== catFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const duplicate = async (p: Product) => {
    const newSlug = `${p.slug}-copia-${Date.now()}`;
    const newSku = p.sku ? `${p.sku}-copia` : `SKU-${Date.now().toString(36).toUpperCase()}`;
    const { data, error } = await database.insert<any>('products', {
      name: `${p.name} (copia)`,
      slug: newSlug,
      description: p.description,
      short_description: p.short_description,
      images: p.images,
      videos: p.videos,
      category_id: p.category_id,
      base_price: p.base_price,
      compare_price: p.compare_price,
      cost_price: p.cost_price,
      currency: p.currency,
      status: 'draft',
      weight: p.weight,
      sku: newSku,
      track_stock: p.track_stock,
      allow_backorder: p.allow_backorder,
      tags: p.tags,
      meta_title: p.meta_title,
      meta_description: p.meta_description,
      featured: false,
      created_by: p.created_by,
    });
    if (error) { toast.error(error); return; }
    // Duplicate variants
    if (p.variants?.length) {
      await database.insert('product_variants',
        p.variants.map((v: any) => ({
          name: v.name,
          sku: v.sku ? `${v.sku}-copia` : undefined,
          price: v.price,
          compare_price: v.compare_price,
          stock: v.stock,
          attributes: v.attributes,
          images: v.images,
          status: v.status,
          weight: v.weight,
          product_id: data.id,
        }))
      );
    }
    toast.success('Producto duplicado — ahora puedes editarlo');
    load();
  };

  const toggleStatus = async (p: Product) => {
    const next = p.status === 'active' ? 'draft' : 'active';
    const { error } = await database.update('products', p.id, { status: next, updated_at: new Date().toISOString() });
    if (error) toast.error(error);
    else { toast.success(`Producto ${next === 'active' ? 'activado' : 'desactivado'}`); load(); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const { error } = await database.delete('products', deleteTarget.id);
      if (error) toast.error(error);
      else { toast.success('Producto eliminado'); load(); }
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Productos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{products.length} productos en total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 border border-border rounded-xl hover:bg-muted transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => navigate('/dashboard/admin/productos/nuevo')}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-md shadow-primary/25"
          >
            <Plus className="w-4 h-4" /> Nuevo producto
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar productos..."
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary transition-colors" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary">
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="draft">Borradores</option>
          <option value="archived">Archivados</option>
        </select>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary">
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/30">{['Producto','Categoría','Precio','Stock','Estado','Acciones'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" /><div className="space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div></div></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-8" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-20 rounded-full" /></td>
                    <td className="px-4 py-3"><div className="flex gap-1"><Skeleton className="w-7 h-7 rounded-lg" /><Skeleton className="w-7 h-7 rounded-lg" /><Skeleton className="w-7 h-7 rounded-lg" /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Producto</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Categoría</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Precio</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Stock</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const sc = STATUS_MAP[p.status] || STATUS_MAP.draft;
                  const totalStock = (p.variants || []).reduce((s: number, v: any) => s + (v.stock || 0), 0);
                  const img = p.images?.[0]?.url;
                  return (
                    <tr key={p.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0 border border-border">
                            {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-muted-foreground m-2.5" />}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{p.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{p.sku || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{(p.category as any)?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-foreground">{fmt(p.base_price)}</p>
                        {p.compare_price && <p className="text-xs text-muted-foreground line-through">{fmt(p.compare_price)}</p>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={cn('text-xs font-semibold', totalStock === 0 ? 'text-destructive' : totalStock <= 5 ? 'text-orange-500' : 'text-foreground')}>{totalStock}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', sc.cl)}>{sc.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => navigate(`/dashboard/admin/productos/${p.id}`)}
                            className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-primary" title="Editar">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => duplicate(p)}
                            className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-primary" title="Duplicar">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => toggleStatus(p)}
                            className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-emerald-500" title="Activar/Desactivar">
                            {p.status === 'active' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => setDeleteTarget(p)}
                            className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-destructive" title="Eliminar">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">No se encontraron productos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleDelete}
        title="Eliminar producto"
        description={<>Se eliminará permanentemente <strong>{deleteTarget?.name}</strong>. Esta acción no se puede deshacer.</>}
        loading={!!deletingId}
      />
    </div>
  );
}
