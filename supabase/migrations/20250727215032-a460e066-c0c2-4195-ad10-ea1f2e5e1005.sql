-- Fix critical security issues

-- 1. Fix RLS policies - Remove public access and add proper user-based policies
DROP POLICY IF EXISTS "Allow public read access to user codes" ON public.user_codes;
DROP POLICY IF EXISTS "Allow public read access to user devices" ON public.user_devices;

-- Create secure RLS policies for user_codes (only authenticated users can see their own codes)
CREATE POLICY "Users can view their own user codes" 
ON public.user_codes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_code = user_codes.user_code 
    AND profiles.id = auth.uid()
  )
);

-- Create secure RLS policies for user_devices (users can only see their own devices)
CREATE POLICY "Users can view their own devices only" 
ON public.user_devices 
FOR SELECT 
USING (auth.uid() = user_id);

-- Enable RLS on device_overview and add proper policies
ALTER TABLE public.device_overview ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own device overview" 
ON public.device_overview 
FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Make user_id columns non-nullable where they should be required
ALTER TABLE public.device_status ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.alarms ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.fcm_tokens ALTER COLUMN user_id SET NOT NULL;

-- 3. Create triggers to automatically populate user_id fields
CREATE OR REPLACE FUNCTION public.set_user_id_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers to ensure user_id is always set
CREATE TRIGGER set_device_status_user_id
  BEFORE INSERT ON public.device_status
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id_from_auth();

CREATE TRIGGER set_alarms_user_id
  BEFORE INSERT ON public.alarms
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id_from_auth();

CREATE TRIGGER set_fcm_tokens_user_id
  BEFORE INSERT ON public.fcm_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id_from_auth();