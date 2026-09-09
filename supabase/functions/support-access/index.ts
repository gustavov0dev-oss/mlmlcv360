import {createClient} from 'npm:@supabase/supabase-js@2.58.0';
import {canSupportAccess,canAccessUnconfirmed} from './policy.ts';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return json({error:'Método no permitido'},405);
 try {
 const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');if(!token)return json({error:'Inicia sesión nuevamente'},401);
 const url=Deno.env.get('SUPABASE_URL')!;
 const db=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error}=await db.auth.getUser(token);if(error||!auth.user)return json({error:'Sesión no válida'},401);
 const raw=await req.text();if(raw.length>256)return json({error:'Solicitud no válida'},400);
 const {targetId}=JSON.parse(raw);if(typeof targetId!=='string'||!/^[a-f0-9-]{36}$/i.test(targetId))return json({error:'Usuario no válido'},400);
 const [a,t,c]=await Promise.all([db.from('profiles').select('id,role,status').eq('id',auth.user.id).single(),db.from('profiles').select('id,role,status,full_name').eq('id',targetId).single(),db.from('system_config').select('value').eq('key','role_permissions').maybeSingle()]);
 let permissions={};try{permissions=typeof c.data?.value==='string'?JSON.parse(c.data.value):c.data?.value||{};}catch{return json({error:'No se pudieron comprobar los permisos'},403);}
 if(a.error||t.error||c.error||!canSupportAccess(a.data,t.data,permissions))return json({error:'No tienes permiso para acceder a esta cuenta. Revisa tu rol y el permiso de acceso como usuario.'},403);
 const {data:target,error:targetError}=await db.auth.admin.getUserById(targetId);
 if(targetError||!target.user?.email)return json({error:'No se encontró la cuenta de autenticación de este usuario'},409);
 const unconfirmed=!target.user.email_confirmed_at;
 if(!canAccessUnconfirmed(a.data.role,!unconfirmed))return json({error:'Solo el superadministrador puede acceder mientras el correo está pendiente'},403);
 const {error:auditError}=await db.from('support_access_audit').insert({actor_id:auth.user.id,target_id:targetId});if(auditError)return json({error:'No se pudo registrar el acceso'},500);
 const {data:link,error:linkError}=await db.auth.admin.generateLink({type:'magiclink',email:target.user.email});if(linkError||!link.properties?.hashed_token)return json({error:'No se pudo iniciar el acceso'},500);
 const client=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:verified,error:verifyError}=await client.auth.verifyOtp({token_hash:link.properties.hashed_token,type:link.properties.verification_type==='signup'?'signup':'magiclink'});
 if(verifyError||!verified.session||verified.user?.id!==targetId)return json({error:'No se pudo iniciar la sesión de usuario'},500);
 if(unconfirmed&&verified.user.email_confirmed_at){
 const restored=await db.rpc('restore_support_email_state',{p_user_id:targetId,p_expected:verified.user.email_confirmed_at});
 if(restored.error||restored.data!==true){await client.auth.signOut({scope:'local'});return json({error:'No se pudo conservar el estado del correo. El acceso se canceló.'},500);}
 }
 return json({session:{access_token:verified.session.access_token,refresh_token:verified.session.refresh_token},name:t.data.full_name});
 }catch{return json({error:'No se pudo iniciar el acceso. Inténtalo nuevamente.'},500);}
});
