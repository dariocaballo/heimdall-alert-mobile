-- Create table for storing Shelly Fleet Manager credentials
CREATE TABLE public.sfm_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_code TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  sfm_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sfm_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies for SFM credentials
CREATE POLICY "Users can view their own SFM credentials" 
ON public.sfm_credentials 
FOR SELECT 
USING (user_code = current_setting('request.jwt.claims', true)::json->>'user_code');

CREATE POLICY "Users can insert their own SFM credentials" 
ON public.sfm_credentials 
FOR INSERT 
WITH CHECK (user_code = current_setting('request.jwt.claims', true)::json->>'user_code');

CREATE POLICY "Users can update their own SFM credentials" 
ON public.sfm_credentials 
FOR UPDATE 
USING (user_code = current_setting('request.jwt.claims', true)::json->>'user_code');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sfm_credentials_updated_at
BEFORE UPDATE ON public.sfm_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_sfm_credentials_user_code ON public.sfm_credentials(user_code);