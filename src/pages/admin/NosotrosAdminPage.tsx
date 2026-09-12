import { LoadingRegion, StableRegion } from '@/components/ui/loading-region';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useDatabase, useStorage } from '@/lib/backend';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import {
  Plus, Trash2, Pencil, X, Save, RefreshCw, GripVertical,
  ToggleLeft, ToggleRight, Upload, Link as LinkIcon,
  Users, Clock, Server, Target, FileText, Lock, Image as ImageIcon,
} from 'lucide-react';

import { useConfig } from '@/store/configStore';
import { Link } from '@/lib/router';
import { supabase } from '@/lib/backend/client';
import { aboutFields, resolveAboutConfig, safeAboutUrl, reorderAboutItems, type AboutItem, type AboutTab as Tab, type Founder, type TimelineItem, type InfraItem, type ValueItem, type AboutField } from '@/lib/aboutContent';
import { ABOUT_ICON_OPTIONS, AboutIcon } from '@/components/landing/AboutIcon';

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'hero', label: 'Hero', icon: FileText },
  { id: 'values', label: 'Valores', icon: Target },
  { id: 'timeline', label: 'Historia', icon: Clock },
  { id: 'infrastructure', label: 'Infraestructura', icon: Server },
  { id: 'founders', label: 'Fundadores', icon: Users },
  { id: 'legal', label: 'Información legal', icon: FileText },
];

// ── Image Input (URL or file upload, same pattern as testimonials) ──────────────
function ImageInput({ value, onChange, aspect = 'square' }: { value: string; onChange: (v: string) => void; aspect?: 'square' | 'portrait' }) {
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
      const path = `about/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const result = await storage.upload('logos', path, file, { contentType: file.type, upsert: true });
      if (result.success && result.url) { onChange(result.url); toast.success('Imagen subida'); }
      else throw new Error(result.error || 'Error al subir');
    } catch (err: any) {
      toast.error('Error al subir: ' + (err?.message || 'desconocido'));
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
            {m === 'url' ? <><LinkIcon className="w-3.5 h-3.5" /> URL</> : <><Upload className="w-3.5 h-3.5" /> Archivo</>}
          </button>
        ))}
      </div>
      {mode === 'url' ? (
        <input type="url" value={value} onChange={e => onChange(e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors" />
      ) : (
        <label className={cn('flex items-center justify-center gap-2 w-full h-10 border border-dashed rounded-lg cursor-pointer text-sm transition-colors',
          uploading ? 'opacity-50 pointer-events-none border-border' : 'border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary')}>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleFile} disabled={uploading} />
          {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Subiendo...' : 'Seleccionar imagen (max 5 MB)'}
        </label>
      )}
      {value && (
        <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg border border-border">
          <img src={value} alt="preview"
            className={cn('object-cover border border-border flex-shrink-0', aspect === 'portrait' ? 'w-10 h-12' : 'w-10 h-10 rounded-lg')}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span className="text-xs text-muted-foreground truncate flex-1">{value}</span>
          <button type="button" onClick={() => onChange('')} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Icon Picker ──────────────────────────────────────────────────────────────────
function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ABOUT_ICON_OPTIONS.map(icon => (
        <button key={icon} type="button" onClick={() => onChange(icon)}
          className={cn('px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border',
            value === icon ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40')}>
          <AboutIcon name={icon} className="w-3.5 h-3.5 inline-block mr-1.5" />{icon}
        </button>
      ))}
    </div>
  );
}

// ── Toggle Switch ────────────────────────────────────────────────────────────────
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label="Visible en la página" onClick={() => onChange(!checked)}
      className={cn('w-11 h-6 rounded-full relative transition-colors shrink-0', checked ? 'bg-primary' : 'bg-muted-foreground/30')}>
      <div className={cn('w-4 h-4 bg-white rounded-full absolute top-1 transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  );
}

// ── Drag handle row wrapper ──────────────────────────────────────────────────────
function DragHandle() {
  return (
    <div className="flex-shrink-0 pt-1 text-muted-foreground/40 cursor-grab active:cursor-grabbing touch-none">
      <GripVertical className="w-4 h-4" />
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────────
export default function NosotrosAdminPage() {
  const { user } = useAuthStore();
  const database = useDatabase();
  const { company, refresh } = useConfig();
  const fields = aboutFields(company.company_name || 'MLM 360');
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>('hero');
  const [loading, setLoading] = useState(true);

  // Hero config
  const dirtyFields = useRef(new Set<string>());
  const [heroConfig, setHeroConfig] = useState<Record<string, string>>({});
  const [savingHero, setSavingHero] = useState(false);

  // Data arrays
  const [founders, setFounders] = useState<Founder[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [infra, setInfra] = useState<InfraItem[]>([]);
  const [values, setValues] = useState<ValueItem[]>([]);

  // Modal state
  const [editingFounder, setEditingFounder] = useState<Founder | null>(null);
  const [editingTimeline, setEditingTimeline] = useState<TimelineItem | null>(null);
  const [editingInfra, setEditingInfra] = useState<InfraItem | null>(null);
  const [editingValue, setEditingValue] = useState<ValueItem | null>(null);
  const [showFounderForm, setShowFounderForm] = useState(false);
  const [showTimelineForm, setShowTimelineForm] = useState(false);
  const [showInfraForm, setShowInfraForm] = useState(false);
  const [showValueForm, setShowValueForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; kind: 'founder' | 'timeline' | 'infra' | 'value' } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Drag state (shared)
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const fetchAll = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setLoadError(false);
    try {
      const configKeys = Object.values(aboutFields()).flat().map(field => field.key);
      const [heroRes, fRes, tRes, iRes, vRes] = await Promise.all([
        database.select<{ key: string; value: string }>('system_config', { filter: { key: [...configKeys, 'company_name'] } }),
        database.select<Founder>('about_founders', { order: [{ column: 'sort_order' }, { column: 'id' }] }),
        database.select<TimelineItem>('about_timeline', { order: [{ column: 'sort_order' }, { column: 'id' }] }),
        database.select<InfraItem>('about_infrastructure', { order: [{ column: 'sort_order' }, { column: 'id' }] }),
        database.select<ValueItem>('about_values', { order: [{ column: 'sort_order' }, { column: 'id' }] }),
      ]);
      if ([heroRes, fRes, tRes, iRes, vRes].some(result => result.error || !Array.isArray(result.data))) throw new Error('load');
      const heroMap = Object.fromEntries((heroRes.data as { key: string; value: string }[]).map(row => [row.key, row.value]));
      setHeroConfig(previous => ({ ...resolveAboutConfig(heroMap), ...Object.fromEntries([...dirtyFields.current].map(key => [key, previous[key]])) }));
      setFounders(fRes.data as Founder[]);
      setTimeline(tRes.data as TimelineItem[]);
      setInfra(iRes.data as InfraItem[]);
      setValues(vRes.data as ValueItem[]);
    } catch {
      setLoadError(true);
      toast.error('No se pudo cargar el contenido. Vuelve a intentarlo.');
    } finally {
      setLoading(false);
    }
  }, [database, isAdmin]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const saveText = async () => {
    if (savingHero || busy || loading || loadError || !isAdmin) return;
    const currentFields = fields[tab];
    if (tab === 'hero') {
      for (const button of ['primary', 'secondary']) {
        if (heroConfig[`about_${button}_label`]?.trim() && !safeAboutUrl(heroConfig[`about_${button}_url`] || '')) {
          toast.error('Revisa los enlaces de los botones: usa una ruta / o una dirección http(s).');
          return;
        }
      }
    }
    setSavingHero(true);
    try {
      // A single request saves each section atomically; no partial success messages.
      const { data, error } = await supabase.from('system_config').upsert(currentFields.map(({ key }) => ({
        key, value: heroConfig[key] ?? '', updated_at: new Date().toISOString(),
      })), { onConflict: 'key' }).select('key');
      if (error || data?.length !== currentFields.length) throw new Error(error?.message || 'save');
      currentFields.forEach(field => dirtyFields.current.delete(field.key));
      await refresh();
      toast.success('Textos guardados. Ya están disponibles en Nosotros.');
    } catch {
      toast.error('No se pudieron guardar los textos. Tus cambios siguen en el formulario.');
    } finally {
      setSavingHero(false);
    }
  };

  type Kind = 'founder' | 'timeline' | 'infra' | 'value';
  const tableFor = (kind: Kind) => ({ founder: 'about_founders', timeline: 'about_timeline', infra: 'about_infrastructure', value: 'about_values' })[kind];

  const handleDrop = async (kind: Kind, targetId: string) => {
    if (busy || !dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const list: AboutItem[] = kind === 'founder' ? founders : kind === 'timeline' ? timeline : kind === 'infra' ? infra : values;
    const updated = reorderAboutItems(list, dragId, targetId);
    setDragId(null);
    setDragOverId(null);
    if (updated === list) return;
    setBusy(true);
    try {
      const results = await Promise.all(updated.map(item => database.update(tableFor(kind), item.id, { sort_order: item.sort_order })));
      if (results.some(result => result.error || !result.data)) throw new Error('reorder');
      toast.success('Orden guardado');
    } catch {
      toast.error('No se pudo guardar todo el orden. Se recargará el orden disponible.');
    } finally {
      await fetchAll();
      setBusy(false);
    }
  };

  const toggleActive = async (kind: Kind, item: AboutItem) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await database.update(tableFor(kind), item.id, { is_active: !item.is_active, updated_at: new Date().toISOString() });
      if (result.error || !result.data) throw new Error(result.error || 'update');
      toast.success(item.is_active ? 'Oculto en la página' : 'Visible en la página');
      await fetchAll();
    } catch {
      toast.error('No se pudo cambiar la visibilidad. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deletingId) return;
    setDeletingId(deleteTarget.id);
    try {
      const { data, error } = await supabase.from(tableFor(deleteTarget.kind)).delete().eq('id', deleteTarget.id).select('id').single();
      if (error || !data) throw new Error(error?.message || 'delete');
      toast.success('Eliminado correctamente');
      setDeleteTarget(null);
      await fetchAll();
    } catch {
      toast.error('No se pudo eliminar. Inténtalo de nuevo.');
    } finally {
      setDeletingId(null);
    }
  };

  const saveItem = async <T extends AboutItem,>(kind: Kind, data: Partial<T>, list: T[], close: () => void) => {
    if (saving) return;
    setSaving(true);
    try {
      const { id, ...fields } = data;
      const payload = { ...fields, updated_at: new Date().toISOString() };
      const result = id
        ? await database.update(tableFor(kind), id, payload)
        : await database.insert(tableFor(kind), { ...payload, sort_order: Math.max(-1, ...list.map(item => item.sort_order)) + 1 });
      if (result.error || !result.data) throw new Error(result.error || 'save');
      toast.success(id ? 'Cambios guardados' : 'Contenido creado');
      close();
      await fetchAll();
    } catch {
      toast.error('No se pudo guardar. Tus cambios siguen en el formulario.');
    } finally {
      setSaving(false);
    }
  };
  const saveFounder = (data: Partial<Founder>) => saveItem('founder', data, founders, () => { setShowFounderForm(false); setEditingFounder(null); });
  const saveTimeline = (data: Partial<TimelineItem>) => saveItem('timeline', data, timeline, () => { setShowTimelineForm(false); setEditingTimeline(null); });
  const saveInfra = (data: Partial<InfraItem>) => saveItem('infra', data, infra, () => { setShowInfraForm(false); setEditingInfra(null); });
  const saveValue = (data: Partial<ValueItem>) => saveItem('value', data, values, () => { setShowValueForm(false); setEditingValue(null); });

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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pagina Nosotros</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Administra todo el contenido de la pagina "Nosotros" — textos, botones, valores, historia, infraestructura, fundadores y datos legales.</p>
        </div>
        <button disabled={loading || saving || savingHero || busy} onClick={fetchAll} className="flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-sm hover:bg-muted transition-colors shrink-0">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Actualizar
        </button>
      </div>

      <Link to="/nosotros" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">Ver página Nosotros</Link>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-full overflow-x-auto scrollbar-hide">
        {TABS.map(t => (
          <button key={t.id} disabled={savingHero || saving || busy} onClick={() => setTab(t.id)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0',
              tab === t.id ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground")}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {loadError && <div role="alert" className="border border-destructive/30 rounded-xl p-4 text-sm text-destructive">No se pudo cargar el contenido. Pulsa Actualizar para volver a intentarlo.</div>}
      {!loadError && fields[tab].length > 0 && <AboutTextEditor fields={fields[tab]} values={heroConfig} onChange={(key, value) => { dirtyFields.current.add(key); setHeroConfig(previous => ({ ...previous, [key]: value })); }} onSave={saveText} loading={loading} saving={savingHero || busy} />}

      {/* ── VALUES TAB ───────────────────────────────────────────────────────────── */}
      {!loadError && tab === 'values' && (
        <StableRegion className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{values.filter(v => v.is_active).length} activos · {values.length} total</p>
            <button aria-label="Editar contenido" disabled={busy || loading || saving || savingHero} onClick={() => { setEditingValue(null); setShowValueForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> Nuevo valor
            </button>
          </div>

          {loading ? <LoadingRegion className="min-h-[24rem]" /> : values.length === 0 ? (
            <EmptyState icon={Target} label="Sin valores" hint="Agrega mision, vision o valores." onAdd={() => { setEditingValue(null); setShowValueForm(true); }} />
          ) : (
            <div className="border border-border/60 rounded-xl overflow-hidden bg-card">
              <ReorderHint />
              <div className="divide-y divide-border/50">
                {values.map(v => (
                  <div key={v.id} draggable={!busy && !savingHero} onDragEnd={() => { setDragId(null); setDragOverId(null); }} onDragStart={() => setDragId(v.id)}
                    onDragOver={e => { e.preventDefault(); if (v.id !== dragId) setDragOverId(v.id); }}
                    onDrop={() => handleDrop('value', v.id)}
                    className={cn('flex items-center gap-3 px-4 py-3.5 transition-all select-none',
                      dragOverId === v.id ? 'border-t-2 border-primary bg-primary/5' : 'hover:bg-muted/30',
                      !v.is_active && 'opacity-60')}>
                    <DragHandle />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground text-sm">{v.label}</span>
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{v.icon}</span>
                        {!v.is_active && <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">Inactivo</span>}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{v.text}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button aria-label="Cambiar visibilidad" disabled={busy || loading || saving || savingHero} onClick={() => toggleActive('value', v)} className={[cn('p-2 rounded-lg transition-colors', v.is_active ? 'text-green-500 hover:bg-emerald-500/10' : 'text-muted-foreground hover:bg-muted'), 'dashboard-action'].filter(Boolean).join(' ')} title={v.is_active ? 'Desactivar' : 'Activar'}>
                        {v.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button aria-label="Editar contenido" disabled={busy || loading || saving || savingHero} onClick={() => { setEditingValue(v); setShowValueForm(true); }} className={["p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-primary transition-colors", "dashboard-action"].filter(Boolean).join(' ')} title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button aria-label="Eliminar contenido" disabled={busy || loading || saving || savingHero} onClick={() => setDeleteTarget({ id: v.id, name: v.label, kind: 'value' })} className={["p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive transition-colors", "dashboard-action dashboard-action-danger"].filter(Boolean).join(' ')} title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </StableRegion>
      )}

      {/* ── TIMELINE TAB ──────────────────────────────────────────────────────────── */}
      {!loadError && tab === 'timeline' && (
        <StableRegion className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{timeline.filter(t => t.is_active).length} activos · {timeline.length} total</p>
            <button aria-label="Editar contenido" disabled={busy || loading || saving || savingHero} onClick={() => { setEditingTimeline(null); setShowTimelineForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> Nuevo hito
            </button>
          </div>

          {loading ? <LoadingRegion className="min-h-[24rem]" /> : timeline.length === 0 ? (
            <EmptyState icon={Clock} label="Sin hitos" hint="Agrega hitos de la historia de tu empresa." onAdd={() => { setEditingTimeline(null); setShowTimelineForm(true); }} />
          ) : (
            <div className="border border-border/60 rounded-xl overflow-hidden bg-card">
              <ReorderHint />
              <div className="divide-y divide-border/50">
                {timeline.map(t => (
                  <div key={t.id} draggable={!busy && !savingHero} onDragEnd={() => { setDragId(null); setDragOverId(null); }} onDragStart={() => setDragId(t.id)}
                    onDragOver={e => { e.preventDefault(); if (t.id !== dragId) setDragOverId(t.id); }}
                    onDrop={() => handleDrop('timeline', t.id)}
                    className={cn('flex items-center gap-3 px-4 py-3.5 transition-all select-none',
                      dragOverId === t.id ? 'border-t-2 border-primary bg-primary/5' : 'hover:bg-muted/30',
                      !t.is_active && 'opacity-60')}>
                    <DragHandle />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-sm tabular-nums">{t.year}</span>
                        <span className="font-semibold text-foreground text-sm">{t.title}</span>
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{t.icon}</span>
                        {!t.is_active && <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">Inactivo</span>}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.description}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button aria-label="Cambiar visibilidad" disabled={busy || loading || saving || savingHero} onClick={() => toggleActive('timeline', t)} className={[cn('p-2 rounded-lg transition-colors', t.is_active ? 'text-green-500 hover:bg-emerald-500/10' : 'text-muted-foreground hover:bg-muted'), 'dashboard-action'].filter(Boolean).join(' ')}>
                        {t.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button aria-label="Editar contenido" disabled={busy || loading || saving || savingHero} onClick={() => { setEditingTimeline(t); setShowTimelineForm(true); }} className={["p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-primary transition-colors", "dashboard-action"].filter(Boolean).join(' ')}>
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button aria-label="Eliminar contenido" disabled={busy || loading || saving || savingHero} onClick={() => setDeleteTarget({ id: t.id, name: t.title, kind: 'timeline' })} className={["p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive transition-colors", "dashboard-action dashboard-action-danger"].filter(Boolean).join(' ')}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </StableRegion>
      )}

      {/* ── INFRASTRUCTURE TAB ─────────────────────────────────────────────────────── */}
      {!loadError && tab === 'infrastructure' && (
        <StableRegion className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{infra.filter(i => i.is_active).length} activos · {infra.length} total</p>
            <button aria-label="Editar contenido" disabled={busy || loading || saving || savingHero} onClick={() => { setEditingInfra(null); setShowInfraForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> Nueva caracteristica
            </button>
          </div>

          {loading ? <LoadingRegion className="min-h-[24rem]" /> : infra.length === 0 ? (
            <EmptyState icon={Server} label="Sin caracteristicas" hint="Agrega caracteristicas de infraestructura." onAdd={() => { setEditingInfra(null); setShowInfraForm(true); }} />
          ) : (
            <div className="border border-border/60 rounded-xl overflow-hidden bg-card">
              <ReorderHint />
              <div className="divide-y divide-border/50">
                {infra.map(i => (
                  <div key={i.id} draggable={!busy && !savingHero} onDragEnd={() => { setDragId(null); setDragOverId(null); }} onDragStart={() => setDragId(i.id)}
                    onDragOver={e => { e.preventDefault(); if (i.id !== dragId) setDragOverId(i.id); }}
                    onDrop={() => handleDrop('infra', i.id)}
                    className={cn('flex items-center gap-3 px-4 py-3.5 transition-all select-none',
                      dragOverId === i.id ? 'border-t-2 border-primary bg-primary/5' : 'hover:bg-muted/30',
                      !i.is_active && 'opacity-60')}>
                    <DragHandle />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground text-sm">{i.title}</span>
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{i.icon}</span>
                        {!i.is_active && <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">Inactivo</span>}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{i.description}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button aria-label="Cambiar visibilidad" disabled={busy || loading || saving || savingHero} onClick={() => toggleActive('infra', i)} className={[cn('p-2 rounded-lg transition-colors', i.is_active ? 'text-green-500 hover:bg-emerald-500/10' : 'text-muted-foreground hover:bg-muted'), 'dashboard-action'].filter(Boolean).join(' ')}>
                        {i.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button aria-label="Editar contenido" disabled={busy || loading || saving || savingHero} onClick={() => { setEditingInfra(i); setShowInfraForm(true); }} className={["p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-primary transition-colors", "dashboard-action"].filter(Boolean).join(' ')}>
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button aria-label="Eliminar contenido" disabled={busy || loading || saving || savingHero} onClick={() => setDeleteTarget({ id: i.id, name: i.title, kind: 'infra' })} className={["p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive transition-colors", "dashboard-action dashboard-action-danger"].filter(Boolean).join(' ')}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </StableRegion>
      )}

      {/* ── FOUNDERS TAB ───────────────────────────────────────────────────────────── */}
      {!loadError && tab === 'founders' && (
        <StableRegion className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{founders.filter(f => f.is_active).length} activos · {founders.length} total</p>
            <button aria-label="Editar contenido" disabled={busy || loading || saving || savingHero} onClick={() => { setEditingFounder(null); setShowFounderForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> Nuevo fundador
            </button>
          </div>

          {loading ? <LoadingRegion className="min-h-[24rem]" /> : founders.length === 0 ? (
            <EmptyState icon={Users} label="Sin fundadores" hint="Agrega los fundadores o lideres de la empresa." onAdd={() => { setEditingFounder(null); setShowFounderForm(true); }} />
          ) : (
            <div className="border border-border/60 rounded-xl overflow-hidden bg-card">
              <ReorderHint />
              <div className="divide-y divide-border/50">
                {founders.map(f => (
                  <div key={f.id} draggable={!busy && !savingHero} onDragEnd={() => { setDragId(null); setDragOverId(null); }} onDragStart={() => setDragId(f.id)}
                    onDragOver={e => { e.preventDefault(); if (f.id !== dragId) setDragOverId(f.id); }}
                    onDrop={() => handleDrop('founder', f.id)}
                    className={cn('flex items-center gap-3 px-4 py-3.5 transition-all select-none',
                      dragOverId === f.id ? 'border-t-2 border-primary bg-primary/5' : 'hover:bg-muted/30',
                      !f.is_active && 'opacity-60')}>
                    <DragHandle />
                    <div className="w-11 h-14 rounded-lg overflow-hidden bg-muted border border-border flex-shrink-0">
                      {f.image_url
                        ? <img src={f.image_url} alt={f.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground/30" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground text-sm">{f.name}</span>
                        <span className="text-xs text-primary font-medium">{f.role}</span>
                        {!f.is_active && <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">Inactivo</span>}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{f.bio}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button aria-label="Cambiar visibilidad" disabled={busy || loading || saving || savingHero} onClick={() => toggleActive('founder', f)} className={[cn('p-2 rounded-lg transition-colors', f.is_active ? 'text-green-500 hover:bg-emerald-500/10' : 'text-muted-foreground hover:bg-muted'), 'dashboard-action'].filter(Boolean).join(' ')}>
                        {f.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button aria-label="Editar contenido" disabled={busy || loading || saving || savingHero} onClick={() => { setEditingFounder(f); setShowFounderForm(true); }} className={["p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-primary transition-colors", "dashboard-action"].filter(Boolean).join(' ')}>
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button aria-label="Eliminar contenido" disabled={busy || loading || saving || savingHero} onClick={() => setDeleteTarget({ id: f.id, name: f.name, kind: 'founder' })} className={["p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive transition-colors", "dashboard-action dashboard-action-danger"].filter(Boolean).join(' ')}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </StableRegion>
      )}

      {/* ── FOUNDER MODAL ──────────────────────────────────────────────────────────── */}
      {showFounderForm && (
        <FounderFormModal
          founder={editingFounder}
          onSave={saveFounder}
          onClose={() => { if (saving) return; setShowFounderForm(false); setEditingFounder(null); }}
          saving={saving}
        />
      )}

      {/* ── TIMELINE MODAL ─────────────────────────────────────────────────────────── */}
      {showTimelineForm && (
        <TimelineFormModal
          item={editingTimeline}
          onSave={saveTimeline}
          onClose={() => { if (saving) return; setShowTimelineForm(false); setEditingTimeline(null); }}
          saving={saving}
        />
      )}

      {/* ── INFRA MODAL ────────────────────────────────────────────────────────────── */}
      {showInfraForm && (
        <InfraFormModal
          item={editingInfra}
          onSave={saveInfra}
          onClose={() => { if (saving) return; setShowInfraForm(false); setEditingInfra(null); }}
          saving={saving}
        />
      )}

      {/* ── VALUE MODAL ────────────────────────────────────────────────────────────── */}
      {showValueForm && (
        <ValueFormModal
          item={editingValue}
          onSave={saveValue}
          onClose={() => { if (saving) return; setShowValueForm(false); setEditingValue(null); }}
          saving={saving}
        />
      )}

      {/* ── DELETE CONFIRM ─────────────────────────────────────────────────────────── */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleDelete}
        title="Eliminar"
        description={<>Se eliminara permanentemente <strong>{deleteTarget?.name}</strong>. Esta accion no se puede deshacer.</>}
        loading={!!deletingId}
      />
    </div>
  );
}

// ── Helper components ──────────────────────────────────────────────────────────────
function ReorderHint() {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-muted/20">
      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
      <p className="text-xs text-muted-foreground/50">Arrastra para reordenar</p>
    </div>
  );
}

function EmptyState({ icon: Icon, label, hint, onAdd }: { icon: typeof Users; label: string; hint: string; onAdd: () => void }) {
  return (
    <div className="border border-border/60 rounded-xl bg-card">
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
          <Icon className="h-5 w-5 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium text-foreground mb-0.5">{label}</p>
        <p className="text-xs text-muted-foreground/60 mb-4">{hint}</p>
        <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>
    </div>
  );
}

// ── Founder Form Modal ─────────────────────────────────────────────────────────────
function FounderFormModal({ founder, onSave, onClose, saving }: {
  founder: Founder | null;
  onSave: (data: Partial<Founder> & { id?: string }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name: founder?.name || '',
    role: founder?.role || '',
    bio: founder?.bio || '',
    image_url: founder?.image_url || '',
    is_active: founder?.is_active ?? true,
  });

  const set = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 app-modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[90dvh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-bold text-foreground">{founder ? 'Editar fundador' : 'Nuevo fundador'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Nombre completo *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jhonatan Arias"
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Cargo / Rol</label>
            <input value={form.role} onChange={e => set('role', e.target.value)} placeholder="CEO Fundador"
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Foto</label>
            <ImageInput value={form.image_url} onChange={v => set('image_url', v)} aspect="portrait" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Biografia</label>
            <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={4} placeholder="Escribe la biografia..."
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors resize-none" />
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border">
            <ToggleSwitch checked={form.is_active} onChange={v => set('is_active', v)} />
            <p className="text-sm text-foreground">{form.is_active ? 'Activo — visible en la pagina' : 'Inactivo — oculto'}</p>
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t border-border shrink-0">
          <button onClick={onClose} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
          <button onClick={() => { if (!form.name.trim()) { toast.error('El nombre es requerido'); return; } onSave({ ...(founder?.id ? { id: founder.id } : {}), ...form }); }}
            disabled={saving} className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {founder ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Timeline Form Modal ────────────────────────────────────────────────────────────
function TimelineFormModal({ item, onSave, onClose, saving }: {
  item: TimelineItem | null;
  onSave: (data: Partial<TimelineItem> & { id?: string }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    year: item?.year || '',
    title: item?.title || '',
    description: item?.description || '',
    icon: item?.icon || 'Rocket',
    is_active: item?.is_active ?? true,
  });

  const set = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 app-modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[90dvh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-bold text-foreground">{item ? 'Editar hito' : 'Nuevo hito'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Año *</label>
              <input value={form.year} onChange={e => set('year', e.target.value)} placeholder="2024"
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1.5">Titulo *</label>
              <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Liderazgo"
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Descripcion</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Descripción del hito..."
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Icono</label>
            <IconPicker value={form.icon} onChange={v => set('icon', v)} />
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border">
            <ToggleSwitch checked={form.is_active} onChange={v => set('is_active', v)} />
            <p className="text-sm text-foreground">{form.is_active ? 'Activo — visible' : 'Inactivo — oculto'}</p>
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t border-border shrink-0">
          <button onClick={onClose} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
          <button onClick={() => { if (!form.year.trim() || !form.title.trim()) { toast.error('Año y titulo son requeridos'); return; } onSave({ ...(item?.id ? { id: item.id } : {}), ...form }); }}
            disabled={saving} className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {item ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Infra Form Modal ───────────────────────────────────────────────────────────────
function InfraFormModal({ item, onSave, onClose, saving }: {
  item: InfraItem | null;
  onSave: (data: Partial<InfraItem> & { id?: string }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    title: item?.title || '',
    description: item?.description || '',
    icon: item?.icon || 'Cloud',
    is_active: item?.is_active ?? true,
  });

  const set = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 app-modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[90dvh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-bold text-foreground">{item ? 'Editar caracteristica' : 'Nueva caracteristica'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Titulo *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Cloud nativo"
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Descripcion</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Descripcion..."
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Icono</label>
            <IconPicker value={form.icon} onChange={v => set('icon', v)} />
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border">
            <ToggleSwitch checked={form.is_active} onChange={v => set('is_active', v)} />
            <p className="text-sm text-foreground">{form.is_active ? 'Activo — visible' : 'Inactivo — oculto'}</p>
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t border-border shrink-0">
          <button onClick={onClose} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
          <button onClick={() => { if (!form.title.trim()) { toast.error('El titulo es requerido'); return; } onSave({ ...(item?.id ? { id: item.id } : {}), ...form }); }}
            disabled={saving} className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {item ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Value Form Modal ───────────────────────────────────────────────────────────────
function ValueFormModal({ item, onSave, onClose, saving }: {
  item: ValueItem | null;
  onSave: (data: Partial<ValueItem> & { id?: string }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    label: item?.label || '',
    text: item?.text || '',
    icon: item?.icon || 'Target',
    is_active: item?.is_active ?? true,
  });

  const set = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 app-modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[90dvh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-bold text-foreground">{item ? 'Editar valor' : 'Nuevo valor'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Etiqueta *</label>
            <input value={form.label} onChange={e => set('label', e.target.value)} placeholder="Mision"
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Texto</label>
            <textarea value={form.text} onChange={e => set('text', e.target.value)} rows={4} placeholder="Texto del valor..."
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Icono</label>
            <IconPicker value={form.icon} onChange={v => set('icon', v)} />
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border">
            <ToggleSwitch checked={form.is_active} onChange={v => set('is_active', v)} />
            <p className="text-sm text-foreground">{form.is_active ? 'Activo — visible' : 'Inactivo — oculto'}</p>
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t border-border shrink-0">
          <button onClick={onClose} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
          <button onClick={() => { if (!form.label.trim()) { toast.error('La etiqueta es requerida'); return; } onSave({ ...(item?.id ? { id: item.id } : {}), ...form }); }}
            disabled={saving} className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {item ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AboutTextEditor({ fields, values, onChange, onSave, loading, saving }: {
  fields: AboutField[]; values: Record<string, string>; onChange: (key: string, value: string) => void; onSave: () => void; loading: boolean; saving: boolean;
}) {
  return <StableRegion className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-5">
    <div><h3 className="text-sm font-bold text-foreground mb-1">Textos de la sección</h3><p className="text-xs text-muted-foreground">Edita el contenido manteniendo el diseño actual de la página.</p></div>
    {loading ? <LoadingRegion className="min-h-[24rem]" /> : <fieldset disabled={saving} className="space-y-5">
      {fields.map(field => <div key={field.key}>
        <label htmlFor={field.key} className="block text-xs font-semibold text-foreground mb-1.5">{field.label}</label>
        {field.multiline ? <textarea id={field.key} value={values[field.key] ?? ''} onChange={event => onChange(field.key, event.target.value)} rows={field.key.endsWith('description') ? 4 : 2} className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors resize-y" /> : <input id={field.key} value={values[field.key] ?? ''} onChange={event => onChange(field.key, event.target.value)} className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors" />}
        {field.hint && <p className="text-xs text-muted-foreground mt-1.5">{field.hint}</p>}
      </div>)}
      <div className="flex justify-end pt-2 border-t border-border"><button onClick={onSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">{saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Guardar textos</button></div>
    </fieldset>}
  </StableRegion>;
}
