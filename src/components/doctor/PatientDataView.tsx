
"use client";
import React, { useEffect, useState } from 'react';
import type { Patient, MoodEntry } from '@/lib/types';
import { MoodTimeline } from '@/components/patient/MoodTimeline'; // Re-use timeline component
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Mail, CalendarClock, FileText, ArrowLeft } from 'lucide-react'; // Added ArrowLeft
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button'; // Added Button

interface PatientDataViewProps {
  patient: Patient | null;
  onBack?: () => void; // Optional: for mobile view to go back to list
  isMobileView?: boolean; // Optional: to indicate if in mobile specific view
}

export function PatientDataView({ patient, onBack, isMobileView = false }: PatientDataViewProps) {
  const [patientEntries, setPatientEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
            moodWords: data.moodWords || [],
            activities: data.activities,
            notes: data.notes,
            timestamp: (data.timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
          });
        });
        setPatientEntries(fetchedEntries);
        setLoading(false);
      }, (error) => {
        console.error(`Error fetching mood entries for patient ${patient.id}: `, error);
        toast({
          variant: "destructive",
          title: "Error Loading Patient Data",
          description: `Could not load mood entries for ${patient.name}. Please try again.`,
        });
        setPatientEntries([]);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setPatientEntries([]);
      setLoading(false);
    }
  }, [patient, toast]);

  // This state is for when the component is rendered but no patient is selected (primarily for desktop)
  if (!patient && !isMobileView) { // Only show this placeholder on desktop if no patient selected. Mobile view handles this differently.
    return (
      <Card className="shadow-lg h-full flex flex-col items-center justify-center min-h-[300px]">
        <CardContent className="text-center py-10 sm:py-12 px-4">
          <FileText className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4 sm:mb-6" />
          <p className="text-lg sm:text-xl font-medium text-muted-foreground">Select a patient to view their details.</p>
          <p className="text-sm text-muted-foreground mt-1">Their mood logs and information will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  // If a patient IS selected (or if it's mobile view, patient will be selected by now) but data is loading
  if (loading && patient) {
     return (
      <div className="space-y-6">
        {isMobileView && onBack && (
          <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2 sm:mb-4 flex items-center self-start">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Patient List
          </Button>
        )}
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-7 sm:h-8 w-3/4 rounded" />
            <Skeleton className="h-4 w-1/2 rounded mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-56 sm:h-64 w-full rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // If patient is null AND it's mobile view, this component shouldn't be rendered by the parent anyway.
  // But as a fallback or if directly rendered:
  if (!patient) {
    return null; // Or some other placeholder if this case is reachable
  }


  return (
    <div className="space-y-6">
      {isMobileView && onBack && (
        <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2 sm:mb-4 flex items-center self-start">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Patient List
        </Button>
      )}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl sm:text-2xl flex items-center">
            <User className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            {patient.name}
          </CardTitle>
          <CardDescription className="flex items-center text-xs sm:text-sm pl-0 sm:pl-1">
            <Mail className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            {patient.email}
          </CardDescription>
        </CardHeader>
      </Card>

      <h2 className="font-headline text-lg sm:text-xl font-semibold mt-4 sm:mt-6 mb-3">Mood Timeline</h2>
      {patientEntries.length > 0 ? (
        <MoodTimeline entries={patientEntries} />
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <CalendarClock className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-sm sm:text-base">{patient.name} has not logged any moods yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
