import { Clock, History } from "lucide-react";

export function HeroSection() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background pt-16 pb-8">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 w-72 h-72 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-4">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-6">
          <History className="h-7 w-7 text-primary" />
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3">
          Web Time Machine
        </h1>

        <p className="text-muted-foreground text-base sm:text-lg max-w-xl mb-2">
          Explore how any website has changed over the last 10 years using the Internet Archive's Wayback Machine.
        </p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground/60 mb-8">
          <Clock className="h-3 w-3" />
          <span>Powered by the Wayback Machine</span>
        </div>
      </div>
    </div>
  );
}
