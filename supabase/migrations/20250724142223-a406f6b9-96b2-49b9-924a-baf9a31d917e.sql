-- Fix the security definer function issues identified by the linter

-- Update the function to have proper search path
CREATE OR REPLACE FUNCTION public.get_user_by_code(code TEXT)
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_code = code LIMIT 1;
$$;

-- Also fix the update_updated_at_column function 
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;