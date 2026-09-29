import { StyledSelect } from '@/components/ui/styled-select';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { displayDateTime, userTimeZone } from '@/lib/dates';

export function TimeZoneSettings() {
  const {user}=useAuthStore();
  const key=`mlm360-timezone-${user?.id}`;
  const [zone,setZone]=useState(()=>localStorage.getItem(key)||'');
  const zones=(Intl as typeof Intl & {supportedValuesOf?:(key:string)=>string[]}).supportedValuesOf?.('timeZone') || ['America/Lima','America/Bogota','America/Mexico_City','America/Santiago','America/Argentina/Buenos_Aires','Europe/Madrid','UTC'];
  return <section className="rounded-xl border border-border bg-card p-6"><h2 className="text-lg font-semibold">Fecha y hora</h2><p className="mt-2 text-sm text-muted-foreground">Los registros se guardan en UTC y se muestran en tu zona horaria. Si la hora de tu dispositivo no coincide con tu región, selecciónala aquí.</p><label className="block mt-4 text-sm font-medium">Zona horaria<StyledSelect value={zone} onChange={e=>{const value=e.target.value;setZone(value);if(value)localStorage.setItem(key,value);else localStorage.removeItem(key);window.location.reload();}} className="mt-2 block w-full max-w-md border border-border rounded-lg bg-background p-3"><option value="">Automática · {Intl.DateTimeFormat().resolvedOptions().timeZone}</option>{zones.map(z=><option key={z} value={z}>{z.replace(/_/g,' ')}</option>)}</StyledSelect></label><p className="mt-3 text-sm text-muted-foreground">Ahora: {displayDateTime(new Date())} · {userTimeZone()}</p></section>;
}
