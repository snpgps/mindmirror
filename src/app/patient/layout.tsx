"use client"; // Required for useAuth hook
import Navbar from '@/components/shared/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'patient')) {
      router.push('/login');
    }
  }, [user, loading, isAuthenticated, router]);

  if (loading || !isAuthenticated || user?.role !== 'patient') {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="container mx-auto flex-1 p-6 flex items-center justify-center">
          <div className="space-y-4 w-full max-w-lg">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container mx-auto flex-1 p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
