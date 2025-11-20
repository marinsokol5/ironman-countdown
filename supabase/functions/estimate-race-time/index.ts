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
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Fetch user's workouts
    const { data: workouts, error: workoutsError } = await supabaseClient
      .from('workouts')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (workoutsError) throw workoutsError;

    // Calculate workout statistics
    const stats = {
      swim: { count: 0, totalDistance: 0, totalTime: 0 },
      bike: { count: 0, totalDistance: 0, totalTime: 0 },
      run: { count: 0, totalDistance: 0, totalTime: 0 }
    };

    workouts?.forEach(w => {
      const sport = w.sport as 'swim' | 'bike' | 'run';
      stats[sport].count++;
      stats[sport].totalDistance += w.distance_km;
      stats[sport].totalTime += w.duration_minutes;
    });

    // Calculate average paces
    const avgPaces = {
      swim: stats.swim.totalDistance > 0 ? stats.swim.totalTime / stats.swim.totalDistance : 0,
      bike: stats.bike.totalDistance > 0 ? stats.bike.totalTime / stats.bike.totalDistance : 0,
      run: stats.run.totalDistance > 0 ? stats.run.totalTime / stats.run.totalDistance : 0
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are an Ironman 70.3 race time estimator. Based on the following training data, estimate realistic finish times for each segment.

Training Statistics:
- Swim: ${stats.swim.count} workouts, ${stats.swim.totalDistance.toFixed(1)} km total, avg pace ${avgPaces.swim.toFixed(2)} min/km
- Bike: ${stats.bike.count} workouts, ${stats.bike.totalDistance.toFixed(1)} km total, avg pace ${avgPaces.bike.toFixed(2)} min/km
- Run: ${stats.run.count} workouts, ${stats.run.totalDistance.toFixed(1)} km total, avg pace ${avgPaces.run.toFixed(2)} min/km

Ironman 70.3 distances:
- Swim: 1.9 km
- Bike: 90 km
- Run: 21.1 km

Please estimate finish times in minutes for each segment, plus transition times (T1: 3 min, T2: 3 min). Consider that race pace is typically slower than training pace due to race conditions and fatigue. If there's limited training data, provide conservative estimates.

Return ONLY a JSON object with this exact structure (no markdown, no explanations):
{
  "swim_minutes": <number>,
  "t1_minutes": 3,
  "bike_minutes": <number>,
  "t2_minutes": 3,
  "run_minutes": <number>,
  "confidence": "<high/medium/low>"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse JSON from AI response
    const estimates = JSON.parse(content.trim());

    // Update race_estimates table
    const { error: updateError } = await supabaseClient
      .from('race_estimates')
      .upsert({
        user_id: user.id,
        swim_minutes: estimates.swim_minutes,
        t1_minutes: estimates.t1_minutes,
        bike_minutes: estimates.bike_minutes,
        t2_minutes: estimates.t2_minutes,
        run_minutes: estimates.run_minutes,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        estimates,
        workoutCount: workouts?.length || 0
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
