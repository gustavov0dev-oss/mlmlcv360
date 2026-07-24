import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '@/lib/backend';
import { useNavigate } from '@/lib/router';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Save, Shield, Users, X, Lock, ArrowRight, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';

interface CustomRole {
  id: string;
  name: string;
  label: string;
  color: string;
  description: string;
  is_system: boolean;
  sort_order: number;
}

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899',
  '#6B7280', '#1D4ED8', '#059669', '#D97706',
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map(c => (
          <button key={c} type="button" onClick={() => onChange(c)}
            title={c}
            className={cn(
              'w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 active:scale-95',
              value.toUpperCase() === c.toUpperCase() ? 'border-foreground shadow-md scale-110' : 'border-transparent',
            )}
            style={{ backgroundColor: c }} />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <label className="text-xs text-muted-foreground font-medium whitespace-nowrap">Color personalizado:</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-9 h-9 rounded-lg border border-border cursor-pointer bg-transparent p-0.5 flex-shrink-0"
          />
          <span className="text-xs font-mono text-muted-foreground">{value.toUpperCase()}</span>
        </div>
      </div>
      {/* Live preview badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Vista previa:</span>
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-white transition-colors"
          style={{ backgroundColor: value }}>
          <Shield style={{ width: 11, height: 11 }} /> Rol
        </span>
      </div>
    </div>
  );
}

export default function RolesAdminPage() {
  const navigate = useNavigate();
  const database = useDatabase();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', label: '', color: '#3B82F6', description: '' });
  const [saving, setSaving] = useState(false);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [deleteTarget, setDeleteTarget] = useState<CustomRole | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: r }, { data: usage }] = await Promise.all([
      database.select<CustomRole>('custom_roles', { order: { column: 'sort_order' } }),
      database.select<{ role: string }>('profiles', { select: 'role' }),
    ]);
    setRoles((r as CustomRole[]) || []);
    const counts: Record<string, number> = {};
    for (const u of ((usage as { role: string }[]) || [])) {
      counts[u.role] = (counts[u.role] || 0) + 1;
    }
    setUsageCounts(counts);
    const rArr = (r as CustomRole[]) || [];
    if (rArr.length > 0 && !selectedRole) setSelectedRole(rArr[0]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createRole = async () => {
    if (!newRole.name.trim() || !newRole.label.trim()) {
      toast.error('Nombre y etiqueta son requeridos');
      return;
    }
    const slug = newRole.name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '_').replace(/__+/g, '_').replace(/^_|_$/g, '');
    setSaving(true);
    const { data, error } = await database.insert<CustomRole>('custom_roles', {
      name: slug,
      label: newRole.label,
      color: newRole.color,
      description: newRole.description,
      is_system: false,
      sort_order: (roles.length + 1) * 10,
    });
    if (error) {
      toast.error(error.includes('unique') ? 'Ya existe un rol con ese nombre' : error);
    } else {
      toast.success('Rol creado correctamente');
      const created = data as CustomRole;
      const updated = [...roles, created];
      setRoles(updated);
      setSelectedRole(created);
      setShowCreate(false);
      setNewRole({ name: '', label: '', color: '#3B82F6', description: '' });
    }
    setSaving(false);
  };

  const deleteRole = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.is_system) { toast.error('Los roles del sistema no se pueden eliminar'); setDeleteTarget(null); return; }
    const count = usageCounts[deleteTarget.name] || 0;
    if (count > 0) {
      toast.error(`Este rol tiene ${count} usuario(s). Reasígnalos antes de eliminarlo.`);
      setDeleteTarget(null);
      return;
    }
    setDeletingId(deleteTarget.id);
    try {
      const { error } = await database.delete('custom_roles', deleteTarget.id);
      if (error) { toast.error(error); return; }
      toast.success('Rol eliminado');
      const remaining = roles.filter(r => r.id !== deleteTarget.id);
      setRoles(remaining);
      setSelectedRole(remaining[0] || null);
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  const saveRole = async () => {
    if (!selectedRole) return;
    setSaving(true);
    const { error } = await database.update('custom_roles', selectedRole.id, {
      label: selectedRole.label,
      color: selectedRole.color,
      description: selectedRole.description || '',
      updated_at: new Date().toISOString(),
    });
    if (error) {
      toast.error('Error al guardar: ' + error);
    } else {
      toast.success('Rol actualizado correctamente');
      setRoles(prev => prev.map(r => r.id === selectedRole.id ? { ...r, ...selectedRole } : r));
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center justify-between"><div className="space-y-1.5"><Skeleton className="h-8 w-44" /><Skeleton className="h-4 w-48" /></div><Skeleton className="h-10 w-28 rounded-xl" /></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-2">{Array.from({length:5}).map((_,i)=>(<div key={i} className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-3"><Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" /><div className="flex-1 space-y-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-32" /></div></div>))}</div>
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-3"><Skeleton className="w-12 h-12 rounded-xl" /><div className="space-y-1.5"><Skeleton className="h-5 w-32" /><Skeleton className="h-3 w-20" /></div></div>
            {Array.from({length:3}).map((_,i)=>(<div key={i} className="space-y-1.5"><Skeleton className="h-3 w-32" /><Skeleton className="h-11 w-full rounded-xl" /></div>))}
            <div className="space-y-2"><Skeleton className="h-3 w-20" /><div className="flex flex-wrap gap-2">{Array.from({length:12}).map((_,j)=>(<Skeleton key={j} className="w-7 h-7 rounded-lg" />))}</div></div>
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de Roles</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Crea y personaliza los roles del sistema.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Nuevo rol
        </button>
      </div>

      {/* Callout: permissions matrix lives in AdminPage */}
      <div className="flex items-center justify-between gap-4 p-4 bg-primary/8 border border-primary/20 rounded-xl">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Permisos por rol</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Asigna qué puede hacer cada rol desde la Matriz de Permisos en Gestión Admin.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/dashboard/admin?module=permisos')}
          className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline whitespace-nowrap flex-shrink-0">
          Ir a permisos <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-foreground">Crear nuevo rol</h3>
              <button onClick={() => setShowCreate(false)}
                className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Nombre interno <span className="text-muted-foreground font-normal">(slug)</span> *</label>
                <input value={newRole.name} onChange={e => setNewRole(p => ({ ...p, name: e.target.value }))}
                  placeholder="ej: moderador"
                  className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary font-mono" />
                <p className="text-xs text-muted-foreground mt-1">Solo letras minúsculas, números y guiones bajos. Se usará como identificador.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Etiqueta visible *</label>
                <input value={newRole.label} onChange={e => setNewRole(p => ({ ...p, label: e.target.value }))}
                  placeholder="ej: Moderador"
                  className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Descripción <span className="text-muted-foreground font-normal">(opcional)</span></label>
                <textarea value={newRole.description} onChange={e => setNewRole(p => ({ ...p, description: e.target.value }))}
                  placeholder="Descripción del rol..." rows={2}
                  className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-2">Color del rol</label>
                <ColorPicker value={newRole.color} onChange={c => setNewRole(p => ({ ...p, color: c }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)}
                  className="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                  Cancelar
                </button>
                <button onClick={createRole} disabled={saving}
                  className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  Crear rol
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={deleteRole}
        title="Eliminar rol"
        description={<>Se eliminará permanentemente <strong>{deleteTarget?.label}</strong>. Esta acción no se puede deshacer.</>}
        loading={!!deletingId}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: role list */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1 mb-1">
            {roles.length} rol{roles.length !== 1 ? 'es' : ''}
          </p>
          {roles.map(role => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role)}
              className={cn(
                'w-full text-left p-3.5 rounded-xl border transition-all',
                selectedRole?.id === role.id
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-muted-foreground/30 bg-card',
              )}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: role.color + '22', color: role.color }}>
                  <Shield style={{ width: 18, height: 18 }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground truncate">{role.label}</span>
                    {role.is_system && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wide flex-shrink-0">
                        sistema
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px] font-mono text-muted-foreground truncate">{role.name}</span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 flex-shrink-0">
                      <Users style={{ width: 10, height: 10 }} /> {usageCounts[role.name] || 0}
                    </span>
                  </div>
                </div>
                {!role.is_system && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setDeleteTarget(role); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0">
                    <Trash2 style={{ width: 13, height: 13 }} />
                  </button>
                )}
              </div>
            </button>
          ))}

          {roles.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No hay roles. Crea el primero.
            </div>
          )}
        </div>

        {/* Right: editor */}
        {selectedRole ? (
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 sm:p-6 space-y-5">
            {/* Role header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: selectedRole.color + '22', color: selectedRole.color }}>
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-foreground">{selectedRole.label}</h3>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                      style={{ backgroundColor: selectedRole.color }}>
                      {selectedRole.label}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">{selectedRole.name}</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-xl">
                <Users className="w-3.5 h-3.5" />
                {usageCounts[selectedRole.name] || 0} usuario(s)
              </div>
            </div>

            <div className="space-y-4">
              {selectedRole.is_system && (
                <div className="flex items-center gap-2.5 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Rol del sistema — solo se puede cambiar la etiqueta y el color. El nombre interno no se puede modificar.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Etiqueta visible</label>
                  <input
                    value={selectedRole.label}
                    onChange={e => setSelectedRole(p => p ? { ...p, label: e.target.value } : p)}
                    className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Nombre interno
                    {selectedRole.is_system && <span className="ml-1 text-muted-foreground font-normal">(fijo)</span>}
                  </label>
                  <input
                    value={selectedRole.name}
                    disabled={true}
                    className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-muted-foreground font-mono cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Descripción</label>
                <input
                  value={selectedRole.description || ''}
                  onChange={e => setSelectedRole(p => p ? { ...p, description: e.target.value } : p)}
                  placeholder="Descripción del rol..."
                  className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-2">Color del rol</label>
                <ColorPicker
                  value={selectedRole.color}
                  onChange={c => setSelectedRole(p => p ? { ...p, color: c } : p)} />
              </div>
              <div className="mt-2 pt-4 border-t border-border flex justify-end">
                <button
                  onClick={saveRole}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center h-48 border-2 border-dashed border-border rounded-xl text-muted-foreground">
            <div className="text-center">
              <Shield className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Selecciona un rol para editarlo</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
