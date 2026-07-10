import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/backend/client';
import { useConfig } from '@/store/configStore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { toast } from 'sonner';
import { FileText, Eye, CircleCheck as CheckCircle2, Clock, Loader as Loader2, Search, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';

type ComplaintStatus = 'pendiente' | 'en_proceso' | 'resuelto' | 'cerrado';

interface Complaint {
  id: string;
  correlativo: string;
  tipo: string;
  nombre: string;
  email: string;
  telefono?: string;
  dni?: string;
  direccion?: string;
  descripcion: string;
  detalle?: string;
  pedido?: string;
  respuesta?: string;
  monto_reclamado?: number;
  status: ComplaintStatus;
  created_at: string;
  updated_at?: string;
}

const STATUS_CONFIG: Record<
  ComplaintStatus,
  { label: string; color: string; badgeClass: string }
> = {
  pendiente: {
    label: 'Pendiente',
    color: 'amber',
    badgeClass:
      'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20',
  },
  en_proceso: {
    label: 'En proceso',
    color: 'blue',
    badgeClass:
      'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20',
  },
  resuelto: {
    label: 'Resuelto',
    color: 'green',
    badgeClass:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20',
  },
  cerrado: {
    label: 'Cerrado',
    color: 'gray',
    badgeClass:
      'bg-muted text-muted-foreground border-border hover:bg-muted/80',
  },
};

const STATUS_ORDER: ComplaintStatus[] = [
  'pendiente',
  'en_proceso',
  'resuelto',
  'cerrado',
];

function formatDate(value: string): string {
  if (!value) return '-';
  try {
    const date = new Date(value);
    return date.toLocaleString('es-PE', {
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
  const [statusFilter, setStatusFilter] = useState<'all' | ComplaintStatus>(
    'all',
  );
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingResponse, setSavingResponse] = useState(false);
  const [togglingEnabled, setTogglingEnabled] = useState(false);
  const [responseText, setResponseText] = useState('');

  const complaintsEnabled =
    company?.complaints_book_enabled === 'true' || (company?.complaints_book_enabled as unknown as boolean) === true;

  const loadComplaints = useCallback(async () => {
    try {
      if (loading) {
        // first load
      } else {
        setRefreshing(true);
      }
      const { data, error } = await supabase
        .from('complaints_book')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComplaints((data as Complaint[]) ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al cargar las quejas';
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading]);

  useEffect(() => {
    loadComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = complaints.filter((c) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      c.correlativo?.toLowerCase().includes(q) ||
      c.nombre?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.tipo?.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'all' || c.status === statusFilter;

    return matchesSearch && matchesStatus;
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
      toast.success(
        newValue
          ? 'Libro de Reclamaciones habilitado'
          : 'Libro de Reclamaciones deshabilitado',
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Error al actualizar la configuración';
      toast.error(message);
    } finally {
      setTogglingEnabled(false);
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
      setComplaints((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      );
      toast.success('Estado actualizado correctamente');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al actualizar el estado';
      toast.error(message);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveResponse = async () => {
    if (!selected) return;
    setSavingResponse(true);
    try {
      const { data, error } = await supabase
        .from('complaints_book')
        .update({
          respuesta: responseText,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selected.id)
        .select('*')
        .single();

      if (error) throw error;

      const updated = data as Complaint;
      setSelected(updated);
      setComplaints((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      );
      toast.success('Respuesta guardada correctamente');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al guardar la respuesta';
      toast.error(message);
    } finally {
      setSavingResponse(false);
    }
  };

  const nextStatus = (current: ComplaintStatus): ComplaintStatus | null => {
    const idx = STATUS_ORDER.indexOf(current);
    if (idx === -1 || idx >= STATUS_ORDER.length - 1) return null;
    return STATUS_ORDER[idx + 1];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Libro de Reclamaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona las quejas y reclamos de tus clientes
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadComplaints}
          disabled={refreshing}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
          />
          Actualizar
        </Button>
      </div>

      {/* Toggle enabled/disabled */}
      <Card
        className={`border-2 ${
          complaintsEnabled ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'
        }`}
      >
        <CardContent className="flex items-center justify-between py-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {complaintsEnabled ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              ) : (
                <Clock className="h-6 w-6 text-amber-600" />
              )}
            </div>
            <div>
              <p className="font-semibold">
                Libro de Reclamaciones {complaintsEnabled ? 'habilitado' : 'deshabilitado'}
              </p>
              <p className="text-sm text-muted-foreground">
                {complaintsEnabled
                  ? 'Los clientes pueden registrar nuevas quejas.'
                  : 'Los clientes no pueden registrar nuevas quejas temporalmente.'}
              </p>
            </div>
          </div>
          <Button
            variant={complaintsEnabled ? 'default' : 'outline'}
            onClick={handleToggleEnabled}
            disabled={togglingEnabled}
            className="gap-2"
          >
            {togglingEnabled ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : complaintsEnabled ? (
              <ToggleRight className="h-5 w-5" />
            ) : (
              <ToggleLeft className="h-5 w-5" />
            )}
            {complaintsEnabled ? 'Habilitado' : 'Deshabilitado'}
          </Button>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendientes
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {stats.pendiente}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En proceso
            </CardTitle>
            <Loader2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.en_proceso}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resueltos
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {stats.resuelto}
            </div>
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
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as 'all' | ComplaintStatus)}
        >
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
              <span className="ml-2 text-muted-foreground">
                Cargando quejas...
              </span>
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
                    <th className="px-4 py-3 font-medium hidden md:table-cell">
                      Email
                    </th>
                    <th className="px-4 py-3 font-medium hidden lg:table-cell">
                      Fecha
                    </th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((c) => {
                    const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.pendiente;
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => openDetail(c)}
                      >
                        <td className="px-4 py-3 font-mono text-xs">
                          {c.correlativo ?? '-'}
                        </td>
                        <td className="px-4 py-3">{c.tipo ?? '-'}</td>
                        <td className="px-4 py-3 font-medium">
                          {c.nombre ?? '-'}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                          {c.email ?? '-'}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                          {formatDate(c.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cfg.badgeClass}
                          >
                            {cfg.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetail(c);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver detalle</span>
                          </Button>
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
                <span className="font-mono text-sm text-muted-foreground">
                  #{selected.correlativo}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Revisa y gestiona el detalle de la queja registrada.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              {/* Status + advance */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Estado actual:
                  </span>
                  <Badge
                    variant="outline"
                    className={STATUS_CONFIG[selected.status].badgeClass}
                  >
                    {STATUS_CONFIG[selected.status].label}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={selected.status}
                    onValueChange={(v) =>
                      handleStatusChange(v as ComplaintStatus)
                    }
                    disabled={savingStatus}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="en_proceso">En proceso</SelectItem>
                      <SelectItem value="resuelto">Resuelto</SelectItem>
                      <SelectItem value="cerrado">Cerrado</SelectItem>
                    </SelectContent>
                  </Select>
                  {(() => {
                    const next = nextStatus(selected.status);
                    if (!next) return null;
                    return (
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(next)}
                        disabled={savingStatus}
                      >
                        {savingStatus ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                        )}
                        Avanzar a {STATUS_CONFIG[next].label}
                      </Button>
                    );
                  })()}
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Tipo" value={selected.tipo} />
                <Field label="Correlativo" value={selected.correlativo} mono />
                <Field label="Nombre" value={selected.nombre} />
                <Field label="Email" value={selected.email} />
                <Field label="Teléfono" value={selected.telefono} />
                <Field label="DNI" value={selected.dni} />
                <Field
                  label="Dirección"
                  value={selected.direccion}
                  full
                />
                <Field
                  label="Descripción"
                  value={selected.descripcion}
                  full
                />
                <Field label="Detalle" value={selected.detalle} full />
                <Field label="Pedido" value={selected.pedido} full />
                {typeof selected.monto_reclamado === 'number' && (
                  <Field
                    label="Monto reclamado"
                    value={`S/ ${selected.monto_reclamado.toFixed(2)}`}
                  />
                )}
                <Field
                  label="Fecha de registro"
                  value={formatDate(selected.created_at)}
                />
                {selected.updated_at && (
                  <Field
                    label="Última actualización"
                    value={formatDate(selected.updated_at)}
                  />
                )}
              </div>

              {/* Response */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Respuesta a la queja
                </label>
                <Textarea
                  placeholder="Escribe la respuesta que se enviará al cliente..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={5}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveResponse}
                    disabled={savingResponse}
                  >
                    {savingResponse ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Guardar respuesta
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className={`mt-1 text-sm ${mono ? 'font-mono' : ''}`}>
        {value && value.trim() !== '' ? value : '-'}
      </p>
    </div>
  );
}
