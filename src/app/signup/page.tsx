
"use client"; // Required for useAuth hook
import { AuthForm } from "@/components/auth/AuthForm";
import Navbar from "@/components/shared/Navbar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/useAuth';
import { FullScreenLoader } from '@/components/shared/FullScreenLoader';

export default function SignupPage() {
  const { isProcessingAuth } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      {isProcessingAuth && <FullScreenLoader />}
      <Navbar />
      <main className="flex flex-1 items-center justify-center p-6 bg-gradient-to-br from-primary/5 via-background to-accent/5">
         <div className="w-full max-w-md space-y-6">
          <AuthForm mode="signup" />
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Button variant="link" asChild className="p-0 h-auto text-primary">
              <Link href="/login">Log in</Link>
            </Button>
          </p>
        </div>
      </main>
    </div>
  );
}
