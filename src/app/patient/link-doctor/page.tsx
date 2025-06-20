
"use client";
import { LinkDoctorForm } from '@/components/patient/LinkDoctorForm';
import { useAuth } from '@/hooks/useAuth'; 

export default function LinkDoctorPage() {
 const { user } = useAuth(); 
  
  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-8 px-4">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-headline text-2xl sm:text-3xl font-bold">Link with Your Doctor</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Enter the unique code provided by your doctor to share your mood logs securely.
          This helps your doctor understand your progress better and provide tailored support.
        </p>
      </div>
      {user && user.role === 'patient' && <LinkDoctorForm patientId={user.id} currentLink={user.linkedDoctorCode} />}
    </div>
  );
}
