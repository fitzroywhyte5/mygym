import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cache = new Map<string, string>();

function cacheKey(q: string, source: string, target: string) {
  return `${source}|${target}|${q}`;
}

async function translateLibre(q: string, source: string, target: string): Promise<string | null> {
  const res = await fetch("https://libretranslate.de/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q, source, target, format: "text" }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { translatedText?: string };
  const translatedText = String(data?.translatedText ?? "").trim();
  return translatedText || null;
}

async function translateMyMemory(q: string, source: string, target: string): Promise<string | null> {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", q);
  url.searchParams.set("langpair", `${source}|${target}`);
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = (await res.json()) as { responseData?: { translatedText?: string } };
  const translatedText = String(data?.responseData?.translatedText ?? "").trim();
  if (!translatedText) return null;
  if (/QUERY LENGTH LIMIT EXCEEDED/i.test(translatedText)) return null;
  if (/MAX ALLOWED QUERY/i.test(translatedText)) return null;
  return translatedText;
}

function chunkText(input: string, maxLen = 450): string[] {
  const text = input.trim();
  if (text.length <= maxLen) return [text];

  const paragraphs = text.split(/\n\s*\n/g).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];

  for (const p of paragraphs.length ? paragraphs : [text]) {
    if (p.length <= maxLen) {
      chunks.push(p);
      continue;
    }

    const sentences = p.split(/(?<=[.!?])\s+/g).map((s) => s.trim()).filter(Boolean);
    if (sentences.length <= 1) {
      let start = 0;
      while (start < p.length) {
        chunks.push(p.slice(start, start + maxLen));
        start += maxLen;
      }
      continue;
    }

    let current = "";
    for (const s of sentences) {
      if (!current) {
        current = s;
        continue;
      }
      if ((current + " " + s).length <= maxLen) {
        current = current + " " + s;
      } else {
        chunks.push(current);
        current = s;
      }
    }
    if (current) chunks.push(current);
  }

  return chunks;
}

async function translateBestEffort(q: string, source: string, target: string): Promise<string> {
  const cached = cache.get(cacheKey(q, source, target));
  if (cached) return cached;

  const pieces = chunkText(q);
  const out: string[] = [];

  for (const piece of pieces) {
    let t: string | null = null;
    try {
      t = await translateLibre(piece, source, target);
    } catch {
      t = null;
    }
    if (!t) {
      try {
        t = await translateMyMemory(piece, source, target);
      } catch {
        t = null;
      }
    }
    out.push(t ?? piece);
  }

  const finalText = out.join("\n\n");
  cache.set(cacheKey(q, source, target), finalText);
  return finalText;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      q?: string | string[];
      source?: string;
      target?: string;
    };
    const source = String(body?.source ?? "en");
    const target = String(body?.target ?? "es");

    if (Array.isArray(body?.q)) {
      const inputs = body.q
        .map((x) => String(x ?? "").trim())
        .filter((x) => x.length > 0);
      if (!inputs.length) {
        return NextResponse.json(
          { translatedTexts: [] as string[] },
          { status: 200, headers: { "Cache-Control": "no-store" } },
        );
      }

      const outputs: string[] = [];
      for (const q of inputs) {
        outputs.push(await translateBestEffort(q, source, target));
      }

      return NextResponse.json(
        { translatedTexts: outputs },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }

    const q = String(body?.q ?? "").trim();
    if (!q) return NextResponse.json({ translatedText: "" }, { status: 200 });

    const translatedText = await translateBestEffort(q, source, target);
    return NextResponse.json(
      { translatedText },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return NextResponse.json({ translatedText: "" }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
