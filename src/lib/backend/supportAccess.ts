import { createClient } from '@supabase/supabase-js';
import { supabase, supportMode } from './client';
// Provider-specific session handling stays behind this adapter for a future backend migration.
export async function startSupportAccess(targetId:string) {
 if(supportMode)throw new Error('Regresa primero a tu cuenta de administrador');
 const {data,error}=await supabase.functions.invoke('support-access',{body:{targetId}});
 if(error||data?.error||!data?.session)throw new Error(data?.error||'No se pudo acceder. Verifica tus permisos y que la cuenta esté activa con correo confirmado.');
 const isolated=createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_ANON_KEY,{auth:{storage:sessionStorage,storageKey:'mlm360-support-auth',detectSessionInUrl:false,autoRefreshToken:false}});
 const result=await isolated.auth.setSession(data.session);
 if(result.error)throw new Error('No se pudo abrir la sesión de usuario');
 sessionStorage.setItem('mlm360-support-mode','1');
 sessionStorage.setItem('mlm360-support-name',data.name||'Usuario');
 window.location.assign('/dashboard');
}
export async function endSupportAccess() {
 if(!supportMode)return;
 try {await supabase.auth.signOut({scope:'local'});} finally {
 sessionStorage.removeItem('mlm360-support-mode');sessionStorage.removeItem('mlm360-support-auth');sessionStorage.removeItem('mlm360-support-name');
 window.location.assign('/dashboard/usuarios');
 }
}
