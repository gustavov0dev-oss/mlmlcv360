import { useState, useEffect } from 'react';
import { Link, useNavigate, Navigate } from '@/lib/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useBackend } from '@/lib/backend';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { useConfig } from '@/store/configStore';
import { LogoWithText } from '@/components/Logo';
import { Eye, EyeOff, Mail, Lock, ArrowRight, X, Sun, Moon, Check, Loader as Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Correo invalido'),
  password: z.string().min(6, 'Minimo 6 caracteres'),
});

type FormData = z.infer<typeof schema>;

function translateAuthError(msg: string): string {
  const m = (msg || '').toLowerCase();
  if (m.includes('email not confirmed')) return 'Tu correo no está confirmado. Revisa tu bandeja de entrada y confirma tu cuenta.';
  if (m.includes('invalid login credentials') || m.includes('invalid credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('too many requests') || m.includes('rate limit')) return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.';
  if (m.includes('user not found')) return 'No existe una cuenta con este correo.';
  if (m.includes('email rate limit')) return 'Demasiados correos enviados. Espera unos minutos.';
  if (m.includes('forbidden') || m.includes('forbidden action')) return 'Acción no permitida. Contacta con soporte.';
  if (m.includes('signup disabled') || m.includes('signups not allowed')) return 'El registro está deshabilitado temporalmente.';
  if (m.includes('weak password')) return 'La contraseña es demasiado débil.';
  if (m.includes('over request rate limit')) return 'Demasiadas solicitudes. Espera unos minutos.';
  if (m.includes('reauthentication needed') || m.includes('reauthentication')) return 'Necesitas volver a iniciar sesión.';
  if (m.includes('email address not authorized')) return 'Este correo no está autorizado para registrarse.';
  if (m.includes('email already registered') || m.includes('already registered')) return 'Este correo ya está registrado.';
  if (m.includes('invalid email')) return 'Correo electrónico inválido.';
  if (m.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  return msg || 'Ocurrió un error. Intenta de nuevo.';
}

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

export default function LoginPage() {
  const navigate = useNavigate();
  const backend = useBackend();
  const { theme, setTheme } = useThemeStore();
  const { user, fetchProfile } = useAuthStore();
  const { company, logoValue, logoSizes } = useConfig();
  const companyName = company.company_name || 'MLM 360';
  const isDark = theme === 'dark';

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const googleEnabled = company.google_oauth_enabled === 'true';

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    if (savedEmail) {
      setValue('email', savedEmail);
      setRememberMe(true);
    }
  }, [setValue]);

  if (user) return <Navigate to="/dashboard" />;

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    if (rememberMe) {
      localStorage.setItem('remembered_email', data.email);
    } else {
      localStorage.removeItem('remembered_email');
    }
    const result = await backend.auth.signIn(data.email, data.password);
    if (result.error) {
      toast.error(translateAuthError(result.error));
      setLoading(false);
    } else {
      const userId = result.session?.user?.id;
      let displayName = '';
      if (userId) {
        const profile = await fetchProfile(userId);
        displayName = profile?.full_name?.split(' ')[0] || profile?.username || '';
      }
      toast.success(displayName ? `¡Bienvenido, ${displayName}!` : '¡Bienvenido!');
      navigate('/dashboard');
    }
  };

  const handleGoogle = async () => {
    const result = await backend.auth.signInWithOAuth('google');
    if (result.url) window.location.href = result.url;
    else if (result.error) toast.error('Error al conectar con Google');
  };

  const handleForgot = async () => {
    if (!forgotEmail) return;
    const result = await backend.auth.resetPassword(forgotEmail);
    if (result.error) toast.error('Error al enviar correo');
    else { setForgotSent(true); toast.success('Correo enviado'); }
  };

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
            Gestiona tu red.<br />
            <span className="text-primary">Crece sin límites.</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            La plataforma MLM completa para gestionar tu negocio. Comisiones, genealogía, reportes y más.
          </p>
        </div>

        <div className="absolute bottom-6 left-8 z-10 text-xs text-muted-foreground">
          Powered by MLM 360
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
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

        {/* Form with premium styling */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-[360px] animate-fade-in-up">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Iniciar sesión</h2>
              <p className="text-sm text-muted-foreground mt-1.5">Ingresa tus credenciales para continuar.</p>
            </div>

            {/* Google OAuth - conditionally rendered */}
            {googleEnabled && (
              <>
                <button
                  onClick={handleGoogle}
                  className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-medium text-sm bg-muted/40 hover:bg-muted/60 border border-border/50 transition-all"
                >
                  <GoogleIcon />
                  Continuar con Google
                </button>

                <div className="flex items-center gap-4 my-5">
                  <div className="flex-1 h-px bg-border/50" />
                  <span className="text-xs text-muted-foreground font-medium">o con correo</span>
                  <div className="flex-1 h-px bg-border/50" />
                </div>
              </>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Correo electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="tu@correo.com"
                    className={cn(
                      "w-full pl-11 pr-4 py-3.5 rounded-xl text-sm bg-muted/30 border transition-all outline-none",
                      "placeholder:text-muted-foreground/50",
                      errors.email
                        ? "border-destructive focus:border-destructive"
                        : "border-border/50 focus:border-primary focus:bg-background hover:border-border"
                    )}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive mt-1.5 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-destructive" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Contraseña</label>
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-sm text-primary font-medium hover:opacity-80 transition-opacity"
                  >
                    ¿Olvidaste?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    placeholder="Tu contraseña"
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
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive mt-1.5 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-destructive" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember me */}
              <div
                className="flex items-center gap-3 cursor-pointer select-none"
                onClick={() => setRememberMe(!rememberMe)}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-md flex items-center justify-center transition-all border-2 shrink-0",
                    rememberMe
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-background border-border hover:border-primary/60"
                  )}
                >
                  {rememberMe && <Check className="w-3 h-3" strokeWidth={3} />}
                </div>
                <span className="text-sm text-foreground/80">Recordarme</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all",
                  "bg-primary text-primary-foreground shadow-premium",
                  "hover:opacity-90 active:scale-[0.99]",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Ingresar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Auth toggle */}
            <div className="mt-8 pt-6 border-t border-border/50 text-center">
              <span className="text-sm text-muted-foreground">
                ¿Sin cuenta?{' '}
                <Link to="/registro" className="text-primary font-medium hover:opacity-80 transition-opacity">
                  Regístrate
                </Link>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot password modal with glass effect */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay">
          <div
            className="w-full max-w-sm glass-card rounded-2xl p-6 shadow-premium-lg animate-scale-in"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-lg text-foreground">Recuperar contraseña</h3>
              <button
                onClick={() => { setForgotOpen(false); setForgotSent(false); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotSent ? (
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center bg-primary/10">
                  <Check className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground mb-1">Revisa tu correo</p>
                <p className="text-sm font-medium text-foreground mb-5">{forgotEmail}</p>
                <button
                  onClick={() => { setForgotOpen(false); setForgotSent(false); }}
                  className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
                </p>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-muted/30 border border-border/50 focus:border-primary outline-none transition-colors mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setForgotOpen(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-muted transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleForgot}
                    disabled={!forgotEmail}
                    className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Enviar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
