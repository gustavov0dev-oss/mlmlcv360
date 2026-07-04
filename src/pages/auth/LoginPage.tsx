import { useState } from 'react';
import { Link, useNavigate, Navigate } from '@/lib/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, TrendingUp, Users, DollarSign, Sun, Moon, Boxes, ArrowRight, Shield, CircleCheck as CheckCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  remember: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeStore();
  const { user } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const isDark = theme === 'dark';

  if (user) return <Navigate to="/dashboard" />;

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: localStorage.getItem('mlm360-remembered-email') || '',
      remember: !!localStorage.getItem('mlm360-remembered-email'),
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) {
      const msg = error.message === 'Invalid login credentials'
        ? 'Credenciales incorrectas. Verifica tu correo y contraseña.'
        : error.message === 'Email not confirmed'
        ? 'Tu correo no ha sido confirmado. Contacta al administrador.'
        : error.message;
      toast.error(msg);
      setLoading(false);
    } else {
      // Remember session: store email for pre-fill next time
      if (data.remember) {
        localStorage.setItem('mlm360-remembered-email', data.email);
      } else {
        localStorage.removeItem('mlm360-remembered-email');
      }
      toast.success('¡Bienvenido de regreso!');
      navigate('/dashboard');
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) toast.error('Error al conectar con Google');
    setGoogleLoading(false);
  };

  const handleForgot = async () => {
    if (!forgotEmail) return;
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error('Error al enviar el correo de recuperación');
    else { setForgotSent(true); toast.success('Correo de recuperación enviado'); }
    setForgotLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Left panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[58%] relative overflow-hidden bg-[#06111f]">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=1400"
            alt=""
            className="w-full h-full object-cover opacity-[0.12]"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#06111f] via-[#071828]/80 to-[#06111f]" />
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Boxes className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">MLM 360</div>
              <div className="text-xs text-blue-300/60">Sistema Empresarial Premium</div>
            </div>
          </Link>

          <div className="max-w-md">
            <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/20 rounded-full px-4 py-2 text-blue-300 text-xs mb-6">
              <Shield className="w-3.5 h-3.5" />
              Plataforma certificada y segura
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              Crece tu red.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                Multiplica tus ingresos.
              </span>
            </h1>
            <p className="text-blue-100/50 text-base leading-relaxed mb-10">
              El sistema MLM empresarial más completo del Perú.
            </p>

            <div className="grid grid-cols-3 gap-4 mb-10">
              {[
                { icon: Users, label: 'Afiliados', value: '12K+' },
                { icon: DollarSign, label: 'Pagado', value: 'S/2.8M' },
                { icon: TrendingUp, label: 'Crecimiento', value: '+340%' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <Icon className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                  <div className="text-lg font-bold text-white">{value}</div>
                  <div className="text-xs text-blue-300/50">{label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {[
                { text: 'Comisiones automáticas quincenales' },
                { text: 'Árbol genealógico en tiempo real' },
                { text: '6 rangos con bonos exclusivos' },
              ].map(item => (
                <div key={item.text} className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-blue-100/60">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-white/60 text-sm italic mb-3">
              "En 8 meses alcancé el rango Diamante. El sistema es increíblemente intuitivo."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center text-sm font-bold text-blue-300">R</div>
              <div>
                <div className="text-sm font-medium text-white">Roberto Mendoza</div>
                <div className="text-xs text-blue-300/50">Diamante · Lima, Perú</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel: Form ── */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Boxes className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground">MLM 360</span>
          </Link>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-1.5">Bienvenido de regreso</h2>
              <p className="text-muted-foreground text-sm">Ingresa tus credenciales para continuar.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Correo electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="correo@empresa.pe"
                    className={cn(
                      'w-full pl-9 pr-4 py-2.5 bg-muted border rounded-xl text-foreground text-sm placeholder:text-muted-foreground outline-none transition-colors',
                      errors.email ? 'border-destructive' : 'border-border focus:border-primary'
                    )}
                  />
                </div>
                {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-foreground">Contraseña</label>
                  <button type="button" onClick={() => setForgotOpen(true)} className="text-xs text-primary hover:text-primary/80 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    placeholder="••••••••"
                    className={cn(
                      'w-full pl-9 pr-10 py-2.5 bg-muted border rounded-xl text-foreground text-sm placeholder:text-muted-foreground outline-none transition-colors',
                      errors.password ? 'border-destructive' : 'border-border focus:border-primary'
                    )}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message}</p>}
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" {...register('remember')} id="remember" className="rounded border-border" />
                <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">Recordar sesión</label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span>Ingresar al sistema</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">o continúa con</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full border border-border hover:bg-muted py-2.5 rounded-xl transition-colors flex items-center justify-center gap-3 text-sm font-medium text-foreground disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar con Google
            </button>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              ¿No tienes cuenta?{' '}
              <Link to="/registro" className="text-primary font-medium hover:text-primary/80 transition-colors">
                Regístrate gratis
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot password modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Recuperar contraseña</h3>
              <button onClick={() => { setForgotOpen(false); setForgotSent(false); }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            {forgotSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-sm text-foreground mb-4">Te enviamos un correo a <strong>{forgotEmail}</strong> con instrucciones para restablecer tu contraseña.</p>
                <button onClick={() => { setForgotOpen(false); setForgotSent(false); }} className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                  Entendido
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground mb-4"
                />
                <div className="flex gap-3">
                  <button onClick={() => setForgotOpen(false)} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancelar</button>
                  <button onClick={handleForgot} disabled={forgotLoading || !forgotEmail} className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {forgotLoading ? 'Enviando...' : 'Enviar enlace'}
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
