import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '@/lib/backend';

import { toast } from 'sonner';
import type { MlmCommissionConfig } from '@/lib/storeTypes';
import { Save, Loader as Loader2, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const RANKS = ['bronze','silver','gold','platinum','diamond','crown'] as const;
const RANK_LABELS: Record<string, string> = { bronze:'Bronce', silver:'Plata', gold:'Oro', platinum:'Platino', diamond:'Diamante', crown:'Corona' };
const RANK_COLORS: Record<string, string> = { bronze:'#b45309', silver:'#64748b', gold:'#ca8a04', platinum:'#94a3b8', diamond:'#22d3ee', crown:'#f59e0b' };
const MAX_LEVELS: Record<string, number> = { bronze:3, silver:4, gold:5, platinum:6, diamond:8, crown:10 };

type Matrix = Record<string, Record<number, { type: string; value: string }>>;

export default function MlmCommissionsAdminPage() {
  const [matrix, setMatrix] = useState<Matrix>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [freeShipThreshold, setFreeShipThreshold] = useState('150');
  const [igvRate, setIgvRate] = useState('0.18');

  const database = useDatabase();

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data }, { data: cfg }] = await Promise.all([
      database.select<MlmCommissionConfig>('mlm_commissions_config', { filter: { status: 'active' }, order: [{ column: 'rank' }, { column: 'level' }] }),
      database.select<{ key: string; value: string }>('system_config', { select: 'key,value', filter: [{ column: 'key', operator: 'in', value: ['free_shipping_threshold','igv_rate'] }] }),
    ]);
    const m: Matrix = {};
    RANKS.forEach(r => { m[r] = {}; for (let l = 1; l <= MAX_LEVELS[r]; l++) m[r][l] = { type: 'percentage', value: '' }; });
    ((data as MlmCommissionConfig[]) || []).forEach((row: MlmCommissionConfig) => {
      if (!m[row.rank]) m[row.rank] = {};
      m[row.rank][row.level] = { type: row.type, value: String(row.value) };
    });
    setMatrix(m);
    if (cfg) {
      (cfg as any[]).forEach((r: any) => {
        if (r.key === 'free_shipping_threshold') setFreeShipThreshold(r.value);
        if (r.key === 'igv_rate') setIgvRate(r.value);
      });
    }
    setLoading(false);
  }, [database]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    // Rebuild all rows
    const rows: Array<{ rank: string; level: number; type: string; value: number; status: string }> = [];
    RANKS.forEach(r => {
      for (let l = 1; l <= MAX_LEVELS[r]; l++) {
        const cell = matrix[r]?.[l];
        if (cell?.value && parseFloat(cell.value) > 0) {
          rows.push({ rank: r, level: l, type: cell.type, value: parseFloat(cell.value), status: 'active' });
        }
      }
    });

    // Upsert all
    for (const row of rows) {
      await database.upsert('mlm_commissions_config', { ...row }, 'rank,level');
    }

    // Save config
    await database.upsert('system_config', [
      { key: 'free_shipping_threshold', value: freeShipThreshold, category: 'store', description: 'Monto para envío gratis' },
      { key: 'igv_rate', value: igvRate, category: 'store', description: 'Tasa IGV' },
    ], 'key');

    toast.success('Comisiones y configuración guardadas');
    setSaving(false);
  };

  const setCell = (rank: string, level: number, field: 'type' | 'value', val: string) => {
    setMatrix(m => ({
      ...m,
      [rank]: { ...m[rank], [level]: { ...m[rank]?.[level], [field]: val } }
    }));
  };

  if (loading) return (
    <div className="space-y-5">
      <div className="space-y-1.5"><Skeleton className="h-8 w-44" /><Skeleton className="h-4 w-56" /></div>
      {['bronze','silver','gold','platinum','diamond','crown'].map(r => (
        <div key={r} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border"><Skeleton className="h-4 w-32" /></div>
          <div className="p-4"><div className="flex flex-wrap gap-3">{Array.from({length:5}).map((_,i)=>(<div key={i} className="space-y-1.5"><Skeleton className="h-3 w-12" /><div className="flex gap-1"><Skeleton className="w-14 h-9 rounded-lg" /><Skeleton className="w-16 h-9 rounded-lg" /></div></div>))}</div></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comisiones MLM</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Define la tasa de comisión por rango y nivel del árbol</p>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar todo
        </button>
      </div>

      <div className="bg-primary/8 border border-primary/20 rounded-xl p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-xs text-primary">
          Las comisiones se calculan al nivel del rango del <strong>patrocinador</strong> en la posición del árbol. Nivel 1 = comprador directo, Nivel 2 = patrocinador del patrocinador, etc.
        </p>
      </div>

      {/* Matrix */}
      <div className="space-y-4">
        {RANKS.map(rank => {
          const maxLvl = MAX_LEVELS[rank];
          const color = RANK_COLORS[rank];
          return (
            <div key={rank} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 flex items-center gap-2 border-b border-border" style={{ background: color + '10' }}>
                <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                <h3 className="text-sm font-bold" style={{ color }}>{RANK_LABELS[rank]}</h3>
                <span className="text-xs text-muted-foreground ml-1">(hasta nivel {maxLvl})</span>
              </div>
              <div className="p-4 overflow-x-auto">
                <div className="flex flex-wrap gap-3">
                  {Array.from({ length: maxLvl }).map((_, i) => {
                    const lvl = i + 1;
                    const cell = matrix[rank]?.[lvl] || { type: 'percentage', value: '' };
                    return (
                      <div key={lvl} className="flex flex-col gap-1.5 min-w-[100px]">
                        <label className="text-xs font-bold text-foreground">Nivel {lvl}</label>
                        <div className="flex gap-1">
                          <select value={cell.type} onChange={e => setCell(rank, lvl, 'type', e.target.value)}
                            className="px-2 py-2 bg-muted border border-border rounded-lg text-[11px] text-foreground outline-none focus:border-primary flex-shrink-0">
                            <option value="percentage">%</option>
                            <option value="fixed">S/</option>
                          </select>
                          <input type="number" value={cell.value} onChange={e => setCell(rank, lvl, 'value', e.target.value)}
                            placeholder="0" step="0.01" min="0"
                            className="w-16 px-2 py-2 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary text-right" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Store config */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Configuración de tienda</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">Umbral envío gratis (S/)</label>
            <input type="number" value={freeShipThreshold} onChange={e => setFreeShipThreshold(e.target.value)}
              placeholder="150" step="1" min="0"
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
            <p className="text-xs text-muted-foreground mt-1">Pedidos desde este monto = envío gratis</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">Tasa IGV (ej: 0.18 = 18%)</label>
            <input type="number" value={igvRate} onChange={e => setIgvRate(e.target.value)}
              placeholder="0.18" step="0.01" min="0" max="1"
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary" />
            <p className="text-xs text-muted-foreground mt-1">Aplica a todas las facturas y boletas</p>
          </div>
        </div>
      </div>
    </div>
  );
}
