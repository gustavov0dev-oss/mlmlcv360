import { useEffect, useState } from 'react';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { MaintenanceView, MaintenanceCountdown } from '@/components/MaintenanceView';
import { useConfig } from '@/store/configStore';
import Logo from '@/components/Logo';

const keys = ['maintenance_title_size', 'maintenance_title', 'maintenance_message', 'maintenance_countdown_enabled', 'maintenance_countdown_date', 'maintenance_mode'];
export function MaintenanceEditor({ get, set, save, saving }: { get: (key: string) => string; set: (key: string, value: string) => void; save: (keys: string[]) => Promise<void>; saving: boolean }) {
  const { logoValue, company } = useConfig();
  const [meridiem, setMeridiem] = useState<'AM' | 'PM'>('AM');
  const [timeFormat, setTimeFormat] = useState<'12' | '24'>('24');
  const [preview, setPreview] = useState(false);
  const [now, setNow] = useState(Date.now());
  const rawDate = get('maintenance_countdown_date');
  const date = new Date(rawDate);
  const valid = Number.isFinite(date.getTime());
  const [hour, setHour] = useState(valid ? String(date.getHours()).padStart(2, '0') : '09');
  const [minute, setMinute] = useState(valid ? String(date.getMinutes()).padStart(2, '0') : '00');
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { const d = new Date(rawDate); if (Number.isFinite(d.getTime())) { setMeridiem(d.getHours() >= 12 ? 'PM' : 'AM'); setHour(String(d.getHours()).padStart(2, '0')); setMinute(String(d.getMinutes()).padStart(2, '0')); } }, [rawDate]);
  const enabled = get('maintenance_mode') === 'true';
  const timed = get('maintenance_countdown_enabled') === 'true';
  const remaining = Math.max(0, valid ? Math.floor((date.getTime() - now) / 1000) : 0);

  function updateDate(day: Date, h = hour, m = minute) {
    if (!/^\d{1,2}$/.test(h) || !/^\d{1,2}$/.test(m) || +h > 23 || +m > 59) return;
    const d = new Date(day); d.setHours(+h, +m, 0, 0); set('maintenance_countdown_date', d.toISOString());
  }
  return <section className="space-y-5">
    <header className="flex flex-wrap justify-between items-start gap-3"><div><h2 className="text-xl font-semibold">Página de mantenimiento</h2><p className="text-sm text-muted-foreground mt-1">Edita el aviso como un documento. Los cambios se publican al guardar.</p></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="w-5 h-5 accent-primary" checked={enabled} onChange={e => set('maintenance_mode', String(e.target.checked))} />Activar mantenimiento</label></header>
    <div className="flex gap-4 border-b border-border" role="tablist" aria-label="Vista del aviso">{['Editar aviso', 'Vista previa'].map((label, i) => <button key={label} role="tab" aria-selected={preview === !!i} className={`py-3 text-sm border-b-2 ${preview === !!i ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`} onClick={() => setPreview(!!i)}>{label}</button>)}</div>
    {preview ? <MaintenanceView config={{ ...company, logo_value: logoValue, ...Object.fromEntries(keys.map(key => [key, get(key)])) }} /> : <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-8 items-start">
      <div className="min-w-0 py-5">
        <div className="flex justify-center mb-6"><Logo value={logoValue} fallbackText={company.company_name || 'Empresa'} pixelSize={120} pixelHeight={48} /></div>
        <label className="flex justify-end items-center gap-2 text-sm mb-3">Tamaño del título<input aria-label="Tamaño del título en píxeles" type="number" min={24} max={72} value={get('maintenance_title_size') || '48'} onChange={e => set('maintenance_title_size', e.target.value)} className="w-20 border border-border rounded-lg bg-background px-2 py-2" />px</label>
        <input aria-label="Título del aviso" maxLength={120} className="w-full bg-transparent text-center font-bold py-3 mb-4 outline-none focus-visible:ring-1 focus-visible:ring-primary rounded" style={{ fontSize: '24px' }} value={get('maintenance_title')} placeholder="Volveremos pronto" onChange={e => set('maintenance_title', e.target.value)} />
        <RichTextEditor value={get('maintenance_message')} onChange={html => set('maintenance_message', html)} minHeight={180} />
        {timed && <div className="mt-8"><MaintenanceCountdown date={rawDate} compact /></div>}
      </div>
      <aside className="space-y-4 xl:border-l xl:border-border xl:pl-6">
        <label className="flex gap-3 items-center font-medium"><input type="checkbox" className="w-5 h-5 accent-primary" checked={timed} onChange={e => set('maintenance_countdown_enabled', String(e.target.checked))} />Cuenta regresiva</label>
        <p className="text-sm text-muted-foreground">Al finalizar, el sitio se abre automáticamente. Sin contador, puedes reabrirlo desactivando mantenimiento.</p>
        <button type="button" className="text-sm text-primary underline underline-offset-4" onClick={() => { set('maintenance_countdown_date', ''); set('maintenance_countdown_enabled', 'false'); setHour('09'); setMinute('00'); }}>Limpiar cuenta regresiva</button>
        {timed && <><div className="flex flex-wrap gap-2">{[[30, '30 min'], [60, '1 hora'], [120, '2 horas'], [1440, '24 horas']].map(([mins, text]) => <button key={mins} className="border border-border rounded-lg px-3 py-2 text-sm hover:border-primary" onClick={() => set('maintenance_countdown_date', new Date(Date.now() + Number(mins) * 60000).toISOString())}>En {text}</button>)}</div>
        <Calendar mode="single" locale={es} selected={valid ? date : undefined} defaultMonth={valid && date > new Date() ? date : new Date()} disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }} onSelect={day => { if (day) updateDate(day); }} className="p-0" />
        <div className="space-y-3"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">Hora local</span><div className="flex gap-1" aria-label="Formato de hora">{(['12', '24'] as const).map(format => <button type="button" key={format} aria-pressed={timeFormat === format} className={`rounded-lg border px-2 py-1 text-sm ${timeFormat === format ? 'border-primary text-primary' : 'border-border'}`} onClick={() => { if (hour !== '') setMeridiem(+hour >= 12 ? 'PM' : 'AM'); setTimeFormat(format); }}>{format} h</button>)}</div></div>
          <div className="flex items-center gap-2">
            <input aria-label="Hora" inputMode="numeric" maxLength={2} className="w-16 rounded-lg bg-background border border-border p-3 text-center tabular-nums" value={hour === '' ? '' : timeFormat === '12' ? String(+hour % 12 || 12) : hour} onFocus={e => e.target.select()} onChange={e => { const h = e.target.value; if (!/^\d{0,2}$/.test(h)) return; if (h === '') { setHour(''); return; } if (timeFormat === '12') { if (+h < 1 || +h > 12) return; setHour(String(+h % 12 + (meridiem === 'PM' ? 12 : 0))); } else setHour(h); }} onBlur={() => { if (hour === '' || +hour > 23) { toast.error('Ingresa una hora válida.'); return; } updateDate(valid ? date : new Date()); }} />
            <span>:</span><input aria-label="Minutos" inputMode="numeric" maxLength={2} className="w-16 rounded-lg bg-background border border-border p-3 text-center tabular-nums" value={minute} onFocus={e => e.target.select()} onChange={e => { if (/^\d{0,2}$/.test(e.target.value)) setMinute(e.target.value); }} onBlur={() => { if (minute === '' || +minute > 59) { toast.error('Los minutos deben estar entre 00 y 59.'); return; } updateDate(valid ? date : new Date()); }} />
            {timeFormat === '12' && <div className="flex flex-col gap-1">{(['AM', 'PM'] as const).map(p => <button type="button" key={p} aria-pressed={meridiem === p} className={`rounded border px-2 py-1 text-xs ${meridiem === p ? 'border-primary text-primary' : 'border-border'}`} onClick={() => { setMeridiem(p); const h = String(+hour % 12 + (p === 'PM' ? 12 : 0)); setHour(h); updateDate(valid ? date : new Date(), h); }}>{p}</button>)}</div>}
          </div>
        </div>
        {valid && remaining === 0 && <p role="status" className="text-sm text-destructive">La fecha ya pasó. Elige una nueva reapertura.</p>}</>}
      </aside>
    </div>}
    <div className="border-t border-border pt-4 flex flex-wrap justify-end items-center gap-4 form-actions"><button disabled={saving} className="rounded-lg px-5 py-3 bg-primary text-primary-foreground font-semibold disabled:opacity-50" onClick={() => { if (get('maintenance_title_size') && (+get('maintenance_title_size') < 24 || +get('maintenance_title_size') > 72)) { toast.error('El tamaño del título debe estar entre 24 y 72 px.'); return; } if (enabled && timed && (!valid || date.getTime() <= Date.now() || hour === '' || minute === '' || +hour > 23 || +minute > 59)) { toast.error('Elige una fecha y hora futuras válidas.'); return; } void save(keys); }}>{saving ? 'Guardando…' : 'Guardar y aplicar'}</button></div>
  </section>;
}
