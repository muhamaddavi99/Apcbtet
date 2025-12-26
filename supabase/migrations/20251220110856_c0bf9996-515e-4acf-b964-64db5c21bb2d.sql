-- Add avatar_url column to students table for profile photo
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add school_icon_url to store school icon (we'll use localStorage for now, but could add a settings table later)