import { useState } from 'react';
import { Link } from '@/lib/router';
import { supabase } from '@/lib/backend/client';
import { useConfig } from '@/store/configStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  FileText,
  CircleCheck as CheckCircle2,
  CircleAlert as AlertCircle,
  Loader as Loader2,
  ArrowLeft,
  Search,
  Clock,
  MessageSquare,
} from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

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

interface TrackResult {
  correlativo: string;
  tipo: string;
  nombre: string;
  apellido?: string;
  status: string;
  respuesta?: string;
  created_at: string;
  fecha_respuesta?: string;
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

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pendiente: {
    label: 'Pendiente',
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  },
  en_proceso: {
    label: 'En proceso',
    className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  },
  resuelto: {
    label: 'Resuelto',
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  },
  cerrado: {
    label: 'Cerrado',
    className: 'bg-muted text-muted-foreground border-border',
  },
};

function formatDate(value?: string | null): string {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

type Tab = 'registrar' | 'consultar';

export default function LibroReclamacionesPage() {
  const { company } = useConfig();
  const complaintsBookEnabled = company.complaints_book_enabled === 'true';
  const bookImage = company.complaints_book_image as string | undefined;

  const [activeTab, setActiveTab] = useState<Tab>('registrar');

  // Register form
  const [form, setForm] = useState<ComplaintForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [correlativo, setCorrelativo] = useState<string>('');

  // Tracking
  const [trackCode, setTrackCode] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackResult, setTrackResult] = useState<TrackResult | null>(null);
  const [trackNotFound, setTrackNotFound] = useState(false);

  const updateField = <K extends keyof ComplaintForm>(key: K, value: ComplaintForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): boolean => {
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return false; }
    if (!form.apellido.trim()) { toast.error('El apellido es obligatorio'); return false; }
    if (!form.num_doc.trim()) { toast.error('El número de documento es obligatorio'); return false; }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('Ingresa un correo electrónico válido');
      return false;
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
      const payload = {
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
      };

      const { data, error } = await supabase
        .from('complaints_book')
        .insert(payload)
        .select('correlativo')
        .single();

      if (error) throw error;
      setCorrelativo(data?.correlativo || '');
      setSuccess(true);
      toast.success('Tu reclamo se registró correctamente');
    } catch (err) {
      console.error('Error al registrar reclamo:', err);
      toast.error('Ocurrió un error al registrar tu reclamo. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(initialForm);
    setSuccess(false);
    setCorrelativo('');
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = trackCode.trim().toUpperCase();
    if (!code) { toast.error('Ingresa tu código de seguimiento'); return; }
    setTrackLoading(true);
    setTrackResult(null);
    setTrackNotFound(false);
    try {
      const { data, error } = await supabase
        .from('complaints_book')
        .select('correlativo, tipo, nombre, apellido, status, respuesta, created_at, fecha_respuesta')
        .eq('correlativo', code)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setTrackNotFound(true);
      } else {
        setTrackResult(data as TrackResult);
      }
    } catch (err) {
      toast.error('Error al consultar el estado.');
    } finally {
      setTrackLoading(false);
    }
  };

  // ── Disabled state ───────────────────────────────────────────────────────
  if (!complaintsBookEnabled) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">
              Libro de Reclamaciones no disponible
            </h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              En este momento el Libro de Reclamaciones no se encuentra habilitado.
              Si deseas presentar un reclamo o queja, por favor contáctanos directamente
              y con gusto te asistiremos.
            </p>
            <Button asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al inicio
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 py-10 sm:py-14">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver al inicio
            </Link>
          </nav>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              {bookImage ? (
                <img src={bookImage} alt="Libro de Reclamaciones" className="w-12 h-12 object-contain" />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-3">
              Libro de Reclamaciones
            </h1>
            <p className="text-muted-foreground leading-relaxed max-w-xl mx-auto">
              Conforme a la Ley N° 29571 — Código de Protección y Defensa del Consumidor,
              ponemos a tu disposición este libro para registrar tu queja o reclamo.
              Tu solicitud será atendida dentro de los plazos establecidos por la normativa peruana.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-muted rounded-xl w-full mb-6">
            <button
              onClick={() => setActiveTab('registrar')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'registrar'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-4 h-4" />
              Registrar reclamo
            </button>
            <button
              onClick={() => setActiveTab('consultar')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'consultar'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Search className="w-4 h-4" />
              Consultar estado
            </button>
          </div>

          {/* ── REGISTRAR TAB ───────────────────────────────────────────── */}
          {activeTab === 'registrar' && (
            <>
              {/* Info card */}
              <Card className="mb-6 border-primary/20 bg-primary/5">
                <CardContent className="pt-5 pb-5">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      <p className="font-medium text-foreground mb-1">Información importante</p>
                      <ul className="space-y-1 list-disc list-inside">
                        <li><strong>Queja:</strong> disconformidad relacionada a la atención del servicio.</li>
                        <li><strong>Reclamo:</strong> disconformidad relacionada al producto o servicio adquirido.</li>
                        <li>El plazo máximo de respuesta es de 30 días calendario.</li>
                        <li>Recibirás un código de seguimiento para consultar el estado de tu reclamo.</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Success screen */}
              {success ? (
                <Card className="border-emerald-500/30 bg-emerald-500/5">
                  <CardContent className="pt-8 pb-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
                      <CheckCircle2 className="w-9 h-9 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Reclamo registrado</h2>
                    <p className="text-muted-foreground mb-5 leading-relaxed">
                      Tu solicitud se registró correctamente. Guarda el siguiente código
                      para consultar el estado de tu reclamo en cualquier momento.
                    </p>
                    <div className="inline-flex flex-col items-center gap-1 px-6 py-4 bg-muted border border-border rounded-xl mb-3">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Código de seguimiento
                      </span>
                      <span className="text-2xl font-bold text-foreground tracking-wide">
                        {correlativo || 'Generando...'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-6">
                      Usa este código en la pestaña "Consultar estado" para ver el avance de tu reclamo.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setActiveTab('consultar');
                          setTrackCode(correlativo);
                        }}
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Consultar estado
                      </Button>
                      <Button onClick={handleReset} variant="outline">
                        Registrar otro reclamo
                      </Button>
                      <Button asChild>
                        <Link to="/">
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Volver al inicio
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <form onSubmit={handleSubmit}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Datos del consumidor</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="space-y-2">
                        <Label>Tipo de solicitud <span className="text-destructive">*</span></Label>
                        <Select value={form.tipo} onValueChange={(v) => updateField('tipo', v)}>
                          <SelectTrigger><SelectValue placeholder="Selecciona el tipo" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="queja">Queja</SelectItem>
                            <SelectItem value="reclamo">Reclamo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="nombre">Nombre <span className="text-destructive">*</span></Label>
                          <Input id="nombre" value={form.nombre} onChange={(e) => updateField('nombre', e.target.value)} placeholder="Tu nombre" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="apellido">Apellido <span className="text-destructive">*</span></Label>
                          <Input id="apellido" value={form.apellido} onChange={(e) => updateField('apellido', e.target.value)} placeholder="Tu apellido" required />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tipo_doc">Tipo de documento</Label>
                          <Select value={form.tipo_doc} onValueChange={(v) => updateField('tipo_doc', v)}>
                            <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DNI">DNI</SelectItem>
                              <SelectItem value="CE">Carnet de Extranjería</SelectItem>
                              <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                              <SelectItem value="RUC">RUC</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="num_doc">Número de documento <span className="text-destructive">*</span></Label>
                          <Input id="num_doc" value={form.num_doc} onChange={(e) => updateField('num_doc', e.target.value)} placeholder="Número de documento" required />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Correo electrónico <span className="text-destructive">*</span></Label>
                          <Input id="email" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="tu@email.com" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="telefono">Teléfono</Label>
                          <Input id="telefono" value={form.telefono} onChange={(e) => updateField('telefono', e.target.value)} placeholder="Teléfono de contacto" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="direccion">Dirección</Label>
                        <Input id="direccion" value={form.direccion} onChange={(e) => updateField('direccion', e.target.value)} placeholder="Dirección de domicilio (opcional)" />
                      </div>

                      <div className="space-y-3 pt-1">
                        <div className="flex items-center gap-2">
                          <Checkbox id="es_menor" checked={form.es_menor} onCheckedChange={(v) => updateField('es_menor', v === true)} />
                          <Label htmlFor="es_menor" className="text-sm cursor-pointer">El consumidor es menor de edad</Label>
                        </div>
                        {form.es_menor && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6 border-l-2 border-primary/20">
                            <div className="space-y-2">
                              <Label htmlFor="apoderado_nombre">Nombre del apoderado <span className="text-destructive">*</span></Label>
                              <Input id="apoderado_nombre" value={form.apoderado_nombre} onChange={(e) => updateField('apoderado_nombre', e.target.value)} placeholder="Nombre del apoderado" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="apoderado_doc">Documento del apoderado <span className="text-destructive">*</span></Label>
                              <Input id="apoderado_doc" value={form.apoderado_doc} onChange={(e) => updateField('apoderado_doc', e.target.value)} placeholder="Documento del apoderado" />
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="text-lg">Detalle del producto o servicio</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tipo_bien">Tipo de bien</Label>
                          <Select value={form.tipo_bien} onValueChange={(v) => updateField('tipo_bien', v)}>
                            <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="producto">Producto</SelectItem>
                              <SelectItem value="servicio">Servicio</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="monto">Monto reclamado (S/)</Label>
                          <Input id="monto" type="number" min="0" step="0.01" value={form.monto} onChange={(e) => updateField('monto', e.target.value)} placeholder="0.00 (opcional)" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="descripcion_bien">Descripción del producto o servicio <span className="text-destructive">*</span></Label>
                        <Input id="descripcion_bien" value={form.descripcion_bien} onChange={(e) => updateField('descripcion_bien', e.target.value)} placeholder="Describe el producto o servicio" required />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="detalle">Detalle del reclamo o queja <span className="text-destructive">*</span></Label>
                        <Textarea id="detalle" value={form.detalle} onChange={(e) => updateField('detalle', e.target.value)} placeholder="Describe con detalle los hechos de tu reclamo o queja..." rows={5} required />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pedido">Pedido (¿qué solicitas?)</Label>
                        <Textarea id="pedido" value={form.pedido} onChange={(e) => updateField('pedido', e.target.value)} placeholder="Indica qué solución esperas (opcional)" rows={3} />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <Button type="button" variant="ghost" asChild>
                      <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" />Cancelar</Link>
                    </Button>
                    <Button type="submit" disabled={loading} className="sm:min-w-[200px]">
                      {loading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>
                      ) : (
                        <><FileText className="w-4 h-4 mr-2" />Registrar reclamo</>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* ── CONSULTAR TAB ───────────────────────────────────────────── */}
          {activeTab === 'consultar' && (
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Consultar estado de reclamo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleTrack} className="flex gap-3">
                    <Input
                      placeholder="Ingresa tu código de seguimiento (ej: REC-2024-001)"
                      value={trackCode}
                      onChange={(e) => {
                        setTrackCode(e.target.value);
                        setTrackResult(null);
                        setTrackNotFound(false);
                      }}
                      className="flex-1 uppercase"
                    />
                    <Button type="submit" disabled={trackLoading || !trackCode.trim()}>
                      {trackLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      <span className="hidden sm:inline ml-2">Buscar</span>
                    </Button>
                  </form>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ingresa el código de seguimiento que recibiste al registrar tu reclamo.
                  </p>
                </CardContent>
              </Card>

              {trackNotFound && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="pt-5 pb-5 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Reclamo no encontrado</p>
                      <p className="text-sm text-muted-foreground">
                        No se encontró ningún reclamo con ese código. Verifica que lo hayas escrito correctamente.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {trackResult && (() => {
                const cfg = STATUS_CONFIG[trackResult.status] ?? STATUS_CONFIG.pendiente;
                return (
                  <Card className="border-primary/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-base font-semibold">
                          {trackResult.tipo === 'reclamo' ? 'Reclamo' : 'Queja'} — {trackResult.nombre} {trackResult.apellido ?? ''}
                        </CardTitle>
                        <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Correlativo</p>
                          <p className="font-mono mt-1">{trackResult.correlativo}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Fecha de registro</p>
                          <p className="mt-1">{formatDate(trackResult.created_at)}</p>
                        </div>
                      </div>

                      {/* Status timeline */}
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Seguimiento</p>
                        <div className="flex items-center gap-1 flex-wrap">
                          {['pendiente', 'en_proceso', 'resuelto', 'cerrado'].map((s, i, arr) => {
                            const sCfg = STATUS_CONFIG[s] ?? STATUS_CONFIG.pendiente;
                            const statuses = ['pendiente', 'en_proceso', 'resuelto', 'cerrado'];
                            const currentIdx = statuses.indexOf(trackResult.status);
                            const thisIdx = statuses.indexOf(s);
                            const isActive = s === trackResult.status;
                            const isDone = thisIdx < currentIdx;
                            return (
                              <div key={s} className="flex items-center gap-1">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                                    isActive
                                      ? sCfg.className
                                      : isDone
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                      : 'bg-muted text-muted-foreground/50 border-border'
                                  }`}
                                >
                                  {isDone && !isActive ? '✓ ' : ''}{sCfg.label}
                                </span>
                                {i < arr.length - 1 && (
                                  <span className="text-muted-foreground/30 text-xs">→</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {trackResult.respuesta ? (
                        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                              Respuesta recibida
                            </p>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{trackResult.respuesta}</p>
                          {trackResult.fecha_respuesta && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Respondido el {formatDate(trackResult.fecha_respuesta)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                          <Clock className="h-4 w-4 shrink-0" />
                          <span>Tu reclamo está siendo revisado. Recibirás una respuesta a la brevedad.</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              <div className="pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('registrar')}
                  className="text-muted-foreground"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Registrar un nuevo reclamo
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
