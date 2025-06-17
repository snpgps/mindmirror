"use client";
import { useState, useEffect, useMemo } from 'react';
import type { Patient, User } from '@/lib/types';
import { PatientList } from '@/components/doctor/PatientList';
import { PatientDataView } from '@/components/doctor/PatientDataView';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

// Mock function to get patients linked to a doctor
// In a real app, this would be an API call
const getLinkedPatients = (doctorCode: string): Patient[] => {
  const mockPatients: Patient[] = [
    { id: 'patient1', name: 'Alice Wonderland', email: 'alice@example.com', role: 'patient', linkedDoctorCode: doctorCode },
    { id: 'patient2', name: 'Bob The Builder', email: 'bob@example.com', role: 'patient', linkedDoctorCode: doctorCode },
    { id: 'patient3', name: 'Charlie Brown', email: 'charlie@example.com', role: 'patient', linkedDoctorCode: 'DRSTRANGE456' }, // Not linked to DRTEST123
  ];
  
  // Simulate finding patients from a larger list or database
  // For this mock, we filter based on whether their linkedDoctorCode matches the current doctor's code.
  // In a real scenario, the backend would manage these relationships.
  // Also, a patient's linkedDoctorCode would be set when they link.
  // For this demo, we'll also check if `localStorage` has any users whose `linkedDoctorCode` matches.
  
  let allUsers: User[] = [];
  try {
    // This is a very simplified mock. In reality, you wouldn't iterate all users in localStorage.
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('mindmirror-user-')) { // Assuming user data is stored like this
        const userData = JSON.parse(localStorage.getItem(key) || '{}');
        if (userData.role === 'patient' && userData.linkedDoctorCode === doctorCode) {
          allUsers.push(userData);
        }
      }
       if (key === 'mindmirror-user') { // also check the currently logged-in user if they are a patient and linked
          const potentialPatient = JSON.parse(localStorage.getItem(key) || '{}') as Patient;
          if(potentialPatient.role === 'patient' && potentialPatient.linkedDoctorCode === doctorCode){
             // to avoid duplicates if a patient logs in on doctor's machine
             if(!allUsers.find(u => u.id === potentialPatient.id)) {
                allUsers.push(potentialPatient);
             }
          }
        }
    });
  } catch (e) { console.error("Error reading mock patients from localStorage", e); }

  const localStoragePatients = allUsers.filter(u => u.role === 'patient') as Patient[];
  const combinedPatients = [...mockPatients.filter(p => p.linkedDoctorCode === doctorCode), ...localStoragePatients];
  
  // Remove duplicates by ID
  const uniquePatients = Array.from(new Map(combinedPatients.map(p => [p.id, p])).values());
  return uniquePatients;
};


export default function DoctorDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const doctorCode = useMemo(() => (user?.role === 'doctor' ? (user as any).doctorCode : undefined), [user]);

  useEffect(() => {
    if (doctorCode) {
      setLoadingData(true);
      // Simulate API call
      setTimeout(() => {
        const fetchedPatients = getLinkedPatients(doctorCode);
        setPatients(fetchedPatients);
        setLoadingData(false);
      }, 500);
    } else if (!authLoading) {
       setLoadingData(false); // Not a doctor or no doctorCode, stop loading
    }
  }, [doctorCode, authLoading]);

  if (authLoading || !user) {
    return (
      <div className="grid md:grid-cols-[300px_1fr] gap-6 h-full">
        <Skeleton className="h-[calc(100vh-8rem)] w-full rounded-lg" />
        <Skeleton className="h-[calc(100vh-8rem)] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
          Doctor Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome, Dr. {user?.name || 'Doctor'}! Your Doctor Code is: <strong className="text-primary">{doctorCode || 'N/A'}</strong>. Share this with your patients.
        </p>
      </div>
      
      {loadingData ? (
         <div className="grid md:grid-cols-[300px_1fr] gap-6 h-full">
          <Skeleton className="h-[calc(100vh-10rem)] w-full rounded-lg" /> {/* Adjusted height */}
          <Skeleton className="h-[calc(100vh-10rem)] w-full rounded-lg" /> {/* Adjusted height */}
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
