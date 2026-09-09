import {createClient} from 'npm:@supabase/supabase-js@2.58.0';
import {findProfilePhoto,limitedBytes,imageType} from './photo.ts';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return json({error:'method_not_allowed'},405);
 try{
  const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return json({error:'unauthorized'},401);
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:auth,error}=await db.auth.getUser(token);if(error||!auth.user)return json({error:'unauthorized'},401);
  const {data:profile}=await db.from('profiles').select('role').eq('id',auth.user.id).single();
  if(!['admin','super_admin'].includes(profile?.role))return json({error:'forbidden'},403);
  const raw=await req.text();if(raw.length>512)return json({error:'invalid_number'},400);
  const body=JSON.parse(raw);const number=typeof body.number==='string'?body.number.replace(/[\s()+-]/g,''):'';
  if(!/^[1-9]\d{7,14}$/.test(number))return json({error:'invalid_number'},400);
  // Only request the public page and its public photo. No login, cookies or bypasses.
  const page=await fetch(`https://api.whatsapp.com/send/?phone=${number}`,{redirect:'error',signal:AbortSignal.timeout(12000)});
  const html=new TextDecoder().decode(await limitedBytes(page,1500000));
  const source=findProfilePhoto(html);if(!source)return json({error:'photo_unavailable'});
  const photo=await fetch(source,{redirect:'error',signal:AbortSignal.timeout(12000)});
  const bytes=await limitedBytes(photo,2000000);const type=imageType(bytes);
  if(!type)return json({error:'photo_unavailable'});
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(value=>value.toString(16).padStart(2,'0')).join('');
  const ext=type==='image/jpeg'?'jpg':type==='image/png'?'png':'webp';const path=`whatsapp-photos/${hash}.${ext}`;
  const {error:uploadError}=await db.storage.from('logos').upload(path,bytes,{contentType:type,upsert:true,cacheControl:'31536000'});
  if(uploadError)return json({error:'photo_storage_failed'});
  const {data}=db.storage.from('logos').getPublicUrl(path);
  return json({photo:data.publicUrl});
 }catch{return json({error:'photo_unavailable'});}
});
