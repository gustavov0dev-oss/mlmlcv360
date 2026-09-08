import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import sanitizeHtml from 'npm:sanitize-html@2.17.0';

const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Content-Type':'application/json'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers});
 const key=Deno.env.get('RESEND_API_KEY')||'';
 const from=Deno.env.get('EMAIL_FROM')||'';
 const configured=!!key && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from) && !from.endsWith('@tudominio.com');
 // Availability is non-sensitive; no keys, recipient data or drafts are returned.
 if(req.method==='GET')return json({configured});
 if(req.method!=='POST')return json({error:'method_not_allowed'},405);
 try{
  const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return json({error:'unauthorized'},401);
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:auth,error:authError}=await db.auth.getUser(token);
  if(authError||!auth.user)return json({error:'unauthorized'},401);
  const {data:profile,error:profileError}=await db.from('profiles').select('role').eq('id',auth.user.id).single();
  if(profileError||!['admin','super_admin'].includes(profile?.role))return json({error:'forbidden'},403);
  const body=await req.json();
  if(!uuid.test(body.reply_id||''))return json({error:'invalid_reply'},400);
  const {data:reply,error}=await db.from('contact_replies').select('*').eq('id',body.reply_id).single();
  if(error||!reply)return json({error:'not_found'},404);
  if(reply.author_id!==auth.user.id)return json({error:'forbidden'},403);
  if(reply.state==='sent'){
   const {error:reconcileError}=await db.from('contact_messages').update({status:'replied',replied_at:reply.sent_at}).eq('id',reply.contact_message_id);
   return reconcileError?json({error:'delivery_record_pending'},503):json({state:'sent'});
  }
  if(!configured)return json({error:'email_not_configured'},503);
  const {data:message,error:messageError}=await db.from('contact_messages').select('id,email').eq('id',reply.contact_message_id).single();
  if(messageError||!message)return json({error:'not_found'},404);
  let payload=reply.delivery_payload;
  if(reply.state==='draft'){
   const html=sanitizeHtml(reply.body_html,{allowedTags:['p','br','strong','b','em','i','u','s','ul','ol','li','blockquote','h2','h3','a','pre','code'],allowedAttributes:{a:['href','title'],p:['style'],h2:['style'],h3:['style']},allowedSchemes:['https','http','mailto'],allowProtocolRelative:false,allowedStyles:{'*':{'text-align':[/^(left|center|right)$/]}}});
   const text=sanitizeHtml(html.replace(/<\/(p|li|h2|h3|blockquote)>/g,'\n').replace(/<br\s*\/?>/g,'\n'),{allowedTags:[],allowedAttributes:{}}).trim();
   if(!text||text.length>15000)return json({error:'empty_or_long_reply'},400);
   payload={from,to:[message.email],subject:reply.subject.replace(/[\r\n]/g,' ').trim(),html,text};
   const {data:claimed,error:claimError}=await db.from('contact_replies').update({state:'sending',body_html:html,body_text:text,delivery_payload:payload,attempted_at:new Date().toISOString(),error_code:null}).eq('id',reply.id).eq('state','draft').eq('body_html',reply.body_html).eq('subject',reply.subject).select('id').maybeSingle();
   if(claimError||!claimed)return json({error:'reply_changed_or_busy'},409);
  }else{
   const age=Date.now()-Date.parse(reply.attempted_at);
   if(!payload||!Number.isFinite(age)||age>23*60*60*1000)return json({error:'manual_review_required'},409);
   if(reply.state==='sending'&&age<60000)return json({error:'sending'},409);
  }
  let result:Response;
  try{result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`contact-reply-${reply.id}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});}
  catch{await db.from('contact_replies').update({state:'unknown',error_code:'delivery_unknown'}).eq('id',reply.id).neq('state','sent');return json({error:'delivery_unknown'},502);}
  const provider=await result.json().catch(()=>({}));
  if(!result.ok){const uncertain=result.status>=500||result.status===409;await db.from('contact_replies').update({state:uncertain?'unknown':'failed',error_code:uncertain?'delivery_unknown':'provider_rejected'}).eq('id',reply.id).neq('state','sent');return json({error:uncertain?'delivery_unknown':'provider_rejected'},502);}
  if(!provider.id){await db.from('contact_replies').update({state:'unknown',error_code:'delivery_unknown'}).eq('id',reply.id).neq('state','sent');return json({error:'delivery_unknown'},502);}
  const sentAt=new Date().toISOString();
  const {error:saveError}=await db.from('contact_replies').update({state:'sent',provider_id:provider.id,sent_at:sentAt,error_code:null}).eq('id',reply.id);
  if(saveError)return json({error:'delivery_record_pending'},503);
  const {error:messageSaveError}=await db.from('contact_messages').update({status:'replied',replied_at:sentAt}).eq('id',message.id);
  if(messageSaveError)return json({error:'delivery_record_pending'},503);
  return json({state:'sent'});
 }catch{return json({error:'unexpected_error'},500);}
});
