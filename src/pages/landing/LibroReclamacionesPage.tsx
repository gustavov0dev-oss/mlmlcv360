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
  MessageSquare, BookOpen, Info,
} from 'lucide-react';

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

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; color: string; bg: string; border: string; step: string; desc: string }> = {
  pendiente:  { label: 'Pendiente',  color: 'text-amber-700 dark:text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   step: 'bg-amber-500',     desc: 'Recibido, en espera de revisión' },
  en_proceso: { label: 'En proceso', color: 'text-blue-700 dark:text-blue-400',     bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    step: 'bg-blue-500',      desc: 'Siendo revisado por nuestro equipo' },
  resuelto:   { label: 'Resuelto',   color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', step: 'bg-emerald-500',   desc: 'Hemos dado respuesta a tu reclamo' },
  cerrado:    { label: 'Cerrado',    color: 'text-muted-foreground',                bg: 'bg-muted/50',       border: 'border-border',         step: 'bg-muted-foreground', desc: 'Proceso concluido' },
};

const STATUS_ORDER: ComplaintStatus[] = ['pendiente', 'en_proceso', 'resuelto', 'cerrado'];

function Field({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

const inputCls = 'w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';

function TextInput({ value, onChange, placeholder, type = 'text', disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled} className={inputCls} />
  );
}

function SelectInput({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={inputCls}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function TipoCard({ label, desc, icon: Icon, selected, onClick }: {
  label: string; desc: string; icon: React.ElementType; selected: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all w-full',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
          : 'border-border hover:border-border/80 hover:bg-muted/30'
      )}>
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5', selected ? 'bg-primary/15' : 'bg-muted')}>
        <Icon className={cn('w-4.5 h-4.5', selected ? 'text-primary' : 'text-muted-foreground')} />
      </div>
      <div>
        <p className={cn('text-sm font-semibold', selected ? 'text-primary' : 'text-foreground')}>{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </button>
  );
}

export default function LibroReclamacionesPage() {
  const database = useDatabase();
  const { company } = useConfig();
  const [tab, setTab] = useState<'registrar' | 'consultar'>('registrar');

  // Form state
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [correlativo, setCorrelativo] = useState('');

  // Consulta state
  const [queryCode, setQueryCode] = useState('');
  const [querying, setQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<ComplaintResult | null>(null);
  const [queryError, setQueryError] = useState('');

  const companyName = company.company_name || 'MLM 360';
  const companyRuc = company.company_ruc || '20512345678';
  const companyAddress = company.company_address || 'Av. Javier Prado Este 100, San Isidro, Lima, Perú';

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => { if (!e[key]) return e; const { [key]: _, ...rest } = e; return rest; });
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
      const ref = `REC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
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
      toast.success('Reclamo registrado exitosamente');
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
      const { data, error } = await supabase
        .rpc('get_complaint_by_code', { p_code: code });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      if (!row) { setQueryError('No encontramos ningún reclamo con ese código. Verifica que lo hayas ingresado correctamente.'); }
      else setQueryResult(row as ComplaintResult);
    } catch {
      setQueryError('Error al consultar. Intenta nuevamente.');
    } finally {
      setQuerying(false);
    }
  }

  const steps = ['Datos Personales', 'Tu Reclamo', 'Confirmar'];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero — sin fondo azul, limpio */}
        <section className="border-b bg-muted/20 py-10 md:py-14">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-5">
              <Scale className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">D.S. 011-2011-PCM · Ley N° 29571 · Ley N° 29733</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3 text-foreground">Libro de Reclamaciones</h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
              Ejerce tu derecho como consumidor. Tu reclamo o queja será atendido en un plazo máximo de <strong>30 días calendario</strong>.
            </p>
          </div>
        </section>

        {/* Company Info Bar */}
        <section className="border-b bg-muted/10">
          <div className="max-w-4xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{companyName}</span>
            <span>RUC: {companyRuc}</span>
            <span className="hidden sm:inline">{companyAddress}</span>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-4 py-8 md:py-10">

          {/* Tab switcher */}
          <div className="flex rounded-xl border bg-muted/30 p-1 mb-8">
            <button
              onClick={() => setTab('registrar')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
                tab === 'registrar'
                  ? 'bg-card shadow-sm text-foreground border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              )}>
              <FileText className="w-4 h-4" />
              Registrar reclamo
            </button>
            <button
              onClick={() => setTab('consultar')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
                tab === 'consultar'
                  ? 'bg-card shadow-sm text-foreground border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              )}>
              <Search className="w-4 h-4" />
              Consultar estado
            </button>
          </div>

          {/* ── TAB: REGISTRAR ── */}
          {tab === 'registrar' && (
            <>
              {/* Stepper */}
              {step < 3 && (
                <div className="flex items-center justify-center mb-7">
                  {steps.map((s, i) => (
                    <div key={i} className="flex items-center">
                      <div className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                        i < step ? 'bg-primary/80 text-white' : i === step ? 'bg-primary text-white shadow-md' : 'bg-muted text-muted-foreground'
                      )}>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs bg-white/20">
                          {i < step ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                        </span>
                        <span className="hidden sm:inline">{s}</span>
                      </div>
                      {i < steps.length - 1 && (
                        <div className={cn('w-8 h-0.5 mx-1', i < step ? 'bg-primary' : 'bg-muted')} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-card border rounded-2xl shadow-sm p-6 md:p-8">
                {/* Step 0: Datos personales */}
                {step === 0 && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-5 h-5 text-primary" />
                      <h2 className="text-lg font-semibold">¿Quién eres?</h2>
                    </div>
                    <p className="text-sm text-muted-foreground -mt-3">Necesitamos tus datos para identificar tu reclamo y responderte.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Nombre" required error={errors.nombre}>
                        <TextInput value={form.nombre} onChange={v => update('nombre', v)} placeholder="Tu nombre" />
                      </Field>
                      <Field label="Apellido" required error={errors.apellido}>
                        <TextInput value={form.apellido} onChange={v => update('apellido', v)} placeholder="Tu apellido" />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Field label="Tipo de documento" required>
                        <SelectInput value={form.tipo_doc} onChange={v => update('tipo_doc', v)} options={TIPO_DOC} />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field label="Número de documento" required error={errors.num_doc}>
                          <TextInput value={form.num_doc} onChange={v => update('num_doc', v)} placeholder="Ej: 12345678" />
                        </Field>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Correo electrónico" required error={errors.email}
                        hint="Aquí recibirás la respuesta a tu reclamo">
                        <TextInput value={form.email} onChange={v => update('email', v)} placeholder="tucorreo@email.com" type="email" />
                      </Field>
                      <Field label="Teléfono" error={errors.telefono}>
                        <TextInput value={form.telefono} onChange={v => update('telefono', v)} placeholder="Opcional" />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Dirección">
                        <TextInput value={form.direccion} onChange={v => update('direccion', v)} placeholder="Opcional" />
                      </Field>
                      <Field label="Región" required>
                        <select value={form.region} onChange={e => update('region', e.target.value)} className={inputCls}>
                          {REGIONES_PERU.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </Field>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button onClick={handleNext}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors">
                        Continuar <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 1: Detalle del reclamo */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-5 h-5 text-primary" />
                      <h2 className="text-lg font-semibold">¿Qué pasó?</h2>
                    </div>
                    <p className="text-sm text-muted-foreground -mt-3">Cuéntanos con detalle lo que ocurrió para que podamos ayudarte mejor.</p>

                    {/* Tipo de inconformidad */}
                    <Field label="¿Cuál es el tipo de inconformidad?" required>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-0.5">
                        <TipoCard label="Reclamo"
                          desc="Insatisfacción con un producto o servicio adquirido"
                          icon={AlertCircle} selected={form.tipo === 'reclamo'}
                          onClick={() => update('tipo', 'reclamo')} />
                        <TipoCard label="Queja"
                          desc="Malestar por la atención o proceso de servicio"
                          icon={MessageSquare} selected={form.tipo === 'queja'}
                          onClick={() => update('tipo', 'queja')} />
                      </div>
                    </Field>

                    <Field label="¿Es sobre un producto o servicio?" required>
                      <div className="flex gap-3 mt-0.5">
                        {TIPO_BIEN.map(o => (
                          <button key={o.value} type="button" onClick={() => update('tipo_bien', o.value)}
                            className={cn(
                              'flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-all',
                              form.tipo_bien === o.value
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border hover:border-border/80 text-muted-foreground hover:text-foreground'
                            )}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </Field>

                    <Field label="¿Qué producto o servicio?" required error={errors.descripcion_bien}
                      hint="Ejemplo: Teléfono Samsung Galaxy S24, Plan de suscripción mensual">
                      <TextInput value={form.descripcion_bien} onChange={v => update('descripcion_bien', v)}
                        placeholder="Describe el producto o servicio" />
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Monto reclamado" error={errors.monto} hint="Si aplica, ¿cuánto dinero está en juego?">
                        <TextInput value={form.monto} onChange={v => update('monto', v)} placeholder="0.00" type="number" />
                      </Field>
                      <Field label="Moneda">
                        <SelectInput value={form.moneda} onChange={v => update('moneda', v)} options={MONEDAS} />
                      </Field>
                    </div>

                    <Field label="Cuéntanos qué pasó" required error={errors.detalle}
                      hint="Sé específico: ¿cuándo ocurrió?, ¿qué prometieron y qué recibiste?">
                      <textarea value={form.detalle} onChange={e => update('detalle', e.target.value)}
                        placeholder="Describe los hechos con la mayor cantidad de detalles posibles..."
                        rows={5} className={inputCls} />
                      <p className="mt-1 text-xs text-muted-foreground">{form.detalle.length} caracteres (mínimo 20)</p>
                    </Field>

                    <Field label="¿Qué solución esperas?" hint="Ejemplo: devolución del dinero, cambio del producto, disculpas públicas">
                      <TextInput value={form.pedido} onChange={v => update('pedido', v)}
                        placeholder="¿Qué necesitas para que el problema sea resuelto?" />
                    </Field>

                    <div className="flex justify-between pt-2">
                      <button onClick={handleBack}
                        className="inline-flex items-center gap-2 px-5 py-2.5 border rounded-lg font-medium hover:bg-muted transition-colors">
                        <ChevronLeft className="w-4 h-4" /> Atrás
                      </button>
                      <button onClick={handleNext}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors">
                        Revisar y enviar <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Confirmación */}
                {step === 2 && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-5 h-5 text-primary" />
                      <h2 className="text-lg font-semibold">Revisa tu reclamo antes de enviar</h2>
                    </div>
                    <p className="text-sm text-muted-foreground -mt-3">Asegúrate de que todo esté correcto. Una vez enviado no podrás modificarlo.</p>

                    <div className="rounded-xl border bg-muted/20 overflow-hidden">
                      <div className="px-4 py-3 border-b bg-muted/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tus datos</p>
                      </div>
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div><span className="text-muted-foreground">Nombre: </span><span className="font-medium">{form.nombre} {form.apellido}</span></div>
                        <div><span className="text-muted-foreground">Documento: </span><span className="font-medium">{form.tipo_doc} {form.num_doc}</span></div>
                        <div><span className="text-muted-foreground">Correo: </span><span className="font-medium">{form.email}</span></div>
                        <div><span className="text-muted-foreground">Teléfono: </span><span className="font-medium">{form.telefono || '—'}</span></div>
                        <div><span className="text-muted-foreground">Región: </span><span className="font-medium">{form.region}</span></div>
                      </div>

                      <div className="px-4 py-3 border-t border-b bg-muted/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tu reclamo</p>
                      </div>
                      <div className="p-4 space-y-3 text-sm">
                        <div className="flex gap-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold capitalize">{form.tipo}</span>
                          <span className="px-2.5 py-1 rounded-full bg-muted border text-xs font-medium capitalize">{form.tipo_bien}</span>
                          {form.monto && <span className="px-2.5 py-1 rounded-full bg-muted border text-xs font-medium">{form.moneda === 'PEN' ? 'S/' : '$'} {form.monto}</span>}
                        </div>
                        <div><span className="text-muted-foreground">Producto/Servicio: </span><span className="font-medium">{form.descripcion_bien}</span></div>
                        <div className="bg-muted/40 rounded-lg p-3 text-foreground/80 leading-relaxed">{form.detalle}</div>
                        {form.pedido && <div><span className="text-muted-foreground">Solución esperada: </span><span className="font-medium">{form.pedido}</span></div>}
                      </div>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border border-border/60 hover:bg-muted/20 transition-colors">
                      <input type="checkbox" checked={form.acepta} onChange={e => update('acepta', e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-input accent-primary" />
                      <span className="text-sm text-muted-foreground leading-relaxed">
                        Declaro que la información es verídica y acepto el tratamiento de mis datos personales conforme a la <strong>Ley N° 29733</strong> (Ley de Protección de Datos Personales).
                      </span>
                    </label>

                    <div className="flex justify-between pt-2">
                      <button onClick={handleBack}
                        className="inline-flex items-center gap-2 px-5 py-2.5 border rounded-lg font-medium hover:bg-muted transition-colors">
                        <ChevronLeft className="w-4 h-4" /> Atrás
                      </button>
                      <button onClick={handleSubmit} disabled={submitting}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                        {submitting ? 'Enviando...' : <><Send className="w-4 h-4" /> Enviar reclamo</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Éxito */}
                {step === 3 && correlativo && (
                  <div className="text-center py-8 space-y-5">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20">
                      <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold mb-2">¡Reclamo Registrado!</h2>
                      <p className="text-muted-foreground text-sm max-w-md mx-auto">
                        Hemos recibido tu reclamo. Guarda este código — lo necesitarás para consultar el estado de tu caso.
                      </p>
                    </div>

                    <div className="mx-auto max-w-xs">
                      <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Tu código de seguimiento</p>
                      <div className="px-6 py-4 rounded-xl bg-muted border-2 border-dashed border-primary/40">
                        <span className="text-xl font-mono font-bold text-primary">{correlativo}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Úsalo en la pestaña "Consultar estado"</p>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 max-w-md mx-auto">
                      <p className="font-medium mb-1">¿Qué sigue?</p>
                      <p className="text-xs leading-relaxed">Te contactaremos al correo <strong>{form.email}</strong> en un plazo máximo de <strong>30 días calendario</strong>, conforme a la normativa vigente.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                      <button onClick={() => { setForm(EMPTY); setStep(0); setCorrelativo(''); }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 border rounded-lg font-medium hover:bg-muted transition-colors">
                        Registrar otro reclamo
                      </button>
                      <button onClick={() => { setTab('consultar'); setQueryCode(correlativo); }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors">
                        <Search className="w-4 h-4" /> Consultar mi reclamo
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Info legal */}
              {step < 3 && (
                <div className="mt-5 rounded-xl border border-border/50 bg-muted/20 p-4 flex gap-3">
                  <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    El presente Libro de Reclamaciones se implementa conforme al D.S. 011-2011-PCM, Ley N° 29571 (Código de Protección y Defensa del Consumidor) y Ley N° 29733 (Ley de Protección de Datos Personales). La empresa atenderá tu reclamo en un plazo máximo de <strong>30 días calendario</strong>.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── TAB: CONSULTAR ── */}
          {tab === 'consultar' && (
            <div className="space-y-6">
              <div className="bg-card border rounded-2xl shadow-sm p-6 md:p-8">
                <div className="flex items-center gap-2 mb-1">
                  <Search className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Consultar estado de tu reclamo</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-5">
                  Ingresa el código de seguimiento que recibiste al registrar tu reclamo.
                </p>

                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      value={queryCode}
                      onChange={e => { setQueryCode(e.target.value.toUpperCase()); setQueryError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleQuery()}
                      placeholder="Ej: REC-2026-123456"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm font-mono text-foreground placeholder:text-muted-foreground placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                  </div>
                  <button onClick={handleQuery} disabled={querying}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                    {querying ? 'Buscando...' : <><ArrowRight className="w-4 h-4" /> Consultar</>}
                  </button>
                </div>

                {queryError && (
                  <div className="mt-4 flex items-start gap-2.5 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{queryError}</p>
                  </div>
                )}
              </div>

              {/* Resultado */}
              {queryResult && (() => {
                const cfg = STATUS_CONFIG[queryResult.status] ?? STATUS_CONFIG.pendiente;
                const stepIdx = STATUS_ORDER.indexOf(queryResult.status);
                return (
                  <div className="space-y-4">
                    {/* Estado principal */}
                    <div className={cn('rounded-2xl border p-5', cfg.bg, cfg.border)}>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Código de seguimiento</p>
                          <p className="text-xl font-mono font-bold text-foreground">{queryResult.correlativo}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Registrado el {new Date(queryResult.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                        <div className={cn('px-3 py-1.5 rounded-full border text-xs font-bold', cfg.color, cfg.bg, cfg.border)}>
                          {cfg.label}
                        </div>
                      </div>

                      {/* Info del reclamo */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Tipo</p>
                          <p className="font-medium capitalize">{queryResult.tipo}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Solicitante</p>
                          <p className="font-medium">{queryResult.nombre} {queryResult.apellido ?? ''}</p>
                        </div>
                        {queryResult.descripcion_bien && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Producto / Servicio</p>
                            <p className="font-medium truncate">{queryResult.descripcion_bien}</p>
                          </div>
                        )}
                      </div>

                      {/* Progreso visual */}
                      <div className="bg-background/60 rounded-xl p-4 border border-border/40">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Progreso de tu reclamo</p>
                        <div className="flex items-center">
                          {STATUS_ORDER.map((s, i) => {
                            const sCfg = STATUS_CONFIG[s];
                            const done = i <= stepIdx;
                            const active = i === stepIdx;
                            return (
                              <div key={s} className="flex items-center flex-1 last:flex-none">
                                <div className="flex flex-col items-center gap-1.5">
                                  <div className={cn(
                                    'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all',
                                    done
                                      ? `${sCfg.step} border-transparent text-white`
                                      : 'border-border bg-background text-muted-foreground'
                                  )}>
                                    {done ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                                  </div>
                                  <div className="text-center">
                                    <p className={cn('text-[10px] font-semibold whitespace-nowrap', active ? 'text-foreground' : done ? 'text-muted-foreground' : 'text-muted-foreground/40')}>
                                      {sCfg.label}
                                    </p>
                                    {active && <p className="text-[9px] text-muted-foreground/60 max-w-[70px] text-center leading-tight mt-0.5 hidden sm:block">{sCfg.desc}</p>}
                                  </div>
                                </div>
                                {i < STATUS_ORDER.length - 1 && (
                                  <div className={cn('h-0.5 flex-1 mb-5 mx-1 rounded', i < stepIdx ? 'bg-primary' : 'bg-border')} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-3 text-center">{cfg.desc}</p>
                      </div>
                    </div>

                    {/* Respuesta de la empresa */}
                    {queryResult.respuesta ? (
                      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Respuesta de la empresa</p>
                          {queryResult.fecha_respuesta && (
                            <p className="text-xs text-muted-foreground ml-auto">
                              {new Date(queryResult.fecha_respuesta).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{queryResult.respuesta}</p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-border/50 bg-muted/20 p-5 flex items-start gap-3">
                        <Clock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground mb-1">En espera de respuesta</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Aún no hay respuesta de la empresa. Recuerda que tienes hasta <strong>30 días calendario</strong> desde el registro para recibir una respuesta.
                          </p>
                        </div>
                      </div>
                    )}

                    <button onClick={() => { setQueryResult(null); setQueryCode(''); }}
                      className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground border border-border/50 rounded-xl hover:bg-muted/30 transition-colors">
                      Consultar otro reclamo
                    </button>
                  </div>
                );
              })()}

              {/* No result yet — hint */}
              {!queryResult && !queryError && (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Ingresa tu código de seguimiento para ver el estado de tu reclamo.</p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
