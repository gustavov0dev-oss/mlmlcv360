import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Content-Type':'application/json'};
const origin='https://mlmlcv360-preview.whizzend.chatgpt.site';
const checked=async(q:any)=>{const r=await q;if(r.error){console.error('billing_database_error',r.error.code,r.error.message);throw new Error('No se pudo actualizar tu suscripción. Inténtalo nuevamente.');}return r.data;};
async function api(url:string,token:string,method='GET',body?:unknown,id?:string){
 const r=await fetch(url,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(id?{'PayPal-Request-Id':id,'X-Idempotency-Key':id}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 if(!r.ok){
  const detail=await r.json().catch(()=>({}));const message=String(detail.message||detail.name||'');
  console.error('subscription_provider_rejected',{status:r.status,path:new URL(url).pathname,code:message.slice(0,180)});
  if(message.includes('Payer is associated with a different site'))throw new Error('El correo indicado pertenece a Mercado Pago de otro país. Ingresa el correo de tu cuenta de Mercado Pago Perú o elige PayPal en dólares.');
  if(/payer.*collector|collector.*payer/i.test(message))throw new Error('La cuenta del comprador debe ser distinta de la cuenta que recibe el pago.');
  if(r.status===401||r.status===403)throw new Error('La cuenta de la pasarela no tiene autorización para suscripciones. Contacta con soporte o elige otro método.');
  throw new Error('La pasarela rechazó la autorización mensual. No se realizó ningún cobro. Revisa tu cuenta o elige otro método.');
 }
 return r.status===204?{}:await r.json();
}
async function tokenFor(g:any){
 if(g.slug==='mercadopago')return g.credentials.access_token;
 const r=await fetch('https://api-m.paypal.com/v1/oauth2/token',{method:'POST',headers:{Authorization:`Basic ${btoa(g.credentials.client_id+':'+g.credentials.client_secret)}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw new Error('No se pudo conectar con PayPal.');return (await r.json()).access_token;
}
async function sync(db:any,c:any,g:any){
 await checked(db.from('billing_contracts').update({checked_at:new Date().toISOString()}).eq('id',c.id));
 if(!c.provider_id)return c;
 const token=await tokenFor(g);let state='pending';let payments:any[]=[];
 if(c.gateway==='paypal'){
  const s=await api(`https://api-m.paypal.com/v1/billing/subscriptions/${c.provider_id}`,token);
  if(s.custom_id!==c.id||s.plan_id!==c.provider_plan_id)throw new Error('No se pudo validar la suscripción.');
  state=s.status==='ACTIVE'?'active':['CANCELLED','EXPIRED'].includes(s.status)?'cancelled':s.status==='SUSPENDED'?'suspended':'pending';
  const start=new Date(Math.max(new Date(c.created_at).getTime(),Date.now()-30*86400000)).toISOString();
  const result=state==='pending'?{transactions:[]}:await api(`https://api-m.paypal.com/v1/billing/subscriptions/${c.provider_id}/transactions?start_time=${encodeURIComponent(start)}&end_time=${encodeURIComponent(new Date().toISOString())}`,token);
  payments=(result.transactions||[]).filter((p:any)=>p.status==='COMPLETED').map((p:any)=>({id:p.id,date:p.time,amount:Number(p.amount_with_breakdown?.gross_amount?.value),currency:p.amount_with_breakdown?.gross_amount?.currency_code}));
 }else{
  const s=await api(`https://api.mercadopago.com/preapproval/${c.provider_id}`,token);
  if(s.external_reference!==c.id||Number(s.auto_recurring?.transaction_amount)!==Number(c.amount)||s.auto_recurring?.currency_id!==c.currency)throw new Error('No se pudo validar la suscripción.');
  state=s.status==='authorized'?'active':s.status==='cancelled'?'cancelled':s.status==='paused'?'suspended':'pending';
  const result=await api(`https://api.mercadopago.com/authorized_payments/search?preapproval_id=${c.provider_id}&sort=date_created:desc&limit=12`,token);
  for(const invoice of result.results||[]){
   if(invoice.preapproval_id!==c.provider_id||!invoice.payment?.id)continue;
   const p=await api(`https://api.mercadopago.com/v1/payments/${invoice.payment.id}`,token);
   if(p.status==='approved'&&p.live_mode===true)payments.push({id:String(p.id),date:p.date_approved,amount:Number(p.transaction_amount),currency:p.currency_id});
  }
 }
 // A verified charge extends access once, independently of duplicated notifications.
 await checked(db.from('billing_contracts').update({status:state,last_error:null}).eq('id',c.id));
 for(const p of payments.sort((a,b)=>Date.parse(a.date)-Date.parse(b.date))){
  if(p.amount===Number(c.amount)&&p.currency===c.currency&&p.id&&Number.isFinite(Date.parse(p.date))) await checked(db.rpc('record_subscription_payment',{p_contract:c.id,p_payment:p.id,p_paid_at:p.date,p_amount:p.amount,p_currency:p.currency}));
 }
 await checked(db.from('subscriptions').update({auto_renew:state==='active',cancel_at_period_end:state==='cancelled'}).eq('contract_id',c.id));
 return await checked(db.from('billing_contracts').select('*').eq('id',c.id).single());
}
Deno.serve(async req=>{
 const json=(d:unknown,status=200)=>new Response(JSON.stringify(d),{headers,status});
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return json({success:false},405);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 try{
  const b=await req.json();
  if(b.action==='sync_due'){
   const valid=await checked(db.rpc('billing_scheduler_authorized',{p_secret:req.headers.get('x-billing-secret')||''}));
   if(!valid)return json({success:false},401);
   const rows=await checked(db.from('billing_contracts').select('*').not('provider_id','is',null).neq('status','cancelled').lt('checked_at',new Date(Date.now()-5*60000).toISOString()).order('checked_at').limit(10));
   const gateways=await checked(db.from('payment_gateways').select('*').in('slug',['paypal','mercadopago']));
   const results=await Promise.allSettled(rows.map(async(c:any)=>{try{await sync(db,c,gateways.find((g:any)=>g.slug===c.gateway));}catch(e){await checked(db.from('billing_contracts').update({last_error:'No se pudo verificar la renovación. Se reintentará automáticamente.'}).eq('id',c.id));throw e;}}));
   await checked(db.rpc('expire_paid_memberships'));
   return json({success:true,checked:results.length,failed:results.filter(r=>r.status==='rejected').length});
  }
  const {data:{user}}=await db.auth.getUser(req.headers.get('Authorization')?.replace(/^Bearer /i,'')||'');
  if(!user)return json({success:false,error:'Inicia sesión para continuar.'},401);
  if(b.action==='cancel'){
   const sub=await checked(db.from('subscriptions').select('*').eq('user_id',user.id).maybeSingle());
   const contractId=b.contract_id||sub?.contract_id;
   if(contractId){
    const c=await checked(db.from('billing_contracts').select('*').eq('id',contractId).eq('user_id',user.id).single());
    const g=await checked(db.from('payment_gateways').select('*').eq('slug',c.gateway).single());
    const latest=await sync(db,c,g);
    if(latest.status!=='cancelled'&&c.provider_id){
     const t=await tokenFor(g);
     await api(c.gateway==='paypal'?`https://api-m.paypal.com/v1/billing/subscriptions/${c.provider_id}/cancel`:`https://api.mercadopago.com/preapproval/${c.provider_id}`,t,c.gateway==='paypal'?'POST':'PUT',c.gateway==='paypal'?{reason:'Cancelado por el titular desde Mi Plan'}:{status:'cancelled'});
    }
    await checked(db.from('billing_contracts').update({status:'cancelled'}).eq('id',c.id));
   }
   if(!b.contract_id||b.contract_id===sub?.contract_id)await checked(db.from('subscriptions').update({auto_renew:false,cancel_at_period_end:true}).eq('user_id',user.id));
   return json({success:true,message:'Renovación cancelada. Mantienes tus beneficios hasta el final del período pagado.',paid_until:sub?.current_period_end});
  }
  if(b.action==='verify'){
   const c=await checked(db.from('billing_contracts').select('*').eq('id',b.contract_id).eq('user_id',user.id).single());
   const g=await checked(db.from('payment_gateways').select('*').eq('slug',c.gateway).single());
   const contract=await sync(db,c,g);return json({success:true,contract});
  }
  if(b.action!=='create')return json({success:false,error:'Acción no válida.'},400);
  const plan=await checked(db.from('plans').select('*').eq('slug',b.plan_slug).eq('is_active',true).single());
  const g=await checked(db.from('payment_gateways').select('*').eq('slug',b.gateway).eq('is_active',true).single());
  if(!['paypal','mercadopago'].includes(g.slug)||Number(plan.price)<=0)throw new Error('Elige un método compatible con renovación mensual.');
  const open=await checked(db.from('billing_contracts').select('*').eq('user_id',user.id).in('status',['pending','active','suspended']).maybeSingle());
  if(open){
   if(open.status!=='pending'||open.plan_slug!==plan.slug||open.gateway!==g.slug)throw new Error('Ya tienes una suscripción o autorización pendiente. Revísala en Mi Plan antes de iniciar otra.');
   if(open.checkout_url)return json({success:true,contract_id:open.id,redirect_url:open.checkout_url});
  }
  let amount=Number(plan.price);
  if(plan.currency!==g.currency){const cfg=await checked(db.from('system_config').select('value').eq('key','exchange_rate_usd').single());const rate=Number(cfg.value);if(!(rate>0))throw new Error('Tipo de cambio no disponible.');amount=plan.currency==='PEN'?amount/rate:amount*rate;}
  amount=Math.round(amount*100)/100;
  const c=open||await checked(db.from('billing_contracts').insert({user_id:user.id,plan_slug:plan.slug,gateway:g.slug,amount,currency:g.currency}).select().single());
  const t=await tokenFor(g);const back=`${origin}/pago?subscription=${c.id}`;let result:any;
  if(g.slug==='paypal'){
   let providerPlan=c.provider_plan_id;
   if(!providerPlan){
    const product=await api('https://api-m.paypal.com/v1/catalogs/products',t,'POST',{name:`CLUV360 ${plan.name}`,type:'SERVICE',category:'SOFTWARE'},c.id+'-product');
    const pp=await api('https://api-m.paypal.com/v1/billing/plans',t,'POST',{product_id:product.id,name:`${plan.name} mensual`,status:'ACTIVE',billing_cycles:[{frequency:{interval_unit:'MONTH',interval_count:1},tenure_type:'REGULAR',sequence:1,total_cycles:0,pricing_scheme:{fixed_price:{value:Number(c.amount).toFixed(2),currency_code:c.currency}}}],payment_preferences:{auto_bill_outstanding:false,payment_failure_threshold:2}},c.id+'-plan');
    providerPlan=pp.id;await checked(db.from('billing_contracts').update({provider_plan_id:providerPlan}).eq('id',c.id));
   }
   result=await api('https://api-m.paypal.com/v1/billing/subscriptions',t,'POST',{plan_id:providerPlan,custom_id:c.id,application_context:{brand_name:'CLUV360',user_action:'SUBSCRIBE_NOW',return_url:back,cancel_url:back+'&cancel=1'}},c.id);
   result.checkout=result.links?.find((l:any)=>l.rel==='approve')?.href;
  }else{
   result=await api('https://api.mercadopago.com/preapproval',t,'POST',{reason:`CLUV360 ${plan.name} mensual`,external_reference:c.id,payer_email:typeof b.payer_email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.payer_email.trim())?b.payer_email.trim():user.email,auto_recurring:{frequency:1,frequency_type:'months',transaction_amount:Number(c.amount),currency_id:c.currency},back_url:back,status:'pending'},c.id);
   result.checkout=result.init_point;
  }
  if(!result.checkout||!result.id)throw new Error('No se pudo abrir la autorización mensual.');
  await checked(db.from('billing_contracts').update({provider_id:result.id,checkout_url:result.checkout}).eq('id',c.id));
  return json({success:true,contract_id:c.id,redirect_url:result.checkout});
 }catch(e){return json({success:false,error:e instanceof Error?e.message:'No se pudo procesar la suscripción.'});}
});
