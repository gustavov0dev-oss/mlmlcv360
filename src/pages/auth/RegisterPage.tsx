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
import { Eye, EyeOff, CircleCheck as CheckCircle, ArrowRight, User, Mail, Lock, Loader as Loader2, Camera, Sun, Moon, ArrowLeft, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoWithText } from '@/components/Logo';

const step1Schema = z.object({
  full_name: z.string().min(3, 'Mínimo 3 caracteres'),
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirm_password: z.string(),
  referral_code: z.string().optional(),
}).refine(d => d.password === d.confirm_password, { message: 'No coinciden', path: ['confirm_password'] });

type Step1Data = z.infer<typeof step1Schema>;

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function translateError(msg: string): string {
  const m = (msg || '').toLowerCase();
  if (m.includes('already registered') || m.includes('email already registered')) return 'Este correo ya está registrado.';
  if (m.includes('email not confirmed')) return 'Tu correo no está confirmado. Revisa tu bandeja de entrada.';
  if (m.includes('invalid email')) return 'Correo electrónico inválido.';
  if (m.includes('rate limit') || m.includes('too many requests')) return 'Demasiados intentos. Espera unos minutos.';
  if (m.includes('weak password')) return 'La contraseña es demasiado débil.';
  if (m.includes('signup disabled') || m.includes('signups not allowed')) return 'El registro está deshabilitado temporalmente.';
  if (m.includes('email address not authorized')) return 'Este correo no está autorizado para registrarse.';
  if (m.includes('forbidden') || m.includes('forbidden action')) return 'Acción no permitida. Contacta con soporte.';
  if (m.includes('user not found')) return 'No existe una cuenta con este correo.';
  return 'Error al crear la cuenta. Intenta de nuevo.';
}

export default function RegisterPage() {
  const { user } = useAuthStore();
  const backend = useBackend();
  const database = useDatabase();
  const storage = useStorage();
  const { plans, currency, currencySymbol, exchangeRate, company, logoValue, logoSizes, loading: configLoading } = useConfig();
  const { theme, setTheme } = useThemeStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const companyName = company.company_name || 'MLM 360';
  const isDark = theme === 'dark';

  const [step, setStep] = useState(1);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [formData, setFormData] = useState<Step1Data | null>(null);
  const [dupError, setDupError] = useState<{ email?: string }>({});
  const [selectedPlan, setSelectedPlan] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  const googleEnabled = company.google_oauth_enabled === 'true';
  const showPlans = configLoading ? false : company.register_show_plans !== 'false';
  const requirePlan = company.register_require_plan === 'true';
  const defaultPlan = company.register_default_plan || '';
  const activePlans = plans.filter(p => p.is_active).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const confirmStep = showPlans ? 3 : 2;
  const totalSteps = showPlans ? 3 : 2;

  useEffect(() => {
    const planSlug = searchParams.get('plan') || '';
    if (planSlug) { setSelectedPlan(planSlug); return; }
    if (!showPlans) {
      const auto = defaultPlan || activePlans.find(p => p.is_free)?.slug || activePlans[0]?.slug || '';
      setSelectedPlan(auto);
    }
  }, [searchParams, activePlans, showPlans, defaultPlan]);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { referral_code: searchParams.get('ref') || '' },
  });

  const emailVal = watch('email');
  useEffect(() => {
    if (!emailVal || !emailVal.includes('@')) { setDupError(p => ({ ...p, email: undefined })); return; }
    const t = setTimeout(async () => {
      const result = await database.rpc<{ email_exists: boolean }>('check_user_exists', { p_username: '', p_email: emailVal });
      const data = result.data && !Array.isArray(result.data) ? result.data : null;
      setDupError(p => ({ ...p, email: data?.email_exists ? 'Ya registrado' : undefined }));
    }, 600);
    return () => clearTimeout(t);
  }, [emailVal, database]);

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error('Máximo 3MB'); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleStep1 = async (data: Step1Data) => {
    if (dupError.email) { toast.error('Correo ya registrado'); return; }
    setValidating(true);
    const result = await database.rpc<{ email_exists: boolean }>('check_user_exists', { p_username: '', p_email: data.email });
    setValidating(false);
    const check = result.data && !Array.isArray(result.data) ? result.data : null;
    if (check?.email_exists) { setDupError({ email: 'Ya registrado' }); toast.error('Correo ya registrado'); return; }
    setFormData(data);
    setStep(showPlans ? 2 : confirmStep);
  };

  const handleFinal = async () => {
    if (!formData) return;
    const planSlug = selectedPlan || defaultPlan || activePlans.find(p => p.is_free)?.slug || activePlans[0]?.slug || '';
    if (showPlans && requirePlan && !planSlug) { toast.error('Selecciona un plan'); setStep(showPlans ? 2 : 1); return; }
    const selectedPlanData = activePlans.find(p => p.slug === planSlug);
    const isFree = !planSlug || !selectedPlanData || selectedPlanData.is_free || Number(selectedPlanData.price) === 0;
    setLoading(true);
    const refCode = (formData.referral_code || searchParams.get('ref') || '').trim().toUpperCase();
    const result = await backend.auth.signUp(formData.email, formData.password, { full_name: formData.full_name, plan: planSlug, referral_code: refCode });
    if (result.error) { toast.error(translateError(result.error)); setLoading(false); return; }
    const userId = result.session?.user?.id;
    const hasSession = !!result.session;
    if (avatarFile && userId) {
      try {
        const ext = avatarFile.name.split('.').pop() || 'jpg';
        const upload = await storage.upload('avatars', `${userId}/avatar.${ext}`, avatarFile);
        if (upload.url) await database.update('profiles', userId, { avatar_url: upload.url, updated_at: new Date().toISOString() });
      } catch {}
    }
    setLoading(false);
    if (!hasSession) {
      if (!isFree && planSlug) { toast.success('Cuenta creada! Confirma tu correo.'); navigate(`/pago?plan=${planSlug}`); }
      else { toast.success('Cuenta creada! Revisa tu correo.'); navigate('/login'); }
      return;
    }
    if (!isFree && planSlug) { toast.success('Cuenta creada! Completa el pago.'); navigate(`/pago?plan=${planSlug}`); }
    else { toast.success(`Bienvenido a ${companyName}!`); navigate('/dashboard'); }
  };

  const pwdVal = watch('password') || '';
  const confirmPwdVal = watch('confirm_password') || '';

  // Password requirements
  const requirements = [
    { label: '8 caracteres mínimo', valid: pwdVal.length >= 8 },
    { label: 'Una mayúscula', valid: /[A-Z]/.test(pwdVal) },
    { label: 'Un número', valid: /[0-9]/.test(pwdVal) },
  ];

  const metCount = requirements.filter(r => r.valid).length;
  const strength = pwdVal.length === 0 ? 0 : metCount;
  const strengthLabels = ['', 'Débil', 'Regular', 'Fuerte'];

  if (user) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Brand panel - desktop only */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 bg-gradient-mesh flex-col items-center justify-center p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-[0.03]" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 dark:bg-primary/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-10 w-56 h-56 bg-primary/15 dark:bg-primary/10 rounded-full blur-[80px]" />
        <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-primary/10 dark:bg-primary/5 rounded-full blur-[60px]" />

        {/* Logo pinned top-left */}
        <div className="absolute top-8 left-8 z-10">
          <Link to="/">
            <LogoWithText value={logoValue} fallbackText={companyName} pixelSize={logoSizes.login || 36} pixelHeight={logoSizes.loginHeight || logoSizes.login || 36} textClass="font-semibold text-foreground" />
          </Link>
        </div>

        {/* Centered brand text */}
        <div className="relative z-10 max-w-xs w-full">
          <h1 className="text-3xl xl:text-4xl font-bold text-foreground leading-[1.15] mb-4 tracking-tight">
            Únete a la<br />
            <span className="text-primary">nueva era MLM.</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Crea tu cuenta en minutos y empieza a construir tu red con las mejores herramientas.
          </p>
        </div>

        <div className="absolute bottom-6 left-8 z-10 text-xs text-muted-foreground">
          Powered by MLM 360
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
        {/* Top bar with glass effect */}
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 lg:px-10 py-5">
          {/* Logo visible on mobile only */}
          <Link to="/" className="lg:hidden">
            <LogoWithText value={logoValue} fallbackText={companyName} pixelSize={logoSizes.login || 36} pixelHeight={logoSizes.loginHeight || logoSizes.login || 36} textClass="font-semibold text-foreground" />
          </Link>
          <div className="hidden lg:block" />
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/50 hover:bg-muted/80 transition-colors text-muted-foreground"
            aria-label="Cambiar tema"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Form content with premium styling */}
        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-[380px] animate-fade-in-up">
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-1.5 mb-7">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s, i) => (
                <div key={s} className="flex items-center">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                    step > s
                      ? "bg-primary text-primary-foreground"
                      : step === s
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/15"
                        : "bg-muted text-muted-foreground"
                  )}>
                    {step > s ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : s}
                  </div>
                  {i < totalSteps - 1 && (
                    <div className={cn(
                      "w-8 h-0.5 mx-1 transition-colors",
                      step > s ? "bg-primary" : "bg-border/50"
                    )} />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Account info */}
            {step === 1 && (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-foreground">Crear tu cuenta</h2>
                  <p className="text-sm text-muted-foreground mt-1">Rápido, seguro y sin complicaciones.</p>
                </div>

                {googleEnabled && (
                  <>
                    <button
                      onClick={async () => {
                        const ref = watch('referral_code') || searchParams.get('ref') || '';
                        const result = await backend.auth.signInWithOAuth('google');
                        if (result.url) {
                          const url = new URL(result.url);
                          if (ref) url.searchParams.set('referral_code', ref);
                          window.location.href = url.toString();
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-medium text-sm bg-muted/40 hover:bg-muted/60 border border-border/50 transition-all mb-5"
                    >
                      <GoogleIcon />
                      Continuar con Google
                    </button>

                    <div className="flex items-center gap-4 mb-5">
                      <div className="flex-1 h-px bg-border/50" />
                      <span className="text-xs text-muted-foreground font-medium">o usa tu correo</span>
                      <div className="flex-1 h-px bg-border/50" />
                    </div>
                  </>
                )}

                <form onSubmit={handleSubmit(handleStep1)} className="space-y-4">
                  {/* Avatar */}
                  <div className="flex justify-center mb-1">
                    <button type="button" onClick={() => fileRef.current?.click()} className="relative group">
                      {avatarPreview ? (
                        <img src={avatarPreview} className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/30" alt="Avatar" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-muted/50 border border-dashed border-border flex items-center justify-center group-hover:border-primary/50 transition-colors">
                          <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-sm">
                        <Camera className="w-2.5 h-2.5" />
                      </div>
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Nombre completo</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        {...register('full_name')}
                        placeholder="Tu nombre"
                        className={cn(
                          "w-full pl-11 pr-4 py-3.5 rounded-xl text-sm bg-muted/30 border transition-all outline-none",
                          "placeholder:text-muted-foreground/50",
                          errors.full_name
                            ? "border-destructive focus:border-destructive"
                            : "border-border/50 focus:border-primary focus:bg-background hover:border-border"
                        )}
                      />
                    </div>
                    {errors.full_name && (
                      <p className="text-xs text-destructive mt-1.5 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-destructive" />
                        {errors.full_name.message}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Correo electrónico</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        {...register('email')}
                        placeholder="tu@correo.com"
                        className={cn(
                          "w-full pl-11 pr-10 py-3.5 rounded-xl text-sm bg-muted/30 border transition-all outline-none",
                          "placeholder:text-muted-foreground/50",
                          errors.email || dupError.email
                            ? "border-destructive focus:border-destructive"
                            : "border-border/50 focus:border-primary focus:bg-background hover:border-border"
                        )}
                      />
                      {!errors.email && !dupError.email && emailVal && emailVal.includes('@') && (
                        <CheckCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                      )}
                    </div>
                    {(errors.email || dupError.email) && (
                      <p className="text-xs text-destructive mt-1.5 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-destructive" />
                        {errors.email?.message || dupError.email}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type={showPwd ? 'text' : 'password'}
                        {...register('password')}
                        placeholder="Crea una contraseña"
                        className={cn(
                          "w-full pl-11 pr-12 py-3.5 rounded-xl text-sm bg-muted/30 border transition-all outline-none",
                          "placeholder:text-muted-foreground/50",
                          errors.password
                            ? "border-destructive focus:border-destructive"
                            : "border-border/50 focus:border-primary focus:bg-background hover:border-border"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPwd ? "Ocultar" : "Mostrar"}
                      >
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-destructive mt-1.5 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-destructive" />
                        {errors.password.message}
                      </p>
                    )}

                    {/* Password strength */}
                    {pwdVal.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex gap-1">
                            {[1, 2, 3].map(i => (
                              <div key={i} className={cn(
                                "h-1 flex-1 rounded-full transition-all",
                                strength >= i ? "bg-primary" : "bg-muted"
                              )} />
                            ))}
                          </div>
                          <span className={cn(
                            "text-sm font-medium min-w-[55px] text-right",
                            strength === 3 ? "text-primary" : strength === 2 ? "text-warning" : "text-destructive"
                          )}>
                            {strengthLabels[strength]}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {requirements.map((req, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <div className={cn(
                                "w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all",
                                req.valid ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                              )}>
                                {req.valid ? <Check className="w-2 h-2" strokeWidth={3} /> : <X className="w-2 h-2" />}
                              </div>
                              <span className={cn("transition-colors", req.valid ? "text-primary" : "text-muted-foreground")}>
                                {req.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Confirmar contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type={showConfirmPwd ? 'text' : 'password'}
                        {...register('confirm_password')}
                        placeholder="Repite tu contraseña"
                        className={cn(
                          "w-full pl-11 pr-12 py-3.5 rounded-xl text-sm bg-muted/30 border transition-all outline-none",
                          "placeholder:text-muted-foreground/50",
                          errors.confirm_password
                            ? "border-destructive focus:border-destructive"
                            : "border-border/50 focus:border-primary focus:bg-background hover:border-border"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showConfirmPwd ? "Ocultar" : "Mostrar"}
                      >
                        {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirm_password && (
                      <p className="text-xs text-destructive mt-1.5 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-destructive" />
                        {errors.confirm_password.message}
                      </p>
                    )}
                    {!errors.confirm_password && confirmPwdVal && pwdVal === confirmPwdVal && (
                      <p className="text-xs text-primary mt-1.5 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Contraseñas coinciden
                      </p>
                    )}
                  </div>

                  {/* Referral code */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código de referido <span className="text-muted-foreground font-normal">(opcional)</span>
                    </label>
                    <input
                      {...register('referral_code')}
                      placeholder="Ej: GUST001"
                      className={cn(
                        "w-full px-4 py-3.5 rounded-xl text-sm bg-muted/30 border border-border/50 transition-all outline-none",
                        "placeholder:text-muted-foreground/50",
                        "focus:border-primary focus:bg-background"
                      )}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={validating || !!dupError.email}
                    className={cn(
                      "w-full py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all",
                      "bg-primary text-primary-foreground shadow-premium",
                      "hover:opacity-90 active:scale-[0.99]",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {validating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Continuar</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            {/* Step 2: Plan selection */}
            {step === 2 && showPlans && formData && (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-foreground">Elige tu plan</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {requirePlan ? 'Selecciona un plan para continuar.' : 'O continua con el gratuito.'}
                  </p>
                </div>

                <div className="space-y-2 mb-6 max-h-64 overflow-y-auto pr-1">
                  {activePlans.map(plan => {
                    const isFree = plan.is_free || Number(plan.price) === 0;
                    const isSelected = selectedPlan === plan.slug;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlan(isSelected && !requirePlan ? '' : plan.slug)}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border-2 transition-all group",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border/50 hover:border-border bg-background"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-sm text-foreground">{plan.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {isFree ? 'Gratis' : formatPrice(plan.price, currency, currencySymbol, exchangeRate) + '/mes'}
                            </div>
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted border border-border group-hover:border-primary/50"
                          )}>
                            {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-muted transition-colors flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Atrás
                  </button>
                  <button
                    onClick={() => setStep(confirmStep)}
                    disabled={requirePlan && !selectedPlan}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1 transition-all",
                      "bg-primary text-primary-foreground shadow-premium",
                      "hover:opacity-90 active:scale-[0.99]",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    Continuar
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Confirmation */}
            {step === confirmStep && formData && (
              <>
                <div className="text-center mb-6">
                  <div className="relative inline-block mb-4">
                    {avatarPreview ? (
                      <img src={avatarPreview} className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/30" alt="Avatar" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                        <User className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-sm">
                      <CheckCircle className="w-3 h-3" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Todo listo</h2>
                  <p className="text-sm text-muted-foreground mt-1">Revisa tus datos y crea tu cuenta</p>
                </div>

                <div className="bg-muted/30 rounded-xl p-4 mb-6 space-y-0 divide-y divide-border/50 text-sm">
                  <div className="flex justify-between py-2.5">
                    <span className="text-muted-foreground">Nombre</span>
                    <span className="font-medium text-foreground">{formData.full_name}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-muted-foreground">Correo</span>
                    <span className="font-medium text-foreground">{formData.email}</span>
                  </div>
                  {selectedPlan && (
                    <div className="flex justify-between py-2.5">
                      <span className="text-muted-foreground">Plan</span>
                      <span className="font-medium text-foreground">
                        {activePlans.find(p => p.slug === selectedPlan)?.name}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(showPlans ? 2 : 1)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-muted transition-colors flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Atrás
                  </button>
                  <button
                    onClick={handleFinal}
                    disabled={loading}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all",
                      "bg-primary text-primary-foreground shadow-premium",
                      "hover:opacity-90 active:scale-[0.99]",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Crear cuenta
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Auth toggle */}
            <div className="mt-8 pt-6 border-t border-border/50 text-center">
              <span className="text-sm text-muted-foreground">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="text-primary font-medium hover:opacity-80 transition-opacity">
                  Inicia sesión
                </Link>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
