import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Timer, TrendingUp } from "lucide-react";

interface Statistic {
  sport: string;
  avg_distance_km: number;
  avg_duration_minutes: number;
  total_workouts: number;
  calculated_at: string;
}

export const WorkoutStatistics = () => {
  const [statistics, setStatistics] = useState<Statistic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('statistics-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workout_statistics'
        },
        () => {
          fetchStatistics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStatistics = async () => {
    try {
      // Get the latest statistics for each sport
      const { data, error } = await supabase
        .from('workout_statistics')
        .select('*')
        .order('calculated_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      // Group by sport and get only the most recent
      const latestStats = data?.reduce((acc: Statistic[], stat) => {
        if (!acc.find(s => s.sport === stat.sport)) {
          acc.push(stat as Statistic);
        }
        return acc;
      }, []) || [];

      setStatistics(latestStats);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const sportIcons = {
    swim: "🏊",
    bike: "🚴",
    run: "🏃"
  };

  const sportNames = {
    swim: "Swimming",
    bike: "Cycling",
    run: "Running"
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Community Averages</CardTitle>
          <CardDescription>Loading statistics...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (statistics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Community Averages</CardTitle>
          <CardDescription>No data available yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-1">Community Averages</h2>
        <p className="text-muted-foreground text-sm">
          Updated every 5 minutes • Based on all users
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        {statistics.map((stat) => (
          <Card key={stat.sport}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {sportNames[stat.sport as keyof typeof sportNames]}
              </CardTitle>
              <span className="text-2xl">{sportIcons[stat.sport as keyof typeof sportIcons]}</span>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-2xl font-bold">
                      {stat.avg_distance_km.toFixed(1)} km
                    </div>
                    <p className="text-xs text-muted-foreground">Avg Distance</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-2xl font-bold">
                      {stat.avg_duration_minutes.toFixed(0)} min
                    </div>
                    <p className="text-xs text-muted-foreground">Avg Duration</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-lg font-semibold">
                      {stat.total_workouts}
                    </div>
                    <p className="text-xs text-muted-foreground">Total Workouts</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
