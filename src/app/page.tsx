import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/shared/Navbar';
import { CheckCircle, BarChart3, Users, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Reflect, Understand, Grow with <span className="text-primary">MindMirror</span>
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Your personal companion for logging moods, tracking activities, and gaining valuable insights into your mental well-being.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link href="/signup">Get Started for Free</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/login">I Already Have an Account</Link>
                  </Button>
                </div>
              </div>
              <Image
                src="https://placehold.co/600x400.png"
                alt="Calm person meditating"
                data-ai-hint="wellness meditation"
                width={600}
                height={400}
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last lg:aspect-square shadow-lg"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Key Features</div>
                <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-5xl">
                  Everything You Need to Nurture Your Mind
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  MindMirror provides intuitive tools to help you on your mental wellness journey.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:gap-16 mt-12">
              <div className="flex flex-col items-center text-center p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow bg-card">
                <CheckCircle className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2 font-headline">Easy Mood Logging</h3>
                <p className="text-sm text-muted-foreground">
                  Quickly log your mood with an intuitive emoji scale and a curated list of mood words.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow bg-card">
                <BarChart3 className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2 font-headline">Track Activities</h3>
                <p className="text-sm text-muted-foreground">
                  Record activities that impact your mood, choosing from a predefined list or adding your own.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow bg-card">
                <Users className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2 font-headline">Doctor Linkage</h3>
                <p className="text-sm text-muted-foreground">
                  Securely share your mood logs with your healthcare provider by linking accounts.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Call to Action Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="font-headline text-3xl font-bold tracking-tighter md:text-4xl/tight">
                Ready to Start Your Journey?
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Sign up today and take the first step towards a better understanding of your mental well-being.
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm space-y-2">
              <Button asChild size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/signup">Create Your Free Account</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} MindMirror. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4 text-muted-foreground" prefetch={false}>
            Terms of Service
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4 text-muted-foreground" prefetch={false}>
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
