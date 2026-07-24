import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/backend/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { FileText, Clock, Loader as Loader2, Search, RefreshCw, Trash2, MessageSquare, Bell, ArrowRight, User, Mail, Phone, CreditCard, MapPin, Send } from 'lucide-react';
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
  moneda?: string;
  monto?: number;
  status: ComplaintStatus;
  respuesta?: string;
  notificado: boolean;
  fecha_respuesta?: string;
  created_at: string;
  updated_at?: string;
}

const STATUS_ORDER: ComplaintStatus[] = ['pendiente', 'en_proceso', 'resuelto', 'cerrado'];

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; badgeClass: string; stepClass: string; cls: string; icon: typeof Clock; iconBg: string; iconCls: string; cardBg: string; cardBorder: string }> = {
  pendiente:  { label: 'Pendiente',  badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',        stepClass: 'bg-amber-500', cls: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/25', icon: Clock, iconBg: 'bg-amber-500/15', iconCls: 'text-amber-600 dark:text-amber-400', cardBg: 'bg-amber-500/5', cardBorder: 'border-amber-500/30' },
  en_proceso: { label: 'En proceso', badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',            stepClass: 'bg-blue-500', cls: 'text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/25', icon: Loader2, iconBg: 'bg-blue-500/15', iconCls: 'text-blue-600 dark:text-blue-400', cardBg: 'bg-blue-500/5', cardBorder: 'border-blue-500/30' },
  resuelto:   { label: 'Resuelto',   badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30', stepClass: 'bg-emerald-500', cls: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25', icon: FileText, iconBg: 'bg-emerald-500/15', iconCls: 'text-emerald-600 dark:text-emerald-400', cardBg: 'bg-emerald-500/5', cardBorder: 'border-emerald-500/30' },
  cerrado:    { label: 'Cerrado',    badgeClass: 'bg-muted text-muted-foreground border-border',                                   stepClass: 'bg-muted-foreground', cls: 'text-muted-foreground bg-muted/50 border-border', icon: FileText, iconBg: 'bg-muted', iconCls: 'text-muted-foreground', cardBg: 'bg-muted/30', cardBorder: 'border-border/60' },
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

// ── Detail modal ─────────────────────────────────────────────────────────────

function DetailPanel({
  complaint, onClose, onStatusChange, onSaveResponse, onDelete,
}: {
  complaint: Complaint;
  onClose: () => void;
  onStatusChange: (s: ComplaintStatus) => void;
  onSaveResponse: (text: string) => void;
  onDelete: () => void;
}) {
  const [responseText, setResponseText] = useState(complaint.respuesta ?? '');
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingResp, setSavingResp] = useState(false);
  const stepIndex = STATUS_ORDER.indexOf(complaint.status);
  const cfg = STATUS_CONFIG[complaint.status] ?? STATUS_CONFIG.pendiente;
  const StatusIcon = cfg.icon;
  const nextStatus = stepIndex < STATUS_ORDER.length - 1 ? STATUS_ORDER[stepIndex + 1] : null;

  useEffect(() => { setResponseText(complaint.respuesta ?? ''); }, [complaint.id, complaint.respuesta]);

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-hidden flex flex-col gap-0 p-0 [&>button]:top-3.5 [&>button]:right-3.5 [&>button]:z-20">
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b border-border/50 shrink-0 space-y-0 pr-12">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold font-mono tracking-widest text-foreground">
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

          {/* Estado actual — explicación clara para el administrador */}
          <div className={cn('rounded-xl border p-4', cfg.cardBg, cfg.cardBorder)}>
            <div className="flex items-start gap-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', cfg.iconBg)}>
                <StatusIcon className={cn('w-4.5 h-4.5', cfg.iconCls)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Estado actual: <span className={cfg.iconCls}>{cfg.label}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {complaint.status === 'pendiente' && 'El cliente registró el reclamo. Revisa los detalles y decide cómo responder.'}
                  {complaint.status === 'en_proceso' && 'Estás revisando el reclamo. Cuando tengas una respuesta, escríbela abajo.'}
                  {complaint.status === 'resuelto' && 'Le diste una respuesta al cliente. Si el caso está cerrado, márcalo como "Cerrado".'}
                  {complaint.status === 'cerrado' && 'El reclamo está cerrado. No se requieren más acciones.'}
                </p>
              </div>
            </div>
          </div>

          {/* Progress stepper */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wide mb-3">Progreso del reclamo</p>
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

          {/* Cambiar estado — explicación clara */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-muted-foreground/60 uppercase tracking-wide mb-1.5">
                Cambiar estado del reclamo
              </label>
              <Select value={complaint.status} onValueChange={async (v) => { setSavingStatus(true); await onStatusChange(v as ComplaintStatus); setSavingStatus(false); }} disabled={savingStatus}>
                <SelectTrigger className="w-full">
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
            </div>
            {nextStatus && (
              <Button onClick={async () => { setSavingStatus(true); await onStatusChange(nextStatus); setSavingStatus(false); }} disabled={savingStatus} size="sm" className="shrink-0 gap-1.5 mt-0 sm:mt-6">
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
                    {complaint.moneda === 'USD' ? '$' : 'S/'} {complaint.monto.toFixed(2)}
                  </span>
                )}
              </div>
              {complaint.descripcion_bien && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide mb-1.5">Producto / Servicio</p>
                  <p className="text-sm text-foreground/80">{complaint.descripcion_bien}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide mb-1.5">Descripción del problema</p>
                <div className="bg-muted/20 border border-border/40 rounded-lg p-3 text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {complaint.detalle || '—'}
                </div>
              </div>
              {complaint.pedido && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide mb-1.5">Solución que espera el cliente</p>
                  <div className="bg-muted/20 border border-border/40 rounded-lg p-3 text-sm text-foreground/80 leading-relaxed">
                    {complaint.pedido}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Respuesta al cliente — guía clara */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground/60" />
              <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wide">Respuesta al cliente</p>
              {complaint.notificado && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full ml-auto">
                  <Bell className="h-2.5 w-2.5" />Cliente notificado
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              Escribe una respuesta clara y respetuosa. Al guardar, el reclamo pasa a "Resuelto" y el cliente recibe una notificación por correo.
            </p>

            {complaint.respuesta && (
              <div className="mb-3 p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5">Respuesta actual</p>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{complaint.respuesta}</p>
                {complaint.fecha_respuesta && (
                  <p className="text-xs text-muted-foreground/50 mt-2">Enviada el {fmt(complaint.fecha_respuesta)}</p>
                )}
              </div>
            )}

            <div className="rounded-xl border border-border/50 bg-muted/10 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-foreground">
                  {complaint.respuesta ? 'Escribir nueva respuesta (reemplaza la actual)' : 'Escribe tu respuesta'}
                </p>
                <span className="text-[10px] text-muted-foreground/50">{responseText.length} caracteres</span>
              </div>
              <Textarea
                placeholder="Ej: Estimado cliente, gracias por contactarnos. Hemos revisado su caso y..."
                value={responseText}
                onChange={e => setResponseText(e.target.value)}
                rows={4}
                className="resize-y bg-card"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground/60 leading-relaxed flex-1">
                  Sé claro, explica qué hiciste y cómo se resolvió. El cliente verá esto en su consulta.
                </p>
                <Button onClick={async () => { setSavingResp(true); await onSaveResponse(responseText); setSavingResp(false); }} disabled={savingResp || !responseText.trim()} size="sm" className="shrink-0 gap-1.5">
                  {savingResp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Guardar y notificar
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
          <p className="text-xs text-muted-foreground/50 hidden sm:block">&nbsp;</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ComplaintsAdminPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ComplaintStatus>('all');
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Complaint | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { data, error } = await supabase.from('complaints_book').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setComplaints((data as Complaint[]) ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = complaints.filter(c => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || c.correlativo?.toLowerCase().includes(q) || c.nombre?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleStatusChange = async (newStatus: ComplaintStatus) => {
    if (!selected) return;
    try {
      const { error } = await supabase.from('complaints_book')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', selected.id).select('*').single();
      if (error) throw error;
      setComplaints(prev => prev.map(c => c.id === selected.id ? { ...c, status: newStatus } : c));
      setSelected(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success('Estado actualizado');
      supabase.functions.invoke('complaint-notify', {
        body: { complaint_id: selected.id, event: 'status_change', new_status: newStatus },
      }).catch(() => {});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleSaveResponse = async (responseText: string) => {
    if (!selected) return;
    try {
      const { error } = await supabase.from('complaints_book')
        .update({ respuesta: responseText, fecha_respuesta: new Date().toISOString(), status: 'resuelto', updated_at: new Date().toISOString() })
        .eq('id', selected.id).select('*').single();
      if (error) throw error;
      setComplaints(prev => prev.map(c => c.id === selected.id ? { ...c, respuesta: responseText, status: 'resuelto', fecha_respuesta: new Date().toISOString() } : c));
      setSelected(prev => prev ? { ...prev, respuesta: responseText, status: 'resuelto' } : null);
      toast.success('Respuesta enviada');
      supabase.functions.invoke('complaint-notify', {
        body: { complaint_id: selected.id, event: 'response', response_text: responseText },
      }).catch(() => {});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const { error } = await supabase.from('complaints_book').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setComplaints(prev => prev.filter(c => c.id !== deleteTarget.id));
      toast.success('Reclamo eliminado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="flex justify-between items-center">
          <div className="space-y-1.5"><Skeleton className="h-7 w-52" /><Skeleton className="h-4 w-72" /></div>
          <Skeleton className="h-9 w-28 rounded-lg" />
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
          <p className="text-sm text-muted-foreground">Gestiona reclamos y quejas de clientes</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
          <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
          Actualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Buscar por correlativo, nombre o email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="en_proceso">En proceso</SelectItem>
            <SelectItem value="resuelto">Resuelto</SelectItem>
            <SelectItem value="cerrado">Cerrado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['pendiente', 'en_proceso', 'resuelto', 'cerrado'] as const).map(s => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          const count = complaints.filter(c => c.status === s).length;
          return (
            <div key={s} className={cn('border rounded-xl p-3 transition-colors', cfg.cardBg, cfg.cardBorder)}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={cn('text-xs font-medium', cfg.iconCls)}>{cfg.label}</span>
                <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center', cfg.iconBg)}>
                  <Icon className={cn('w-3.5 h-3.5', cfg.iconCls)} />
                </div>
              </div>
              <p className={cn('text-2xl font-bold', cfg.iconCls)}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* List */}
      <div className="border border-border/60 rounded-xl overflow-hidden bg-card">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground mb-0.5">
              {complaints.length === 0 ? 'Sin reclamos' : 'Sin resultados'}
            </p>
            <p className="text-xs text-muted-foreground/60">
              {complaints.length === 0 ? 'Los reclamos apareceran aqui.' : 'Prueba con otra busqueda.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map(c => {
              const cfg = STATUS_CONFIG[c.status as ComplaintStatus] ?? STATUS_CONFIG.pendiente;
              const Icon = cfg.icon;
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelected(c)}>
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', cfg.iconBg)}>
                    <Icon className={cn('w-4 h-4', cfg.iconCls)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground font-mono">{c.correlativo || '—'}</span>
                      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border', cfg.cls)}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">
                      {c.nombre} {c.apellido} - {c.tipo === 'queja' ? 'Queja' : 'Reclamo'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {typeof c.monto === 'number' && (
                      <span className="text-xs font-medium text-muted-foreground bg-muted/50 border border-border/50 px-2.5 py-1 rounded-full">
                        {c.moneda === 'USD' ? '$' : 'S/'} {c.monto.toFixed(2)}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground/40 hidden sm:block">
                      {fmtDate(c.created_at)}
                    </span>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }} disabled={deletingId === c.id}>
                      {deletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <DetailPanel
          complaint={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onSaveResponse={handleSaveResponse}
          onDelete={() => { setDeleteTarget(selected); setSelected(null); }}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar reclamo</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminara permanentemente el reclamo <strong>{deleteTarget?.correlativo}</strong>. Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
