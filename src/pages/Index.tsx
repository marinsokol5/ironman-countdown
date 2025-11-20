import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "@supabase/supabase-js";
import { Calendar, Bike, Waves, PersonStanding, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [raceEstimate, setRaceEstimate] = useState<any>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    
    setProfile(profileData);

    // Fetch recent workouts
    const { data: workoutsData } = await supabase
      .from("workouts")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(5);
    
    setWorkouts(workoutsData || []);

    // Fetch race estimate
    const { data: estimateData } = await supabase
      .from("race_estimates")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    
    setRaceEstimate(estimateData);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const daysUntilRace = profile?.race_date 
    ? differenceInDays(new Date(profile.race_date), new Date())
    : null;

  const totalEstimatedTime = raceEstimate 
    ? raceEstimate.swim_minutes + raceEstimate.bike_minutes + raceEstimate.run_minutes + raceEstimate.t1_minutes + raceEstimate.t2_minutes
    : null;

  const getSportIcon = (sport: string) => {
    switch (sport) {
      case "swim": return <Waves className="h-4 w-4" />;
      case "bike": return <Bike className="h-4 w-4" />;
      case "run": return <PersonStanding className="h-4 w-4" />;
      default: return null;
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Triathlon Trainer</h1>
            <p className="text-muted-foreground mt-1">{user.email}</p>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            Sign Out
          </Button>
        </div>

        {/* Race Countdown Card */}
        {profile?.race_date && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Race Day
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold">
                  {format(new Date(profile.race_date), "MMMM d, yyyy")}
                </p>
                {daysUntilRace !== null && (
                  <p className="text-muted-foreground">
                    {daysUntilRace > 0 
                      ? `${daysUntilRace} days to go` 
                      : daysUntilRace === 0 
                      ? "Race day is today!" 
                      : "Race completed"}
                  </p>
                )}
                {totalEstimatedTime && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>Estimated finish: {formatDuration(totalEstimatedTime)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workouts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Recent sessions</p>
            </CardContent>
          </Card>

          {raceEstimate && (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Waves className="h-4 w-4" />
                    Swim Target
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatDuration(raceEstimate.swim_minutes)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Bike className="h-4 w-4" />
                    Bike Target
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatDuration(raceEstimate.bike_minutes)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <PersonStanding className="h-4 w-4" />
                    Run Target
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatDuration(raceEstimate.run_minutes)}</div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Recent Workouts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Workouts</CardTitle>
            <CardDescription>Your latest training sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {workouts.length === 0 ? (
              <p className="text-muted-foreground text-sm">No workouts logged yet. Start training!</p>
            ) : (
              <div className="space-y-3">
                {workouts.map((workout) => (
                  <div 
                    key={workout.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getSportIcon(workout.sport)}
                      <div>
                        <p className="font-medium capitalize">{workout.sport}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(workout.date), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{workout.distance_km} km</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDuration(workout.duration_minutes)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Button size="lg" className="w-full">
            Log Workout
          </Button>
          <Button size="lg" variant="outline" className="w-full">
            View All Workouts
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
