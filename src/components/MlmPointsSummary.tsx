import {useEffect,useState} from 'react';
import {supabase} from '@/lib/backend/client';
import {useAuthStore} from '@/store/authStore';
export default function MlmPointsSummary(){
 const {user}=useAuthStore();const [totals,setTotals]=useState<{volume:number;commission:number}|null>(null);
 useEffect(()=>{if(!user)return;let alive=true;supabase.rpc('my_mlm_points').then(({data,error})=>{if(alive&&!error)setTotals(data);});return()=>{alive=false;};},[user?.id]);
 if(!totals)return null;
 return <section className="border-y border-border py-4 flex flex-wrap gap-x-10 gap-y-3"><div><p className="text-xs text-muted-foreground">Puntos acumulados para rango</p><p className="text-xl font-bold tabular-nums">{Number(totals.volume).toLocaleString('es-PE')} <span className="text-sm font-normal">puntos</span></p></div><div><p className="text-xs text-muted-foreground">Comisiones en puntos</p><p className="text-xl font-bold tabular-nums">{Number(totals.commission).toLocaleString('es-PE')} <span className="text-sm font-normal">puntos</span></p></div><p className="w-full text-xs text-muted-foreground">Los puntos son independientes del saldo en dinero. Incluyen compras pagadas y ajustes administrativos.</p></section>;
}
