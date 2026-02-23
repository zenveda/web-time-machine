import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import type { WaybackSnapshot, YearGroup, WaybackResponse, YearMessaging, MessagingEvolution } from "@shared/schema";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseTimestamp(ts: string): { year: number; month: string; formattedDate: string } {
  const year = parseInt(ts.substring(0, 4));
  const monthIdx = parseInt(ts.substring(4, 6)) - 1;
  const day = ts.substring(6, 8);
  const month = MONTHS[monthIdx] || "Jan";
  return {
    year,
    month,
    formattedDate: `${month} ${parseInt(day)}, ${year}`,
  };
}

function extractText(html: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = html.match(regex);
  return match ? match[1].replace(/<[^>]*>/g, "").trim() : "";
}

function extractMetaDescription(html: string): string {
  const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  return match ? match[1].trim() : "";
}

function extractHeadings(html: string): string[] {
  const headings: string[] = [];
  const regex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let match;
  while ((match = regex.exec(html)) !== null && headings.length < 5) {
    const text = match[1].replace(/<[^>]*>/g, "").trim();
    if (text && text.length > 2 && text.length < 200) {
      headings.push(text);
    }
  }
  return headings;
}

function extractKeyPhrases(title: string, description: string, headings: string[]): string[] {
  const allText = [title, description, ...headings].join(" ").toLowerCase();
  const words = allText.split(/\s+/).filter(w => w.length > 3);
  const freq = new Map<string, number>();
  for (const w of words) {
    const clean = w.replace(/[^a-z0-9]/g, "");
    if (clean.length > 3) {
      freq.set(clean, (freq.get(clean) || 0) + 1);
    }
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

function computeBiggestShift(years: YearMessaging[]): MessagingEvolution["biggestShift"] {
  if (years.length < 2) return null;

  let maxScore = 0;
  let bestFrom = years[0];
  let bestTo = years[1];

  for (let i = 0; i < years.length - 1; i++) {
    const a = years[i];
    const b = years[i + 1];

    let score = 0;
    const details: string[] = [];

    if (a.title !== b.title) {
      score += 3;
    }

    if (a.metaDescription !== b.metaDescription) {
      score += 2;
    }

    const aHeadingSet = new Set(a.headings.map(h => h.toLowerCase()));
    const bHeadingArr = b.headings.map(h => h.toLowerCase());
    let headingOverlap = 0;
    bHeadingArr.forEach(h => { if (aHeadingSet.has(h)) headingOverlap++; });
    const totalHeadings = Math.max(aHeadingSet.size, bHeadingArr.length, 1);
    const headingChange = 1 - (headingOverlap / totalHeadings);
    score += headingChange * 3;

    const aPhrases = new Set(a.keyPhrases);
    const bPhrasesArr = b.keyPhrases;
    let phraseOverlap = 0;
    bPhrasesArr.forEach(p => { if (aPhrases.has(p)) phraseOverlap++; });
    const totalPhrases = Math.max(aPhrases.size, bPhrasesArr.length, 1);
    const phraseChange = 1 - (phraseOverlap / totalPhrases);
    score += phraseChange * 2;

    if (score > maxScore) {
      maxScore = score;
      bestFrom = a;
      bestTo = b;
    }
  }

  const details: string[] = [];
  if (bestFrom.title !== bestTo.title) {
    details.push(`Title changed from "${bestFrom.title || "(none)"}" to "${bestTo.title || "(none)"}"`);
  }
  if (bestFrom.metaDescription !== bestTo.metaDescription) {
    const fromDesc = bestFrom.metaDescription ? bestFrom.metaDescription.substring(0, 80) + (bestFrom.metaDescription.length > 80 ? "..." : "") : "(none)";
    const toDesc = bestTo.metaDescription ? bestTo.metaDescription.substring(0, 80) + (bestTo.metaDescription.length > 80 ? "..." : "") : "(none)";
    details.push(`Description changed from "${fromDesc}" to "${toDesc}"`);
  }

  const addedHeadings = bestTo.headings.filter(h => !bestFrom.headings.map(x => x.toLowerCase()).includes(h.toLowerCase()));
  const removedHeadings = bestFrom.headings.filter(h => !bestTo.headings.map(x => x.toLowerCase()).includes(h.toLowerCase()));
  if (addedHeadings.length > 0) {
    details.push(`New headings appeared: ${addedHeadings.slice(0, 3).map(h => `"${h}"`).join(", ")}`);
  }
  if (removedHeadings.length > 0) {
    details.push(`Headings removed: ${removedHeadings.slice(0, 3).map(h => `"${h}"`).join(", ")}`);
  }

  const summary = maxScore > 5
    ? "Major rebrand or redesign detected"
    : maxScore > 3
    ? "Significant messaging shift"
    : maxScore > 1
    ? "Moderate messaging update"
    : "Minor wording adjustments";

  return {
    fromYear: bestFrom.year,
    toYear: bestTo.year,
    summary,
    details,
  };
}

async function fetchPageContent(archiveUrl: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(archiveUrl, {
      headers: { "User-Agent": "WebTimeMachine/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/wayback/search", async (req, res) => {
    try {
      const schema = z.object({ url: z.string().url() });
      const { url } = schema.parse(req.body);

      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
      const fromTs = tenYearsAgo.getFullYear().toString() + "0101";
      const toTs = new Date().getFullYear().toString() + "1231";

      const cleanUrl = url.replace(/\/$/, "");
      const cdxQuery = cleanUrl.replace(/^https?:\/\//, "");

      const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(cdxQuery)}&output=json&fl=timestamp,original,statuscode,mimetype&filter=statuscode:200&filter=mimetype:text/html&collapse=timestamp:6&from=${fromTs}&to=${toTs}&limit=500`;

      const response = await fetch(cdxUrl, {
        headers: { "User-Agent": "WebTimeMachine/1.0" },
      });

      if (!response.ok) {
        return res.status(502).json({ message: "Failed to fetch from Wayback Machine" });
      }

      const data = await response.json() as string[][];

      if (!data || data.length <= 1) {
        const result: WaybackResponse = {
          url,
          totalSnapshots: 0,
          yearGroups: [],
          oldestSnapshot: null,
          newestSnapshot: null,
        };
        return res.json(result);
      }

      const rows = data.slice(1);
      const snapshots: WaybackSnapshot[] = rows.map(([timestamp, original, statusCode, mimeType]) => {
        const { year, month, formattedDate } = parseTimestamp(timestamp);
        const fullOriginal = original.startsWith("http") ? original : `https://${original}`;
        return {
          timestamp,
          url: fullOriginal,
          statusCode,
          mimeType,
          archiveUrl: `https://web.archive.org/web/${timestamp}/${fullOriginal}`,
          formattedDate,
          year,
          month,
        };
      });

      snapshots.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

      const yearMap = new Map<number, WaybackSnapshot[]>();
      for (const snap of snapshots) {
        if (!yearMap.has(snap.year)) {
          yearMap.set(snap.year, []);
        }
        yearMap.get(snap.year)!.push(snap);
      }

      const yearGroups: YearGroup[] = Array.from(yearMap.entries())
        .sort(([a], [b]) => b - a)
        .map(([year, snaps]) => ({
          year,
          snapshots: snaps,
          count: snaps.length,
        }));

      const result: WaybackResponse = {
        url,
        totalSnapshots: snapshots.length,
        yearGroups,
        oldestSnapshot: snapshots[0] || null,
        newestSnapshot: snapshots[snapshots.length - 1] || null,
      };

      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid URL provided" });
      }
      console.error("Wayback search error:", error);
      res.status(500).json({ message: "Failed to search the Internet Archive" });
    }
  });

  app.post("/api/wayback/evolution", async (req, res) => {
    try {
      const schema = z.object({
        yearGroups: z.array(z.object({
          year: z.number(),
          snapshots: z.array(z.object({
            timestamp: z.string(),
            url: z.string(),
            statusCode: z.string(),
            mimeType: z.string(),
            archiveUrl: z.string(),
            formattedDate: z.string(),
            year: z.number(),
            month: z.string(),
          })),
          count: z.number(),
        })),
        url: z.string(),
      });

      const { yearGroups, url } = schema.parse(req.body);

      const sortedGroups = [...yearGroups].sort((a, b) => a.year - b.year);

      const pickedSnapshots: WaybackSnapshot[] = sortedGroups.map(group => {
        const mid = Math.floor(group.snapshots.length / 2);
        return group.snapshots[mid];
      });

      const yearMessagingResults: YearMessaging[] = [];

      for (const snapshot of pickedSnapshots) {
        const html = await fetchPageContent(snapshot.archiveUrl);

        const title = extractText(html, "title");
        const metaDescription = extractMetaDescription(html);
        const headings = extractHeadings(html);
        const keyPhrases = extractKeyPhrases(title, metaDescription, headings);

        yearMessagingResults.push({
          year: snapshot.year,
          snapshot,
          title,
          metaDescription,
          headings,
          keyPhrases,
        });
      }

      const biggestShift = computeBiggestShift(yearMessagingResults);

      const result: MessagingEvolution = {
        url,
        years: yearMessagingResults,
        biggestShift,
      };

      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data" });
      }
      console.error("Evolution analysis error:", error);
      res.status(500).json({ message: "Failed to analyze messaging evolution" });
    }
  });

  return httpServer;
}
