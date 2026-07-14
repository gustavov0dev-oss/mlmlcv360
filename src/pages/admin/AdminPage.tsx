import { useState, useEffect, Fragment } from 'react';
import { useDatabase, useStorage } from '@/lib/backend';
import { useAuthStore } from '@/store/authStore';
import { useSearchParams } from '@/lib/router';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Building2, Shield, Smartphone, Search, Mail, Save, ChevronRight, RefreshCw, MessageCircle, Eye, EyeOff, Lock, CreditCard, Award, Plus, Trash2, Pencil, X, CircleCheck as CheckCircle, DollarSign, Wrench, TriangleAlert as AlertTriangle, Image } from 'lucide-react';
import { useConfig, type Plan, type Rank } from '@/store/configStore';
import { LogoWithText } from '@/components/Logo';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';

// Smart icon renderer: detects SVG markup, URL images, emoji, or plain text
function RenderIcon({ value, className }: { value: string; className?: string }) {
  if (!value) return null;
  const v = value.trim();
  if (v.startsWith('<svg')) {
    return <span className={className} dangerouslySetInnerHTML={{ __html: v }} />;
  }
  if (v.startsWith('http') || v.startsWith('/') || v.startsWith('data:')) {
    return <img src={v} className={cn('object-contain', className)} alt="icon" />;
  }
  return <span className={className}>{v}</span>;
}

const modules = [
  { id: 'empresa', icon: Building2, label: 'Empresa', desc: 'Datos de la empresa y branding' },
  { id: 'mantenimiento', icon: Wrench, label: 'Mantenimiento', desc: 'Modo mantenimiento y estado del sistema' },
  { id: 'planes', icon: CreditCard, label: 'Planes', desc: 'Gestionar planes de suscripción' },
  { id: 'registro', icon: Shield, label: 'Registro', desc: 'Flujo y configuración del registro de usuarios' },
  { id: 'rangos', icon: Award, label: 'Rangos', desc: 'Gestionar rangos MLM' },
  { id: 'permisos', icon: Shield, label: 'Matriz de Permisos', desc: 'Permisos granulares por rol incluyendo red MLM' },
  { id: 'pwa', icon: Smartphone, label: 'PWA', desc: 'Configuración de la app móvil' },
  { id: 'seo', icon: Search, label: 'SEO', desc: 'Metadatos, Open Graph y SEO técnico' },
  { id: 'correos', icon: Mail, label: 'Correos', desc: 'Plantillas y configuración SMTP' },
  { id: 'auth', icon: Lock, label: 'Auth Social', desc: 'Google OAuth y login social' },
  { id: 'whatsapp', icon: MessageCircle, label: 'WhatsApp', desc: 'Configuración del botón de WhatsApp' },
  { id: 'finanzas', icon: DollarSign, label: 'Finanzas', desc: 'Pasarelas de pago y credenciales' },
];

const permissionRoles = ['super_admin', 'admin', 'inspector', 'user', 'support'];
const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin', admin: 'Administrador', inspector: 'Inspector',
  user: 'Usuario', support: 'Soporte',
};
const permissionList = [
  // General
  { key: 'view_dashboard',         label: 'Ver dashboard',                   group: 'General' },
  { key: 'view_reports',           label: 'Ver reportes',                    group: 'General' },
  { key: 'create_reports',         label: 'Crear reportes',                  group: 'General' },
  { key: 'export_data',            label: 'Exportar datos',                  group: 'General' },
  // Usuarios
  { key: 'view_users',             label: 'Ver usuarios',                    group: 'Usuarios' },
  { key: 'create_users',           label: 'Crear usuarios',                  group: 'Usuarios' },
  { key: 'edit_users',             label: 'Editar usuarios',                 group: 'Usuarios' },
  { key: 'delete_users',           label: 'Eliminar usuarios',               group: 'Usuarios' },
  // Red MLM
  { key: 'view_network',           label: 'Ver árbol genealógico',           group: 'Red MLM' },
  { key: 'add_to_network',         label: 'Agregar afiliados a la red',      group: 'Red MLM' },
  { key: 'assign_existing_user',   label: 'Asignar usuarios existentes',     group: 'Red MLM' },
  { key: 'edit_network_member',    label: 'Editar miembros de la red',       group: 'Red MLM' },
  { key: 'remove_from_network',    label: 'Desvincular de la red',           group: 'Red MLM' },
  { key: 'move_network_member',    label: 'Reubicar nodos en el árbol',      group: 'Red MLM' },
  { key: 'view_full_network',      label: 'Ver toda la red (todas las ramas)', group: 'Red MLM' },
  // Tienda
  { key: 'view_store',             label: 'Ver tienda',                      group: 'Tienda' },
  { key: 'manage_products',        label: 'Gestionar productos',             group: 'Tienda' },
  { key: 'manage_categories',      label: 'Gestionar categorías',            group: 'Tienda' },
  { key: 'manage_orders',          label: 'Gestionar pedidos',               group: 'Tienda' },
  { key: 'manage_coupons',         label: 'Gestionar cupones',               group: 'Tienda' },
  { key: 'manage_shipping',        label: 'Configurar envíos',               group: 'Tienda' },
  { key: 'manage_mlm_commissions', label: 'Configurar comisiones MLM tienda',group: 'Tienda' },
  // Comisiones
  { key: 'view_commissions',       label: 'Ver comisiones',                  group: 'Comisiones' },
  { key: 'approve_commissions',    label: 'Aprobar comisiones',              group: 'Comisiones' },
  // Sistema
  { key: 'configure_system',       label: 'Configurar sistema',              group: 'Sistema' },
  { key: 'manage_roles',           label: 'Gestionar roles y permisos',      group: 'Sistema' },
  { key: 'api_access',             label: 'Acceso a API',                    group: 'Sistema' },
];

const defaultPermissions: Record<string, Record<string, boolean>> = {
  super_admin: Object.fromEntries(permissionList.map(p => [p.key, true])),
  admin: Object.fromEntries(permissionList.map(p => [p.key,
    !['delete_users', 'manage_roles', 'api_access', 'view_full_network', 'configure_system'].includes(p.key)
  ])),
  inspector: Object.fromEntries(permissionList.map(p => [p.key,
    ['view_dashboard', 'view_users', 'view_commissions', 'view_network', 'view_reports'].includes(p.key)
  ])),
  user: Object.fromEntries(permissionList.map(p => [p.key,
    ['view_dashboard', 'view_commissions', 'view_network', 'view_reports'].includes(p.key)
  ])),
  support: Object.fromEntries(permissionList.map(p => [p.key,
    ['view_dashboard', 'view_users', 'create_users', 'view_commissions', 'view_reports', 'create_reports', 'view_network'].includes(p.key)
  ])),
};

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={cn('w-11 h-6 rounded-full relative transition-colors duration-200', checked ? 'bg-primary' : 'bg-muted-foreground/30')}>
      <div className={cn('w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200', checked ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  );
}

export default function AdminPage() {
  const { user } = useAuthStore();
  const database = useDatabase();
  const storage = useStorage();
  const [searchParamsAdmin] = useSearchParams();
  const [activeModule, setActiveModule] = useState(() => searchParamsAdmin.get('module') || 'empresa');

  // Sync module from URL param (for external navigation like from RolesPage)
  useEffect(() => {
    const mod = searchParamsAdmin.get('module');
    if (mod) setActiveModule(mod);
  }, [searchParamsAdmin]);
  const [permissions, setPermissions] = useState(defaultPermissions);
  const [savingPerms, setSavingPerms] = useState(false);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [customRoles, setCustomRoles] = useState<{ name: string; label: string; color: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingCollapsed, setUploadingCollapsed] = useState(false);

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>, isCollapsed = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
      toast.error('Solo se permiten archivos de imagen');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo no debe superar 2 MB');
      return;
    }
    if (isCollapsed) setUploadingCollapsed(true);
    else setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `logos/logo-${isCollapsed ? 'collapsed-' : ''}${Date.now()}.${ext}`;
      const result = await storage.upload('logos', path, file, { contentType: file.type, upsert: true });
      if (result.success && result.url) {
        setC(isCollapsed ? 'logo_collapsed_value' : 'logo_value', result.url);
        toast.success('Logo subido. Presiona Guardar para aplicar.');
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch {
      toast.error('Error al subir el logo');
    } finally {
      setUploading(false);
      setUploadingCollapsed(false);
    }
  };

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  useEffect(() => {
    Promise.all([
      database.select('system_config'),
      database.select('custom_roles', { select: 'name, label, color', order: { column: 'sort_order' } }),
    ]).then(([{ data: cfg }, { data: cr }]) => {
      if (cfg) {
        const map: Record<string, string> = {};
        (cfg as any[]).forEach((row: any) => { map[row.key] = row.value; });
        setConfig(map);
        const savedPerms = map['role_permissions'];
        if (savedPerms) {
          try {
            const parsed = JSON.parse(savedPerms);
            setPermissions(prev => ({ ...prev, ...parsed }));
          } catch { /* ignore malformed JSON */ }
        }
      }
      if (cr && (cr as any[]).length > 0) setCustomRoles(cr as { name: string; label: string; color: string }[]);
      setLoadingConfig(false);
    });
  }, []);

  const togglePermission = (role: string, perm: string) => {
    setPermissions(prev => {
      const rolePerms = prev[role] ?? Object.fromEntries(permissionList.map(p => [p.key, false]));
      return { ...prev, [role]: { ...rolePerms, [perm]: !rolePerms[perm] } };
    });
  };

  const savePermissions = async () => {
    setSavingPerms(true);
    await database.upsert('system_config', {
      key: 'role_permissions',
      value: JSON.stringify(permissions),
      category: 'permissions',
      updated_at: new Date().toISOString(),
    }, 'key');
    toast.success('Permisos guardados correctamente');
    setSavingPerms(false);
  };

  const saveConfigKeys = async (keys: string[], category: string = 'general') => {
    setSavingConfig(true);
    for (const key of keys) {
      await database.upsert('system_config', {
        key, value: config[key] ?? '', category, updated_at: new Date().toISOString(),
      }, 'key');
    }
    toast.success('Configuración guardada');
    setSavingConfig(false);
  };

  const c = (key: string) => config[key] ?? '';
  const setC = (key: string, val: string) => setConfig(prev => ({ ...prev, [key]: val }));

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-center">
        <div>
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  if (loadingConfig) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-1.5">
          <div className="h-7 w-64 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-80 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-56 flex-shrink-0">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50 last:border-0">
                  <div className="w-4 h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 flex-1 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="h-5 w-48 bg-muted rounded animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-10 w-full bg-muted rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Panel de Administración</h1>
        <p className="text-muted-foreground text-sm mt-1">Configura todos los aspectos del sistema MLM 360.</p>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
        {/* Module selector — mobile: scrollable pill strip; desktop: vertical list */}
        <div className="lg:w-56 flex-shrink-0">
          {/* Mobile pill strip */}
          <div className="lg:hidden flex overflow-x-auto gap-1 bg-muted/50 rounded-xl p-1.5 scrollbar-hide">
            {modules.map(mod => (
              <button key={mod.id} onClick={() => setActiveModule(mod.id)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0',
                  activeModule === mod.id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}>
                <mod.icon className="w-4 h-4 flex-shrink-0" />
                {mod.label}
              </button>
            ))}
          </div>
          {/* Desktop list */}
          <div className="hidden lg:block bg-card border border-border rounded-xl overflow-hidden">
            {modules.map(mod => (
              <button key={mod.id} onClick={() => setActiveModule(mod.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border/50 last:border-0 transition-colors',
                  activeModule === mod.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                )}>
                <mod.icon className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{mod.label}</div>
                </div>
                <ChevronRight className="w-3 h-3 flex-shrink-0 text-muted-foreground/50" />
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Empresa */}
          {activeModule === 'empresa' && (
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-foreground mb-5">Informacion del Sistema</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Company info + sizes */}
                <div className="space-y-5">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      Datos de la empresa
                    </h3>
                    {[
                      { k: 'company_name', label: 'Nombre', placeholder: 'MLM 360' },
                      { k: 'company_email', label: 'Correo', placeholder: 'contacto@mlm360.pe' },
                      { k: 'company_phone', label: 'Telefono', placeholder: '+51 1 234 5678' },
                      { k: 'company_address', label: 'Direccion', placeholder: 'Av. Javier Prado, Lima' },
                      { k: 'company_ruc', label: 'RUC', placeholder: '20123456789' },
                      { k: 'company_tagline', label: 'Eslogan (footer)', placeholder: 'Plataforma empresarial para gestión de redes y comercio. Impulsa tu negocio al siguiente nivel.' },
                    ].map(f => (
                      <div key={f.k}>
                        <label className="block text-xs font-medium text-foreground mb-1">{f.label}</label>
                        <input value={c(f.k)} onChange={e => setC(f.k, e.target.value)} placeholder={f.placeholder}
                          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm outline-none focus:border-primary transition-colors" />
                      </div>
                    ))}
                  </div>

                  {/* Logo sizes */}
                  <div className="pt-4 border-t border-border">
                    <h3 className="text-sm font-bold text-foreground mb-3">Tamano de logos (px)</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { k: 'logo_size_navbar', label: 'Navbar', def: '32' },
                        { k: 'logo_size_sidebar', label: 'Sidebar', def: '36' },
                        { k: 'logo_size_collapsed', label: 'Colapsado', def: '40' },
                        { k: 'logo_size_login', label: 'Login', def: '48' },
                      ].map(f => (
                        <div key={f.k}>
                          <label className="block text-[10px] font-medium text-muted-foreground mb-1">{f.label}</label>
                          <input type="number" min="16" max="128" value={c(f.k) || f.def} onChange={e => setC(f.k, e.target.value)}
                            className="w-full px-2 py-1.5 bg-muted border border-border rounded text-foreground text-sm text-center" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Logo uploads + preview */}
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-3">Logo principal</h3>
                    <label className={cn(
                      'flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
                      'hover:border-primary/50 hover:bg-primary/5',
                      uploading ? 'opacity-50 pointer-events-none' : '',
                      'border-border'
                    )}>
                      <input type="file" accept="image/*,.svg" className="sr-only" onChange={e => handleLogoFile(e, false)} disabled={uploading} />
                      {uploading
                        ? <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                        : <Image className="w-5 h-5 text-muted-foreground" />}
                      <span className="text-xs text-muted-foreground">
                        {uploading ? 'Subiendo...' : 'Haz clic o arrastra tu logo'}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">PNG, JPG, SVG, WebP</span>
                    </label>
                    <div className="mt-2">
                      <input
                        type="text"
                        value={c('logo_value')}
                        onChange={e => setC('logo_value', e.target.value)}
                        placeholder="O pega URL / codigo SVG aqui"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-1">Logo colapsado (opcional)</h3>
                    <p className="text-[10px] text-muted-foreground mb-2">Icono cuadrado para sidebar colapsado</p>
                    <label className={cn(
                      'flex flex-col items-center justify-center gap-1.5 w-full h-16 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
                      'hover:border-primary/50 hover:bg-primary/5',
                      uploadingCollapsed ? 'opacity-50 pointer-events-none' : '',
                      'border-border'
                    )}>
                      <input type="file" accept="image/*,.svg" className="sr-only" onChange={e => handleLogoFile(e, true)} disabled={uploadingCollapsed} />
                      {uploadingCollapsed
                        ? <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                        : <Image className="w-4 h-4 text-muted-foreground" />}
                      <span className="text-[11px] text-muted-foreground">
                        {uploadingCollapsed ? 'Subiendo...' : 'Logo colapsado'}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={c('logo_collapsed_value') || ''}
                      onChange={e => setC('logo_collapsed_value', e.target.value)}
                      placeholder="URL logo colapsado (opcional)"
                      className="w-full mt-2 px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:border-primary"
                    />
                  </div>

                  {/* Preview */}
                  <div className="pt-4 border-t border-border">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Vista previa</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/30 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-muted-foreground mb-2">Expandido</p>
                        <div className="flex items-center justify-center gap-2 bg-card border border-border rounded-lg px-2 py-1.5">
                          <LogoWithText value={c('logo_value')} fallbackText={c('company_name') || 'MLM'} size="w-6 h-6" />
                          <span className="text-xs font-bold text-foreground truncate max-w-[60px]">{c('company_name') || 'MLM 360'}</span>
                        </div>
                      </div>
                      <div className="bg-muted/30 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-muted-foreground mb-2">Colapsado</p>
                        <div className="flex items-center justify-center w-10 h-10 mx-auto bg-muted/50 border border-border rounded-lg overflow-hidden">
                          {c('logo_collapsed_value') ? (
                            c('logo_collapsed_value').toLowerCase().startsWith('<svg') ? (
                              <span className="[&_svg]:w-6 [&_svg]:h-6" dangerouslySetInnerHTML={{ __html: c('logo_collapsed_value') }} />
                            ) : (
                              <img src={c('logo_collapsed_value')} alt="" className="w-6 h-6 object-contain" />
                            )
                          ) : (
                            <LogoWithText value={c('logo_value')} fallbackText={(c('company_name') || 'MLM').slice(0, 2)} size="w-6 h-6" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Single save button */}
              <div className="mt-6 pt-4 border-t border-border flex justify-end">
                <button
                  onClick={() => saveConfigKeys([
                    'company_name', 'company_email', 'company_phone', 'company_address', 'company_ruc', 'company_tagline',
                    'logo_value', 'logo_collapsed_value',
                    'logo_size_navbar', 'logo_size_sidebar', 'logo_size_collapsed', 'logo_size_login'
                  ])}
                  disabled={savingConfig || uploading || uploadingCollapsed}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar todo
                </button>
              </div>
            </div>
          )}

          {/* Matriz de Permisos */}
          {activeModule === 'permisos' && (
            <div className="space-y-5">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Matriz de Permisos</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Controla qué puede hacer cada rol. Incluye permisos de red MLM: agregar, editar, reubicar y desvincular afiliados.</p>
                </div>
                <button onClick={savePermissions} disabled={savingPerms}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50 flex-shrink-0">
                  {savingPerms ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-4 sm:px-5 py-3 text-xs font-semibold text-muted-foreground">Permiso</th>
                      {(customRoles.length > 0 ? customRoles : permissionRoles.map(r => ({ name: r, label: roleLabels[r] || r, color: '#6B7280' }))).map(r => (
                        <th key={r.name} className="text-center px-2 sm:px-3 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                            {r.label}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const groups = [...new Set(permissionList.map(p => (p as any).group || 'General'))];
                      return groups.map(group => {
                        const groupPerms = permissionList.filter(p => (p as any).group === group);
                        return (
                          <Fragment key={group}>
                            <tr className="border-b border-border/30 bg-muted/30">
                              <td colSpan={(customRoles.length > 0 ? customRoles : permissionRoles).length + 1} className="px-4 sm:px-5 py-2">
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{group}</span>
                              </td>
                            </tr>
                            {groupPerms.map(perm => (
                              <tr key={perm.key} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                                <td className="px-4 sm:px-5 py-3 text-sm text-foreground pl-6">{perm.label}</td>
                                {(customRoles.length > 0 ? customRoles : permissionRoles.map(r => ({ name: r, label: roleLabels[r] || r, color: '#6B7280' }))).map(r => (
                                  <td key={r.name} className="px-2 sm:px-3 py-3 text-center">
                                    {r.name === 'super_admin' ? (
                                      <div className="w-5 h-5 rounded bg-primary border-2 border-primary flex items-center justify-center mx-auto">
                                        <span className="text-white text-xs font-bold">✓</span>
                                      </div>
                                    ) : (
                                      <button onClick={() => togglePermission(r.name, perm.key)}
                                        className={cn(
                                          'w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-colors',
                                          permissions[r.name]?.[perm.key] ? 'bg-primary border-primary text-white' : 'border-border hover:border-muted-foreground'
                                        )}>
                                        {permissions[r.name]?.[perm.key] && <span className="text-xs">✓</span>}
                                      </button>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Configuración de red MLM */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" /></svg>
                  Configuración de Red MLM
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Opciones que controlan el comportamiento del árbol genealógico.</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Asignar usuarios existentes a la red</div>
                    <div className="text-xs text-muted-foreground">Permite que el admin vincule usuarios ya registrados sin crear uno nuevo</div>
                  </div>
                  <ToggleSwitch
                    checked={c('allow_assign_existing_user') !== 'false'}
                    onChange={v => setC('allow_assign_existing_user', String(v))}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Requerir selección de posición</div>
                    <div className="text-xs text-muted-foreground">Al agregar un afiliado, pedir elegir izquierda o derecha</div>
                  </div>
                  <ToggleSwitch
                    checked={c('require_position_selection') !== 'false'}
                    onChange={v => setC('require_position_selection', String(v))}
                  />
                </div>
              </div>
              <button
                onClick={() => saveConfigKeys(['allow_assign_existing_user', 'require_position_selection'], 'network')}
                disabled={savingConfig}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
              </button>
            </div>
            </div>
          )}

          {/* Auth Social */}
          {activeModule === 'auth' && (
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> Google OAuth</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Configura el login con Google. Los usuarios podrán iniciar sesión con su cuenta de Google.</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-foreground">Habilitar login con Google</div>
                      <div className="text-xs text-muted-foreground">Permite a los usuarios registrarse e iniciar sesión con Google</div>
                    </div>
                    <ToggleSwitch checked={c('google_oauth_enabled') === 'true'} onChange={v => setC('google_oauth_enabled', String(v))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Google Client ID</label>
                    <div className="relative">
                      <input type={showSecrets['google_client_id'] ? 'text' : 'password'} value={c('google_client_id')}
                        onChange={e => setC('google_client_id', e.target.value)} placeholder="xxxxxxxxxx.apps.googleusercontent.com"
                        className="w-full px-3 py-2.5 pr-10 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors font-mono" />
                      <button type="button" onClick={() => setShowSecrets(p => ({ ...p, google_client_id: !p.google_client_id }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showSecrets['google_client_id'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Google Client Secret</label>
                    <div className="relative">
                      <input type={showSecrets['google_client_secret'] ? 'text' : 'password'} value={c('google_client_secret')}
                        onChange={e => setC('google_client_secret', e.target.value)} placeholder="GOCSPX-xxxxxxxxxxxxx"
                        className="w-full px-3 py-2.5 pr-10 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors font-mono" />
                      <button type="button" onClick={() => setShowSecrets(p => ({ ...p, google_client_secret: !p.google_client_secret }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showSecrets['google_client_secret'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-xs text-primary">
                    <p className="font-medium mb-1">Instrucciones:</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>Ve a Google Cloud Console → APIs & Services → Credentials</li>
                      <li>Crea un OAuth 2.0 Client ID</li>
                      <li>Copia el Client ID y Client Secret aquí</li>
                      <li>Configura la URL de redirección: <code className="bg-primary/10 px-1 rounded">https://tu-dominio.supabase.co/auth/v1/callback</code></li>
                    </ol>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-border flex justify-end">
                <button onClick={() => saveConfigKeys(['google_oauth_enabled', 'google_client_id', 'google_client_secret'], 'auth')}
                  disabled={savingConfig}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50">
                  {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
                </button>
              </div>
            </div>
          )}

          {/* WhatsApp */}
          {activeModule === 'whatsapp' && (
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><MessageCircle className="w-4 h-4 text-green-500" /> Configuración de WhatsApp</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Configura el botón flotante de WhatsApp que aparece en el sitio.</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-foreground">Botón de WhatsApp visible</div>
                      <div className="text-xs text-muted-foreground">Muestra u oculta el botón flotante en el sitio público</div>
                    </div>
                    <ToggleSwitch checked={c('whatsapp_enabled') === 'true'} onChange={v => setC('whatsapp_enabled', String(v))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Número de WhatsApp</label>
                    <input value={c('whatsapp_number')} onChange={e => setC('whatsapp_number', e.target.value)}
                      placeholder="51987654321"
                      className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors font-mono" />
                    <p className="text-xs text-muted-foreground mt-1">Incluye el código de país sin "+". Ej: 51 para Perú, 34 para España.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Mensaje predeterminado</label>
                    <textarea value={c('whatsapp_message')} onChange={e => setC('whatsapp_message', e.target.value)}
                      placeholder="Hola, me gustaría más información sobre MLM 360" rows={3}
                      className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Posición del botón</label>
                    <select value={c('whatsapp_position')} onChange={e => setC('whatsapp_position', e.target.value)}
                      className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary">
                      <option value="bottom-right">Abajo a la derecha</option>
                      <option value="bottom-left">Abajo a la izquierda</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-border flex justify-end">
                <button onClick={() => saveConfigKeys(['whatsapp_enabled', 'whatsapp_number', 'whatsapp_message', 'whatsapp_position'], 'whatsapp')}
                  disabled={savingConfig}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50">
                  {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
                </button>
              </div>
            </div>
          )}

          {/* PWA */}
          {activeModule === 'pwa' && (
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-foreground mb-5">Configuración PWA</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {[
                    { k: 'pwa_name', label: 'Nombre de la app', placeholder: 'MLM 360' },
                    { k: 'pwa_short_name', label: 'Nombre corto', placeholder: 'MLM360' },
                  ].map(f => (
                    <div key={f.k}>
                      <label className="block text-xs font-medium text-foreground mb-1.5">{f.label}</label>
                      <input value={c(f.k)} onChange={e => setC(f.k, e.target.value)} placeholder={f.placeholder}
                        className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-foreground text-sm outline-none focus:border-primary transition-colors" />
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Descripción</label>
                    <input value={c('pwa_description')} onChange={e => setC('pwa_description', e.target.value)} placeholder="Sistema MLM empresarial premium"
                      className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-foreground text-sm outline-none focus:border-primary transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Color del tema</label>
                    <input type="color" value={c('pwa_theme_color') || '#1d4ed8'} onChange={e => setC('pwa_theme_color', e.target.value)}
                      className="w-full h-10 px-2 py-1 bg-muted border border-border rounded-lg text-foreground text-sm outline-none focus:border-primary" />
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-border flex justify-end">
                <button onClick={() => saveConfigKeys(['pwa_name', 'pwa_short_name', 'pwa_description', 'pwa_theme_color'], 'pwa')}
                  disabled={savingConfig}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50">
                  {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
                </button>
              </div>
            </div>
          )}

          {/* SEO */}
          {activeModule === 'seo' && (
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-foreground mb-5">Configuración SEO</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {[
                    { k: 'seo_title', label: 'Título de la página', placeholder: 'MLM 360 - Sistema Empresarial Premium' },
                    { k: 'seo_keywords', label: 'Palabras clave', placeholder: 'mlm peru, red de mercadeo, afiliados' },
                  ].map(f => (
                    <div key={f.k}>
                      <label className="block text-xs font-medium text-foreground mb-1.5">{f.label}</label>
                      <input value={c(f.k)} onChange={e => setC(f.k, e.target.value)} placeholder={f.placeholder}
                        className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-foreground text-sm outline-none focus:border-primary transition-colors" />
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  {[
                    { k: 'seo_og_image', label: 'Imagen Open Graph', placeholder: 'https://mlm360.pe/og-image.jpg' },
                    { k: 'seo_ga_id', label: 'Google Analytics ID', placeholder: 'G-XXXXXXXXXX' },
                  ].map(f => (
                    <div key={f.k}>
                      <label className="block text-xs font-medium text-foreground mb-1.5">{f.label}</label>
                      <input value={c(f.k)} onChange={e => setC(f.k, e.target.value)} placeholder={f.placeholder}
                        className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-foreground text-sm outline-none focus:border-primary transition-colors" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Descripción meta</label>
                    <textarea value={c('seo_description')} onChange={e => setC('seo_description', e.target.value)} rows={3}
                      placeholder="El sistema MLM empresarial más completo del Perú"
                      className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-foreground text-sm outline-none focus:border-primary transition-colors resize-none" />
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-border flex justify-end">
                <button onClick={() => saveConfigKeys(['seo_title', 'seo_description', 'seo_keywords', 'seo_og_image', 'seo_ga_id'], 'seo')}
                  disabled={savingConfig}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50">
                  {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
                </button>
              </div>
            </div>
          )}

          {/* Correos */}
          {activeModule === 'correos' && (
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-foreground mb-5">Configuración de Correos</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {[
                    { k: 'smtp_host', label: 'Servidor SMTP', placeholder: 'smtp.gmail.com' },
                    { k: 'smtp_port', label: 'Puerto', placeholder: '587' },
                  ].map(f => (
                    <div key={f.k}>
                      <label className="block text-xs font-medium text-foreground mb-1.5">{f.label}</label>
                      <input value={c(f.k)} onChange={e => setC(f.k, e.target.value)} placeholder={f.placeholder}
                        className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-foreground text-sm outline-none focus:border-primary transition-colors" />
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  {[
                    { k: 'smtp_user', label: 'Correo de envío', placeholder: 'no-reply@mlm360.pe' },
                    { k: 'smtp_name', label: 'Nombre del remitente', placeholder: 'MLM 360' },
                  ].map(f => (
                    <div key={f.k}>
                      <label className="block text-xs font-medium text-foreground mb-1.5">{f.label}</label>
                      <input value={c(f.k)} onChange={e => setC(f.k, e.target.value)} placeholder={f.placeholder}
                        className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-foreground text-sm outline-none focus:border-primary transition-colors" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Contraseña SMTP</label>
                    <div className="relative">
                      <input type={showSecrets['smtp_pass'] ? 'text' : 'password'} value={c('smtp_pass')}
                        onChange={e => setC('smtp_pass', e.target.value)} placeholder="••••••••"
                        className="w-full px-3 py-2.5 pr-10 bg-muted border border-border rounded-lg text-foreground text-sm outline-none focus:border-primary transition-colors" />
                      <button type="button" onClick={() => setShowSecrets(p => ({ ...p, smtp_pass: !p.smtp_pass }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showSecrets['smtp_pass'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-border flex justify-end">
                <button onClick={() => saveConfigKeys(['smtp_host', 'smtp_port', 'smtp_user', 'smtp_name', 'smtp_pass'], 'email')}
                  disabled={savingConfig}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50">
                  {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
                </button>
              </div>
            </div>
          )}

          {/* ── REGISTRO ── */}
          {activeModule === 'registro' && (
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-foreground">Configuración de Registro</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Decide cómo los usuarios se registran: con plan, sin plan, o plan obligatorio.</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-xl border border-border">
                    <div>
                      <div className="text-sm font-semibold text-foreground">Mostrar selección de plan</div>
                      <div className="text-xs text-muted-foreground mt-0.5">El usuario puede elegir un plan durante el registro</div>
                    </div>
                    <ToggleSwitch checked={c('register_show_plans') !== 'false'} onChange={v => setC('register_show_plans', String(v))} />
                  </div>
                  {c('register_show_plans') !== 'false' && (
                    <div className="flex items-center justify-between p-4 bg-muted rounded-xl border border-border">
                      <div>
                        <div className="text-sm font-semibold text-foreground">Requerir selección de plan</div>
                        <div className="text-xs text-muted-foreground mt-0.5">El usuario no puede avanzar sin elegir un plan</div>
                      </div>
                      <ToggleSwitch checked={c('register_require_plan') === 'true'} onChange={v => setC('register_require_plan', String(v))} />
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-muted rounded-xl border border-border">
                    <label className="block text-sm font-semibold text-foreground mb-1">Plan por defecto <span className="font-normal text-muted-foreground">(slug)</span></label>
                    <p className="text-xs text-muted-foreground mb-2">Si el usuario no elige plan, se asigna este automáticamente. Dejar vacío para no asignar ninguno.</p>
                    <input value={c('register_default_plan')} onChange={e => setC('register_default_plan', e.target.value)}
                      placeholder="ej: basico" className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary font-mono" />
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-border flex justify-end">
                <button onClick={() => saveConfigKeys(['register_show_plans', 'register_require_plan', 'register_default_plan'], 'registration')}
                  disabled={savingConfig}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50">
                  {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
                </button>
              </div>
            </div>
          )}

                    {/* ── PLANES ── */}
          {activeModule === 'planes' && <PlansManager />}
          {activeModule === 'mantenimiento' && (
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Wrench className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Modo Mantenimiento</h2>
                  <p className="text-xs text-muted-foreground">Controla el acceso público al sistema</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className={cn(
                    'flex items-center justify-between p-4 rounded-xl border-2 transition-colors',
                    c('maintenance_mode') === 'true'
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-emerald-500/10 border-green-500/20',
                  )}>
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {c('maintenance_mode') === 'true' ? 'Sistema en mantenimiento' : 'Sistema operativo'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {c('maintenance_mode') === 'true'
                          ? 'Los usuarios no pueden acceder. Solo administradores.'
                          : 'Todos los usuarios pueden acceder normalmente.'}
                      </div>
                    </div>
                    <ToggleSwitch checked={c('maintenance_mode') === 'true'} onChange={v => {
                      setC('maintenance_mode', String(v));
                    }} />
                  </div>

                  {c('maintenance_mode') === 'true' && (
                    <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        El modo mantenimiento está <strong>ACTIVO</strong>. Solo los administradores y superadmins pueden acceder al sistema.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Mensaje para los usuarios</label>
                    <textarea
                      value={c('maintenance_message')}
                      onChange={e => setC('maintenance_message', e.target.value)}
                      rows={3}
                      placeholder="Estamos realizando mejoras. Volvemos pronto."
                      className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Este mensaje se mostrará en la página de mantenimiento.</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border flex justify-end">
                <button
                  onClick={() => saveConfigKeys(['maintenance_mode', 'maintenance_message'])}
                  disabled={savingConfig}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar
                </button>
              </div>
            </div>
          )}

          {/* ── RANGOS ── */}
          {activeModule === 'rangos' && <RanksManager />}

          {/* ── FINANZAS ── */}
          {activeModule === 'finanzas' && <GatewaysManager />}

        </div>
      </div>
    </div>
  );
}

// ── Plans Manager ──
function PlansManager() {
  const { refresh } = useConfig();
  const database = useDatabase();
  const [editing, setEditing] = useState<Plan | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAll = async () => {
    const { data } = await database.select<Plan>('plans', { order: { column: 'sort_order' } });
    if (data) setAllPlans((data as Plan[]).map((p: any) => ({ ...p, features: Array.isArray(p.features) ? p.features : JSON.parse(p.features || '[]') })));
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSave = async (plan: Partial<Plan>) => {
    setSaving(true);
    const { id, created_at, updated_at, ...fields } = plan as any;
    const payload = { ...fields, features: JSON.stringify(fields.features || []), updated_at: new Date().toISOString() };
    if (id) {
      await database.update('plans', id, payload);
    } else {
      await database.insert('plans', payload);
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    fetchAll();
    refresh();
    toast.success(id ? 'Plan actualizado' : 'Plan creado');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await database.delete('plans', deleteTarget.id);
      fetchAll();
      refresh();
      toast.success('Plan eliminado');
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  const togglePopular = async (plan: Plan) => {
    await database.update('plans', plan.id, { is_popular: !plan.is_popular, updated_at: new Date().toISOString() });
    fetchAll();
    refresh();
  };

  const toggleActive = async (plan: Plan) => {
    await database.update('plans', plan.id, { is_active: !plan.is_active, updated_at: new Date().toISOString() });
    fetchAll();
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Gestión de Planes</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Crea, edita y gestiona los planes de suscripción.</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Nuevo plan
        </button>
      </div>

      {showForm ? (
        <PlanForm plan={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} saving={saving} />
      ) : (
        <div className="space-y-3">
          {allPlans.map(plan => (
            <div key={plan.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-foreground">{plan.name}</span>
                  {plan.badge && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{plan.badge}</span>}
                  {plan.is_popular && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">Popular</span>}
                  {!plan.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">Inactivo</span>}
                </div>
                <div className="text-xs text-muted-foreground">{plan.description}</div>
                <div className="text-sm font-bold text-foreground mt-1">S/ {plan.price}{plan.trial_days > 0 && <span className="text-xs text-emerald-600 ml-2">{plan.trial_days} días gratis</span>}</div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => togglePopular(plan)} className={cn('p-2 rounded-lg transition-colors', plan.is_popular ? 'text-amber-500 hover:bg-amber-500/10' : 'text-muted-foreground hover:bg-muted')} title="Marcar como popular">
                  <Award className="w-4 h-4" />
                </button>
                <button onClick={() => toggleActive(plan)} className={cn('p-2 rounded-lg transition-colors', plan.is_active ? 'text-green-500 hover:bg-emerald-500/10' : 'text-destructive hover:bg-destructive/10')} title="Activar/desactivar">
                  {plan.is_active ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </button>
                <button onClick={() => { setEditing(plan); setShowForm(true); }} className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-primary transition-colors" title="Editar">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteTarget(plan)} className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive transition-colors" title="Eliminar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {allPlans.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">No hay planes. Crea el primero.</div>}
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleDelete}
        title="Eliminar plan"
        description={<>Se eliminará permanentemente <strong>{deleteTarget?.name}</strong>. Esta acción no se puede deshacer.</>}
        loading={!!deletingId}
      />
    </div>
  );
}

function PlanForm({ plan, onSave, onCancel, saving }: { plan: Plan | null; onSave: (p: Partial<Plan>) => void; onCancel: () => void; saving: boolean }) {
  const [form, setForm] = useState({
    name: plan?.name || '',
    slug: plan?.slug || '',
    description: plan?.description || '',
    price: String(plan?.price ?? ''),
    badge: plan?.badge || '',
    is_popular: plan?.is_popular || false,
    is_active: plan?.is_active ?? true,
    is_free: plan?.is_free ?? false,
    sort_order: String(plan?.sort_order ?? '0'),
    trial_days: String(plan?.trial_days ?? '0'),
    features: (plan?.features || []).join('\n'),
  });

  const handleSave = () => {
    onSave({
      ...(plan?.id ? { id: plan.id } : {}),
      name: form.name,
      slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-'),
      description: form.description,
      price: Number(form.price) || 0,
      badge: form.badge || null,
      is_popular: form.is_popular,
      is_active: form.is_active,
      is_free: form.is_free,
      sort_order: Number(form.sort_order) || 0,
      trial_days: Number(form.trial_days) || 0,
      features: form.features.split('\n').filter(Boolean),
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">{plan ? 'Editar plan' : 'Nuevo plan'}</h3>
        <button onClick={onCancel} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">Nombre *</label>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Pro"
            className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">Slug (identificador)</label>
          <input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="pro"
            className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1.5">Descripción</label>
        <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Para profesionales..."
          className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">Precio (PEN)</label>
          <input type="text" inputMode="decimal" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="299"
            disabled={form.is_free}
            className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary disabled:opacity-50" />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">Días de prueba</label>
          <input type="text" inputMode="numeric" value={form.trial_days} onChange={e => setForm(p => ({ ...p, trial_days: e.target.value }))} placeholder="0"
            className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1.5">Insignia (badge)</label>
        <input value={form.badge} onChange={e => setForm(p => ({ ...p, badge: e.target.value }))} placeholder="Más Popular"
          className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary" />
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1.5">Características (una por línea)</label>
        <textarea value={form.features} onChange={e => setForm(p => ({ ...p, features: e.target.value }))} rows={6} placeholder={"Red ilimitada\nComisiones 8%\nSoporte 24/7"}
          className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary resize-none" />
      </div>
      <div className="flex items-center gap-6 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={form.is_free} onChange={e => setForm(p => ({ ...p, is_free: e.target.checked, price: e.target.checked ? '0' : p.price }))} className="w-4 h-4 rounded" />
          Plan gratuito (Free)
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={form.is_popular} onChange={e => setForm(p => ({ ...p, is_popular: e.target.checked }))} className="w-4 h-4 rounded" />
          Marcar como más popular
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 rounded" />
          Activo
        </label>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
        <button onClick={handleSave} disabled={saving} className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
        </button>
      </div>
    </div>
  );
}

// ── Ranks Manager ──
function RanksManager() {
  const { refresh } = useConfig();
  const database = useDatabase();
  const [editing, setEditing] = useState<Rank | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allRanks, setAllRanks] = useState<Rank[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Rank | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAll = async () => {
    const { data } = await database.select<Rank>('ranks', { order: { column: 'sort_order' } });
    if (data) setAllRanks(data as Rank[]);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSave = async (rank: Partial<Rank>) => {
    setSaving(true);
    const { id, created_at, updated_at, ...fields } = rank as any;
    const payload = { ...fields, updated_at: new Date().toISOString() };
    if (id) {
      await database.update('ranks', id, payload);
    } else {
      await database.insert('ranks', payload);
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    fetchAll();
    refresh();
    toast.success(id ? 'Rango actualizado' : 'Rango creado');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await database.delete('ranks', deleteTarget.id);
      fetchAll();
      refresh();
      toast.success('Rango eliminado');
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  const toggleActive = async (rank: Rank) => {
    await database.update('ranks', rank.id, { is_active: !rank.is_active, updated_at: new Date().toISOString() });
    fetchAll();
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Gestión de Rangos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Crea, edita y gestiona los rangos del sistema MLM.</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Nuevo rango
        </button>
      </div>

      {showForm ? (
        <RankForm rank={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} saving={saving} />
      ) : (
        <div className="space-y-3">
          {allRanks.map(rank => (
            <div key={rank.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0', rank.bg_color)}><RenderIcon value={rank.icon} className="w-6 h-6" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn('text-sm font-bold', rank.color)}>{rank.name}</span>
                  {!rank.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">Inactivo</span>}
                </div>
                <div className="text-xs text-muted-foreground">Bono: S/ {rank.bonus} · {rank.min_affiliates} afiliados · S/ {rank.min_volume} volumen</div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => toggleActive(rank)} className={cn('p-2 rounded-lg transition-colors', rank.is_active ? 'text-green-500 hover:bg-emerald-500/10' : 'text-destructive hover:bg-destructive/10')} title="Activar/desactivar">
                  {rank.is_active ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </button>
                <button onClick={() => { setEditing(rank); setShowForm(true); }} className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-primary transition-colors" title="Editar">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteTarget(rank)} className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive transition-colors" title="Eliminar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {allRanks.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">No hay rangos. Crea el primero.</div>}
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleDelete}
        title="Eliminar rango"
        description={<>Se eliminará permanentemente <strong>{deleteTarget?.name}</strong>. Esta acción no se puede deshacer.</>}
        loading={!!deletingId}
      />
    </div>
  );
}

function RankForm({ rank, onSave, onCancel, saving }: { rank: Rank | null; onSave: (r: Partial<Rank>) => void; onCancel: () => void; saving: boolean }) {
  const [form, setForm] = useState({
    name: rank?.name || '',
    slug: rank?.slug || '',
    description: rank?.description || '',
    icon: rank?.icon || '🏆',
    color: rank?.color || 'text-amber-600',
    bg_color: rank?.bg_color || 'bg-amber-500/10',
    border_color: rank?.border_color || 'border-amber-500/30',
    bonus: String(rank?.bonus ?? ''),
    min_affiliates: String(rank?.min_affiliates ?? ''),
    min_volume: String(rank?.min_volume ?? ''),
    sort_order: String(rank?.sort_order ?? '0'),
    is_active: rank?.is_active ?? true,
  });

  const handleSave = () => {
    onSave({
      ...(rank?.id ? { id: rank.id } : {}),
      name: form.name,
      slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-'),
      description: form.description,
      icon: form.icon,
      color: form.color,
      bg_color: form.bg_color,
      border_color: form.border_color,
      bonus: Number(form.bonus),
      min_affiliates: Number(form.min_affiliates),
      min_volume: Number(form.min_volume),
      sort_order: Number(form.sort_order),
      is_active: form.is_active,
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">{rank ? 'Editar rango' : 'Nuevo rango'}</h3>
        <button onClick={onCancel} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">Nombre *</label>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Diamante"
            className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">Slug</label>
          <input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="diamond"
            className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">Icono (emoji)</label>
          <input value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))} placeholder="💎"
            className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary text-center text-xl" />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">Bono (S/)</label>
          <input type="text" inputMode="numeric" value={form.bonus} onChange={e => setForm(p => ({ ...p, bonus: e.target.value }))} placeholder="5000"
            className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">Min. afiliados</label>
          <input type="text" inputMode="numeric" value={form.min_affiliates} onChange={e => setForm(p => ({ ...p, min_affiliates: e.target.value }))} placeholder="150"
            className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">Min. volumen</label>
          <input type="text" inputMode="numeric" value={form.min_volume} onChange={e => setForm(p => ({ ...p, min_volume: e.target.value }))} placeholder="500000"
            className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">Color texto</label>
          <input value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} placeholder="text-cyan-400"
            className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary font-mono" />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">Color fondo</label>
          <input value={form.bg_color} onChange={e => setForm(p => ({ ...p, bg_color: e.target.value }))} placeholder="bg-cyan-400/10"
            className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary font-mono" />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">Color borde</label>
          <input value={form.border_color} onChange={e => setForm(p => ({ ...p, border_color: e.target.value }))} placeholder="border-cyan-400/30"
            className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary font-mono" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1.5">Icono (emoji, nombre Lucide, o URL SVG)</label>
        <input value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))} placeholder="medal, gem, crown, o emoji, o URL"
          className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary" />
        <p className="text-xs text-muted-foreground mt-1">Opciones: medal, gem, crown, disc, star, award - o un emoji - o URL de imagen SVG</p>
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1.5">Descripción</label>
        <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Líderes destacados"
          className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary" />
      </div>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 rounded" />
          Activo
        </label>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
        <button onClick={handleSave} disabled={saving} className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
        </button>
      </div>
    </div>
  );
}

// ── Gateways Manager ──
function GatewaysManager() {
  const database = useDatabase();
  const [gateways, setGateways] = useState<any[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [creds, setCreds] = useState<Record<string, Record<string, string>>>({});
  const [commRates, setCommRates] = useState<Record<string, string>>({});
  const [fixerKey, setFixerKey] = useState('');
  const [exchangeRate, setExchangeRate] = useState('3.72');
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [refreshingRate, setRefreshingRate] = useState(false);
  const { refresh: refreshConfig } = useConfig();

  const fetchAll = async () => {
    const { data } = await database.select('payment_gateways', { order: { column: 'created_at' } });
    if (data) {
      const gws = data as any[];
      setGateways(gws);
      const map: Record<string, Record<string, string>> = {};
      const ratesMap: Record<string, string> = {};
      gws.forEach((g: any) => {
        map[g.id] = { ...g.credentials };
        ratesMap[g.id] = String(g.commission_rate ?? 0);
      });
      setCreds(map);
      setCommRates(ratesMap);
    }
  };

  useEffect(() => {
    fetchAll();
    database.select('system_config', { select: 'key,value', filter: { key: ['fixer_api_key','exchange_rate_usd'] } }).then(({ data }) => {
      if (data) {
        (data as any[]).forEach((r: any) => {
          if (r.key === 'fixer_api_key') setFixerKey(r.value || '');
          if (r.key === 'exchange_rate_usd') setExchangeRate(r.value || '3.72');
        });
      }
    });
  }, []);

  const saveCurrencyConfig = async () => {
    setSavingCurrency(true);
    await database.upsert('system_config', [
      { key: 'fixer_api_key', value: fixerKey, category: 'currency', updated_at: new Date().toISOString() },
      { key: 'exchange_rate_usd', value: exchangeRate, category: 'currency', updated_at: new Date().toISOString() },
    ], 'key');
    toast.success('Configuración de moneda guardada');
    setSavingCurrency(false);
  };

  const refreshRate = async () => {
    setRefreshingRate(true);
    try {
      const { data } = await database.invoke<any>('exchange-rate');
      if (data?.rate) {
        setExchangeRate(String(data.rate));
        toast.success(`Tipo de cambio actualizado: S/ ${data.rate} (${data.source})`);
        // Propagate new rate to configStore so all components update immediately
        await refreshConfig();
      } else {
        toast.error('No se pudo obtener el tipo de cambio: ' + (data?.fixer_error || 'respuesta inválida'));
      }
    } catch (e: any) {
      toast.error('Error al conectar: ' + (e?.message || 'revisa la API key'));
    }
    setRefreshingRate(false);
  };

  const toggleActive = async (gw: any) => {
    await database.update('payment_gateways', gw.id, { is_active: !gw.is_active, updated_at: new Date().toISOString() });
    setGateways(prev => prev.map(g => g.id === gw.id ? { ...g, is_active: !g.is_active } : g));
    toast.success(`${gw.name} ${!gw.is_active ? 'activado' : 'desactivado'}`);
  };

  const toggleTestMode = async (gw: any) => {
    await database.update('payment_gateways', gw.id, { test_mode: !gw.test_mode, updated_at: new Date().toISOString() });
    setGateways(prev => prev.map(g => g.id === gw.id ? { ...g, test_mode: !g.test_mode } : g));
    toast.success(`${gw.name}: ${!gw.test_mode ? 'modo prueba' : 'modo producción'}`);
  };

  const saveCreds = async (gw: any) => {
    setSaving(gw.id);
    await database.update('payment_gateways', gw.id, {
      credentials: creds[gw.id] || {},
      commission_rate: parseFloat(commRates[gw.id] || '0') || 0,
      updated_at: new Date().toISOString(),
    });
    setSaving(null);
    fetchAll();
    toast.success(`Configuración de ${gw.name} guardada`);
  };

  const toggleSecret = (key: string) => setShowSecrets(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Pasarelas de Pago</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Configura las credenciales de cada pasarela. Activa modo prueba para desarrollo.</p>
      </div>

      {/* Currency / Fixer.io */}
      <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-5">
          <DollarSign className="w-4 h-4 text-primary" /> Tipo de Cambio y Fixer.io
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Tasa PEN/USD</label>
            <div className="flex gap-2">
              <input value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} placeholder="3.72"
                className="flex-1 px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary font-mono" />
              <button onClick={refreshRate} disabled={refreshingRate} title="Actualizar desde Fixer.io"
                className="p-2.5 border border-border rounded-lg hover:bg-muted text-muted-foreground transition-colors disabled:opacity-50">
                <RefreshCw className={cn('w-4 h-4', refreshingRate && 'animate-spin')} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">API Key de Fixer.io</label>
            <div className="relative">
              <input type={showSecrets['fixer'] ? 'text' : 'password'} value={fixerKey} onChange={e => setFixerKey(e.target.value)}
                placeholder="Tu API key de fixer.io"
                className="w-full px-3 py-2.5 pr-10 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary font-mono" />
              <button type="button" onClick={() => toggleSecret('fixer')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showSecrets['fixer'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
          Obtén tu API key gratuita en <span className="text-primary font-medium">fixer.io</span>. El tipo de cambio se actualiza automáticamente.
          Haz clic en el botón de recarga para obtener la tasa actual.
        </div>
        <div className="mt-6 pt-4 border-t border-border flex justify-end">
          <button onClick={saveCurrencyConfig} disabled={savingCurrency}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            {savingCurrency ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
          </button>
        </div>
      </div>

      {gateways.map(gw => {
        const hasCredentials = Object.values(gw.credentials || {}).some((v: any) => v && v.trim() !== '');
        return (
          <div key={gw.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-4">
              <span className="text-3xl">{gw.logo}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-foreground">{gw.name}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', gw.currency === 'USD' ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-600')}>{gw.currency}</span>
                  {hasCredentials && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">Configurado</span>}
                  {!hasCredentials && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">Sin configurar</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{gw.description}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Prueba</span>
                  <button onClick={() => toggleTestMode(gw)}
                    className={cn('w-9 h-5 rounded-full relative transition-colors', gw.test_mode ? 'bg-primary' : 'bg-muted-foreground/30')}>
                    <div className={cn('w-3 h-3 bg-white rounded-full absolute top-1 transition-transform', gw.test_mode ? 'translate-x-5' : 'translate-x-1')} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Activo</span>
                  <button onClick={() => toggleActive(gw)}
                    className={cn('w-9 h-5 rounded-full relative transition-colors', gw.is_active ? 'bg-primary' : 'bg-muted-foreground/30')}>
                    <div className={cn('w-3 h-3 bg-white rounded-full absolute top-1 transition-transform', gw.is_active ? 'translate-x-5' : 'translate-x-1')} />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Object.entries(gw.credentials || {}).map(([key]) => {
                const secretKey = `${gw.id}-${key}`;
                const isSecret = key.includes('secret') || key.includes('private') || key.includes('token') || key.includes('password');
                return (
                  <div key={key}>
                    <label className="block text-xs font-medium text-foreground mb-1 capitalize">{key.replace(/_/g, ' ')}</label>
                    <div className="relative">
                      <input
                        type={isSecret && !showSecrets[secretKey] ? 'password' : 'text'}
                        value={creds[gw.id]?.[key] || ''}
                        onChange={e => setCreds(p => ({ ...p, [gw.id]: { ...p[gw.id], [key]: e.target.value } }))}
                        placeholder={`Ingresa ${key.replace(/_/g, ' ')}`}
                        className="w-full px-3 py-2 pr-10 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors font-mono"
                      />
                      {isSecret && (
                        <button type="button" onClick={() => toggleSecret(secretKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showSecrets[secretKey] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Tasa de comisión (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0" max="100" step="0.01"
                    value={commRates[gw.id] ?? '0'}
                    onChange={e => setCommRates(p => ({ ...p, [gw.id]: e.target.value }))}
                    className="w-28 px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary font-mono"
                  />
                  <span className="text-xs text-muted-foreground">% por transacción</span>
                </div>
              </div>
              </div>
              <div className="pt-4 border-t border-border flex justify-end">
                <button onClick={() => saveCreds(gw)} disabled={saving === gw.id}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {saving === gw.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
