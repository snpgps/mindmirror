"use client";
import { LinkDoctorForm } from '@/components/patient/LinkDoctorForm';
import { useAuth }_ from '@/hooks/useAuth'; // Renamed to avoid conflict

export default function LinkDoctorPage() {
 const { user } = useAuth(); // Using the aliased import
  
  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="font-headline text-3xl font-bold">Link with Your Doctor</h1>
        <p className="text-muted-foreground mt-2">
          Enter the unique code provided by your doctor to share your mood logs securely.
          This helps your doctor understand your progress better and provide tailored support.
        </p>
      </div>
      {user && <LinkDoctorForm patientId={user.id} currentLink={user.role === 'patient' ? user.linkedDoctorCode : undefined} />}
    </div>
  );
}
