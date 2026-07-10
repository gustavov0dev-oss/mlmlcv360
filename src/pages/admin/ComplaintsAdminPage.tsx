import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/backend/client';
import { useConfig } from '@/store/configStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  FileText, Eye, CircleCheck as CheckCircle2, Clock, Loader as Loader2,
  Search, RefreshCw, ToggleLeft, ToggleRight, Trash2, Upload,
  Image as ImageIcon, MessageSquare, Bell
} from 'lucide-react';

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
  monto?: number;
  status: ComplaintStatus;
  respuesta?: string;
  notificado: boolean;
  fecha_respuesta?: string;
  created_at: string;
  updated_at?: string;
}

const STATUS_ORDER: ComplaintStatus[] = ['pendiente', 'en_proceso', 'resuelto', 'cerrado'];

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; badgeClass: string }> = {
  pendiente:  { label: 'Pendiente',   badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  en_proceso: { label: 'En proceso',  badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  resuelto:   { label: 'Resuelto',    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  cerrado:    { label: 'Cerrado',     badgeClass: 'bg-muted text-muted-foreground border-border' },
};

function fmt(v?: string | null) {
  if (!v) return '-';
  try { return new Date(v).toLocaleString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
  catch { return v; }
}

function ListSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <div className="space-y-1.5"><Skeleton className="h-7 w-52" /><Skeleton className="h-4 w-72" /></div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <div className="flex gap-3"><Skeleton className="h-10 flex-1 rounded-lg" /><Skeleton className="h-10 w-44 rounded-lg" /></div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
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
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Complaint | null>(null);
  const [savingStatus, setSavingStatus]   = useState(false);
  const [savingResp, setSavingResp]       = useState(false);
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [togglingEnabled, setTogglingEnabled] = useState(false);
  const [responseText, setResponseText]   = useState('');
  const [bookImage, setBookImage]         = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);

  const complaintsEnabled =
    company?.complaints_book_enabled === 'true' ||
    (company?.complaints_book_enabled as unknown as boolean) === true;

  useEffect(() => { setBookImage(company?.complaints_book_image ?? ''); }, [company?.complaints_book_image]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('complaints_book')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setComplaints((data as Complaint[]) ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al cargar quejas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = complaints.filter(c => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || c.correlativo?.toLowerCase().includes(q) ||
      c.nombre?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) ||
      c.tipo?.toLowerCase().includes(q);
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
      const { error } = await supabase.from('system_config')
        .update({ value: String(next) }).eq('key', 'complaints_book_enabled');
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
      const { error: cfgErr } = await supabase.from('system_config')
        .update({ value: urlData.publicUrl }).eq('key', 'complaints_book_image');
      if (cfgErr) throw cfgErr;
      setBookImage(urlData.publicUrl);
      await refresh?.();
      toast.success('Imagen actualizada');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al subir imagen'); }
    finally {
      setUploadingImage(false);
      if (imageRef.current) imageRef.current.value = '';
    }
  };

  const openDetail = (c: Complaint) => {
    setSelected(c);
    setResponseText(c.respuesta ?? '');
    setDialogOpen(true);
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
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setSavingStatus(false); }
  };

  const handleSaveResponse = async () => {
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
      toast.success('Respuesta guardada — el usuario puede verla en su panel');
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
      if (selected?.id === deleteTarget.id) { setDialogOpen(false); setSelected(null); }
      toast.success('Queja eliminada');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error'); }
    finally { setDeletingId(null); setDeleteTarget(null); }
  };

  if (loading) return <ListSkeleton />;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Libro de Reclamaciones</h1>
          <p className="text-sm text-muted-foreground">Gestiona las quejas y reclamos de los clientes</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Config row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Toggle habilitado */}
        <Card className={`border-2 ${complaintsEnabled ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
          <CardContent className="flex items-center justify-between py-5 gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {complaintsEnabled
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  : <Clock className="h-5 w-5 text-amber-600" />}
              </div>
              <div>
                <p className="font-semibold text-sm">{complaintsEnabled ? 'Libro habilitado' : 'Libro deshabilitado'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {complaintsEnabled ? 'Los clientes pueden registrar nuevas quejas.' : 'Acceso temporalmente deshabilitado.'}
                </p>
              </div>
            </div>
            <Button variant={complaintsEnabled ? 'default' : 'outline'} size="sm"
              onClick={handleToggleEnabled} disabled={togglingEnabled} className="gap-2 shrink-0">
              {togglingEnabled ? <Loader2 className="h-4 w-4 animate-spin" />
                : complaintsEnabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
              {complaintsEnabled ? 'Habilitado' : 'Deshabilitado'}
            </Button>
          </CardContent>
        </Card>

        {/* Imagen del libro */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              Imagen del Libro
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4 px-4 pb-4">
            <div className="w-14 h-14 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {bookImage
                ? <img src={bookImage} alt="Libro" className="w-full h-full object-contain" />
                : <ImageIcon className="w-6 h-6 text-muted-foreground/40" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-2">Aparece en la página pública del libro.</p>
              <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <Button variant="outline" size="sm" onClick={() => imageRef.current?.click()} disabled={uploadingImage}>
                {uploadingImage ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                {uploadingImage ? 'Subiendo...' : 'Cambiar imagen'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, icon: <FileText className="h-4 w-4 text-muted-foreground" /> },
          { label: 'Pendientes', value: stats.pendiente, icon: <Clock className="h-4 w-4 text-amber-500" />, valClass: 'text-amber-600' },
          { label: 'En proceso', value: stats.en_proceso, icon: <Loader2 className="h-4 w-4 text-blue-500" />, valClass: 'text-blue-600' },
          { label: 'Resueltos', value: stats.resuelto, icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, valClass: 'text-emerald-500' },
        ].map(s => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
              {s.icon}
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className={`text-2xl font-bold ${s.valClass ?? ''}`}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por correlativo, nombre, email o tipo…"
            value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Filtrar estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {STATUS_ORDER.map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Lista de quejas{filtered.length !== complaints.length && ` (${filtered.length} de ${complaints.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <FileText className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                {complaints.length === 0 ? 'Aún no se han registrado quejas.' : 'No hay quejas con los filtros aplicados.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Correlativo</th>
                    <th className="px-4 py-3 text-left font-medium">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium">Nombre</th>
                    <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Email</th>
                    <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Fecha</th>
                    <th className="px-4 py-3 text-left font-medium">Estado</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(c => {
                    const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.pendiente;
                    return (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">{c.correlativo ?? '-'}</td>
                        <td className="px-4 py-3 capitalize">{c.tipo ?? '-'}</td>
                        <td className="px-4 py-3 font-medium">{c.nombre ?? '-'} {c.apellido ?? ''}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{c.email ?? '-'}</td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{fmt(c.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className={cfg.badgeClass}>{cfg.label}</Badge>
                            {c.notificado && <Bell className="h-3 w-3 text-emerald-500" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openDetail(c)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(c)} disabled={deletingId === c.id}>
                              {deletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalle del reclamo
              {selected?.correlativo && <span className="font-mono text-sm text-muted-foreground">#{selected.correlativo}</span>}
            </DialogTitle>
            <DialogDescription>Revisa y gestiona el estado de este reclamo.</DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-5 pt-1">
              {/* Status bar */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Estado:</span>
                  <Badge variant="outline" className={STATUS_CONFIG[selected.status].badgeClass}>
                    {STATUS_CONFIG[selected.status].label}
                  </Badge>
                  {selected.notificado && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                      <Bell className="h-3 w-3" /> Notificado
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={selected.status}
                    onValueChange={v => handleStatusChange(v as ComplaintStatus)} disabled={savingStatus}>
                    <SelectTrigger className="w-[145px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_ORDER.map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {(() => {
                    const idx = STATUS_ORDER.indexOf(selected.status);
                    const next = idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;
                    if (!next) return null;
                    return (
                      <Button size="sm" onClick={() => handleStatusChange(next)} disabled={savingStatus}>
                        {savingStatus ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                        Avanzar
                      </Button>
                    );
                  })()}
                </div>
              </div>

              {/* Data grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <F label="Tipo" v={selected.tipo} />
                <F label="Correlativo" v={selected.correlativo} mono />
                <F label="Nombre completo" v={`${selected.nombre ?? ''} ${selected.apellido ?? ''}`.trim()} />
                <F label="Email" v={selected.email} />
                <F label="Teléfono" v={selected.telefono} />
                <F label="Documento" v={selected.num_doc ? `${selected.tipo_doc ?? ''} ${selected.num_doc}`.trim() : undefined} />
                <F label="Dirección" v={selected.direccion} full />
                <F label="Descripción del bien" v={selected.descripcion_bien} full />
                <F label="Detalle del reclamo" v={selected.detalle} full />
                <F label="Pedido / Solicitud" v={selected.pedido} full />
                {typeof selected.monto === 'number' && <F label="Monto reclamado" v={`S/ ${selected.monto.toFixed(2)}`} />}
                <F label="Fecha de registro" v={fmt(selected.created_at)} />
                {selected.fecha_respuesta && <F label="Fecha de respuesta" v={fmt(selected.fecha_respuesta)} />}
              </div>

              {/* Response */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Respuesta al cliente
                  {selected.notificado && (
                    <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Bell className="h-3 w-3" /> El usuario ya puede ver esta respuesta
                    </span>
                  )}
                </label>
                <Textarea placeholder="Escribe la respuesta que verá el cliente en su panel…"
                  value={responseText} onChange={e => setResponseText(e.target.value)} rows={4} />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">Al guardar, el cliente verá esta respuesta en "Mis Reclamos".</p>
                  <Button onClick={handleSaveResponse} disabled={savingResp || !responseText.trim()} size="sm">
                    {savingResp ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Guardar respuesta
                  </Button>
                </div>
              </div>

              {/* Delete from dialog */}
              <div className="pt-1 border-t border-border flex justify-end">
                <Button variant="outline" size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => { setDeleteTarget(selected); setDialogOpen(false); }}>
                  <Trash2 className="h-4 w-4 mr-2" /> Eliminar queja
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta queja?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente la queja{' '}
              {deleteTarget?.correlativo && <strong>#{deleteTarget.correlativo}</strong>} de{' '}
              <strong>{deleteTarget?.nombre}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function F({ label, v, mono, full }: { label: string; v?: string | null; mono?: boolean; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm ${mono ? 'font-mono' : ''}`}>{v?.trim() || '-'}</p>
    </div>
  );
}
