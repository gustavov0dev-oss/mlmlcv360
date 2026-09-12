import {deliverPaymentEmail} from '../_shared/payment-email.ts';
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
// The notification is only a hint. Authenticate the payment by retrieving it
// directly from Mercado Pago with the merchant's server-side credentials.
Deno.serve(async req=>{
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 try{
  if(req.method!=='POST')return new Response('Method not allowed',{status:405});
  const b=await req.json();const id=b.data?.id;
  if(b.type!=='payment'||!/^\d+$/.test(String(id)))return new Response('ok');
  const {data:gw}=await db.from('payment_gateways').select('credentials').eq('slug','mercadopago').single();
  if(!gw?.credentials?.access_token)return new Response('unavailable',{status:503});
  const r=await fetch(`https://api.mercadopago.com/v1/payments/${id}`,{headers:{Authorization:`Bearer ${gw.credentials.access_token}`},signal:AbortSignal.timeout(15000)});
  if(!r.ok)return new Response('retry',{status:502});
  const payment=await r.json();
  if(payment.status!=='approved'||payment.live_mode!==true)return new Response('ok');
  const {data:s}=await db.from('payment_sessions').select('*').eq('id',payment.external_reference).eq('gateway','mercadopago').single();
  if(!s||s.currency!==payment.currency_id||Number(s.amount)!==Number(payment.transaction_amount))return new Response('mismatch',{status:400});
  const {error}=await db.rpc('complete_payment_session',{p_id:s.id});
  if(!error)await deliverPaymentEmail(db,s.id).catch(()=>{});
  return new Response(error?'retry':'ok',{status:error?500:200});
 }catch{return new Response('retry',{status:500})}
});
