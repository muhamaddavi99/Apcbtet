-- Drop and recreate the schedules_day_check constraint with correct days
ALTER TABLE public.schedules DROP CONSTRAINT schedules_day_check;
ALTER TABLE public.schedules ADD CONSTRAINT schedules_day_check 
CHECK (day = ANY (ARRAY['Senin'::text, 'Selasa'::text, 'Rabu'::text, 'Kamis'::text, 'Sabtu'::text, 'Ahad'::text]));