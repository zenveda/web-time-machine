import { ExternalLink, Monitor, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SnapshotViewerProps {
  archiveUrl: string | null;
  originalUrl: string;
}

export function SnapshotViewer({ archiveUrl, originalUrl }: SnapshotViewerProps) {
  if (!archiveUrl) {
    return (
      <div className="border rounded-md flex flex-col items-center justify-center h-[400px] lg:h-[500px] bg-muted/10" data-testid="snapshot-placeholder">
        <Eye className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground text-sm font-medium">Select a snapshot</p>
        <p className="text-muted-foreground/60 text-xs mt-1">
          Click on a date in the timeline to preview it here
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-md flex flex-col h-[400px] lg:h-[500px]" data-testid="snapshot-viewer">
      <div className="flex items-center justify-between gap-2 p-2 border-b bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate">{archiveUrl}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="shrink-0"
        >
          <a
            href={archiveUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-open-archive"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="ml-1 text-xs">Open</span>
          </a>
        </Button>
      </div>
      <div className="flex-1 bg-neutral-50">
        <iframe
          src={archiveUrl}
          className="w-full h-full border-0"
          title="Wayback Machine Snapshot"
          sandbox="allow-same-origin allow-scripts"
          data-testid="iframe-snapshot"
        />
      </div>
    </div>
  );
}
