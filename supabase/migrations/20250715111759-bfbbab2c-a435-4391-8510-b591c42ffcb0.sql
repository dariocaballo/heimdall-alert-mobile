-- Enable realtime for device_status table
ALTER TABLE public.device_status REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.device_status;

-- Enable realtime for alarms table  
ALTER TABLE public.alarms REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.alarms;