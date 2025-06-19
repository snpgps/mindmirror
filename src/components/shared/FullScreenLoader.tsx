
"use client";

import { RefreshCw } from 'lucide-react';

export function FullScreenLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <RefreshCw className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg font-semibold text-foreground">Processing...</p>
      <p className="text-sm text-muted-foreground">Please wait a moment.</p>
    </div>
  );
}
