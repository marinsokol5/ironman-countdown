-- Enable realtime for workout_statistics table
ALTER TABLE public.workout_statistics REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_statistics;