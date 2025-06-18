
"use client";
import React, { useEffect, useState } from 'react';
import type { Patient, MoodEntry } from '@/lib/types';
import { MoodTimeline } from '@/components/patient/MoodTimeline'; // Re-use timeline component
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Mail, CalendarClock, FileText } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast'; // Added useToast for error handling

interface PatientDataViewProps {
  patient: Patient | null;
}

export function PatientDataView({ patient }: PatientDataViewProps) {
  const [patientEntries, setPatientEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast(); // Initialize toast

  useEffect(() => {
    if (patient?.id) {
      setLoading(true);
      const entriesCollectionRef = collection(db, "users", patient.id, "moodEntries");
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
        setPatientEntries(fetchedEntries);
        setLoading(false);
      }, (error) => {
        console.error(`Error fetching mood entries for patient ${patient.id}: `, error);
        toast({ // Toast for error
          variant: "destructive",
          title: "Error Loading Patient Data",
          description: `Could not load mood entries for ${patient.name}. Please try again.`,
        });
        setPatientEntries([]);
        setLoading(false);
      });

      return () => unsubscribe(); // Cleanup listener
    } else {
      setPatientEntries([]); // Clear entries if no patient is selected
      setLoading(false); 
    }
  }, [patient, toast]); // Added toast to dependencies

  if (!patient) {
    return (
      <Card className="shadow-lg h-full flex flex-col items-center justify-center">
        <CardContent className="text-center py-12">
          <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
          <p className="text-xl font-medium text-muted-foreground">Select a patient to view their details.</p>
          <p className="text-sm text-muted-foreground mt-1">Their mood logs and information will appear here.</p>
        </CardContent>
      </Card>
    );
  }
  
  if (loading) {
     return (
      <Card className="shadow-lg">
        <CardHeader>
          <Skeleton className="h-8 w-3/4 rounded" />
          <Skeleton className="h-4 w-1/2 rounded mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <User className="mr-3 h-6 w-6 text-primary" />
            {patient.name}
          </CardTitle>
          <CardDescription className="flex items-center text-sm">
            <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
            {patient.email}
          </CardDescription>
        </CardHeader>
      </Card>
      
      <h2 className="font-headline text-xl font-semibold mt-6 mb-3">Mood Timeline</h2>
      {patientEntries.length > 0 ? (
        <MoodTimeline entries={patientEntries} />
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{patient.name} has not logged any moods yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

