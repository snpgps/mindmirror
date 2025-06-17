import { AuthForm } from "@/components/auth/AuthForm";
import Navbar from "@/components/shared/Navbar";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 items-center justify-center p-6 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="w-full max-w-md space-y-6">
          <AuthForm mode="login" />
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Button variant="link" asChild className="p-0 h-auto text-primary">
              <Link href="/signup">Sign up</Link>
            </Button>
          </p>
        </div>
      </main>
    </div>
  );
}
