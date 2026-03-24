import { NextResponse } from "next/server";

type MuscleGroup =
  | "chest"
  | "back"
  | "legs"
  | "shoulders"
  | "arms"
  | "glutes"
  | "core"
  | "cardio"
  | "full";

type Exercise = {
  name: string;
  muscleGroup: MuscleGroup;
  videoUrl: string;
  videoId?: string;
  alternateVideoUrls?: string[];
};

const EXERCISES: Array<Omit<Exercise, "videoUrl">> = [
  { name: "Press banca", muscleGroup: "chest" },
  { name: "Press militar", muscleGroup: "shoulders" },
  { name: "Dominadas", muscleGroup: "back" },
  { name: "Remo", muscleGroup: "back" },
  { name: "Sentadilla", muscleGroup: "legs" },
  { name: "Peso muerto", muscleGroup: "legs" },
  { name: "Peso muerto rumano", muscleGroup: "legs" },
  { name: "Hip thrust", muscleGroup: "glutes" },
  { name: "Prensa", muscleGroup: "legs" },
  { name: "Zancadas", muscleGroup: "legs" },
  { name: "Plancha", muscleGroup: "core" },
  { name: "Crunch", muscleGroup: "core" },
  { name: "Elevaciones de piernas", muscleGroup: "core" },
  { name: "Burpees", muscleGroup: "cardio" },
  { name: "Saltar cuerda", muscleGroup: "cardio" },
  { name: "Mountain climbers", muscleGroup: "cardio" },
  { name: "HIIT", muscleGroup: "cardio" },
];

function toVideoUrl(exerciseName: string) {
  const q = encodeURIComponent(`${exerciseName} gym exercise tutorial`);
  return `https://www.youtube.com/embed?listType=search&list=${q}`;
}

function buildEmbedUrl(videoId: string, originHeader: string, country: string) {
  const url = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
  url.searchParams.set("rel", "0");
  url.searchParams.set("modestbranding", "1");
  url.searchParams.set("playsinline", "1");
  if (originHeader) url.searchParams.set("origin", originHeader);
  if (country) url.searchParams.set("cc_lang_pref", country.toLowerCase());
  return url.toString();
}

async function buscarVideos(exerciseName: string): Promise<{ ids: string[]; error?: string }> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { ids: [], error: "Missing YOUTUBE_API_KEY" };

  const q = `${exerciseName} gym exercise tutorial`;

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "25");
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("videoSyndicated", "true");
  url.searchParams.set("safeSearch", "moderate");
  url.searchParams.set("relevanceLanguage", "es");
  url.searchParams.set("q", q);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 60 * 60 * 24 } });
  if (!res.ok) {
    let detail = "";
    try {
      const err = (await res.json()) as { error?: { message?: string } };
      detail = err.error?.message ? `: ${err.error.message}` : "";
    } catch {
      // ignore
    }
    return { ids: [], error: `YouTube search failed (${res.status})${detail}` };
  }
  const data = (await res.json()) as {
    items?: Array<{ id?: { videoId?: string } }>;
  };

  const ids = (data.items ?? [])
    .map((it) => it.id?.videoId)
    .filter((v): v is string => Boolean(v));

  if (!ids.length) return { ids: [], error: "No search results" };

  const vUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  vUrl.searchParams.set("part", "status,contentDetails,contentRating");
  vUrl.searchParams.set("id", ids.join(","));
  vUrl.searchParams.set("key", apiKey);

  const vRes = await fetch(vUrl.toString(), { next: { revalidate: 60 * 60 * 24 } });
  if (!vRes.ok) {
    let detail = "";
    try {
      const err = (await vRes.json()) as { error?: { message?: string } };
      detail = err.error?.message ? `: ${err.error.message}` : "";
    } catch {
      // ignore
    }
    return { ids: [], error: `YouTube videos.list failed (${vRes.status})${detail}` };
  }
  type VideoItem = {
    id?: string;
    status?: { embeddable?: boolean; privacyStatus?: string; madeForKids?: boolean };
    contentDetails?: { regionRestriction?: { blocked?: string[] } };
    contentRating?: { ytRating?: string };
  };
  const vData = (await vRes.json()) as { items?: VideoItem[] };

  const byId = new Map<string, VideoItem>();
  for (const it of vData.items ?? []) {
    if (it?.id) byId.set(it.id, it);
  }

  const picked: string[] = [];
  for (const candidateId of ids) {
    const it = byId.get(candidateId);
    if (!it) continue;

    const embeddable = it.status?.embeddable === true;
    const publicOk = it.status?.privacyStatus === "public";
    const notKids = it.status?.madeForKids !== true;
    const notAgeRestricted = it.contentRating?.ytRating !== "ytAgeRestricted";

    if (!embeddable || !publicOk || !notKids || !notAgeRestricted) continue;

    picked.push(candidateId);
    if (picked.length >= 5) break;
  }

  return { ids: picked, error: picked.length ? undefined : "No embeddable/public candidates after filtering" };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const muscleGroup = searchParams.get("muscleGroup")?.toLowerCase() ?? null;
  const name = searchParams.get("name")?.toLowerCase() ?? null;
  const debug = searchParams.get("debug") === "1";
  const country =
    (searchParams.get("country")?.toUpperCase() ?? "") ||
    (req.headers.get("x-vercel-ip-country")?.toUpperCase() ?? "");
  const originHeader = req.headers.get("origin") ?? "";

  let list = EXERCISES;

  if (muscleGroup) {
    list = list.filter((e) => e.muscleGroup === muscleGroup);
  }

  if (name) {
    list = list.filter((e) => e.name.toLowerCase() === name);
  }

  const out: Exercise[] = [];
  for (const e of list) {
    let videoUrl = toVideoUrl(e.name);
    let videoId: string | undefined;
    let alternateVideoUrls: string[] | undefined;

    if (name) {
      try {
        const found = await buscarVideos(e.name);
        if (found.ids.length) {
          videoId = found.ids[0];
          videoUrl = buildEmbedUrl(found.ids[0], originHeader, country);
          alternateVideoUrls = found.ids.slice(1).map((id) => buildEmbedUrl(id, originHeader, country));
        } else if (debug && found.error) {
          return NextResponse.json(
            {
              error: found.error,
              hint:
                "Check that YouTube Data API v3 is enabled for this key and that the key is not restricted to HTTP referrers (server-side calls need unrestricted or IP-restricted keys).",
            },
            { status: 500 },
          );
        }
      } catch {
        // ignore and fall back to search embed
      }
    }

    out.push({ ...e, videoUrl, videoId, alternateVideoUrls });
  }

  return NextResponse.json({ exercises: out });
}
