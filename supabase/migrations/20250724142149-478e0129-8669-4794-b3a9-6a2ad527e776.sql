-- First, let's fix the RLS policies to use proper authentication instead of 'true'

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "alarms_insert_policy" ON public.alarms;
DROP POLICY IF EXISTS "alarms_select_policy" ON public.alarms;
DROP POLICY IF EXISTS "alarms_update_policy" ON public.alarms;
DROP POLICY IF EXISTS "device_status_insert_policy" ON public.device_status;
DROP POLICY IF EXISTS "device_status_select_policy" ON public.device_status;
DROP POLICY IF EXISTS "device_status_update_policy" ON public.device_status;
DROP POLICY IF EXISTS "fcm_tokens_insert_policy" ON public.fcm_tokens;
DROP POLICY IF EXISTS "fcm_tokens_select_policy" ON public.fcm_tokens;
DROP POLICY IF EXISTS "fcm_tokens_update_policy" ON public.fcm_tokens;
DROP POLICY IF EXISTS "fcm_tokens_delete_policy" ON public.fcm_tokens;
DROP POLICY IF EXISTS "user_devices_insert_policy" ON public.user_devices;
DROP POLICY IF EXISTS "user_devices_update_policy" ON public.user_devices;
DROP POLICY IF EXISTS "user_devices_delete_policy" ON public.user_devices;

-- Create a profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_code TEXT UNIQUE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Add user_id columns to existing tables to link to authenticated users
ALTER TABLE public.alarms ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.device_status ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.fcm_tokens ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_devices ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create secure RLS policies using proper authentication

-- Alarms policies
CREATE POLICY "Users can view their own alarms" 
ON public.alarms 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service can insert alarms" 
ON public.alarms 
FOR INSERT 
WITH CHECK (true); -- Edge functions will handle this

CREATE POLICY "Users can update their own alarms" 
ON public.alarms 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Device status policies
CREATE POLICY "Users can view their own device status" 
ON public.device_status 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service can insert/update device status" 
ON public.device_status 
FOR INSERT 
WITH CHECK (true); -- Edge functions will handle this

CREATE POLICY "Service can update device status" 
ON public.device_status 
FOR UPDATE 
USING (true); -- Edge functions will handle this

-- FCM tokens policies
CREATE POLICY "Users can manage their own FCM tokens" 
ON public.fcm_tokens 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- User devices policies
CREATE POLICY "Users can manage their own devices" 
ON public.user_devices 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get user by user_code for migration
CREATE OR REPLACE FUNCTION public.get_user_by_code(code TEXT)
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.profiles WHERE user_code = code LIMIT 1;
$$;