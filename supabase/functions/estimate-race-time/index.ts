import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);
    
    if (userError) {
      console.error('Error getting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed', details: userError.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!user) {
      console.error('No user found after auth');
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Generate random finish time between 4-6 hours (240-360 minutes)
    const totalMinutes = 240 + Math.random() * 120;
    
    // Distribute time across segments with realistic proportions
    // Ironman 70.3: Swim 1.9km, Bike 90km, Run 21.1km
    // Typical distribution: Swim ~10-15%, Bike ~50-55%, Run ~30-35%
    const swimPercent = 0.10 + Math.random() * 0.05; // 10-15%
    const bikePercent = 0.50 + Math.random() * 0.05; // 50-55%
    const runPercent = 1 - swimPercent - bikePercent - 0.02; // Remaining minus transitions
    
    const swim_minutes = Math.round(totalMinutes * swimPercent);
    const bike_minutes = Math.round(totalMinutes * bikePercent);
    const run_minutes = Math.round(totalMinutes * runPercent);
    const t1_minutes = 3;
    const t2_minutes = 3;

    console.log('Generated estimates:', { swim_minutes, bike_minutes, run_minutes });

    // Update race_estimates table
    const { error: updateError } = await supabaseClient
      .from('race_estimates')
      .upsert({
        user_id: user.id,
        swim_minutes,
        t1_minutes,
        bike_minutes,
        t2_minutes,
        run_minutes,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        estimates: {
          swim_minutes,
          t1_minutes,
          bike_minutes,
          t2_minutes,
          run_minutes,
          confidence: "medium"
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
