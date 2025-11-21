import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useRealtimeNotifications = () => {
  useEffect(() => {
    // Subscribe to workout statistics updates
    const statsChannel = supabase
      .channel('stats-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workout_statistics'
        },
        (payload) => {
          const stat = payload.new as any;
          toast.info('📊 Community Stats Updated', {
            description: `New ${stat.sport} statistics calculated`
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workout_statistics'
        },
        (payload) => {
          const stat = payload.new as any;
          toast.info('📊 Stats Refreshed', {
            description: `${stat.sport} averages updated`
          });
        }
      )
      .subscribe();

    // Subscribe to new workouts (community activity)
    const workoutsChannel = supabase
      .channel('workouts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workouts'
        },
        (payload) => {
          const workout = payload.new as any;
          toast.success('🏃 New Workout Logged', {
            description: `${workout.sport} - ${workout.distance_km}km`
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statsChannel);
      supabase.removeChannel(workoutsChannel);
    };
  }, []);
};
