import {createClient} from 'npm:@supabase/supabase-js@2.58.0';
import {smtpSettings,smtpTransport} from '../_shared/smtp.ts';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Content-Type':'application/json'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 try{
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 const {data:{user},error}=await db.auth.getUser((req.headers.get('Authorization')||'').replace(/^Bearer /i,''));
 if(error||!user?.email)return reply({success:false,error:'Inicia sesión para confirmar tu correo.'},401);
 const b=await req.json();
 const {data:state,error:stateError}=await db.from('account_onboarding').select('*').eq('user_id',user.id).maybeSingle();
 if(stateError)throw stateError;
 if(!state)return reply({success:false,error:'No hay una verificación pendiente para esta cuenta.'},400);
 if(state.email_verified_at)return reply({success:true,verified:true});
 if(b.action==='verify'){
  if(typeof b.token!=='string'||b.token.length!==32)return reply({success:false,error:'El enlace no es válido.'},400);
  const digest=await hash(b.token+":"+user.email);
  const {data,error}=await db.from('account_onboarding').update({email_verified_at:new Date().toISOString(),email_token_hash:null,email_token_expires:null}).eq('user_id',user.id).eq('email_token_hash',digest).gt('email_token_expires',new Date().toISOString()).select('user_id').maybeSingle();
  if(error)throw error;
  if(!data)return reply({success:false,error:'El enlace venció o ya fue utilizado. Solicita uno nuevo.'},400);
  return reply({success:true,verified:true});
 }
 if(b.action!=='send')return reply({success:false,error:'Acción inválida.'},400);
 const {data:rows,error:cfgError}=await db.from('system_config').select('key,value').like('key','smtp%');if(cfgError)throw cfgError;
 const settings=smtpSettings(Object.fromEntries((rows||[]).map(r=>[r.key,r.value])));
 if(settings.missing.length)return reply({success:false,error:'El envío de correos aún no está disponible. Puedes seguir usando tu cuenta y confirmar más adelante.'},503);
 const now=Date.now();if(state.email_sent_at&&now-new Date(state.email_sent_at).getTime()<60000)return reply({success:false,error:'Espera un minuto antes de solicitar otro correo.'},429);
 const token=crypto.randomUUID().replaceAll('-','');
 let claim=db.from('account_onboarding').update({email_sent_at:new Date(now).toISOString(),email_token_hash:await hash(token+":"+user.email),email_token_expires:new Date(now+3600000).toISOString()}).eq('user_id',user.id);
 claim=state.email_sent_at?claim.eq('email_sent_at',state.email_sent_at):claim.is('email_sent_at',null);
 const {data:claimed,error:claimError}=await claim.select('user_id').maybeSingle();if(claimError)throw claimError;if(!claimed)return reply({success:false,error:'Ya se está preparando un correo. Espera un minuto.'},429);
 const url=`https://mlmlcv360-preview.whizzend.chatgpt.site/dashboard?verify_email=${token}`;
 const transport=smtpTransport(settings);
 try{await transport.sendMail({from:{name:settings.name||'CLUV 360',address:settings.from},to:user.email,subject:'Confirma tu correo · CLUV 360',text:`Confirma tu correo entrando con tu cuenta y abriendo este enlace: ${url}\nEl enlace vence en una hora.`,html:`<div style="font:16px/1.6 Arial;padding:24px;max-width:560px;margin:auto"><h1>Confirma tu correo</h1><p>Tu cuenta ya está disponible. Confirma que este correo te pertenece.</p><p><a href="${url}">Confirmar mi correo</a></p><p>El enlace vence en una hora.</p></div>`});}finally{transport.close();}
 return reply({success:true,sent:true});
 }catch{return reply({success:false,error:'No pudimos enviar o verificar el correo. Inténtalo más tarde.'},500);}
});
