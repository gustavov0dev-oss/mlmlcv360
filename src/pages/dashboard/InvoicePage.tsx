import { useEffect, useState } from 'react';
import { useDatabase } from '@/lib/backend';
import { PurchaseDocument } from '@/components/store/PurchaseDocument';
import { useNavigate } from '@/lib/router';
export default function InvoicePage(){
 const db=useDatabase(),navigate=useNavigate();const [order,setOrder]=useState<any>(null);const [loaded,setLoaded]=useState(false);const id=window.location.pathname.split('/').pop();
 useEffect(()=>{db.select('orders',{select:'*, items:order_items(*)',filter:{id},maybeSingle:true}).then(({data})=>{setOrder(data);setLoaded(true)})},[id]);
 return <div className="space-y-5"><div className="flex justify-end gap-4 print:hidden"><button onClick={()=>navigate('/dashboard/pedidos')}>Volver a pedidos</button><button disabled={!order} className="px-4 py-2 rounded-lg bg-primary text-white" onClick={()=>window.print()}>Imprimir / guardar PDF</button></div>{order?<PurchaseDocument order={order}/>:<p>{loaded?'Pedido no encontrado':'Preparando documento…'}</p>}</div>;
}
