import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'super_admin' | 'admin' | 'inspector' | 'user' | 'support';
export type MlmRank = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'crown';
export type MlmPlan = string; // dynamic — comes from plans table
export type UserStatus = 'active' | 'suspended' | 'pending' | 'inactive';

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  status: UserStatus;
  rank: MlmRank;
  plan: MlmPlan;
  referral_code?: string;
  invite_link?: string;
  slug?: string;
  bio?: string;
  sponsor_id?: string;
  binary_position?: string;
  force_password_change?: boolean;
  email_confirmed?: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}
