import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "@supabase/supabase-js";
import { Calendar, Bike, Waves, PersonStanding, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { format, differenceInDays, startOfWeek, endOfWeek, isWithinInterval, addWeeks, subWeeks } from "date-fns";
import { toast } from "sonner";
import { WorkoutImageUpload } from "@/components/WorkoutImageUpload";
import { WorkoutStatistics } from "@/components/WorkoutStatistics";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [raceEstimate, setRaceEstimate] = useState<any>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  // Form state
  const [sport, setSport] = useState<string>("swim");
  const [workoutDate, setWorkoutDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [isUpdatingEstimates, setIsUpdatingEstimates] = useState(false);

  // Enable real-time notifications
  useRealtimeNotifications();

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

    // Fetch all workouts (not just recent ones)
    const { data: workoutsData } = await supabase
      .from("workouts")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    
    setWorkouts(workoutsData || []);

    // Fetch race estimate
    const { data: estimateData } = await supabase
      .from("race_estimates")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    
    setRaceEstimate(estimateData);
  };

  const handleLogWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !distance || !duration) {
      toast.error("Please fill in all fields");
      return;
    }

    const { error } = await supabase
      .from("workouts")
      .insert([{
        user_id: user.id,
        sport: sport as "swim" | "bike" | "run",
        date: workoutDate,
        distance_km: parseFloat(distance),
        duration_minutes: parseInt(duration),
      }]);

    if (error) {
      toast.error("Failed to log workout");
      console.error(error);
    } else {
      toast.success("Workout logged successfully!");
      setDistance("");
      setDuration("");
      setWorkoutDate(format(new Date(), "yyyy-MM-dd"));
      fetchUserData();
      updateAIEstimates();
    }
  };

  const updateAIEstimates = async () => {
    setIsUpdatingEstimates(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error("You must be logged in to update estimates");
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('estimate-race-time', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (error) {
        console.error('Function error:', error);
        throw error;
      }
      
      if (data?.error) {
        console.error('Response error:', data.error);
        toast.error(data.error);
        return;
      }
      
      if (data?.success) {
        toast.success(`AI analyzed ${data.workoutCount} workouts to update your predictions`);
        fetchUserData();
      }
    } catch (error: any) {
      console.error('Error updating estimates:', error);
      toast.error(error.message || "Couldn't update AI estimates");
    } finally {
      setIsUpdatingEstimates(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Ignore 403 errors - session may already be invalidated server-side
      console.log("Sign out completed");
    }
    // Always navigate to auth page and clear local state
    setUser(null);
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

  const getSportColor = (sport: string) => {
    switch (sport) {
      case "swim": return "bg-swim";
      case "bike": return "bg-bike";
      case "run": return "bg-run";
      default: return "bg-muted";
    }
  };

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weeklyWorkouts = workouts.filter(workout => 
    isWithinInterval(new Date(workout.date), { start: currentWeekStart, end: weekEnd })
  );

  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Ironman 70.3 Trainer</h1>
            <p className="text-muted-foreground text-sm mt-1">{user.email}</p>
          </div>
          <Button onClick={handleSignOut} variant="outline" size="sm">
            Sign Out
          </Button>
        </div>

        {/* Race Countdown Card */}
        {/* Large Race Countdown */}
        {profile?.race_date && (
          <Card className="border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Race Day</p>
                  <p className="text-xl font-medium">
                    {format(new Date(profile.race_date), "MMMM d, yyyy")}
                  </p>
                </div>
                {daysUntilRace !== null && (
                  <div>
                    <p className="text-7xl font-bold text-primary">{daysUntilRace}</p>
                    <p className="text-muted-foreground mt-2">
                      {daysUntilRace > 0 
                        ? "days until race" 
                        : daysUntilRace === 0 
                        ? "Race day is today!" 
                        : "days since race"}
                    </p>
                  </div>
                )}
                {raceEstimate && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-muted-foreground">Estimated Finish Time</p>
                      <Button 
                        onClick={updateAIEstimates} 
                        disabled={isUpdatingEstimates}
                        variant="outline"
                        size="sm"
                      >
                        {isUpdatingEstimates ? 'Updating...' : 'Recalculate'}
                      </Button>
                    </div>
                    <p className="text-3xl font-bold mb-4">{formatDuration(totalEstimatedTime!)}</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Swim</p>
                        <p className="font-semibold">{formatDuration(raceEstimate.swim_minutes)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">T1</p>
                        <p className="font-semibold">{formatDuration(raceEstimate.t1_minutes)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Bike</p>
                        <p className="font-semibold">{formatDuration(raceEstimate.bike_minutes)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">T2</p>
                        <p className="font-semibold">{formatDuration(raceEstimate.t2_minutes)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Run</p>
                        <p className="font-semibold">{formatDuration(raceEstimate.run_minutes)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Community Statistics */}
        <WorkoutStatistics />

        {/* Upload Workout Image */}
        <WorkoutImageUpload userId={user.id} onWorkoutExtracted={fetchUserData} />

        {/* Log Workout Form */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Log</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogWorkout} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sport">Sport</Label>
                  <Select value={sport} onValueChange={setSport}>
                    <SelectTrigger id="sport">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="swim">Swim</SelectItem>
                      <SelectItem value="bike">Bike</SelectItem>
                      <SelectItem value="run">Run</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={workoutDate}
                    onChange={(e) => setWorkoutDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="distance">Distance (km)</Label>
                  <Input
                    id="distance"
                    type="number"
                    step="0.1"
                    placeholder="10.5"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Time (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="45"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isUpdatingEstimates}>
                {isUpdatingEstimates ? 'Updating AI Estimates...' : 'Add Workout'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Weekly Workouts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Weekly Workouts</CardTitle>
                <CardDescription>
                  {format(currentWeekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToPreviousWeek}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToCurrentWeek}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToNextWeek}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {weeklyWorkouts.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No workouts this week</p>
            ) : (
              <div className="space-y-2">
                {weeklyWorkouts.map((workout) => (
                  <div 
                    key={workout.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${getSportColor(workout.sport)}/10 border border-${workout.sport === 'swim' ? 'swim' : workout.sport === 'bike' ? 'bike' : 'run'}/20`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${getSportColor(workout.sport)}/20`}>
                        {getSportIcon(workout.sport)}
                      </div>
                      <div>
                        <p className="font-medium capitalize">{workout.sport}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(workout.date), "EEEE, MMM d")}
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
      </div>
    </div>
  );
};

export default Index;
