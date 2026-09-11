import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const headers = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Content-Type":"application/json"};
Deno.serve(async req => {
  if(req.method === 'OPTIONS') return new Response('ok',{headers});
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const json = (data:unknown,status=200)=>new Response(JSON.stringify(data),{headers,status});
  const token=req.headers.get('Authorization')?.replace(/^Bearer /i,'');
  const {data:{user}}=await db.auth.getUser(token || '');
  if(!user) return json({success:false,error:'Inicia sesión para actualizar el tipo de cambio.'},401);
  const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single();
  if(!['admin','super_admin'].includes(profile?.role)) return json({success:false,error:'No autorizado'},403);
  const {data:rows,error}=await db.from('system_config').select('key,value').in('key',['fixer_api_key','exchange_rate_usd']);
  if(error) return json({success:false,error:'No se pudo leer la configuración.'});
  const config=Object.fromEntries((rows||[]).map(r=>[r.key,r.value]));
  const key=config.fixer_api_key?.trim();
  if(!key) return json({success:false,error:'Guarda tu API key de Fixer antes de actualizar.'});
  try {
    const url=new URL('https://data.fixer.io/api/latest');
    url.searchParams.set('access_key',key); url.searchParams.set('symbols','USD,PEN');
    const response=await fetch(url,{signal:AbortSignal.timeout(12000)});
    const data=await response.json();
    if(!response.ok || !data.success) {
      const messages:Record<string,string>={101:'La API key de Fixer no es válida.',104:'Se agotó la cuota de consultas de Fixer.',105:'Tu plan de Fixer no permite esta consulta.',102:'La cuenta de Fixer está inactiva.'};
      return json({success:false,error:messages[String(data.error?.code)] || 'Fixer no pudo devolver una tasa. Revisa tu cuenta y plan.',source:'stored',rate:Number(config.exchange_rate_usd)||null});
    }
    const rate=Math.round((Number(data.rates?.PEN)/Number(data.rates?.USD))*10000)/10000;
    if(!Number.isFinite(rate)||rate<=0) throw new Error('invalid');
    const {error:saveError}=await db.from('system_config').upsert({key:'exchange_rate_usd',value:String(rate),category:'currency',updated_at:new Date().toISOString()},{onConflict:'key'});
    if(saveError) return json({success:false,error:'Se obtuvo la tasa, pero no se pudo guardar.'});
    return json({success:true,rate,source:'fixer.io',date:data.date});
  } catch {return json({success:false,error:'No se pudo conectar con Fixer. Conservamos la última tasa guardada.'});}
});
