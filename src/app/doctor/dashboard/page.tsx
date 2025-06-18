
"use client";
import { useState, useEffect, useMemo } from 'react';
import type { Patient, User } from '@/lib/types';
import { PatientList } from '@/components/doctor/PatientList';
import { PatientDataView } from '@/components/doctor/PatientDataView';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, DocumentData } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

// Function to get patients linked to a doctor from Firestore
const getLinkedPatientsFromFirestore = async (doctorCode: string): Promise<Patient[]> => {
  if (!doctorCode) return [];
  try {
    // Query the 'users' collection for documents where 'role' is 'patient'
    // AND 'linkedDoctorCode' matches the current doctor's code.
    const usersCollectionRef = collection(db, "users");
    const q = query(usersCollectionRef, 
                    where("role", "==", "patient"), 
                    where("linkedDoctorCode", "==", doctorCode));
    
    const querySnapshot = await getDocs(q);
    const patients: Patient[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as DocumentData;
      // Ensure the data matches the Patient type structure
      patients.push({
        id: doc.id,
        name: data.name || "Unknown Patient",
        email: data.email || "No email",
        role: 'patient',
        linkedDoctorCode: data.linkedDoctorCode,
      });
    });
    return patients;
  } catch (error) {
    console.error("Error fetching linked patients from Firestore: ", error);
    // Potentially show a toast to the doctor
    return []; // Return empty array on error
  }
};


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
      
      // Listener for real-time updates on patients linked to this doctor
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

      return () => unsubscribe(); // Cleanup listener on component unmount

    } else if (!authLoading) {
       setLoadingData(false); // Not a doctor or no doctorCode, stop loading
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
    // This case should ideally be handled by the layout, but as a safeguard:
    return <p>Access Denied. This page is for doctors only.</p>;
  }

  return (
    <div className="space-y-6">
       <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
          Doctor Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome, Dr. {user?.name || 'Doctor'}! Your Doctor Code is: <strong className="text-primary">{doctorCode || 'N/A'}</strong>. Share this with your patients to link accounts.
        </p>
      </div>
      
      {loadingData ? (
         <div className="grid md:grid-cols-[minmax(300px,_350px)_1fr] gap-6 h-full">
          <Skeleton className="h-[calc(100vh-12rem)] w-full rounded-lg" /> {/* Adjusted height for header */}
          <Skeleton className="h-[calc(100vh-12rem)] w-full rounded-lg" /> {/* Adjusted height for header */}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[minmax(300px,_350px)_1fr] gap-6 items-start">
          <div className="sticky top-20 self-start"> {/* Make patient list sticky */}
            <PatientList 
              patients={patients} 
              onSelectPatient={setSelectedPatient}
              selectedPatientId={selectedPatient?.id}
            />
          </div>
          <div className="min-w-0"> {/* Ensure this column can shrink */}
            <PatientDataView patient={selectedPatient} />
          </div>
        </div>
      )}
    </div>
  );
}
