"use client"; // For useState, useEffect and useAuth
import { useState, useEffect } from 'react';
import { MoodLoggingForm } from '@/components/patient/MoodLoggingForm';
import { MoodTimeline } from '@/components/patient/MoodTimeline';
import type { MoodEntry } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

export default function PatientDashboardPage() {
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const { user, loading: authLoading } = useAuth();
  const [loadingEntries, setLoadingEntries] = useState(true);

  useEffect(() => {
    if (user?.id) {
      // Mock: Load entries from localStorage
      const storedEntries = localStorage.getItem(`mindmirror-entries-${user.id}`);
      if (storedEntries) {
        try {
          setMoodEntries(JSON.parse(storedEntries));
        } catch (error) {
          console.error("Failed to parse mood entries from localStorage", error);
          setMoodEntries([]);
        }
      }
      setLoadingEntries(false);
    } else if (!authLoading) { // If not auth loading and no user, stop loading entries
      setLoadingEntries(false);
    }
  }, [user, authLoading]);

  const handleLogMood = (newEntry: MoodEntry) => {
    const updatedEntries = [newEntry, ...moodEntries];
    setMoodEntries(updatedEntries);
    if (user?.id) {
      localStorage.setItem(`mindmirror-entries-${user.id}`, JSON.stringify(updatedEntries));
    }
  };
  
  if (authLoading || !user) {
     return (
        <div className="space-y-8">
          <Skeleton className="h-96 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      );
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
          Welcome, {user?.name || 'User'}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ready to reflect? Log your mood and see your progress.
        </p>
      </div>
      <MoodLoggingForm onLogMood={handleLogMood} userId={user.id} />
      {loadingEntries ? (
         <Skeleton className="h-96 w-full rounded-lg" />
      ) : (
        <MoodTimeline entries={moodEntries} />
      )}
    </div>
  );
}
