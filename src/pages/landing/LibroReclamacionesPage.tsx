import { useState } from 'react';
import { useDatabase } from '@/lib/backend';
import { supabase } from '@/lib/backend/client';
import { useConfig } from '@/store/configStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import {
  FileText, User, ChevronRight, ChevronLeft,
  CircleCheck as CheckCircle, CircleAlert as AlertCircle,
  Send, Shield, Scale, Search, Clock, ArrowRight,
  MessageSquare, Info, BookOpen,
} from 'lucide-react';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const TIPO_BIEN = [
  { value: 'producto', label: 'Producto' },
  { value: 'servicio', label: 'Servicio' },
];
const MONEDAS = [
  { value: 'PEN', label: 'Soles (S/)' },
  { value: 'USD', label: 'Dólares ($)' },
];
const TIPO_DOC = [
  { value: 'DNI', label: 'DNI' },
  { value: 'CE', label: 'Carné de Extranjería' },
  { value: 'RUC', label: 'RUC' },
  { value: 'Pasaporte', label: 'Pasaporte' },
];
const REGIONES_PERU = [
  'Amazonas','Áncash','Apurímac','Arequipa','Ayacucho','Cajamarca',
  'Callao','Cusco','Huancavelica','Huánuco','Ica','Junín','La Libertad',
  'Lambayeque','Lima','Loreto','Madre de Dios','Moquegua','Pasco',
  'Piura','Puno','San Martín','Tacna','Tumbes','Ucayali',
];

interface FormData {
  tipo: string; tipo_bien: string; tipo_doc: string; num_doc: string;
  nombre: string; apellido: string; email: string; telefono: string;
  direccion: string; region: string; descripcion_bien: string;
  monto: string; moneda: string; detalle: string; pedido: string; acepta: boolean;
}

const EMPTY: FormData = {
  tipo: 'reclamo', tipo_bien: 'producto', tipo_doc: 'DNI', num_doc: '',
  nombre: '', apellido: '', email: '', telefono: '', direccion: '', region: 'Lima',
  descripcion_bien: '', monto: '', moneda: 'PEN', detalle: '', pedido: '', acepta: false,
};

type ComplaintStatus = 'pendiente' | 'en_proceso' | 'resuelto' | 'cerrado';

interface ComplaintResult {
  correlativo: string; tipo: string; nombre: string; apellido?: string;
  status: ComplaintStatus; created_at: string; respuesta?: string;
  fecha_respuesta?: string; detalle?: string; descripcion_bien?: string;
  tipo_bien?: string; monto?: number; moneda?: string;
}

const STATUS_CONFIG: Record<ComplaintStatus, {
  label: string; textCls: string; bgCls: string; borderCls: string;
  dotCls: string; badgeCls: string; desc: string;
}> = {
  pendiente: {
    label: 'Pendiente',
    textCls: 'text-amber-600 dark:text-amber-300',
    bgCls: 'bg-amber-500/10',
    borderCls: 'border-amber-500/30',
    dotCls: 'bg-amber-500',
    badgeCls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    desc: 'Tu reclamo fue recibido y está en espera de revisión',
  },
  en_proceso: {
    label: 'En proceso',
    textCls: 'text-sky-600 dark:text-sky-300',
    bgCls: 'bg-sky-500/10',
    borderCls: 'border-sky-500/30',
    dotCls: 'bg-sky-500',
    badgeCls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
    desc: 'Estamos revisando tu caso',
  },
  resuelto: {
    label: 'Resuelto',
    textCls: 'text-emerald-600 dark:text-emerald-300',
    bgCls: 'bg-emerald-500/10',
    borderCls: 'border-emerald-500/30',
    dotCls: 'bg-emerald-500',
    badgeCls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    desc: 'Hemos dado respuesta a tu reclamo',
  },
  cerrado: {
    label: 'Cerrado',
    textCls: 'text-foreground/50',
    bgCls: 'bg-muted/40',
    borderCls: 'border-border',
    dotCls: 'bg-muted-foreground/40',
    badgeCls: 'bg-muted text-muted-foreground border-border',
    desc: 'El proceso ha concluido',
  },
};

const STATUS_ORDER: ComplaintStatus[] = ['pendiente', 'en_proceso', 'resuelto', 'cerrado'];

/* ─── Field helper ────────────────────────────────────────────────────────── */
function Field({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

/* ─── Tipo card ───────────────────────────────────────────────────────────── */
function TipoCard({ label, desc, icon: Icon, selected, onClick }: {
  label: string; desc: string; icon: React.ElementType; selected: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all w-full',
        selected ? 'border-primary bg-primary/8 ring-1 ring-primary/20' : 'border-border hover:border-border/80 hover:bg-muted/30'
      )}>
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors', selected ? 'bg-primary/15' : 'bg-muted')}>
        <Icon className={cn('w-4.5 h-4.5', selected ? 'text-primary' : 'text-muted-foreground')} />
      </div>
      <div>
        <p className={cn('text-sm font-semibold', selected ? 'text-primary' : 'text-foreground')}>{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </button>
  );
}

/* ─── Book image / fallback ───────────────────────────────────────────────── */
function BookImage({ src, className }: { src?: string; className?: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt="Libro de Reclamaciones"
        className={cn('object-contain', className)}
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="80" height="80" rx="16" fill="#1e40af" fillOpacity=".12" />
        <rect x="12" y="18" width="34" height="44" rx="3" fill="#1d4ed8" />
        <rect x="44" y="18" width="24" height="44" rx="3" fill="#1e3a8a" />
        <rect x="44" y="20" width="2" height="40" fill="#3b82f6" fillOpacity=".4" />
        <line x1="18" y1="30" x2="40" y2="30" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity=".9" />
        <line x1="18" y1="37" x2="40" y2="37" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity=".7" />
        <line x1="18" y1="43" x2="33" y2="43" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity=".5" />
      </svg>
    </div>
  );
}

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-colors';

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Main Page                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */
export default function LibroReclamacionesPage() {
  const database = useDatabase();
  const { company } = useConfig();
  const [tab, setTab] = useState<'registrar' | 'consultar'>('registrar');

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [correlativo, setCorrelativo] = useState('');

  const [queryCode, setQueryCode] = useState('');
  const [querying, setQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<ComplaintResult | null>(null);
  const [queryError, setQueryError] = useState('');

  const companyName = company.company_name || 'MLM 360';
  const companyRuc = company.company_ruc || '73983766';
  const companyAddress = company.company_address || 'Av. Javier Prado Este 100, San Isidro, Lima, Perú';
  const bookImage = company.complaints_book_image || '';

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => { const { [key]: _, ...rest } = e; return rest; });
  }

  function validateStep0(): boolean {
    const e: Record<string, string> = {};
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio';
    if (!form.apellido.trim()) e.apellido = 'El apellido es obligatorio';
    if (!form.num_doc.trim()) e.num_doc = 'El número de documento es obligatorio';
    else if (form.tipo_doc === 'DNI' && !/^\d{8}$/.test(form.num_doc.trim())) e.num_doc = 'El DNI debe tener 8 dígitos';
    else if (form.tipo_doc === 'RUC' && !/^\d{11}$/.test(form.num_doc.trim())) e.num_doc = 'El RUC debe tener 11 dígitos';
    if (!form.email.trim()) e.email = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Ingresa un correo válido';
    if (form.telefono && !/^[\d\s+()-]{6,20}$/.test(form.telefono)) e.telefono = 'Teléfono inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep1(): boolean {
    const e: Record<string, string> = {};
    if (!form.descripcion_bien.trim()) e.descripcion_bien = 'Describe el bien o servicio';
    if (form.monto && isNaN(parseFloat(form.monto))) e.monto = 'El monto debe ser un número válido';
    if (!form.detalle.trim()) e.detalle = 'El detalle es obligatorio';
    else if (form.detalle.trim().length < 20) e.detalle = 'Describe con al menos 20 caracteres';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (step === 0 && validateStep0()) { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else if (step === 0) toast.error('Revisa los campos marcados');
    else if (step === 1 && validateStep1()) { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else if (step === 1) toast.error('Revisa los campos marcados');
  }

  function handleBack() { setStep(s => Math.max(0, s - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  async function handleSubmit() {
    if (!form.acepta) { toast.error('Debes aceptar los términos para continuar'); return; }
    setSubmitting(true);
    try {
      const year = new Date().getFullYear();
      const seq = String(Date.now()).slice(-6);
      const ref = `REC-${year}-${seq}`;
      const payload = {
        correlativo: ref, tipo: form.tipo, tipo_bien: form.tipo_bien,
        tipo_doc: form.tipo_doc, num_doc: form.num_doc.trim(),
        nombre: form.nombre.trim(), apellido: form.apellido.trim(),
        email: form.email.trim().toLowerCase(),
        telefono: form.telefono.trim() || null,
        direccion: form.direccion.trim() || null,
        region: form.region, descripcion_bien: form.descripcion_bien.trim(),
        monto: form.monto ? parseFloat(form.monto) : null,
        moneda: form.moneda, detalle: form.detalle.trim(),
        pedido: form.pedido.trim() || null,
        status: 'pendiente', notificado: false, es_menor: false,
      };
      const { error } = await database.insert('complaints_book', payload);
      if (error) throw new Error(error);
      setCorrelativo(ref);
      setStep(3);
    } catch {
      toast.error('Error al registrar el reclamo. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuery() {
    const code = queryCode.trim().toUpperCase();
    if (!code) { setQueryError('Ingresa tu código de seguimiento'); return; }
    setQuerying(true);
    setQueryResult(null);
    setQueryError('');
    try {
      const { data, error } = await supabase.rpc('get_complaint_by_code', { p_code: code });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      if (!row) setQueryError('No encontramos ningún reclamo con ese código. Verifica que lo hayas ingresado correctamente.');
      else setQueryResult(row as ComplaintResult);
    } catch {
      setQueryError('Error al consultar. Intenta nuevamente.');
    } finally {
      setQuerying(false);
    }
  }

  function switchTab(t: 'registrar' | 'consultar') {
    setTab(t);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const steps = ['Datos Personales', 'Tu Reclamo', 'Confirmar'];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="bg-background border-b border-border/50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-6">
            {/* Book image + title row */}
            <div className="flex flex-row items-center gap-4 sm:gap-6 mb-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0">
                <BookImage src={bookImage} className="w-full h-full rounded-xl" />
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-2">
                  <Scale className="w-3 h-3 text-blue-500" />
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 leading-none">
                    D.S. 011-2011-PCM · Ley N° 29571
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground leading-tight">
                  Libro de Reclamaciones
                </h1>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Ejerce tu derecho. Tu reclamo será atendido en máx.{' '}
                  <strong className="text-foreground">30 días calendario</strong>.
                </p>
              </div>
            </div>

            {/* Company strip — inline on desktop, stacked on mobile */}
            <div className="text-sm flex flex-col sm:flex-row sm:items-center sm:gap-x-3 gap-y-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 shrink-0">
                <span className="font-bold text-foreground">{companyName}</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-muted-foreground text-xs">RUC: {companyRuc}</span>
              </div>
              <span className="hidden sm:inline text-muted-foreground/30">·</span>
              <div className="text-muted-foreground text-xs leading-relaxed">
                {companyAddress}
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          {/* ── Tab switcher ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 rounded-xl bg-muted/50 p-1 gap-1">
            {([['registrar', FileText, 'Registrar reclamo'], ['consultar', Search, 'Consultar estado']] as const).map(([t, Icon, label]) => (
              <button key={t} onClick={() => switchTab(t)}
                className={cn(
                  'flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200',
                  tab === t
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>

          {/* ── Register tab ─────────────────────────────────────────── */}
          {tab === 'registrar' && (
            <RegisterTab
              step={step} form={form} errors={errors} submitting={submitting}
              correlativo={correlativo} steps={steps}
              update={update} handleNext={handleNext} handleBack={handleBack}
              handleSubmit={handleSubmit}
              onConsultarClick={(code) => { setQueryCode(code); switchTab('consultar'); }}
              onRestart={() => { setForm(EMPTY); setStep(0); setCorrelativo(''); }}
            />
          )}

          {/* ── Consultar tab ────────────────────────────────────────── */}
          {tab === 'consultar' && (
            <ConsultarTab
              queryCode={queryCode} setQueryCode={setQueryCode}
              querying={querying} queryResult={queryResult} queryError={queryError}
              onQuery={handleQuery}
              onClear={() => { setQueryResult(null); setQueryCode(''); setQueryError(''); }}
            />
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  RegisterTab                                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */
function RegisterTab({ step, form, errors, submitting, correlativo, steps,
  update, handleNext, handleBack, handleSubmit, onConsultarClick, onRestart }: {
  step: number; form: FormData; errors: Record<string, string>; submitting: boolean;
  correlativo: string; steps: string[];
  update: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  handleNext: () => void; handleBack: () => void; handleSubmit: () => void;
  onConsultarClick: (code: string) => void; onRestart: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Stepper */}
      {step < 3 && (
        <div className="flex items-center justify-center gap-1">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center">
              <div className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200',
                i < step ? 'bg-primary/70 text-primary-foreground' :
                i === step ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30' :
                'bg-muted text-muted-foreground'
              )}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center bg-white/20 text-xs">
                  {i < step ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                </span>
                <span className="hidden sm:inline">{s}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn('w-6 h-0.5 mx-1 transition-colors', i < step ? 'bg-primary' : 'bg-muted')} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Card */}
      <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 space-y-5">

          {/* ── Step 0: Datos personales ── */}
          {step === 0 && (
            <>
              <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">¿Quién eres?</h2>
                  <p className="text-xs text-muted-foreground">Tus datos para identificarte y responderte.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nombre" required error={errors.nombre}>
                  <input value={form.nombre} onChange={e => update('nombre', e.target.value)}
                    placeholder="Tu nombre" className={cn(inputCls, errors.nombre && 'border-destructive')} />
                </Field>
                <Field label="Apellido" required error={errors.apellido}>
                  <input value={form.apellido} onChange={e => update('apellido', e.target.value)}
                    placeholder="Tu apellido" className={cn(inputCls, errors.apellido && 'border-destructive')} />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Tipo de documento" required>
                  <select value={form.tipo_doc} onChange={e => update('tipo_doc', e.target.value)} className={inputCls}>
                    {TIPO_DOC.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Número de documento" required error={errors.num_doc}>
                    <input value={form.num_doc} onChange={e => update('num_doc', e.target.value)}
                      placeholder="Ej: 12345678"
                      className={cn(inputCls, errors.num_doc && 'border-destructive')} />
                  </Field>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Correo electrónico" required error={errors.email} hint="Recibirás la respuesta aquí">
                  <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                    placeholder="tucorreo@email.com"
                    className={cn(inputCls, errors.email && 'border-destructive')} />
                </Field>
                <Field label="Teléfono" error={errors.telefono}>
                  <input value={form.telefono} onChange={e => update('telefono', e.target.value)}
                    placeholder="Opcional" className={inputCls} />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Dirección">
                  <input value={form.direccion} onChange={e => update('direccion', e.target.value)}
                    placeholder="Opcional" className={inputCls} />
                </Field>
                <Field label="Región" required>
                  <select value={form.region} onChange={e => update('region', e.target.value)} className={inputCls}>
                    {REGIONES_PERU.map(r => <option key={r}>{r}</option>)}
                  </select>
                </Field>
              </div>
            </>
          )}

          {/* ── Step 1: Detalle del reclamo ── */}
          {step === 1 && (
            <>
              <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">¿Qué pasó?</h2>
                  <p className="text-xs text-muted-foreground">Cuéntanos en detalle para ayudarte mejor.</p>
                </div>
              </div>

              <Field label="¿Tipo de inconformidad?" required>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TipoCard label="Reclamo"
                    desc="Insatisfacción con un producto o servicio"
                    icon={AlertCircle} selected={form.tipo === 'reclamo'}
                    onClick={() => update('tipo', 'reclamo')} />
                  <TipoCard label="Queja"
                    desc="Malestar por la atención o el proceso"
                    icon={MessageSquare} selected={form.tipo === 'queja'}
                    onClick={() => update('tipo', 'queja')} />
                </div>
              </Field>

              <Field label="¿Es sobre un producto o servicio?" required>
                <div className="flex gap-3">
                  {TIPO_BIEN.map(o => (
                    <button key={o.value} type="button" onClick={() => update('tipo_bien', o.value)}
                      className={cn(
                        'flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all',
                        form.tipo_bien === o.value
                          ? 'border-primary bg-primary/8 text-primary'
                          : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
                      )}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="¿Qué producto o servicio?" required error={errors.descripcion_bien}
                hint="Ej: Plan de suscripción mensual, Teléfono Samsung Galaxy">
                <input value={form.descripcion_bien} onChange={e => update('descripcion_bien', e.target.value)}
                  placeholder="Nombre del producto o servicio"
                  className={cn(inputCls, errors.descripcion_bien && 'border-destructive')} />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Monto reclamado" error={errors.monto} hint="Si aplica">
                  <input type="number" value={form.monto} onChange={e => update('monto', e.target.value)}
                    placeholder="0.00" className={inputCls} />
                </Field>
                <Field label="Moneda">
                  <select value={form.moneda} onChange={e => update('moneda', e.target.value)} className={inputCls}>
                    {MONEDAS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Cuéntanos qué pasó" required error={errors.detalle}
                hint="¿Cuándo ocurrió? ¿Qué prometieron y qué recibiste?">
                <textarea value={form.detalle} onChange={e => update('detalle', e.target.value)}
                  placeholder="Describe los hechos con el mayor detalle posible..."
                  rows={5}
                  className={cn(inputCls, 'resize-y', errors.detalle && 'border-destructive')} />
                <p className="text-xs text-muted-foreground">{form.detalle.length} caracteres (mínimo 20)</p>
              </Field>

              <Field label="¿Qué solución esperas?" hint="Ej: devolución del dinero, cambio del producto">
                <input value={form.pedido} onChange={e => update('pedido', e.target.value)}
                  placeholder="¿Qué necesitas para resolver el problema?"
                  className={inputCls} />
              </Field>
            </>
          )}

          {/* ── Step 2: Confirmar ── */}
          {step === 2 && (
            <>
              <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Revisa antes de enviar</h2>
                  <p className="text-xs text-muted-foreground">Una vez enviado no podrás modificarlo.</p>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 overflow-hidden text-sm">
                <div className="px-4 py-2 border-b border-border/50 bg-muted/30">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tus datos</p>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Nombre: </span><span className="font-medium">{form.nombre} {form.apellido}</span></div>
                  <div><span className="text-muted-foreground">Documento: </span><span className="font-medium">{form.tipo_doc} {form.num_doc}</span></div>
                  <div><span className="text-muted-foreground">Correo: </span><span className="font-medium">{form.email}</span></div>
                  <div><span className="text-muted-foreground">Región: </span><span className="font-medium">{form.region}</span></div>
                </div>
                <div className="px-4 py-2 border-t border-border/50 bg-muted/30">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tu reclamo</p>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full bg-primary/12 text-primary border border-primary/20 text-xs font-bold capitalize">{form.tipo}</span>
                    <span className="px-2.5 py-1 rounded-full bg-muted border text-xs font-medium capitalize">{form.tipo_bien}</span>
                    {form.monto && <span className="px-2.5 py-1 rounded-full bg-muted border text-xs font-medium">{form.moneda === 'PEN' ? 'S/' : '$'} {form.monto}</span>}
                  </div>
                  <p><span className="text-muted-foreground">Producto/Servicio: </span><span className="font-medium">{form.descripcion_bien}</span></p>
                  <div className="bg-muted/40 rounded-lg p-3 text-foreground/80 leading-relaxed">{form.detalle}</div>
                  {form.pedido && <p><span className="text-muted-foreground">Solución esperada: </span>{form.pedido}</p>}
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border border-border/50 hover:bg-muted/20 transition-colors">
                <input type="checkbox" checked={form.acepta} onChange={e => update('acepta', e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-input accent-primary" />
                <span className="text-sm text-muted-foreground leading-relaxed">
                  Declaro que la información es verídica y acepto el tratamiento de mis datos personales conforme a la{' '}
                  <strong className="text-foreground">Ley N° 29733</strong>.
                </span>
              </label>
            </>
          )}

          {/* ── Step 3: Éxito ── */}
          {step === 3 && correlativo && (
            <div className="text-center py-8 space-y-5">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 ring-4 ring-emerald-500/10">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground mb-2">¡Reclamo Registrado!</h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Hemos recibido tu reclamo. Guarda este código para consultar el estado de tu caso.
                </p>
              </div>

              <div className="mx-auto max-w-xs">
                <p className="text-[10px] text-muted-foreground mb-2 font-bold uppercase tracking-widest">Código de seguimiento</p>
                <div className="px-6 py-4 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5">
                  <span className="text-xl font-mono font-black text-primary tracking-wider">{correlativo}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Úsalo en "Consultar estado"</p>
              </div>

              <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300 max-w-sm mx-auto">
                Te contactaremos en máximo <strong>30 días calendario</strong> conforme a la normativa vigente.
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={onRestart}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-border rounded-xl font-semibold text-sm text-foreground hover:bg-muted transition-colors">
                  Registrar otro reclamo
                </button>
                <button onClick={() => onConsultarClick(correlativo)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors">
                  <Search className="w-4 h-4" /> Consultar mi reclamo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        {step < 3 && (
          <div className={cn(
            'flex gap-3 px-5 sm:px-6 py-4 border-t border-border/50 bg-muted/10',
            step === 0 ? 'justify-end' : 'justify-between'
          )}>
            {step > 0 && (
              <button onClick={handleBack}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-border rounded-xl font-medium text-sm text-foreground hover:bg-muted transition-colors">
                <ChevronLeft className="w-4 h-4" /> Atrás
              </button>
            )}
            {step < 2 && (
              <button onClick={handleNext}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 active:scale-[.98] transition-all">
                Continuar <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 2 && (
              <button onClick={handleSubmit} disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 active:scale-[.98] transition-all disabled:opacity-60">
                {submitting ? 'Enviando...' : <><Send className="w-4 h-4" /> Enviar reclamo</>}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Legal footnote */}
      {step < 3 && (
        <div className="flex gap-3 text-xs text-muted-foreground bg-muted/20 border border-border/40 rounded-xl p-3.5">
          <Info className="w-4 h-4 shrink-0 mt-0.5 opacity-60" />
          <p className="leading-relaxed">
            Implementado conforme al D.S. 011-2011-PCM, Ley N° 29571 y Ley N° 29733.
            La empresa atenderá tu reclamo en un plazo máximo de <strong>30 días calendario</strong>.
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ConsultarTab                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */
function ConsultarTab({ queryCode, setQueryCode, querying, queryResult, queryError, onQuery, onClear }: {
  queryCode: string; setQueryCode: (v: string) => void;
  querying: boolean; queryResult: ComplaintResult | null; queryError: string;
  onQuery: () => void; onClear: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border/60 rounded-2xl shadow-sm p-5 sm:p-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border/50 mb-5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Search className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Consultar estado de tu reclamo</h2>
            <p className="text-xs text-muted-foreground">Ingresa el código de seguimiento que recibiste.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              value={queryCode}
              onChange={e => { setQueryCode(e.target.value.toUpperCase()); }}
              onKeyDown={e => e.key === 'Enter' && onQuery()}
              placeholder="Ej: REC-2026-123456"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background text-sm font-mono text-foreground placeholder:text-muted-foreground placeholder:font-sans focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-colors"
            />
          </div>
          <button onClick={onQuery} disabled={querying}
            className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 active:scale-[.98] transition-all disabled:opacity-60">
            {querying ? 'Buscando...' : <><ArrowRight className="w-4 h-4" />Consultar</>}
          </button>
        </div>

        {queryError && (
          <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-destructive/8 border border-destructive/25 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{queryError}</p>
          </div>
        )}
      </div>

      {queryResult && <ComplaintResultCard result={queryResult} onClear={onClear} />}

      {!queryResult && !queryError && (
        <div className="text-center py-14 text-muted-foreground">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Ingresa tu código para ver el estado de tu reclamo.</p>
        </div>
      )}
    </div>
  );
}

/* ─── Complaint result card ───────────────────────────────────────────────── */
function ComplaintResultCard({ result, onClear }: { result: ComplaintResult; onClear: () => void }) {
  const stepIdx = STATUS_ORDER.indexOf(result.status);
  const cfg = STATUS_CONFIG[result.status] ?? STATUS_CONFIG.pendiente;

  const fmtDate = (v?: string | null) => {
    if (!v) return '—';
    try { return new Date(v).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }); }
    catch { return v; }
  };

  return (
    <div className="space-y-3">
      {/* Main status card */}
      <div className={cn('bg-card border rounded-2xl overflow-hidden', cfg.borderCls)}>
        <div className={cn('px-5 py-4 flex items-start justify-between gap-3', cfg.bgCls)}>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Correlativo</p>
            <p className="text-2xl font-mono font-black text-foreground tracking-wider">{result.correlativo}</p>
            <p className="text-xs text-muted-foreground mt-1">Registrado el {fmtDate(result.created_at)}</p>
          </div>
          <span className={cn('px-3 py-1.5 rounded-full border text-xs font-bold shrink-0', cfg.badgeCls)}>
            {cfg.label}
          </span>
        </div>

        {/* Progress stepper */}
        <div className="px-5 py-4 border-t border-border/30">
          <div className="flex items-center">
            {STATUS_ORDER.map((s, i) => {
              const sCfg = STATUS_CONFIG[s];
              const done = i <= stepIdx;
              return (
                <div key={s} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all',
                      done ? `${sCfg.dotCls} border-transparent text-white shadow-sm` : 'border-border bg-background text-muted-foreground'
                    )}>
                      {done ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                    </div>
                    <p className={cn('text-[10px] font-semibold text-center', done ? sCfg.textCls : 'text-muted-foreground/40')}>
                      {sCfg.label}
                    </p>
                  </div>
                  {i < STATUS_ORDER.length - 1 && (
                    <div className={cn('h-0.5 flex-1 -mt-6 mx-1 rounded transition-all', i < stepIdx ? cfg.dotCls : 'bg-border')} />
                  )}
                </div>
              );
            })}
          </div>
          <p className={cn('text-xs font-medium mt-3 text-center', cfg.textCls)}>{cfg.desc}</p>
        </div>

        {/* Meta info */}
        <div className="px-5 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div className="bg-muted/30 rounded-lg px-3 py-2">
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide mb-0.5">Tipo</p>
            <p className="font-medium text-foreground capitalize">{result.tipo}</p>
          </div>
          <div className="bg-muted/30 rounded-lg px-3 py-2">
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide mb-0.5">Solicitante</p>
            <p className="font-medium text-foreground truncate">{result.nombre} {result.apellido ?? ''}</p>
          </div>
          {result.descripcion_bien && (
            <div className="bg-muted/30 rounded-lg px-3 py-2 col-span-2 sm:col-span-1">
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide mb-0.5">Producto/Servicio</p>
              <p className="font-medium text-foreground truncate">{result.descripcion_bien}</p>
            </div>
          )}
        </div>
      </div>

      {/* Respuesta */}
      {result.respuesta ? (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Respuesta de la empresa</p>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{result.respuesta}</p>
          {result.fecha_respuesta && (
            <p className="text-xs text-muted-foreground/50">
              Respondido el {new Date(result.fecha_respuesta).toLocaleString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-0.5">En espera de respuesta</p>
            <p className="text-xs text-muted-foreground">Tienes hasta <strong>30 días calendario</strong> para recibir una respuesta.</p>
          </div>
        </div>
      )}

      <button onClick={onClear}
        className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground border border-border/50 rounded-xl hover:bg-muted/30 transition-colors">
        Consultar otro reclamo
      </button>
    </div>
  );
}
