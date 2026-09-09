import { createClient } from '@supabase/supabase-js';
import { supabase, supportMode } from './client';
export let returningFromSupport = false;
// Provider-specific session handling stays behind this adapter for a future backend migration.
export async function startSupportAccess(targetId:string) {
 if(supportMode)throw new Error('Regresa primero a tu cuenta de administrador');
 const {data,error}=await supabase.functions.invoke('support-access',{body:{targetId}});
 if(error){
 let detail='No se pudo acceder. Vuelve a iniciar sesión e inténtalo de nuevo.';
 try{const response=(error as unknown as {context?:Response}).context;const body=await response?.json();if(body?.error)detail=body.error;else if(body?.message)detail=body.message;}catch{/* Keep the readable fallback. */}
 throw new Error(detail);
 }
 if(data?.error||!data?.session)throw new Error(data?.error||'No se pudo abrir la sesión de usuario');
 const isolated=createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_ANON_KEY,{auth:{storage:sessionStorage,storageKey:'mlm360-support-auth',detectSessionInUrl:false,autoRefreshToken:false}});
 const result=await isolated.auth.setSession(data.session);
 if(result.error)throw new Error('No se pudo abrir la sesión de usuario');
 sessionStorage.setItem('mlm360-support-mode','1');
 sessionStorage.setItem('mlm360-support-name',data.name||'Usuario');
 window.location.assign('/dashboard');
}
export async function endSupportAccess() {
 if(!supportMode || returningFromSupport)return;
 returningFromSupport = true;
 try {await supabase.auth.signOut({scope:'local'});} finally {
 sessionStorage.removeItem('mlm360-support-mode');sessionStorage.removeItem('mlm360-support-auth');sessionStorage.removeItem('mlm360-support-name');
 window.location.assign('/dashboard/usuarios');
 }
}
