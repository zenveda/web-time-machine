import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { urlInputSchema, type UrlInput, type WaybackResponse } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Globe, Clock, ArrowRight, Loader2 } from "lucide-react";
import { Timeline } from "@/components/timeline";
import { SnapshotViewer } from "@/components/snapshot-viewer";
import { HeroSection } from "@/components/hero-section";
import { MessagingEvolution } from "@/components/messaging-evolution";

export default function Home() {
  const [result, setResult] = useState<WaybackResponse | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);

  const form = useForm<UrlInput>({
    resolver: zodResolver(urlInputSchema),
    defaultValues: { url: "" },
  });

  const searchMutation = useMutation({
    mutationFn: async (data: UrlInput) => {
      const res = await apiRequest("POST", "/api/wayback/search", data);
      return (await res.json()) as WaybackResponse;
    },
    onSuccess: (data) => {
      setResult(data);
      setSelectedSnapshot(null);
    },
  });

  const onSubmit = (data: UrlInput) => {
    searchMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      {!result && !searchMutation.isPending && <HeroSection />}

      <div className={`w-full max-w-4xl mx-auto px-4 ${result || searchMutation.isPending ? "pt-8" : ""}`}>
        <div className={`${result || searchMutation.isPending ? "" : "flex flex-col items-center"}`}>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="w-full max-w-2xl mx-auto"
              data-testid="url-search-form"
            >
              <div className="flex gap-2">
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            placeholder="Enter a URL (e.g., https://example.com)"
                            className="pl-10 h-12 text-base"
                            data-testid="input-url"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  size="lg"
                  disabled={searchMutation.isPending}
                  data-testid="button-search"
                >
                  {searchMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">Search</span>
                </Button>
              </div>
            </form>
          </Form>

          {searchMutation.isPending && (
            <div className="flex flex-col items-center justify-center py-24 gap-4" data-testid="loading-state">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-muted animate-pulse" />
                <Clock className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary animate-spin" />
              </div>
              <p className="text-muted-foreground text-sm">Searching the Internet Archive...</p>
              <p className="text-muted-foreground/60 text-xs">This may take a moment for sites with many snapshots</p>
            </div>
          )}

          {searchMutation.isError && (
            <div className="mt-8 p-6 rounded-md bg-destructive/10 border border-destructive/20 text-center" data-testid="error-state">
              <p className="text-destructive font-medium">Something went wrong</p>
              <p className="text-muted-foreground text-sm mt-1">
                {searchMutation.error?.message || "Could not fetch snapshots for this URL. Please try again."}
              </p>
            </div>
          )}

          {result && !searchMutation.isPending && (
            <div className="mt-8 space-y-6" data-testid="results-container">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b">
                <div>
                  <h2 className="text-lg font-semibold" data-testid="text-result-url">
                    {result.url}
                  </h2>
                  <p className="text-sm text-muted-foreground" data-testid="text-snapshot-count">
                    {result.totalSnapshots} snapshots found across {result.yearGroups.length} years
                  </p>
                </div>
                {result.oldestSnapshot && result.newestSnapshot && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{result.oldestSnapshot.formattedDate}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>{result.newestSnapshot.formattedDate}</span>
                  </div>
                )}
              </div>

              {result.totalSnapshots === 0 ? (
                <div className="text-center py-16" data-testid="empty-state">
                  <Globe className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium">No snapshots found</p>
                  <p className="text-muted-foreground/60 text-sm mt-1">
                    The Wayback Machine doesn't have any archived versions of this URL.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                      <Timeline
                        yearGroups={result.yearGroups}
                        selectedSnapshot={selectedSnapshot}
                        onSelectSnapshot={setSelectedSnapshot}
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <SnapshotViewer
                        archiveUrl={selectedSnapshot}
                        originalUrl={result.url}
                      />
                    </div>
                  </div>
                  <MessagingEvolution searchResult={result} />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {!result && !searchMutation.isPending && (
        <div className="w-full max-w-4xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-md bg-primary/10 mb-4">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-medium mb-1">Enter Any URL</h3>
              <p className="text-sm text-muted-foreground">
                Paste any website address to explore its history over the past decade.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-md bg-primary/10 mb-4">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-medium mb-1">Browse Timeline</h3>
              <p className="text-sm text-muted-foreground">
                See snapshots organized by year, showing how the site evolved over time.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-md bg-primary/10 mb-4">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-medium mb-1">View Snapshots</h3>
              <p className="text-sm text-muted-foreground">
                Preview archived versions directly in the browser, side by side.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
