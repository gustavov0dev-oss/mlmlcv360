import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Search, Plus, Trash2, RefreshCw, Download, ChevronLeft, ChevronRight, CircleCheck as CheckCircle, X, DollarSign, Clock, TrendingUp, Filter, Eye, Save, Loader as Loader2, Pencil, Info } from 'lucide-react';
import { useCommissions, useCommissionsAdminPagination, TYPE_LABELS, TYPE_COLORS, STATUS_COLORS } from '@/modules/mlm';
import type { Commission } from '@/modules/mlm';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';

type CommType = Commission['type'];
type CommStatus = Commission['status'];
interface UserOption { id: string; full_name: string; email: string; }

const TYPES: { value: CommType; label: string; hint: string }[] = [
  { value: 'direct',     label: 'Directa',      hint: 'Comisión por venta directa de un afiliado propio' },
  { value: 'binary',     label: 'Binaria',       hint: 'Comisión por volumen del equipo binario (izq/der)' },
  { value: 'rank_bonus', label: 'Bono de Rango', hint: 'Bono por alcanzar un rango superior' },
  { value: 'unilevel',   label: 'Unilevel',      hint: 'Comisión por niveles de la red unilevel' },
  { value: 'residual',   label: 'Residual',      hint: 'Ingreso residual mensual por suscripciones activas' },
];

const STATUSES: { value: CommStatus; label: string }[] = [
  { value: 'pending',  label: 'Pendiente' },
  { value: 'approved', label: 'Aprobada' },
  { value: 'paid',     label: 'Pagada' },
  { value: 'rejected', label: 'Rechazada' },
];

const PAGE_SIZE = 15;
const EMPTY_FORM = { user_id: '', from_user_id: '', type: 'direct' as CommType, amount: '', currency: 'PEN', status: 'pending' as CommStatus, description: '' };

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap', className)}>{children}</span>;
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-foreground mb-1.5">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── Commission Modal (create/edit) ──
function CommissionModal({
  mode, initial, users, onClose, onSaved, onCreate, onCreateMany, onUpdate,
}: {
  mode: 'create' | 'edit';
  initial: typeof EMPTY_FORM & { id?: string };
  users: UserOption[];
  onClose: () => void;
  onSaved: () => void;
  onCreate: (commission: Omit<Commission, 'id' | 'created_at'>) => Promise<{ success: boolean; error?: string }>;
  onCreateMany: (commissions: Omit<Commission, 'id' | 'created_at'>[]) => Promise<{ success: boolean; error?: string }>;
  onUpdate: (id: string, updates: Partial<Commission>) => Promise<{ success: boolean; error?: string }>;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [userQ, setUserQ] = useState('');
  const [fromQ, setFromQ] = useState('');
  const [multiUserIds, setMultiUserIds] = useState<Set<string>>(new Set());
  const isCreate = mode === 'create';

  const toggleMultiUser = (id: string) => setMultiUserIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  useEffect(() => { setForm(initial); setUserQ(''); setFromQ(''); }, [initial]);

  const filteredUsers = useMemo(() =>
    userQ ? users.filter(u => `${u.full_name} ${u.email}`.toLowerCase().includes(userQ.toLowerCase())) : users,
    [users, userQ]
  );
  const filteredFrom = useMemo(() =>
    fromQ ? users.filter(u => `${u.full_name} ${u.email}`.toLowerCase().includes(fromQ.toLowerCase())) : users,
    [users, fromQ]
  );

  const set = (k: keyof typeof EMPTY_FORM) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  const selectedUser = users.find(u => u.id === form.user_id);
  const selectedFrom = users.find(u => u.id === form.from_user_id);

  const handleSave = async () => {
    if (isCreate) {
      const targets = multiUserIds.size > 0 ? Array.from(multiUserIds) : (form.user_id ? [form.user_id] : []);
      if (targets.length === 0) { toast.error('Selecciona al menos un beneficiario'); return; }
      if (!form.amount || Number(form.amount) <= 0) { toast.error('Ingresa un monto mayor a 0'); return; }
      setSaving(true);
      const rows = targets.map(uid => ({
        user_id: uid,
        from_user_id: form.from_user_id || null,
        type: form.type,
        amount: Number(form.amount),
        currency: form.currency,
        status: form.status,
        description: form.description || null,
      }));
      const result = targets.length > 1 ? await onCreateMany(rows) : await onCreate(rows[0]);
      if (result.success) {
        toast.success(`${rows.length} comisión(es) creada(s)`);
        onSaved(); onClose();
      } else {
        toast.error(result.error || 'Error');
      }
      setSaving(false);
    } else {
      if (!form.user_id) { toast.error('Selecciona el usuario beneficiario'); return; }
      if (!form.amount || Number(form.amount) <= 0) { toast.error('Ingresa un monto mayor a 0'); return; }
      setSaving(true);
      const result = await onUpdate(initial.id!, {
        user_id: form.user_id,
        from_user_id: form.from_user_id || null,
        type: form.type,
        amount: Number(form.amount),
        currency: form.currency,
        status: form.status,
        description: form.description || null,
      });
      if (result.success) {
        toast.success('Comisión actualizada');
        onSaved(); onClose();
      } else {
        toast.error(result.error || 'Error');
      }
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            {mode === 'create' ? <Plus className="w-4 h-4 text-primary" /> : <Pencil className="w-4 h-4 text-primary" />}
            <h3 className="text-base font-bold text-foreground">
              {mode === 'create' ? 'Nueva comisión' : 'Editar comisión'}
            </h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">1. Usuario(s) beneficiario(s)</h4>
              {isCreate && <span className="text-xs text-primary font-medium">{multiUserIds.size > 0 ? `${multiUserIds.size} seleccionado(s)` : 'Selecciona uno o varios'}</span>}
            </div>

            {isCreate ? (
              <div>
                <input
                  placeholder="Buscar por nombre o email..."
                  value={userQ}
                  onChange={e => setUserQ(e.target.value)}
                  className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground mb-2"
                />
                {multiUserIds.size > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {Array.from(multiUserIds).map(uid => {
                      const u = users.find(x => x.id === uid);
                      return u ? (
                        <span key={uid} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-medium">
                          {u.full_name}
                          <button onClick={() => toggleMultiUser(uid)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
                <div className="bg-muted border border-border rounded-lg max-h-40 overflow-y-auto divide-y divide-border">
                  {filteredUsers.slice(0, 40).length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</p>
                  ) : filteredUsers.slice(0, 40).map(u => (
                    <button
                      key={u.id}
                      onClick={() => toggleMultiUser(u.id)}
                      className={cn('w-full text-left px-3 py-2 hover:bg-primary/5 transition-colors flex items-center gap-2',
                        multiUserIds.has(u.id) && 'bg-primary/5')}
                    >
                      {multiUserIds.has(u.id)
                        ? <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        : <div className="w-3.5 h-3.5 rounded-full border border-border flex-shrink-0" />}
                      <span className="text-sm text-foreground">{u.full_name}</span>
                      <span className="text-xs text-muted-foreground ml-1">{u.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {selectedUser && (
                  <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm text-foreground font-medium">{selectedUser.full_name}</span>
                    <span className="text-xs text-muted-foreground">({selectedUser.email})</span>
                    <button onClick={() => setForm(p => ({ ...p, user_id: '' }))} className="ml-auto text-muted-foreground hover:text-destructive">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {!selectedUser && (
                  <Field label="Buscar y seleccionar beneficiario" required>
                    <input
                      placeholder="Escribe nombre o email..."
                      value={userQ}
                      onChange={e => setUserQ(e.target.value)}
                      className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground mb-2"
                    />
                    <div className="bg-muted border border-border rounded-lg max-h-36 overflow-y-auto divide-y divide-border">
                      {filteredUsers.slice(0, 30).length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</p>
                      ) : filteredUsers.slice(0, 30).map(u => (
                        <button
                          key={u.id}
                          onClick={() => { setForm(p => ({ ...p, user_id: u.id })); setUserQ(''); }}
                          className="w-full text-left px-3 py-2 hover:bg-primary/5 transition-colors"
                        >
                          <span className="text-sm text-foreground">{u.full_name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{u.email}</span>
                        </button>
                      ))}
                    </div>
                  </Field>
                )}
              </>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">2. Tipo de comisión</h4>
            <div className="grid grid-cols-1 gap-2">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setForm(p => ({ ...p, type: t.value }))}
                  className={cn(
                    'w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all',
                    form.type === t.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/40'
                  )}
                >
                  <div className={cn('w-3 h-3 rounded-full border-2 mt-0.5 flex-shrink-0 transition-colors',
                    form.type === t.value ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                  )} />
                  <div>
                    <div className={cn('text-sm font-semibold', form.type === t.value ? 'text-primary' : 'text-foreground')}>
                      {t.label}
                    </div>
                    <div className="text-xs text-muted-foreground">{t.hint}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">3. Monto y estado</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field label="Monto" required>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                      {form.currency === 'PEN' ? 'S/' : '$'}
                    </span>
                    <input
                      type="number" min="0.01" step="0.01"
                      value={form.amount}
                      onChange={e => set('amount')(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
                    />
                  </div>
                </Field>
              </div>
              <Field label="Moneda">
                <select
                  value={form.currency}
                  onChange={e => set('currency')(e.target.value)}
                  className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors"
                >
                  <option value="PEN">PEN</option>
                  <option value="USD">USD</option>
                </select>
              </Field>
            </div>

            <Field label="Estado inicial">
              <div className="grid grid-cols-2 gap-2">
                {STATUSES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => set('status')(s.value)}
                    className={cn(
                      'py-2 px-3 rounded-lg border-2 text-xs font-semibold transition-all',
                      form.status === s.value ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground/50'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">4. Opcionales</h4>

            {selectedFrom ? (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Generada por</label>
                <div className="flex items-center gap-2 bg-muted border border-border rounded-lg px-3 py-2">
                  <span className="text-sm text-foreground">{selectedFrom.full_name}</span>
                  <button onClick={() => setForm(p => ({ ...p, from_user_id: '' }))} className="ml-auto text-muted-foreground hover:text-destructive">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <Field label="Generada por (quién originó la comisión)" hint="Opcional. Ej: el afiliado cuya venta generó esta comisión.">
                <input
                  placeholder="Buscar usuario origen..."
                  value={fromQ}
                  onChange={e => setFromQ(e.target.value)}
                  className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground mb-2"
                />
                {fromQ && (
                  <div className="bg-muted border border-border rounded-lg max-h-28 overflow-y-auto divide-y divide-border">
                    {filteredFrom.slice(0, 20).map(u => (
                      <button
                        key={u.id}
                        onClick={() => { setForm(p => ({ ...p, from_user_id: u.id })); setFromQ(''); }}
                        className="w-full text-left px-3 py-2 hover:bg-primary/5 transition-colors"
                      >
                        <span className="text-sm text-foreground">{u.full_name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </Field>
            )}

            <Field label="Descripción" hint="Ej: Comisión por venta de plan Pro en noviembre 2024">
              <textarea
                value={form.description}
                onChange={e => set('description')(e.target.value)}
                rows={2}
                placeholder="Describe el origen de esta comisión..."
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors resize-none placeholder:text-muted-foreground"
              />
            </Field>
          </div>

          {form.user_id && Number(form.amount) > 0 && (
            <div className="bg-muted/50 rounded-xl p-4 border border-border">
              <div className="flex items-start gap-2 mb-2">
                <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-xs font-semibold text-foreground">Resumen</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Beneficiario</span>
                  <span className="font-medium text-foreground">{selectedUser?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tipo</span>
                  <span className="font-medium text-foreground">{TYPES.find(t => t.value === form.type)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span>Monto</span>
                  <span className="font-bold text-foreground">{form.currency === 'PEN' ? 'S/' : '$'} {Number(form.amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estado</span>
                  <Badge className={STATUS_COLORS[form.status] || ''}>{STATUSES.find(s => s.value === form.status)?.label}</Badge>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.user_id || !form.amount}
            className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {mode === 'create' ? 'Crear comisión' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──
export default function AdminCommissionsPage() {
  const {
    commissions,
    users,
    loading,
    refresh,
    create,
    createMany,
    update,
    updateStatus,
    updateStatusMany,
    delete: deleteCommission,
    exportCSV,
  } = useCommissions({ isAdmin: true, autoLoad: true });

  const {
    page,
    setPage,
    search,
    setSearch,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    filtered,
    paginatedData,
    totalPages,
    stats,
  } = useCommissionsAdminPagination(commissions, users, PAGE_SIZE);

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; data: typeof EMPTY_FORM & { id?: string } } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Commission | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [viewRow, setViewRow] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<CommStatus>('approved');
  const [bulkWorking, setBulkWorking] = useState(false);

  const userOptions: UserOption[] = useMemo(() => users.map(u => ({ id: u.id, full_name: u.full_name || '', email: u.email || '' })), [users]);

  const updateStatusHandler = async (id: string, status: CommStatus) => {
    setUpdating(id);
    const result = await updateStatus(id, status);
    if (result.success) toast.success(`Marcada como ${STATUSES.find(s => s.value === status)?.label}`);
    setUpdating(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(prev => prev.size === paginatedData.length ? new Set() : new Set(paginatedData.map(c => c.id)));
  };

  const bulkApply = async () => {
    if (selectedIds.size === 0) { toast.error('Selecciona al menos una comisión'); return; }
    setBulkWorking(true);
    const result = await updateStatusMany(Array.from(selectedIds), bulkStatus);
    if (result.success) {
      toast.success(`${selectedIds.size} comisión(es) marcadas como ${STATUSES.find(s => s.value === bulkStatus)?.label}`);
      setSelectedIds(new Set());
    }
    setBulkWorking(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const result = await deleteCommission(deleteTarget.id);
      if (result.success) toast.success('Comisión eliminada');
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  const openEdit = (c: Commission) => {
    setModal({
      mode: 'edit',
      data: {
        id: c.id,
        user_id: c.user_id,
        from_user_id: c.from_user_id || '',
        type: c.type,
        amount: String(c.amount),
        currency: c.currency,
        status: c.status,
        description: c.description || '',
      },
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de Comisiones</h1>
          <p className="text-muted-foreground text-sm mt-1">Administra, aprueba y registra comisiones del sistema MLM.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <button
            onClick={() => setModal({ mode: 'create', data: { ...EMPTY_FORM } })}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nueva comisión
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total comisiones', value: String(stats.count), icon: TrendingUp, color: 'text-primary bg-primary/10' },
          { label: 'Monto pagado', value: `S/ ${stats.paid.toFixed(2)}`, icon: DollarSign, color: 'text-green-500 bg-emerald-500/10' },
          { label: 'Pendientes', value: `${stats.pending} · S/ ${(stats as any).pendingAmt?.toFixed(2) || '0.00'}`, icon: Clock, color: 'text-amber-500 bg-amber-500/10' },
          { label: 'Aprobadas', value: String(stats.approved), icon: CheckCircle, color: 'text-purple-500 bg-primary/10' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', s.color)}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{s.label}</p>
              <p className="text-base font-bold text-foreground leading-none">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl p-3.5">
          <span className="text-sm font-medium text-foreground">{selectedIds.size} seleccionado(s)</span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value as CommStatus)}
              className="px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary">
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button onClick={bulkApply} disabled={bulkWorking}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {bulkWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Aplicar a selección
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="p-1.5 border border-border rounded-lg hover:bg-muted text-muted-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por usuario, email o descripción..."
            className="w-full pl-9 pr-4 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
          />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreign outline-none focus:border-primary min-w-[130px]">
          <option value="">Todos los tipos</option>
          {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary min-w-[130px]">
          <option value="">Todos los estados</option>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button onClick={refresh} className="p-2.5 border border-border rounded-xl hover:bg-muted text-muted-foreground transition-colors" title="Actualizar">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="py-3 px-4 w-10">
                  <input type="checkbox"
                    checked={paginatedData.length > 0 && selectedIds.size === paginatedData.length}
                    onChange={toggleAll}
                    className="rounded border-border accent-primary cursor-pointer" />
                </th>
                {['Fecha', 'Beneficiario', 'Origen', 'Tipo', 'Estado', 'Monto', 'Acciones'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={8} className="py-3 px-4"><div className="h-8 bg-muted animate-pulse rounded-lg" /></td>
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Filter className="w-8 h-8 opacity-30" />
                      <p className="text-sm">No hay comisiones que coincidan con los filtros</p>
                    </div>
                  </td>
                </tr>
              ) : (filtered as Array<Commission & { _user_name: string; _user_email: string; _from_name: string }>).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(c => (
                <tr key={c.id} className="border-b border-border hover:bg-muted/25 transition-colors">
                  <td className="py-3 px-4 w-10">
                    <input type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                      className="rounded border-border accent-primary cursor-pointer" />
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(c.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm font-medium text-foreground leading-none">{c._user_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[150px]">{c._user_email}</div>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground max-w-[120px] truncate">{c._from_name}</td>
                  <td className="py-3 px-4">
                    <Badge className={TYPE_COLORS[c.type as CommType] || ''}>{TYPE_LABELS[c.type as CommType] || c.type}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={STATUS_COLORS[c.status as CommStatus] || ''}>{STATUSES.find(s => s.value === c.status)?.label}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-bold text-foreground">
                      {c.currency === 'PEN' ? 'S/' : '$'} {Number(c.amount).toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => setViewRow(c)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Ver">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {c.status === 'pending' && (
                        <button
                          onClick={() => updateStatusHandler(c.id, 'approved')}
                          disabled={updating === c.id}
                          className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                          title="Aprobar"
                        >
                          {updating === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      {c.status === 'approved' && (
                        <button
                          onClick={() => updateStatusHandler(c.id, 'paid')}
                          disabled={updating === c.id}
                          className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 transition-colors disabled:opacity-40"
                          title="Marcar pagada"
                        >
                          {updating === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      {c.status === 'pending' && (
                        <button
                          onClick={() => updateStatusHandler(c.id, 'rejected')}
                          disabled={updating === c.id}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                          title="Rechazar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Eliminar">
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
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-40 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={cn('w-8 h-8 rounded-lg text-xs font-medium transition-colors', p === page ? 'bg-primary text-white' : 'hover:bg-muted text-muted-foreground')}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-40 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View detail */}
      {viewRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-foreground">Detalle de comisión</h3>
              <button onClick={() => setViewRow(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                ['Beneficiario', viewRow._user_name],
                ['Email', viewRow._user_email],
                ['Generada por', viewRow._from_name],
                ['Tipo', (TYPE_LABELS as Record<string, string>)[viewRow.type] || viewRow.type],
                ['Estado', STATUSES.find(s => s.value === viewRow.status)?.label],
                ['Monto', `${viewRow.currency === 'PEN' ? 'S/' : '$'} ${Number(viewRow.amount).toFixed(2)}`],
                ['Fecha', new Date(viewRow.created_at).toLocaleString('es-PE')],
                ['Descripción', viewRow.description || '—'],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between items-start gap-4">
                  <span className="text-xs text-muted-foreground flex-shrink-0">{k as string}</span>
                  <span className="text-xs font-medium text-foreground text-right">{v as string}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setViewRow(null)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                Cerrar
              </button>
              <button onClick={() => { openEdit(viewRow); setViewRow(null); }} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                <Pencil className="w-4 h-4" /> Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Commission modal */}
      {modal && (
        <CommissionModal
          mode={modal.mode}
          initial={modal.data}
          users={userOptions}
          onClose={() => setModal(null)}
          onSaved={refresh}
          onCreate={create}
          onCreateMany={createMany}
          onUpdate={update}
        />
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleDelete}
        title="Eliminar comisión"
        description={<>Se eliminará permanentemente la comisión de <strong>{deleteTarget ? (userOptions.find(u => u.id === deleteTarget.user_id)?.full_name || 'usuario') : ''}</strong>. Esta acción no se puede deshacer.</>}
        loading={!!deletingId}
      />
    </div>
  );
}
