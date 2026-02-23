import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { WaybackResponse, MessagingEvolution as MessagingEvolutionType, YearMessaging } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, TrendingUp, ArrowRight, Loader2, AlertTriangle, FileText, Heading, Tag, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessagingEvolutionProps {
  searchResult: WaybackResponse;
}

export function MessagingEvolution({ searchResult }: MessagingEvolutionProps) {
  const [result, setResult] = useState<MessagingEvolutionType | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/wayback/evolution", {
        yearGroups: searchResult.yearGroups,
        url: searchResult.url,
      });
      return (await res.json()) as MessagingEvolutionType;
    },
    onSuccess: (data) => setResult(data),
  });

  if (!result && !mutation.isPending && !mutation.isError) {
    return (
      <div className="border rounded-md p-6 text-center bg-muted/10" data-testid="evolution-trigger">
        <Sparkles className="h-8 w-8 text-primary/60 mx-auto mb-3" />
        <h3 className="font-semibold mb-1">Messaging Evolution Analysis</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
          Pick one snapshot per year and compare how the site's title, description, and key messaging changed over time.
        </p>
        <Button onClick={() => mutation.mutate()} data-testid="button-analyze-evolution">
          <TrendingUp className="h-4 w-4 mr-2" />
          Analyze Evolution
        </Button>
      </div>
    );
  }

  if (mutation.isPending) {
    return (
      <div className="border rounded-md p-8 text-center" data-testid="evolution-loading">
        <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Fetching archived pages and extracting messaging...</p>
        <p className="text-xs text-muted-foreground/60 mt-1">This may take a moment as we visit each year's snapshot</p>
      </div>
    );
  }

  if (mutation.isError) {
    return (
      <div className="border rounded-md p-6 text-center bg-destructive/5" data-testid="evolution-error">
        <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" />
        <p className="text-sm text-destructive font-medium">Could not analyze messaging evolution</p>
        <p className="text-xs text-muted-foreground mt-1 mb-3">{mutation.error?.message}</p>
        <Button variant="secondary" size="sm" onClick={() => mutation.mutate()}>
          Try Again
        </Button>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="space-y-4" data-testid="evolution-results">
      {result.biggestShift && <BiggestShiftCard shift={result.biggestShift} />}

      <div className="border rounded-md">
        <div className="p-3 border-b bg-muted/30 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-sm">Year-by-Year Messaging</h3>
        </div>
        <ScrollArea className="max-h-[600px]">
          <div className="p-3 space-y-3">
            {result.years.map((yearData, idx) => (
              <YearCard key={yearData.year} yearData={yearData} isFirst={idx === 0} isLast={idx === result.years.length - 1} />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function BiggestShiftCard({ shift }: { shift: NonNullable<MessagingEvolutionType["biggestShift"]> }) {
  return (
    <Card className="border-primary/20 bg-primary/5" data-testid="biggest-shift-card">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm">Biggest Messaging Shift</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{shift.fromYear}</span>
                <ArrowRight className="h-3 w-3" />
                <span>{shift.toYear}</span>
              </div>
            </div>
            <p className="text-sm text-primary font-medium mb-2">{shift.summary}</p>
            {shift.details.length > 0 && (
              <ul className="space-y-1.5">
                {shift.details.map((detail, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-primary/60 shrink-0">-</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function YearCard({ yearData, isFirst, isLast }: { yearData: YearMessaging; isFirst: boolean; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const hasContent = yearData.title || yearData.metaDescription || yearData.headings.length > 0;

  return (
    <div className="relative" data-testid={`evolution-year-${yearData.year}`}>
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border",
            isFirst ? "bg-primary text-primary-foreground border-primary" :
            isLast ? "bg-primary text-primary-foreground border-primary" :
            "bg-muted text-muted-foreground border-transparent"
          )}>
            {String(yearData.year).slice(-2)}
          </div>
          {!isLast && <div className="w-px flex-1 bg-border mt-1 min-h-[8px]" />}
        </div>

        <div className="flex-1 pb-3 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-left flex items-center gap-2 group"
            data-testid={`button-expand-year-${yearData.year}`}
          >
            <span className="font-semibold text-sm">{yearData.year}</span>
            <Badge variant="outline" className="text-xs no-default-active-elevate">
              {yearData.snapshot.formattedDate}
            </Badge>
            {hasContent && (
              expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto" /> : <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto" />
            )}
          </button>

          {!hasContent && (
            <p className="text-xs text-muted-foreground/60 mt-1 italic">Could not extract content from this snapshot</p>
          )}

          {hasContent && (
            <div className={cn("mt-2 space-y-2", !expanded && "hidden")}>
              {yearData.title && (
                <div className="flex gap-2 items-start">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Title</span>
                    <p className="text-sm">{yearData.title}</p>
                  </div>
                </div>
              )}

              {yearData.metaDescription && (
                <div className="flex gap-2 items-start">
                  <Heading className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Description</span>
                    <p className="text-xs text-muted-foreground">{yearData.metaDescription}</p>
                  </div>
                </div>
              )}

              {yearData.headings.length > 0 && (
                <div className="flex gap-2 items-start">
                  <Heading className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Key Headings</span>
                    <ul className="mt-0.5 space-y-0.5">
                      {yearData.headings.map((h, i) => (
                        <li key={i} className="text-xs text-muted-foreground">- {h}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {yearData.keyPhrases.length > 0 && (
                <div className="flex gap-2 items-start">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {yearData.keyPhrases.map((phrase) => (
                      <Badge key={phrase} variant="secondary" className="text-xs no-default-active-elevate">
                        {phrase}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {hasContent && !expanded && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {yearData.title || yearData.metaDescription || yearData.headings[0] || ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
