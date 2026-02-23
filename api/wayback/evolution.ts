import type { VercelRequest, VercelResponse } from "@vercel/node";

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
    if (text && text.length > 2 && text.length < 200) headings.push(text);
  }
  return headings;
}

function extractKeyPhrases(title: string, description: string, headings: string[]): string[] {
  const allText = [title, description, ...headings].join(" ").toLowerCase();
  const words = allText.split(/\s+/).filter(w => w.length > 3);
  const freq = new Map<string, number>();
  for (const w of words) {
    const clean = w.replace(/[^a-z0-9]/g, "");
    if (clean.length > 3) freq.set(clean, (freq.get(clean) || 0) + 1);
  }
  return Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word]) => word);
}

interface YearMessaging {
  year: number;
  snapshot: any;
  title: string;
  metaDescription: string;
  headings: string[];
  keyPhrases: string[];
}

function computeBiggestShift(years: YearMessaging[]) {
  if (years.length < 2) return null;

  let maxScore = 0;
  let bestFrom = years[0];
  let bestTo = years[1];

  for (let i = 0; i < years.length - 1; i++) {
    const a = years[i];
    const b = years[i + 1];
    let score = 0;

    if (a.title !== b.title) score += 3;
    if (a.metaDescription !== b.metaDescription) score += 2;

    const aHeadingSet = new Set(a.headings.map(h => h.toLowerCase()));
    const bHeadingArr = b.headings.map(h => h.toLowerCase());
    let headingOverlap = 0;
    bHeadingArr.forEach(h => { if (aHeadingSet.has(h)) headingOverlap++; });
    const totalHeadings = Math.max(aHeadingSet.size, bHeadingArr.length, 1);
    score += (1 - headingOverlap / totalHeadings) * 3;

    const aPhrases = new Set(a.keyPhrases);
    let phraseOverlap = 0;
    b.keyPhrases.forEach(p => { if (aPhrases.has(p)) phraseOverlap++; });
    const totalPhrases = Math.max(aPhrases.size, b.keyPhrases.length, 1);
    score += (1 - phraseOverlap / totalPhrases) * 2;

    if (score > maxScore) { maxScore = score; bestFrom = a; bestTo = b; }
  }

  const details: string[] = [];
  if (bestFrom.title !== bestTo.title) details.push(`Title changed from "${bestFrom.title || "(none)"}" to "${bestTo.title || "(none)"}"`);
  if (bestFrom.metaDescription !== bestTo.metaDescription) {
    const f = bestFrom.metaDescription ? bestFrom.metaDescription.substring(0, 80) + (bestFrom.metaDescription.length > 80 ? "..." : "") : "(none)";
    const t = bestTo.metaDescription ? bestTo.metaDescription.substring(0, 80) + (bestTo.metaDescription.length > 80 ? "..." : "") : "(none)";
    details.push(`Description changed from "${f}" to "${t}"`);
  }
  const added = bestTo.headings.filter(h => !bestFrom.headings.map(x => x.toLowerCase()).includes(h.toLowerCase()));
  const removed = bestFrom.headings.filter(h => !bestTo.headings.map(x => x.toLowerCase()).includes(h.toLowerCase()));
  if (added.length > 0) details.push(`New headings appeared: ${added.slice(0, 3).map(h => `"${h}"`).join(", ")}`);
  if (removed.length > 0) details.push(`Headings removed: ${removed.slice(0, 3).map(h => `"${h}"`).join(", ")}`);

  const summary = maxScore > 5 ? "Major rebrand or redesign detected" : maxScore > 3 ? "Significant messaging shift" : maxScore > 1 ? "Moderate messaging update" : "Minor wording adjustments";
  return { fromYear: bestFrom.year, toYear: bestTo.year, summary, details };
}

async function fetchPageContent(archiveUrl: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const r = await fetch(archiveUrl, { headers: { "User-Agent": "WebTimeMachine/1.0" }, signal: controller.signal });
    clearTimeout(timeout);
    if (!r.ok) return "";
    return await r.text();
  } catch { return ""; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    const { yearGroups, url } = req.body;
    if (!yearGroups || !url) return res.status(400).json({ message: "Invalid request data" });

    const sortedGroups = [...yearGroups].sort((a: any, b: any) => a.year - b.year);
    const pickedSnapshots = sortedGroups.map((group: any) => {
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
      yearMessagingResults.push({ year: snapshot.year, snapshot, title, metaDescription, headings, keyPhrases });
    }

    const biggestShift = computeBiggestShift(yearMessagingResults);
    res.json({ url, years: yearMessagingResults, biggestShift });
  } catch (error) {
    console.error("Evolution analysis error:", error);
    res.status(500).json({ message: "Failed to analyze messaging evolution" });
  }
}
