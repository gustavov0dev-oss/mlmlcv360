import { useState, useEffect, useCallback } from 'react';
import { useDatabase, useStorage } from '@/lib/backend';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from '@/lib/router';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ProductCategory, ProductVariant } from '@/lib/storeTypes';
import { Save, Loader as Loader2, Plus, Trash2, ChevronLeft, X, Package, Upload, Video, Image, Link, GripVertical, Palette, FileText, Box, Download, Eye } from 'lucide-react';

interface MediaItem { url: string; alt?: string; type?: 'image' | 'video'; thumbnail?: string }
interface VariantForm {
  id?: string;
  name: string;
  sku: string;
  price: string;
  compare_price: string;
  stock: string;
  attributes: Record<string, string>;
  status: 'active' | 'inactive';
  images: MediaItem[];
  attributeType?: 'text' | 'color' | 'image';
  colorValue?: string;
  colorName?: string;
}
interface SpecRow { key: string; value: string }

const ATTRIBUTE_TYPES = [
  { value: 'text', label: 'Texto', icon: FileText },
  { value: 'color', label: 'Color', icon: Palette },
  { value: 'image', label: 'Imagen', icon: Image },
];

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const presetColors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899', '#000000', '#FFFFFF', '#6B7280', '#78716C'];
  return (
    <div className="flex flex-wrap gap-1.5">
      {presetColors.map(c => (
        <button key={c} type="button" onClick={() => onChange(c)}
          className={cn('w-6 h-6 rounded-lg border-2 transition-all', value === c ? 'border-primary scale-110 shadow-md' : 'border-border hover:scale-105')}
          style={{ backgroundColor: c }} />
      ))}
      <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)}
        className="w-6 h-6 rounded-lg cursor-pointer border-2 border-border" />
    </div>
  );
}

export default function ProductFormPage() {
  const pathname = window.location.pathname;
  const productId = pathname.endsWith('nuevo') ? null : pathname.split('/').pop() || null;
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!productId);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [tab, setTab] = useState<'general' | 'specs' | 'variants' | 'media' | 'commissions' | 'seo' | 'digital'>('general');
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: '', slug: '', description: '', short_description: '',
    category_id: '', base_price: '', compare_price: '', cost_price: '',
    currency: 'PEN', status: 'draft', sku: '', weight: '',
    track_stock: true, allow_backorder: false, featured: false,
    tags: '', meta_title: '', meta_description: '',
    is_digital: false, digital_file_url: '', digital_instructions: '', digital_demo_url: '',
    general_stock: '0',
  });
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [variants, setVariants] = useState<VariantForm[]>([]);
  const [commissions, setCommissions] = useState<Array<{ level: number; type: string; value: string }>>([]);
  const [specs, setSpecs] = useState<SpecRow[]>([]);
  const [attrKey, setAttrKey] = useState('color');
  const [attrType, setAttrType] = useState<'text' | 'color' | 'image'>('text');
  const [draggedVariantIdx, setDraggedVariantIdx] = useState<number | null>(null);

  const database = useDatabase();
  const storage = useStorage();

  const generateSKU = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SKU-${timestamp}${random}`;
  };

  const load = useCallback(async () => {
    const [{ data: cats }] = await Promise.all([
      database.select<ProductCategory>('product_categories', { order: { column: 'sort_order' } }),
    ]);
    setCategories((cats as ProductCategory[]) || []);

    if (productId) {
      const { data: p } = await database.select<any>('products', { select: '*, variants:product_variants(*), commissions:product_commissions(*)', filter: { id: productId }, maybeSingle: true });
      if (p) {
        setForm({
          name: p.name, slug: p.slug, description: p.description || '',
          short_description: p.short_description || '',
          category_id: p.category_id || '', base_price: String(p.base_price),
          compare_price: p.compare_price ? String(p.compare_price) : '',
          cost_price: p.cost_price ? String(p.cost_price) : '',
          currency: p.currency, status: p.status, sku: p.sku || generateSKU(),
          weight: p.weight ? String(p.weight) : '',
          track_stock: p.track_stock, allow_backorder: p.allow_backorder, featured: p.featured,
          tags: (p.tags || []).join(', '),
          meta_title: p.meta_title || '', meta_description: p.meta_description || '',
          is_digital: (p as any).is_digital || false,
          digital_file_url: (p as any).digital_file_url || '',
          digital_instructions: (p as any).digital_instructions || '',
          digital_demo_url: (p as any).digital_demo_url || '',
          general_stock: String((p as any).general_stock ?? 0),
        });
        const imgs = (p.images || []).map((i: any) => ({ url: i.url, alt: i.alt, type: 'image' as const }));
        const vids = (p.videos || []).map((v: any) => ({ url: v.url, thumbnail: v.thumbnail, type: 'video' as const }));
        setMedia([...imgs, ...vids]);
        setVariants((p.variants || []).map((v: ProductVariant) => ({
          id: v.id, name: v.name, sku: v.sku || '', price: v.price ? String(v.price) : '',
          compare_price: v.compare_price ? String(v.compare_price) : '',
          stock: String(v.stock), attributes: v.attributes, status: v.status,
          images: (v.images || []) as MediaItem[],
          attributeType: (v as any).attribute_type || 'text',
          colorValue: v.attributes?.color || '',
          colorName: (v as any).color_name || '',
        })));
        setCommissions((p.commissions || []).map((c: any) => ({
          level: c.level, type: c.type, value: String(c.value),
        })));
        if ((p as any).specs && typeof (p as any).specs === 'object') {
          setSpecs(Object.entries((p as any).specs).map(([key, value]) => ({ key, value: String(value) })));
        }
      }
    } else {
      setForm(p => ({ ...p, sku: generateSKU() }));
    }
    setLoading(false);
  }, [productId, database]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!productId && form.name) {
      const s = form.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
      setForm(p => ({ ...p, slug: s }));
    }
  }, [form.name, productId]);

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim() || !form.base_price) {
      toast.error('Completa nombre, slug y precio base'); return;
    }
    setSaving(true);
    const images = media.filter(m => m.type !== 'video').map(m => ({ url: m.url, alt: m.alt || form.name }));
    const videos = media.filter(m => m.type === 'video').map(m => ({ url: m.url, thumbnail: m.thumbnail || '' }));
    const specsObj = specs.reduce((acc, s) => {
      if (s.key.trim() && s.value.trim()) acc[s.key.trim()] = s.value.trim();
      return acc;
    }, {} as Record<string, string>);

    const payload = {
      name: form.name, slug: form.slug, description: form.description || null,
      short_description: form.short_description || null,
      images, videos, category_id: form.category_id || null, specs: specsObj,
      base_price: parseFloat(form.base_price), compare_price: form.compare_price ? parseFloat(form.compare_price) : null,
      cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
      currency: form.currency, status: form.status, sku: form.sku || null,
      weight: form.weight ? parseFloat(form.weight) : null,
      track_stock: form.track_stock, allow_backorder: form.allow_backorder, featured: form.featured,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      meta_title: form.meta_title || null, meta_description: form.meta_description || null,
      created_by: user?.id, updated_at: new Date().toISOString(),
      is_digital: form.is_digital,
      digital_file_url: form.is_digital ? form.digital_file_url : null,
      digital_demo_url: form.is_digital ? form.digital_demo_url : null,
      digital_instructions: form.is_digital ? form.digital_instructions : null,
      general_stock: parseInt(form.general_stock) || 0,
    };

    let pid = productId;
    if (productId) {
      const { error } = await database.update('products', productId, payload);
      if (error) { toast.error(error); setSaving(false); return; }
    } else {
      const { data, error } = await database.insert<any>('products', payload);
      if (error) { toast.error(error); setSaving(false); return; }
      pid = data.id;
    }

    if (productId) {
      await database.deleteWhere('product_variants', { product_id: pid! });
    }

    for (const [idx, v] of variants.entries()) {
      await database.insert('product_variants', {
        product_id: pid!, name: v.name, sku: v.sku || null,
        price: v.price ? parseFloat(v.price) : null,
        compare_price: v.compare_price ? parseFloat(v.compare_price) : null,
        stock: parseInt(v.stock) || 0, attributes: v.attributes, status: v.status,
        images: v.images || [], sort_order: idx, weight: null,
        attribute_type: v.attributeType || 'text',
        color_name: v.colorName || null,
      });
    }

    if (commissions.length > 0) {
      await database.deleteWhere('product_commissions', { product_id: pid! });
      await database.insert('product_commissions',
        commissions.filter(c => c.value).map(c => ({
          product_id: pid!, level: c.level, type: c.type, value: parseFloat(c.value),
          min_purchase_amount: 0, status: 'active',
        }))
      );
    }

    toast.success(productId ? 'Producto actualizado' : 'Producto creado');
    setSaving(false);
    if (!productId) navigate('/dashboard/admin/productos');
  };

  const uploadFile = async (file: File, isDigital = false) => {
    if (file.size > 50 * 1024 * 1024) { toast.error('Archivo muy grande (máx 50MB)'); return; }
    setUploading(true);
    const bucket = isDigital ? 'products' : 'products';
    const path = `${isDigital ? 'digital' : 'media'}/${Date.now()}.${file.name.split('.').pop()}`;
    const { success, url, error } = await storage.upload(bucket, path, file, { upsert: false });
    if (!success || !url) { toast.error(error || 'Error subiendo archivo'); setUploading(false); return; }
    const publicUrl = url;
    if (isDigital) {
      setForm(p => ({ ...p, digital_file_url: publicUrl }));
      toast.success('Archivo digital subido');
    } else {
      const isVideo = /\.(mp4|webm|mov|avi)$/i.test(file.name);
      setMedia(prev => [...prev, { url: publicUrl, alt: form.name, type: isVideo ? 'video' : 'image' }]);
      toast.success('Imagen subida');
    }
    setUploading(false);
  };

  const addVariant = () => {
    const newVar: VariantForm = {
      name: '', sku: generateSKU(), price: '', compare_price: '', stock: '0',
      attributes: { [attrKey]: attrType === 'color' ? '#000000' : '' },
      status: 'active', images: [],
      attributeType: attrType,
      colorValue: attrType === 'color' ? '#000000' : undefined,
      colorName: '',
    };
    setVariants(prev => [...prev, newVar]);
  };

  const TABS = [
    { id: 'general', label: 'General', icon: Package },
    { id: 'media', label: 'Medios', icon: Image },
    { id: 'variants', label: `Variantes (${variants.length})`, icon: Box },
    { id: 'specs', label: 'Specs', icon: FileText },
    { id: 'commissions', label: 'Comisiones', icon: Link },
    { id: 'seo', label: 'SEO', icon: Eye },
    ...(form.is_digital ? [{ id: 'digital', label: 'Digital', icon: Download }] : []),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/dashboard/admin/productos')} className="p-2 hover:bg-muted rounded-xl transition-colors">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">{productId ? `Editar: ${form.name || 'Producto'}` : 'Nuevo Producto'}</h1>
          <p className="text-xs text-muted-foreground">{productId ? 'Modificar datos del producto' : 'Crear un nuevo producto en el catálogo'}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
            className="px-3 py-2 bg-card border border-border rounded-xl text-xs font-semibold text-foreground outline-none">
            <option value="draft">Borrador</option>
            <option value="active">Activo</option>
            <option value="archived">Archivado</option>
          </select>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {productId ? 'Actualizar' : 'Crear producto'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto gap-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={cn('flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 -mb-px transition-colors flex-shrink-0',
              tab === t.id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30')}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── GENERAL TAB ── */}
      {tab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Nombre del producto *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nombre del producto"
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Slug (URL) *</label>
                <input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))}
                  placeholder="mi-producto"
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm font-mono text-foreground outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Descripción corta</label>
                <textarea value={form.short_description} onChange={e => setForm(p => ({ ...p, short_description: e.target.value }))}
                  rows={2} placeholder="Breve descripción del producto..."
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Descripción completa</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={6} placeholder="Descripción detallada del producto. Soporta sintaxis ![alt](url) para imágenes inline."
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary resize-none" />
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-foreground">Precios</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Precio base *</label>
                  <input type="number" value={form.base_price} onChange={e => setForm(p => ({ ...p, base_price: e.target.value }))}
                    placeholder="0.00" step="0.01" min="0"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Precio tachado</label>
                  <input type="number" value={form.compare_price} onChange={e => setForm(p => ({ ...p, compare_price: e.target.value }))}
                    placeholder="0.00" step="0.01" min="0"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Costo interno</label>
                  <input type="number" value={form.cost_price} onChange={e => setForm(p => ({ ...p, cost_price: e.target.value }))}
                    placeholder="0.00" step="0.01" min="0"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Moneda</label>
                <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                  className="px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none">
                  <option value="PEN">PEN (S/)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>

            {/* Inventory */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-foreground">Inventario</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">SKU</label>
                  <div className="flex gap-2">
                    <input value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))}
                      placeholder="SKU-XXXXXXX"
                      className="flex-1 px-4 py-3 bg-muted border border-border rounded-xl text-sm font-mono text-foreground outline-none focus:border-primary" />
                    <button type="button" onClick={() => setForm(p => ({ ...p, sku: generateSKU() }))}
                      className="px-3 py-3 bg-muted border border-border rounded-xl text-xs text-muted-foreground hover:text-foreground">Auto</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Peso (kg)</label>
                  <input type="number" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
                    placeholder="0.00" step="0.001" min="0"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Stock general (sin variantes)</label>
                <input type="number" value={form.general_stock} onChange={e => setForm(p => ({ ...p, general_stock: e.target.value }))}
                  placeholder="0" min="0"
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
                <p className="text-xs text-muted-foreground mt-1">Usado cuando el producto no tiene variantes o la variante no tiene precio asignado.</p>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.track_stock} onChange={e => setForm(p => ({ ...p, track_stock: e.target.checked }))}
                    className="w-4 h-4 rounded accent-primary" />
                  <span className="text-sm text-foreground">Controlar stock</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.allow_backorder} onChange={e => setForm(p => ({ ...p, allow_backorder: e.target.checked }))}
                    className="w-4 h-4 rounded accent-primary" />
                  <span className="text-sm text-foreground">Permitir pedidos sin stock</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-foreground">Organización</h3>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Categoría</label>
                <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary">
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Etiquetas</label>
                <input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
                  placeholder="ropa, verano, oferta (separadas por coma)"
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer flex-1 p-3 bg-muted rounded-xl border border-border">
                  <input type="checkbox" checked={form.featured} onChange={e => setForm(p => ({ ...p, featured: e.target.checked }))}
                    className="w-4 h-4 rounded accent-primary" />
                  <span className="text-xs font-semibold text-foreground">Destacado</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer flex-1 p-3 bg-muted rounded-xl border border-border">
                  <input type="checkbox" checked={form.is_digital} onChange={e => setForm(p => ({ ...p, is_digital: e.target.checked }))}
                    className="w-4 h-4 rounded accent-primary" />
                  <span className="text-xs font-semibold text-foreground">Digital</span>
                </label>
              </div>
            </div>

            {media[0] && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <img src={media[0].url} alt={form.name} className="w-full aspect-square object-cover" />
                <div className="p-3">
                  <p className="text-xs font-semibold text-foreground truncate">{media[0].alt || 'Portada'}</p>
                  <p className="text-[10px] text-muted-foreground">{media.length} imagen{media.length !== 1 ? 'es' : ''} total</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MEDIA TAB ── */}
      {tab === 'media' && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-foreground">Imágenes y videos</h3>
          <div className="flex gap-2 flex-wrap">
            <label className={cn('flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold cursor-pointer hover:bg-primary/90 transition-colors', uploading && 'opacity-50 cursor-not-allowed')}>
              <Upload className="w-4 h-4" /> Subir archivo
              <input type="file" accept="image/*,video/*" multiple className="hidden" disabled={uploading}
                onChange={e => { Array.from(e.target.files || []).forEach(f => uploadFile(f)); }} />
            </label>
            <div className="flex gap-2 flex-1 min-w-[200px]">
              <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
                placeholder="https://... (URL de imagen o video)"
                className="flex-1 px-4 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
              <button onClick={() => {
                if (!urlInput.trim()) return;
                const isVideo = /\.(mp4|webm|mov|avi)$/i.test(urlInput);
                setMedia(prev => [...prev, { url: urlInput.trim(), alt: form.name, type: isVideo ? 'video' : 'image' }]);
                setUrlInput('');
              }} className="px-4 py-2.5 bg-muted border border-border rounded-xl text-sm font-semibold hover:bg-card transition-colors">
                Agregar
              </button>
            </div>
          </div>
          {uploading && <p className="text-xs text-primary animate-pulse">Subiendo archivo...</p>}
          {media.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl">
              <Image className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Sin imágenes ni videos — la primera imagen será la portada
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {media.map((m, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div draggable
                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(i)); }}
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const dragIdx = parseInt(e.dataTransfer.getData('text/plain'));
                      if (dragIdx === i) return;
                      const newMedia = [...media];
                      const [draggedItem] = newMedia.splice(dragIdx, 1);
                      newMedia.splice(i, 0, draggedItem);
                      setMedia(newMedia);
                    }}
                    className={cn('relative group rounded-xl overflow-hidden border border-border aspect-square bg-muted cursor-grab active:cursor-grabbing',
                      i === 0 && 'ring-2 ring-primary ring-offset-2')}>
                    {m.type === 'video' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                        <Video className="w-8 h-8 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground px-2 text-center line-clamp-2">{m.url.split('/').pop()?.slice(0, 20)}</span>
                      </div>
                    ) : (
                      <img src={m.url} alt={m.alt || ''} className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).src = ''; }} />
                    )}
                    {i === 0 && <span className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">PORTADA</span>}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 absolute top-1 right-1 flex gap-1">
                        <button onClick={() => setMedia(prev => prev.filter((_, j) => j !== i))}
                          className="w-6 h-6 bg-red-500 rounded-lg flex items-center justify-center text-white hover:bg-destructive"><X className="w-3 h-3" /></button>
                      </div>
                      <GripVertical className="w-5 h-5 text-white opacity-0 group-hover:opacity-100" />
                    </div>
                  </div>
                  <input value={m.alt || ''} onChange={e => setMedia(prev => prev.map((x, j) => j === i ? { ...x, alt: e.target.value } : x))}
                    placeholder="Nombre / descripción de la imagen"
                    className="w-full px-2 py-1.5 bg-muted border border-border rounded-lg text-[10px] text-foreground outline-none focus:border-primary" />
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Arrastra las imágenes para reordenar. La primera imagen es la portada.</p>
        </div>
      )}

      {/* ── VARIANTS TAB ── */}
      {tab === 'variants' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground">Configuración de variantes</h3>
            <div className="flex gap-2 flex-wrap">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Nombre del atributo</label>
                <input value={attrKey} onChange={e => setAttrKey(e.target.value)}
                  placeholder="color, talla, material..."
                  className="px-3 py-2 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary w-36" />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Tipo</label>
                <div className="flex gap-1">
                  {ATTRIBUTE_TYPES.map(t => (
                    <button key={t.value} onClick={() => setAttrType(t.value as any)}
                      className={cn('flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border transition-colors',
                        attrType === t.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                      <t.icon className="w-3.5 h-3.5" /> {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-end">
                <button onClick={addVariant}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
                  <Plus className="w-4 h-4" /> Agregar variante
                </button>
              </div>
            </div>
          </div>

          {variants.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-xl text-muted-foreground">
              <Box className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">Sin variantes</p>
              <p className="text-xs mt-1">Agrega variantes de color, talla u otros atributos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {variants.map((v, i) => (
                <div key={i} draggable
                  onDragStart={() => setDraggedVariantIdx(i)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => {
                    if (draggedVariantIdx === null || draggedVariantIdx === i) return;
                    const newV = [...variants];
                    const [d] = newV.splice(draggedVariantIdx, 1);
                    newV.splice(i, 0, d);
                    setVariants(newV);
                    setDraggedVariantIdx(null);
                  }}
                  className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab flex-shrink-0" />
                    <input value={v.name} onChange={e => setVariants(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      placeholder="Nombre (ej: Rojo L)"
                      className="flex-1 px-3 py-2 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
                    <select value={v.status} onChange={e => setVariants(p => p.map((x, j) => j === i ? { ...x, status: e.target.value as any } : x))}
                      className="px-3 py-2 bg-muted border border-border rounded-xl text-xs text-foreground outline-none">
                      <option value="active">Activa</option>
                      <option value="inactive">Inactiva</option>
                    </select>
                    <button onClick={() => setVariants(p => p.filter((_, j) => j !== i))}
                      className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1.5">Precio (S/)</label>
                      <input type="number" value={v.price} onChange={e => setVariants(p => p.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                        placeholder="Deja vacío = precio base"
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1.5">Tachado (S/)</label>
                      <input type="number" value={v.compare_price} onChange={e => setVariants(p => p.map((x, j) => j === i ? { ...x, compare_price: e.target.value } : x))}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1.5">Stock</label>
                      <input type="number" value={v.stock} onChange={e => setVariants(p => p.map((x, j) => j === i ? { ...x, stock: e.target.value } : x))}
                        placeholder="0" min="0"
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1.5">SKU</label>
                      <input value={v.sku} onChange={e => setVariants(p => p.map((x, j) => j === i ? { ...x, sku: e.target.value } : x))}
                        placeholder="SKU"
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-xs font-mono text-foreground outline-none focus:border-primary" />
                    </div>
                  </div>

                  {/* Attribute value */}
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1.5">
                      Valor de {attrKey}
                      {v.attributeType === 'color' && <span className="text-muted-foreground font-normal ml-1">— elige el color y ponle nombre</span>}
                    </label>
                    {v.attributeType === 'color' ? (
                      <div className="space-y-2">
                        <div className="flex gap-3 items-center">
                          <ColorPicker value={v.colorValue || '#000000'} onChange={c => {
                            setVariants(p => p.map((x, j) => j === i ? { ...x, colorValue: c, attributes: { ...x.attributes, [attrKey]: c } } : x));
                          }} />
                          <span className="text-xs font-mono text-muted-foreground">{v.colorValue}</span>
                        </div>
                        <input value={v.colorName || ''} onChange={e => setVariants(p => p.map((x, j) => j === i ? { ...x, colorName: e.target.value } : x))}
                          placeholder="Nombre del color (ej: Rojo coral, Azul marino, Verde olivo)"
                          className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-xs text-foreground outline-none focus:border-primary" />
                      </div>
                    ) : v.attributeType === 'image' ? (
                      <div className="flex gap-2 items-start">
                        <input value={v.attributes[attrKey] || ''} onChange={e => setVariants(p => p.map((x, j) => j === i ? { ...x, attributes: { ...x.attributes, [attrKey]: e.target.value } } : x))}
                          placeholder="Texto del valor"
                          className="flex-1 px-3 py-2 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
                        <label className="px-3 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold cursor-pointer hover:bg-primary/90">
                          Imagen
                          <input type="file" accept="image/*" className="hidden" onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploading(true);
                            const path = `variants/${Date.now()}.${file.name.split('.').pop()}`;
                            const { success, url } = await storage.upload('products', path, file, { upsert: false });
                            if (success && url) {
                              const publicUrl = url;
                              setVariants(prev => prev.map((x, j) => j === i ? { ...x, images: [{ url: publicUrl, alt: x.name }] } : x));
                            }
                            setUploading(false);
                          }} />
                        </label>
                        {v.images?.[0]?.url && <img src={v.images[0].url} alt="" className="w-10 h-10 rounded-xl object-cover border border-border" />}
                      </div>
                    ) : (
                      <input value={v.attributes[attrKey] || ''} onChange={e => setVariants(p => p.map((x, j) => j === i ? { ...x, attributes: { ...x.attributes, [attrKey]: e.target.value } } : x))}
                        placeholder={`Valor del ${attrKey}`}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SPECS TAB ── */}
      {tab === 'specs' && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Especificaciones técnicas</h3>
            <button onClick={() => setSpecs(p => [...p, { key: '', value: '' }])}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Agregar spec
            </button>
          </div>
          {specs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl">
              Sin especificaciones. Agrega parámetros técnicos del producto.
            </div>
          ) : (
            <div className="space-y-2">
              {specs.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input value={s.key} onChange={e => setSpecs(p => p.map((x, j) => j === i ? { ...x, key: e.target.value } : x))}
                    placeholder="Característica (ej: Peso)"
                    className="flex-1 px-3 py-2 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
                  <input value={s.value} onChange={e => setSpecs(p => p.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                    placeholder="Valor (ej: 500g)"
                    className="flex-1 px-3 py-2 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
                  <button onClick={() => setSpecs(p => p.filter((_, j) => j !== i))}
                    className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── COMMISSIONS TAB ── */}
      {tab === 'commissions' && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Comisiones MLM por nivel</h3>
              <p className="text-xs text-muted-foreground">Sobrescribe las comisiones globales para este producto</p>
            </div>
            <button onClick={() => setCommissions(p => [...p, { level: p.length + 1, type: 'percentage', value: '' }])}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold">
              <Plus className="w-3.5 h-3.5" /> Nivel
            </button>
          </div>
          {commissions.length === 0 ? (
            <p className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed border-border rounded-xl">
              Sin comisiones personalizadas — aplican las globales
            </p>
          ) : (
            <div className="space-y-2">
              {commissions.map((c, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs font-bold text-muted-foreground w-16 flex-shrink-0">Nivel {c.level}</span>
                  <select value={c.type} onChange={e => setCommissions(p => p.map((x, j) => j === i ? { ...x, type: e.target.value } : x))}
                    className="px-3 py-2 bg-muted border border-border rounded-xl text-xs text-foreground outline-none">
                    <option value="percentage">%</option>
                    <option value="fixed">S/</option>
                  </select>
                  <input type="number" value={c.value} onChange={e => setCommissions(p => p.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                    placeholder="0" min="0" step="0.01"
                    className="flex-1 px-3 py-2 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
                  <button onClick={() => setCommissions(p => p.filter((_, j) => j !== i))}
                    className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-destructive rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SEO TAB ── */}
      {tab === 'seo' && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-foreground">SEO y metadatos</h3>
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">Meta título</label>
            <input value={form.meta_title} onChange={e => setForm(p => ({ ...p, meta_title: e.target.value }))}
              placeholder="Título para buscadores"
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">Meta descripción</label>
            <textarea value={form.meta_description} onChange={e => setForm(p => ({ ...p, meta_description: e.target.value }))}
              rows={3} placeholder="Descripción para buscadores (máx. 160 caracteres recomendado)"
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary resize-none" />
          </div>
        </div>
      )}

      {/* ── DIGITAL TAB ── */}
      {tab === 'digital' && form.is_digital && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-primary/8 border border-primary/20 rounded-xl">
            <Download className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-xs text-primary">
              <p className="font-bold">Producto digital</p>
              <p>El archivo se entrega automáticamente al cliente tras confirmar el pago.</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">Archivo digital</label>
            <div className="flex gap-2">
              <input value={form.digital_file_url} onChange={e => setForm(p => ({ ...p, digital_file_url: e.target.value }))}
                placeholder="https://... (URL del archivo)"
                className="flex-1 px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
              <label className={cn('flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold cursor-pointer hover:bg-primary/90', uploading && 'opacity-50 cursor-not-allowed')}>
                <Upload className="w-4 h-4" /> Subir
                <input type="file" className="hidden" disabled={uploading} onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], true)} />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">URL de demostración gratuita</label>
            <input value={form.digital_demo_url} onChange={e => setForm(p => ({ ...p, digital_demo_url: e.target.value }))}
              placeholder="https://... (video, iframe o enlace público)"
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
            <p className="text-xs text-muted-foreground mt-1">El cliente puede ver esta demo <strong>antes</strong> de comprar. Acepta MP4, YouTube, Vimeo o cualquier URL embebible.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">Instrucciones de acceso</label>
            <textarea value={form.digital_instructions} onChange={e => setForm(p => ({ ...p, digital_instructions: e.target.value }))}
              rows={4} placeholder="Instrucciones para el cliente tras la compra..."
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary resize-none" />
          </div>
        </div>
      )}
    </div>
  );
}
