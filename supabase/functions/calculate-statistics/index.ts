import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Starting statistics calculation...');

    // Fetch all workouts
    const { data: workouts, error: workoutsError } = await supabase
      .from('workouts')
      .select('sport, distance_km, duration_minutes');

    if (workoutsError) {
      console.error('Error fetching workouts:', workoutsError);
      throw workoutsError;
    }

    console.log(`Found ${workouts?.length || 0} workouts`);

    // Calculate statistics per sport
    const sports = ['swim', 'bike', 'run'];
    const statistics = [];

    for (const sport of sports) {
      const sportWorkouts = workouts?.filter(w => w.sport === sport) || [];
      
      if (sportWorkouts.length > 0) {
        const avgDistance = sportWorkouts.reduce((sum, w) => sum + Number(w.distance_km), 0) / sportWorkouts.length;
        const avgDuration = sportWorkouts.reduce((sum, w) => sum + Number(w.duration_minutes), 0) / sportWorkouts.length;

        statistics.push({
          sport,
          avg_distance_km: avgDistance,
          avg_duration_minutes: avgDuration,
          total_workouts: sportWorkouts.length,
          calculated_at: new Date().toISOString()
        });

        console.log(`${sport}: ${sportWorkouts.length} workouts, avg distance: ${avgDistance.toFixed(2)}km, avg duration: ${avgDuration.toFixed(2)}min`);
      }
    }

    // Insert statistics
    if (statistics.length > 0) {
      const { error: insertError } = await supabase
        .from('workout_statistics')
        .insert(statistics);

      if (insertError) {
        console.error('Error inserting statistics:', insertError);
        throw insertError;
      }

      console.log(`Successfully saved ${statistics.length} statistics records`);
    } else {
      console.log('No workouts found, skipping statistics insert');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        statistics,
        message: `Calculated statistics for ${statistics.length} sports` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in calculate-statistics function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
