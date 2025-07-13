-- Skapa tabeller för FCM tokens och förbättra existing struktur
-- =====================================================

-- 1. Skapa FCM tokens tabell för push notifications
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_code TEXT NOT NULL,
  fcm_token TEXT NOT NULL UNIQUE,
  device_info JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Lägg till indexes för prestanda
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_code ON public.fcm_tokens(user_code);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON public.fcm_tokens(fcm_token);
CREATE INDEX IF NOT EXISTS idx_user_devices_user_code ON public.user_devices(user_code);
CREATE INDEX IF NOT EXISTS idx_user_devices_device_id ON public.user_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_alarms_timestamp ON public.alarms(timestamp DESC);

-- 3. Lägg till kolumner som saknas i alarms tabellen
ALTER TABLE public.alarms 
ADD COLUMN IF NOT EXISTS device_id TEXT,
ADD COLUMN IF NOT EXISTS user_code TEXT,
ADD COLUMN IF NOT EXISTS alarm_type TEXT DEFAULT 'smoke',
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS acknowledged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS acknowledged_by TEXT;

-- 4. Skapa en tabell för device status (real-time data från Shelly)
CREATE TABLE IF NOT EXISTS public.device_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  user_code TEXT NOT NULL,
  online BOOLEAN DEFAULT false,
  smoke BOOLEAN DEFAULT false,
  temperature NUMERIC,
  battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
  signal_strength INTEGER,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(device_id)
);

-- 5. Skapa index för device_status
CREATE INDEX IF NOT EXISTS idx_device_status_device_id ON public.device_status(device_id);
CREATE INDEX IF NOT EXISTS idx_device_status_user_code ON public.device_status(user_code);
CREATE INDEX IF NOT EXISTS idx_device_status_last_seen ON public.device_status(last_seen DESC);

-- 6. Enable Row Level Security på alla tabeller
ALTER TABLE public.user_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alarms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_status ENABLE ROW LEVEL SECURITY;

-- 7. Skapa RLS policies för user_codes (endast läsning via Edge Functions)
DROP POLICY IF EXISTS "user_codes_select_policy" ON public.user_codes;
CREATE POLICY "user_codes_select_policy" 
ON public.user_codes 
FOR SELECT 
USING (true); -- Öppen läsning för Edge Functions

-- 8. RLS policies för user_devices
DROP POLICY IF EXISTS "user_devices_select_policy" ON public.user_devices;
DROP POLICY IF EXISTS "user_devices_insert_policy" ON public.user_devices;
DROP POLICY IF EXISTS "user_devices_update_policy" ON public.user_devices;
DROP POLICY IF EXISTS "user_devices_delete_policy" ON public.user_devices;

CREATE POLICY "user_devices_select_policy" 
ON public.user_devices 
FOR SELECT 
USING (true);

CREATE POLICY "user_devices_insert_policy" 
ON public.user_devices 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "user_devices_update_policy" 
ON public.user_devices 
FOR UPDATE 
USING (true);

CREATE POLICY "user_devices_delete_policy" 
ON public.user_devices 
FOR DELETE 
USING (true);

-- 9. RLS policies för alarms
DROP POLICY IF EXISTS "alarms_select_policy" ON public.alarms;
DROP POLICY IF EXISTS "alarms_insert_policy" ON public.alarms;
DROP POLICY IF EXISTS "alarms_update_policy" ON public.alarms;

CREATE POLICY "alarms_select_policy" 
ON public.alarms 
FOR SELECT 
USING (true);

CREATE POLICY "alarms_insert_policy" 
ON public.alarms 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "alarms_update_policy" 
ON public.alarms 
FOR UPDATE 
USING (true);

-- 10. RLS policies för fcm_tokens
DROP POLICY IF EXISTS "fcm_tokens_select_policy" ON public.fcm_tokens;
DROP POLICY IF EXISTS "fcm_tokens_insert_policy" ON public.fcm_tokens;
DROP POLICY IF EXISTS "fcm_tokens_update_policy" ON public.fcm_tokens;
DROP POLICY IF EXISTS "fcm_tokens_delete_policy" ON public.fcm_tokens;

CREATE POLICY "fcm_tokens_select_policy" 
ON public.fcm_tokens 
FOR SELECT 
USING (true);

CREATE POLICY "fcm_tokens_insert_policy" 
ON public.fcm_tokens 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "fcm_tokens_update_policy" 
ON public.fcm_tokens 
FOR UPDATE 
USING (true);

CREATE POLICY "fcm_tokens_delete_policy" 
ON public.fcm_tokens 
FOR DELETE 
USING (true);

-- 11. RLS policies för device_status
DROP POLICY IF EXISTS "device_status_select_policy" ON public.device_status;
DROP POLICY IF EXISTS "device_status_insert_policy" ON public.device_status;
DROP POLICY IF EXISTS "device_status_update_policy" ON public.device_status;

CREATE POLICY "device_status_select_policy" 
ON public.device_status 
FOR SELECT 
USING (true);

CREATE POLICY "device_status_insert_policy" 
ON public.device_status 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "device_status_update_policy" 
ON public.device_status 
FOR UPDATE 
USING (true);

-- 12. Skapa funktion för updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Skapa triggers för updated_at
DROP TRIGGER IF EXISTS update_fcm_tokens_updated_at ON public.fcm_tokens;
CREATE TRIGGER update_fcm_tokens_updated_at
  BEFORE UPDATE ON public.fcm_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_device_status_updated_at ON public.device_status;
CREATE TRIGGER update_device_status_updated_at
  BEFORE UPDATE ON public.device_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Enable realtime för alla tabeller
ALTER PUBLICATION supabase_realtime ADD TABLE public.alarms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_devices;

-- 15. Skapa en view för enkel åtkomst till device info med status
CREATE OR REPLACE VIEW public.device_overview AS
SELECT 
  ud.device_id,
  ud.user_code,
  ud.created_at as device_added,
  ds.online,
  ds.smoke,
  ds.temperature,
  ds.battery_level,
  ds.signal_strength,
  ds.last_seen,
  ds.raw_data as latest_data
FROM public.user_devices ud
LEFT JOIN public.device_status ds ON ud.device_id = ds.device_id;

-- 16. Lägg till sample data för 6-siffriga koder (om det behövs fler)
-- Detta genererar 500 unika 6-siffriga koder
DO $$
DECLARE
  code_count INTEGER;
  new_code TEXT;
  codes_needed INTEGER := 500;
BEGIN
  SELECT COUNT(*) INTO code_count FROM public.user_codes;
  
  IF code_count < codes_needed THEN
    FOR i IN 1..(codes_needed - code_count) LOOP
      -- Generera 6-siffrig kod
      new_code := LPAD((RANDOM() * 999999)::INTEGER::TEXT, 6, '0');
      
      -- Kontrollera att koden inte redan finns
      WHILE EXISTS (SELECT 1 FROM public.user_codes WHERE user_code = new_code) LOOP
        new_code := LPAD((RANDOM() * 999999)::INTEGER::TEXT, 6, '0');
      END LOOP;
      
      INSERT INTO public.user_codes (user_code) VALUES (new_code);
    END LOOP;
  END IF;
END $$;