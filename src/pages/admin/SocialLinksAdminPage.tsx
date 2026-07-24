import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/backend/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea'; // used in SVG custom icon input
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, GripVertical, Loader as Loader2, RefreshCw, Link2, X, Save, ExternalLink, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon: string;
  icon_svg: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

type IconMode = 'preset' | 'custom';

interface FormState {
  id: string | null;
  platform: string;
  url: string;
  icon: string;
  icon_svg: string;
  icon_color: string;
  is_active: boolean;
  sort_order: number;
}

const emptyForm = (): FormState => ({
  id: null, platform: '', url: '', icon: 'facebook', icon_svg: '', icon_color: '#6366f1', is_active: true, sort_order: 0,
});

const ICON_OPTIONS = ['facebook','instagram','linkedin','twitter','youtube','tiktok','whatsapp','telegram','github'];

const PLATFORM_COLORS: Record<string, string> = {
  facebook:  '#1877F2',
  instagram: '#E1306C',
  linkedin:  '#0A66C2',
  twitter:   '#000000',
  youtube:   '#FF0000',
  tiktok:    '#010101',
  whatsapp:  '#25D366',
  telegram:  '#2AABEE',
  github:    '#24292F',
};

const ICON_PATHS: Record<string, string> = {
  facebook:  'M22 12a10 10 0 1 0-11.5 9.9v-7H8v-2.9h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6v1.9h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z',
  instagram: 'M12 2c2.7 0 3 0 4.1.1 1 0 1.7.2 2.3.5.6.2 1.5.6 2 1.1.5.5.9 1.4 1.1 2 .3.6.5 1.3.5 2.3.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c0 1-.2 1.7-.5 2.3-.2.6-.6 1.5-1.1 2-.5.5-1.4.9-2 1.1-.6.3-1.3.5-2.3.5-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-1 0-1.7-.2-2.3-.5-.6-.2-1.5-.6-2-1.1-.5-.5-.9-1.4-1.1-2-.3-.6-.5-1.3-.5-2.3C2 15 2 14.7 2 12s0-3 .1-4.1c0-1 .2-1.7.5-2.3.2-.6.6-1.5 1.1-2 .5-.5 1.4-.9 2-1.1.6-.3 1.3-.5 2.3-.5C9 2 9.3 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.3a3.3 3.3 0 1 1 0-6.6 3.3 3.3 0 0 1 0 6.6zm5.2-8.6a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z',
  linkedin:  'M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V21h-4v-5.3c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V21H9z',
  twitter:   'M18.9 1.9h3.7l-8 9.1 9.4 12.4h-7.4l-5.8-7.6-6.6 7.6H.5l8.5-9.7L0 1.9h7.6l5.2 6.9zM17.6 21h2L6.5 4H4.4z',
  youtube:   'M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.8-1.8C19.3 5 12 5 12 5s-7.3 0-8.8.5A2.5 2.5 0 0 0 1.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a2.5 2.5 0 0 0 1.8 1.8C4.7 19 12 19 12 19s7.3 0 8.8-.5a2.5 2.5 0 0 0 1.8-1.8C23 15.2 23 12 23 12zM9.8 15.3V8.7l5.7 3.3z',
  tiktok:    'M16.6 5.8a4.8 4.8 0 0 1-1-2.8h-3.4v13.6c0 1.4-1.1 2.5-2.5 2.5a2.5 2.5 0 0 1-2.5-2.5c0-1.4 1.1-2.5 2.5-2.5.3 0 .5 0 .8.1v-3.4a6 6 0 0 0-.8-.1 5.9 5.9 0 1 0 5.9 5.9V9.3a8 8 0 0 0 4.8 1.6V7.5a4.8 4.8 0 0 1-3.8-1.7z',
  whatsapp:  'M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.9.9-2.8-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.7.9-.1.1-.3.2-.5.1a6.5 6.5 0 0 1-1.9-1.2 7.3 7.3 0 0 1-1.3-1.7c-.1-.2 0-.4.1-.5l.4-.5.2-.4v-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3c-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1z',
  telegram:  'M21.9 4.3 18.6 20a1 1 0 0 1-1.5.7l-4-3-2 2c-.3.3-.6.4-1 .4l.3-4.2 7.8-7c.3-.3-.1-.5-.5-.2L7.3 14l-3.8-1.2c-.8-.2-.8-.8.2-1.2L20.6 3c.7-.3 1.4.2 1.3 1.3z',
  github:    'M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.1-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.4-2.2-.3-4.5-1.1-4.5-5a3.9 3.9 0 0 1 1-2.7c-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6a3.9 3.9 0 0 1 1 2.7c0 3.9-2.3 4.7-4.5 5 .3.3.6.9.6 1.8v2.6c0 .3.2.6.7.5A10 10 0 0 0 12 2z',
};

// Extracts viewBox and inner content from full SVG markup, or returns null if it's a path d value
function parseSvgInput(raw: string): { viewBox: string; inner: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Full <svg> tag
  if (trimmed.startsWith('<svg') || trimmed.startsWith('<SVG')) {
    const vbMatch = trimmed.match(/viewBox=["']([^"']+)["']/i);
    const viewBox = vbMatch?.[1] ?? '0 0 24 24';
    const inner = trimmed.replace(/<\/?svg[^>]*>/gi, '').trim();
    return { viewBox, inner };
  }
  // Bare path d value
  return { viewBox: '0 0 24 24', inner: `<path d="${trimmed}" />` };
}

function PlatformIcon({ icon, iconSvg, className = 'h-5 w-5' }: {
  icon: string; iconSvg?: string | null; className?: string;
}) {
  if (iconSvg?.trim()) {
    const parsed = parseSvgInput(iconSvg);
    if (parsed) {
      return (
        <svg viewBox={parsed.viewBox} fill="currentColor" className={className} aria-hidden
          dangerouslySetInnerHTML={{ __html: parsed.inner }} />
      );
    }
  }
  const path = ICON_PATHS[icon] || ICON_PATHS.facebook;
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d={path} />
    </svg>
  );
}

function getColor(icon: string, iconSvg?: string | null, iconColor?: string | null) {
  if (iconSvg?.trim()) return iconColor || '#6366f1';
  return PLATFORM_COLORS[icon] || '#6366f1';
}

export default function SocialLinksAdminPage() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [iconMode, setIconMode] = useState<IconMode>('preset');
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('social_links').select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      setLinks((data as SocialLink[]) || []);
    } catch { toast.error('Error al cargar los enlaces sociales'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);

  const openCreate = () => { setForm(emptyForm()); setIconMode('preset'); setShowForm(true); };
  const openEdit = (l: SocialLink) => {
    setForm({ id: l.id, platform: l.platform, url: l.url, icon: l.icon, icon_svg: l.icon_svg || '', icon_color: (l as SocialLink & { icon_color?: string }).icon_color || '#6366f1', is_active: l.is_active, sort_order: l.sort_order });
    setIconMode(l.icon_svg?.trim() ? 'custom' : 'preset');
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setForm(emptyForm()); setIconMode('preset'); };

  const handleSave = async () => {
    if (!form.platform.trim()) { toast.error('El nombre es obligatorio'); return; }
    if (!form.url.trim()) { toast.error('La URL es obligatoria'); return; }
    setSaving(true);
    try {
      const payload = {
        platform: form.platform.trim(),
        url: form.url.trim(),
        icon: form.icon,
        icon_svg: iconMode === 'custom' ? (form.icon_svg.trim() || null) : null,
        icon_color: iconMode === 'custom' ? form.icon_color : null,
        is_active: form.is_active,
        sort_order: form.sort_order,
      };
      if (form.id) {
        const { error } = await supabase.from('social_links').update(payload).eq('id', form.id);
        if (error) throw error;
        toast.success('Enlace actualizado');
      } else {
        const { error } = await supabase.from('social_links').insert(payload);
        if (error) throw error;
        toast.success('Enlace creado');
      }
      closeForm();
      await fetchLinks();
    } catch { toast.error('Error al guardar el enlace'); }
    finally { setSaving(false); }
  };

  const [deleteTarget, setDeleteTarget] = useState<SocialLink | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const { error } = await supabase.from('social_links').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Enlace eliminado');
      await fetchLinks();
    } catch { toast.error('Error al eliminar'); }
    finally { setDeletingId(null); setDeleteTarget(null); }
  };

  const handleToggle = async (l: SocialLink) => {
    try {
      const { error } = await supabase.from('social_links').update({ is_active: !l.is_active }).eq('id', l.id);
      if (error) throw error;
      setLinks(prev => prev.map(x => x.id === l.id ? { ...x, is_active: !x.is_active } : x));
    } catch { toast.error('Error al cambiar estado'); }
  };

  // Drag and drop
  const onDragStart = (e: React.DragEvent, i: number) => { dragIndex.current = i; setIsDragging(true); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); };
  const onDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); if (dragIndex.current !== null && dragIndex.current !== i) setDragOverIndex(i); };
  const onDragLeave = (_e: React.DragEvent, i: number) => { if (dragOverIndex === i) setDragOverIndex(null); };
  const onDragEnd = () => { dragIndex.current = null; setDragOverIndex(null); setIsDragging(false); };
  const onDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const from = dragIndex.current;
    dragIndex.current = null; setDragOverIndex(null); setIsDragging(false);
    if (from === null || from === dropIndex) return;
    const reordered = [...links];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(dropIndex, 0, moved);
    const withOrder = reordered.map((l, i) => ({ ...l, sort_order: i }));
    setLinks(withOrder);
    try {
      await Promise.all(withOrder.map(l => supabase.from('social_links').update({ sort_order: l.sort_order }).eq('id', l.id)));
      toast.success('Orden actualizado');
    } catch { toast.error('Error al guardar el orden'); await fetchLinks(); }
  };

  const activeCount = links.filter(l => l.is_active).length;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Redes Sociales</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeCount} de {links.length} enlaces activos en el footer. Arrastra para reordenar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLinks} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
          <Button size="sm" onClick={openCreate} disabled={showForm}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nuevo enlace
          </Button>
        </div>
      </div>

      {/* Form panel */}
      {showForm && (
        <div className="border border-border/60 bg-card rounded-xl overflow-hidden shadow-sm">
          {/* Form header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-2.5">
              {/* Live icon preview */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: getColor(form.icon, iconMode === 'custom' ? form.icon_svg : null, form.icon_color) }}
              >
                <PlatformIcon icon={form.icon} iconSvg={iconMode === 'custom' ? form.icon_svg : null} className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">
                {form.id ? `Editar — ${form.platform || 'enlace'}` : 'Nuevo enlace social'}
              </h2>
            </div>
            <button onClick={closeForm} className="w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Plataforma <span className="text-destructive">*</span></Label>
                <Input value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} placeholder="Ej. Instagram, TikTok..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">URL <span className="text-destructive">*</span></Label>
                <Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
              </div>
            </div>

            {/* Icon section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Icono</Label>
                <div className="flex gap-1 p-0.5 bg-muted/40 rounded-md border border-border/50 ml-2">
                  {(['preset', 'custom'] as const).map(m => (
                    <button key={m} onClick={() => setIconMode(m)}
                      className={cn('text-xs font-medium px-2.5 py-1 rounded transition-all', iconMode === m ? 'bg-background text-foreground shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground')}>
                      {m === 'preset' ? 'Preset' : 'SVG personalizado'}
                    </button>
                  ))}
                </div>
              </div>

              {iconMode === 'preset' ? (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {ICON_OPTIONS.map(opt => (
                    <button key={opt} type="button"
                      onClick={() => setForm(f => ({ ...f, icon: opt }))}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all',
                        form.icon === opt ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-border/80 hover:bg-muted/30'
                      )}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: PLATFORM_COLORS[opt] }}>
                        <PlatformIcon icon={opt} className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground capitalize">{opt}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Código SVG completo</Label>
                    <Textarea
                      value={form.icon_svg}
                      onChange={e => setForm(f => ({ ...f, icon_svg: e.target.value }))}
                      placeholder={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">\n  <path d="M12 2..." />\n</svg>`}
                      className="min-h-[100px] font-mono text-xs resize-y"
                    />
                    <p className="text-xs text-muted-foreground">Pega el SVG completo <code className="text-foreground">&lt;svg&gt;...&lt;/svg&gt;</code> o solo el valor del atributo <code className="text-foreground">d</code>.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Color de fondo</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.icon_color}
                          onChange={e => setForm(f => ({ ...f, icon_color: e.target.value }))}
                          className="w-9 h-9 rounded-lg border border-border cursor-pointer p-0.5 bg-transparent"
                        />
                        <Input
                          value={form.icon_color}
                          onChange={e => setForm(f => ({ ...f, icon_color: e.target.value }))}
                          placeholder="#6366f1"
                          className="w-28 font-mono text-xs h-9"
                          maxLength={9}
                        />
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 border border-border/40"
                          style={{ backgroundColor: form.icon_color }}
                        >
                          <PlatformIcon icon={form.icon} iconSvg={form.icon_svg} className="h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Active toggle + sort */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-muted/30 border border-border/50">
              <div>
                <p className="text-sm font-medium text-foreground">Visible en el footer</p>
                <p className="text-xs text-muted-foreground/70">Los inactivos no aparecen públicamente.</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={closeForm} disabled={saving}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="min-w-[110px]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {form.id ? 'Actualizar' : 'Crear enlace'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Links list */}
      <div className="border border-border/60 rounded-xl overflow-hidden bg-card">
        {loading ? (
          <div className="divide-y divide-border/50">
            {[0,1,2].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/2" /></div>
                <Skeleton className="w-10 h-5 rounded-full" />
                <Skeleton className="w-8 h-8 rounded-lg" />
              </div>
            ))}
          </div>
        ) : links.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
              <Globe className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground mb-0.5">Sin enlaces sociales</p>
            <p className="text-xs text-muted-foreground/60 mb-4">Agrega tus redes sociales para mostrarlas en el footer.</p>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" />Agregar primero</Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-muted/20">
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground/50">Arrastra para reordenar</p>
            </div>
            <div className="divide-y divide-border/50">
              {links.map((link, index) => {
                const color = getColor(link.icon, link.icon_svg);
                const isDragged = isDragging && dragIndex.current === index;
                const isDropTarget = dragOverIndex === index;
                return (
                  <div
                    key={link.id}
                    draggable
                    onDragStart={e => onDragStart(e, index)}
                    onDragOver={e => onDragOver(e, index)}
                    onDragLeave={e => onDragLeave(e, index)}
                    onDrop={e => onDrop(e, index)}
                    onDragEnd={onDragEnd}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3.5 transition-all group select-none',
                      isDropTarget ? 'border-t-2 border-primary bg-primary/5' : 'hover:bg-muted/30',
                      isDragged && 'opacity-40',
                      !link.is_active && 'opacity-60',
                    )}
                  >
                    {/* Drag handle */}
                    <button type="button" className="cursor-grab active:cursor-grabbing text-muted-foreground/30 group-hover:text-muted-foreground transition-colors touch-none shrink-0" aria-label="Reordenar">
                      <GripVertical className="h-4 w-4" />
                    </button>

                    {/* Platform icon */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm" style={{ backgroundColor: color }}>
                      <PlatformIcon icon={link.icon} iconSvg={link.icon_svg} className="h-5 w-5" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{link.platform}</span>
                        {!link.is_active && (
                          <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 border border-border/50 px-1.5 py-0.5 rounded-full">Inactivo</span>
                        )}
                      </div>
                      <a href={link.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-muted-foreground/60 hover:text-muted-foreground truncate block max-w-[240px] mt-0.5 transition-colors"
                        onClick={e => e.stopPropagation()}>
                        <span className="flex items-center gap-1"><Link2 className="w-3 h-3 inline" />{link.url}</span>
                      </a>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={link.is_active} onCheckedChange={() => handleToggle(link)} aria-label="Activar" />
                      <a href={link.url} target="_blank" rel="noopener noreferrer"
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                        onClick={e => e.stopPropagation()} title="Abrir enlace">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button onClick={() => openEdit(link)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors" title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(link)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-colors" title="Eliminar">
                        {deletingId === link.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleDelete}
        title="Eliminar enlace social"
        description={<>Se eliminará permanentemente el enlace de <strong>{deleteTarget?.platform}</strong>. Esta acción no se puede deshacer.</>}
        loading={!!deletingId}
      />
    </div>
  );
}
