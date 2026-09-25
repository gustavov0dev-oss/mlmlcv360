import {useState,useEffect} from 'react';
import {supabase} from '@/lib/backend/client';
export default function OrderPacksSummary({orderId}:{orderId:string}){
 const [packs,setPacks]=useState<any[]>([]);
 useEffect(()=>{let alive=true;supabase.from('order_packs').select('id,snapshot').eq('order_id',orderId).then(({data})=>{if(alive)setPacks(data||[]);});return()=>{alive=false;};},[orderId]);
 if(!packs.length)return null;
 return <section className="border-y border-border py-4 space-y-3"><h2 className="font-semibold">Planes MLM de este pedido</h2>{packs.map(p=><div key={p.id}><p className="font-medium">{p.snapshot.name} <span className="text-sm text-primary">· {p.snapshot.points} puntos MLM</span></p><p className="text-xs text-muted-foreground">{p.snapshot.lines.map((l:any)=>`${l.name} × ${l.quantity}`).join(' · ')}</p></div>)}</section>;
}
