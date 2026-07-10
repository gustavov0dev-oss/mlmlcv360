import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/backend/client';
import { useConfig } from '@/store/configStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  FileText,
  Eye,
  CircleCheck as CheckCircle2,
  Clock,
  Loader as Loader2,
  Search,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Image as ImageIcon,
  MessageSquare,
  Bell,
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
  dni?: string;
  num_doc?: string;
  direccion?: string;
  descripcion?: string;
  descripcion_bien?: string;
  detalle?: string;
  pedido?: string;
  respuesta?: string;
  monto?: number;
  monto_reclamado?: number;
  status: ComplaintStatus;
  notificado: boolean;
  fecha_respuesta?: string;
  created_at: string;
  updated_at?: string;
}

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; badgeClass: string }> = {
  pendiente: {
    label: 'Pendiente',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  },
  en_proceso: {
    label: 'En proceso',
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  },
  resuelto: {
    label: 'Resuelto',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  },
  cerrado: {
    label: 'Cerrado',
    badgeClass: 'bg-muted text-muted-foreground border-border',
  },
};

const STATUS_ORDER: ComplaintStatus[] = ['pendiente', 'en_proceso', 'resuelto', 'cerrado'];

function formatDate(value?: string | null): string {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

export default function ComplaintsAdminPage() {
  const { company, refresh } = useConfig();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ComplaintStatus>('all');
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Complaint | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingResponse, setSavingResponse] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingEnabled, setTogglingEnabled] = useState(false);
  const [responseText, setResponseText] = useState('');

  // Image management
  const [bookImage, setBookImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const complaintsEnabled =
    company?.complaints_book_enabled === 'true' ||
    (company?.complaints_book_enabled as unknown as boolean) === true;

  useEffect(() => {
    setBookImage(company?.complaints_book_image ?? '');
  }, [company?.complaints_book_image]);

  const loadComplaints = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('complaints_book')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setComplaints((data as Complaint[]) ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar las quejas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const filtered = complaints.filter((c) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      c.correlativo?.toLowerCase().includes(q) ||
      c.nombre?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.tipo?.toLowerCase().includes(q);
    return matchesSearch && (statusFilter === 'all' || c.status === statusFilter);
  });

  const stats = {
    total: complaints.length,
    pendiente: complaints.filter((c) => c.status === 'pendiente').length,
    en_proceso: complaints.filter((c) => c.status === 'en_proceso').length,
    resuelto: complaints.filter((c) => c.status === 'resuelto').length,
  };

  const handleToggleEnabled = async () => {
    setTogglingEnabled(true);
    try {
      const newValue = !complaintsEnabled;
      const { error } = await supabase
        .from('system_config')
        .update({ value: String(newValue) })
        .eq('key', 'complaints_book_enabled');
      if (error) throw error;
      await refresh?.();
      toast.success(newValue ? 'Libro de Reclamaciones habilitado' : 'Libro de Reclamaciones deshabilitado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar la configuración');
    } finally {
      setTogglingEnabled(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten archivos de imagen');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error('La imagen no puede superar 3 MB');
      return;
    }
    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `complaints/book-image-${Date.now()}.${ext}`;
      const { data: upData, error: upErr } = await supabase.storage
        .from('logos')
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(upData.path);
      const publicUrl = urlData.publicUrl;
      const { error: cfgErr } = await supabase
        .from('system_config')
        .update({ value: publicUrl })
        .eq('key', 'complaints_book_image');
      if (cfgErr) throw cfgErr;
      setBookImage(publicUrl);
      await refresh?.();
      toast.success('Imagen actualizada correctamente');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir la imagen');
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const openDetail = (complaint: Complaint) => {
    setSelected(complaint);
    setResponseText(complaint.respuesta ?? '');
    setDialogOpen(true);
  };

  const handleStatusChange = async (newStatus: ComplaintStatus) => {
    if (!selected) return;
    setSavingStatus(true);
    try {
      const { data, error } = await supabase
        .from('complaints_book')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', selected.id)
        .select('*')
        .single();
      if (error) throw error;
      const updated = data as Complaint;
      setSelected(updated);
      setComplaints((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      toast.success('Estado actualizado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar el estado');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveResponse = async () => {
    if (!selected) return;
    setSavingResponse(true);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('complaints_book')
        .update({
          respuesta: responseText,
          fecha_respuesta: now,
          notificado: true,
          updated_at: now,
        })
        .eq('id', selected.id)
        .select('*')
        .single();
      if (error) throw error;
      const updated = data as Complaint;
      setSelected(updated);
      setComplaints((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      toast.success('Respuesta guardada y usuario notificado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar la respuesta');
    } finally {
      setSavingResponse(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const { error } = await supabase.from('complaints_book').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setComplaints((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      if (selected?.id === deleteTarget.id) {
        setDialogOpen(false);
        setSelected(null);
      }
      toast.success('Queja eliminada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar la queja');
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  const nextStatus = (current: ComplaintStatus): ComplaintStatus | null => {
    const idx = STATUS_ORDER.indexOf(current);
    if (idx === -1 || idx >= STATUS_ORDER.length - 1) return null;
    return STATUS_ORDER[idx + 1];
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Libro de Reclamaciones</h1>
          <p className="text-sm text-muted-foreground">Gestiona las quejas y reclamos de tus clientes</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadComplaints(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Config row: toggle + image */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Toggle */}
        <Card className={`border-2 ${complaintsEnabled ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
          <CardContent className="flex items-center justify-between py-5 gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {complaintsEnabled ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-amber-600" />
                )}
              </div>
              <div>
                <p className="font-semibold text-sm">
                  {complaintsEnabled ? 'Libro habilitado' : 'Libro deshabilitado'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {complaintsEnabled
                    ? 'Los clientes pueden registrar nuevas quejas.'
                    : 'Temporalmente deshabilitado.'}
                </p>
              </div>
            </div>
            <Button
              variant={complaintsEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggleEnabled}
              disabled={togglingEnabled}
              className="gap-2 shrink-0"
            >
              {togglingEnabled ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : complaintsEnabled ? (
                <ToggleRight className="h-4 w-4" />
              ) : (
                <ToggleLeft className="h-4 w-4" />
              )}
              {complaintsEnabled ? 'Habilitado' : 'Deshabilitado'}
            </Button>
          </CardContent>
        </Card>

        {/* Image upload */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              Imagen del Libro
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {bookImage ? (
                <img src={bookImage} alt="Libro de reclamaciones" className="w-full h-full object-contain" />
              ) : (
                <ImageIcon className="w-7 h-7 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-2">
                Imagen que aparece en la página pública del libro.
              </p>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                )}
                {uploadingImage ? 'Subiendo...' : 'Cambiar imagen'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pendiente}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En proceso</CardTitle>
            <Loader2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.en_proceso}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resueltos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{stats.resuelto}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por correlativo, nombre, email o tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | ComplaintStatus)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="en_proceso">En proceso</SelectItem>
            <SelectItem value="resuelto">Resuelto</SelectItem>
            <SelectItem value="cerrado">Cerrado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista de quejas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Cargando quejas...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                {complaints.length === 0
                  ? 'Aún no se han registrado quejas.'
                  : 'No se encontraron quejas con los filtros aplicados.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">Correlativo</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium hidden md:table-cell">Email</th>
                    <th className="px-4 py-3 font-medium hidden lg:table-cell">Fecha</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((c) => {
                    const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.pendiente;
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs">{c.correlativo ?? '-'}</td>
                        <td className="px-4 py-3 capitalize">{c.tipo ?? '-'}</td>
                        <td className="px-4 py-3 font-medium">
                          {c.nombre ?? '-'} {c.apellido ?? ''}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{c.email ?? '-'}</td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{formatDate(c.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className={cfg.badgeClass}>{cfg.label}</Badge>
                            {c.notificado && (
                              <Bell className="h-3 w-3 text-emerald-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDetail(c)}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">Ver</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(c)}
                              disabled={deletingId === c.id}
                            >
                              {deletingId === c.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              <span className="sr-only">Eliminar</span>
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
              Detalle de la queja
              {selected?.correlativo && (
                <span className="font-mono text-sm text-muted-foreground">#{selected.correlativo}</span>
              )}
            </DialogTitle>
            <DialogDescription>Revisa y gestiona el detalle del reclamo registrado.</DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              {/* Status */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Estado actual:</span>
                  <Badge variant="outline" className={STATUS_CONFIG[selected.status].badgeClass}>
                    {STATUS_CONFIG[selected.status].label}
                  </Badge>
                  {selected.notificado && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                      <Bell className="h-3 w-3" />
                      Notificado
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select
                    value={selected.status}
                    onValueChange={(v) => handleStatusChange(v as ComplaintStatus)}
                    disabled={savingStatus}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(() => {
                    const next = nextStatus(selected.status);
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

              {/* Fields grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Tipo" value={selected.tipo} />
                <Field label="Correlativo" value={selected.correlativo} mono />
                <Field label="Nombre" value={`${selected.nombre ?? ''} ${selected.apellido ?? ''}`.trim()} />
                <Field label="Email" value={selected.email} />
                <Field label="Teléfono" value={selected.telefono} />
                <Field label="DNI / Documento" value={selected.dni ?? selected.num_doc} />
                <Field label="Dirección" value={selected.direccion} full />
                <Field label="Descripción del bien" value={selected.descripcion_bien ?? selected.descripcion} full />
                <Field label="Detalle del reclamo" value={selected.detalle} full />
                <Field label="Pedido / Solicitud" value={selected.pedido} full />
                {(typeof selected.monto === 'number' || typeof selected.monto_reclamado === 'number') && (
                  <Field
                    label="Monto reclamado"
                    value={`S/ ${((selected.monto ?? selected.monto_reclamado) as number).toFixed(2)}`}
                  />
                )}
                <Field label="Fecha de registro" value={formatDate(selected.created_at)} />
                {selected.fecha_respuesta && (
                  <Field label="Fecha de respuesta" value={formatDate(selected.fecha_respuesta)} />
                )}
              </div>

              {/* Response */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Respuesta al cliente
                  {selected.notificado && (
                    <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Bell className="h-3 w-3" />
                      Ya respondido — el usuario puede ver esta respuesta
                    </span>
                  )}
                </label>
                <Textarea
                  placeholder="Escribe la respuesta que se mostrará al cliente en su panel..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={5}
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Al guardar, el cliente podrá ver esta respuesta en su panel de reclamos.
                  </p>
                  <Button onClick={handleSaveResponse} disabled={savingResponse || !responseText.trim()}>
                    {savingResponse ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Guardar respuesta
                  </Button>
                </div>
              </div>

              {/* Delete from dialog */}
              <div className="pt-2 border-t border-border flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    setDeleteTarget(selected);
                    setDialogOpen(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar queja
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta queja?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente la queja{' '}
              {deleteTarget?.correlativo ? <strong>#{deleteTarget.correlativo}</strong> : ''} de{' '}
              <strong>{deleteTarget?.nombre}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  full,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-sm ${mono ? 'font-mono' : ''}`}>
        {value && value.trim() !== '' ? value : '-'}
      </p>
    </div>
  );
}
