-- Enable RLS on both tables (if not already enabled)
ALTER TABLE public.alarms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_status ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Service can insert alarms" ON public.alarms;
DROP POLICY IF EXISTS "Users can update their own alarms" ON public.alarms;
DROP POLICY IF EXISTS "Users can view their own alarms" ON public.alarms;
DROP POLICY IF EXISTS "Service can insert/update device status" ON public.device_status;
DROP POLICY IF EXISTS "Service can update device status" ON public.device_status;
DROP POLICY IF EXISTS "Users can view their own device status" ON public.device_status;

-- Create new policies for alarms table
CREATE POLICY "Allow inserting alarms with valid user_code" 
ON public.alarms 
FOR INSERT 
WITH CHECK (
  user_code IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.user_codes 
    WHERE user_codes.user_code = alarms.user_code
  )
);

CREATE POLICY "Allow viewing alarms by user_code" 
ON public.alarms 
FOR SELECT 
USING (
  user_code IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.user_codes 
    WHERE user_codes.user_code = alarms.user_code
  )
);

CREATE POLICY "Allow updating alarms by user_code" 
ON public.alarms 
FOR UPDATE 
USING (
  user_code IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.user_codes 
    WHERE user_codes.user_code = alarms.user_code
  )
)
WITH CHECK (
  user_code IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.user_codes 
    WHERE user_codes.user_code = alarms.user_code
  )
);

-- Create new policies for device_status table
CREATE POLICY "Insert device_status by user_code" 
ON public.device_status 
FOR INSERT 
WITH CHECK (
  user_code IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.user_codes 
    WHERE user_codes.user_code = device_status.user_code
  )
);

CREATE POLICY "Select device_status by user_code" 
ON public.device_status 
FOR SELECT 
USING (
  user_code IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.user_codes 
    WHERE user_codes.user_code = device_status.user_code
  )
);

CREATE POLICY "Update device_status by user_code" 
ON public.device_status 
FOR UPDATE 
USING (
  user_code IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.user_codes 
    WHERE user_codes.user_code = device_status.user_code
  )
)
WITH CHECK (
  user_code IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.user_codes 
    WHERE user_codes.user_code = device_status.user_code
  )
);

CREATE POLICY "Delete device_status by user_code" 
ON public.device_status 
FOR DELETE 
USING (
  user_code IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.user_codes 
    WHERE user_codes.user_code = device_status.user_code
  )
);