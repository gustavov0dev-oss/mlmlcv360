import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from '@/lib/router';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, Boxes, CircleCheck as CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash as access_token
    // onAuthStateChange fires PASSWORD_RECOVERY when the hash is present
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasSession(true);
        setChecking(false);
      }
    });

    // Also check if we already have a session from the hash
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true);
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    if (!password || password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error('Error al actualizar la contraseña. El enlace puede haber expirado.');
    } else {
      setDone(true);
      toast.success('¡Contraseña actualizada correctamente!');
      setTimeout(() => navigate('/dashboard'), 2500);
    }
    setLoading(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Boxes className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">MLM 360</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          {done ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-foreground">¡Listo!</h2>
              <p className="text-sm text-muted-foreground">
                Tu contraseña fue actualizada. Serás redirigido al panel...
              </p>
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : !hasSession ? (
            <div className="text-center py-4 space-y-4">
              <h2 className="text-xl font-bold text-foreground">Enlace inválido o expirado</h2>
              <p className="text-sm text-muted-foreground">
                Este enlace de recuperación no es válido o ya fue utilizado. Solicita uno nuevo.
              </p>
              <button onClick={() => navigate('/login')}
                className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                Volver al inicio de sesión
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground mb-1">Nueva contraseña</h2>
                <p className="text-sm text-muted-foreground">Elige una contraseña segura para tu cuenta.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Nueva contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      autoComplete="new-password"
                      className="w-full pl-9 pr-10 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary transition-colors"
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password.length > 0 && password.length < 8 && (
                    <p className="text-destructive text-xs mt-1">Mínimo 8 caracteres</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Confirmar contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repite la contraseña"
                      autoComplete="new-password"
                      className={cn(
                        'w-full pl-9 pr-4 py-2.5 bg-muted border rounded-xl text-sm text-foreground outline-none focus:border-primary transition-colors',
                        confirm && confirm !== password ? 'border-destructive' : 'border-border'
                      )}
                    />
                  </div>
                  {confirm && confirm !== password && (
                    <p className="text-destructive text-xs mt-1">Las contraseñas no coinciden</p>
                  )}
                </div>

                <button onClick={handleReset} disabled={loading || password.length < 8 || password !== confirm}
                  className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Actualizando...</>
                    : 'Actualizar contraseña'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
