import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ShippingZone, ShippingMethod } from '@/lib/storeTypes';
import { Plus, Save, Loader as Loader2, Truck, Globe, X } from 'lucide-react';

export default function ShippingAdminPage() {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editZone, setEditZone] = useState<Partial<ShippingZone> | null>(null);
  const [editMethod, setEditMethod] = useState<Partial<ShippingMethod & { zone_id: string }> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: zs } = await supabase.from('shipping_zones').select('*, methods:shipping_methods(*)').order('name');
    setZones((zs as ShippingZone[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveZone = async () => {
    if (!editZone?.name) { toast.error('Ingresa un nombre'); return; }
    setSaving(true);
    const payload = { name: editZone.name, status: editZone.status || 'active', countries: editZone.countries || [], regions: editZone.regions || [] };
    if (editZone.id) {
      await supabase.from('shipping_zones').update(payload).eq('id', editZone.id);
    } else {
      await supabase.from('shipping_zones').insert(payload);
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
    if (editMethod.id) await supabase.from('shipping_methods').update(payload).eq('id', editMethod.id);
    else await supabase.from('shipping_methods').insert(payload);
    toast.success('Método de envío guardado');
    setEditMethod(null);
    setSaving(false);
    load();
  };

  const deleteMethod = async (id: string) => {
    await supabase.from('shipping_methods').delete().eq('id', id);
    toast.success('Método eliminado');
    load();
  };

  const deleteZone = async (id: string) => {
    await supabase.from('shipping_zones').delete().eq('id', id);
    toast.success('Zona eliminada');
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Zonas y Métodos de Envío</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configura las tarifas de envío por zona geográfica</p>
        </div>
        <button onClick={() => setEditZone({ status: 'active', countries: [], regions: [] })}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Nueva zona
        </button>
      </div>

      {zones.map(zone => (
        <div key={zone.id} className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-black text-foreground">{zone.name}</h3>
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
                zone.status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground')}>
                {zone.status === 'active' ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditZone(zone)} className="text-xs font-semibold text-primary hover:underline">Editar</button>
              <button onClick={() => deleteZone(zone.id)} className="text-xs font-semibold text-red-500 hover:underline">Eliminar</button>
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
                    <p className="text-sm font-semibold text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.type === 'free_threshold' ? `Gratis a partir de S/ ${m.free_threshold}` : m.type === 'flat' ? `S/ ${m.price} fijo` : 'Por peso'}
                      {m.estimated_days_min && ` · ${m.estimated_days_min}–${m.estimated_days_max} días`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditMethod({ ...m, zone_id: zone.id })} className="text-xs text-primary hover:underline">Editar</button>
                    <button onClick={() => deleteMethod(m.id)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {zones.length === 0 && (
        <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-2xl">
          <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No hay zonas de envío configuradas</p>
        </div>
      )}

      {/* Zone modal */}
      {editZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5 space-y-4">
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
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5 space-y-4">
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
    </div>
  );
}
