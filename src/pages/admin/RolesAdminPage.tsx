import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from '@/lib/router';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Save, Shield, Users, X, Lock, ArrowRight, RefreshCw } from 'lucide-react';

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
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', label: '', color: '#3B82F6', description: '' });
  const [saving, setSaving] = useState(false);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<CustomRole | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: r }, { data: usage }] = await Promise.all([
      supabase.from('custom_roles').select('*').order('sort_order'),
      supabase.from('profiles').select('role'),
    ]);
    setRoles(r || []);
    const counts: Record<string, number> = {};
    for (const u of (usage || [])) {
      counts[u.role] = (counts[u.role] || 0) + 1;
    }
    setUsageCounts(counts);
    if (r && r.length > 0 && !selectedRole) setSelectedRole(r[0]);
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
    const { data, error } = await supabase.from('custom_roles').insert({
      name: slug,
      label: newRole.label,
      color: newRole.color,
      description: newRole.description,
      is_system: false,
      sort_order: (roles.length + 1) * 10,
    }).select().single();
    if (error) {
      toast.error(error.message.includes('unique') ? 'Ya existe un rol con ese nombre' : error.message);
    } else {
      toast.success('Rol creado correctamente');
      const updated = [...roles, data as CustomRole];
      setRoles(updated);
      setSelectedRole(data as CustomRole);
      setShowCreate(false);
      setNewRole({ name: '', label: '', color: '#3B82F6', description: '' });
    }
    setSaving(false);
  };

  const deleteRole = async (role: CustomRole) => {
    if (role.is_system) { toast.error('Los roles del sistema no se pueden eliminar'); setDeleteConfirm(null); return; }
    const count = usageCounts[role.name] || 0;
    if (count > 0) {
      toast.error(`Este rol tiene ${count} usuario(s). Reasígnalos antes de eliminarlo.`);
      setDeleteConfirm(null);
      return;
    }
    const { error } = await supabase.from('custom_roles').delete().eq('id', role.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Rol eliminado');
    const remaining = roles.filter(r => r.id !== role.id);
    setRoles(remaining);
    setSelectedRole(remaining[0] || null);
    setDeleteConfirm(null);
  };

  const saveRole = async () => {
    if (!selectedRole) return;
    setSaving(true);
    const { error } = await supabase.from('custom_roles').update({
      label: selectedRole.label,
      color: selectedRole.color,
      description: selectedRole.description || '',
      updated_at: new Date().toISOString(),
    }).eq('id', selectedRole.id);
    if (error) {
      toast.error('Error al guardar: ' + error.message);
    } else {
      toast.success('Rol actualizado correctamente');
      setRoles(prev => prev.map(r => r.id === selectedRole.id ? { ...r, ...selectedRole } : r));
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
      <div className="flex items-center justify-between gap-4 p-4 bg-blue-500/8 border border-blue-500/20 rounded-xl">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Permisos por rol</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Asigna qué puede hacer cada rol desde la Matriz de Permisos en Gestión Admin.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/dashboard/admin?module=permisos')}
          className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline whitespace-nowrap flex-shrink-0">
          Ir a permisos <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl p-6">
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

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="text-lg font-bold text-foreground text-center mb-2">Eliminar rol</h3>
            <p className="text-sm text-muted-foreground text-center mb-5">
              ¿Eliminar <strong>"{deleteConfirm.label}"</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button onClick={() => deleteRole(deleteConfirm)}
                className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-700 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Two-column layout */}
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
                'w-full text-left p-3.5 rounded-xl border-2 transition-all',
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
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wide flex-shrink-0">
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
                    onClick={e => { e.stopPropagation(); setDeleteConfirm(role); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0">
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
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-5">
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
              <button
                onClick={saveRole}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar cambios
              </button>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center h-48 border-2 border-dashed border-border rounded-2xl text-muted-foreground">
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
