import type { VercelRequest, VercelResponse } from "@vercel/node";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseTimestamp(ts: string) {
  const year = parseInt(ts.substring(0, 4));
  const monthIdx = parseInt(ts.substring(4, 6)) - 1;
  const day = ts.substring(6, 8);
  const month = MONTHS[monthIdx] || "Jan";
  return { year, month, formattedDate: `${month} ${parseInt(day)}, ${year}` };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") return res.status(400).json({ message: "Invalid URL provided" });

    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    const fromTs = tenYearsAgo.getFullYear().toString() + "0101";
    const toTs = new Date().getFullYear().toString() + "1231";

    const cleanUrl = url.replace(/\/$/, "");
    const cdxQuery = cleanUrl.replace(/^https?:\/\//, "");

    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(cdxQuery)}&output=json&fl=timestamp,original,statuscode,mimetype&filter=statuscode:200&filter=mimetype:text/html&collapse=timestamp:6&from=${fromTs}&to=${toTs}&limit=500`;

    const response = await fetch(cdxUrl, { headers: { "User-Agent": "WebTimeMachine/1.0" } });
    if (!response.ok) return res.status(502).json({ message: "Failed to fetch from Wayback Machine" });

    const data = (await response.json()) as string[][];
    if (!data || data.length <= 1) {
      return res.json({ url, totalSnapshots: 0, yearGroups: [], oldestSnapshot: null, newestSnapshot: null });
    }

    const snapshots = data.slice(1).map(([timestamp, original, statusCode, mimeType]) => {
      const { year, month, formattedDate } = parseTimestamp(timestamp);
      const fullOriginal = original.startsWith("http") ? original : `https://${original}`;
      return { timestamp, url: fullOriginal, statusCode, mimeType, archiveUrl: `https://web.archive.org/web/${timestamp}/${fullOriginal}`, formattedDate, year, month };
    });

    snapshots.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const yearMap = new Map<number, typeof snapshots>();
    for (const snap of snapshots) {
      if (!yearMap.has(snap.year)) yearMap.set(snap.year, []);
      yearMap.get(snap.year)!.push(snap);
    }

    const yearGroups = Array.from(yearMap.entries())
      .sort(([a], [b]) => b - a)
      .map(([year, snaps]) => ({ year, snapshots: snaps, count: snaps.length }));

    res.json({ url, totalSnapshots: snapshots.length, yearGroups, oldestSnapshot: snapshots[0] || null, newestSnapshot: snapshots[snapshots.length - 1] || null });
  } catch (error) {
    console.error("Wayback search error:", error);
    res.status(500).json({ message: "Failed to search the Internet Archive" });
  }
}
