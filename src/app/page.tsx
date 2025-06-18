
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/shared/Navbar';
import { CheckCircle, BarChart3, Users, ShieldCheck, Brain, TrendingUp, Lightbulb } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-28 lg:py-36">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-6 text-center">
              <h1 className="font-headline text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Understand Your Mind, Improve Your Life with <span className="text-primary">MindMirror</span>
              </h1>
              <p className="max-w-[700px] text-muted-foreground md:text-xl">
                Log your moods, track activities, and gain valuable insights into your mental well-being. Securely share your progress with your doctor.
              </p>
              <div className="flex flex-col gap-3 min-[400px]:flex-row">
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-transform hover:scale-105">
                  <Link href="/signup">Get Started for Free</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="shadow-md transition-transform hover:scale-105">
                  <Link href="/login">I Already Have an Account</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-16 md:py-24 bg-background/70 backdrop-blur-md">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm font-medium text-primary">Core Benefits</div>
              <h2 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">
                Nurture Your Mental Wellness
              </h2>
              <p className="max-w-[700px] text-muted-foreground md:text-lg">
                MindMirror provides intuitive tools to help you on your journey to a healthier mind.
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl items-stretch gap-8 sm:grid-cols-1 md:grid-cols-3">
              <div className="flex flex-col items-center text-center p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 bg-card transform hover:-translate-y-1">
                <Brain className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2 font-headline">Easy Mood Logging</h3>
                <p className="text-sm text-muted-foreground">
                  Quickly capture your feelings with our detailed emotion selection tool.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 bg-card transform hover:-translate-y-1">
                <TrendingUp className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2 font-headline">Track Progress</h3>
                <p className="text-sm text-muted-foreground">
                  Visualize your mood patterns and activity correlations over time.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 bg-card transform hover:-translate-y-1">
                <ShieldCheck className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2 font-headline">Doctor Linkage</h3>
                <p className="text-sm text-muted-foreground">
                  Securely share your mood logs with your healthcare provider for better support.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Call to Action Section */}
        <section className="w-full py-20 md:py-28">
          <div className="container grid items-center justify-center gap-4 px-4 md:px-6 text-center">
            <div className="space-y-4">
              <Lightbulb className="h-16 w-16 text-primary mx-auto" />
              <h2 className="font-headline text-3xl font-bold tracking-tight md:text-4xl">
                Ready to Start Your Journey?
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-lg">
                Take the first step towards a better understanding of your mental well-being.
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm space-y-2 mt-6">
              <Button asChild size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-transform hover:scale-105">
                <Link href="/signup">Create Your Free Account</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t border-border/40">
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
