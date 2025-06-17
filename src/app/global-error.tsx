"use client"; // Error components must be Client Components

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-8">
          <div className="text-center max-w-lg">
            <h1 className="text-6xl font-bold text-destructive mb-4">Oops!</h1>
            <h2 className="text-2xl font-semibold mb-6">Something went wrong.</h2>
            <p className="text-muted-foreground mb-8">
              We apologize for the inconvenience. Please try again, or contact support if the problem persists.
            </p>
            {error?.digest && (
              <p className="text-xs text-muted-foreground mb-4">Error Digest: {error.digest}</p>
            )}
            <Button
              onClick={
                // Attempt to recover by trying to re-render the segment
                () => reset()
              }
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Try Again
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
