import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DollarSign, Sun, Moon, Monitor, Save, RefreshCw, GitBranch, Building2, Bell, Mail, Lock, Eye, EyeOff } from 'lucide-react';

type Tab = 'general' | 'mlm' | 'appearance' | 'notifications' | 'email' | 'auth';


interface Config {
  [key: string]: string;
}

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'general',       label: 'General',       icon: Building2 },
  { id: 'mlm',           label: 'Red MLM',        icon: GitBranch },
  { id: 'appearance',    label: 'Apariencia',     icon: Sun },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
  { id: 'email',         label: 'Correos',        icon: Mail },
  { id: 'auth',          label: 'Auth Social',    icon: Lock },
];


function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn('w-11 h-6 rounded-full relative transition-colors duration-200', checked ? 'bg-primary' : 'bg-muted-foreground/30')}
    >
      <div className={cn('w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200', checked ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useThemeStore();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [config, setConfig] = useState<Config>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  useEffect(() => {
    supabase.from('system_config').select('*').then(({ data }) => {
      if (data) {
        const map: Config = {};
        data.forEach((row: any) => { map[row.key] = row.value; });
        setConfig(map);
      }
      setLoading(false);
    });
  }, []);

  const saveConfig = async (keys: string[], category: string = 'general') => {
    setSaving(true);
    for (const key of keys) {
      await supabase.from('system_config')
        .upsert({ key, value: config[key] ?? '', category, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    }
    toast.success('Configuración guardada');
    setSaving(false);
  };

  const saveConfigWithCategory = async (keys: string[], category: string) => {
    return saveConfig(keys, category);
  };



  const c = (key: string) => config[key] ?? '';
  const setC = (key: string, val: string) => setConfig(prev => ({ ...prev, [key]: val }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración del Sistema</h1>
        <p className="text-muted-foreground text-sm mt-1">Administra todos los parámetros de MLM 360.</p>
      </div>

      {/* Tab strip */}
      <div className="flex overflow-x-auto gap-1 bg-muted/50 rounded-xl p-1.5 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0',
              activeTab === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── General ── */}
      {activeTab === 'general' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Datos de la Empresa</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { k: 'company_name', label: 'Nombre de la empresa', placeholder: 'MLM 360' },
                { k: 'company_email', label: 'Correo corporativo', placeholder: 'contacto@empresa.pe' },
                { k: 'company_phone', label: 'Teléfono', placeholder: '+51 1 234 5678' },
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-xs font-medium text-foreground mb-1.5">{f.label}</label>
                  <input
                    value={c(f.k)}
                    onChange={e => setC(f.k, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-foreground mb-1.5">Dirección</label>
                <input
                  value={c('company_address')}
                  onChange={e => setC('company_address', e.target.value)}
                  placeholder="Av. Javier Prado Este 100, Lima"
                  className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <div className="flex items-center gap-4 pt-2 border-t border-border">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-sm text-foreground">Registro público habilitado</span>
                <ToggleSwitch checked={c('reg_open') === 'true'} onChange={v => setC('reg_open', String(v))} />
              </div>
              <div className="flex items-center gap-3 flex-1">
                <span className="text-sm text-foreground">Modo mantenimiento</span>
                <ToggleSwitch checked={c('maintenance_mode') === 'true'} onChange={v => setC('maintenance_mode', String(v))} />
              </div>
            </div>
            <button onClick={() => saveConfig(['company_name','company_email','company_phone','company_address','reg_open','maintenance_mode'])}
              disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
            </button>
          </div>
        </div>
      )}

      {/* ── MLM Network ── */}
      {activeTab === 'mlm' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2"><GitBranch className="w-4 h-4 text-primary" /> Configuración de la Red MLM</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { k: 'max_levels', label: 'Niveles máximos de red', placeholder: '7', type: 'number' },
                { k: 'binary_cap', label: 'Posiciones binarias por nodo', placeholder: '2', type: 'number' },
                { k: 'commission_direct', label: '% Comisión Directa base', placeholder: '8', type: 'number' },
                { k: 'commission_binary', label: '% Comisión Binaria base', placeholder: '4', type: 'number' },
                { k: 'commission_unilevel', label: '% Comisión Unilevel base', placeholder: '2', type: 'number' },
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-xs font-medium text-foreground mb-1.5">{f.label}</label>
                  <input
                    type={f.type || 'text'}
                    value={c(f.k)}
                    onChange={e => setC(f.k, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
                  />
                </div>
              ))}
            </div>
            <button onClick={() => saveConfig(['max_levels','binary_cap','commission_direct','commission_binary','commission_unilevel'])}
              disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
            </button>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Ciclos de Pago</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { k: 'payment_cycle', label: 'Días entre pagos', placeholder: '15' },
                { k: 'min_withdrawal', label: 'Monto mínimo retiro (PEN)', placeholder: '50' },
                { k: 'igv_rate', label: '% IGV Perú', placeholder: '18' },
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-xs font-medium text-foreground mb-1.5">{f.label}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={c(f.k)}
                    onChange={e => setC(f.k, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
                  />
                </div>
              ))}
            </div>
            <button onClick={() => saveConfig(['payment_cycle','min_withdrawal','igv_rate'])}
              disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
            </button>
          </div>
        </div>
      )}

      {/* ── Payments ── */}
      {/* Payments and Currency config moved to Admin > Finanzas */}
      {((activeTab as string) === 'payments' || (activeTab as string) === 'currency') && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-2">Configuración de Pasarelas y Moneda</h3>
          <p className="text-sm text-muted-foreground mb-4">
            La configuración de pasarelas de pago y tipo de cambio se gestiona en el panel de administración.
          </p>
          <a href="/dashboard/admin" onClick={e => { e.preventDefault(); window.history.pushState({}, '', '/dashboard/admin'); window.dispatchEvent(new Event('locationchange')); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
            Ir a Admin → Finanzas
          </a>
        </div>
      )}

      {/* ── Appearance ── */}
      {activeTab === 'appearance' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-5"><Sun className="w-4 h-4 text-primary" /> Tema Visual</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', icon: Sun, label: 'Claro', preview: 'bg-white border-gray-200' },
                { id: 'dark', icon: Moon, label: 'Oscuro', preview: 'bg-gray-900 border-gray-700' },
                { id: 'system', icon: Monitor, label: 'Sistema', preview: 'bg-gradient-to-br from-white to-gray-900 border-gray-400' },
              ].map(({ id, icon: Icon, label, preview }) => (
                <button key={id} onClick={() => setTheme(id as any)}
                  className={cn('flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all',
                    theme === id ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground')}>
                  <div className={cn('w-12 h-8 rounded-lg border-2', preview)} />
                  <div className={cn('flex flex-col items-center gap-1', theme === id ? 'text-primary' : 'text-foreground')}>
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-5"><Building2 className="w-4 h-4 text-primary" /> Tema del Sistema</h3>
            <p className="text-sm text-muted-foreground">El tema visual se configura desde el panel de administración. Los cambios afectan a todo el sistema.</p>
          </div>
        </div>
      )}

      {/* ── Notifications ── */}
      {activeTab === 'notifications' && (
        <NotificationPreferences />
      )}

      {/* ── Email Config ── */}
      {activeTab === 'email' && !isAdmin && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Acceso Restringido</h3>
          <p className="text-sm text-muted-foreground">La configuración de correos solo está disponible para administradores.</p>
        </div>
      )}

      {activeTab === 'email' && isAdmin && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-5"><Mail className="w-4 h-4 text-primary" /> Configuración SMTP</h3>
            <div className="space-y-4 max-w-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">Habilitar SMTP</div>
                  <div className="text-xs text-muted-foreground">Activar envío de correos desde el sistema</div>
                </div>
                <ToggleSwitch checked={c('smtp_enabled') === 'true'} onChange={v => setC('smtp_enabled', String(v))} />
              </div>
              {[
                { k: 'smtp_host', label: 'Servidor SMTP', placeholder: 'smtp.gmail.com' },
                { k: 'smtp_port', label: 'Puerto', placeholder: '587' },
                { k: 'smtp_user', label: 'Usuario SMTP', placeholder: 'usuario@gmail.com' },
                { k: 'smtp_from_email', label: 'Email remitente', placeholder: 'no-reply@empresa.pe' },
                { k: 'smtp_from_name', label: 'Nombre remitente', placeholder: 'MLM 360' },
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{f.label}</label>
                  <input
                    value={c(f.k)}
                    onChange={e => setC(f.k, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Contraseña SMTP</label>
                <div className="relative">
                  <input
                    type={showSecrets['smtp_pass'] ? 'text' : 'password'}
                    value={c('smtp_pass')}
                    onChange={e => setC('smtp_pass', e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 pr-10 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecrets(p => ({ ...p, smtp_pass: !p.smtp_pass }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecrets['smtp_pass'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ToggleSwitch checked={c('smtp_secure') === 'true'} onChange={v => setC('smtp_secure', String(v))} />
                <span className="text-sm text-foreground">Usar TLS/SSL</span>
              </div>
            </div>
            <button
              onClick={() => saveConfigWithCategory(['smtp_enabled', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from_email', 'smtp_from_name', 'smtp_secure'], 'email')}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50 mt-4"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar configuración
            </button>
          </div>
        </div>
      )}

      {/* ── Auth Social ── */}
      {activeTab === 'auth' && !isAdmin && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Acceso Restringido</h3>
          <p className="text-sm text-muted-foreground">La configuración de autenticación social solo está disponible para administradores.</p>
        </div>
      )}

      {activeTab === 'auth' && isAdmin && (
        <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
          <h3 className="font-semibold text-foreground flex items-center gap-2 mb-5"><Lock className="w-4 h-4 text-primary" /> Google OAuth</h3>
          <div className="space-y-4 max-w-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">Habilitar login con Google</div>
                <div className="text-xs text-muted-foreground">Permite a los usuarios registrarse e iniciar sesión con Google</div>
              </div>
              <ToggleSwitch checked={c('google_oauth_enabled') === 'true'} onChange={v => setC('google_oauth_enabled', String(v))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Google Client ID</label>
              <input
                value={c('google_client_id')}
                onChange={e => setC('google_client_id', e.target.value)}
                placeholder="xxxxxxxxxx.apps.googleusercontent.com"
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Google Client Secret</label>
              <div className="relative">
                <input
                  type={showSecrets['google_client_secret'] ? 'text' : 'password'}
                  value={c('google_client_secret')}
                  onChange={e => setC('google_client_secret', e.target.value)}
                  placeholder="GOCSPX-xxxxxxxxxxxxx"
                  className="w-full px-3 py-2.5 pr-10 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets(p => ({ ...p, google_client_secret: !p.google_client_secret }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSecrets['google_client_secret'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Instrucciones:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Ve a Google Cloud Console → APIs & Services → Credentials</li>
                <li>Crea un OAuth 2.0 Client ID</li>
                <li>Copia el Client ID y Client Secret aquí</li>
                <li>Configura la URL de redirección: <code className="bg-blue-500/10 px-1 rounded">https://tu-dominio.supabase.co/auth/v1/callback</code></li>
              </ol>
            </div>
          </div>
          <button
            onClick={() => saveConfigWithCategory(['google_oauth_enabled', 'google_client_id', 'google_client_secret'], 'auth')}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50 mt-4"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar configuración
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationPreferences() {
  const { user } = useAuthStore();
  const [prefs, setPrefs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('notification_preferences')
      .select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data) setPrefs(data);
        else setPrefs({
          user_id: user.id, new_affiliates: true, commissions: true,
          rank_changes: true, weekly_reports: false, system_alerts: true, promotions: false,
        });
        setLoading(false);
      });
  }, [user]);

  const toggle = (key: string) => {
    setPrefs((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  const save = async () => {
    if (!user || !prefs) return;
    setSaving(true);
    const { error } = await supabase.from('notification_preferences')
      .upsert({ ...prefs, user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) toast.error('Error al guardar');
    else toast.success('Preferencias guardadas');
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-32"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!prefs) return null;

  const items = [
    { key: 'new_affiliates', label: 'Nuevos afiliados', desc: 'Cuando alguien se une a tu red directa' },
    { key: 'commissions', label: 'Comisiones acreditadas', desc: 'Cada vez que se acredita una comisión' },
    { key: 'rank_changes', label: 'Cambios de rango', desc: 'Cuando alcanzas un nuevo nivel' },
    { key: 'weekly_reports', label: 'Reportes semanales', desc: 'Resumen semanal de actividad vía email' },
    { key: 'system_alerts', label: 'Alertas del sistema', desc: 'Mantenimientos y actualizaciones' },
    { key: 'promotions', label: 'Promociones y noticias', desc: 'Contenido de marketing y novedades' },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
      <h3 className="font-semibold text-foreground flex items-center gap-2 mb-5"><Bell className="w-4 h-4 text-primary" /> Preferencias de Notificaciones</h3>
      <div className="space-y-1">
        {items.map(item => (
          <div key={item.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div>
              <div className="text-sm font-medium text-foreground">{item.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
            </div>
            <ToggleSwitch checked={prefs[item.key]} onChange={() => toggle(item.key)} />
          </div>
        ))}
      </div>
      <button onClick={save} disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50 mt-4">
        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar preferencias
      </button>
    </div>
  );
}
