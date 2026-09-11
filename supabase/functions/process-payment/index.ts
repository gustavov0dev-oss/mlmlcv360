import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Content-Type':'application/json'};
const origin='https://mlmlcv360-preview.whizzend.chatgpt.site';
const manual=['yape','plin','transfer'];
Deno.serve(async req=>{
 if(req.method==='OPTIONS') return new Response('ok',{headers});
 const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 try {
  const token=req.headers.get('Authorization')?.replace(/^Bearer /i,'')||'';
  const {data:{user}}=await db.auth.getUser(token);
  if(!user) return json({success:false,error:'Inicia sesión para continuar.'},401);
  const b=await req.json();
  const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single();
  const admin=['admin','super_admin'].includes(profile?.role);
  const checked=async(q:any)=>{const r=await q;if(r.error)throw new Error('No se pudo guardar el pago.');return r.data;};
  if(b.action==='free_plan'||b.action==='cancel_plan') {
   const plan=await checked(b.action==='free_plan'?db.from('plans').select('*').eq('slug',b.plan_slug).eq('is_active',true).single():db.from('plans').select('*').eq('is_active',true).eq('price',0).limit(1).single());
   if(Number(plan.price)!==0) throw new Error('Este plan requiere un pago confirmado.');
   if(b.action==='cancel_plan') await checked(db.from('subscriptions').update({status:'cancelled',updated_at:new Date().toISOString()}).eq('user_id',user.id));
   else await checked(db.from('subscriptions').upsert({user_id:user.id,plan_slug:plan.slug,status:'active',gateway:'free',amount:0,currency:plan.currency,current_period_start:new Date().toISOString(),current_period_end:plan.trial_days?new Date(Date.now()+plan.trial_days*86400000).toISOString():null,updated_at:new Date().toISOString()},{onConflict:'user_id'}));
   await checked(db.from('profiles').update({plan:plan.slug,updated_at:new Date().toISOString()}).eq('id',user.id));
   return json({success:true});
  }
  const gatewayRows=await checked(db.from('payment_gateways').select('*').in('slug',['paypal','mercadopago',...manual]));
  if(b.action==='methods') return json({success:true,methods:gatewayRows.filter((g:any)=>g.is_active).map((g:any)=>({id:g.id,slug:g.slug,name:g.name,logo:g.logo,currency:g.currency,description:g.description,is_active:g.is_active,credentials:manual.includes(g.slug)?g.credentials:{},ready:g.slug==='paypal'?!!(g.credentials.client_id&&g.credentials.client_secret):g.slug==='mercadopago'?!!g.credentials.access_token:g.slug==='transfer'?(()=>{try{return JSON.parse(g.credentials.accounts||'[]').some((a:any)=>a.bank&&a.holder&&a.number)}catch{return false}})():!!(g.credentials.phone_number&&g.credentials.merchant_name)}))});
  const request=async(url:string,opts:RequestInit)=>{
   const r=await fetch(url,{...opts,signal:AbortSignal.timeout(20000)});const d=await r.json();
   if(!r.ok) throw new Error('La pasarela rechazó la solicitud. Revisa las credenciales de producción o intenta nuevamente.');return d;
  };
  const paypalToken=async(c:any)=>(await request('https://api-m.paypal.com/v1/oauth2/token',{method:'POST',headers:{Authorization:`Basic ${btoa(c.client_id+':'+c.client_secret)}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'})).access_token;
  if(b.action==='check_gateway') {
   if(!admin) return json({success:false,error:'No autorizado'},403);
   const g=gatewayRows.find((g:any)=>g.slug===b.gateway);if(!g) throw new Error('Método no encontrado.');
   if(g.slug==='paypal') await paypalToken(g.credentials);
   else if(g.slug==='mercadopago') {
    if(g.credentials.access_token?.startsWith('TEST-')) throw new Error('Usa el Access Token de producción de Mercado Pago.');
    await request('https://api.mercadopago.com/users/me',{headers:{Authorization:`Bearer ${g.credentials.access_token}`}});
   }
   return json({success:true,message:'Credenciales de producción verificadas.'});
  }
  if(b.action==='review') {
   if(!admin) return json({success:false,error:'No autorizado'},403);
   const s=await checked(db.from('payment_sessions').select('*').eq('id',b.session_id).single());
   if(!manual.includes(s.gateway)||s.status!=='review'||!s.receipt_path) throw new Error('El comprobante no está pendiente de revisión.');
   if(b.approve) await checked(db.rpc('complete_payment_session',{p_id:s.id}));
   else await checked(db.from('payment_sessions').update({status:'rejected'}).eq('id',s.id).eq('status','review'));
   return json({success:true});
  }
  if(b.action==='receipt'||b.action==='verify') {
   const s=await checked(db.from('payment_sessions').select('*').eq('id',b.session_id).eq('user_id',user.id).single());
   if(b.action==='receipt') {
    if(!manual.includes(s.gateway)||s.status!=='pending') throw new Error('Este pago no admite comprobantes.');
    if(typeof b.path!=='string'||!b.path.startsWith(user.id+'/')||!b.reference?.trim()) throw new Error('Adjunta el comprobante y número de operación.');
    const {data:files,error}=await db.storage.from('payment-receipts').list(user.id,{search:b.path.split('/')[1]});
    if(error||!files?.some(f=>f.name===b.path.split('/')[1])) throw new Error('No se encontró el comprobante.');
    await checked(db.from('payment_sessions').update({receipt_path:b.path,operation_reference:b.reference.trim().slice(0,100),status:'review'}).eq('id',s.id).eq('status','pending'));
    return json({success:true,status:'review'});
   }
   if(s.status==='paid'||manual.includes(s.gateway)) return json({success:true,status:s.status});
   const gw=gatewayRows.find((g:any)=>g.slug===s.gateway); if(!gw) throw new Error('Pasarela no disponible.');
   let paid=false;
   if(s.gateway==='paypal') {
    const auth=await paypalToken(gw.credentials);
    let order=await request(`https://api-m.paypal.com/v2/checkout/orders/${s.provider_id}`,{headers:{Authorization:`Bearer ${auth}`}});
    if(order.status==='APPROVED') order=await request(`https://api-m.paypal.com/v2/checkout/orders/${s.provider_id}/capture`,{method:'POST',headers:{Authorization:`Bearer ${auth}`,'Content-Type':'application/json','PayPal-Request-Id':s.id},body:'{}'});
    const unit=order.purchase_units?.[0];const capture=unit?.payments?.captures?.[0];
    paid=order.status==='COMPLETED'&&capture?.status==='COMPLETED'&&unit?.custom_id===s.id&&capture.amount?.currency_code===s.currency&&Number(capture.amount.value)===Number(s.amount);
   } else {
    const result=await request(`https://api.mercadopago.com/v1/payments/search?external_reference=${s.id}`,{headers:{Authorization:`Bearer ${gw.credentials.access_token}`}});
    paid=result.results?.some((p:any)=>p.status==='approved'&&p.live_mode===true&&p.external_reference===s.id&&p.currency_id===s.currency&&Number(p.transaction_amount)===Number(s.amount));
   }
   if(paid) await checked(db.rpc('complete_payment_session',{p_id:s.id}));
   return json({success:true,status:paid?'paid':'pending'});
  }
  const gw=gatewayRows.find((g:any)=>g.slug===b.gateway&&g.is_active);
  if(!gw) throw new Error('Selecciona un método disponible.');
  if(gw.slug==='mercadopago'&&gw.credentials.access_token?.startsWith('TEST-')) throw new Error('Mercado Pago requiere credenciales de producción.');
  let amount:number, currency:string, plan:any=null, order:any=null;
  if(b.order_id) {
   order=await checked(db.from('orders').select('*').eq('id',b.order_id).eq('user_id',user.id).single());
   if(order.payment_status==='paid') throw new Error('El pedido ya está pagado.');
   amount=Number(order.total); currency=order.currency;
  } else {
   plan=await checked(db.from('plans').select('*').eq('slug',b.plan_slug).eq('is_active',true).single());
   amount=Number(plan.price);currency=plan.currency;
  }
  if(!Number.isFinite(amount)||amount<=0) throw new Error('Importe inválido.');
  if(currency!==gw.currency) {
   const row=await checked(db.from('system_config').select('value').eq('key','exchange_rate_usd').single());const rate=Number(row.value);
   if(!Number.isFinite(rate)||rate<=0) throw new Error('Configura el tipo de cambio.');
   amount=currency==='PEN'?amount/rate:amount*rate;currency=gw.currency;
  }
  amount=Math.round(amount*100)/100;
  const existing=await checked(db.from('payment_sessions').select('*').eq('user_id',user.id).eq('gateway',gw.slug).eq(order?'order_id':'plan_slug',order?.id||plan.slug).eq('status','pending').eq('amount',amount).gte('created_at',new Date(Date.now()-3600000).toISOString()).order('created_at',{ascending:false}).limit(1));
  if(existing[0]?.checkout_url||existing[0]&&manual.includes(gw.slug)) return json({success:true,session_id:existing[0].id,redirect_url:existing[0].checkout_url,status:'pending',amount,currency});
  const s=existing[0]||await checked(db.from('payment_sessions').insert({user_id:user.id,order_id:order?.id||null,plan_slug:plan?.slug||null,gateway:gw.slug,amount,currency}).select().single());
  if(manual.includes(gw.slug)) return json({success:true,session_id:s.id,status:'pending',amount,currency});
  const returnUrl=`${origin}/pago?session=${s.id}`;
  let providerId:string,checkout:string;
  if(gw.slug==='paypal') {
   const auth=await paypalToken(gw.credentials);
   const result=await request('https://api-m.paypal.com/v2/checkout/orders',{method:'POST',headers:{Authorization:`Bearer ${auth}`,'Content-Type':'application/json','PayPal-Request-Id':s.id},body:JSON.stringify({intent:'CAPTURE',purchase_units:[{custom_id:s.id,amount:{currency_code:currency,value:amount.toFixed(2)},description:order?`Pedido ${order.order_number}`:`Membresía ${plan.name}`}],payment_source:{paypal:{experience_context:{return_url:returnUrl,cancel_url:returnUrl+'&cancel=1',user_action:'PAY_NOW'}}}})});
   providerId=result.id;checkout=result.links?.find((l:any)=>['payer-action','approve'].includes(l.rel))?.href;
  } else {
   const result=await request('https://api.mercadopago.com/checkout/preferences',{method:'POST',headers:{Authorization:`Bearer ${gw.credentials.access_token}`,'Content-Type':'application/json','X-Idempotency-Key':s.id},body:JSON.stringify({items:[{id:s.id,title:order?`Pedido ${order.order_number}`:`Membresía ${plan.name}`,quantity:1,currency_id:currency,unit_price:amount}],external_reference:s.id,back_urls:{success:returnUrl,pending:returnUrl,failure:returnUrl+'&cancel=1'},auto_return:'approved',notification_url:Deno.env.get('SUPABASE_URL')+'/functions/v1/payment-webhook'})});
   providerId=result.id;checkout=result.init_point;
  }
  if(!checkout||!providerId) throw new Error('La pasarela no devolvió su checkout.');
  await checked(db.from('payment_sessions').update({provider_id:providerId,checkout_url:checkout}).eq('id',s.id));
  return json({success:true,session_id:s.id,redirect_url:checkout,status:'pending',amount,currency});
 } catch(e) {return json({success:false,error:e instanceof Error?e.message:'No se pudo procesar el pago.'});}
});
