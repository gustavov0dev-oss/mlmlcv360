import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import { MaintenanceMessage } from '@/components/MaintenanceMessage';

export function maintenanceTitleSize(value: string) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 24 && n <= 72 ? n : 48;
}
export function MaintenanceCountdown({ date, compact = false }: { date: string; compact?: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const end = new Date(date).getTime();
  const total = Number.isFinite(end) ? Math.max(0, Math.floor((end - now) / 1000)) : 0;
  return <div className="flex justify-center gap-3 sm:gap-4">{[[Math.floor(total / 86400), 'Días'], [Math.floor(total / 3600) % 24, 'Horas'], [Math.floor(total / 60) % 60, 'Min'], [total % 60, 'Seg']].map(([value, label]) => <div key={label} className="flex flex-col items-center gap-2"><div className={`relative aspect-square rounded-2xl border border-border bg-muted flex items-center justify-center font-bold tabular-nums ${compact ? 'w-12 text-xl' : 'w-14 sm:w-20 text-2xl sm:text-3xl'}`}><span className="absolute inset-x-0 top-1/2 h-px bg-current opacity-10" />{String(value).padStart(2, '0')}</div><span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">{label}</span></div>)}</div>;
}
export function MaintenanceView({ config }: { config: Record<string, string> }) {
  return <div className="relative isolate w-full bg-background overflow-hidden px-4 py-12 flex flex-col items-center justify-center min-h-[70vh]">
    <div className="absolute inset-0 -z-10 pointer-events-none opacity-[0.07]" style={{ background: `radial-gradient(ellipse at center, ${config.pwa_theme_color || '#C79B3B'}, transparent 70%)` }} />
    <div className="mb-10"><Logo value={config.logo_value} fallbackText={config.company_name || 'Empresa'} pixelSize={196} pixelHeight={80} /></div>
    <div className="w-full max-w-xl mx-auto text-center">
      <h1 className="font-bold tracking-tight text-foreground break-words mb-4 leading-tight" style={{ fontSize: `${maintenanceTitleSize(config.maintenance_title_size)}px` }}>{config.maintenance_title || 'Volveremos pronto'}</h1>
      <div className="mb-8"><MaintenanceMessage value={config.maintenance_message} /></div>
      {config.maintenance_countdown_enabled === 'true' && <MaintenanceCountdown date={config.maintenance_countdown_date} />}
    </div>
  </div>;
}
