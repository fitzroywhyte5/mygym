"use client";

import * as React from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type RutinaResult = {
  id: string;
  title: string;
};

type MealResult = {
  idMeal: string;
  strMeal?: string;
  strMealThumb?: string;
};

type SeguimientoEntry = {
  fecha: string;
  peso: string;
  ejercicio: string;
  pesoLevantado: string;
  series?: string;
  repeticiones?: string;
  cardio: string;
  notas: string;
};

const TRACKING_KEY = "mygym:seguimiento";

const RUTINAS: RutinaResult[] = [
  { id: "1d-full", title: "Full Body" },
  { id: "2d-fullx2", title: "Full Body x2" },
  { id: "2d-torsopierna", title: "Torso / Pierna" },
  { id: "3d-full", title: "Full Body" },
  { id: "3d-ppl", title: "Push / Pull / Legs" },
  { id: "3d-tpfull", title: "Torso / Pierna / Full" },
  { id: "4d-tp", title: "Torso / Pierna" },
  { id: "4d-splitclasico", title: "Split clásico" },
  { id: "4d-upperlowerextra", title: "Upper / Lower + extra" },
  { id: "5d-ppl-extra", title: "Push / Pull / Legs + extra" },
  { id: "5d-splitcompleto", title: "Split completo" },
  { id: "5d-gluteos", title: "Glúteos (enfocado mujeres)" },
  { id: "6d-pplx2", title: "Push / Pull / Legs x2" },
  { id: "6d-tpx3", title: "Torso / Pierna x3" },
  { id: "6d-splitavanzado", title: "Split avanzado" },
];

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function readSeguimientoEntries(): SeguimientoEntry[] {
  try {
    const raw = window.localStorage.getItem(TRACKING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x === "object")
      .map((x) => {
        const rec = x as Record<string, unknown>;
        return {
          fecha: String(rec.fecha ?? ""),
          peso: String(rec.peso ?? ""),
          ejercicio: String(rec.ejercicio ?? ""),
          pesoLevantado: String(rec.pesoLevantado ?? ""),
          series: rec.series == null ? undefined : String(rec.series),
          repeticiones: rec.repeticiones == null ? undefined : String(rec.repeticiones),
          cardio: String(rec.cardio ?? ""),
          notas: String(rec.notas ?? ""),
        } as SeguimientoEntry;
      })
      .filter((e) => e.fecha);
  } catch {
    return [];
  }
}

export default function BuscarPage() {
  const searchParams = useSearchParams();
  const q = String(searchParams?.get("q") ?? "").trim();

  const [meals, setMeals] = React.useState<MealResult[]>([]);
  const [mealsLoading, setMealsLoading] = React.useState(false);
  const [mealsError, setMealsError] = React.useState<string | null>(null);

  const normalized = React.useMemo(() => normalize(q), [q]);

  const rutinas = React.useMemo(() => {
    if (!normalized) return [];
    return RUTINAS.filter((r) => normalize(r.title).includes(normalized));
  }, [normalized]);

  const seguimiento = React.useMemo(() => {
    if (!normalized) return [];
    const entries = readSeguimientoEntries();
    return entries.filter((e) => {
      const blob = normalize(`${e.ejercicio} ${e.notas} ${e.fecha}`);
      return blob.includes(normalized);
    });
  }, [normalized]);

  React.useEffect(() => {
    let canceled = false;

    async function run() {
      if (!normalized) {
        setMeals([]);
        setMealsError(null);
        setMealsLoading(false);
        return;
      }

      setMealsLoading(true);
      setMealsError(null);
      setMeals([]);

      try {
        const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error("fetch_failed");
        const data = (await res.json()) as { meals?: MealResult[] | null };
        const list = Array.isArray(data?.meals) ? data.meals : [];
        if (!canceled) setMeals(list.slice(0, 10));
      } catch {
        if (!canceled) setMealsError("No se pudieron buscar comidas. Intenta de nuevo.");
      } finally {
        if (!canceled) setMealsLoading(false);
      }
    }

    void run();
    return () => {
      canceled = true;
    };
  }, [q, normalized]);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <div className="text-sm text-white/60">Resultados de búsqueda</div>
        <div className="mt-2 text-2xl font-semibold">{q ? `“${q}”` : "Escribe algo en el buscador"}</div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-white/80 hover:bg-white/10" href="/dashboard">
            Volver al inicio
          </Link>
          <Link className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-white/80 hover:bg-white/10" href="/dashboard/rutinas">
            Ir a Rutinas
          </Link>
          <Link className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-white/80 hover:bg-white/10" href="/dashboard/nutricion">
            Ir a Nutrición
          </Link>
          <Link className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-white/80 hover:bg-white/10" href="/dashboard/seguimiento">
            Ir a Seguimiento
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <div className="text-lg font-semibold">Rutinas</div>
        {normalized ? (
          rutinas.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rutinas.map((r) => (
                <Link
                  key={r.id}
                  href={`/dashboard/rutinas?routine=${encodeURIComponent(r.id)}`}
                  className="rounded-xl border border-white/10 bg-black/30 p-4 text-white/80 hover:bg-white/5"
                >
                  <div className="text-sm font-semibold text-white">{r.title}</div>
                  <div className="mt-1 text-xs text-white/60">Abrir en Rutinas</div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-3 text-sm text-white/60">No encontramos rutinas con ese nombre.</div>
          )
        ) : (
          <div className="mt-3 text-sm text-white/60">Escribe algo para buscar rutinas.</div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <div className="text-lg font-semibold">Comidas</div>
        {!normalized ? (
          <div className="mt-3 text-sm text-white/60">Escribe algo para buscar comidas.</div>
        ) : mealsLoading ? (
          <div className="mt-3 text-sm text-white/60">Buscando comidas…</div>
        ) : mealsError ? (
          <div className="mt-3 text-sm text-white/60">{mealsError}</div>
        ) : meals.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {meals.map((m) => (
              <Link
                key={m.idMeal}
                href="/dashboard/nutricion"
                className="flex gap-3 rounded-xl border border-white/10 bg-black/30 p-4 text-white/80 hover:bg-white/5"
              >
                <div className="h-12 w-12 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {m.strMealThumb ? <img src={m.strMealThumb} alt={m.strMeal ?? "Comida"} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{m.strMeal ?? "Comida"}</div>
                  <div className="mt-1 text-xs text-white/60">Ver en Nutrición</div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-white/60">No encontramos comidas con ese nombre.</div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <div className="text-lg font-semibold">Seguimiento</div>
        {normalized ? (
          seguimiento.length ? (
            <div className="mt-4 grid gap-3">
              {seguimiento.slice(0, 10).map((e) => (
                <Link
                  key={`${e.fecha}-${e.ejercicio}-${e.pesoLevantado}`}
                  href="/dashboard/seguimiento"
                  className="rounded-xl border border-white/10 bg-black/30 p-4 text-white/80 hover:bg-white/5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="text-sm font-semibold text-white">{e.ejercicio || "Registro"}</div>
                    <div className="text-xs text-white/60">{e.fecha}</div>
                  </div>
                  <div className="mt-2 text-xs text-white/60">
                    {e.pesoLevantado ? `Peso levantado: ${e.pesoLevantado}` : ""}
                    {e.series ? ` · Series: ${e.series}` : ""}
                    {e.repeticiones ? ` · Reps: ${e.repeticiones}` : ""}
                    {e.cardio ? ` · Cardio: ${e.cardio}` : ""}
                  </div>
                  {e.notas ? <div className="mt-2 line-clamp-2 text-xs text-white/60">{e.notas}</div> : null}
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-3 text-sm text-white/60">No encontramos registros que coincidan.</div>
          )
        ) : (
          <div className="mt-3 text-sm text-white/60">Escribe algo para buscar en tus registros.</div>
        )}
      </section>
    </div>
  );
}
