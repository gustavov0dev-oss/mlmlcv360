import { useState, useEffect } from 'react';
import { useBackend, useDatabase, useStorage } from '@/lib/backend';
import { useAuthStore } from '@/store/authStore';
import { useConfig, type Rank } from '@/store/configStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { User, Mail, Phone, Shield, Calendar, Save, Camera, Lock, Eye, EyeOff, Copy, Link2, CircleCheck as CheckCircle, Crown, Medal, Star } from 'lucide-react';

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
    'flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
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
  const { user, fetchProfile, getInviteLink } = useAuthStore();
  const { plans, ranks } = useConfig();
  const database = useDatabase();
  const storage = useStorage();
  const [copied, setCopied] = useState(false);
  const inviteLink = getInviteLink();

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

  const copyInvite = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '', username: '', email: '', phone: '', avatar_url: '',
  });

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '',
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        avatar_url: user.avatar_url || '',
      });
    }
  }, [user]);

  if (!user) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="space-y-1.5">
          <div className="h-7 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
        </div>
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
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
      await fetchProfile(user.id);
    }
    setSaving(false);
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('La imagen no debe superar 2MB'); return; }
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    const result = await storage.upload('avatars', path, file);
    if (result.error || !result.url) { toast.error('Error al subir imagen'); return; }
    setForm(f => ({ ...f, avatar_url: result.url! }));
    await database.update('profiles', user.id, { avatar_url: result.url, updated_at: new Date().toISOString() });
    toast.success('Avatar actualizado');
    await fetchProfile(user.id);
  };

  const initials = (form.full_name || form.email || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestiona tu información personal.</p>
      </div>

      {/* Profile card */}
      <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-xl font-bold text-primary">
                {initials}
              </div>
            )}
            <label className="absolute bottom-0 right-0 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-md">
              <Camera className="w-3.5 h-3.5" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
            </label>
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-lg font-bold text-foreground">{form.full_name || 'Sin nombre'}</h2>
            <p className="text-sm text-muted-foreground">{form.email}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
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
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-foreground">Información personal</h3>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="text-xs text-primary hover:underline">Editar</button>
          ) : (
            <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { k: 'full_name', label: 'Nombre completo', icon: User, type: 'text' },
            { k: 'username', label: 'Usuario', icon: User, type: 'text' },
            { k: 'email', label: 'Correo', icon: Mail, type: 'email' },
            { k: 'phone', label: 'Teléfono', icon: Phone, type: 'tel' },
          ].map(f => (
            <div key={f.k}>
              <label className="block text-xs font-medium text-foreground mb-1.5">{f.label}</label>
              <div className="relative">
                <f.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={f.type}
                  value={(form as any)[f.k]}
                  onChange={e => editing && setForm(p => ({ ...p, [f.k]: e.target.value }))}
                  readOnly={!editing || f.k === 'email'}
                  className={cn('w-full pl-9 pr-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground',
                    editing && f.k !== 'email' ? 'focus:border-primary' : 'opacity-70')}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Account meta */}
        <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" /> Miembro desde {new Date(user.created_at).toLocaleDateString('es-PE')}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4" /> {roleLabels[user.role] || user.role}
          </div>
        </div>

        {/* Referral info */}
        <div className="mt-5 pt-5 border-t border-border space-y-3">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" /> Enlace de referido
          </h4>
          {user.referral_code && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Código:</span>
              <code className="text-xs font-bold text-foreground bg-muted px-2 py-1 rounded">{user.referral_code}</code>
              {user.slug && <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">@{user.slug}</code>}
            </div>
          )}
          {inviteLink && (
            <div className="flex items-center gap-2 bg-muted border border-border rounded-lg p-3">
              <code className="text-xs text-foreground break-all flex-1 min-w-0">{inviteLink}</code>
              <button onClick={copyInvite} className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors">
                {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          )}
        </div>

        {editing && (
          <button onClick={handleSave} disabled={saving}
            className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar cambios
          </button>
        )}
      </div>

      {/* Change password */}
      <ChangePasswordSection />
    </div>
  );
}

function ChangePasswordSection() {
  const backend = useBackend();
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = async () => {
    if (!passwords.current || !passwords.next || !passwords.confirm) {
      toast.error('Completa todos los campos');
      return;
    }
    if (passwords.next !== passwords.confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (passwords.next.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    setSaving(true);
    const result = await backend.auth.updatePassword(passwords.next);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Contraseña actualizada correctamente');
      setPasswords({ current: '', next: '', confirm: '' });
    }
    setSaving(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-5">
        <Lock className="w-4 h-4 text-primary" /> Cambiar contraseña
      </h3>
      <div className="space-y-3 max-w-md">
        {[
          { k: 'current', label: 'Contraseña actual' },
          { k: 'next', label: 'Nueva contraseña' },
          { k: 'confirm', label: 'Confirmar contraseña' },
        ].map(f => (
          <div key={f.k}>
            <label className="block text-xs font-medium text-foreground mb-1.5">{f.label}</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={(passwords as any)[f.k]}
                onChange={e => setPasswords(p => ({ ...p, [f.k]: e.target.value }))}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 pr-10 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
              />
              {f.k === 'current' && (
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        ))}
        <button onClick={handleChange} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50">
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Cambiar contraseña
        </button>
      </div>
    </div>
  );
}
