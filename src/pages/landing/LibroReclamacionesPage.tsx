import { useState } from 'react';
import { useNavigate } from '@/lib/router';
import { useDatabase } from '@/lib/backend';
import { useConfig } from '@/store/configStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { FileText, User, ChevronRight, ChevronLeft, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Send, Shield, Scale } from 'lucide-react';

const TIPOS = [
  { value: 'reclamo', label: 'Reclamo' },
  { value: 'queja', label: 'Queja' },
];

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
  'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca',
  'Callao', 'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín', 'La Libertad',
  'Lambayeque', 'Lima', 'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco',
  'Piura', 'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali',
];

interface FormData {
  tipo: string;
  tipo_bien: string;
  tipo_doc: string;
  num_doc: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  direccion: string;
  region: string;
  descripcion_bien: string;
  monto: string;
  moneda: string;
  detalle: string;
  pedido: string;
  acepta: boolean;
}

const EMPTY: FormData = {
  tipo: 'reclamo',
  tipo_bien: 'producto',
  tipo_doc: 'DNI',
  num_doc: '',
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  direccion: '',
  region: 'Lima',
  descripcion_bien: '',
  monto: '',
  moneda: 'PEN',
  detalle: '',
  pedido: '',
  acepta: false,
};

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-foreground mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function Field({
  label, required, error, children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';

function TextInput({
  value, onChange, placeholder, type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputClass}
    />
  );
}

function SelectInput({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export default function LibroReclamacionesPage() {
  const navigate = useNavigate();
  const database = useDatabase();
  const { company } = useConfig();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [correlativo, setCorrelativo] = useState('');

  const companyName = company.company_name || 'MLM 360';
  const companyRuc = company.company_ruc || '20512345678';
  const companyAddress = company.company_address || 'Av. Javier Prado Este 100, San Isidro, Lima, Perú';

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const { [key]: _, ...rest } = e;
      return rest;
    });
  }

  function validateStep0(): boolean {
    const e: Record<string, string> = {};
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio';
    if (!form.apellido.trim()) e.apellido = 'El apellido es obligatorio';
    if (!form.tipo_doc) e.tipo_doc = 'Selecciona un tipo de documento';
    if (!form.num_doc.trim()) e.num_doc = 'El número de documento es obligatorio';
    else if (form.tipo_doc === 'DNI' && !/^\d{8}$/.test(form.num_doc.trim()))
      e.num_doc = 'El DNI debe tener 8 dígitos';
    else if (form.tipo_doc === 'RUC' && !/^\d{11}$/.test(form.num_doc.trim()))
      e.num_doc = 'El RUC debe tener 11 dígitos';
    if (!form.email.trim()) e.email = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      e.email = 'Ingresa un correo válido';
    if (form.telefono && !/^[\d\s+()-]{6,20}$/.test(form.telefono))
      e.telefono = 'Teléfono inválido';
    if (!form.region) e.region = 'Selecciona una región';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep1(): boolean {
    const e: Record<string, string> = {};
    if (!form.tipo) e.tipo = 'Selecciona el tipo';
    if (!form.tipo_bien) e.tipo_bien = 'Selecciona el tipo de bien';
    if (!form.descripcion_bien.trim()) e.descripcion_bien = 'Describe el bien o servicio';
    if (form.monto && isNaN(parseFloat(form.monto)))
      e.monto = 'El monto debe ser un número válido';
    if (!form.detalle.trim()) e.detalle = 'El detalle del reclamo es obligatorio';
    else if (form.detalle.trim().length < 20)
      e.detalle = 'Describe tu reclamo con al menos 20 caracteres';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (step === 0) {
      if (validateStep0()) {
        setStep(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast.error('Revisa los campos marcados');
      }
    } else if (step === 1) {
      if (validateStep1()) {
        setStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast.error('Revisa los campos marcados');
      }
    }
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit() {
    if (!form.acepta) {
      toast.error('Debes aceptar los términos para continuar');
      return;
    }
    setSubmitting(true);
    try {
      const ref = `LR-${Date.now().toString(36).toUpperCase()}`;
      const payload = {
        correlativo: ref,
        tipo: form.tipo,
        tipo_bien: form.tipo_bien,
        tipo_doc: form.tipo_doc,
        num_doc: form.num_doc.trim(),
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim().toLowerCase(),
        telefono: form.telefono.trim() || null,
        direccion: form.direccion.trim() || null,
        region: form.region,
        descripcion_bien: form.descripcion_bien.trim(),
        monto: form.monto ? parseFloat(form.monto) : null,
        moneda: form.moneda,
        detalle: form.detalle.trim(),
        pedido: form.pedido.trim() || null,
        status: 'pendiente',
        notificado: false,
        es_menor: false,
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

  const steps = ['Datos Personales', 'Detalle del Reclamo', 'Confirmación'];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-16 md:py-20 overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(59,130,246,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(34,197,94,0.2) 0%, transparent 50%)',
          }} />
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-5">
              <Scale className="w-4 h-4 text-blue-300" />
              <span className="text-sm font-medium">D.S. 011-2011-PCM · Ley N° 29571 · Ley N° 29733</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Libro de Reclamaciones</h1>
            <p className="text-slate-300 text-base md:text-lg max-w-2xl mx-auto">
              Ejerce tu derecho como consumidor. Completa el formulario para registrar tu reclamo o queja.
            </p>
          </div>
        </section>

        {/* Company Info Bar */}
        <section className="border-b bg-muted/30">
          <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{companyName}</span>
            <span>RUC: {companyRuc}</span>
            <span className="hidden sm:inline">{companyAddress}</span>
          </div>
        </section>

        {/* Form Card */}
        <section className="max-w-3xl mx-auto px-4 py-8 md:py-12">
          {/* Stepper */}
          <div className="flex items-center justify-center mb-8">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center">
                <div
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    i <= step
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <span className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-xs',
                    i < step ? 'bg-white/20' : i === step ? 'bg-white/20' : 'bg-background'
                  )}>
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

          <div className="bg-card border rounded-2xl shadow-sm p-6 md:p-8">
            {/* Step 0: Personal Data */}
            {step === 0 && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Datos Personales</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Nombre" required error={errors.nombre}>
                    <TextInput value={form.nombre} onChange={(v) => update('nombre', v)} placeholder="Tu nombre" />
                  </Field>
                  <Field label="Apellido" required error={errors.apellido}>
                    <TextInput value={form.apellido} onChange={(v) => update('apellido', v)} placeholder="Tu apellido" />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Tipo de Doc." required error={errors.tipo_doc}>
                    <SelectInput value={form.tipo_doc} onChange={(v) => update('tipo_doc', v)} options={TIPO_DOC} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Número de Documento" required error={errors.num_doc}>
                      <TextInput value={form.num_doc} onChange={(v) => update('num_doc', v)} placeholder="Número de documento" />
                    </Field>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Correo Electrónico" required error={errors.email}>
                    <TextInput value={form.email} onChange={(v) => update('email', v)} placeholder="tucorreo@email.com" type="email" />
                  </Field>
                  <Field label="Teléfono" error={errors.telefono}>
                    <TextInput value={form.telefono} onChange={(v) => update('telefono', v)} placeholder="Opcional" />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Dirección" >
                    <TextInput value={form.direccion} onChange={(v) => update('direccion', v)} placeholder="Opcional" />
                  </Field>
                  <Field label="Región" required error={errors.region}>
                    <select
                      value={form.region}
                      onChange={(e) => update('region', e.target.value)}
                      className={inputClass}
                    >
                      {REGIONES_PERU.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Continuar <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Claim Details */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Detalle del Reclamo</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Tipo" required error={errors.tipo}>
                    <SelectInput value={form.tipo} onChange={(v) => update('tipo', v)} options={TIPOS} />
                  </Field>
                  <Field label="Tipo de Bien" required error={errors.tipo_bien}>
                    <SelectInput value={form.tipo_bien} onChange={(v) => update('tipo_bien', v)} options={TIPO_BIEN} />
                  </Field>
                </div>

                <Field label="Descripción del Bien / Servicio" required error={errors.descripcion_bien}>
                  <TextInput value={form.descripcion_bien} onChange={(v) => update('descripcion_bien', v)} placeholder="Ej: Teléfono modelo X, color negro" />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Monto Reclamado" error={errors.monto}>
                    <TextInput value={form.monto} onChange={(v) => update('monto', v)} placeholder="0.00" type="number" />
                  </Field>
                  <Field label="Moneda">
                    <SelectInput value={form.moneda} onChange={(v) => update('moneda', v)} options={MONEDAS} />
                  </Field>
                </div>

                <Field label="Detalle del Reclamo" required error={errors.detalle}>
                  <textarea
                    value={form.detalle}
                    onChange={(e) => update('detalle', e.target.value)}
                    placeholder="Describe los hechos de tu reclamo con el mayor detalle posible..."
                    rows={5}
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{form.detalle.length} caracteres (mínimo 20)</p>
                </Field>

                <Field label="Pedido" >
                  <TextInput value={form.pedido} onChange={(v) => update('pedido', v)} placeholder="¿Qué solicitas como solución?" />
                </Field>

                <div className="flex justify-between pt-2">
                  <button
                    onClick={handleBack}
                    className="inline-flex items-center gap-2 px-5 py-2.5 border rounded-lg font-medium hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Atrás
                  </button>
                  <button
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Continuar <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Review & Submit */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Confirmación</h2>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">Nombre:</span>{' '}
                      <span className="font-medium">{form.nombre} {form.apellido}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Documento:</span>{' '}
                      <span className="font-medium">{form.tipo_doc} {form.num_doc}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Correo:</span>{' '}
                      <span className="font-medium">{form.email}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Teléfono:</span>{' '}
                      <span className="font-medium">{form.telefono || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Región:</span>{' '}
                      <span className="font-medium">{form.region}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tipo:</span>{' '}
                      <span className="font-medium capitalize">{form.tipo}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Bien:</span>{' '}
                      <span className="font-medium capitalize">{form.tipo_bien}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Monto:</span>{' '}
                      <span className="font-medium">
                        {form.monto ? `${form.moneda === 'PEN' ? 'S/' : '$'} ${form.monto}` : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground">Descripción:</span>{' '}
                    <span className="font-medium">{form.descripcion_bien}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Detalle:</span>{' '}
                    <span className="font-medium">{form.detalle}</span>
                  </div>
                  {form.pedido && (
                    <div>
                      <span className="text-muted-foreground">Pedido:</span>{' '}
                      <span className="font-medium">{form.pedido}</span>
                    </div>
                  )}
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.acepta}
                    onChange={(e) => update('acepta', e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-input accent-primary"
                  />
                  <span className="text-sm text-muted-foreground">
                    Declaro que la información proporcionada es verídica y acepto el tratamiento de mis
                    datos personales conforme a la Ley N° 29733 (Ley de Protección de Datos Personales).
                  </span>
                </label>

                <div className="flex justify-between pt-2">
                  <button
                    onClick={handleBack}
                    className="inline-flex items-center gap-2 px-5 py-2.5 border rounded-lg font-medium hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Atrás
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {submitting ? (
                      <>Enviando...</>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Enviar Reclamo
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Success */}
            {step === 3 && correlativo && (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-bold mb-2">¡Reclamo Registrado!</h2>
                <p className="text-muted-foreground mb-4">
                  Tu reclamo ha sido registrado correctamente. Guarda el siguiente código de seguimiento:
                </p>
                <div className="inline-block px-6 py-3 rounded-lg bg-muted border-2 border-dashed border-primary/30 mb-6">
                  <span className="text-lg font-mono font-bold text-primary">{correlativo}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Nos comunicaremos contigo al correo <strong>{form.email}</strong> en un plazo máximo de
                  30 días calendario según lo establecido en la normativa vigente.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => { setForm(EMPTY); setStep(0); setCorrelativo(''); }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 border rounded-lg font-medium hover:bg-muted transition-colors"
                  >
                    Registrar otro reclamo
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Volver al inicio
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Legal Info */}
          {step < 3 && (
            <div className="mt-6 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4">
              <div className="flex gap-3">
                <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-200">
                  <p className="font-medium mb-1">Información Legal</p>
                  <p className="text-blue-700 dark:text-blue-300 text-xs leading-relaxed">
                    El presente Libro de Reclamaciones se implementa conforme al D.S. 011-2011-PCM,
                    Ley N° 29571 (Código de Protección y Defensa del Consumidor) y Ley N° 29733
                    (Ley de Protección de Datos Personales). La empresa atenderá tu reclamo en un
                    plazo máximo de 30 días calendario.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
