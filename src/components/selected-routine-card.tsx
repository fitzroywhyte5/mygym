"use client";

import * as React from "react";
import Link from "next/link";

type SelectedRoutine = {
  id: string;
  title: string;
  daysPerWeek: number;
  gender: "hombre" | "mujer";
  objective?: "fuerza" | "volumen" | "definicion" | "salud" | "cardio";
  subtitle?: string;
  days?: Array<{ label: string; focus: string; exercises?: string[] }>;
};

const STORAGE_KEY = "mygym:selectedRoutine";

export function SelectedRoutineCard() {
  const [routine, setRoutine] = React.useState<SelectedRoutine | null>(null);

  const objectiveLabel = React.useMemo(() => {
    if (!routine?.objective) return null;
    switch (routine.objective) {
      case "fuerza":
        return "Fuerza";
      case "volumen":
        return "Volumen";
      case "definicion":
        return "Definición";
      case "salud":
        return "Salud";
      case "cardio":
        return "Cardiovascular";
      default:
        return null;
    }
  }, [routine?.objective]);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SelectedRoutine;
      if (!parsed?.id || !parsed?.title) return;
      setRoutine(parsed);
    } catch {
      // ignore
    }
  }, []);

  if (!routine) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/30 p-5">
        <div className="text-sm font-semibold">Rutina seleccionada</div>
        <div className="mt-2 text-sm text-white/60">
          Aún no has seleccionado una rutina.
        </div>
        <div className="mt-4">
          <Link
            href="/dashboard/rutinas"
            className="inline-flex h-9 items-center rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80 hover:bg-white/10"
          >
            Elegir rutina
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">Rutina seleccionada</div>
          <div className="mt-2 text-base font-semibold">{routine.title}</div>
          {routine.subtitle ? (
            <div className="mt-1 text-sm text-white/60">{routine.subtitle}</div>
          ) : null}
          <div className="mt-2 text-sm text-white/60">
            {routine.gender === "hombre" ? "Hombre" : "Mujer"} · {routine.daysPerWeek} días/semana
            {objectiveLabel ? ` · ${objectiveLabel}` : ""}
          </div>
        </div>
        <Link
          href="/dashboard/rutinas"
          className="inline-flex h-9 items-center rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80 hover:bg-white/10"
        >
          Cambiar
        </Link>
      </div>
    </div>
  );
}

export function setSelectedRoutine(r: SelectedRoutine) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
  try {
    window.dispatchEvent(new Event("mygym:routineChanged"));
  } catch {
    // ignore
  }
}

export function clearSelectedRoutine() {
  window.localStorage.removeItem(STORAGE_KEY);
}
