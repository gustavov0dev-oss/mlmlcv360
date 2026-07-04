import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, Navigate, useSearchParams } from '@/lib/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useConfig, formatPrice } from '@/store/configStore';
import { toast } from 'sonner';
import {
  Eye, EyeOff, CircleCheck as CheckCircle, Boxes,
  ArrowRight, ArrowLeft, User, Mail, Lock,
  Loader as Loader2, CircleAlert as AlertCircle,
  Camera, CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const step1Schema = z.object({
  full_name: z.string().min(3, 'Mínimo 3 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirm_password: z.string(),
  referral_code: z.string().optional(),
}).refine(d => d.password === d.confirm_password, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm_password'],
});

type Step1Data = z.infer<typeof step1Schema>;

function translateAuthError(msg: string): string {
  const m = (msg || '').toLowerCase();
  if (m.includes('already registered') || m.includes('user already exists') || m.includes('email already'))
    return 'Este correo ya está registrado. Intenta iniciar sesión.';
  if (m.includes('invalid email') || m.includes('email address') || m.includes('is invalid'))
    return 'El correo electrónico no es válido. Usa un correo real como nombre@gmail.com.';
  if (m.includes('rate limit') || m.includes('too many') || m.includes('exceeded'))
    return 'Demasiados intentos. Espera unos minutos antes de intentarlo de nuevo.';
  if (m.includes('password') && (m.includes('weak') || m.includes('short')))
    return 'La contraseña es muy débil. Usa al menos 8 caracteres combinando letras y números.';
  if (m.includes('network') || m.includes('fetch') || m.includes('failed to'))
    return 'Error de conexión. Verifica tu internet e intenta de nuevo.';
  if (m.includes('signup') && m.includes('disabled'))
    return 'El registro está temporalmente deshabilitado. Intenta más tarde.';
  return 'Ocurrió un error al crear la cuenta. Por favor intenta de nuevo.';
}

export default function RegisterPage() {
  const { user } = useAuthStore();
  const { plans, currency, currencySymbol, exchangeRate, company, loading: configLoading } = useConfig();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [formData, setFormData] = useState<Step1Data | null>(null);
  const [dupError, setDupError] = useState<{ email?: string }>({});
  const [selectedPlanSlug, setSelectedPlanSlug] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  // Read admin config — wait until config is loaded so we read the real value
  // While loading, treat showPlans=false to avoid showing plan step then hiding it (flicker)
  const showPlans   = configLoading ? false : company.register_show_plans !== 'false';
  const requirePlan = company.register_require_plan === 'true';
  const defaultPlanSlug = company.register_default_plan || '';
  const companyName = company.company_name || 'MLM 360';

  const activePlans = plans
    .filter(p => p.is_active)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  // Steps: if showPlans → [Datos, Plan, Confirmar], else → [Datos, Confirmar]
  const steps = showPlans
    ? [{ n: 1, label: 'Datos' }, { n: 2, label: 'Plan' }, { n: 3, label: 'Confirmar' }]
    : [{ n: 1, label: 'Datos' }, { n: 2, label: 'Confirmar' }];

  const confirmStepN = showPlans ? 3 : 2;

  // Pre-select plan from URL param or auto-select free plan when plans hidden
  useEffect(() => {
    const planSlug = searchParams.get('plan') || '';
    if (planSlug) {
      setSelectedPlanSlug(planSlug);
      return;
    }
    if (!showPlans) {
      // Auto-assign: use default slug config, or first free plan, or first available
      const auto =
        (defaultPlanSlug && activePlans.find(p => p.slug === defaultPlanSlug)) ? defaultPlanSlug
        : activePlans.find(p => p.is_free || Number(p.price) === 0)?.slug
        ?? activePlans[0]?.slug
        ?? '';
      setSelectedPlanSlug(auto);
    }
  }, [searchParams, activePlans.length, showPlans, defaultPlanSlug]);

  if (user) return <Navigate to="/dashboard" />;

  const { register, handleSubmit, formState: { errors }, watch } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { referral_code: searchParams.get('ref') || '' },
  });

  const emailVal = watch('email');

  // Debounced duplicate email check
  useEffect(() => {
    if (!emailVal || !emailVal.includes('@')) {
      setDupError(p => ({ ...p, email: undefined }));
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc('check_user_exists', { p_username: '', p_email: emailVal });
      if (data?.email_exists) setDupError(p => ({ ...p, email: 'Este correo ya está registrado' }));
      else setDupError(p => ({ ...p, email: undefined }));
    }, 600);
    return () => clearTimeout(t);
  }, [emailVal]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error('La imagen no debe superar 3 MB'); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleStep1 = async (data: Step1Data) => {
    if (dupError.email) { toast.error('El correo ya está registrado'); return; }
    setValidating(true);
    const { data: check } = await supabase.rpc('check_user_exists', { p_username: '', p_email: data.email });
    setValidating(false);
    if (check?.email_exists) {
      setDupError({ email: 'Este correo ya está registrado' });
      toast.error('El correo ya está registrado');
      return;
    }
    setFormData(data);
    // Go to plan step if shown, else straight to confirm
    setStep(showPlans ? 2 : confirmStepN);
  };

  const handleGoToConfirm = () => {
    if (showPlans && requirePlan && !selectedPlanSlug) {
      toast.error('Debes seleccionar un plan para continuar');
      return;
    }
    setStep(confirmStepN);
  };

  const handleFinalSubmit = async () => {
    if (!formData) return;

    // Resolve which plan to use
    const planSlug = selectedPlanSlug || defaultPlanSlug || activePlans.find(p => p.is_free || Number(p.price) === 0)?.slug || activePlans[0]?.slug || '';

    if (showPlans && requirePlan && !planSlug) {
      toast.error('Debes seleccionar un plan');
      setStep(showPlans ? 2 : 1);
      return;
    }

    const selectedPlan = activePlans.find(p => p.slug === planSlug);
    const isFree = !planSlug || !selectedPlan || selectedPlan.is_free || Number(selectedPlan.price) === 0;

    setLoading(true);
    const refCode = (formData.referral_code || searchParams.get('ref') || '').trim().toUpperCase();

    // signUp returns a session directly when email confirmation is OFF
    // Do NOT call signInWithPassword after signUp — it triggers a separate rate-limit hit
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.full_name,
          plan: planSlug,
          referral_code: refCode,
        },
      },
    });

    if (signUpError) {
      toast.error(translateAuthError(signUpError.message));
      setLoading(false);
      return;
    }

    const userId = signUpData?.user?.id;
    const hasSession = !!signUpData?.session; // true when email confirmation is disabled

    // Upload avatar (best-effort)
    if (avatarFile && userId) {
      try {
        const ext = avatarFile.name.split('.').pop() || 'jpg';
        const path = `${userId}/avatar.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
          await supabase.from('profiles').update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', userId);
        }
      } catch { /* best-effort */ }
    }

    setLoading(false);

    if (!hasSession) {
      // Email confirmation is required — redirect appropriately
      if (!isFree && planSlug) {
        toast.success('¡Cuenta creada! Confirma tu correo y luego completa el pago.');
        navigate(`/pago?plan=${planSlug}`);
      } else {
        toast.success('¡Cuenta creada! Revisa tu correo para confirmar tu cuenta.');
        navigate('/login');
      }
      return;
    }

    // Session returned — user is already logged in
    if (!isFree && planSlug) {
      toast.success('¡Cuenta creada! Completa el pago para activar tu plan.');
      navigate(`/pago?plan=${planSlug}`);
    } else {
      toast.success(`¡Bienvenido a ${companyName}! Tu cuenta está lista.`);
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-foreground">{companyName}</span>
        </Link>
        <p className="text-sm text-muted-foreground hidden sm:block">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">Inicia sesión</Link>
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl">

          {/* Step indicator */}
          <div className="flex items-center justify-center mb-10">
            {steps.map((s, i) => (
              <div key={s.n} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                    step > s.n ? 'bg-green-500 text-white' :
                    step === s.n ? 'bg-primary text-white' :
                    'bg-muted text-muted-foreground',
                  )}>
                    {step > s.n ? <CheckCircle className="w-5 h-5" /> : s.n}
                  </div>
                  <span className={cn('text-xs mt-1.5 whitespace-nowrap', step === s.n ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={cn('w-16 sm:w-24 h-0.5 mx-3 mb-5 transition-colors', step > s.n ? 'bg-green-500' : 'bg-border')} />
                )}
              </div>
            ))}
          </div>

          {/* ── Step 1: Datos ── */}
          {step === 1 && (
            <form onSubmit={handleSubmit(handleStep1)} className="bg-card border border-border rounded-2xl p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-foreground mb-1">Crea tu cuenta</h2>
              <p className="text-muted-foreground text-sm mb-6">Rápido, seguro y sin complicaciones.</p>

              {/* Avatar upload */}
              <div className="flex flex-col items-center mb-6">
                <button type="button" onClick={() => fileRef.current?.click()} className="relative group">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-primary/30" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center group-hover:border-primary/50 transition-colors">
                      <User className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center shadow-md">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                <p className="text-xs text-muted-foreground mt-2">Foto de perfil (opcional)</p>
              </div>

              <div className="space-y-4">
                {/* Full name */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Nombre completo *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input {...register('full_name')} placeholder="Juan Pérez"
                      className={cn('w-full pl-10 pr-3 py-3 bg-muted border rounded-xl text-foreground text-sm outline-none transition-colors placeholder:text-muted-foreground',
                        errors.full_name ? 'border-destructive' : 'border-border focus:border-primary')} />
                  </div>
                  {errors.full_name && <p className="text-destructive text-xs mt-1">{errors.full_name.message}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Correo electrónico *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input {...register('email')} type="email" placeholder="juan@ejemplo.com"
                      className={cn('w-full pl-10 pr-3 py-3 bg-muted border rounded-xl text-foreground text-sm outline-none transition-colors placeholder:text-muted-foreground',
                        errors.email || dupError.email ? 'border-destructive' : 'border-border focus:border-primary')} />
                  </div>
                  {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
                  {!errors.email && dupError.email && (
                    <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {dupError.email}
                    </p>
                  )}
                </div>

                {/* Passwords */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Contraseña *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input {...register('password')} type={showPassword ? 'text' : 'password'} placeholder="Mínimo 8 caracteres"
                        className={cn('w-full pl-10 pr-10 py-3 bg-muted border rounded-xl text-foreground text-sm outline-none transition-colors placeholder:text-muted-foreground',
                          errors.password ? 'border-destructive' : 'border-border focus:border-primary')} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Confirmar contraseña *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input {...register('confirm_password')} type={showPassword ? 'text' : 'password'} placeholder="Repite tu contraseña"
                        className={cn('w-full pl-10 pr-3 py-3 bg-muted border rounded-xl text-foreground text-sm outline-none transition-colors placeholder:text-muted-foreground',
                          errors.confirm_password ? 'border-destructive' : 'border-border focus:border-primary')} />
                    </div>
                    {errors.confirm_password && <p className="text-destructive text-xs mt-1">{errors.confirm_password.message}</p>}
                  </div>
                </div>

                {/* Referral */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Código de referido <span className="text-muted-foreground font-normal">(opcional)</span>
                  </label>
                  <input {...register('referral_code')} placeholder="Ej: GUST001"
                    className="w-full px-3 py-3 bg-muted border border-border focus:border-primary rounded-xl text-foreground text-sm outline-none transition-colors placeholder:text-muted-foreground" />
                  {searchParams.get('ref') && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Código aplicado: {searchParams.get('ref')}
                    </p>
                  )}
                </div>
              </div>

              <button type="submit" disabled={validating || !!dupError.email}
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-xl mt-6 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {validating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Validando...</>
                  : <>Continuar <ArrowRight className="w-4 h-4" /></>}
              </button>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">o continúa con</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <button
                type="button"
                onClick={async () => {
                  const ref = (watch('referral_code') || searchParams.get('ref') || '').trim();
                  await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: window.location.origin,
                      queryParams: ref ? { referral_code: ref } : undefined,
                    },
                  });
                }}
                className="w-full mt-3 border border-border hover:bg-muted py-3 rounded-xl transition-colors flex items-center justify-center gap-3 text-sm font-medium text-foreground"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Registrarse con Google
              </button>
            </form>
          )}

          {/* ── Step 2: Plan (only when showPlans) ── */}
          {step === 2 && showPlans && formData && (
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-foreground mb-1">Elige tu plan</h2>
              <p className="text-muted-foreground text-sm mb-6">
                {requirePlan
                  ? 'Selecciona un plan para continuar.'
                  : 'Elige un plan o continúa sin seleccionar uno.'}
              </p>

              <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto pr-1">
                {activePlans.map(plan => {
                  const isFree = plan.is_free || Number(plan.price) === 0;
                  const isSelected = selectedPlanSlug === plan.slug;
                  return (
                    <button key={plan.id} type="button"
                      onClick={() => setSelectedPlanSlug(isSelected && !requirePlan ? '' : plan.slug)}
                      className={cn('w-full text-left p-4 rounded-xl border-2 transition-all',
                        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40')}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-foreground">{plan.name}</span>
                            {plan.badge && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">{plan.badge}</span>}
                            {isFree && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">Gratis</span>}
                          </div>
                          {plan.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{plan.description}</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xl font-bold text-foreground">
                            {isFree ? 'Gratis' : formatPrice(plan.price, currency, currencySymbol, exchangeRate)}
                          </div>
                          {!isFree && <div className="text-xs text-muted-foreground">/mes</div>}
                        </div>
                      </div>
                      {isSelected && plan.features?.length > 0 && (
                        <ul className="mt-3 space-y-1 border-t border-border/40 pt-3">
                          {plan.features.slice(0, 5).map((f: string) => (
                            <li key={f} className="flex items-center gap-1.5 text-xs text-foreground">
                              <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> {f}
                            </li>
                          ))}
                        </ul>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 border border-border hover:bg-muted py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-medium text-foreground">
                  <ArrowLeft className="w-4 h-4" /> Atrás
                </button>
                <button type="button" onClick={handleGoToConfirm}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                  Continuar <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Confirm step ── */}
          {step === confirmStepN && formData && (
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 overflow-hidden">
                  {avatarPreview
                    ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                    : <CheckCircle className="w-8 h-8 text-primary" />}
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-1">¡Todo listo!</h2>
                <p className="text-muted-foreground text-sm">Revisa tu información antes de crear la cuenta.</p>
              </div>

              <div className="space-y-0 mb-6 divide-y divide-border/50">
                {[
                  { label: 'Nombre', value: formData.full_name },
                  { label: 'Correo', value: formData.email },
                  ...(selectedPlanSlug
                    ? [{ label: 'Plan', value: activePlans.find(p => p.slug === selectedPlanSlug)?.name || selectedPlanSlug }]
                    : [{ label: 'Plan', value: 'Sin plan (puedes elegir uno más adelante)' }]),
                  ...(formData.referral_code ? [{ label: 'Referido por', value: formData.referral_code }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-2.5">
                    <span className="text-muted-foreground text-sm">{label}</span>
                    <span className="text-foreground font-medium text-sm text-right max-w-[60%]">{value}</span>
                  </div>
                ))}
              </div>

              {(() => {
                const plan = activePlans.find(p => p.slug === selectedPlanSlug);
                const isFree = !plan || plan.is_free || Number(plan.price) === 0;
                if (!isFree) return (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <CreditCard className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Este plan requiere pago. Serás redirigido a la pasarela de pago al crear tu cuenta.
                    </p>
                  </div>
                );
                return (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
                    <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      {plan ? 'Plan gratuito — tu cuenta se activará de inmediato.' : 'Tu cuenta se creará sin plan activo.'}
                    </p>
                  </div>
                );
              })()}

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(showPlans ? 2 : 1)}
                  className="flex-1 border border-border hover:bg-muted py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-medium text-foreground">
                  <ArrowLeft className="w-4 h-4" /> Atrás
                </button>
                <button type="button" onClick={handleFinalSubmit} disabled={loading}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <><CheckCircle className="w-4 h-4" /> Crear cuenta</>}
                </button>
              </div>
            </div>
          )}

        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-primary font-medium hover:text-primary/80 transition-colors">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
