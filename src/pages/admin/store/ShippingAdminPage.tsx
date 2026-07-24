import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '@/lib/backend';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ShippingZone, ShippingMethod } from '@/lib/storeTypes';
import { Plus, Save, Loader as Loader2, Truck, Globe, X, Pencil, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';

export default function ShippingAdminPage() {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editZone, setEditZone] = useState<Partial<ShippingZone> | null>(null);
  const [editMethod, setEditMethod] = useState<Partial<ShippingMethod & { zone_id: string }> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; kind: 'zone' | 'method' } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const database = useDatabase();

  const load = useCallback(async () => {
    setLoading(true);
    const { data: zs } = await database.select<ShippingZone>('shipping_zones', { select: '*, methods:shipping_methods(*)', order: { column: 'name' } });
    setZones((zs as ShippingZone[]) || []);
    setLoading(false);
  }, [database]);

  useEffect(() => { load(); }, [load]);

  const saveZone = async () => {
    if (!editZone?.name) { toast.error('Ingresa un nombre'); return; }
    setSaving(true);
    const payload = { name: editZone.name, status: editZone.status || 'active', countries: editZone.countries || [], regions: editZone.regions || [] };
    if (editZone.id) {
      await database.update('shipping_zones', editZone.id, payload);
    } else {
      await database.insert('shipping_zones', payload);
    }
    toast.success('Zona guardada');
    setEditZone(null);
    setSaving(false);
    load();
  };

  const saveMethod = async () => {
    if (!editMethod?.name || !editMethod?.zone_id) { toast.error('Completa nombre y zona'); return; }
    setSaving(true);
    const payload = {
      zone_id: editMethod.zone_id, name: editMethod.name,
      description: editMethod.description || null,
      type: editMethod.type || 'flat', price: parseFloat(String(editMethod.price || 0)),
      free_threshold: editMethod.free_threshold ? parseFloat(String(editMethod.free_threshold)) : null,
      estimated_days_min: editMethod.estimated_days_min || null,
      estimated_days_max: editMethod.estimated_days_max || null,
      status: editMethod.status || 'active',
    };
    if (editMethod.id) await database.update('shipping_methods', editMethod.id, payload);
    else await database.insert('shipping_methods', payload);
    toast.success('Método de envío guardado');
    setEditMethod(null);
    setSaving(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      if (deleteTarget.kind === 'zone') {
        await database.delete('shipping_zones', deleteTarget.id);
        toast.success('Zona eliminada');
      } else {
        await database.delete('shipping_methods', deleteTarget.id);
        toast.success('Método eliminado');
      }
      load();
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  if (loading) return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div className="space-y-1.5"><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-48" /></div><Skeleton className="h-10 w-32 rounded-xl" /></div>
      <div className="columns-1 lg:columns-2 gap-5 space-y-5">
        {Array.from({length:2}).map((_,i) => (
          <div key={i} className="break-inside-avoid bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border"><Skeleton className="h-4 w-40" /><div className="flex gap-2"><Skeleton className="h-4 w-12" /><Skeleton className="h-4 w-16" /></div></div>
            <div className="p-5 space-y-2">{Array.from({length:2}).map((_,j)=>(<Skeleton key={j} className="h-14 w-full rounded-xl" />))}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Zonas y Métodos de Envío</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configura las tarifas de envío por zona geográfica</p>
        </div>
        <button onClick={() => setEditZone({ status: 'active', countries: [], regions: [] })}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors self-start">
          <Plus className="w-4 h-4" /> Nueva zona
        </button>
      </div>

      {zones.length > 0 && (
        <div className="columns-1 lg:columns-2 gap-5 [column-fill:_balance]">
          {zones.map(zone => (
            <div key={zone.id} className="break-inside-avoid mb-5 bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2 min-w-0">
                  <Globe className="w-4 h-4 text-primary flex-shrink-0" />
                  <h3 className="text-sm font-bold text-foreground truncate">{zone.name}</h3>
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full shrink-0',
                    zone.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground')}>
                    {zone.status === 'active' ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditZone(zone)} className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors" aria-label="Editar zona"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteTarget({ id: zone.id, name: zone.name, kind: 'zone' })} className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors" aria-label="Eliminar zona"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Métodos de envío</p>
                  <button onClick={() => setEditMethod({ zone_id: zone.id, type: 'flat', status: 'active' })}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Agregar método
                  </button>
                </div>
                {(zone.methods || []).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin métodos de envío</p>}
                <div className="space-y-2">
                  {(zone.methods || []).map((m: ShippingMethod) => (
                    <div key={m.id} className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                      <Truck className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.type === 'free_threshold' ? `Gratis a partir de S/ ${m.free_threshold}` : m.type === 'flat' ? `S/ ${m.price} fijo` : 'Por peso'}
                          {m.estimated_days_min && ` · ${m.estimated_days_min}–${m.estimated_days_max} días`}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => setEditMethod({ ...m, zone_id: zone.id })} className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors" aria-label="Editar método"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteTarget({ id: m.id, name: m.name, kind: 'method' })} className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors" aria-label="Eliminar método"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {zones.length === 0 && (
        <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
          <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No hay zonas de envío configuradas</p>
        </div>
      )}

      {/* Zone modal */}
      {editZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">{editZone.id ? 'Editar zona' : 'Nueva zona'}</h3>
              <button onClick={() => setEditZone(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">Nombre *</label>
              <input value={editZone.name || ''} onChange={e => setEditZone(p => ({ ...p, name: e.target.value }))}
                placeholder="Lima Metropolitana" className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">Estado</label>
              <select value={editZone.status || 'active'} onChange={e => setEditZone(p => ({ ...p, status: e.target.value as any }))}
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary">
                <option value="active">Activa</option><option value="inactive">Inactiva</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditZone(null)} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-semibold hover:bg-muted">Cancelar</button>
              <button onClick={saveZone} disabled={saving} className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Method modal */}
      {editMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">{editMethod.id ? 'Editar método' : 'Nuevo método'}</h3>
              <button onClick={() => setEditMethod(null)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">Nombre *</label>
              <input value={editMethod.name || ''} onChange={e => setEditMethod(p => ({ ...p, name: e.target.value }))}
                placeholder="Delivery Express" className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">Descripción</label>
              <input value={editMethod.description || ''} onChange={e => setEditMethod(p => ({ ...p, description: e.target.value }))}
                placeholder="Entrega en 1-2 días" className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Tipo</label>
                <select value={editMethod.type || 'flat'} onChange={e => setEditMethod(p => ({ ...p, type: e.target.value as any }))}
                  className="w-full px-3 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary">
                  <option value="flat">Tarifa fija</option>
                  <option value="free_threshold">Gratis sobre monto</option>
                  <option value="weight">Por peso</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Precio (S/)</label>
                <input type="number" value={editMethod.price || ''} onChange={e => setEditMethod(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                  placeholder="15.00" step="0.01" min="0"
                  className="w-full px-3 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
              </div>
              {editMethod.type === 'free_threshold' && (
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-foreground mb-1.5">Monto para envío gratis (S/)</label>
                  <input type="number" value={editMethod.free_threshold || ''} onChange={e => setEditMethod(p => ({ ...p, free_threshold: parseFloat(e.target.value) || 0 }))}
                    placeholder="150" step="1" className="w-full px-3 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Días min.</label>
                <input type="number" value={editMethod.estimated_days_min || ''} onChange={e => setEditMethod(p => ({ ...p, estimated_days_min: parseInt(e.target.value) || undefined }))}
                  placeholder="1" min="0" className="w-full px-3 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Días máx.</label>
                <input type="number" value={editMethod.estimated_days_max || ''} onChange={e => setEditMethod(p => ({ ...p, estimated_days_max: parseInt(e.target.value) || undefined }))}
                  placeholder="3" min="0" className="w-full px-3 py-3 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditMethod(null)} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-semibold hover:bg-muted">Cancelar</button>
              <button onClick={saveMethod} disabled={saving} className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleDelete}
        title={deleteTarget?.kind === 'zone' ? 'Eliminar zona' : 'Eliminar método'}
        description={<>Se eliminará permanentemente <strong>{deleteTarget?.name}</strong>. Esta acción no se puede deshacer.</>}
        loading={!!deletingId}
      />
    </div>
  );
}