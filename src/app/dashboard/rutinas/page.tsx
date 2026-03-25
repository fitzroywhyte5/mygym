"use client";

import * as React from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { clearSelectedRoutine, setSelectedRoutine } from "@/components/selected-routine-card";

type Gender = "hombre" | "mujer";
type Days = 1 | 2 | 3 | 4 | 5 | 6;
type Objective = "fuerza" | "volumen" | "definicion" | "salud" | "cardio";

type RoutineOption = {
  id: string;
  title: string;
  subtitle?: string;
  days: Array<{ label: string; focus: string; exercises?: string[] }>;
  tags?: string[];
  gender?: Gender | "ambos";
  objectives?: Objective[];
};

type ExerciseRec = {
  name: string;
  sets: string;
  reps: string;
  rest?: string;
};

type ExerciseVideo = {
  videoUrl: string;
  alternateVideoUrls?: string[];
};

type SelectedRoutine = {
  id: string;
  title: string;
  daysPerWeek: number;
  gender: Gender;
  objective?: Objective;
  subtitle?: string;
  days?: Array<{ label: string; focus: string; exercises?: string[] }>;
};

const ROUTINE_KEY = "mygym:selectedRoutine";

function readSelectedRoutine(): SelectedRoutine | null {
  try {
    const raw = window.localStorage.getItem(ROUTINE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SelectedRoutine;
    if (!parsed?.id || !parsed?.title) return null;
    return parsed;
  } catch {
    return null;
  }
}

const baseExercises = {
  fuerza_volumen: [
    "Sentadilla",
    "Peso muerto",
    "Press banca",
    "Dominadas",
    "Press militar",
  ],
  piernas_gluteos: [
    "Hip thrust",
    "Prensa",
    "Zancadas",
    "Peso muerto rumano",
  ],
  cardio_definicion: [
    "Burpees",
    "Saltar cuerda",
    "Mountain climbers",
    "HIIT",
  ],
  core: ["Plancha", "Crunch", "Elevaciones de piernas"],
};

function getRoutineOptions(days: Days, gender: Gender): RoutineOption[] {
  const common: Record<Days, RoutineOption[]> = {
    1: [
      {
        id: "1d-full",
        title: "Full Body",
        subtitle: "Única opción real para 1 día/semana",
        tags: ["Ideal: personas muy ocupadas"],
        days: [
          {
            label: "Día 1",
            focus: "Cuerpo completo",
            exercises: [
              "Sentadilla",
              "Press banca",
              "Remo",
              "Peso muerto",
              "Plancha",
            ],
          },
        ],
      },
    ],
    2: [
      {
        id: "2d-fullx2",
        title: "Full Body x2",
        days: [
          {
            label: "Día 1",
            focus: "Full Body",
            exercises: [
              "Sentadilla",
              "Press banca",
              "Dominadas",
              "Peso muerto",
            ],
          },
          {
            label: "Día 2",
            focus: "Full Body",
            exercises: [
              "Sentadilla",
              "Press banca",
              "Dominadas",
              "Peso muerto",
            ],
          },
        ],
      },
      {
        id: "2d-torsopierna",
        title: "Torso / Pierna",
        days: [
          { label: "Día 1", focus: "Torso (pecho, espalda, brazos)" },
          { label: "Día 2", focus: "Piernas" },
        ],
      },
    ],
    3: [
      {
        id: "3d-full",
        title: "Full Body",
        subtitle: "La opción más usada",
        objectives: ["salud", "volumen", "definicion", "fuerza"],
        days: [
          { label: "Día 1", focus: "Full" },
          { label: "Día 2", focus: "Full" },
          { label: "Día 3", focus: "Full" },
        ],
      },
      {
        id: "3d-ppl",
        title: "Push / Pull / Legs",
        objectives: ["volumen", "definicion", "fuerza"],
        days: [
          { label: "Día 1", focus: "Pecho + hombro + tríceps" },
          { label: "Día 2", focus: "Espalda + bíceps" },
          { label: "Día 3", focus: "Piernas" },
        ],
      },
      {
        id: "3d-tpfull",
        title: "Torso / Pierna / Full",
        objectives: ["salud", "volumen", "definicion"],
        days: [
          { label: "Día 1", focus: "Torso" },
          { label: "Día 2", focus: "Pierna" },
          { label: "Día 3", focus: "Full" },
        ],
      },
    ],
    4: [
      {
        id: "4d-tp",
        title: "Torso / Pierna",
        subtitle: "La mejor",
        objectives: ["volumen", "definicion", "salud", "fuerza"],
        days: [
          { label: "Día 1", focus: "Torso" },
          { label: "Día 2", focus: "Pierna" },
          { label: "Día 3", focus: "Torso" },
          { label: "Día 4", focus: "Pierna" },
        ],
      },
      {
        id: "4d-splitclasico",
        title: "Split clásico",
        objectives: ["volumen", "definicion"],
        days: [
          { label: "Día 1", focus: "Pecho" },
          { label: "Día 2", focus: "Espalda" },
          { label: "Día 3", focus: "Piernas" },
          { label: "Día 4", focus: "Hombros + brazos" },
        ],
      },
      {
        id: "4d-upperlowerextra",
        title: "Upper / Lower + extra",
        objectives: ["salud", "definicion", "cardio"],
        days: [
          { label: "Día 1", focus: "Torso" },
          { label: "Día 2", focus: "Pierna" },
          { label: "Día 3", focus: "Full" },
          { label: "Día 4", focus: "Cardio o core" },
        ],
      },
    ],
    5: [
      {
        id: "5d-ppl-extra",
        title: "Push / Pull / Legs + extra",
        objectives: ["volumen", "definicion", "fuerza"],
        days: [
          { label: "Día 1", focus: "Push" },
          { label: "Día 2", focus: "Pull" },
          { label: "Día 3", focus: "Pierna" },
          { label: "Día 4", focus: "Torso" },
          { label: "Día 5", focus: "Pierna" },
        ],
      },
      {
        id: "5d-splitcompleto",
        title: "Split completo",
        objectives: ["volumen", "definicion"],
        days: [
          { label: "Día 1", focus: "Pecho" },
          { label: "Día 2", focus: "Espalda" },
          { label: "Día 3", focus: "Piernas" },
          { label: "Día 4", focus: "Hombros" },
          { label: "Día 5", focus: "Brazos" },
        ],
      },
    ],
    6: [
      {
        id: "6d-pplx2",
        title: "Push / Pull / Legs x2",
        objectives: ["volumen", "definicion", "fuerza"],
        days: [
          { label: "Día 1", focus: "Push" },
          { label: "Día 2", focus: "Pull" },
          { label: "Día 3", focus: "Pierna" },
          { label: "Día 4", focus: "Push" },
          { label: "Día 5", focus: "Pull" },
          { label: "Día 6", focus: "Pierna" },
        ],
      },
      {
        id: "6d-tpx3",
        title: "Torso / Pierna x3",
        objectives: ["volumen", "definicion", "salud", "fuerza"],
        days: [
          { label: "Día 1", focus: "Torso" },
          { label: "Día 2", focus: "Pierna" },
          { label: "Día 3", focus: "Torso" },
          { label: "Día 4", focus: "Pierna" },
          { label: "Día 5", focus: "Torso" },
          { label: "Día 6", focus: "Pierna" },
        ],
      },
      {
        id: "6d-splitavanzado",
        title: "Split avanzado",
        objectives: ["volumen", "definicion", "fuerza"],
        days: [
          { label: "Día 1", focus: "Pecho" },
          { label: "Día 2", focus: "Espalda" },
          { label: "Día 3", focus: "Pierna" },
          { label: "Día 4", focus: "Hombro" },
          { label: "Día 5", focus: "Brazos" },
          { label: "Día 6", focus: "Pierna o glúteo" },
        ],
      },
    ],
  };

  const base = common[days];
  if (days === 5 && gender === "mujer") {
    return [
      ...base,
      {
        id: "5d-gluteos",
        title: "Glúteos (enfocado mujeres)",
        gender: "mujer",
        objectives: ["volumen", "definicion"],
        days: [
          { label: "Día 1", focus: "Glúteos" },
          { label: "Día 2", focus: "Piernas" },
          { label: "Día 3", focus: "Descanso / cardio" },
          { label: "Día 4", focus: "Glúteos" },
          { label: "Día 5", focus: "Piernas" },
        ],
      },
    ];
  }

  return base;
}

function makeFunctionalHiit(days: Days): RoutineOption {
  const plan = Array.from({ length: days }).map((_, i) => {
    const d = i + 1;
    const mod = d % 3;
    const focus = mod === 1 ? "Funcional / HIIT" : mod === 2 ? "Cardio + core" : "Full Body ligero";
    return { label: `Día ${d}`, focus };
  });

  return {
    id: `fx-hiit-${days}`,
    title: "Funcional / HIIT",
    subtitle: "Cardiovascular y condición física",
    objectives: ["cardio", "salud", "definicion"],
    days: plan,
  };
}

function filterByObjective(options: RoutineOption[], objective: Objective, days: Days): RoutineOption[] {
  const withFunctional = objective === "cardio" ? [makeFunctionalHiit(days), ...options] : options;
  return withFunctional.filter((o) => {
    if (!o.objectives?.length) return true;
    return o.objectives.includes(objective);
  });
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/70">
      {children}
    </span>
  );
}

function getExerciseRec(name: string): ExerciseRec {
  const key = name.trim().toLowerCase();
  const map: Record<string, Omit<ExerciseRec, "name">> = {
    sentadilla: { sets: "3–5", reps: "5–10", rest: "2–3 min" },
    "peso muerto": { sets: "3–4", reps: "3–6", rest: "2–4 min" },
    "press banca": { sets: "3–5", reps: "5–10", rest: "2–3 min" },
    dominadas: { sets: "3–4", reps: "6–12", rest: "90–150 s" },
    remo: { sets: "3–4", reps: "8–12", rest: "90–150 s" },
    "press militar": { sets: "3–4", reps: "6–10", rest: "90–180 s" },
    plancha: { sets: "3", reps: "30–60 s", rest: "60–90 s" },
    "hip thrust": { sets: "3–5", reps: "8–12", rest: "90–150 s" },
    prensa: { sets: "3–4", reps: "10–15", rest: "90–150 s" },
    zancadas: { sets: "3–4", reps: "10–12", rest: "60–120 s" },
    "peso muerto rumano": { sets: "3–4", reps: "8–12", rest: "90–150 s" },
    burpees: { sets: "4–8", reps: "10–20", rest: "45–90 s" },
    "saltar cuerda": { sets: "8–12", reps: "30–60 s", rest: "30–60 s" },
    "mountain climbers": { sets: "4–8", reps: "30–45 s", rest: "30–60 s" },
    hiit: { sets: "10–20", reps: "20s/40s", rest: "según bloque" },
    crunch: { sets: "3–4", reps: "12–20", rest: "45–75 s" },
    "elevaciones de piernas": { sets: "3–4", reps: "10–15", rest: "45–75 s" },
  };

  const fallback = { sets: "3–4", reps: "8–12", rest: "60–120 s" };
  const found = map[key] ?? fallback;
  return { name, ...found };
}

function templateExercisesForFocus(focus: string): string[] {
  const f = focus.toLowerCase();

  if (f.includes("torso") || f.includes("upper") || f.includes("tren superior")) {
    return ["Press banca", "Dominadas", "Remo", "Press militar", "Plancha"];
  }

  if (f.includes("brazos") || f.includes("brazo")) {
    return ["Dominadas", "Press banca", "Remo", "Plancha"];
  }

  if (f.includes("push") || f.includes("pecho") || f.includes("tríceps") || f.includes("hombro")) {
    return ["Press banca", "Press militar", "Plancha"]; 
  }
  if (f.includes("pull") || f.includes("espalda") || f.includes("bíceps")) {
    return ["Dominadas", "Remo", "Plancha"]; 
  }
  if (f.includes("pierna") || f.includes("piernas") || f.includes("glúte")) {
    return ["Sentadilla", "Peso muerto rumano", "Hip thrust"]; 
  }
  if (f.includes("cardio") || f.includes("hiit")) {
    return ["HIIT", "Burpees", "Mountain climbers"]; 
  }
  if (f.includes("core")) {
    return ["Plancha", "Crunch", "Elevaciones de piernas"]; 
  }
  if (f.includes("full") || f.includes("cuerpo completo")) {
    return ["Sentadilla", "Press banca", "Remo", "Peso muerto", "Plancha"]; 
  }

  return ["Sentadilla", "Press banca", "Remo", "Plancha"]; 
}

export default function RutinasPage() {
  const searchParams = useSearchParams();
  const [gender, setGender] = React.useState<Gender | "">("");
  const [days, setDays] = React.useState<Days | 0>(0);
  const [objective, setObjective] = React.useState<Objective | "">("");
  const [previewId, setPreviewId] = React.useState<string | null>(null);
  const [confirmedId, setConfirmedId] = React.useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = React.useState<ExerciseRec | null>(null);
  const [selectedExerciseVideo, setSelectedExerciseVideo] = React.useState<ExerciseVideo | null>(null);
  const [videoLoading, setVideoLoading] = React.useState(false);
  const [videoError, setVideoError] = React.useState<string | null>(null);

  const [youtubeApiKey, setYoutubeApiKey] = React.useState(
    process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ?? "",
  );

  React.useEffect(() => {
    const stored = readSelectedRoutine();
    if (!stored) return;
    setGender(stored.gender);
    setDays(stored.daysPerWeek);
    setObjective(stored.objective ?? "salud");
    setPreviewId(stored.id);
    setConfirmedId(stored.id);
  }, []);

  React.useEffect(() => {
    if (youtubeApiKey) return;
    let canceled = false;
    (async () => {
      try {
        const res = await fetch("/api/youtube-key");
        if (!res.ok) return;
        const data = (await res.json()) as { key?: string };
        if (canceled) return;
        if (data.key) setYoutubeApiKey(data.key);
      } catch {
        // ignore
      }
    })();
    return () => {
      canceled = true;
    };
  }, [youtubeApiKey]);

  function buildEmbedUrl(videoId: string) {
    const url = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
    url.searchParams.set("rel", "0");
    url.searchParams.set("modestbranding", "1");
    url.searchParams.set("playsinline", "1");
    try {
      url.searchParams.set("origin", window.location.origin);
    } catch {
      // ignore
    }
    return url.toString();
  }

  const options = React.useMemo(() => {
    if (!gender || !days || !objective) return [];
    const base = getRoutineOptions(days, gender);
    return filterByObjective(base, objective, days);
  }, [days, gender, objective]);

  const canShow = Boolean(gender) && Boolean(days) && Boolean(objective);

  const selected = React.useMemo(() => {
    if (!previewId) return null;
    return options.find((o) => o.id === previewId) ?? null;
  }, [options, previewId]);

  function handlePreviewRoutine(routine: RoutineOption) {
    if (!gender || !days) return;
    setPreviewId(routine.id);
    setSelectedExercise(null);
    setSelectedExerciseVideo(null);
    setVideoError(null);
    setVideoLoading(false);
  }

  async function buscarVideo(exerciseName: string): Promise<string | null> {
    const query = `${exerciseName} gym exercise tutorial`;

    let key = youtubeApiKey;
    if (!key) {
      try {
        const res = await fetch("/api/youtube-key");
        if (res.ok) {
          const data = (await res.json()) as { key?: string };
          if (data.key) {
            key = data.key;
            setYoutubeApiKey(data.key);
          }
        }
      } catch {
        // ignore
      }
    }

    if (key) {
      const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
      searchUrl.searchParams.set("part", "snippet");
      searchUrl.searchParams.set("q", query);
      searchUrl.searchParams.set("key", key);
      searchUrl.searchParams.set("maxResults", "25");
      searchUrl.searchParams.set("type", "video");
      searchUrl.searchParams.set("videoEmbeddable", "true");

      const res = await fetch(searchUrl.toString());
      if (!res.ok) return null;
      const data = (await res.json()) as {
        items?: Array<{ id?: { videoId?: string } }>;
      };

      const ids = (data.items ?? [])
        .map((it) => it.id?.videoId)
        .filter((v): v is string => Boolean(v));

      if (!ids.length) return null;

      const fallbackPicked = ids.slice(0, 10);

      const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
      detailsUrl.searchParams.set("part", "status,contentRating,contentDetails");
      detailsUrl.searchParams.set("id", ids.join(","));
      detailsUrl.searchParams.set("key", key);

      const dRes = await fetch(detailsUrl.toString());
      if (!dRes.ok) {
        const main = buildEmbedUrl(fallbackPicked[0]);
        const alternates = fallbackPicked.slice(1).map((id) => buildEmbedUrl(id));
        return JSON.stringify({ videoUrl: main, alternateVideoUrls: alternates });
      }
      type VideoItem = {
        id?: string;
        status?: { embeddable?: boolean; privacyStatus?: string; madeForKids?: boolean };
        contentRating?: { ytRating?: string };
        contentDetails?: { regionRestriction?: { blocked?: string[] } };
      };
      const dData = (await dRes.json()) as { items?: VideoItem[] };

      const byId = new Map<string, VideoItem>();
      for (const it of dData.items ?? []) {
        if (it?.id) byId.set(it.id, it);
      }

      const blockedCountry = (typeof navigator !== "undefined" && navigator.language?.slice(-2)?.toUpperCase()) || "";

      const picked: string[] = [];
      for (const id of ids) {
        const it = byId.get(id);
        if (!it) continue;
        const embeddable = it.status?.embeddable === true;
        const publicOk = it.status?.privacyStatus === "public";
        const notAgeRestricted = it.contentRating?.ytRating !== "ytAgeRestricted";
        const blocked = it.contentDetails?.regionRestriction?.blocked ?? [];
        const notBlockedHere = blockedCountry ? !blocked.includes(blockedCountry) : true;
        if (!embeddable || !publicOk || !notAgeRestricted || !notBlockedHere) continue;
        picked.push(id);
        if (picked.length >= 10) break;
      }

      const finalPicked = picked.length ? picked : fallbackPicked;
      const main = buildEmbedUrl(finalPicked[0]);
      const alternates = finalPicked.slice(1).map((id) => buildEmbedUrl(id));
      return JSON.stringify({ videoUrl: main, alternateVideoUrls: alternates });
    }

    const res = await fetch(`/api/exercises?name=${encodeURIComponent(exerciseName)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      exercises?: Array<{ videoUrl?: string; alternateVideoUrls?: string[] }>;
    };
    const ex = data.exercises?.[0];
    const videoUrl = ex?.videoUrl;
    if (!videoUrl) return null;
    return JSON.stringify({ videoUrl, alternateVideoUrls: ex?.alternateVideoUrls ?? [] });
  }

  function mostrarVideo(payload: string | null) {
    if (!payload) {
      setSelectedExerciseVideo(null);
      return;
    }
    try {
      const parsed = JSON.parse(payload) as { videoUrl?: string; alternateVideoUrls?: string[] };
      if (!parsed.videoUrl) {
        setSelectedExerciseVideo(null);
        return;
      }
      setSelectedExerciseVideo({
        videoUrl: parsed.videoUrl,
        alternateVideoUrls: parsed.alternateVideoUrls ?? [],
      });
    } catch {
      setSelectedExerciseVideo({ videoUrl: payload });
    }
  }

  async function handleSelectExercise(exerciseName: string) {
    const rec = getExerciseRec(exerciseName);
    setSelectedExercise(rec);
    setVideoLoading(true);
    setVideoError(null);
    mostrarVideo(null);

    try {
      const videoUrl = await buscarVideo(exerciseName);
      if (!videoUrl) {
        setVideoError("No encontramos un video para este ejercicio. Prueba con otro.");
        return;
      }
      mostrarVideo(videoUrl);
    } catch {
      setVideoError("No se pudo cargar el video. Intenta de nuevo.");
    } finally {
      setVideoLoading(false);
    }
  }

  async function conectarEventos(exerciseName: string) {
    return handleSelectExercise(exerciseName);
  }

  React.useEffect(() => {
    const ex = searchParams?.get("exercise");
    if (!ex) return;
    const name = String(ex).trim();
    if (!name) return;
    handleSelectExercise(name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function handleConfirmRoutine(routine: RoutineOption) {
    if (!gender || !days || !objective) return;
    setConfirmedId(routine.id);
    setSelectedRoutine({
      id: routine.id,
      title: routine.title,
      subtitle: routine.subtitle,
      days: routine.days,
      gender,
      daysPerWeek: days,
      objective,
    });
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Rutinas</h1>
          <p className="mt-2 text-sm text-white/60">
            Elige tu perfil y días de entrenamiento para ver las rutinas base recomendadas.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="min-w-[170px]">
            <div className="text-xs text-white/60">Hombre / Mujer</div>
            <select
              value={gender}
              onChange={(e) => {
                setGender(e.target.value as Gender);
                setPreviewId(null);
                setSelectedExercise(null);
              }}
              className="mt-1 h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-white/20"
            >
              <option value="" disabled>
                Seleccionar
              </option>
              <option value="hombre">Hombre</option>
              <option value="mujer">Mujer</option>
            </select>
          </div>
          <div className="min-w-[170px]">
            <div className="text-xs text-white/60">Días por semana</div>
            <select
              value={days}
              onChange={(e) => {
                setDays(Number(e.target.value) as Days);
                setPreviewId(null);
                setSelectedExercise(null);
              }}
              className="mt-1 h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-white/20"
            >
              <option value={0} disabled>
                Seleccionar
              </option>
              <option value={1}>1 día</option>
              <option value={2}>2 días</option>
              <option value={3}>3 días</option>
              <option value={4}>4 días</option>
              <option value={5}>5 días</option>
              <option value={6}>6 días</option>
            </select>
          </div>

          <div className="min-w-[220px]">
            <div className="text-xs text-white/60">Objetivo</div>
            <select
              value={objective}
              onChange={(e) => {
                setObjective(e.target.value as Objective);
                setPreviewId(null);
                setSelectedExercise(null);
              }}
              className="mt-1 h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-white/20"
            >
              <option value="" disabled>
                Seleccionar
              </option>
              <option value="fuerza">Fuerza</option>
              <option value="volumen">Volumen (hipertrofia)</option>
              <option value="definicion">Definición (quema grasa)</option>
              <option value="salud">Salud / mantener condición</option>
              <option value="cardio">Cardiovascular</option>
            </select>
          </div>
        </div>
      </div>

      {!canShow ? (
        <section className="rounded-2xl border border-white/10 bg-black/20 p-5 sm:p-6">
          <div className="text-sm text-white/70">
            Selecciona <span className="font-semibold">Hombre/Mujer</span>,
            <span className="font-semibold"> días por semana</span> y
            <span className="font-semibold"> objetivo</span> para ver las rutinas recomendadas.
          </div>
        </section>
      ) : null}

      {canShow && selected ? (
        <section className="rounded-2xl border border-white/10 bg-black/20 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-semibold">Rutina seleccionada</div>
              <div className="mt-1 text-sm text-white/60">
                {selected.title}
                {selected.subtitle ? ` · ${selected.subtitle}` : ""}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleConfirmRoutine(selected)}
                className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500"
              >
                {confirmedId === selected.id ? "Rutina confirmada" : "Confirmar rutina"}
              </button>
              {confirmedId ? (
                <button
                  type="button"
                  onClick={() => {
                    clearSelectedRoutine();
                    setConfirmedId(null);
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white/80 hover:bg-white/10"
                >
                  Quitar rutina
                </button>
              ) : null}
              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white/80 hover:bg-white/10"
              >
                Ir a Inicio
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/30 p-5">
              <div className="text-sm font-semibold">Ejercicios de esta rutina</div>
              <div className="mt-3 space-y-4">
                {selected.days.map((d) => {
                  const exercises = d.exercises?.length
                    ? d.exercises
                    : templateExercisesForFocus(d.focus);

                  return (
                    <div key={d.label} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-white/60">{d.label}</div>
                      <div className="mt-1 text-sm font-medium">{d.focus}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {exercises.map((ex) => (
                          <button
                            key={ex}
                            type="button"
                            onClick={() => conectarEventos(ex)}
                            className="rounded-md border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
                          >
                            {ex}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-5">
              <div className="text-sm font-semibold">Sets y repeticiones recomendadas</div>
              {selectedExercise ? (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-base font-semibold">{selectedExercise.name}</div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                      <div className="text-xs text-white/60">Sets</div>
                      <div className="mt-1 font-semibold text-white">{selectedExercise.sets}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                      <div className="text-xs text-white/60">Reps</div>
                      <div className="mt-1 font-semibold text-white">{selectedExercise.reps}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                      <div className="text-xs text-white/60">Descanso</div>
                      <div className="mt-1 font-semibold text-white">
                        {selectedExercise.rest ?? "60–120 s"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-white/60">
                    Recomendación general: deja 1–2 repeticiones “en reserva” (RIR) en la mayoría
                    de series y sube peso progresivamente.
                  </div>

                  {selectedExerciseVideo?.videoUrl ? (
                    <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-black/30">
                      <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">
                        Video explicativo
                      </div>
                      <div className="aspect-video w-full">
                        <iframe
                          className="h-full w-full"
                          src={selectedExerciseVideo.videoUrl}
                          title={`Video ${selectedExercise.name}`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>

                      {selectedExerciseVideo.alternateVideoUrls?.length ? (
                        <div className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="text-xs text-white/60">
                            Si no carga, prueba otro video.
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const [next, ...rest] = selectedExerciseVideo.alternateVideoUrls ?? [];
                              if (!next) return;
                              setSelectedExerciseVideo({ videoUrl: next, alternateVideoUrls: rest });
                            }}
                            className="h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80 hover:bg-white/10"
                          >
                            Probar otro
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : videoLoading ? (
                    <div className="mt-5 text-sm text-white/60">Cargando video…</div>
                  ) : videoError ? (
                    <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                      {videoError}
                    </div>
                  ) : (
                    <div className="mt-5 text-sm text-white/60">
                      Selecciona un ejercicio para ver su video.
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 text-sm text-white/60">
                  Selecciona un ejercicio para ver sets y repeticiones.
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {canShow ? (
      <section className="rounded-2xl border border-white/10 bg-black/20 p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Opciones recomendadas</h2>
          <div className="flex flex-wrap gap-2 text-xs text-white/60">
            <Badge>1–2 días → Full Body</Badge>
            <Badge>3 días → Full o PPL</Badge>
            <Badge>4 días → Torso/Pierna</Badge>
            <Badge>5–6 días → Split o PPL</Badge>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {options.map((opt, idx) => (
            <div
              key={opt.id}
              className={`rounded-xl border border-white/10 bg-black/30 p-5 transition-transform duration-300 hover:-translate-y-1 hover:bg-white/5 hover:shadow-[0_18px_40px_-20px_rgba(59,130,246,0.55)] animate-floaty ${
                idx % 4 === 1
                  ? "animate-floaty-delay-1"
                  : idx % 4 === 2
                    ? "animate-floaty-delay-2"
                    : idx % 4 === 3
                      ? "animate-floaty-delay-3"
                      : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">{opt.title}</div>
                  {opt.subtitle ? (
                    <div className="mt-1 text-sm text-white/60">{opt.subtitle}</div>
                  ) : null}
                </div>
                {opt.gender === "mujer" ? <Badge>Mujer</Badge> : null}
              </div>

              {opt.tags?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {opt.tags.map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {opt.days.map((d) => (
                  <div key={d.label} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-white/60">{d.label}</div>
                    <div className="mt-1 text-sm font-medium">{d.focus}</div>
                    {d.exercises?.length ? (
                      <ul className="mt-2 space-y-1 text-sm text-white/70">
                        {d.exercises.map((ex) => (
                          <li key={ex}>{ex}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => handlePreviewRoutine(opt)}
                  className={`inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors ${
                    previewId === opt.id
                      ? "bg-blue-600 text-white"
                      : "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                  }`}
                >
                  {previewId === opt.id ? "Viendo detalles" : "Ver rutina"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      ) : null}

      <section className="rounded-2xl border border-white/10 bg-black/20 p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Ejercicios base (los que siempre aparecen)</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/30 p-5">
            <div className="text-sm font-semibold">Fuerza / Volumen</div>
            <ul className="mt-3 space-y-1 text-sm text-white/70">
              {baseExercises.fuerza_volumen.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-5">
            <div className="text-sm font-semibold">Piernas / Glúteos</div>
            <ul className="mt-3 space-y-1 text-sm text-white/70">
              {baseExercises.piernas_gluteos.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-5">
            <div className="text-sm font-semibold">Cardio / Definición</div>
            <ul className="mt-3 space-y-1 text-sm text-white/70">
              {baseExercises.cardio_definicion.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-5">
            <div className="text-sm font-semibold">Core</div>
            <ul className="mt-3 space-y-1 text-sm text-white/70">
              {baseExercises.core.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Importante</h2>
        <div className="mt-3 grid gap-3 text-sm text-white/70 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/30 p-5">
            <div className="font-medium">Más días ≠ mejores resultados</div>
            <div className="mt-2 text-white/70">
              Lo importante es: progresión de peso, buena técnica y descanso.
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-5">
            <div className="font-medium">Cómo elegir (clave)</div>
            <div className="mt-2 space-y-1">
              <div>1–2 días → Full Body</div>
              <div>3 días → Full o Push/Pull/Legs</div>
              <div>4 días → Torso/Pierna</div>
              <div>5–6 días → Split o Push/Pull/Legs</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
