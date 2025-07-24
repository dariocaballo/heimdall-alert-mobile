-- Fix the device_overview view by recreating it without security definer issues
DROP VIEW IF EXISTS public.device_overview;

-- Recreate as a simple view without security definer
CREATE VIEW public.device_overview AS 
SELECT 
    ud.device_id,
    ud.user_code,
    ud.user_id,
    ud.created_at AS device_added,
    ds.online,
    ds.smoke,
    ds.temperature,
    ds.battery_level,
    ds.signal_strength,
    ds.last_seen,
    ds.raw_data AS latest_data
FROM public.user_devices ud
LEFT JOIN public.device_status ds ON ud.device_id = ds.device_id;