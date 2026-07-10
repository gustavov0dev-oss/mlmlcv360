import { useState, useEffect, useCallback, useRef } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, Save, GripVertical, Eye, EyeOff, Loader as Loader2, RefreshCw, Link2, X } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
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
  is_active: boolean;
  sort_order: number;
}

const emptyForm = (): FormState => ({
  id: null,
  platform: '',
  url: '',
  icon: 'facebook',
  icon_svg: '',
  is_active: true,
  sort_order: 0,
});

// ── Preset icons ─────────────────────────────────────────────────────────────
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
];

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

// ── PlatformIcon ────────────────────────────────────────────────────────────
function PlatformIcon({
  icon,
  iconSvg,
  className = 'h-5 w-5',
}: {
  icon: string;
  iconSvg?: string | null;
  className?: string;
}) {
  const path =
    iconSvg && iconSvg.trim() !== ''
      ? iconSvg
      : ICON_PATHS[icon] || ICON_PATHS.facebook;
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

// ── Component ───────────────────────────────────────────────────────────────
export default function SocialLinksAdminPage() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [iconMode, setIconMode] = useState<IconMode>('preset');

  // Drag-and-drop state
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('social_links')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setLinks((data as SocialLink[]) || []);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar los enlaces sociales');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  // ── Form helpers ───────────────────────────────────────────────────────────
  const openCreateForm = () => {
    setForm(emptyForm());
    setIconMode('preset');
    setShowForm(true);
  };

  const openEditForm = (link: SocialLink) => {
    setForm({
      id: link.id,
      platform: link.platform,
      url: link.url,
      icon: link.icon,
      icon_svg: link.icon_svg || '',
      is_active: link.is_active,
      sort_order: link.sort_order,
    });
    setIconMode(link.icon_svg && link.icon_svg.trim() !== '' ? 'custom' : 'preset');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(emptyForm());
    setIconMode('preset');
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.platform.trim()) {
      toast.error('El nombre de la plataforma es obligatorio');
      return;
    }
    if (!form.url.trim()) {
      toast.error('La URL es obligatoria');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        platform: form.platform.trim(),
        url: form.url.trim(),
        icon: form.icon,
        icon_svg: form.icon_svg.trim() === '' ? null : form.icon_svg.trim(),
        is_active: form.is_active,
        sort_order: form.sort_order,
      };

      if (form.id) {
        const { error } = await supabase
          .from('social_links')
          .update(payload)
          .eq('id', form.id);
        if (error) throw error;
        toast.success('Enlace social actualizado');
      } else {
        const { error } = await supabase
          .from('social_links')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        toast.success('Enlace social creado');
      }

      closeForm();
      await fetchLinks();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar el enlace social');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (link: SocialLink) => {
    if (!confirm(`¿Eliminar el enlace de "${link.platform}"?`)) return;
    try {
      const { error } = await supabase
        .from('social_links')
        .delete()
        .eq('id', link.id);
      if (error) throw error;
      toast.success('Enlace eliminado');
      await fetchLinks();
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar el enlace');
    }
  };

  // ── Toggle active ───────────────────────────────────────────────────────────
  const handleToggleActive = async (link: SocialLink) => {
    try {
      const { error } = await supabase
        .from('social_links')
        .update({ is_active: !link.is_active })
        .eq('id', link.id);
      if (error) throw error;
      setLinks((prev) =>
        prev.map((l) =>
          l.id === link.id ? { ...l, is_active: !l.is_active } : l
        )
      );
      toast.success(
        !link.is_active ? 'Enlace activado' : 'Enlace desactivado'
      );
    } catch (err) {
      console.error(err);
      toast.error('Error al cambiar el estado');
    }
  };

  // ── Drag and drop ───────────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragIndex.current = index;
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    // necessary for Firefox to initiate drag
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIndex.current !== null && dragIndex.current !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (_e: React.DragEvent, index: number) => {
    // Only clear if leaving the row entirely (not entering a child)
    if (dragOverIndex === index) {
      setDragOverIndex(null);
    }
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
    setDragOverIndex(null);
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const fromIndex = dragIndex.current;
    dragIndex.current = null;
    setDragOverIndex(null);
    setIsDragging(false);

    if (fromIndex === null || fromIndex === dropIndex) return;

    // Reorder locally
    const reordered = [...links];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    // Reassign sort_order
    const withOrder = reordered.map((l, i) => ({ ...l, sort_order: i }));
    setLinks(withOrder);

    // Persist new sort_order for all items
    try {
      const updates = withOrder.map((l) =>
        supabase
          .from('social_links')
          .update({ sort_order: l.sort_order })
          .eq('id', l.id)
      );
      await Promise.all(updates);
      toast.success('Orden actualizado');
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar el nuevo orden');
      await fetchLinks();
    }
  };

  // ── Derived preview values ──────────────────────────────────────────────────
  const previewIcon = form.icon;
  const previewIconSvg = iconMode === 'custom' ? form.icon_svg : null;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Enlaces Sociales
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona los enlaces a redes sociales que se muestran en el pie de
            página. Arrastra para reordenar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLinks}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
          <Button size="sm" onClick={openCreateForm} disabled={showForm}>
            <Plus className="h-4 w-4" />
            <span>Nuevo enlace</span>
          </Button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base font-semibold text-foreground">
              {form.id ? 'Editar enlace' : 'Nuevo enlace'}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={closeForm}
              type="button"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Platform name */}
            <div className="space-y-2">
              <Label htmlFor="platform" className="text-foreground">
                Plataforma
              </Label>
              <Input
                id="platform"
                value={form.platform}
                onChange={(e) =>
                  setForm((f) => ({ ...f, platform: e.target.value }))
                }
                placeholder="Ej. Facebook, Instagram..."
                className="bg-background"
              />
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="url" className="text-foreground">
                URL
              </Label>
              <Input
                id="url"
                value={form.url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, url: e.target.value }))
                }
                placeholder="https://..."
                className="bg-background"
              />
            </div>

            {/* Icon mode toggle */}
            <div className="space-y-2">
              <Label className="text-foreground">Icono</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={iconMode === 'preset' ? 'default' : 'outline'}
                  onClick={() => setIconMode('preset')}
                >
                  Preset
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={iconMode === 'custom' ? 'default' : 'outline'}
                  onClick={() => setIconMode('custom')}
                >
                  Personalizado (SVG)
                </Button>
              </div>
            </div>

            {/* Icon field - conditional */}
            {iconMode === 'preset' ? (
              <div className="space-y-2">
                <Label className="text-foreground">Selecciona un icono</Label>
                <Select
                  value={form.icon}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, icon: value }))
                  }
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecciona una plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt} className="capitalize">
                        <span className="flex items-center gap-2">
                          <PlatformIcon
                            icon={opt}
                            className="h-4 w-4 text-muted-foreground"
                          />
                          <span className="capitalize">{opt}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="icon_svg" className="text-foreground">
                  Ruta SVG (atributo <code className="text-xs">d</code>)
                </Label>
                <Textarea
                  id="icon_svg"
                  value={form.icon_svg}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, icon_svg: e.target.value }))
                  }
                  placeholder="Pega aquí el valor del atributo d del path de tu SVG..."
                  className="min-h-[100px] resize-y bg-background font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Pega solo el contenido del atributo{' '}
                  <code className="text-foreground">d</code>. Cuando este campo
                  no esté vacío, sobrescribirá el icono preset.
                </p>
              </div>
            )}

            {/* Active toggle */}
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="active" className="text-foreground">
                  Activo
                </Label>
                <p className="text-xs text-muted-foreground">
                  Si está inactivo, no se mostrará en el pie de página.
                </p>
              </div>
              <Switch
                id="active"
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, is_active: checked }))
                }
              />
            </div>

            {/* Live preview */}
            <div className="space-y-2">
              <Label className="text-foreground">Vista previa</Label>
              <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <PlatformIcon
                    icon={previewIcon}
                    iconSvg={previewIconSvg}
                    className="h-5 w-5"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {form.platform || 'Nombre de la plataforma'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {form.url || 'https://...'}
                  </p>
                </div>
                {!form.is_active && (
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    Inactivo
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={closeForm}
                disabled={saving}
                type="button"
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} type="button">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>Guardar</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <Card className="border-border bg-card">
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-3 text-sm text-muted-foreground">
              Cargando enlaces...
            </span>
          </CardContent>
        </Card>
      ) : links.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Link2 className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                No hay enlaces sociales
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Crea tu primer enlace social para mostrarlo en el pie de página.
              </p>
            </div>
            <Button size="sm" onClick={openCreateForm}>
              <Plus className="h-4 w-4" />
              <span>Crear enlace</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {links.map((link, index) => {
            const isDragged = isDragging && dragIndex.current === index;
            const isDropTarget = dragOverIndex === index;
            return (
              <Card
                key={link.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={(e) => handleDragLeave(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`group relative border-border bg-card transition-colors ${
                  isDragged ? 'opacity-50' : ''
                } ${isDropTarget ? 'border-t-2 border-t-primary' : ''}`}
              >
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  {/* Drag handle */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
                      aria-label="Arrastrar para reordenar"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Icon preview */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <PlatformIcon
                      icon={link.icon}
                      iconSvg={link.icon_svg}
                      className="h-5 w-5"
                    />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {link.platform}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          link.is_active
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {link.is_active ? (
                          <>
                            <Eye className="h-3 w-3" />
                            Activo
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3" />
                            Inactivo
                          </>
                        )}
                      </span>
                    </div>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 block truncate text-xs text-muted-foreground hover:text-primary hover:underline"
                    >
                      {link.url}
                    </a>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={link.is_active}
                      onCheckedChange={() => handleToggleActive(link)}
                      aria-label="Activar/desactivar"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditForm(link)}
                      aria-label="Editar"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleDelete(link)}
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
