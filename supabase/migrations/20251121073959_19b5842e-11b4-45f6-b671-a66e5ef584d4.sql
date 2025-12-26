-- Fix security warnings: Set search_path for functions

-- Update handle_new_user function with search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nip, full_name, email, role, can_teach)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nip', ''),
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'teacher'),
    COALESCE((new.raw_user_meta_data->>'can_teach')::boolean, false)
  );
  RETURN new;
END;
$$;

-- Update handle_updated_at function with search_path
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;