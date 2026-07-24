import { useState, useEffect, useCallback } from 'react';
import { useDatabase, useStorage } from '@/lib/backend';
import { supabase } from '@/lib/backend/client';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { Search, Plus, Pencil, Trash2, Eye, UserCheck, UserX, X, Save, RefreshCw, ChevronLeft, ChevronRight, CircleCheck as CheckCircle, Shield, Users, Loader as Loader2, KeyRound, Info, LogIn, Link2 } from 'lucide-react';

interface UserRow {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  rank: string;
  plan: string;
  referral_code: string;
  created_at: string;
  phone?: string;
  sponsor_id?: string;
  avatar_url?: string;
}

interface PlanOption { slug: string; name: string; }
interface RankOption { slug: string; name: string; }
interface CustomRoleOption { name: string; label: string; color: string; }

const ROLES = ['user', 'inspector', 'support', 'admin', 'super_admin'];
const STATUSES = ['active', 'suspended', 'pending'];

const rankColors: Record<string, string> = {
  bronze: 'text-amber-600 bg-amber-500/10', silver: 'text-slate-400 bg-slate-400/10',
  gold: 'text-yellow-500 bg-amber-500/10', platinum: 'text-slate-300 bg-slate-300/10',
  diamond: 'text-cyan-400 bg-cyan-400/10', crown: 'text-yellow-400 bg-yellow-400/10',
};
const statusColors: Record<string, string> = {
  active: 'text-emerald-600 bg-emerald-500/10',
  suspended: 'text-destructive bg-destructive/10',
  pending: 'text-amber-600 bg-amber-500/10',
};
const statusLabels: Record<string, string> = { active: 'Activo', suspended: 'Suspendido', pending: 'Pendiente' };
const roleLabels: Record<string, string> = {
  user: 'Usuario', inspector: 'Inspector', support: 'Soporte', admin: 'Admin', super_admin: 'Super Admin',
};
const roleColors: Record<string, string> = {
  user: 'text-muted-foreground bg-muted', inspector: 'text-primary bg-primary/10',
  support: 'text-primary bg-primary/10', admin: 'text-amber-600 bg-amber-500/10',
  super_admin: 'text-red-600 bg-destructive/10',
};

const PAGE_SIZE = 10;

function Field({
  label, children, hint,
}: {
  label: string; children: React.ReactNode; hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-foreground mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Input({
  value, onChange, placeholder, type = 'text', readOnly, autoComplete,
}: {
  value: string; onChange?: (v: string) => void;
  placeholder?: string; type?: string; readOnly?: boolean; autoComplete?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      autoComplete={autoComplete}
      onChange={e => onChange?.(e.target.value)}
      readOnly={readOnly}
      placeholder={placeholder}
      className={cn(
        'w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground',
        readOnly ? 'opacity-60 cursor-default' : 'focus:border-primary hover:border-muted-foreground/50',
      )}
    />
  );
}

function Select({
  value, onChange, disabled, children,
}: {
  value: string; onChange?: (v: string) => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange?.(e.target.value)}
      disabled={disabled}
      className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary hover:border-muted-foreground/50 transition-colors disabled:opacity-60 disabled:cursor-default"
    >
      {children}
    </select>
  );
}

function UserAvatar({ user, size = 'md' }: { user: UserRow; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';
  const initials = (user.full_name || user.email || '?')
    .split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  if (user.avatar_url) {
    return (
      <img src={user.avatar_url} alt={user.full_name}
        className={cn(dim, 'rounded-full object-cover border border-border flex-shrink-0')} />
    );
  }
  return (
    <div className={cn(dim, 'rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center font-bold text-primary flex-shrink-0')}>
      {initials}
    </div>
  );
}

type ModalMode = 'view' | 'edit' | 'create' | null;

// ── User Modal ──
function UserModal({
  mode, user, plans, ranks, customRoles, onClose, onSave,
}: {
  mode: ModalMode;
  user: UserRow | null;
  plans: PlanOption[];
  ranks: RankOption[];
  customRoles: CustomRoleOption[];
  onClose: () => void;
  onSave: (data: Partial<UserRow> & { _newPassword?: string }) => Promise<void>;
}) {
  const defaultPlan = plans[0]?.slug || 'free';
  const defaultRank = ranks[0]?.slug || 'bronze';

  const [form, setForm] = useState<Partial<UserRow>>(() =>
    user ?? { username: '', full_name: '', email: '', role: 'user', status: 'active', rank: defaultRank, plan: defaultPlan, phone: '' }
  );
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const database = useDatabase();
  const storage = useStorage();

  const readOnly = mode === 'view';

  useEffect(() => {
    setForm(user ?? { username: '', full_name: '', email: '', role: 'user', status: 'active', rank: defaultRank, plan: defaultPlan, phone: '' });
    setNewPassword('');
  }, [user, mode]);

  // Auto-generate username from full_name on create
  useEffect(() => {
    if (mode !== 'create' || !form.full_name) return;
    const auto = (form.full_name as string)
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_\s]/g, '').trim().replace(/\s+/g, '_');
    setForm(p => ({ ...p, username: auto }));
  }, [form.full_name, mode]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !form.id) return;
    if (file.size > 3 * 1024 * 1024) { toast.error('Máx 3MB'); return; }
    setAvatarUploading(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${form.id}/avatar.${ext}`;
    const { success, url, error: upErr } = await storage.upload('avatars', path, file, { upsert: true });
    if (!success || upErr) { toast.error('Error al subir imagen'); setAvatarUploading(false); return; }
    await database.update('profiles', form.id as string, { avatar_url: url, updated_at: new Date().toISOString() });
    setForm(p => ({ ...p, avatar_url: url }));
    toast.success('Foto de perfil actualizada');
    setAvatarUploading(false);
  };

  const set = (key: keyof UserRow) => (val: string) => setForm(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    await onSave({ ...form, _newPassword: newPassword });
    setSaving(false);
  };

  const title = { create: 'Crear nuevo usuario', edit: 'Editar usuario', view: 'Detalle de usuario' }[mode!];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {mode === 'create' && (
            <div className="flex items-start gap-2.5 bg-primary/10 border border-primary/20 rounded-xl p-3.5">
              <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-primary">
                Se creará la cuenta con contraseña temporal <strong>Temp123456!</strong>. El usuario deberá cambiarla al iniciar sesión.
              </p>
            </div>
          )}

          {/* Name + Email */}
          <div className="grid grid-cols-1 gap-4">
            {/* Avatar upload — CREATE mode */}
            {mode === 'create' && (
              <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-xl border border-border">
                <div className="relative flex-shrink-0">
                  {(form as any)._createAvatarPreview ? (
                    <img src={(form as any)._createAvatarPreview} alt="avatar"
                      className="w-16 h-16 rounded-full object-cover border-2 border-border" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center text-primary font-bold text-xl">
                      {((form.full_name as string) || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-md">
                    <span className="text-xs font-bold">+</span>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (f.size > 3 * 1024 * 1024) { toast.error('Máx 3 MB'); return; }
                        setForm(p => ({ ...p, _createAvatarFile: f, _createAvatarPreview: URL.createObjectURL(f) }));
                      }} />
                  </label>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Foto de perfil</p>
                  <p className="text-xs text-muted-foreground">Opcional — puedes cambiarla después</p>
                  {(form as any)._createAvatarPreview && (
                    <button type="button"
                      onClick={() => setForm(p => ({ ...p, _createAvatarFile: undefined, _createAvatarPreview: undefined }))}
                      className="text-xs text-destructive hover:underline mt-1">Quitar foto</button>
                  )}
                </div>
              </div>
            )}

                        {/* Avatar section — only in edit mode when user already exists */}
            {mode === 'edit' && form.id && (
              <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-xl border border-border">
                <div className="relative flex-shrink-0">
                  {(form as any).avatar_url ? (
                    <img src={(form as any).avatar_url} alt={form.full_name as string}
                      className="w-16 h-16 rounded-full object-cover border-2 border-border" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary/15 border-2 border-primary/25 flex items-center justify-center text-xl font-bold text-primary">
                      {((form.full_name as string) || (form.email as string) || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <label className={cn('absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-md', avatarUploading && 'opacity-50 cursor-not-allowed')}>
                    {avatarUploading
                      ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <span className="text-xs font-bold">+</span>}
                    <input type="file" accept="image/*" className="hidden" disabled={avatarUploading} onChange={handleAvatarUpload} />
                  </label>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{form.full_name as string}</p>
                  <p className="text-xs text-muted-foreground">Haz clic en el botón + para cambiar la foto</p>
                  {(form as any).avatar_url && (
                    <button type="button" onClick={async () => {
                      await database.update('profiles', form.id as string, { avatar_url: null, updated_at: new Date().toISOString() });
                      setForm(p => ({ ...p, avatar_url: undefined }));
                      toast.success('Foto eliminada');
                    }} className="text-xs text-destructive hover:underline mt-1">
                      Quitar foto
                    </button>
                  )}
                </div>
              </div>
            )}

            <Field label="Nombre completo" hint={mode === 'create' ? 'El nombre de usuario se generará automáticamente' : undefined}>
              <Input
                value={(form.full_name as string) || ''}
                onChange={set('full_name')}
                placeholder="Ej: Juan Pérez García"
                readOnly={readOnly}
                autoComplete="name"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre de usuario" hint={mode === 'create' ? 'Auto-generado desde el nombre' : undefined}>
              <Input
                value={(form.username as string) || ''}
                onChange={set('username')}
                placeholder="juan_perez"
                readOnly={readOnly}
                autoComplete="username"
              />
            </Field>
            <Field label="Correo electrónico">
              <Input
                type="email"
                value={(form.email as string) || ''}
                onChange={set('email')}
                placeholder="juan@ejemplo.com"
                readOnly={readOnly || mode === 'edit'}
                autoComplete="email"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Teléfono (opcional)">
              <Input
                type="tel"
                value={(form.phone as string) || ''}
                onChange={set('phone')}
                placeholder="+51 999 999 999"
                readOnly={readOnly}
                autoComplete="tel"
              />
            </Field>
            <Field label="Código de referido" hint={mode === 'create' ? 'Se generará automáticamente al crear el usuario' : 'Asignado por el sistema — no editable'}>
              <Input
                value={(form.referral_code as string) || (mode === 'create' ? '' : '')}
                placeholder={mode === 'create' ? 'Se generará al crear...' : ''}
                readOnly
              />
            </Field>
          </div>

          {/* Selects */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Rol en el sistema">
              <Select value={(form.role as string) || 'user'} onChange={set('role')} disabled={readOnly}>
                {(customRoles.length > 0 ? customRoles : ROLES.map(r => ({ name: r, label: roleLabels[r] || r, color: '#6B7280' }))).map(r => <option key={r.name} value={r.name}>{r.label}</option>)}
              </Select>
            </Field>
            <Field label="Estado de la cuenta">
              <Select value={(form.status as string) || 'active'} onChange={set('status')} disabled={readOnly}>
                {STATUSES.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Rango MLM">
              <Select value={(form.rank as string) || defaultRank} onChange={set('rank')} disabled={readOnly}>
                {ranks.map(r => <option key={r.slug} value={r.slug}>{r.name}</option>)}
              </Select>
            </Field>
            <Field label="Plan de suscripción">
              <Select value={(form.plan as string) || defaultPlan} onChange={set('plan')} disabled={readOnly}>
                {plans.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              </Select>
            </Field>
          </div>

          {/* Password */}
          {mode !== 'view' && (
            <Field
              label={mode === 'create' ? 'Contraseña (opcional)' : 'Nueva contraseña'}
              hint={mode === 'edit' ? 'Dejar vacío para no cambiar la contraseña actual' : 'Si no se ingresa se usará Temp123456!'}
            >
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full pl-9 pr-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary hover:border-muted-foreground/50 transition-colors placeholder:text-muted-foreground"
                />
              </div>
            </Field>
          )}

          {/* View-only metadata */}
          {mode === 'view' && user && (
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Miembro desde', new Date(user.created_at).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })],
                ['ID del usuario', user.id.slice(0, 18) + '...'],
              ].map(([k, v]) => (
                <div key={k} className="bg-muted/50 rounded-xl p-3">
                  <div className="text-xs text-muted-foreground mb-0.5">{k}</div>
                  <div className="text-xs font-medium text-foreground font-mono truncate">{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {mode !== 'view' && (
          <div className="flex items-center gap-3 px-6 py-4 border-t border-border flex-shrink-0">
            <button onClick={onClose} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {mode === 'create' ? 'Crear usuario' : 'Guardar cambios'}
            </button>
          </div>
        )}
        {mode === 'view' && (
          <div className="px-6 py-4 border-t border-border flex-shrink-0">
            <button onClick={onClose} className="w-full border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition-colors">
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──
export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const database = useDatabase();
  const storage = useStorage();

  const copyInviteLink = (u: UserRow) => {
    const link = `${window.location.origin}/registro?ref=${u.referral_code || ''}`;
    navigator.clipboard.writeText(link).then(() => toast.success('Enlace de referido copiado'));
  };

  const [users, setUsers] = useState<UserRow[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [ranks, setRanks] = useState<RankOption[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState<{ mode: ModalMode; user: UserRow | null }>({ mode: null, user: null });
  const [deleteConfirm, setDeleteConfirm] = useState<UserRow | null>(null);

  // Load plans + ranks once
  useEffect(() => {
    Promise.all([
      database.select<PlanOption>('plans', { select: 'slug, name', filter: { is_active: true }, order: { column: 'sort_order' } }),
      database.select<RankOption>('ranks', { select: 'slug, name', filter: { is_active: true }, order: { column: 'sort_order' } }),
      database.select<CustomRoleOption>('custom_roles', { select: 'name, label, color', order: { column: 'sort_order' } }),
    ]).then(([p, r, cr]) => {
      if (p.data) setPlans(p.data as PlanOption[]);
      if (r.data) setRanks(r.data as RankOption[]);
      if (cr.data && (cr.data as CustomRoleOption[]).length > 0) setCustomRoles(cr.data as CustomRoleOption[]);
    });
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const conditions: string[] = [];
    if (search) conditions.push(`or(full_name.ilike.%${search}%,email.ilike.%${search}%,username.ilike.%${search}%)`);
    if (filterRole) conditions.push(`role.eq.${filterRole}`);
    if (filterStatus) conditions.push(`status.eq.${filterStatus}`);
    if (filterPlan) conditions.push(`plan.eq.${filterPlan}`);
    const filter = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : `and=(${conditions.join(',')})`;
    const { data, count } = await database.select<UserRow>('profiles', {
      count: 'exact',
      filter,
      order: { column: 'created_at', ascending: false },
      range: { from: (page - 1) * PAGE_SIZE, to: page * PAGE_SIZE - 1 },
    });
    if (data) setUsers(data as UserRow[]);
    if (count !== null && count !== undefined) setTotal(count);
    setLoading(false);
  }, [search, filterRole, filterStatus, filterPlan, page, database]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSave = async (data: Partial<UserRow> & { _newPassword?: string }) => {
    const { _newPassword, id, created_at, ...fields } = data as any;

    if (modal.mode === 'create') {
      if (!fields.email || !fields.full_name) { toast.error('Nombre y correo son requeridos'); return; }
      const username = (fields.username || fields.full_name)
        .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_\s]/g, '').trim().replace(/\s+/g, '_');

      const { data: result, error } = await database.rpc('add_referral_direct', {
        p_sponsor_id: null,
        p_full_name: fields.full_name,
        p_email: fields.email,
        p_username: username,
        p_position: 'left',
      });

      if (error || (result && !(result as any).success)) {
        toast.error((result as any)?.error || error || 'Error al crear usuario');
        return;
      }

      const uid = (result as any)?.user_id;
      if (uid) {
        // Wait for trigger to create profile row
        await new Promise(r => setTimeout(r, 700));
        await database.update('profiles', uid, {
          role: fields.role || 'user',
          plan: fields.plan || plans[0]?.slug || 'free',
          status: fields.status || 'active',
          rank: fields.rank || ranks[0]?.slug || 'bronze',
          phone: fields.phone || null,
          updated_at: new Date().toISOString(),
        });
      }
      // Upload avatar if provided
      const avatarFile = (data as any)._createAvatarFile as File | undefined;
      if (avatarFile && uid) {
        try {
          const ext = avatarFile.name.split('.').pop() || 'jpg';
          const path = `${uid}/avatar.${ext}`;
          const { success, url } = await storage.upload('avatars', path, avatarFile, { upsert: true, contentType: avatarFile.type });
          if (success && url) {
            await database.update('profiles', uid, { avatar_url: url });
          }
        } catch { /* best-effort */ }
      }
      toast.success('Usuario creado. Contraseña temporal: Temp123456!');

    } else {
      const { error } = await database.update('profiles', id, { ...fields, updated_at: new Date().toISOString() });
      if (error) { toast.error(error); return; }
      toast.success('Usuario actualizado correctamente');
    }

    setModal({ mode: null, user: null });
    fetchUsers();
  };

  const toggleStatus = async (user: UserRow) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    const { error } = await database.update('profiles', user.id, { status: newStatus, updated_at: new Date().toISOString() });
    if (!error) {
      toast.success(newStatus === 'active' ? `${user.full_name} activado` : `${user.full_name} suspendido`);
      fetchUsers();
    }
  };

  const [deletingUserId, setDeletingUserId] = useState(false);

  const deleteUser = async (user: UserRow) => {
    setDeletingUserId(true);
    try {
      const { error: rpcError } = await supabase.rpc('admin_delete_user', { p_user_id: user.id });
      if (rpcError) {
        // Fallback: try deleting profile directly (auth user may already be gone)
        const { error: dbError } = await supabase.from('profiles').delete().eq('id', user.id);
        if (dbError) throw new Error(rpcError.message || dbError.message);
      }
      toast.success(`Usuario ${user.full_name} eliminado`);
      setDeleteConfirm(null);
      fetchUsers();
    } catch (e: any) {
      toast.error('Error al eliminar: ' + (e?.message || 'desconocido'));
    } finally {
      setDeletingUserId(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const planMap = Object.fromEntries(plans.map(p => [p.slug, p.name]));
  const rankMap = Object.fromEntries(ranks.map(r => [r.slug, r.name]));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h1>
          <p className="text-muted-foreground text-sm mt-1">Administra todos los usuarios del sistema.</p>
        </div>
        <button
          onClick={() => setModal({ mode: 'create', user: null })}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo usuario
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total usuarios', value: total, icon: Users, color: 'text-primary bg-primary/10' },
          { label: 'Activos', value: users.filter(u => u.status === 'active').length, icon: CheckCircle, color: 'text-green-500 bg-emerald-500/10' },
          { label: 'Administradores', value: users.filter(u => ['admin', 'super_admin'].includes(u.role)).length, icon: Shield, color: 'text-orange-500 bg-amber-500/10' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', s.color)}>
              <s.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre, email o usuario..."
            className="w-full pl-9 pr-4 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
          />
        </div>
        <select
          value={filterRole}
          onChange={e => { setFilterRole(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary min-w-[120px]"
        >
          <option value="">Todos los roles</option>
          {(customRoles.length > 0 ? customRoles : ROLES.map(r => ({ name: r, label: roleLabels[r] || r, color: '#6B7280' }))).map(r => <option key={r.name} value={r.name}>{r.label}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary min-w-[120px]"
        >
          <option value="">Todos los estados</option>
          {STATUSES.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
        </select>
        <select
          value={filterPlan}
          onChange={e => { setFilterPlan(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary min-w-[120px]"
        >
          <option value="">Todos los planes</option>
          {plans.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
        </select>
        <button
          onClick={() => fetchUsers()}
          className="p-2.5 border border-border rounded-xl hover:bg-muted text-muted-foreground transition-colors"
          title="Actualizar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Usuario</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Rol</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Estado</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Rango / Plan</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden xl:table-cell">Código Ref.</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={6} className="py-3 px-4">
                      <div className="h-9 bg-muted animate-pulse rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted-foreground text-sm">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : users.map(user => (
                <tr key={user.id} className="border-b border-border hover:bg-muted/25 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={user} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate max-w-[160px]">{user.full_name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[160px]">{user.email}</div>
                        {(user as any).slug && <div className="text-xs text-primary/60 font-mono">@{(user as any).slug}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <span className={cn('text-xs font-medium px-2 py-1 rounded-full', roleColors[user.role] || 'bg-muted text-muted-foreground')}>
                      {(customRoles.find(r => r.name === user.role) || { label: roleLabels[user.role] || user.role })?.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <span className={cn('text-xs font-medium px-2 py-1 rounded-full', statusColors[user.status] || 'bg-muted text-muted-foreground')}>
                      {statusLabels[user.status] || user.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    <div className="flex flex-col gap-1">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full w-fit', rankColors[user.rank] || 'bg-muted text-muted-foreground')}>
                        {rankMap[user.rank] || user.rank}
                      </span>
                      <span className="text-xs text-muted-foreground">{planMap[user.plan] || user.plan}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden xl:table-cell">
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{user.referral_code || '—'}</code>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        onClick={() => setModal({ mode: 'view', user })}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Ver detalle"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setModal({ mode: 'edit', user })}
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => copyInviteLink(user)}
                        className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 transition-colors"
                        title="Copiar enlace de referido"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                      </button>
                      {isSuperAdmin && (
                        <button
                          onClick={() => toast.info(`Para impersonar a ${user.full_name}, usa Supabase Studio → Authentication → Users.`)}
                          className="p-1.5 rounded-lg hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600 transition-colors"
                          title="Acceder como usuario (solo superadmin)"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => toggleStatus(user)}
                        className={cn(
                          'p-1.5 rounded-lg transition-colors',
                          user.status === 'active'
                            ? 'hover:bg-destructive/10 text-muted-foreground hover:text-destructive'
                            : 'hover:bg-emerald-500/10 text-green-500 hover:text-emerald-600',
                        )}
                        title={user.status === 'active' ? 'Suspender' : 'Activar'}
                      >
                        {user.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(user)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total} usuarios
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn('w-8 h-8 rounded-lg text-xs font-medium transition-colors', p === page ? 'bg-primary text-white' : 'hover:bg-muted text-muted-foreground')}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User modal */}
      {modal.mode && (
        <UserModal
          mode={modal.mode}
          user={modal.user}
          plans={plans}
          ranks={ranks}
          customRoles={customRoles}
          onClose={() => setModal({ mode: null, user: null })}
          onSave={handleSave}
        />
      )}

      {/* Delete confirm */}
      <DeleteConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}
        onConfirm={() => deleteConfirm && deleteUser(deleteConfirm)}
        title="Eliminar usuario"
        description={<>Se eliminará permanentemente a <strong className="text-foreground">{deleteConfirm?.full_name}</strong> y su cuenta de autenticación. Esta acción no se puede deshacer.</>}
        loading={deletingUserId}
      />
    </div>
  );
}
