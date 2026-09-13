import { useConfig } from '@/store/configStore';
import { downloadPurchasePdf, printPurchaseDocument, installPurchasePrint } from '@/lib/purchasePdf';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { useDatabase } from '@/lib/backend';
import { PurchaseDocument } from '@/components/store/PurchaseDocument';
import { useNavigate } from '@/lib/router';
export default function InvoicePage(){
 useEffect(()=>installPurchasePrint(),[]);
 const {company,logoValue}=useConfig();const [downloading,setDownloading]=useState(false);
 const db=useDatabase(),navigate=useNavigate();const [order,setOrder]=useState<any>(null);const [loaded,setLoaded]=useState(false);const id=window.location.pathname.split('/').pop();
 useEffect(()=>{db.select('orders',{select:'*, items:order_items(*)',filter:{id},maybeSingle:true}).then(({data})=>{setOrder(data);setLoaded(true)})},[id]);
 return <div className="space-y-5"><div className="flex justify-end gap-4 print:hidden"><button onClick={()=>navigate('/dashboard/pedidos')}>Volver a pedidos</button><button disabled={!order} className="px-4 py-2 rounded-lg bg-primary text-white" onClick={()=>printPurchaseDocument()}>Imprimir</button><button disabled={!order||downloading} className="px-4 py-2 rounded-lg border border-border" onClick={async()=>{setDownloading(true);try{await downloadPurchasePdf(order,company,logoValue);}catch{toast.error("No se pudo descargar el PDF. Inténtalo nuevamente.");}finally{setDownloading(false);}}}>{downloading?"Preparando PDF…":"Descargar PDF"}</button></div>{order?<PurchaseDocument order={order}/>:<p>{loaded?'Pedido no encontrado':'Preparando documento…'}</p>}</div>;
}
