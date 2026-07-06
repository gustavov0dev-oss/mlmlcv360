import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, Navigate, useSearchParams } from '@/lib/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useBackend, useDatabase, useStorage } from '@/lib/backend';
import { useAuthStore } from '@/store/authStore';
import { useConfig, formatPrice } from '@/store/configStore';
import { useThemeStore } from '@/store/themeStore';
import { toast } from 'sonner';
import {
  Eye, EyeOff, CircleCheck as CheckCircle, ArrowRight, ArrowLeft,
  User, Mail, Lock, Loader as Loader2, CircleAlert as AlertCircle,
  Camera, CreditCard, Sun, Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoWithText } from '@/components/Logo';

const schema = z.object({
  full_name: z.string().min(3, 'Minimo 3 caracteres').max(100, 'Muy largo'),
  email: z.string().email('Correo invalido'),
  password: z.string().min(8, 'Minimo 8 caracteres'),
  confirm_password: z.string(),
  referral_code: z.string().optional(),
}).refine(d => d.password === d.confirm_password, { message: 'No coinciden', path: ['confirm_password'] });

type FormData = z.infer<typeof schema>;

function translateAuthError(msg: string): string {
  const m = (msg || '').toLowerCase();
  if (m.includes('already registered') || m.includes('user already exists') || m.includes('email already'))
    return 'Este correo ya esta registrado.';
  if (m.includes('invalid email')) return 'El correo no es valido.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Espera unos minutos.';
  if (m.includes('password') && m.includes('weak')) return 'La contrasena es muy debil.';
  return 'Ocurrio un error. Intenta de nuevo.';
}

export default function RegisterPage() {
  const { user } = useAuthStore();
  const backend = useBackend();
  const database = useDatabase();
  const storage = useStorage();
  const { plans, currency, currencySymbol, exchangeRate, company, logoValue, loading: configLoading } = useConfig();
  const { theme, setTheme } = useThemeStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [dupError, setDupError] = useState<string>('');
  const [selectedPlanSlug, setSelectedPlanSlug] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [step, setStep] = useState<'data' | 'plan' | 'confirm'>('data');
  const [formData, setFormData] = useState<FormData | null>(null);
  const isDark = theme === 'dark';

  const companyName = company.company_name || 'MLM 360';
  const googleOAuthEnabled = company.google_oauth_enabled === 'true';
  const showPlans = !configLoading && company.register_show_plans !== 'false';
  const requirePlan = company.register_require_plan === 'true';
  const defaultPlanSlug = company.register_default_plan || '';

  const activePlans = plans.filter(p => p.is_active).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  useEffect(() => {
    const planSlug = searchParams.get('plan') || '';
    if (planSlug) { setSelectedPlanSlug(planSlug); return; }
    if (!showPlans) {
      const auto = defaultPlanSlug || activePlans.find(p => p.is_free || Number(p.price) === 0)?.slug || activePlans[0]?.slug || '';
      setSelectedPlanSlug(auto);
    }
  }, [searchParams, activePlans.length, showPlans, defaultPlanSlug]);

  if (user) return <Navigate to="/dashboard" />;

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { referral_code: searchParams.get('ref') || '' },
  });

  const emailVal = watch('email');

  useEffect(() => {
    setDupError('');
    if (!emailVal || !emailVal.includes('@') || !emailVal.includes('.')) return;
    const t = setTimeout(async () => {
      try {
        const result = await database.rpc<{ email_exists: boolean }>('check_user_exists', { p_username: '', p_email: emailVal });
        const data = result.data && !Array.isArray(result.data) ? result.data : null;
        if (data?.email_exists) setDupError('Este correo ya esta registrado');
      } catch { /* ignore */ }
    }, 700);
    return () => clearTimeout(t);
  }, [emailVal, database]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error('La imagen no debe superar 3 MB'); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleGoogleAuth = async () => {
    const ref = (watch('referral_code') || searchParams.get('ref') || '').trim();
    const result = await backend.auth.signInWithOAuth('google');
    if (result.url) {
      const url = new URL(result.url);
      if (ref) url.searchParams.set('referral_code', ref);
      window.location.href = url.toString();
    }
    if (result.error) toast.error('Error al conectar con Google');
  };

  const handleDataSubmit = async (data: FormData) => {
    if (dupError) { toast.error(dupError); return; }
    setValidating(true);
    try {
      const result = await database.rpc<{ email_exists: boolean }>('check_user_exists', { p_username: '', p_email: data.email });
      const check = result.data && !Array.isArray(result.data) ? result.data : null;
      if (check?.email_exists) {
        setDupError('Este correo ya esta registrado');
        toast.error('Este correo ya esta registrado');
        setValidating(false);
        return;
      }
    } catch { /* proceed */ }
    setValidating(false);
    setFormData(data);
    setStep(showPlans ? 'plan' : 'confirm');
  };

  const handlePlanNext = () => {
    if (showPlans && requirePlan && !selectedPlanSlug) { toast.error('Selecciona un plan'); return; }
    setStep('confirm');
  };

  const handleFinalSubmit = async () => {
    if (!formData) return;

    // Final security check before calling signUp
    try {
      const check = await database.rpc<{ email_exists: boolean }>('check_user_exists', { p_username: '', p_email: formData.email });
      const d = check.data && !Array.isArray(check.data) ? check.data : null;
      if (d?.email_exists) {
        toast.error('Este correo ya esta registrado. Inicia sesion.');
        setStep('data');
        setDupError('Este correo ya esta registrado');
        return;
      }
    } catch { /* proceed */ }

    const planSlug = selectedPlanSlug || defaultPlanSlug || activePlans.find(p => p.is_free || Number(p.price) === 0)?.slug || activePlans[0]?.slug || '';
    const selectedPlan = activePlans.find(p => p.slug === planSlug);
    const isFree = !planSlug || !selectedPlan || selectedPlan.is_free || Number(selectedPlan.price) === 0;

    setLoading(true);
    const refCode = (formData.referral_code || searchParams.get('ref') || '').trim().toUpperCase();

    const signUpResult = await backend.auth.signUp(formData.email, formData.password, {
      full_name: formData.full_name,
      plan: planSlug,
      referral_code: refCode,
    });

    if (signUpResult.error) {
      const errMsg = signUpResult.error;
      if (errMsg.toLowerCase().includes('already')) {
        toast.error('Este correo ya esta registrado. Inicia sesion.');
        setStep('data');
        setDupError('Este correo ya esta registrado');
      } else {
        toast.error(translateAuthError(errMsg));
      }
      setLoading(false);
      return;
    }

    // Supabase returns success with no session/identities when email already exists
    // In that case it sends a "confirm" email silently — detect and handle it
    const userId = signUpResult.session?.user?.id;
    const hasSession = !!signUpResult.session;

    if (avatarFile && userId) {
      try {
        const ext = avatarFile.name.split('.').pop() || 'jpg';
        const path = `${userId}/avatar.${ext}`;
        const uploadResult = await storage.upload('avatars', path, avatarFile);
        if (uploadResult.url) await database.update('profiles', userId, { avatar_url: uploadResult.url, updated_at: new Date().toISOString() });
      } catch { /* best-effort */ }
    }

    setLoading(false);

    if (!hasSession) {
      if (!isFree && planSlug) { toast.success('Cuenta creada. Revisa tu correo y completa el pago.'); navigate(`/pago?plan=${planSlug}`); }
      else { toast.success('Cuenta creada. Revisa tu correo para confirmar.'); navigate('/login'); }
      return;
    }

    if (!isFree && planSlug) { toast.success('Cuenta creada. Completa el pago.'); navigate(`/pago?plan=${planSlug}`); }
    else { toast.success(`Bienvenido a ${companyName}!`); navigate('/dashboard'); }
  };

  const steps = (['data', ...(showPlans ? ['plan'] : []), 'confirm'] as const);
  const stepIdx = steps.indexOf(step);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[900px] flex rounded-2xl overflow-hidden shadow-2xl border border-border" style={{ minHeight: '600px' }}>

        {/* Left panel — minimal, logo only */}
        <div className="hidden md:flex md:w-[42%] relative flex-col items-center justify-center bg-[#05101d] overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/20 via-transparent to-cyan-500/10" />
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-cyan-400/8 rounded-full blur-3xl pointer-events-none" />
          </div>
          <div className="relative z-10 flex flex-col items-center gap-3 px-8 text-center">
            <LogoWithText value={logoValue} fallbackText={companyName} size="w-14 h-14" textClass="text-2xl font-bold text-white" />
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col bg-card">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2 md:hidden">
              <LogoWithText value={logoValue} fallbackText={companyName} size="w-7 h-7" textClass="font-bold text-foreground text-sm" />
            </div>
            <div className="hidden md:block" />
            <div className="flex items-center gap-2">
              <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <Link to="/login" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">Iniciar sesion</Link>
            </div>
          </div>

          {/* Form area */}
          <div className="flex-1 flex items-center justify-center px-6 pb-6 overflow-y-auto">
            <div className="w-full max-w-[320px] py-4">

              {/* Step indicator */}
              <div className="flex items-center justify-center gap-1.5 mb-5">
                {steps.map((s, i) => {
                  const done = i < stepIdx;
                  const active = s === step;
                  return (
                    <div key={s} className="flex items-center">
                      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                        done ? 'bg-green-500 text-white' : active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground')}>
                        {done ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      {i < steps.length - 1 && <div className={cn('w-6 h-0.5 mx-1', done ? 'bg-green-500' : 'bg-border')} />}
                    </div>
                  );
                })}
              </div>

              {/* DATA */}
              {step === 'data' && (
                <>
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-foreground mb-0.5">Crear cuenta</h2>
                    <p className="text-muted-foreground text-sm">Rapido y seguro.</p>
                  </div>

                  {googleOAuthEnabled && (
                    <>
                      <button type="button" onClick={handleGoogleAuth}
                        className="w-full border border-border hover:bg-muted/60 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2.5 text-sm font-medium text-foreground mb-3">
                        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Continuar con Google
                      </button>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground">o con correo</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    </>
                  )}

                  {/* Avatar */}
                  <div className="flex justify-center mb-3">
                    <button type="button" onClick={() => fileRef.current?.click()} className="relative group">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-primary/30" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center group-hover:border-primary/50 transition-colors">
                          <Camera className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">+</div>
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </div>

                  <form onSubmit={handleSubmit(handleDataSubmit)} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Nombre completo</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input {...register('full_name')} placeholder="Juan Perez"
                          className={cn('w-full pl-9 pr-3 py-2.5 bg-muted border rounded-xl text-foreground text-sm outline-none transition-colors',
                            errors.full_name ? 'border-destructive' : 'border-border focus:border-primary')} />
                      </div>
                      <p className={cn('text-destructive text-xs mt-1 h-4', !errors.full_name && 'invisible')}>{errors.full_name?.message || ' '}</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Correo electronico</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input {...register('email')} type="email" placeholder="tu@correo.com"
                          className={cn('w-full pl-9 pr-3 py-2.5 bg-muted border rounded-xl text-foreground text-sm outline-none transition-colors',
                            errors.email || dupError ? 'border-destructive' : 'border-border focus:border-primary')} />
                      </div>
                      <p className={cn('text-destructive text-xs mt-1 h-4 flex items-center gap-1', !errors.email && !dupError && 'invisible')}>
                        {(errors.email || dupError) && <AlertCircle className="w-3 h-3 flex-shrink-0" />}
                        {errors.email?.message || dupError || ' '}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">Contrasena</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <input {...register('password')} type={showPassword ? 'text' : 'password'} placeholder="Min 8"
                            className={cn('w-full pl-9 pr-8 py-2.5 bg-muted border rounded-xl text-foreground text-sm outline-none transition-colors',
                              errors.password ? 'border-destructive' : 'border-border focus:border-primary')} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <p className={cn('text-destructive text-xs mt-1 h-4', !errors.password && 'invisible')}>{errors.password?.message || ' '}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">Confirmar</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <input {...register('confirm_password')} type={showPassword ? 'text' : 'password'} placeholder="Repetir"
                            className={cn('w-full pl-9 pr-3 py-2.5 bg-muted border rounded-xl text-foreground text-sm outline-none transition-colors',
                              errors.confirm_password ? 'border-destructive' : 'border-border focus:border-primary')} />
                        </div>
                        <p className={cn('text-destructive text-xs mt-1 h-4', !errors.confirm_password && 'invisible')}>{errors.confirm_password?.message || ' '}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Codigo de referido <span className="text-muted-foreground font-normal">(opcional)</span>
                      </label>
                      <input {...register('referral_code')} placeholder="Ej: JUAN001"
                        className="w-full px-3 py-2.5 bg-muted border border-border focus:border-primary rounded-xl text-foreground text-sm outline-none transition-colors" />
                    </div>

                    <button type="submit" disabled={validating || !!dupError}
                      className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm mt-1">
                      {validating ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</> : <>Continuar <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </form>
                </>
              )}

              {/* PLAN */}
              {step === 'plan' && showPlans && (
                <>
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-foreground mb-0.5">Elige tu plan</h2>
                    <p className="text-muted-foreground text-sm">{requirePlan ? 'Selecciona uno para continuar.' : 'Puedes cambiarlo despues.'}</p>
                  </div>

                  <div className="space-y-2 mb-4 max-h-[220px] overflow-y-auto pr-0.5">
                    {activePlans.map(plan => {
                      const isFree = plan.is_free || Number(plan.price) === 0;
                      const isSelected = selectedPlanSlug === plan.slug;
                      return (
                        <button key={plan.id} type="button" onClick={() => setSelectedPlanSlug(isSelected && !requirePlan ? '' : plan.slug)}
                          className={cn('w-full text-left px-3.5 py-3 rounded-xl border-2 transition-all',
                            isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40')}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground text-sm">{plan.name}</span>
                              {isFree && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600">Gratis</span>}
                            </div>
                            <span className="text-sm font-bold text-foreground">{isFree ? 'Gratis' : formatPrice(plan.price, currency, currencySymbol, exchangeRate)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <button type="button" onClick={() => setStep('data')} className="flex-1 border border-border hover:bg-muted py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-medium text-foreground">
                      <ArrowLeft className="w-4 h-4" /> Atras
                    </button>
                    <button type="button" onClick={handlePlanNext} className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                      Siguiente <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}

              {/* CONFIRM */}
              {step === 'confirm' && formData && (
                <>
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-foreground mb-0.5">Confirmar</h2>
                    <p className="text-muted-foreground text-sm">Revisa que todo este correcto.</p>
                  </div>

                  <div className="bg-muted/50 border border-border rounded-xl p-4 mb-4 space-y-0 divide-y divide-border/50">
                    {[
                      { label: 'Nombre', value: formData.full_name },
                      { label: 'Correo', value: formData.email },
                      { label: 'Plan', value: activePlans.find(p => p.slug === selectedPlanSlug)?.name || 'Sin plan' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between py-2 first:pt-0 last:pb-0">
                        <span className="text-muted-foreground text-sm">{label}</span>
                        <span className="text-foreground font-medium text-sm truncate ml-4 max-w-[160px] text-right">{value}</span>
                      </div>
                    ))}
                  </div>

                  {(() => {
                    const plan = activePlans.find(p => p.slug === selectedPlanSlug);
                    const isFree = !plan || plan.is_free || Number(plan.price) === 0;
                    if (!isFree) return (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <p className="text-xs text-amber-600 dark:text-amber-400">Se redirigira al pago.</p>
                      </div>
                    );
                    return (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-4 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <p className="text-xs text-green-600 dark:text-green-400">Activacion instantanea.</p>
                      </div>
                    );
                  })()}

                  <div className="flex gap-2">
                    <button type="button" onClick={() => setStep(showPlans ? 'plan' : 'data')} className="flex-1 border border-border hover:bg-muted py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-medium text-foreground">
                      <ArrowLeft className="w-4 h-4" /> Atras
                    </button>
                    <button type="button" onClick={handleFinalSubmit} disabled={loading}
                      className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear cuenta'}
                    </button>
                  </div>
                </>
              )}

              <p className="mt-4 text-center text-xs text-muted-foreground">
                Ya tienes cuenta?{' '}
                <Link to="/login" className="text-primary font-medium hover:text-primary/80 transition-colors">Iniciar sesion</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
