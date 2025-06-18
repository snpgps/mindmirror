
"use client";
import { useState, useEffect, useMemo } from 'react';
import type { Patient, User, Doctor } from '@/lib/types'; // Added Doctor type
import { PatientList } from '@/components/doctor/PatientList';
import { PatientDataView } from '@/components/doctor/PatientDataView';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, DocumentData } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card'; // Added Card, CardContent
import { Users } from 'lucide-react'; // Added Users icon

export default function DoctorDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const { toast } = useToast();

  const doctorCode = useMemo(() => (user?.role === 'doctor' ? (user as Doctor).doctorCode : undefined), [user]);

  useEffect(() => {
    if (doctorCode && !authLoading) {
      setLoadingData(true);
      
      const usersCollectionRef = collection(db, "users");
      const q = query(usersCollectionRef, 
                      where("role", "==", "patient"), 
                      where("linkedDoctorCode", "==", doctorCode));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedPatients: Patient[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as DocumentData;
          fetchedPatients.push({
            id: doc.id,
            name: data.name || "Unknown Patient",
            email: data.email || "No email",
            role: 'patient',
            linkedDoctorCode: data.linkedDoctorCode,
          });
        });
        setPatients(fetchedPatients);
        setLoadingData(false);
      }, (error) => {
        console.error("Error fetching linked patients: ", error);
        toast({
          variant: "destructive",
          title: "Error Loading Patients",
          description: "Could not load your patient list. Please try again later.",
        });
        setLoadingData(false);
      });

      return () => unsubscribe();

    } else if (!authLoading) {
       setLoadingData(false);
    }
  }, [doctorCode, authLoading, toast]);

  if (authLoading || !user) {
    return (
      <div className="grid md:grid-cols-[300px_1fr] gap-6 h-full">
        <Skeleton className="h-[calc(100vh-8rem)] w-full rounded-lg" />
        <Skeleton className="h-[calc(100vh-8rem)] w-full rounded-lg" />
      </div>
    );
  }
  
  if(user.role !== 'doctor'){
    return <p>Access Denied. This page is for doctors only.</p>;
  }

  return (
    <div className="space-y-6">
       <div className="mb-6">
        <h1 className="font-headline text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
          Doctor Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome, Dr. {user?.name || 'Doctor'}! Your Doctor Code is: <strong className="text-primary">{doctorCode || 'N/A'}</strong>. Share this with your patients to link accounts.
        </p>
      </div>
      
      {loadingData ? (
         <div className="grid md:grid-cols-[minmax(300px,_350px)_1fr] gap-6 h-full">
          <Skeleton className="h-[calc(100vh-12rem)] w-full rounded-lg" />
          <Skeleton className="h-[calc(100vh-12rem)] w-full rounded-lg" />
        </div>
      ) : patients.length === 0 ? (
        <Card className="shadow-lg mt-8">
          <CardContent className="text-center py-16">
            <Users className="mx-auto h-20 w-20 text-primary/70 mb-8" />
            <h2 className="text-2xl font-semibold text-foreground mb-3">No Patients Linked Yet</h2>
            <p className="text-md text-muted-foreground max-w-md mx-auto">
              It looks like you don&apos;t have any patients connected to your MindMirror account. 
              To start viewing their mood logs, please ask them to enter your Doctor Code in their app.
            </p>
            <p className="text-muted-foreground mt-6 mb-2">Your unique Doctor Code to share is:</p>
            <div className="inline-block bg-primary/10 border border-primary/30 rounded-lg px-6 py-3">
                <p className="text-3xl font-bold text-primary tracking-wider">
                {doctorCode || 'N/A'}
                </p>
            </div>
            <p className="text-xs text-muted-foreground mt-6 max-w-sm mx-auto">
              Once a patient links using this code, their data will appear here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[minmax(300px,_350px)_1fr] gap-6 items-start">
          <div className="sticky top-20 self-start">
            <PatientList 
              patients={patients} 
              onSelectPatient={setSelectedPatient}
              selectedPatientId={selectedPatient?.id}
            />
          </div>
          <div className="min-w-0">
            <PatientDataView patient={selectedPatient} />
          </div>
        </div>
      )}
    </div>
  );
}
