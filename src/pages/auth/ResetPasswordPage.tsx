import { useState, useEffect } from 'react';
import { Link, useNavigate } from '@/lib/router';
import { useBackend } from '@/lib/backend';
import { useConfig } from '@/store/configStore';
import { useThemeStore } from '@/store/themeStore';
import { LogoWithText } from '@/components/Logo';
import { Eye, EyeOff, Lock, ArrowRight, CircleCheck as CheckCircle, ShieldAlert, Sun, Moon, Check, X, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const backend = useBackend();
  const { company, logoValue } = useConfig();
  const { theme, setTheme } = useThemeStore();
  const companyName = company.company_name || 'MLM 360';
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [done, setDone] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const session = await backend.auth.getSession();
      if (!cancelled) {
        const isRecovery = !!(session) && (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery'));
        setValid(!!(session && isRecovery));
        setChecking(false);
      }
    };
    check();
    return () => { cancelled = true; };
  }, [backend.auth]);

  // Password requirements
  const requirements = [
    { label: '8 caracteres minimo', valid: password.length >= 8 },
    { label: 'Una mayuscula', valid: /[A-Z]/.test(password) },
    { label: 'Un numero', valid: /[0-9]/.test(password) },
  ];

  const metCount = requirements.filter(r => r.valid).length;
  const strength = password.length === 0 ? 0 : metCount;
  const strengthLabels = ['', 'Debil', 'Regular', 'Fuerte'];

  const passwordsMatch = password === confirm && confirm.length > 0;
  const canSubmit = password.length >= 8 && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error('Minimo 8 caracteres'); return; }
    if (password !== confirm) { toast.error('No coinciden'); return; }
    setLoading(true);
    const { error } = await backend.auth.updatePassword(password);
    setLoading(false);
    if (error) { toast.error('Error al actualizar'); return; }
    setDone(true);
    toast.success('Contrasena actualizada');
    setTimeout(() => navigate('/dashboard'), 2000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/5 dark:bg-primary/3 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[200px] bg-primary/3 dark:bg-primary/2 rounded-full blur-[80px]" />
      </div>

      <div className="w-full max-w-[360px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <LogoWithText value={logoValue} fallbackText={companyName} size="w-8 h-8" textClass="font-semibold text-foreground" />
          </Link>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/50 hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {checking ? (
          /* Checking state */
          <div className="bg-card border border-border/50 rounded-2xl p-8 text-center">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Verificando enlace de recuperacion...</p>
          </div>
        ) : !valid ? (
          /* Invalid link state */
          <div className="bg-card border border-border/50 rounded-2xl p-8">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
                <ShieldAlert className="w-6 h-6 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Enlace invalido</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Este enlace ha expirado o no es valido. Solicita uno nuevo desde la pagina de inicio de sesion.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-muted hover:bg-muted/80 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al inicio
              </Link>
            </div>
          </div>
        ) : done ? (
          /* Success state */
          <div className="bg-card border border-border/50 rounded-2xl p-8">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Contrasena actualizada</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Tu contrasena ha sido cambiada exitosamente.
              </p>

              {/* Progress bar */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ animation: 'shrink 2s linear forwards' }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3">Redirigiendo al panel...</p>

              <style>{`
                @keyframes shrink {
                  from { width: 100%; }
                  to { width: 0%; }
                }
              `}</style>
            </div>
          </div>
        ) : (
          /* Reset form */
          <div className="bg-card border border-border/50 rounded-2xl p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Nueva contrasena</h2>
              <p className="text-sm text-muted-foreground mt-1">Crea una contrasena segura para tu cuenta</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Password field */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-2">Nueva contrasena</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Crea una contrasena"
                    className={cn(
                      "w-full pl-11 pr-12 py-3 rounded-xl text-sm bg-muted/30 border border-border/50 transition-all outline-none",
                      "placeholder:text-muted-foreground/60",
                      "focus:border-primary focus:bg-background"
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

                {/* Password strength */}
                {password.length > 0 && (
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
                        "text-xs font-medium min-w-[50px] text-right",
                        strength === 3 ? "text-primary" : strength === 2 ? "text-warning" : "text-destructive"
                      )}>
                        {strengthLabels[strength]}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {requirements.map((req, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
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
                <label className="block text-xs font-medium text-foreground mb-2">Confirmar contrasena</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repite la contrasena"
                    className={cn(
                      "w-full pl-11 pr-12 py-3 rounded-xl text-sm bg-muted/30 border transition-all outline-none",
                      "placeholder:text-muted-foreground/60",
                      confirm && !passwordsMatch
                        ? "border-destructive focus:border-destructive"
                        : "border-border/50 focus:border-primary focus:bg-background"
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
                {confirm && !passwordsMatch && (
                  <p className="text-xs text-destructive mt-1.5 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-destructive" />
                    Las contrasenas no coinciden
                  </p>
                )}
                {passwordsMatch && (
                  <p className="text-xs text-primary mt-1.5 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Contrasenas coinciden
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !canSubmit}
                className={cn(
                  "w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all",
                  "bg-primary text-primary-foreground shadow-sm shadow-primary/20",
                  "hover:opacity-90 active:scale-[0.99]",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Actualizar contrasena</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer link */}
        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
