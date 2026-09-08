import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import {smtpSettings,smtpTransport,smtpFailure} from '../_shared/smtp.ts';
import sanitizeHtml from 'npm:sanitize-html@2.17.0';

const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Content-Type':'application/json'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(!['GET','POST'].includes(req.method))return json({error:'method_not_allowed'},405);
 try{
  const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return json({error:'unauthorized'},401);
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:auth,error:authError}=await db.auth.getUser(token);
  if(authError||!auth.user)return json({error:'unauthorized'},401);
  const {data:profile,error:profileError}=await db.from('profiles').select('role').eq('id',auth.user.id).single();
  if(profileError||!['admin','super_admin'].includes(profile?.role))return json({error:'forbidden'},403);
  const {data:configRows,error:configError}=await db.from('system_config').select('key,value').like('key','smtp_%');
  if(configError)return json({error:'smtp_config_unavailable'},503);
  const settings=smtpSettings(Object.fromEntries((configRows||[]).map(row=>[row.key,row.value||''])));
  const missing=settings.missing;
  const blockedPort=[25,587].includes(settings.port);
  if(req.method==='GET'){
   if(missing.length)return json({configured:false,detail:`Falta guardar: ${missing.join(', ')}. Abre Configuración → Correos.`});
   if(blockedPort)return json({configured:false,detail:'El alojamiento actual bloquea los puertos SMTP 25 y 587. Si tu proveedor ofrece SSL/TLS en el puerto 465, configúralo en Correos.'});
   const transport=smtpTransport(settings);
   try{await transport.verify();return json({configured:true,detail:'Conexión y autenticación SMTP correctas. Puedes enviar respuestas.'});}
   catch{return json({configured:false,detail:'No se pudo conectar o autenticar con el servidor SMTP. Revisa servidor, puerto, usuario y contraseña en Correos.'});}
   finally{transport.close();}
  }
  const body=await req.json();
  if(!uuid.test(body.reply_id||''))return json({error:'invalid_reply'},400);
  const {data:reply,error}=await db.from('contact_replies').select('*').eq('id',body.reply_id).single();
  if(error||!reply)return json({error:'not_found'},404);
  if(reply.author_id!==auth.user.id)return json({error:'forbidden'},403);
  if(reply.state==='sent'){
   const {error:reconcileError}=await db.from('contact_messages').update({status:'replied',replied_at:reply.sent_at}).eq('id',reply.contact_message_id);
   return reconcileError?json({error:'delivery_record_pending'},503):json({state:'sent'});
  }
  if(missing.length)return json({error:'email_not_configured'},503);
  if(blockedPort)return json({error:'smtp_port_blocked'},503);
  const {data:message,error:messageError}=await db.from('contact_messages').select('id,email').eq('id',reply.contact_message_id).single();
  if(messageError||!message)return json({error:'not_found'},404);
  let payload=reply.delivery_payload;
  if(reply.state==='draft'){
   const html=sanitizeHtml(reply.body_html,{allowedTags:['p','br','strong','b','em','i','u','s','ul','ol','li','blockquote','h2','h3','a','pre','code'],allowedAttributes:{a:['href','title'],p:['style'],h2:['style'],h3:['style']},allowedSchemes:['https','http','mailto'],allowProtocolRelative:false,allowedStyles:{'*':{'text-align':[/^(left|center|right)$/]}}});
   const text=sanitizeHtml(html.replace(/<\/(p|li|h2|h3|blockquote)>/g,'\n').replace(/<br\s*\/?>/g,'\n'),{allowedTags:[],allowedAttributes:{}}).trim();
   if(!text||text.length>15000)return json({error:'empty_or_long_reply'},400);
   payload={from:{name:settings.name,address:settings.from},to:[message.email],subject:reply.subject.replace(/[\r\n]/g,' ').trim(),html,text};
   const {data:claimed,error:claimError}=await db.from('contact_replies').update({state:'sending',body_html:html,body_text:text,delivery_payload:payload,attempted_at:new Date().toISOString(),error_code:null}).eq('id',reply.id).eq('state','draft').eq('body_html',reply.body_html).eq('subject',reply.subject).select('id').maybeSingle();
   if(claimError||!claimed)return json({error:'reply_changed_or_busy'},409);
  }else{
   if(reply.state!=='failed'||!payload||typeof payload.from==='string')return json({error:'manual_review_required'},409);
   const {data:claimed,error:claimError}=await db.from('contact_replies').update({state:'sending',attempted_at:new Date().toISOString(),error_code:null}).eq('id',reply.id).eq('state','failed').select('id').maybeSingle();
   if(claimError||!claimed)return json({error:'reply_changed_or_busy'},409);
  }
  const transport=smtpTransport(settings);
  let providerId:string;
  try{
   const result=await transport.sendMail({...payload,messageId:`<contact-reply-${reply.id}@${settings.from.split('@')[1]}>`});
   if(!result.accepted?.length)throw {code:'EENVELOPE'};
   providerId=result.messageId;
  }catch(error){
   const state=smtpFailure(error);const code=state==='failed'?'provider_rejected':'delivery_unknown';
   await db.from('contact_replies').update({state,error_code:code}).eq('id',reply.id).eq('state','sending');
   return json({error:code},502);
  }finally{transport.close();}
  const sentAt=new Date().toISOString();
  const {error:saveError}=await db.from('contact_replies').update({state:'sent',provider_id:providerId,sent_at:sentAt,error_code:null}).eq('id',reply.id);
  if(saveError)return json({error:'delivery_record_pending'},503);
  const {error:messageSaveError}=await db.from('contact_messages').update({status:'replied',replied_at:sentAt}).eq('id',message.id);
  if(messageSaveError)return json({error:'delivery_record_pending'},503);
  return json({state:'sent'});
 }catch{return json({error:'unexpected_error'},500);}
});
