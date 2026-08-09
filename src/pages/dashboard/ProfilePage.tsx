import { useState, useEffect } from 'react';
import { useBackend, useDatabase, useStorage } from '@/lib/backend';
import { useAuthStore } from '@/store/authStore';
import { useConfig, type Rank } from '@/store/configStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { User, Mail, Phone, Calendar, Save, Camera, Lock, Eye, EyeOff, Copy, Link2, CircleCheck as CheckCircle, Crown, Medal, Star, CircleAlert as AlertCircle } from 'lucide-react';

const statusLabels: Record<string, string> = {
  active: 'Activo', suspended: 'Suspendido', pending: 'Pendiente', inactive: 'Inactivo',
};
const roleLabels: Record<string, string> = {
  user: 'Usuario', inspector: 'Inspector', support: 'Soporte',
  admin: 'Admin', super_admin: 'Super Admin',
};

function resolveBadgeColor(color: string | undefined, bg: string | undefined, fallbackColor: string, fallbackBg: string) {
  const isRaw = (v?: string) => v && (v.startsWith('#') || v.startsWith('rgb') || v.startsWith('hsl'));
  const style: React.CSSProperties = {};
  if (isRaw(color)) style.color = color;
  if (isRaw(bg)) style.backgroundColor = bg;
  const cls = cn(
    'flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ring-1 ring-inset ring-white/10',
    !isRaw(color) ? (color || fallbackColor) : '',
    !isRaw(bg) ? (bg || fallbackBg) : '',
  );
  return { cls, style };
}

const rankIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  medal: Medal, crown: Crown, star: Star,
  bronze: Medal, silver: Medal, gold: Medal, platinum: Medal, diamond: Medal,
};

function RankBadgeIcon({ rank, className }: { rank: Rank; className?: string }) {
  const icon = rank.icon || '';
  const trimmed = icon.trim();
  if (trimmed.toLowerCase().startsWith('<svg')) {
    return (
      <span
        className={cn('inline-flex items-center justify-center w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain', className)}
        dangerouslySetInnerHTML={{ __html: trimmed }}
      />
    );
  }
  if (trimmed.startsWith('http') || trimmed.startsWith('/')) {
    return <img src={trimmed} alt="" className={cn('w-full h-full object-contain', className)} />;
  }
  const Comp = rankIconMap[trimmed.toLowerCase()];
  if (Comp) return <Comp className={className} />;
  if (trimmed.length === 1 || (trimmed.length <= 4 && !trimmed.includes('.'))) {
    return <span className={cn('flex items-center justify-center w-full h-full', className)}>{trimmed}</span>;
  }
  return <Star className={className} />;
}

export default function ProfilePage() {
  const { user, fetchProfile } = useAuthStore();
  const { plans, ranks } = useConfig();
  const database = useDatabase();
  const storage = useStorage();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const RANK_LEGACY_MAP: Record<string, string> = {
    bronze: 'plata', silver: 'plata', gold: 'oro',
    platinum: 'zafiro', diamond: 'diamante', master: 'master',
  };
  const userPlan = user ? plans.find(p => p.slug === user.plan || p.id === user.plan || p.name?.toLowerCase() === user.plan?.toLowerCase()) : null;
  const userRank = user ? ranks.find(r =>
    r.slug === user.rank ||
    r.slug === RANK_LEGACY_MAP[user.rank || ''] ||
    r.name?.toLowerCase() === user.rank?.toLowerCase() ||
    r.name?.toLowerCase() === RANK_LEGACY_MAP[user.rank || '']
  ) : null;

  const buildFormFromUser = () => ({
    full_name: user?.full_name || '',
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar_url: user?.avatar_url || '',
  });

  const [form, setForm] = useState(buildFormFromUser());

  useEffect(() => {
    if (user) setForm(buildFormFromUser());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) {
    return (
      <div className="space-y-4 sm:space-y-6 max-w-6xl">
        <div className="space-y-1.5">
          <div className="h-7 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
        </div>
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-36 bg-muted rounded animate-pulse" />
              <div className="h-3 w-28 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                <div className="h-10 w-full bg-muted rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('La imagen no debe superar 2MB'); return; }
    setUploadingAvatar(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    const result = await storage.upload('avatars', path, file);
    if (result.error || !result.url) {
      toast.error('Error al subir imagen');
      setUploadingAvatar(false);
      return;
    }
    setForm(f => ({ ...f, avatar_url: result.url! }));
    await database.update('profiles', user.id, { avatar_url: result.url, updated_at: new Date().toISOString() });
    toast.success('Avatar actualizado');
    await fetchProfile(user.id);
    setUploadingAvatar(false);
  };

  const initials = (form.full_name || form.email || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="space-y-4 sm:space-y-5 max-w-6xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mi Perfil</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestiona tu información personal.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <div className="h-full flex flex-col justify-center bg-card border border-border rounded-xl p-4 sm:p-6">
          <div className="flex flex-row items-start gap-3 sm:gap-5">
            <div className="flex-shrink-0 w-16 sm:w-20">
              <div className="relative w-14 h-14 sm:w-20 sm:h-20 mx-auto">
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="" className={cn('w-14 h-14 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-border', uploadingAvatar && 'opacity-50')} />
                ) : (
                  <div className={cn('w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-base sm:text-xl font-bold text-primary', uploadingAvatar && 'opacity-50')}>
                    {initials}
                  </div>
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <label className="absolute bottom-0 right-0 w-5 h-5 sm:w-7 sm:h-7 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-md outline-none">
                  <Camera className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} disabled={uploadingAvatar} />
                </label>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center leading-tight">JPG o PNG, máx. 2MB</p>
            </div>

            <div className="flex-1 min-w-0 text-left">
              <h2 className="text-base sm:text-lg font-bold text-foreground truncate">{form.full_name || 'Sin nombre'}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{form.email}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">{roleLabels[user.role] || user.role}</span>
                {userPlan && (() => {
                  const { cls, style } = resolveBadgeColor(userPlan.color, userPlan.bg_color, 'text-amber-600 dark:text-amber-400', 'bg-amber-500/10');
                  return (
                    <span className={cls} style={style}>
                      <Crown className="w-2.5 h-2.5" />{userPlan.name}
                    </span>
                  );
                })()}
                {userRank && (() => {
                  const { cls, style } = resolveBadgeColor(userRank.color, userRank.bg_color, 'text-primary', 'bg-primary/10');
                  return (
                    <span className={cls} style={style}>
                      <RankBadgeIcon rank={userRank} className="w-2.5 h-2.5" />{userRank.name}
                    </span>
                  );
                })()}
                {!userRank && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-600">Bronce</span>
                )}
                <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full',
                  user.status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500')}>
                  {statusLabels[user.status] || user.status}
                </span>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2.5">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" /> Miembro desde {new Date(user.created_at).toLocaleDateString('es-PE')}
              </p>
            </div>
          </div>
        </div>

        <ReferralsSection />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <PersonalInfoSection user={user} form={form} setForm={setForm} onSaved={() => fetchProfile(user.id)} />
        <ChangePasswordSection />
      </div>
    </div>
  );
}

function PersonalInfoSection({ user, form, setForm, onSaved }: {
  user: any; form: any; setForm: (updater: (p: any) => any) => void; onSaved: () => void;
}) {
  const database = useDatabase();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snapshot, setSnapshot] = useState(form);

  const startEdit = () => { setSnapshot(form); setEditing(true); };
  const cancelEdit = () => { setForm(() => snapshot); setEditing(false); };

  const isDirty =
    form.full_name !== (user.full_name || '') ||
    form.username !== (user.username || '') ||
    form.phone !== (user.phone || '');

  const handleSave = async () => {
    setSaving(true);
    const { error } = await database.update('profiles', user.id, {
      full_name: form.full_name,
      username: form.username,
      phone: form.phone,
      avatar_url: form.avatar_url,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      toast.error('Error al guardar los cambios');
    } else {
      toast.success('Perfil actualizado correctamente');
      setEditing(false);
      await onSaved();
    }
    setSaving(false);
  };

  return (
    <div className="h-full flex flex-col justify-between bg-card border border-border rounded-xl p-4 sm:p-6">
      <div>
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="flex items-center gap-2 min-w-0">
            <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Datos personales</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Tu nombre, usuario y datos de contacto.</p>
            </div>
          </div>
          {!editing ? (
            <button onClick={startEdit} className="text-xs font-medium text-primary hover:underline outline-none flex-shrink-0">Editar</button>
          ) : (
            <button onClick={cancelEdit} className="text-xs text-muted-foreground hover:text-foreground outline-none flex-shrink-0">Cancelar</button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {[
            { k: 'full_name', label: 'Nombre completo', icon: User, type: 'text', placeholder: 'No especificado' },
            { k: 'username', label: 'Usuario', icon: User, type: 'text', placeholder: 'No especificado' },
            { k: 'email', label: 'Correo', icon: Mail, type: 'email', placeholder: '' },
            { k: 'phone', label: 'Teléfono', icon: Phone, type: 'tel', placeholder: 'No especificado' },
          ].map(f => (
            <div key={f.k}>
              <label className="block text-xs font-medium text-foreground mb-1.5">{f.label}</label>
              <div className="relative">
                <f.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={f.type}
                  value={(form as any)[f.k]}
                  placeholder={f.placeholder}
                  onChange={e => editing && setForm((p: any) => ({ ...p, [f.k]: e.target.value }))}
                  readOnly={!editing || f.k === 'email'}
                  className={cn('w-full pl-9 pr-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60',
                    editing && f.k !== 'email' ? 'focus:border-primary' : 'opacity-70')}
                />
              </div>
              {f.k === 'email' && (
                <p className={cn('text-[11px] text-muted-foreground mt-1 min-h-[14px] transition-opacity', editing ? 'opacity-100' : 'opacity-0')}>
                  El correo no se puede modificar aquí
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {editing ? (
        <div className="flex items-center justify-end mt-6 pt-6 border-t border-border">
          <button onClick={handleSave} disabled={saving || !isDirty}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50 outline-none">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar cambios
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground mt-6 pt-6 border-t border-border">
          Actualizado el {new Date(user.updated_at || user.created_at).toLocaleDateString('es-PE')}
        </p>
      )}
    </div>
  );
}

function ReferralsSection() {
  const { user, getInviteLink } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const inviteLink = getInviteLink();

  const copyInvite = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!user) return null;

  return (
    <div className="h-full flex flex-col bg-card border border-border rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-2 min-w-0">
        <Link2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Tu enlace de referido</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Compártelo para invitar nuevos usuarios a tu red.</p>
        </div>
      </div>

      {user.referral_code && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Código:</span>
            <code className="text-xs font-bold text-foreground bg-muted px-2 py-1 rounded">{user.referral_code}</code>
          </div>
          {user.slug && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Usuario:</span>
              <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">@{user.slug}</code>
            </div>
          )}
        </div>
      )}

      <div className="mt-auto pt-4">
        {inviteLink ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 bg-muted border border-border rounded-lg px-3 py-2.5 overflow-hidden">
              <code className="block text-xs text-foreground truncate" title={inviteLink}>{inviteLink}</code>
            </div>
            <button onClick={copyInvite}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors outline-none">
              {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aún no tienes un enlace de referido disponible.</p>
        )}
      </div>
    </div>
  );
}

function ChangePasswordSection() {
  const backend = useBackend();
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [visible, setVisible] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const lengthOk = passwords.next.length === 0 || passwords.next.length >= 8;
  const matchOk = passwords.confirm.length === 0 || passwords.next === passwords.confirm;

  const toggleVisible = (k: 'current' | 'next' | 'confirm') =>
    setVisible(v => ({ ...v, [k]: !v[k] }));

  const handleChange = async () => {
    setTouched(true);
    if (!passwords.current || !passwords.next || !passwords.confirm) {
      toast.error('Completa todos los campos');
      return;
    }
    if (passwords.next.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (passwords.next !== passwords.confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setSaving(true);
    const result = await backend.auth.updatePassword(passwords.next);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Contraseña actualizada correctamente');
      setPasswords({ current: '', next: '', confirm: '' });
      setTouched(false);
    }
    setSaving(false);
  };

  const renderField = (k: 'current' | 'next' | 'confirm', label: string) => {
    const invalid =
      (k === 'next' && touched && !lengthOk) ||
      (k === 'confirm' && touched && !matchOk);
    const errorText = k === 'next' ? 'Mínimo 8 caracteres' : 'Las contraseñas no coinciden';
    return (
      <div key={k}>
        <label className="block text-xs font-medium text-foreground mb-1.5">{label}</label>
        <div className="relative">
          <input
            type={visible[k] ? 'text' : 'password'}
            value={passwords[k]}
            onChange={e => setPasswords(p => ({ ...p, [k]: e.target.value }))}
            placeholder="••••••••"
            className={cn(
              'w-full px-3 py-2.5 pr-10 bg-muted border rounded-lg text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground',
              invalid ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary',
            )}
          />
          <button type="button" onClick={() => toggleVisible(k)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground outline-none">
            {visible[k] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {(k === 'next' || k === 'confirm') && (
          <p className={cn('text-[11px] mt-1 min-h-[14px] flex items-center gap-1 text-destructive transition-opacity', invalid ? 'opacity-100' : 'opacity-0')}>
            <AlertCircle className="w-3 h-3" /> {errorText}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-card border border-border rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4 sm:mb-5 min-w-0">
        <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Cambiar contraseña</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Usa una contraseña de al menos 8 caracteres que no uses en otros sitios.</p>
        </div>
      </div>
      <div className="space-y-3">
        {renderField('current', 'Contraseña actual')}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {renderField('next', 'Nueva contraseña')}
          {renderField('confirm', 'Confirmar contraseña')}
        </div>
      </div>
      <div className="flex items-center justify-end mt-auto pt-6 border-t border-border">
        <button onClick={handleChange} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50 outline-none">
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Cambiar contraseña
        </button>
      </div>
    </div>
  );
}