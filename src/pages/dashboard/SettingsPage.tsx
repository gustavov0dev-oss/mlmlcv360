import { useState, useEffect } from 'react';
import { useDatabase } from '@/lib/backend';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Sun, Moon, Monitor, Save, RefreshCw, GitBranch, Bell } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type Tab = 'mlm' | 'appearance' | 'notifications';

interface Config { [key: string]: string }

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'mlm',           label: 'Red MLM',        icon: GitBranch },
  { id: 'appearance',    label: 'Apariencia',     icon: Sun },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
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
  const { applyGlobalDefault } = useThemeStore();
  const database = useDatabase();
  const [activeTab, setActiveTab] = useState<Tab>('mlm');
  const [config, setConfig] = useState<Config>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    database.select<{ key: string; value: string }>('system_config').then(({ data }) => {
      if (data && Array.isArray(data)) {
        const map: Config = {};
        data.forEach((row) => { map[row.key] = row.value; });
        setConfig(map);
      }
      setLoading(false);
    });
  }, [database]);

  const saveConfig = async (keys: string[], category: string = 'general') => {
    setSaving(true);
    for (const key of keys) {
      await database.upsert('system_config', { key, value: config[key] ?? '', category, updated_at: new Date().toISOString() }, 'key');
    }
    toast.success('Configuración guardada');
    setSaving(false);
  };

  const c = (key: string) => config[key] ?? '';
  const setC = (key: string, val: string) => setConfig(prev => ({ ...prev, [key]: val }));

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="space-y-1.5"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-56" /></div>
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          <Skeleton className="hidden lg:block w-56 h-40 rounded-xl" />
          <div className="flex-1 space-y-4">
            <Skeleton className="lg:hidden h-12 w-full rounded-xl" />
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <Skeleton className="h-5 w-40" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({length:4}).map((_,i)=>(<div key={i} className="space-y-1.5"><Skeleton className="h-3 w-32" /><Skeleton className="h-11 w-full rounded-lg" /></div>))}
              </div>
              <div className="pt-4 border-t border-border flex justify-end"><Skeleton className="h-10 w-28 rounded-lg" /></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-1">Preferencias de tu cuenta y parámetros de la red MLM.</p>
      </div>

      {/* Tab navigation - vertical sidebar on desktop, horizontal pills on mobile */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <nav className="space-y-1 bg-card border border-border rounded-xl p-2 sticky top-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                  activeTab === tab.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                )}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1 min-w-0 space-y-4">
          {/* Mobile pill strip */}
          <div className="lg:hidden flex overflow-x-auto gap-1 bg-muted/50 rounded-xl p-1.5 scrollbar-hide">
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

          {/* ── MLM Network ── */}
          {activeTab === 'mlm' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-5"><GitBranch className="w-4 h-4 text-primary" /> Configuración de la Red MLM</h3>
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
            <div className="mt-6 pt-4 border-t border-border flex justify-end">
              <button onClick={() => saveConfig(['max_levels','binary_cap','commission_direct','commission_binary','commission_unilevel'])}
                disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
              </button>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-5">Ciclos de Pago</h3>
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
            <div className="mt-6 pt-4 border-t border-border flex justify-end">
              <button onClick={() => saveConfig(['payment_cycle','min_withdrawal','igv_rate'])}
                disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}

          {/* ── Appearance ── */}
          {activeTab === 'appearance' && (
        <div className="space-y-4">
          {/* Theme selector */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-1"><Sun className="w-4 h-4 text-primary" /> Tema Visual Global</h3>
            <p className="text-xs text-muted-foreground mb-5">El tema que elijas aquí se aplicará por defecto a todos los usuarios. Cada usuario puede cambiarlo localmente desde el navbar sin afectar este valor global.</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', icon: Sun, label: 'Claro', preview: 'bg-white border-neutral-300' },
                { id: 'dark', icon: Moon, label: 'Oscuro', preview: 'bg-neutral-900 border-neutral-700' },
                { id: 'system', icon: Monitor, label: 'Sistema', preview: 'bg-gradient-to-br from-white to-neutral-900 border-neutral-500' },
              ].map(({ id, icon: Icon, label, preview }) => (
                <button key={id} onClick={() => {
                  setC('global_theme', id);
                  applyGlobalDefault(id as any);
                  database.upsert('system_config', {
                    key: 'global_theme', value: id, category: 'general', updated_at: new Date().toISOString(),
                  }, 'key').then(() => toast.success('Tema global actualizado')).catch(() => toast.error('Error al guardar tema global'));
                }}
                  className={cn('flex flex-col items-center gap-3 p-5 rounded-xl border transition-all',
                    (c('global_theme') || 'dark') === id ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground')}>
                  <div className={cn('w-12 h-8 rounded-lg border', preview)} />
                  <div className={cn('flex flex-col items-center gap-1', (c('global_theme') || 'dark') === id ? 'text-primary' : 'text-foreground')}>
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

          {/* ── Notifications ── */}
          {activeTab === 'notifications' && (
            <NotificationPreferences />
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationPreferences() {
  const { user } = useAuthStore();
  const database = useDatabase();
  const [prefs, setPrefs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    database.select<any>('notification_preferences', { filter: { user_id: user.id }, single: true }).then(({ data }) => {
      if (data) setPrefs(data);
      else setPrefs({
        user_id: user.id, new_affiliates: true, commissions: true,
        rank_changes: true, weekly_reports: false, system_alerts: true, promotions: false,
      });
      setLoading(false);
    });
  }, [user, database]);

  const toggle = (key: string) => {
    setPrefs((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  const save = async () => {
    if (!user || !prefs) return;
    setSaving(true);
    const { error } = await database.upsert('notification_preferences', { ...prefs, user_id: user.id, updated_at: new Date().toISOString() }, 'user_id');
    if (error) toast.error('Error al guardar');
    else toast.success('Preferencias guardadas');
    setSaving(false);
  };

  if (loading) return (
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-3">
      <Skeleton className="h-5 w-48" />
      {Array.from({length:6}).map((_,i)=>(
        <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
          <div className="space-y-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="w-11 h-6 rounded-full" />
        </div>
      ))}
    </div>
  );
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
      <div className="mt-6 pt-4 border-t border-border flex justify-end">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar preferencias
        </button>
      </div>
    </div>
  );
}
