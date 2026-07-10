import { useState } from 'react';
import { Link } from '@/lib/router';
import { supabase } from '@/lib/backend/client';
import { useConfig } from '@/store/configStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { FileText, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, Loader as Loader2, ArrowLeft, Search, Clock, CheckCheck, Circle as XCircle, ChevronRight, BookOpen, Package } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { cn } from '@/lib/utils';

interface ComplaintForm {
  tipo: string;
  nombre: string;
  apellido: string;
  tipo_doc: string;
  num_doc: string;
  email: string;
  telefono: string;
  direccion: string;
  es_menor: boolean;
  apoderado_nombre: string;
  apoderado_doc: string;
  tipo_bien: string;
  monto: string;
  descripcion_bien: string;
  detalle: string;
  pedido: string;
}

interface StatusResult {
  correlativo: string;
  tipo: string;
  status: string;
  created_at: string;
  respuesta: string | null;
  fecha_respuesta: string | null;
  nombre: string;
}

const initialForm: ComplaintForm = {
  tipo: 'queja',
  nombre: '',
  apellido: '',
  tipo_doc: 'DNI',
  num_doc: '',
  email: '',
  telefono: '',
  direccion: '',
  es_menor: false,
  apoderado_nombre: '',
  apoderado_doc: '',
  tipo_bien: 'producto',
  monto: '',
  descripcion_bien: '',
  detalle: '',
  pedido: '',
};

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  pendiente:  { label: 'Pendiente',  cls: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/25',   icon: Clock },
  en_proceso: { label: 'En proceso', cls: 'text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/25',        icon: AlertCircle },
  resuelto:   { label: 'Resuelto',   cls: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25', icon: CheckCheck },
  cerrado:    { label: 'Cerrado',    cls: 'text-muted-foreground bg-muted border-border', icon: XCircle },
};

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return d; }
}

type Tab = 'registrar' | 'consultar';

// ── Field wrapper ──────────────────────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

// ── Section heading ────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/60 mb-5">
      <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">{children}</h2>
    </div>
  );
}

export default function LibroReclamacionesPage() {
  const { company } = useConfig();
  const complaintsEnabled = company.complaints_book_enabled === 'true';
  const bookImage = company.complaints_book_image || '';

  const [tab, setTab] = useState<Tab>('registrar');
  const [form, setForm] = useState<ComplaintForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [correlativo, setCorrelativo] = useState('');

  // Consultar estado
  const [searchCode, setSearchCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [statusResult, setStatusResult] = useState<StatusResult | null>(null);
  const [searchError, setSearchError] = useState('');

  const set = <K extends keyof ComplaintForm>(k: K, v: ComplaintForm[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return false; }
    if (!form.apellido.trim()) { toast.error('El apellido es obligatorio'); return false; }
    if (!form.num_doc.trim()) { toast.error('El número de documento es obligatorio'); return false; }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('Ingresa un correo electrónico válido'); return false;
    }
    if (form.es_menor) {
      if (!form.apoderado_nombre.trim()) { toast.error('El nombre del apoderado es obligatorio'); return false; }
      if (!form.apoderado_doc.trim()) { toast.error('El documento del apoderado es obligatorio'); return false; }
    }
    if (!form.descripcion_bien.trim()) { toast.error('La descripción del producto o servicio es obligatoria'); return false; }
    if (!form.detalle.trim()) { toast.error('El detalle del reclamo es obligatorio'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('complaints_book')
        .insert({
          tipo: form.tipo,
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          tipo_doc: form.tipo_doc,
          num_doc: form.num_doc.trim(),
          email: form.email.trim(),
          telefono: form.telefono.trim() || null,
          direccion: form.direccion.trim() || null,
          es_menor: form.es_menor,
          apoderado_nombre: form.es_menor ? form.apoderado_nombre.trim() || null : null,
          apoderado_doc: form.es_menor ? form.apoderado_doc.trim() || null : null,
          tipo_bien: form.tipo_bien,
          monto: form.monto ? parseFloat(form.monto) : null,
          descripcion_bien: form.descripcion_bien.trim(),
          detalle: form.detalle.trim(),
          pedido: form.pedido.trim() || null,
        })
        .select('correlativo')
        .single();
      if (error) throw error;
      setCorrelativo(data?.correlativo || '');
      setSuccess(true);
      toast.success('Tu reclamo se registró correctamente');
    } catch {
      toast.error('Ocurrió un error al registrar tu reclamo. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleConsultar = async () => {
    if (!searchCode.trim()) { toast.error('Ingresa tu código de seguimiento'); return; }
    setSearching(true);
    setStatusResult(null);
    setSearchError('');
    try {
      const { data, error } = await supabase
        .from('complaints_book')
        .select('correlativo, tipo, status, created_at, respuesta, fecha_respuesta, nombre')
        .eq('correlativo', searchCode.trim().toUpperCase())
        .maybeSingle();
      if (error) throw error;
      if (!data) { setSearchError('No se encontró ningún reclamo con ese código.'); }
      else { setStatusResult(data as StatusResult); }
    } catch {
      setSearchError('Error al consultar. Verifica el código e inténtalo de nuevo.');
    } finally {
      setSearching(false);
    }
  };

  // ── Disabled ──────────────────────────────────────────────────────────────
  if (!complaintsEnabled) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">Libro de Reclamaciones no disponible</h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              En este momento el Libro de Reclamaciones no se encuentra habilitado.
              Si deseas presentar un reclamo, contáctanos directamente.
            </p>
            <Button asChild><Link to="/"><ArrowLeft className="w-4 h-4 mr-2" />Volver al inicio</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 py-10 sm:py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">

          {/* ── Back ── */}
          <nav className="mb-8">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
            </Link>
          </nav>

          {/* ── Hero header ── */}
          <div className="flex items-start gap-5 mb-8">
            {bookImage ? (
              <img src={bookImage} alt="Libro de Reclamaciones" className="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0" />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-2">
                Libro de Reclamaciones
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Conforme a la Ley N° 29571 — Código de Protección y Defensa del Consumidor.
                Tu solicitud será atendida en un plazo máximo de 30 días calendario.
              </p>
            </div>
          </div>

          {/* ── Queja / Reclamo cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            <div className={cn(
              'flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer',
              form.tipo === 'queja'
                ? 'border-amber-500/40 bg-amber-500/10 ring-1 ring-amber-500/20'
                : 'border-border/60 bg-card hover:border-amber-500/20 hover:bg-amber-500/5',
            )} onClick={() => set('tipo', 'queja')}>
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Queja</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                  Disconformidad con la atención del servicio.
                </p>
              </div>
            </div>
            <div className={cn(
              'flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer',
              form.tipo === 'reclamo'
                ? 'border-blue-500/40 bg-blue-500/10 ring-1 ring-blue-500/20'
                : 'border-border/60 bg-card hover:border-blue-500/20 hover:bg-blue-500/5',
            )} onClick={() => set('tipo', 'reclamo')}>
              <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                <Package className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Reclamo</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                  Disconformidad con el producto o servicio adquirido.
                </p>
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border/50 mb-8">
            {([['registrar', 'Registrar reclamo', FileText], ['consultar', 'Consultar estado', Search]] as const).map(([t, label, Icon]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
                  tab === t
                    ? 'bg-background text-foreground shadow-sm border border-border/60'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* ══════════════ REGISTRAR TAB ══════════════ */}
          {tab === 'registrar' && (
            <>
              {success ? (
                /* ── Success ── */
                <div className="text-center py-10">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Reclamo registrado</h2>
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-sm mx-auto">
                    Tu solicitud fue registrada. Guarda el código de seguimiento para consultar el estado.
                  </p>
                  <div className="inline-flex flex-col items-center gap-1.5 px-8 py-4 bg-muted/60 border border-border rounded-2xl mb-8">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Código de seguimiento</span>
                    <span className="text-3xl font-black text-foreground tracking-wider font-mono">{correlativo || '—'}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button variant="outline" onClick={() => { setForm(initialForm); setSuccess(false); setCorrelativo(''); }}>
                      Registrar otro reclamo
                    </Button>
                    <Button onClick={() => { setTab('consultar'); setSearchCode(correlativo); }}>
                      <Search className="w-4 h-4 mr-2" />
                      Consultar mi reclamo
                    </Button>
                  </div>
                </div>
              ) : (
                /* ── Form ── */
                <form onSubmit={handleSubmit} className="space-y-10">
                  {/* Section 1: Datos del consumidor */}
                  <section>
                    <SectionTitle>Datos del consumidor</SectionTitle>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Nombre" required>
                          <Input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Tu nombre" />
                        </Field>
                        <Field label="Apellido" required>
                          <Input value={form.apellido} onChange={e => set('apellido', e.target.value)} placeholder="Tu apellido" />
                        </Field>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <Field label="Tipo doc.">
                          <Select value={form.tipo_doc} onValueChange={v => set('tipo_doc', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DNI">DNI</SelectItem>
                              <SelectItem value="CE">CE</SelectItem>
                              <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                              <SelectItem value="RUC">RUC</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <div className="col-span-2">
                          <Field label="Número de documento" required>
                            <Input value={form.num_doc} onChange={e => set('num_doc', e.target.value)} placeholder="Número" />
                          </Field>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Correo electrónico" required>
                          <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="tu@email.com" />
                        </Field>
                        <Field label="Teléfono">
                          <Input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="Opcional" />
                        </Field>
                      </div>

                      <Field label="Dirección">
                        <Input value={form.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Domicilio (opcional)" />
                      </Field>

                      {/* Menor de edad */}
                      <div className="flex items-center gap-2.5 pt-1">
                        <Checkbox id="es_menor" checked={form.es_menor} onCheckedChange={v => set('es_menor', v === true)} />
                        <Label htmlFor="es_menor" className="text-sm cursor-pointer text-muted-foreground">
                          El consumidor es menor de edad
                        </Label>
                      </div>
                      {form.es_menor && (
                        <div className="pl-4 border-l-2 border-primary/20 grid grid-cols-2 gap-3">
                          <Field label="Nombre del apoderado" required>
                            <Input value={form.apoderado_nombre} onChange={e => set('apoderado_nombre', e.target.value)} placeholder="Nombre" />
                          </Field>
                          <Field label="Documento del apoderado" required>
                            <Input value={form.apoderado_doc} onChange={e => set('apoderado_doc', e.target.value)} placeholder="Documento" />
                          </Field>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Section 2: Detalle */}
                  <section>
                    <SectionTitle>Detalle del producto o servicio</SectionTitle>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Tipo de bien">
                          <Select value={form.tipo_bien} onValueChange={v => set('tipo_bien', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="producto">Producto</SelectItem>
                              <SelectItem value="servicio">Servicio</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Monto reclamado (S/)">
                          <Input type="number" min="0" step="0.01" value={form.monto} onChange={e => set('monto', e.target.value)} placeholder="0.00" />
                        </Field>
                      </div>

                      <Field label="Descripción del producto o servicio" required>
                        <Input value={form.descripcion_bien} onChange={e => set('descripcion_bien', e.target.value)} placeholder="Describe el producto o servicio" />
                      </Field>

                      <Field label="Detalle del reclamo o queja" required>
                        <Textarea value={form.detalle} onChange={e => set('detalle', e.target.value)} placeholder="Describe con detalle los hechos de tu reclamo o queja..." rows={5} />
                      </Field>

                      <Field label="Pedido (¿qué solicitas?)">
                        <Textarea value={form.pedido} onChange={e => set('pedido', e.target.value)} placeholder="Indica qué solución esperas (opcional)" rows={3} />
                      </Field>
                    </div>
                  </section>

                  {/* Submit */}
                  <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2 border-t border-border/50">
                    <Button type="button" variant="ghost" asChild>
                      <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" />Cancelar</Link>
                    </Button>
                    <Button type="submit" disabled={loading} className="sm:ml-auto sm:min-w-[200px]">
                      {loading
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>
                        : <><FileText className="w-4 h-4 mr-2" />Registrar reclamo</>}
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* ══════════════ CONSULTAR TAB ══════════════ */}
          {tab === 'consultar' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Ingresa el código de seguimiento que recibiste al registrar tu reclamo.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      value={searchCode}
                      onChange={e => { setSearchCode(e.target.value.toUpperCase()); setStatusResult(null); setSearchError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleConsultar()}
                      placeholder="Ej. RCL-2024-001"
                      className="pl-9 font-mono tracking-wider"
                    />
                  </div>
                  <Button onClick={handleConsultar} disabled={searching || !searchCode.trim()} className="shrink-0">
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                    <span className="hidden sm:inline">Consultar</span>
                  </Button>
                </div>
              </div>

              {/* Error */}
              {searchError && (
                <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {searchError}
                </div>
              )}

              {/* Result */}
              {statusResult && (() => {
                const sc = STATUS_CONFIG[statusResult.status] ?? STATUS_CONFIG.pendiente;
                const Icon = sc.icon;
                return (
                  <div className="border border-border/60 rounded-2xl overflow-hidden">
                    {/* Header strip */}
                    <div className={cn('flex items-center justify-between px-5 py-4 border-b border-border/50', statusResult.status === 'resuelto' ? 'bg-emerald-500/5' : 'bg-muted/30')}>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Código</p>
                        <p className="text-lg font-black font-mono text-foreground tracking-wider">{statusResult.correlativo}</p>
                      </div>
                      <div className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold', sc.cls)}>
                        <Icon className="w-3.5 h-3.5" />
                        {sc.label}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground/60 uppercase tracking-wide font-medium mb-0.5">Tipo</p>
                          <p className="font-medium text-foreground capitalize">{statusResult.tipo}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground/60 uppercase tracking-wide font-medium mb-0.5">Solicitante</p>
                          <p className="font-medium text-foreground">{statusResult.nombre}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground/60 uppercase tracking-wide font-medium mb-0.5">Registrado</p>
                          <p className="font-medium text-foreground">{formatDate(statusResult.created_at)}</p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div>
                        <div className="flex justify-between mb-2">
                          {(['pendiente', 'en_proceso', 'resuelto', 'cerrado'] as const).map((s, i) => {
                            const steps = ['pendiente', 'en_proceso', 'resuelto', 'cerrado'];
                            const current = steps.indexOf(statusResult.status);
                            const done = i <= current;
                            return (
                              <div key={s} className="flex flex-col items-center gap-1 flex-1">
                                <div className={cn('w-2.5 h-2.5 rounded-full border-2 transition-colors', done ? 'bg-primary border-primary' : 'border-border bg-background')} />
                                <span className={cn('text-[9px] font-medium hidden sm:block', done ? 'text-primary' : 'text-muted-foreground/40')}>
                                  {STATUS_CONFIG[s]?.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${(['pendiente', 'en_proceso', 'resuelto', 'cerrado'].indexOf(statusResult.status) / 3) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Response */}
                      {statusResult.respuesta ? (
                        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Respuesta</p>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{statusResult.respuesta}</p>
                          {statusResult.fecha_respuesta && (
                            <p className="text-xs text-muted-foreground/60">Respondido el {formatDate(statusResult.fecha_respuesta)}</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground/60 py-2">
                          <Clock className="w-4 h-4" />
                          Aún sin respuesta. Te notificaremos cuando haya novedades.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* No search yet */}
              {!statusResult && !searchError && !searching && (
                <div className="py-16 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground/60">Ingresa tu código para ver el estado de tu reclamo.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
