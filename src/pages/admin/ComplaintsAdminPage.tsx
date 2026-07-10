import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/backend/client';
import { useConfig } from '@/store/configStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { FileText, Eye, Clock, Loader as Loader2, Search, RefreshCw, Trash2, Upload, Image as ImageIcon, MessageSquare, Bell, ChevronRight, ArrowRight, User, Mail, Phone, CreditCard, MapPin, Package, DollarSign, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

type ComplaintStatus = 'pendiente' | 'en_proceso' | 'resuelto' | 'cerrado';

interface Complaint {
  id: string;
  correlativo: string;
  tipo: string;
  nombre: string;
  apellido?: string;
  email: string;
  telefono?: string;
  num_doc?: string;
  tipo_doc?: string;
  direccion?: string;
  descripcion_bien?: string;
  detalle?: string;
  pedido?: string;
  tipo_bien?: string;
  monto?: number;
  status: ComplaintStatus;
  respuesta?: string;
  notificado: boolean;
  fecha_respuesta?: string;
  created_at: string;
  updated_at?: string;
}

const STATUS_ORDER: ComplaintStatus[] = ['pendiente', 'en_proceso', 'resuelto', 'cerrado'];

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; badgeClass: string; stepClass: string }> = {
  pendiente:  { label: 'Pendiente',  badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',        stepClass: 'bg-amber-500' },
  en_proceso: { label: 'En proceso', badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',            stepClass: 'bg-blue-500' },
  resuelto:   { label: 'Resuelto',   badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30', stepClass: 'bg-emerald-500' },
  cerrado:    { label: 'Cerrado',    badgeClass: 'bg-muted text-muted-foreground border-border',                                   stepClass: 'bg-muted-foreground' },
};

function fmt(v?: string | null) {
  if (!v) return '—';
  try { return new Date(v).toLocaleString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
  catch { return v; }
}
function fmtDate(v?: string | null) {
  if (!v) return '—';
  try { return new Date(v).toLocaleDateString('es-PE', { day:'2-digit', month:'long', year:'numeric' }); }
  catch { return v || '—'; }
}

function MetaField({ icon: Icon, label, value }: { icon: typeof User; label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide">{label}</p>
        <p className="text-sm text-foreground font-medium">{value}</p>
      </div>
    </div>
  );
}

// ── Detail modal (centered Dialog) ───────────────────────────────────────────
function DetailPanel({
  complaint, onClose, onStatusChange, onSaveResponse, onDelete, savingStatus, savingResp,
}: {
  complaint: Complaint;
  onClose: () => void;
  onStatusChange: (s: ComplaintStatus) => void;
  onSaveResponse: (text: string) => void;
  onDelete: () => void;
  savingStatus: boolean;
  savingResp: boolean;
}) {
  const [responseText, setResponseText] = useState(complaint.respuesta ?? '');
  const stepIndex = STATUS_ORDER.indexOf(complaint.status);
  const cfg = STATUS_CONFIG[complaint.status] ?? STATUS_CONFIG.pendiente;
  const nextStatus = stepIndex < STATUS_ORDER.length - 1 ? STATUS_ORDER[stepIndex + 1] : null;

  useEffect(() => { setResponseText(complaint.respuesta ?? ''); }, [complaint.id, complaint.respuesta]);

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-hidden flex flex-col gap-0 p-0">
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b border-border/50 shrink-0 space-y-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-black font-mono tracking-widest text-foreground">
                {complaint.correlativo || '—'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground/60 mt-0.5">
                Detalle del reclamo
              </DialogDescription>
            </div>
            <Badge variant="outline" className={cfg.badgeClass}>{cfg.label}</Badge>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Progress stepper */}
          <div className="bg-muted/20 border border-border/50 rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wide mb-3">Progreso</p>
            <div className="flex items-center gap-0">
              {STATUS_ORDER.map((s, i) => {
                const done = i <= stepIndex;
                const sCfg = STATUS_CONFIG[s];
                return (
                  <div key={s} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1">
                      <div className={cn(
                        'w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-colors',
                        done ? `${sCfg.stepClass} border-transparent text-white` : 'border-border bg-background text-muted-foreground'
                      )}>
                        {i + 1}
                      </div>
                      <span className={cn('text-[9px] font-medium whitespace-nowrap', done ? 'text-foreground' : 'text-muted-foreground/40')}>
                        {sCfg.label}
                      </span>
                    </div>
                    {i < STATUS_ORDER.length - 1 && (
                      <div className={cn('h-0.5 flex-1 mb-4 mx-1 rounded transition-colors', i < stepIndex ? 'bg-primary' : 'bg-border')} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status controls */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={complaint.status} onValueChange={v => onStatusChange(v as ComplaintStatus)} disabled={savingStatus}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map(s => (
                  <SelectItem key={s} value={s}>
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', STATUS_CONFIG[s].stepClass)} />
                      {STATUS_CONFIG[s].label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {nextStatus && (
              <Button onClick={() => onStatusChange(nextStatus)} disabled={savingStatus} size="sm" className="shrink-0 gap-1.5">
                {savingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Avanzar a {STATUS_CONFIG[nextStatus].label}
              </Button>
            )}
          </div>

          {/* Datos del solicitante */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wide mb-3">Datos del solicitante</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <MetaField icon={User} label="Nombre completo" value={`${complaint.nombre ?? ''} ${complaint.apellido ?? ''}`.trim()} />
              <MetaField icon={Mail} label="Correo electrónico" value={complaint.email} />
              <MetaField icon={Phone} label="Teléfono" value={complaint.telefono} />
              <MetaField icon={CreditCard} label="Documento" value={complaint.num_doc ? `${complaint.tipo_doc ?? ''} ${complaint.num_doc}`.trim() : null} />
              <MetaField icon={MapPin} label="Dirección" value={complaint.direccion} />
              <MetaField icon={Clock} label="Fecha de registro" value={fmtDate(complaint.created_at)} />
            </div>
          </div>

          {/* Detalle del reclamo */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wide mb-3">Detalle del reclamo</p>
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold', STATUS_CONFIG[complaint.status]?.badgeClass ?? '')}>
                  {complaint.tipo ? complaint.tipo.charAt(0).toUpperCase() + complaint.tipo.slice(1) : 'N/A'}
                </span>
                {complaint.tipo_bien && (
                  <span className="text-xs font-medium text-muted-foreground bg-muted/50 border border-border/50 px-2.5 py-1 rounded-full">
                    {complaint.tipo_bien}
                  </span>
                )}
                {typeof complaint.monto === 'number' && (
                  <span className="text-xs font-medium text-muted-foreground bg-muted/50 border border-border/50 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />S/ {complaint.monto.toFixed(2)}
                  </span>
                )}
              </div>
              {complaint.descripcion_bien && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                    <Package className="w-3 h-3" />Producto / Servicio
                  </p>
                  <p className="text-sm text-foreground/80">{complaint.descripcion_bien}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide mb-1.5">Descripción del caso</p>
                <div className="bg-muted/20 border border-border/40 rounded-lg p-3 text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {complaint.detalle || '—'}
                </div>
              </div>
              {complaint.pedido && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide mb-1.5">Pedido / Solicitud</p>
                  <div className="bg-muted/20 border border-border/40 rounded-lg p-3 text-sm text-foreground/80 leading-relaxed">
                    {complaint.pedido}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Respuesta al cliente */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground/60" />
              <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wide">Respuesta al cliente</p>
              {complaint.notificado && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full ml-auto">
                  <Bell className="h-2.5 w-2.5" />Notificado
                </span>
              )}
            </div>

            {complaint.respuesta && (
              <div className="mb-3 p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5">Respuesta actual</p>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{complaint.respuesta}</p>
                {complaint.fecha_respuesta && (
                  <p className="text-xs text-muted-foreground/50 mt-2">{fmt(complaint.fecha_respuesta)}</p>
                )}
              </div>
            )}

            <div className="space-y-2.5">
              <Textarea
                placeholder="Escribe la respuesta que verá el cliente en &quot;Mis Reclamos&quot; y en su correo electrónico..."
                value={responseText}
                onChange={e => setResponseText(e.target.value)}
                rows={4}
                className="resize-y"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground/60 leading-relaxed">
                  Al guardar, el cliente verá esta respuesta en "Mis Reclamos" y recibirá una notificación por correo.
                </p>
                <Button onClick={() => onSaveResponse(responseText)} disabled={savingResp || !responseText.trim()} size="sm" className="shrink-0 gap-1.5">
                  {savingResp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Guardar y enviar
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="shrink-0 px-5 py-4 border-t border-border/50 flex items-center justify-between gap-3">
          <Button variant="outline" size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
            onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-1.5" />Eliminar
          </Button>
          <Button variant="ghost" onClick={onClose} size="sm">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ComplaintsAdminPage() {
  const { company, refresh } = useConfig();
  const [complaints, setComplaints]     = useState<Complaint[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ComplaintStatus>('all');
  const [selected, setSelected]         = useState<Complaint | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Complaint | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingResp, setSavingResp]     = useState(false);
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [togglingEnabled, setTogglingEnabled] = useState(false);
  const [bookImage, setBookImage]       = useState('');
  const [urlInput, setUrlInput]         = useState('');
  const [imageMode, setImageMode]       = useState<'upload' | 'url'>('upload');
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);

  const complaintsEnabled =
    company?.complaints_book_enabled === 'true' ||
    (company?.complaints_book_enabled as unknown as boolean) === true;

  useEffect(() => {
    const v = company?.complaints_book_image ?? '';
    setBookImage(v);
    setUrlInput(v);
  }, [company?.complaints_book_image]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { data, error } = await supabase.from('complaints_book').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setComplaints((data as Complaint[]) ?? []);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al cargar'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = complaints.filter(c => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || c.correlativo?.toLowerCase().includes(q) || c.nombre?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.tipo?.toLowerCase().includes(q);
    return matchSearch && (statusFilter === 'all' || c.status === statusFilter);
  });

  const stats = {
    total:      complaints.length,
    pendiente:  complaints.filter(c => c.status === 'pendiente').length,
    en_proceso: complaints.filter(c => c.status === 'en_proceso').length,
    resuelto:   complaints.filter(c => c.status === 'resuelto').length,
  };

  const handleToggleEnabled = async () => {
    setTogglingEnabled(true);
    try {
      const next = !complaintsEnabled;
      const { error } = await supabase.from('system_config').update({ value: String(next) }).eq('key', 'complaints_book_enabled');
      if (error) throw error;
      await refresh?.();
      toast.success(next ? 'Libro habilitado' : 'Libro deshabilitado');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al actualizar'); }
    finally { setTogglingEnabled(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Solo se permiten imágenes'); return; }
    if (file.size > 3 * 1024 * 1024) { toast.error('La imagen no puede superar 3 MB'); return; }
    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `complaints/book-image-${Date.now()}.${ext}`;
      const { data: up, error: upErr } = await supabase.storage.from('logos').upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(up.path);
      const { error: cfgErr } = await supabase.from('system_config').update({ value: urlData.publicUrl }).eq('key', 'complaints_book_image');
      if (cfgErr) throw cfgErr;
      setBookImage(urlData.publicUrl);
      await refresh?.();
      toast.success('Imagen actualizada');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al subir imagen'); }
    finally { setUploadingImage(false); if (imageRef.current) imageRef.current.value = ''; }
  };

  const handleStatusChange = async (newStatus: ComplaintStatus) => {
    if (!selected) return;
    setSavingStatus(true);
    try {
      const { data, error } = await supabase.from('complaints_book')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', selected.id).select('*').single();
      if (error) throw error;
      const updated = data as Complaint;
      setSelected(updated);
      setComplaints(prev => prev.map(c => c.id === updated.id ? updated : c));
      toast.success('Estado actualizado');
      // Trigger email notification
      supabase.functions.invoke('complaint-notify', {
        body: { complaint_id: selected.id, event: 'status_change', new_status: newStatus },
      }).catch(() => {});
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setSavingStatus(false); }
  };

  const handleSaveResponse = async (responseText: string) => {
    if (!selected) return;
    setSavingResp(true);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase.from('complaints_book')
        .update({ respuesta: responseText, fecha_respuesta: now, notificado: true, updated_at: now })
        .eq('id', selected.id).select('*').single();
      if (error) throw error;
      const updated = data as Complaint;
      setSelected(updated);
      setComplaints(prev => prev.map(c => c.id === updated.id ? updated : c));
      toast.success('Respuesta guardada');
      // Trigger email notification
      supabase.functions.invoke('complaint-notify', {
        body: { complaint_id: selected.id, event: 'response', response_text: responseText },
      }).catch(() => {});
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setSavingResp(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const { error } = await supabase.from('complaints_book').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setComplaints(prev => prev.filter(c => c.id !== deleteTarget.id));
      if (selected?.id === deleteTarget.id) setSelected(null);
      toast.success('Reclamo eliminado');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setDeletingId(null); setDeleteTarget(null); }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="flex justify-between items-center">
          <div className="space-y-1.5"><Skeleton className="h-7 w-52" /><Skeleton className="h-4 w-72" /></div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Libro de Reclamaciones</h1>
          <p className="text-sm text-muted-foreground">Gestiona las quejas y reclamos de los clientes</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
          <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
          Actualizar
        </Button>
      </div>

      {/* Config row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Toggle habilitado — clean switch card */}
        <div className="border border-border/60 bg-card rounded-xl p-4 flex items-center gap-4">
          <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', complaintsEnabled ? 'bg-emerald-500/10' : 'bg-muted/60')}>
            <FileText className={cn('h-5 w-5', complaintsEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">
              {complaintsEnabled ? 'Libro habilitado' : 'Libro deshabilitado'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {complaintsEnabled ? 'Clientes pueden registrar quejas.' : 'Registro temporalmente inactivo.'}
            </p>
          </div>
          {togglingEnabled
            ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" />
            : <Switch checked={complaintsEnabled} onCheckedChange={handleToggleEnabled} aria-label="Habilitar libro" />}
        </div>

        {/* Imagen del libro */}
        <div className="border border-border/60 bg-card rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl border border-border/60 bg-muted/40 flex items-center justify-center overflow-hidden shrink-0">
              {bookImage
                ? <img src={bookImage} alt="Libro" className="w-full h-full object-contain p-0.5" />
                : <ImageIcon className="w-5 h-5 text-muted-foreground/40" />}
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Imagen del libro</p>
              <p className="text-xs text-muted-foreground/70">Aparece en la página pública.</p>
            </div>
          </div>
          <div className="flex gap-1 p-0.5 bg-muted/40 rounded-lg border border-border/50">
            {(['upload', 'url'] as const).map(m => (
              <button key={m} onClick={() => setImageMode(m)}
                className={cn('flex-1 text-xs font-medium py-1.5 rounded-md transition-all',
                  imageMode === m ? 'bg-background border border-border/60 text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {m === 'upload' ? 'Subir archivo' : 'Pegar URL'}
              </button>
            ))}
          </div>
          {imageMode === 'upload' ? (
            <>
              <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <Button variant="outline" size="sm" className="w-full" onClick={() => imageRef.current?.click()} disabled={uploadingImage}>
                {uploadingImage ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                {uploadingImage ? 'Subiendo...' : 'Seleccionar imagen'}
              </Button>
            </>
          ) : (
            <div className="flex gap-2">
              <Input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://..." className="text-xs h-8" />
              <Button size="sm" className="h-8 shrink-0" disabled={uploadingImage || !urlInput.trim()}
                onClick={async () => {
                  if (!urlInput.trim()) return;
                  setUploadingImage(true);
                  try {
                    const { error } = await supabase.from('system_config').update({ value: urlInput.trim() }).eq('key', 'complaints_book_image');
                    if (error) throw error;
                    setBookImage(urlInput.trim());
                    await refresh?.();
                    toast.success('Imagen actualizada');
                  } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
                  finally { setUploadingImage(false); }
                }}>
                {uploadingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Guardar'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground', bg: 'bg-muted/50' },
          { label: 'Pendientes', value: stats.pendiente, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'En proceso', value: stats.en_proceso, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Resueltos', value: stats.resuelto, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl p-4 border border-border/60', s.bg)}>
            <p className="text-xs font-medium text-muted-foreground mb-1">{s.label}</p>
            <p className={cn('text-3xl font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Buscar por correlativo, nombre, email o tipo…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Filtrar estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {STATUS_ORDER.map(s => (
              <SelectItem key={s} value={s}>
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', STATUS_CONFIG[s].stepClass)} />
                  {STATUS_CONFIG[s].label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="border border-border/60 rounded-xl overflow-hidden bg-card">
        <div className="px-5 py-3.5 border-b border-border/50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Reclamos{filtered.length !== complaints.length ? ` — ${filtered.length} de ${complaints.length}` : ` (${complaints.length})`}
          </h2>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-10 h-10 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground mb-0.5">
              {complaints.length === 0 ? 'Sin reclamos registrados' : 'Sin resultados'}
            </p>
            <p className="text-xs text-muted-foreground/60">
              {complaints.length === 0 ? 'Cuando los clientes registren quejas aparecerán aquí.' : 'Prueba con otros filtros.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map(c => {
              const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.pendiente;
              return (
                <button key={c.id} onClick={() => setSelected(c)}
                  className="w-full text-left flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors group">
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-foreground">{c.correlativo ?? '—'}</span>
                      <Badge variant="outline" className={cn('text-[11px] h-5 px-2', cfg.badgeClass)}>{cfg.label}</Badge>
                      {c.notificado && <Bell className="h-3 w-3 text-emerald-500" />}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground/60 flex-wrap">
                      <span className="font-medium text-foreground/70">{c.nombre ?? ''} {c.apellido ?? ''}</span>
                      <span>·</span>
                      <span className="capitalize">{c.tipo ?? '—'}</span>
                      <span>·</span>
                      <span>{fmt(c.created_at)}</span>
                    </div>
                    {c.detalle && <p className="text-xs text-muted-foreground/50 line-clamp-1 mt-0.5">{c.detalle}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => { e.stopPropagation(); setSelected(c); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => { e.stopPropagation(); setDeleteTarget(c); }} disabled={deletingId === c.id}>
                      {deletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <DetailPanel
          complaint={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onSaveResponse={handleSaveResponse}
          onDelete={() => { setDeleteTarget(selected); setSelected(null); }}
          savingStatus={savingStatus}
          savingResp={savingResp}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este reclamo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente{deleteTarget?.correlativo && <> el reclamo <strong>#{deleteTarget.correlativo}</strong></>} de{' '}
              <strong>{deleteTarget?.nombre}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
