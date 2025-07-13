-- Update RLS policies to allow public read access for user codes and devices
-- This is needed for the login functionality to work

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "user_codes_select_policy" ON public.user_codes;
DROP POLICY IF EXISTS "user_devices_select_policy" ON public.user_devices;

-- Create new permissive policies for reading user codes and devices
CREATE POLICY "Allow public read access to user codes" 
ON public.user_codes 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public read access to user devices" 
ON public.user_devices 
FOR SELECT 
USING (true);

-- Test that DEMO01 data is accessible
SELECT 'Testing DEMO01 code exists:' as test, user_code FROM user_codes WHERE user_code = 'DEMO01';
SELECT 'Testing DEMO01 devices exist:' as test, user_code, device_id FROM user_devices WHERE user_code = 'DEMO01';