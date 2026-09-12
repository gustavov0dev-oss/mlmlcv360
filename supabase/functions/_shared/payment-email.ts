import {smtpSettings,smtpTransport,smtpFailure} from './smtp.ts';
const escape=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export async function deliverPaymentEmail(db:any,sessionId:string){
 const {data:rows}=await db.from('system_config').select('key,value');const cfg=Object.fromEntries((rows||[]).map((r:any)=>[r.key,r.value]));
 const settings=smtpSettings(cfg);if(settings.missing.length)return {status:'configuration_required'};
 const {data:queue}=await db.from('payment_email_queue').select('*').eq('session_id',sessionId).in('status',['pending','failed']);
 for(const mail of queue||[]){
  const {data:claimed}=await db.from('payment_email_queue').update({status:'sending'}).eq('id',mail.id).in('status',['pending','failed']).select('id').maybeSingle();if(!claimed)continue;
  let transport:any;
  try{
   const {data:{user},error}=await db.auth.admin.getUserById(mail.user_id);if(error||!user?.email)throw {code:'EENVELOPE'};
   const {data:s}=await db.from('payment_sessions').select('*').eq('id',sessionId).single();
   let order:any=null;if(s.order_id){const r=await db.from('orders').select('*,items:order_items(*)').eq('id',s.order_id).single();order=r.data;}
   const title=mail.event==='paid'?'Pago confirmado':mail.event==='review'?'Comprobante recibido':'Comprobante rechazado';
   const origin='https://mlmlcv360-preview.whizzend.chatgpt.site';
   const url=mail.event==='paid'&&order?`${origin}/dashboard/pedidos/factura/${order.id}`:`${origin}/pago?session=${s.id}`;
   const money=(n:number)=>new Intl.NumberFormat('es-PE',{style:'currency',currency:order?.currency||s.currency}).format(Number(n)||0);
   const detail=mail.event==='paid'&&order?`<h2>Constancia de compra ${escape(order.order_number)}</h2><table width="100%" cellpadding="10" style="border-collapse:collapse"><tr><th align="left">Producto</th><th>Cant.</th><th>Importe</th></tr>${(order.items||[]).map((i:any)=>`<tr><td style="border-bottom:1px solid #ddd">${escape(i.product_name)}<br><small>${escape(i.variant_name)} ${escape(i.sku)}</small></td><td>${i.quantity}</td><td>${escape(money(i.total))}</td></tr>`).join('')}</table><p><strong>Total: ${escape(money(order.total))}</strong></p>`:`<p>${mail.event==='review'?'Tu comprobante está en revisión. Te avisaremos al terminar.':mail.event==='paid'?'Tu pago se confirmó correctamente.':'No se aprobó el comprobante. Contacta con soporte para revisar tu pago.'}</p>`;
   const html=`<div style="font:15px/1.6 Arial;color:#17202a;max-width:640px;margin:auto;padding:24px"><h1>${escape(cfg.company_name||'CLUV 360')}</h1><h2>${title}</h2>${detail}<p><a href="${url}">Consultar ${order?'mi pedido y descargar constancia':'mi pago'}</a></p><hr><p>Gracias por confiar en ${escape(cfg.company_name||'nosotros')}.</p><small>${escape(cfg.company_address)}<br>${escape(cfg.company_email)} · ${escape(cfg.company_phone)}</small></div>`;
   transport=smtpTransport(settings);await transport.sendMail({from:{name:settings.name||cfg.company_name,address:settings.from},to:user.email,subject:`${title}${order?' · '+order.order_number:''}`,html,messageId:`<payment-${mail.id}@${settings.from.split('@')[1]}>`});
   await db.from('payment_email_queue').update({status:'sent',sent_at:new Date().toISOString()}).eq('id',mail.id);
  }catch(error){await db.from('payment_email_queue').update({status:smtpFailure(error)}).eq('id',mail.id);}finally{transport?.close();}
 }
 return {status:'processed'};
}
