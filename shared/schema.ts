import { z } from "zod";

export const urlInputSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

export type UrlInput = z.infer<typeof urlInputSchema>;

export interface WaybackSnapshot {
  timestamp: string;
  url: string;
  statusCode: string;
  mimeType: string;
  archiveUrl: string;
  formattedDate: string;
  year: number;
  month: string;
}

export interface YearGroup {
  year: number;
  snapshots: WaybackSnapshot[];
  count: number;
}

export interface WaybackResponse {
  url: string;
  totalSnapshots: number;
  yearGroups: YearGroup[];
  oldestSnapshot: WaybackSnapshot | null;
  newestSnapshot: WaybackSnapshot | null;
}

export interface YearMessaging {
  year: number;
  snapshot: WaybackSnapshot;
  title: string;
  metaDescription: string;
  headings: string[];
  keyPhrases: string[];
}

export interface MessagingEvolution {
  url: string;
  years: YearMessaging[];
  biggestShift: {
    fromYear: number;
    toYear: number;
    summary: string;
    details: string[];
  } | null;
}
