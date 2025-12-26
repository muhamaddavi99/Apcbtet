-- Create table to store push notification subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can view own subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
ON public.push_subscriptions
FOR DELETE
USING (auth.uid() = user_id);

-- Service role can view all for sending notifications
CREATE POLICY "Service role can view all subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (true);