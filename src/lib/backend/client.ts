import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supportMode = sessionStorage.getItem('mlm360-support-mode') === '1';
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, supportMode ? {auth:{storage:sessionStorage,storageKey:'mlm360-support-auth',detectSessionInUrl:false}} : undefined);
