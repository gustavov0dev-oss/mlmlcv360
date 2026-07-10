import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/backend/client';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { FileText, Search, RefreshCw, Eye, Clock, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, Circle as XCircle, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, useNavigate } from '@/lib/router';

interface Complaint {
  id: string;
  correlativo: string;
  tipo: string;
  nombre: string;
  apellido: string;
  email: string;
  detalle: string;
  status: string;
  respuesta: string | null;
  created_at: string;
  fecha_respuesta: string | null;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; Icon: typeof Clock }
> = {
  pendiente: {
    label: 'Pendiente',
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    Icon: Clock,
  },
  en_proceso: {
    label: 'En proceso',
    className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
    Icon: AlertCircle,
  },
  resuelto: {
    label: 'Resuelto',
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    Icon: CheckCircle2,
  },
  cerrado: {
    label: 'Cerrado',
    className: 'bg-muted text-muted-foreground border-border',
    Icon: XCircle,
  },
};

const TIPO_LABELS: Record<string, string> = {
  reclamo: 'Reclamo',
  queja: 'Queja',
  consulta: 'Consulta',
  sugerencia: 'Sugerencia',
};

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status] || {
      label: status || 'Desconocido',
      className: 'bg-muted text-muted-foreground border-border',
      Icon: AlertCircle,
    }
  );
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function MyComplaintsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadComplaints = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('complaints_book')
        .select(
          'id, correlativo, tipo, nombre, apellido, email, detalle, status, respuesta, created_at, fecha_respuesta'
        )
        .eq('email', user.email)
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('No se pudieron cargar tus reclamos.');
        setComplaints([]);
      } else {
        setComplaints((data as Complaint[]) || []);
      }
    } catch {
      toast.error('Ocurrió un error al cargar tus reclamos.');
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const stats = {
    total: complaints.length,
    pendiente: complaints.filter((c) => c.status === 'pendiente').length,
    en_proceso: complaints.filter((c) => c.status === 'en_proceso').length,
    resuelto: complaints.filter((c) => c.status === 'resuelto').length,
  };

  const filtered = complaints.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      c.correlativo?.toLowerCase().includes(q) ||
      c.tipo?.toLowerCase().includes(q) ||
      c.detalle?.toLowerCase().includes(q) ||
      c.status?.toLowerCase().includes(q)
    );
  });

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mis Reclamos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona y consulta el estado de tus reclamos registrados.
          </p>
        </div>
        <Button
          onClick={() => navigate('/libro-reclamaciones')}
          className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
        >
          <FileText className="w-4 h-4 mr-2" />
          Nuevo Reclamo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total
            </CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Pendientes
            </CardTitle>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.pendiente}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              En proceso
            </CardTitle>
            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.en_proceso}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Resueltos
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.resuelto}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por correlativo, tipo o detalle..."
            className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <Button
          variant="outline"
          onClick={loadComplaints}
          disabled={loading}
          className="border-border text-foreground hover:bg-muted hover:text-foreground"
          aria-label="Actualizar"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline ml-2">Actualizar</span>
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[0,1,2].map(i => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-5 w-16 rounded-full" /><Skeleton className="h-5 w-20 rounded-full" /></div>
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                <Skeleton className="h-4 w-4 mt-1" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-card border border-border rounded-2xl">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <FileText className="w-7 h-7 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">
              {search.trim()
                ? 'No se encontraron reclamos'
                : 'Aún no tienes reclamos registrados'}
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {search.trim()
                ? 'Prueba con otros términos de búsqueda.'
                : 'Si tienes un inconveniente, puedes presentar un reclamo a través del libro de reclamaciones.'}
            </p>
          </div>
          {!search.trim() && (
            <Button
              onClick={() => navigate('/libro-reclamaciones')}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <FileText className="w-4 h-4 mr-2" />
              Presentar un reclamo
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((complaint) => {
            const sc = getStatusConfig(complaint.status);
            const isExpanded = expandedId === complaint.id;
            return (
              <Card
                key={complaint.id}
                className="bg-card border-border hover:border-primary/40 hover:shadow-md transition-all overflow-hidden"
              >
                <button
                  onClick={() => toggleExpand(complaint.id)}
                  className="w-full text-left p-4 sm:p-5"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground truncate">
                          {complaint.correlativo || 'Sin correlativo'}
                        </span>
                        <Badge
                          variant="outline"
                          className="bg-muted text-muted-foreground border-border"
                        >
                          {TIPO_LABELS[complaint.tipo] || complaint.tipo || 'N/A'}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`border ${sc.className}`}
                        >
                          <sc.Icon className="w-3 h-3 mr-1" />
                          {sc.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {formatDate(complaint.created_at)}
                      </p>
                      <p
                        className={`text-sm text-foreground/80 mt-2 ${
                          isExpanded ? '' : 'line-clamp-2'
                        }`}
                      >
                        {complaint.detalle || 'Sin detalle'}
                      </p>
                    </div>
                    <Eye
                      className={`w-4 h-4 text-muted-foreground flex-shrink-0 mt-1 ${
                        isExpanded ? 'text-primary' : ''
                      }`}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 p-4 sm:p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Solicitante
                        </p>
                        <p className="text-sm text-foreground mt-1">
                          {complaint.nombre || '—'} {complaint.apellido || ''}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {complaint.email || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Fecha de registro
                        </p>
                        <p className="text-sm text-foreground mt-1">
                          {formatDateTime(complaint.created_at)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Detalle
                      </p>
                      <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">
                        {complaint.detalle || 'Sin detalle'}
                      </p>
                    </div>

                    {complaint.respuesta ? (
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                            Respuesta
                          </p>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {complaint.respuesta}
                        </p>
                        {complaint.fecha_respuesta && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Respondido el {formatDateTime(complaint.fecha_respuesta)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>Sin respuesta aún.</span>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Back link */}
      <div className="pt-2">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al panel
        </Link>
      </div>
    </div>
  );
}
