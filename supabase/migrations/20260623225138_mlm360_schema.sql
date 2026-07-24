
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles enum
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'inspector', 'user', 'support');

-- MLM ranks enum
CREATE TYPE mlm_rank AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond', 'crown');

-- MLM plans enum
CREATE TYPE mlm_plan AS ENUM ('inicio', 'pro', 'elite');

-- User status enum
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending', 'inactive');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'user',
  status user_status NOT NULL DEFAULT 'pending',
  rank mlm_rank NOT NULL DEFAULT 'bronze',
  plan mlm_plan NOT NULL DEFAULT 'inicio',
  referral_code TEXT UNIQUE,
  sponsor_id UUID REFERENCES profiles(id),
  binary_position TEXT CHECK (binary_position IN ('left', 'right')),
  force_password_change BOOLEAN DEFAULT TRUE,
  email_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_profiles" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- Admin can manage all profiles
CREATE POLICY "admin_select_all_profiles" ON profiles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin', 'inspector'))
);
CREATE POLICY "admin_update_all_profiles" ON profiles FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin'))
);

-- Commissions table
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  from_user_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL CHECK (type IN ('direct', 'binary', 'rank_bonus', 'unilevel', 'residual')),
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'PEN',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_commissions" ON commissions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_commissions" ON commissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_commissions" ON commissions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin'))
);
CREATE POLICY "delete_commissions" ON commissions FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin'))
);

-- Activity log table
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_activity" ON activity_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_activity" ON activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_activity" ON activity_logs FOR UPDATE TO authenticated USING (false);
CREATE POLICY "delete_activity" ON activity_logs FOR DELETE TO authenticated USING (false);

CREATE POLICY "admin_select_activity" ON activity_logs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin', 'inspector'))
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- MLM Tree / genealogy
CREATE TABLE mlm_tree (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id),
  parent_id UUID REFERENCES mlm_tree(id),
  position TEXT CHECK (position IN ('left', 'right')),
  level INTEGER DEFAULT 0,
  left_volume DECIMAL(12,2) DEFAULT 0,
  right_volume DECIMAL(12,2) DEFAULT 0,
  total_downline INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mlm_tree ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_mlm_tree" ON mlm_tree FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_mlm_tree" ON mlm_tree FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_mlm_tree" ON mlm_tree FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin'))
);
CREATE POLICY "delete_mlm_tree" ON mlm_tree FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin'))
);

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, username, full_name, referral_code, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    upper(substring(md5(NEW.id::text) from 1 for 8)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user'),
    'active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
