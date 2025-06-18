
"use client"; // For useState, useEffect and useAuth
import { useState, useEffect } from 'react';
import { MoodLoggingForm } from '@/components/patient/MoodLoggingForm';
import { MoodTimeline } from '@/components/patient/MoodTimeline';
import type { MoodEntry } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function PatientDashboardPage() {
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const { user, loading: authLoading } = useAuth();
  const [loadingEntries, setLoadingEntries] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user?.id && !authLoading) {
      setLoadingEntries(true);
      const entriesCollectionRef = collection(db, "users", user.id, "moodEntries");
      const q = query(entriesCollectionRef, orderBy("timestamp", "desc"));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedEntries: MoodEntry[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedEntries.push({
            id: doc.id,
            userId: data.userId,
            moodLevel: data.moodLevel,
            moodWords: data.moodWords,
            activities: data.activities,
            notes: data.notes,
            timestamp: (data.timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString(), 
          });
        });
        setMoodEntries(fetchedEntries);
        setLoadingEntries(false);
      }, (error) => {
        console.error("Error fetching mood entries: ", error);
        toast({
          variant: "destructive",
          title: "Error Loading Entries",
          description: "Could not load your mood entries. Please try again later.",
        });
        setLoadingEntries(false);
      });

      return () => unsubscribe(); // Cleanup listener on component unmount
    } else if (!authLoading) { // If auth is done loading and still no user
      setMoodEntries([]);
      setLoadingEntries(false);
    }
  }, [user, authLoading, toast]);
  
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
      <MoodLoggingForm userId={user.id} />
      {loadingEntries ? (
         <Skeleton className="h-96 w-full rounded-lg" />
      ) : (
        <MoodTimeline entries={moodEntries} />
      )}
    </div>
  );
}

