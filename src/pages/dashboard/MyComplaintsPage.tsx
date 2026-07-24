import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/backend/client';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { FileText, Search, RefreshCw, Clock, CircleCheck as CheckCheck, CircleAlert as AlertCircle, Circle as XCircle, X, ChevronRight, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, useNavigate } from '@/lib/router';
import { cn } from '@/lib/utils';

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

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  pendiente:  { label: 'Pendiente',  cls: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/25',        icon: Clock },
  en_proceso: { label: 'En proceso', cls: 'text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/25',            icon: AlertCircle },
  resuelto:   { label: 'Resuelto',   cls: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25', icon: CheckCheck },
  cerrado:    { label: 'Cerrado',    cls: 'text-muted-foreground bg-muted border-border', icon: XCircle },
};

function getStatus(s: string) {
  return STATUS_CONFIG[s] ?? { label: s, cls: 'text-muted-foreground bg-muted border-border', icon: AlertCircle };
}

const TIPO_LABELS: Record<string, string> = {
  reclamo: 'Reclamo', queja: 'Queja', consulta: 'Consulta', sugerencia: 'Sugerencia',
};

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return d; }
}
function fmtDateTime(d: string) {
  try { return new Date(d).toLocaleString('es-PE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Clock; color: string }) {
  return (
    <div className="bg-card border border-border/60 rounded-xl p-4 flex items-center gap-3">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', color.replace('text-', 'bg-').replace(/\/([\w]+)$/, '/12'))}>
        <Icon className={cn('w-4 h-4', color)} />
      </div>
      <div>
        <div className="text-xl font-bold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

// ── Detail panel (slide-in) ──────────────────────────────────────────────────
function DetailPanel({ complaint, onClose }: { complaint: Complaint; onClose: () => void }) {
  const sc = getStatus(complaint.status);
  const Icon = sc.icon;
  const steps = ['pendiente', 'en_proceso', 'resuelto', 'cerrado'];
  const currentStep = steps.indexOf(complaint.status);

  const stepColors: Array<{ dot: string; bar: string; text: string }> = [
    { dot: 'bg-amber-500 border-amber-500', bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
    { dot: 'bg-blue-500 border-blue-500', bar: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
    { dot: 'bg-emerald-500 border-emerald-500', bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
    { dot: 'bg-muted-foreground border-muted-foreground', bar: 'bg-muted-foreground', text: 'text-muted-foreground' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-lg bg-background border border-border/60 rounded-t-xl sm:rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div>
            <p className="text-xs text-muted-foreground/60 uppercase tracking-wider font-semibold mb-0.5">Correlativo</p>
            <p className="text-lg font-bold font-mono tracking-widest text-foreground">{complaint.correlativo || '—'}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold', sc.cls)}>
              <Icon className="w-3 h-3" />
              {sc.label}
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors ml-1">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Progress */}
          <div>
            <div className="flex justify-between mb-2">
              {steps.map((s, i) => {
                const done = i <= currentStep;
                const cfg = STATUS_CONFIG[s];
                const col = stepColors[i];
                return (
                  <div key={s} className="flex flex-col items-center gap-1 flex-1">
                    <div className={cn('w-2.5 h-2.5 rounded-full border-2 transition-colors', done ? col.dot : 'border-border bg-background')} />
                    <span className={cn('text-[9px] font-medium hidden sm:block', done ? col.text : 'text-muted-foreground/40')}>
                      {cfg?.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', stepColors[currentStep]?.bar || 'bg-primary')} style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }} />
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Tipo', value: TIPO_LABELS[complaint.tipo] ?? complaint.tipo ?? 'N/A' },
              { label: 'Solicitante', value: `${complaint.nombre ?? ''} ${complaint.apellido ?? ''}`.trim() },
              { label: 'Correo', value: complaint.email ?? '—' },
              { label: 'Fecha registro', value: fmtDate(complaint.created_at) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-muted/30 rounded-lg px-3 py-2.5 border border-border/40">
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-sm text-foreground font-medium truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Detalle */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wide mb-2">Detalle del reclamo</p>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap bg-muted/20 border border-border/40 rounded-lg p-3">
              {complaint.detalle || 'Sin detalle'}
            </p>
          </div>

          {/* Respuesta */}
          {complaint.respuesta ? (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1.5">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Respuesta</p>
              </div>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{complaint.respuesta}</p>
              {complaint.fecha_respuesta && (
                <p className="text-xs text-muted-foreground/50 mt-1">Respondido el {fmtDateTime(complaint.fecha_respuesta)}</p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground/55 py-1">
              <Clock className="w-4 h-4" />
              Sin respuesta aún. Te notificaremos cuando haya novedades.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function MyComplaintsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Complaint | null>(null);

  const load = useCallback(async () => {
    if (!user?.email) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('complaints_book')
        .select('id, correlativo, tipo, nombre, apellido, email, detalle, status, respuesta, created_at, fecha_respuesta')
        .eq('email', user.email)
        .order('created_at', { ascending: false });
      if (error) { toast.error('No se pudieron cargar tus reclamos.'); setComplaints([]); }
      else { setComplaints((data as Complaint[]) || []); }
    } catch { toast.error('Error al cargar tus reclamos.'); setComplaints([]); }
    finally { setLoading(false); }
  }, [user?.email]);

  useEffect(() => { load(); }, [load]);

  const stats = {
    total: complaints.length,
    pendiente: complaints.filter(c => c.status === 'pendiente').length,
    en_proceso: complaints.filter(c => c.status === 'en_proceso').length,
    resuelto: complaints.filter(c => c.status === 'resuelto').length,
  };

  const filtered = complaints.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.correlativo?.toLowerCase().includes(q) || c.tipo?.toLowerCase().includes(q) || c.detalle?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mis Reclamos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Consulta y gestiona tus solicitudes registradas.</p>
        </div>
        <Button onClick={() => navigate('/libro-reclamaciones')} className="w-full sm:w-auto">
          <FileText className="w-4 h-4 mr-2" />
          Nuevo reclamo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} icon={FileText} color="text-foreground" />
        <StatCard label="Pendientes" value={stats.pendiente} icon={Clock} color="text-amber-600 dark:text-amber-400" />
        <StatCard label="En proceso" value={stats.en_proceso} icon={AlertCircle} color="text-blue-600 dark:text-blue-400" />
        <StatCard label="Resueltos" value={stats.resuelto} icon={CheckCheck} color="text-emerald-600 dark:text-emerald-400" />
      </div>

      {/* Search + refresh */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por correlativo, tipo o detalle..."
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label="Actualizar" className="shrink-0">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-card border border-border/60 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-5 w-16 rounded-full" /></div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="w-5 h-5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <p className="font-semibold text-foreground mb-1">
            {search.trim() ? 'Sin resultados' : 'Aún no tienes reclamos'}
          </p>
          <p className="text-sm text-muted-foreground/60 mb-6 max-w-xs mx-auto">
            {search.trim()
              ? 'Prueba con otro término.'
              : 'Puedes presentar un reclamo a través del libro de reclamaciones.'}
          </p>
          {!search.trim() && (
            <Button onClick={() => navigate('/libro-reclamaciones')}>
              <FileText className="w-4 h-4 mr-2" />
              Presentar un reclamo
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => {
            const sc = getStatus(c.status);
            const Icon = sc.icon;
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="w-full text-left bg-card border border-border/60 hover:border-primary/30 rounded-xl p-4 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border', sc.cls)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold text-foreground font-mono tracking-wide">
                        {c.correlativo || 'Sin correlativo'}
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground/60 bg-muted/60 border border-border/50 px-2 py-0.5 rounded-full">
                        {TIPO_LABELS[c.tipo] ?? c.tipo ?? 'N/A'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground/60 mb-1.5">{fmtDate(c.created_at)}</p>
                    <p className="text-sm text-foreground/70 line-clamp-2 leading-relaxed">{c.detalle || 'Sin detalle'}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 shrink-0 mt-1 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Back */}
      <div className="pt-2 border-t border-border/40">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />Volver al panel
        </Link>
      </div>

      {/* Detail panel */}
      {selected && <DetailPanel complaint={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
