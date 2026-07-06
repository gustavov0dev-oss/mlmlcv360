import { useState, useEffect } from 'react';
import { useBackend } from '@/lib/backend';
import { useNavigate, Link } from '@/lib/router';
import { useThemeStore } from '@/store/themeStore';
import { useConfig } from '@/store/configStore';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, Sun, Moon, CircleCheck as CheckCircle, KeyRound } from 'lucide-react';
import { LogoWithText } from '@/components/Logo';
import { cn } from '@/lib/utils';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const backend = useBackend();
  const { theme, setTheme } = useThemeStore();
  const { company, logoValue } = useConfig();
  const companyName = company.company_name || 'MLM 360';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [checking, setChecking] = useState(true);
  const isDark = theme === 'dark';

  useEffect(() => {
    const checkSession = async () => {
      const session = await backend.auth.getSession();
      if (session) setHasSession(true);
      setChecking(false);
    };
    checkSession();

    const unsubscribe = backend.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasSession(true);
        setChecking(false);
      }
    });

    return unsubscribe;
  }, [backend.auth]);

  const handleReset = async () => {
    if (!password || password.length < 8) { toast.error('Minimo 8 caracteres'); return; }
    if (password !== confirm) { toast.error('Las contrasenas no coinciden'); return; }
    setLoading(true);
    const result = await backend.auth.updatePassword(password);
    if (result.error) {
      toast.error('Error al actualizar. El enlace puede haber expirado.');
    } else {
      setDone(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    }
    setLoading(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[800px] flex rounded-2xl overflow-hidden shadow-2xl border border-border min-h-[480px]">

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

          {/* Content */}
          <div className="flex-1 flex items-center justify-center px-6 pb-8">
            <div className="w-full max-w-[300px]">
              {done ? (
                <div className="text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-7 h-7 text-green-500" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Contrasena actualizada</h2>
                  <p className="text-muted-foreground text-sm">Redirigiendo a tu panel...</p>
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : !hasSession ? (
                <div className="text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                    <KeyRound className="w-7 h-7 text-destructive" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Enlace invalido</h2>
                  <p className="text-muted-foreground text-sm">Este enlace expiro o ya fue usado. Solicita uno nuevo.</p>
                  <button onClick={() => navigate('/login')} className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                    Volver
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-5">
                    <h2 className="text-xl font-bold text-foreground mb-1">Nueva contrasena</h2>
                    <p className="text-muted-foreground text-sm">Minimo 8 caracteres.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Nueva contrasena</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimo 8 caracteres" autoComplete="new-password"
                          className={cn('w-full pl-9 pr-10 py-2.5 bg-muted border rounded-xl text-sm text-foreground outline-none focus:border-primary transition-colors',
                            password.length > 0 && password.length < 8 ? 'border-destructive' : 'border-border')} />
                        <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className={cn('text-destructive text-xs mt-1 h-4', !(password.length > 0 && password.length < 8) && 'invisible')}>
                        {password.length > 0 && password.length < 8 ? 'Minimo 8 caracteres' : ' '}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Confirmar</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input type={showPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repite la contrasena" autoComplete="new-password"
                          className={cn('w-full pl-9 pr-4 py-2.5 bg-muted border rounded-xl text-sm text-foreground outline-none focus:border-primary transition-colors',
                            confirm.length > 0 && confirm !== password ? 'border-destructive' : 'border-border')} />
                      </div>
                      <p className={cn('text-destructive text-xs mt-1 h-4', !(confirm.length > 0 && confirm !== password) && 'invisible')}>
                        {confirm.length > 0 && confirm !== password ? 'No coinciden' : ' '}
                      </p>
                    </div>

                    <button onClick={handleReset} disabled={loading || password.length < 8 || password !== confirm}
                      className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                      {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Actualizar contrasena'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
