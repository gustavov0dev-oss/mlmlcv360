import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from '@/lib/router';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Product, ProductCategory } from '@/lib/storeTypes';
import { Plus, Search, CreditCard as Edit2, Trash2, Copy, Eye, EyeOff, Package, Loader as Loader2, RefreshCw } from 'lucide-react';

function fmt(n: number) { return `S/ ${n.toFixed(2)}`; }

const STATUS_MAP = { active: { label: 'Activo', cl: 'text-green-600 bg-green-500/10' }, draft: { label: 'Borrador', cl: 'text-yellow-600 bg-yellow-500/10' }, archived: { label: 'Archivado', cl: 'text-muted-foreground bg-muted' } };

export default function ProductsAdminPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [delId, setDelId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from('products').select('*, category:product_categories(id,name), variants:product_variants(id,stock,price)').order('created_at', { ascending: false }),
      supabase.from('product_categories').select('*').order('sort_order'),
    ]);
    setProducts((prods as Product[]) || []);
    setCategories(cats || []);
    setLoading(false);
  }, []);

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
    const { data, error } = await supabase.from('products').insert({
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
    }).select().single();
    if (error) { toast.error(error.message); return; }
    // Duplicate variants
    if (p.variants?.length) {
      await supabase.from('product_variants').insert(
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
    const { error } = await supabase.from('products').update({ status: next, updated_at: new Date().toISOString() }).eq('id', p.id);
    if (error) toast.error(error.message);
    else { toast.success(`Producto ${next === 'active' ? 'activado' : 'desactivado'}`); load(); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Producto eliminado'); setDelId(null); load(); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Productos</h1>
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
        <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
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
                        <span className={cn('text-xs font-semibold', totalStock === 0 ? 'text-red-500' : totalStock <= 5 ? 'text-orange-500' : 'text-foreground')}>{totalStock}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', sc.cl)}>{sc.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => navigate(`/dashboard/admin/productos/${p.id}`)}
                            className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-primary" title="Editar">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => duplicate(p)}
                            className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-blue-500" title="Duplicar">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => toggleStatus(p)}
                            className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-green-500" title="Activar/Desactivar">
                            {p.status === 'active' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          {delId === p.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => remove(p.id)} className="p-1.5 bg-red-500 text-white rounded-lg text-xs font-bold">Sí</button>
                              <button onClick={() => setDelId(null)} className="p-1.5 bg-muted rounded-lg text-xs font-bold">No</button>
                            </div>
                          ) : (
                            <button onClick={() => setDelId(p.id)}
                              className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-red-500" title="Eliminar">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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
    </div>
  );
}
