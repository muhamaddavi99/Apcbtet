-- Create table for uptime history
CREATE TABLE public.uptime_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_healthy BOOLEAN NOT NULL DEFAULT true,
  database_response_ms INTEGER,
  api_response_ms INTEGER,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.uptime_history ENABLE ROW LEVEL SECURITY;

-- Anyone can view uptime history
CREATE POLICY "Anyone can view uptime history" 
ON public.uptime_history 
FOR SELECT 
USING (true);

-- Only service role can insert (via edge function)
CREATE POLICY "Service role can insert uptime history" 
ON public.uptime_history 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_uptime_history_checked_at ON public.uptime_history(checked_at DESC);