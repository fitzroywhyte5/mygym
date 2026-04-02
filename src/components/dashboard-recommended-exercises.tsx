"use client";

import * as React from "react";
import Link from "next/link";
import {
  Brain,
  Dumbbell,
  HeartPulse,
  Move,
  Scale,
  Shield,
  Timer,
} from "lucide-react";

type Rec = {
  id: string;
  name: string;
  short: string;
  icon: React.ReactNode;
  goalTags: string[];
  muscles: string[];
  benefits: string[];
  tips: string[];
  habits: string[];
  ctaExerciseQuery?: string;
};

const RECS: Rec[] = [
  {
    id: "sentadilla",
    name: "Sentadilla",
    short: "Base para fuerza y piernas.",
    icon: <Dumbbell className="h-10 w-10 text-blue-200" />,
    goalTags: ["fuerza", "volumen", "salud"],
    muscles: ["Cuádriceps", "Glúteos", "Core"],
    benefits: ["Mejora fuerza general", "Aumenta masa en piernas", "Mejora estabilidad"],
    tips: ["Espalda neutra", "Rodillas alineadas", "Controla la bajada"],
    habits: ["Calienta 5–8 min", "Aumenta peso poco a poco", "Duerme 7–9 h"],
    ctaExerciseQuery: "Sentadilla",
  },
  {
    id: "press-banca",
    name: "Press banca",
    short: "Pecho, tríceps y hombro.",
    icon: <Shield className="h-10 w-10 text-emerald-200" />,
    goalTags: ["fuerza", "volumen"],
    muscles: ["Pecho", "Tríceps", "Deltoides"],
    benefits: ["Mejora empuje", "Aumenta masa en torso", "Progresión medible"],
    tips: ["Escápulas atrás", "Pies firmes", "Barra al pecho medio"],
    habits: ["Proteína diaria", "Registra tus series", "Descansa 60–120 s"],
    ctaExerciseQuery: "Press banca",
  },
  {
    id: "dominadas",
    name: "Dominadas",
    short: "Espalda fuerte y postura.",
    icon: <Move className="h-10 w-10 text-violet-200" />,
    goalTags: ["fuerza", "salud", "volumen"],
    muscles: ["Dorsales", "Bíceps", "Core"],
    benefits: ["Mejora espalda", "Mejora postura", "Alta transferencia"],
    tips: ["Evita balanceo", "Mentón sobre barra", "Baja controlado"],
    habits: ["Añade repeticiones semanales", "Haz movilidad de hombro", "Hidrátate"],
    ctaExerciseQuery: "Dominadas",
  },
  {
    id: "hiit",
    name: "HIIT",
    short: "Cardio intenso en poco tiempo.",
    icon: <Timer className="h-10 w-10 text-rose-200" />,
    goalTags: ["definicion", "cardio", "salud"],
    muscles: ["Piernas", "Core", "Sistema cardiovascular"],
    benefits: ["Mejora condición", "Quema calorías", "Ahorra tiempo"],
    tips: ["Intervalos 20/40 o 30/30", "Mantén técnica", "Empieza suave"],
    habits: ["Camina más (pasos)", "No entrenes al límite todos los días", "Duerme bien"],
    ctaExerciseQuery: "HIIT",
  },
  {
    id: "plancha",
    name: "Plancha",
    short: "Core y estabilidad.",
    icon: <Brain className="h-10 w-10 text-amber-200" />,
    goalTags: ["salud", "fuerza", "principiantes"],
    muscles: ["Core", "Glúteos", "Espalda"],
    benefits: ["Mejora estabilidad", "Protege zona lumbar", "Mejora postura"],
    tips: ["Cadera neutra", "Aprieta glúteos", "Respira"],
    habits: ["2–3 veces por semana", "Suma segundos cada semana", "Evita dolor lumbar"],
    ctaExerciseQuery: "Plancha",
  },
  {
    id: "movilidad",
    name: "Movilidad",
    short: "Mejora rango y reduce molestias.",
    icon: <HeartPulse className="h-10 w-10 text-sky-200" />,
    goalTags: ["salud", "principiantes"],
    muscles: ["Caderas", "Tobillos", "Hombros"],
    benefits: ["Mejor técnica", "Menos molestias", "Recuperación"],
    tips: ["5–10 min", "Sin dolor", "Constancia"],
    habits: ["Estira suave", "Pausa activa", "Postura en el día"],
  },
];

function GlowIcon({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div className="relative">
      <div className={`absolute inset-0 rounded-full ${color} blur`} />
      <div className="relative">{children}</div>
    </div>
  );
}

function colorForId(id: string) {
  switch (id) {
    case "sentadilla":
      return "bg-blue-500/20";
    case "press-banca":
      return "bg-emerald-500/20";
    case "dominadas":
      return "bg-violet-500/20";
    case "hiit":
      return "bg-rose-500/20";
    case "plancha":
      return "bg-amber-500/20";
    default:
      return "bg-sky-500/20";
  }
}

export function DashboardRecommendedExercises() {
  const [selectedId, setSelectedId] = React.useState<string>(RECS[0]?.id ?? "");

  const selected = React.useMemo(() => RECS.find((r) => r.id === selectedId) ?? null, [selectedId]);

  return (
    <section>
      <div className="flex items-end justify-between">
        <h2 className="text-lg font-semibold">Recomendado</h2>
        <div className="text-sm text-white/60">Toca un ejercicio para ver detalles.</div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {RECS.map((r, idx) => {
          const active = r.id === selectedId;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedId(r.id)}
              className={`rounded-xl border bg-black/30 p-4 text-left transition-transform duration-300 hover:-translate-y-1 hover:bg-white/5 hover:shadow-[0_18px_40px_-20px_rgba(59,130,246,0.55)] animate-floaty ${
                idx % 4 === 1
                  ? "animate-floaty-delay-1"
                  : idx % 4 === 2
                    ? "animate-floaty-delay-2"
                    : idx % 4 === 3
                      ? "animate-floaty-delay-3"
                      : ""
              } ${active ? "border-blue-400/40" : "border-white/10"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{r.name}</div>
                  <div className="mt-1 text-xs text-white/60">{r.short}</div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                  <GlowIcon color={colorForId(r.id)}>{r.icon}</GlowIcon>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {r.goalTags.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-6 lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-white/60">Ejercicio</div>
                <div className="mt-1 text-xl font-semibold">{selected.name}</div>
                <div className="mt-2 text-sm text-white/60">
                  {selected.benefits.slice(0, 3).join(" · ")}
                </div>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <GlowIcon color={colorForId(selected.id)}>{selected.icon}</GlowIcon>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="text-xs text-white/60">Músculos</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selected.muscles.map((m) => (
                    <span
                      key={m}
                      className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="text-xs text-white/60">Tips rápidos</div>
                <div className="mt-2 grid gap-1 text-sm text-white/75">
                  {selected.tips.slice(0, 3).map((t) => (
                    <div key={t} className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-white/40" />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {selected.ctaExerciseQuery ? (
              <div className="mt-4">
                <Link
                  href={`/dashboard/rutinas?exercise=${encodeURIComponent(selected.ctaExerciseQuery)}`}
                  className="inline-flex h-10 items-center rounded-md border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Ver video / guía
                </Link>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Hábitos recomendados</div>
                <div className="mt-1 text-xs text-white/60">Cosas simples que aceleran resultados.</div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                <GlowIcon color="bg-white/10">
                  <Scale className="h-5 w-5 text-white/70" />
                </GlowIcon>
              </div>
            </div>

            <div className="mt-4 grid gap-2 text-sm text-white/75">
              {selected.habits.slice(0, 5).map((h) => (
                <div key={h} className="rounded-lg border border-white/10 bg-black/30 p-3">
                  {h}
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs text-white/60">Extra</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70">Hidratación</span>
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70">Sueño</span>
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70">Pasos</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
