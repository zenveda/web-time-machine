import { useState } from "react";
import type { YearGroup, WaybackSnapshot } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineProps {
  yearGroups: YearGroup[];
  selectedSnapshot: string | null;
  onSelectSnapshot: (url: string) => void;
}

export function Timeline({ yearGroups, selectedSnapshot, onSelectSnapshot }: TimelineProps) {
  const [expandedYears, setExpandedYears] = useState<Set<number>>(() => {
    const latest = yearGroups[0]?.year;
    return latest ? new Set([latest]) : new Set();
  });

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  return (
    <div className="border rounded-md" data-testid="timeline-container">
      <div className="p-3 border-b bg-muted/30">
        <h3 className="font-medium text-sm">Timeline</h3>
      </div>
      <ScrollArea className="h-[300px] lg:h-[500px]">
        <div className="p-2">
          {yearGroups.map((group) => (
            <YearNode
              key={group.year}
              group={group}
              isExpanded={expandedYears.has(group.year)}
              onToggle={() => toggleYear(group.year)}
              selectedSnapshot={selectedSnapshot}
              onSelectSnapshot={onSelectSnapshot}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface YearNodeProps {
  group: YearGroup;
  isExpanded: boolean;
  onToggle: () => void;
  selectedSnapshot: string | null;
  onSelectSnapshot: (url: string) => void;
}

function YearNode({ group, isExpanded, onToggle, selectedSnapshot, onSelectSnapshot }: YearNodeProps) {
  return (
    <div className="mb-1" data-testid={`year-group-${group.year}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium hover-elevate active-elevate-2 relative"
        data-testid={`button-year-${group.year}`}
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <span>{group.year}</span>
        <Badge variant="secondary" className="ml-auto text-xs no-default-active-elevate">
          {group.count}
        </Badge>
      </button>

      {isExpanded && (
        <div className="ml-4 pl-3 border-l border-muted mt-1 space-y-0.5">
          {group.snapshots.map((snapshot, idx) => (
            <SnapshotItem
              key={`${snapshot.timestamp}-${idx}`}
              snapshot={snapshot}
              isSelected={selectedSnapshot === snapshot.archiveUrl}
              onSelect={() => onSelectSnapshot(snapshot.archiveUrl)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SnapshotItemProps {
  snapshot: WaybackSnapshot;
  isSelected: boolean;
  onSelect: () => void;
}

function SnapshotItem({ snapshot, isSelected, onSelect }: SnapshotItemProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors relative",
        isSelected
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover-elevate"
      )}
      data-testid={`button-snapshot-${snapshot.timestamp}`}
    >
      <div className={cn(
        "h-1.5 w-1.5 rounded-full shrink-0",
        isSelected ? "bg-primary" : "bg-muted-foreground/40"
      )} />
      <span className="truncate">{snapshot.formattedDate}</span>
      <span className="ml-auto text-muted-foreground/50">{snapshot.month}</span>
    </button>
  );
}
