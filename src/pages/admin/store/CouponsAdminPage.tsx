import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '@/lib/backend';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Coupon, Product, ProductCategory } from '@/lib/storeTypes';
import { Plus, Trash2, Save, Loader as Loader2, Tag, X, Pencil, Package, Check, Search, ChevronRight, ChevronDown, FolderOpen, Folder } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';

function fmt(n: number) { return `S/ ${n.toFixed(2)}`; }

const EMPTY: Partial<Coupon> = { type: 'percentage', value: 0, min_order_amount: 0, applies_to: 'all', status: 'active', usage_limit: undefined };

// Category Tree Component
function CategoryTree({ categories, selectedIds, onToggle, level = 0 }: {
  categories: ProductCategory[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  level?: number;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const roots = categories.filter(c => !c.parent_id);

  const renderNode = (cat: ProductCategory) => {
    const children = categories.filter(c => c.parent_id === cat.id);
    const hasChildren = children.length > 0;
    const isExpanded = expanded.has(cat.id);
    const isSelected = selectedIds.includes(cat.id);

    return (
      <div key={cat.id} style={{ marginLeft: level * 16 }}>
        <div className={cn('flex items-center gap-2 p-2 hover:bg-muted rounded-lg cursor-pointer group',
          isSelected && 'bg-primary/10')}>
          {hasChildren && (
            <button onClick={(e) => { e.stopPropagation(); setExpanded(prev => { const s = new Set(prev); s.has(cat.id) ? s.delete(cat.id) : s.add(cat.id); return s; }); }}
              className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          {!hasChildren && <span className="w-5" />}
          <div onClick={() => onToggle(cat.id)} className="flex items-center gap-2 flex-1">
            {hasChildren ? (isExpanded ? <FolderOpen className="w-4 h-4 text-amber-500" /> : <Folder className="w-4 h-4 text-amber-500" />) : <Package className="w-4 h-4 text-muted-foreground" />}
            <span className="text-sm text-foreground">{cat.name}</span>
          </div>
          {isSelected && <Check className="w-4 h-4 text-primary" />}
        </div>
        {hasChildren && isExpanded && (
          <div className="border-l-2 border-border ml-4">
            {children.map(child => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return <div className="space-y-0.5">{roots.map(cat => renderNode(cat))}</div>;
}

export default function CouponsAdminPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Coupon>>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  // Search for products
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  const database = useDatabase();

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: cpns }, { data: cats }] = await Promise.all([
      database.select<Coupon>('coupons', { order: { column: 'created_at', ascending: false } }),
      database.select<ProductCategory>('product_categories', { order: { column: 'name' } }),
    ]);
    setCoupons((cpns as Coupon[]) || []);
    setCategories((cats as ProductCategory[]) || []);
    setLoading(false);
  }, [database]);

  useEffect(() => { load(); }, [load]);

  // Search products with debounce
  useEffect(() => {
    if (form.applies_to !== 'products' || !productSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await database.select<Product>('products', { select: 'id, name, slug, images', filter: [{ column: 'status', operator: 'eq', value: 'active' }, { column: 'name', operator: 'ilike', value: `%${productSearch}%` }], limit: 20 });
      setSearchResults((data as Product[]) || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [productSearch, form.applies_to]);

  const openForm = (c?: Coupon) => {
    if (c) {
      setForm(c);
      setSelectedProductIds((c.product_ids as string[]) || []);
      setSelectedCategoryIds((c.category_ids as string[]) || []);
    } else {
      setForm(EMPTY);
      setSelectedProductIds([]);
      setSelectedCategoryIds([]);
    }
    setProductSearch('');
    setShowForm(true);
  };

  const save = async () => {
    if (!form.code?.trim() || !form.value) { toast.error('Completa codigo y valor'); return; }
    setSaving(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: form.value,
      min_order_amount: form.min_order_amount || 0,
      max_discount: form.max_discount || null,
      usage_limit: form.usage_limit || null,
      expires_at: form.expires_at || null,
      status: form.status || 'active',
      applies_to: form.applies_to || 'all',
      category_ids: form.applies_to === 'categories' ? selectedCategoryIds : [],
      product_ids: form.applies_to === 'products' ? selectedProductIds : [],
    };
    if (form.id) {
      await database.update('coupons', form.id, payload);
    } else {
      await database.insert('coupons', { ...payload, used_count: 0 });
    }
    toast.success(form.id ? 'Cupon actualizado' : 'Cupon creado');
    setForm(EMPTY); setShowForm(false); setSaving(false); load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await database.delete('coupons', deleteTarget.id);
      toast.success('Cupon eliminado');
      load();
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  const toggleProduct = (prodId: string) => {
    setSelectedProductIds(prev => prev.includes(prodId) ? prev.filter(id => id !== prodId) : [...prev, prodId]);
  };

  const toggleCategory = (catId: string) => {
    // Also toggle all children
    const allIds = [catId];
    const getChildren = (parentId: string) => {
      categories.filter(c => c.parent_id === parentId).forEach(c => { allIds.push(c.id); getChildren(c.id); });
    };
    getChildren(catId);

    setSelectedCategoryIds(prev => {
      const hasAll = allIds.every(id => prev.includes(id));
      if (hasAll) return prev.filter(id => !allIds.includes(id));
      return [...new Set([...prev, ...allIds])];
    });
  };

  // Get selected products for display
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  useEffect(() => {
    if (selectedProductIds.length > 0) {
      database.select<Product>('products', { select: 'id, name, slug, images', filter: { id: selectedProductIds } }).then(({ data }) => {
        setSelectedProducts((data as Product[]) || []);
      });
    } else {
      setSelectedProducts([]);
    }
  }, [selectedProductIds, database]);

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cupones de Descuento</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{coupons.length} cupones</p>
        </div>
        <button onClick={() => openForm()} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Nuevo cupon
        </button>
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/30">{['Código','Tipo/Valor','Mínimo','Aplica a','Usos','Vencimiento','Estado','Acciones'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
            <tbody>{Array.from({length:5}).map((_,i)=>(<tr key={i} className="border-b border-border/40"><td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td><td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td><td className="px-4 py-3"><Skeleton className="h-4 w-14" /></td><td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td><td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td><td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td><td className="px-4 py-3"><Skeleton className="h-6 w-16 rounded-full" /></td><td className="px-4 py-3"><div className="flex gap-1"><Skeleton className="w-7 h-7 rounded-lg" /><Skeleton className="w-7 h-7 rounded-lg" /></div></td></tr>))}</tbody>
          </table>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Codigo', 'Tipo/Valor', 'Minimo', 'Aplica a', 'Usos', 'Vencimiento', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id} className="border-b border-border/40 hover:bg-muted/20">
                  <td className="px-4 py-3 font-bold font-mono">{c.code}</td>
                  <td className="px-4 py-3 font-semibold text-primary">{c.type === 'percentage' ? `${c.value}%` : fmt(c.value)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.min_order_amount ? fmt(c.min_order_amount) : '--'}</td>
                  <td className="px-4 py-3 text-xs">
                    {c.applies_to === 'all' && <span className="bg-muted px-2 py-0.5 rounded-full">Todos</span>}
                    {c.applies_to === 'products' && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">{(c.product_ids as string[])?.length || 0} productos</span>}
                    {c.applies_to === 'categories' && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">{(c.category_ids as string[])?.length || 0} categorias</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ''}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{c.expires_at ? new Date(c.expires_at).toLocaleDateString('es-PE') : 'Sin venc.'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', c.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground')}>
                      {c.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openForm(c)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-primary"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteTarget(c)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No hay cupones</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Tag className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-base font-bold text-foreground">{form.id ? 'Editar cupón' : 'Nuevo cupón de descuento'}</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-5">

              {/* Code + Status row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-foreground mb-1.5">Código del cupón *</label>
                  <input
                    value={form.code || ''}
                    onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                    placeholder="VERANO25"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm font-mono font-bold tracking-widest outline-none focus:border-primary transition-colors placeholder:font-normal placeholder:tracking-normal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Estado</label>
                  <div className="flex gap-2">
                    {[{ v: 'active', label: 'Activo', cl: 'bg-emerald-500/10 text-emerald-600 border-green-500/30' },
                      { v: 'inactive', label: 'Inactivo', cl: 'bg-muted text-muted-foreground border-border' }].map(s => (
                      <button key={s.v} onClick={() => setForm(p => ({ ...p, status: s.v as any }))}
                        className={cn('flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-colors',
                          form.status === s.v ? s.cl : 'border-border text-muted-foreground hover:border-muted-foreground/50')}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Type + Value */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-foreground">Tipo de descuento *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setForm(p => ({ ...p, type: 'percentage' }))}
                    className={cn('flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left',
                      form.type === 'percentage' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40')}>
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0', form.type === 'percentage' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground')}>%</div>
                    <div>
                      <p className={cn('text-sm font-bold', form.type === 'percentage' ? 'text-primary' : 'text-foreground')}>Porcentaje</p>
                      <p className="text-xs text-muted-foreground">Ej: 20% de descuento</p>
                    </div>
                  </button>
                  <button onClick={() => setForm(p => ({ ...p, type: 'fixed' }))}
                    className={cn('flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left',
                      form.type === 'fixed' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40')}>
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0', form.type === 'fixed' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground')}>S/</div>
                    <div>
                      <p className={cn('text-sm font-bold', form.type === 'fixed' ? 'text-primary' : 'text-foreground')}>Monto fijo</p>
                      <p className="text-xs text-muted-foreground">Ej: S/ 30 de descuento</p>
                    </div>
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Valor * {form.type === 'percentage' ? '(%)' : '(S/)'}
                    </label>
                    <input type="number" value={form.value || ''} onChange={e => setForm(p => ({ ...p, value: parseFloat(e.target.value) || 0 }))}
                      placeholder={form.type === 'percentage' ? '25' : '30.00'} step="0.01" min="0"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm font-bold outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Pedido mínimo (S/)</label>
                    <input type="number" value={form.min_order_amount || ''} onChange={e => setForm(p => ({ ...p, min_order_amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0" step="0.01" min="0"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
                  </div>
                  {form.type === 'percentage' && (
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">Máx. descuento (S/)</label>
                      <input type="number" value={form.max_discount || ''} onChange={e => setForm(p => ({ ...p, max_discount: parseFloat(e.target.value) || undefined }))}
                        placeholder="Sin límite" step="0.01" min="0"
                        className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
                    </div>
                  )}
                </div>
              </div>

              {/* Limits + expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Límite de usos</label>
                  <input type="number" value={form.usage_limit || ''} onChange={e => setForm(p => ({ ...p, usage_limit: parseInt(e.target.value) || undefined }))}
                    placeholder="Sin límite" min="1"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
                  <p className="text-xs text-muted-foreground mt-1">Usos usados: {form.used_count ?? 0}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Fecha de vencimiento</label>
                  <input type="date" value={form.expires_at ? form.expires_at.split('T')[0] : ''}
                    onChange={e => setForm(p => ({ ...p, expires_at: e.target.value ? `${e.target.value}T23:59:59Z` : undefined }))}
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
                </div>
              </div>

              {/* Applies to */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-2">Aplicar descuento a:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'all', label: 'Todos', icon: '🛍️' },
                      { value: 'products', label: 'Productos específicos', icon: '📦' },
                      { value: 'categories', label: 'Categorías', icon: '🗂️' },
                    ].map(opt => (
                      <button key={opt.value} onClick={() => setForm(p => ({ ...p, applies_to: opt.value as any }))}
                        className={cn('flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-xs font-semibold border-2 transition-colors text-center',
                          form.applies_to === opt.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground')}>
                        <span className="text-xl">{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {form.applies_to === 'products' && (
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-2">
                      Productos ({selectedProductIds.length} seleccionados)
                    </label>
                    {selectedProducts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {selectedProducts.map(p => (
                          <span key={p.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                            {p.name}
                            <button onClick={() => toggleProduct(p.id)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                        placeholder="Buscar producto..."
                        className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
                      {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                    </div>
                    {searchResults.length > 0 && (
                      <div className="mt-1.5 border border-border rounded-xl max-h-40 overflow-y-auto">
                        {searchResults.map(p => (
                          <button key={p.id} onClick={() => { toggleProduct(p.id); setProductSearch(''); }}
                            className={cn('w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors border-b border-border/50 last:border-0',
                              selectedProductIds.includes(p.id) && 'bg-primary/5')}>
                            {p.images?.[0]?.url ? <img src={p.images[0].url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" /> : <Package className="w-8 h-8 text-muted-foreground flex-shrink-0" />}
                            <span className="flex-1 text-left text-sm text-foreground">{p.name}</span>
                            {selectedProductIds.includes(p.id) && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {form.applies_to === 'categories' && (
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-2">
                      Categorías ({selectedCategoryIds.length} seleccionadas)
                    </label>
                    <div className="border border-border rounded-xl max-h-48 overflow-y-auto bg-muted p-2">
                      <CategoryTree categories={categories} selectedIds={selectedCategoryIds} onToggle={toggleCategory} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-border flex-shrink-0">
              <button onClick={() => setShowForm(false)}
                className="flex-1 border border-border rounded-xl py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {form.id ? 'Actualizar cupón' : 'Crear cupón'}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleDelete}
        title="Eliminar cupón"
        description={<>Se eliminará permanentemente el cupón <strong>{deleteTarget?.code}</strong>. Esta acción no se puede deshacer.</>}
        loading={!!deletingId}
      />
    </div>
  );
}
