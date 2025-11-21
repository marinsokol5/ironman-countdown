-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create table to store workout statistics
CREATE TABLE IF NOT EXISTS public.workout_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport sport_type NOT NULL,
  avg_distance_km numeric,
  avg_duration_minutes numeric,
  total_workouts integer,
  calculated_at timestamp with time zone DEFAULT now(),
  UNIQUE(sport, calculated_at)
);

-- Enable RLS
ALTER TABLE public.workout_statistics ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read statistics
CREATE POLICY "Anyone can view statistics"
ON public.workout_statistics
FOR SELECT
USING (true);

-- Only service role can insert/update statistics
CREATE POLICY "Service role can manage statistics"
ON public.workout_statistics
FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Create index for faster queries
CREATE INDEX idx_workout_statistics_sport_date ON public.workout_statistics(sport, calculated_at DESC);