import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/backend/client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Save, GripVertical, Eye, EyeOff, Loader as Loader2, RefreshCw, Link2 } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

type FormData = Omit<SocialLink, 'id' | 'created_at'>;

const emptyForm = (): FormData => ({
  platform: '',
  url: '',
  icon: 'facebook',
  is_active: true,
  sort_order: 0,
});

// ── Icon options ──────────────────────────────────────────────────────────────
const ICON_OPTIONS = [
  'facebook',
  'instagram',
  'linkedin',
  'twitter',
  'youtube',
  'tiktok',
  'whatsapp',
  'telegram',
  'github',
] as const;

// SVG paths for the live preview. Simple, recognizable glyphs per platform.
const ICON_PATHS: Record<string, string> = {
  facebook:
    'M22 12a10 10 0 1 0-11.5 9.9v-7H8v-2.9h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6v1.9h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z',
  instagram:
    'M12 2c2.7 0 3 0 4.1.1 1 0 1.7.2 2.3.5.6.2 1.5.6 2 1.1.5.5.9 1.4 1.1 2 .3.6.5 1.3.5 2.3.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c0 1-.2 1.7-.5 2.3-.2.6-.6 1.5-1.1 2-.5.5-1.4.9-2 1.1-.6.3-1.3.5-2.3.5-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-1 0-1.7-.2-2.3-.5-.6-.2-1.5-.6-2-1.1-.5-.5-.9-1.4-1.1-2-.3-.6-.5-1.3-.5-2.3C2 15 2 14.7 2 12s0-3 .1-4.1c0-1 .2-1.7.5-2.3.2-.6.6-1.5 1.1-2 .5-.5 1.4-.9 2-1.1.6-.3 1.3-.5 2.3-.5C9 2 9.3 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.3a3.3 3.3 0 1 1 0-6.6 3.3 3.3 0 0 1 0 6.6zm5.2-8.6a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z',
  linkedin:
    'M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V21h-4v-5.3c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V21H9z',
  twitter:
    'M18.9 1.9h3.7l-8 9.1 9.4 12.4h-7.4l-5.8-7.6-6.6 7.6H.5l8.5-9.7L0 1.9h7.6l5.2 6.9zM17.6 21h2L6.5 4H4.4z',
  youtube:
    'M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.8-1.8C19.3 5 12 5 12 5s-7.3 0-8.8.5A2.5 2.5 0 0 0 1.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a2.5 2.5 0 0 0 1.8 1.8C4.7 19 12 19 12 19s7.3 0 8.8-.5a2.5 2.5 0 0 0 1.8-1.8C23 15.2 23 12 23 12zM9.8 15.3V8.7l5.7 3.3z',
  tiktok:
    'M16.6 5.8a4.8 4.8 0 0 1-1-2.8h-3.4v13.6c0 1.4-1.1 2.5-2.5 2.5a2.5 2.5 0 0 1-2.5-2.5c0-1.4 1.1-2.5 2.5-2.5.3 0 .5 0 .8.1v-3.4a6 6 0 0 0-.8-.1 5.9 5.9 0 1 0 5.9 5.9V9.3a8 8 0 0 0 4.8 1.6V7.5a4.8 4.8 0 0 1-3.8-1.7z',
  whatsapp:
    'M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.9.9-2.8-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.7.9-.1.1-.3.2-.5.1a6.5 6.5 0 0 1-1.9-1.2 7.3 7.3 0 0 1-1.3-1.7c-.1-.2 0-.4.1-.5l.4-.5.2-.4v-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3c-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1z',
  telegram:
    'M21.9 4.3 18.6 20a1 1 0 0 1-1.5.7l-4-3-2 2c-.3.3-.6.4-1 .4l.3-4.2 7.8-7c.3-.3-.1-.5-.5-.2L7.3 14l-3.8-1.2c-.8-.2-.8-.8.2-1.2L20.6 3c.7-.3 1.4.2 1.3 1.3z',
  github:
    'M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.1-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.4-2.2-.3-4.5-1.1-4.5-5a3.9 3.9 0 0 1 1-2.7c-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6a3.9 3.9 0 0 1 1 2.7c0 3.9-2.3 4.7-4.5 5 .3.3.6.9.6 1.8v2.6c0 .3.2.6.7.5A10 10 0 0 0 12 2z',
};

function PlatformIcon({
  name,
  className = 'w-5 h-5',
}: {
  name: string;
  className?: string;
}) {
  const path = ICON_PATHS[name] || ICON_PATHS.facebook;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SocialLinksAdminPage() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // id being saved (or 'new')
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('social_links')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setLinks((data as SocialLink[]) || []);
    } catch (err: any) {
      toast.error('Error al cargar los enlaces: ' + (err?.message || 'desconocido'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLinks();
    setRefreshing(false);
  };

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm(emptyForm());
    setShowForm(false);
    setEditingId(null);
  };

  const startAdd = () => {
    setForm({ ...emptyForm(), sort_order: links.length });
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (link: SocialLink) => {
    setForm({
      platform: link.platform,
      url: link.url,
      icon: link.icon,
      is_active: link.is_active,
      sort_order: link.sort_order,
    });
    setEditingId(link.id);
    setShowForm(true);
  };

  // ── Save (create or update) ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.platform.trim()) {
      toast.error('El nombre de la plataforma es obligatorio');
      return;
    }
    if (!form.url.trim()) {
      toast.error('La URL es obligatoria');
      return;
    }

    const payload = {
      platform: form.platform.trim(),
      url: form.url.trim(),
      icon: form.icon,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };

    setSaving(editingId || 'new');
    try {
      if (editingId) {
        const { error } = await supabase
          .from('social_links')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Enlace actualizado correctamente');
      } else {
        const { error } = await supabase.from('social_links').insert(payload);
        if (error) throw error;
        toast.success('Enlace creado correctamente');
      }
      resetForm();
      await fetchLinks();
    } catch (err: any) {
      toast.error('Error al guardar: ' + (err?.message || 'desconocido'));
    } finally {
      setSaving(null);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este enlace social? Esta acción no se puede deshacer.')) return;
    try {
      const { error } = await supabase.from('social_links').delete().eq('id', id);
      if (error) throw error;
      toast.success('Enlace eliminado');
      if (editingId === id) resetForm();
      await fetchLinks();
    } catch (err: any) {
      toast.error('Error al eliminar: ' + (err?.message || 'desconocido'));
    }
  };

  // ── Toggle active ────────────────────────────────────────────────────────────
  const handleToggleActive = async (link: SocialLink) => {
    const next = !link.is_active;
    // Optimistic update
    setLinks(prev => prev.map(l => (l.id === link.id ? { ...l, is_active: next } : l)));
    try {
      const { error } = await supabase
        .from('social_links')
        .update({ is_active: next })
        .eq('id', link.id);
      if (error) throw error;
      toast.success(next ? 'Enlace activado' : 'Enlace desactivado');
    } catch (err: any) {
      // Revert on failure
      setLinks(prev => prev.map(l => (l.id === link.id ? { ...l, is_active: !next } : l)));
      toast.error('Error al cambiar el estado: ' + (err?.message || 'desconocido'));
    }
  };

  // ── Inline edit (sort_order) ──────────────────────────────────────────────────
  const handleInlineChange = (id: string, field: 'platform' | 'url' | 'sort_order', value: string) => {
    setLinks(prev =>
      prev.map(l =>
        l.id === id
          ? { ...l, [field]: field === 'sort_order' ? Number(value) || 0 : value }
          : l,
      ),
    );
  };

  const handleInlineSave = async (link: SocialLink) => {
    setSaving(link.id);
    try {
      const { error } = await supabase
        .from('social_links')
        .update({
          platform: link.platform,
          url: link.url,
          sort_order: link.sort_order,
        })
        .eq('id', link.id);
      if (error) throw error;
      toast.success('Cambios guardados');
      await fetchLinks();
    } catch (err: any) {
      toast.error('Error al guardar: ' + (err?.message || 'desconocido'));
    } finally {
      setSaving(null);
    }
  };

  // ── Move (reorder) ───────────────────────────────────────────────────────────
  const handleMove = async (link: SocialLink, dir: -1 | 1) => {
    const index = links.findIndex(l => l.id === link.id);
    const target = index + dir;
    if (target < 0 || target >= links.length) return;

    const a = links[index];
    const b = links[target];
    const newOrderA = b.sort_order;
    const newOrderB = a.sort_order;

    // Optimistic reorder
    setLinks(prev =>
      prev
        .map(l => {
          if (l.id === a.id) return { ...l, sort_order: newOrderA };
          if (l.id === b.id) return { ...l, sort_order: newOrderB };
          return l;
        })
        .sort((x, y) => x.sort_order - y.sort_order),
    );

    try {
      const updates = [
        supabase.from('social_links').update({ sort_order: newOrderA }).eq('id', a.id),
        supabase.from('social_links').update({ sort_order: newOrderB }).eq('id', b.id),
      ];
      const results = await Promise.all(updates);
      for (const r of results) if (r.error) throw r.error;
      toast.success('Orden actualizado');
    } catch (err: any) {
      toast.error('Error al reordenar: ' + (err?.message || 'desconocido'));
      await fetchLinks();
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Link2 className="w-6 h-6 text-primary" />
            Enlaces Sociales
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona los enlaces a redes sociales que aparecen en el pie de página.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button size="sm" onClick={startAdd} disabled={showForm && !editingId}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo enlace
          </Button>
        </div>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {editingId ? (
                <><Save className="w-5 h-5" /> Editar enlace</>
              ) : (
                <><Plus className="w-5 h-5" /> Nuevo enlace</>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Platform */}
              <div className="space-y-2">
                <Label htmlFor="platform">Plataforma</Label>
                <Input
                  id="platform"
                  placeholder="Ej. Facebook"
                  value={form.platform}
                  onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                />
              </div>

              {/* URL */}
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  placeholder="https://facebook.com/tu-pagina"
                  value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                />
              </div>

              {/* Icon */}
              <div className="space-y-2">
                <Label>Icono</Label>
                <Select
                  value={form.icon}
                  onValueChange={v => setForm(f => ({ ...f, icon: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un icono" />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>
                        <div className="flex items-center gap-2 capitalize">
                          <PlatformIcon name={opt} className="w-4 h-4" />
                          {opt}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort order */}
              <div className="space-y-2">
                <Label htmlFor="sort_order">Orden</Label>
                <Input
                  id="sort_order"
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={e =>
                    setForm(f => ({ ...f, sort_order: Number(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>

            {/* Active + Preview */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t">
              <div className="flex items-center gap-3">
                <Switch
                  id="is_active"
                  checked={form.is_active}
                  onCheckedChange={c => setForm(f => ({ ...f, is_active: c }))}
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  {form.is_active ? 'Activo' : 'Inactivo'}
                </Label>
              </div>

              {/* Live preview */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Vista previa:</span>
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                    form.is_active
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-muted border-border text-muted-foreground'
                  }`}
                >
                  <PlatformIcon name={form.icon} className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {form.platform || 'Plataforma'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={resetForm} disabled={!!saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={!!saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {editingId ? 'Guardar cambios' : 'Crear enlace'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Enlaces configurados</span>
            <span className="text-sm font-normal text-muted-foreground">
              {links.length} {links.length === 1 ? 'enlace' : 'enlaces'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 mr-2 animate-spin" />
              Cargando enlaces...
            </div>
          ) : links.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Link2 className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                No hay enlaces sociales configurados.
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={startAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Crear el primer enlace
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {links.map((link, idx) => (
                <div
                  key={link.id}
                  className={`flex flex-col lg:flex-row lg:items-center gap-3 p-3 rounded-lg border transition-colors ${
                    link.is_active
                      ? 'bg-card hover:bg-accent/30'
                      : 'bg-muted/30 opacity-70 hover:opacity-100'
                  }`}
                >
                  {/* Drag handle + reorder */}
                  <div className="flex items-center gap-1">
                    <GripVertical className="w-4 h-4 text-muted-foreground/40 cursor-grab" />
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => handleMove(link, -1)}
                        disabled={idx === 0}
                        title="Subir"
                      >
                        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => handleMove(link, 1)}
                        disabled={idx === links.length - 1}
                        title="Bajar"
                      >
                        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                      </Button>
                    </div>
                  </div>

                  {/* Icon */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                    <PlatformIcon name={link.icon} className="w-5 h-5" />
                  </div>

                  {/* Platform */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <Input
                      value={link.platform}
                      onChange={e => handleInlineChange(link.id, 'platform', e.target.value)}
                      className="h-8 font-medium"
                      placeholder="Plataforma"
                    />
                    <Input
                      value={link.url}
                      onChange={e => handleInlineChange(link.id, 'url', e.target.value)}
                      className="h-8 text-xs text-muted-foreground"
                      placeholder="https://..."
                    />
                  </div>

                  {/* Sort order */}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Orden</Label>
                    <Input
                      type="number"
                      value={link.sort_order}
                      onChange={e => handleInlineChange(link.id, 'sort_order', e.target.value)}
                      className="h-8 w-16"
                    />
                  </div>

                  {/* Active toggle */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={link.is_active}
                      onCheckedChange={() => handleToggleActive(link)}
                    />
                    <span className="text-xs text-muted-foreground w-12">
                      {link.is_active ? (
                        <span className="flex items-center gap-1 text-emerald-600"><Eye className="w-3 h-3" /> Activo</span>
                      ) : (
                        <span className="flex items-center gap-1"><EyeOff className="w-3 h-3" /> Oculto</span>
                      )}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 lg:ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleInlineSave(link)}
                      disabled={saving === link.id}
                      title="Guardar cambios"
                    >
                      {saving === link.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startEdit(link)}
                      title="Editar"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(link.id)}
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
