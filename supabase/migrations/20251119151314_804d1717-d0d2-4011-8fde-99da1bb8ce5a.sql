-- Create enum for sport types
CREATE TYPE public.sport_type AS ENUM ('swim', 'bike', 'run');

-- Create profiles table with race date
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  race_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create race estimates table
CREATE TABLE public.race_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  swim_minutes INTEGER NOT NULL DEFAULT 45,
  bike_minutes INTEGER NOT NULL DEFAULT 180,
  run_minutes INTEGER NOT NULL DEFAULT 120,
  t1_minutes INTEGER NOT NULL DEFAULT 3,
  t2_minutes INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.race_estimates ENABLE ROW LEVEL SECURITY;

-- RLS policies for race estimates
CREATE POLICY "Users can view own estimates"
  ON public.race_estimates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own estimates"
  ON public.race_estimates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own estimates"
  ON public.race_estimates FOR UPDATE
  USING (auth.uid() = user_id);

-- Create workouts table
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sport sport_type NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  distance_km NUMERIC(6,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- RLS policies for workouts
CREATE POLICY "Users can view own workouts"
  ON public.workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workouts"
  ON public.workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workouts"
  ON public.workouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workouts"
  ON public.workouts FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for race_estimates
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.race_estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, race_date)
  VALUES (NEW.id, CURRENT_DATE + INTERVAL '90 days');
  
  INSERT INTO public.race_estimates (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create profile and estimates on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();