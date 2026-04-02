"use client";

import * as React from "react";
import Link from "next/link";

import { leerDatosUsuario, obtenerComidasPersonalizadasPorSeccion } from "@/lib/nutrition/themealdb";

type SelectedRoutine = {
  id: string;
  title: string;
  daysPerWeek: number;
  gender: "hombre" | "mujer";
  objective?: "fuerza" | "volumen" | "definicion" | "salud" | "cardio";
  subtitle?: string;
  days?: Array<{ label: string; focus: string; exercises?: string[] }>;
};

type StoredPlan = {
  form: {
    pesoActual: string;
    pesoMeta: string;
    estatura: string;
    edad: string;
  };
  generated: boolean;
  lockedForm: {
    pesoActual: string;
    pesoMeta: string;
    estatura: string;
    edad: string;
  } | null;
  trainingDays?: number[];
};

type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

function isWeekdayIndex(n: unknown): n is WeekdayIndex {
  return n === 0 || n === 1 || n === 2 || n === 3 || n === 4 || n === 5 || n === 6;
}

function normalizeTrainingDays(value: unknown): WeekdayIndex[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<WeekdayIndex>();
  for (const v of value) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n) && isWeekdayIndex(n)) unique.add(n);
  }
  return Array.from(unique).sort((a, b) => a - b);
}

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

type MealSummary = {
  idMeal: string;
  strMeal?: string;
  strMealThumb?: string;
};

const ROUTINE_KEY = "mygym:selectedRoutine";
const PLAN_KEY = "mygym:plan";
const TRACKING_KEY = "mygym:seguimiento";

function toNumber(value: string) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function formatMonthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function addMonths(d: Date, diff: number) {
  const next = new Date(d);
  next.setMonth(next.getMonth() + diff);
  return next;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function dayIndexMon0(d: Date) {
  return (d.getDay() + 6) % 7;
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function pickExercisesForDate(routine: SelectedRoutine | null, selected: Date, trainingDays: WeekdayIndex[]) {
  const days = routine?.days;
  if (!days?.length) return { label: "", focus: "", exercises: [] as string[] };

  const weekdayIdx = dayIndexMon0(selected);
  if (trainingDays.length) {
    if (!trainingDays.includes(weekdayIdx as WeekdayIndex)) {
      return { label: "", focus: "Descanso", exercises: [] as string[] };
    }
    const pos = trainingDays.indexOf(weekdayIdx as WeekdayIndex);
    const d = days[pos];
    if (!d) return { label: "", focus: "Descanso", exercises: [] as string[] };
    const exercises = d.exercises?.length ? d.exercises : [];
    return { label: d.label, focus: d.focus, exercises };
  }

  if (weekdayIdx >= days.length) return { label: "", focus: "Descanso", exercises: [] as string[] };
  const d = days[weekdayIdx];
  const exercises = d.exercises?.length ? d.exercises : [];
  return { label: d.label, focus: d.focus, exercises };
}

function templateExercisesForFocus(focus: string) {
  const f = String(focus ?? "").toLowerCase();
  if (f.includes("pecho")) return ["Press banca", "Press inclinado", "Fondos", "Aperturas"];
  if (f.includes("espalda")) return ["Dominadas", "Remo", "Jalón al pecho", "Peso muerto"];
  if (f.includes("pierna") || f.includes("piernas")) return ["Sentadilla", "Prensa", "Zancadas", "Peso muerto rumano"];
  if (f.includes("glúte") || f.includes("glute")) return ["Hip thrust", "Sentadilla", "Zancadas", "Patada de glúteo"];
  if (f.includes("hombro")) return ["Press militar", "Elevaciones laterales", "Pájaros", "Encogimientos"];
  if (f.includes("brazo") || f.includes("biceps") || f.includes("triceps")) return ["Curl bíceps", "Press francés", "Fondos", "Curl martillo"];
  if (f.includes("cardio") || f.includes("hiit") || f.includes("funcional")) return ["HIIT", "Burpees", "Saltar cuerda", "Mountain climbers"];
  if (f.includes("core")) return ["Plancha", "Crunch", "Elevaciones de piernas", "Russian twists"];
  if (f.includes("full") || f.includes("cuerpo completo")) return ["Sentadilla", "Press banca", "Remo", "Peso muerto", "Plancha"];
  if (f.includes("descanso")) return [];
  return ["Sentadilla", "Press banca", "Remo", "Plancha"];
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(fecha: string) {
  const d = new Date(`${fecha}T00:00:00`);
  return Number.isFinite(d.getTime()) ? d : null;
}

function diffDays(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function readRoutine(): SelectedRoutine | null {
  try {
    const raw = window.localStorage.getItem(ROUTINE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SelectedRoutine;
  } catch {
    return null;
  }
}

function readPlanTargetWeightKg(): number | null {
  try {
    const raw = window.localStorage.getItem(PLAN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const rec = parsed as Record<string, unknown>;
    if (!("generated" in rec) || !rec.generated) return null;
    const locked = (rec as StoredPlan).lockedForm;
    const base = locked ?? (rec as StoredPlan).form;
    const n = toNumber(String(base?.pesoMeta ?? ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function readPlanTrainingDays(): WeekdayIndex[] {
  try {
    const raw = window.localStorage.getItem(PLAN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return [];
    return normalizeTrainingDays((parsed as StoredPlan).trainingDays);
  } catch {
    return [];
  }
}

function readEntries(): SeguimientoEntry[] {
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

function saveEntries(entries: SeguimientoEntry[]) {
  try {
    window.localStorage.setItem(TRACKING_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

function defaultExerciseSuggestions(obj?: SelectedRoutine["objective"]) {
  if (obj === "definicion" || obj === "cardio") {
    return ["Burpees", "Saltar cuerda", "Mountain climbers", "HIIT", "Sentadilla", "Press banca"];
  }
  if (obj === "volumen" || obj === "fuerza") {
    return ["Sentadilla", "Peso muerto", "Press banca", "Dominadas", "Press militar", "Remo"];
  }
  return ["Sentadilla", "Press banca", "Peso muerto", "Dominadas", "Remo", "Plancha"];
}

function ProgressBar({ value }: { value: number }) {
  const pct = Number.isFinite(value) ? clamp(value, 0, 200) : NaN;
  return (
    <div className="mt-3 h-2 w-full overflow-hidden rounded-full border border-white/10 bg-white/5">
      <div
        className="h-full rounded-full bg-blue-600"
        style={{ width: Number.isFinite(pct) ? `${Math.min(100, pct)}%` : "0%" }}
      />
    </div>
  );
}

export default function SeguimientoPage() {
  const [routine, setRoutine] = React.useState<SelectedRoutine | null>(null);
  const [pesoMeta, setPesoMeta] = React.useState<number | null>(null);
  const [entries, setEntries] = React.useState<SeguimientoEntry[]>([]);
  const [trainingDays, setTrainingDays] = React.useState<WeekdayIndex[]>([]);
  const [savedMsg, setSavedMsg] = React.useState(false);

  const [calMonth, setCalMonth] = React.useState<Date>(() => startOfMonth(new Date()));
  const [selectedDateIso, setSelectedDateIso] = React.useState<string>(() => todayISO());
  const [mealLoading, setMealLoading] = React.useState(false);
  const [meal, setMeal] = React.useState<MealSummary | null>(null);

  const [form, setForm] = React.useState<SeguimientoEntry>({
    fecha: todayISO(),
    peso: "",
    ejercicio: "",
    pesoLevantado: "",
    series: "",
    repeticiones: "",
    cardio: "",
    notas: "",
  });

  React.useEffect(() => {
    setRoutine(readRoutine());
    setPesoMeta(readPlanTargetWeightKg());
    setEntries(readEntries());
    setTrainingDays(readPlanTrainingDays());
  }, []);

  React.useEffect(() => {
    function refresh() {
      setRoutine(readRoutine());
      setPesoMeta(readPlanTargetWeightKg());
      setEntries(readEntries());
      setTrainingDays(readPlanTrainingDays());
    }
    window.addEventListener("mygym:routineChanged", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("mygym:routineChanged", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  React.useEffect(() => {
    let canceled = false;
    (async () => {
      setMealLoading(true);
      setMeal(null);
      try {
        const { routine: r, profile } = leerDatosUsuario();
        if (!r || !profile) {
          if (!canceled) setMeal(null);
          return;
        }

        const list = (await obtenerComidasPersonalizadasPorSeccion({
          routine: r,
          profile,
          seccion: "comida",
          maxResults: 6,
        })) as MealSummary[];
        const picked = list?.find((m) => m?.idMeal && m?.strMealThumb) ?? null;
        if (!canceled) setMeal(picked);
      } catch {
        if (!canceled) setMeal(null);
      } finally {
        if (!canceled) setMealLoading(false);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [selectedDateIso, routine?.id]);

  const ordered = React.useMemo(() => {
    const list = [...entries];
    list.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    return list;
  }, [entries]);

  const stats = React.useMemo(() => {
    const weights = ordered
      .map((e) => ({ fecha: e.fecha, peso: toNumber(e.peso) }))
      .filter((x) => Number.isFinite(x.peso));

    const first = weights.length ? weights[weights.length - 1] : null;
    const last = weights.length ? weights[0] : null;

    const pesoActual = last ? last.peso : NaN;
    const pesoInicial = first ? first.peso : NaN;
    const cambioTotal = Number.isFinite(pesoActual) && Number.isFinite(pesoInicial) ? round1(pesoActual - pesoInicial) : NaN;

    let promedioSemanal = NaN;
    if (first && last) {
      const d1 = parseISODate(first.fecha);
      const d2 = parseISODate(last.fecha);
      if (d1 && d2) {
        const days = Math.max(1, diffDays(d1, d2));
        const weeks = Math.max(1 / 7, days / 7);
        promedioSemanal = round1((pesoActual - pesoInicial) / weeks);
      }
    }

    let progresoMetaPct = NaN;
    if (pesoMeta != null && first && last) {
      const denom = pesoMeta - pesoInicial;
      if (denom !== 0) {
        const pct = ((pesoActual - pesoInicial) / denom) * 100;
        progresoMetaPct = clamp(Math.round(pct), 0, 100);
      }
    }

    const fuerzaByEj: Record<string, { first: number; last: number }> = {};
    const byDateAsc = [...ordered].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
    for (const e of byDateAsc) {
      const name = String(e.ejercicio ?? "").trim();
      const w = toNumber(e.pesoLevantado);
      if (!name || !Number.isFinite(w) || w <= 0) continue;
      if (!fuerzaByEj[name]) fuerzaByEj[name] = { first: w, last: w };
      fuerzaByEj[name].last = Math.max(fuerzaByEj[name].last, w);
    }
    const mejoraFuerzaTotal = round1(
      Object.values(fuerzaByEj)
        .map((x) => (Number.isFinite(x.last) && Number.isFinite(x.first) ? x.last - x.first : 0))
        .reduce((a, b) => a + b, 0),
    );

    const now = new Date();
    const last7Start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    const cardioWeek = ordered
      .filter((e) => {
        const d = parseISODate(e.fecha);
        return d ? d >= last7Start && d <= now : false;
      })
      .map((e) => toNumber(e.cardio))
      .filter((n) => Number.isFinite(n) && n > 0)
      .reduce((a, b) => a + b, 0);

    const allCardio = ordered
      .map((e) => {
        const d = parseISODate(e.fecha);
        return { d, n: toNumber(e.cardio) };
      })
      .filter((x) => x.d && Number.isFinite(x.n) && x.n > 0) as Array<{ d: Date; n: number }>;
    let cardioPromSemanal = NaN;
    if (allCardio.length) {
      const minD = allCardio.reduce((m, x) => (x.d < m ? x.d : m), allCardio[0].d);
      const maxD = allCardio.reduce((m, x) => (x.d > m ? x.d : m), allCardio[0].d);
      const weeks = Math.max(1 / 7, Math.max(1, diffDays(minD, maxD)) / 7);
      const total = allCardio.reduce((a, b) => a + b.n, 0);
      cardioPromSemanal = round1(total / weeks);
    }

    const expectedTrainingDays = routine?.daysPerWeek ?? 0;
    const trainingDaysSet = new Set(
      ordered
        .filter((e) => String(e.ejercicio ?? "").trim() && (toNumber(e.pesoLevantado) > 0 || toNumber(e.series ?? "") > 0 || toNumber(e.repeticiones ?? "") > 0))
        .map((e) => e.fecha),
    );
    const trainingDaysLast7 = Array.from(trainingDaysSet)
      .map((f) => parseISODate(f))
      .filter((d) => d && d >= last7Start && d <= now).length;
    const entrenamientoPct = expectedTrainingDays > 0 ? clamp(Math.round((trainingDaysLast7 / expectedTrainingDays) * 100), 0, 100) : NaN;

    const cardioTarget = routine?.objective === "cardio" || routine?.objective === "definicion" ? 150 : 90;
    const cardioPct = clamp(Math.round((cardioWeek / cardioTarget) * 100), 0, 200);

    let progresoPesoEstado: "correcto" | "lento" | "rapido" | null = null;
    if (pesoMeta != null && first && last) {
      const d1 = parseISODate(first.fecha);
      const d2 = parseISODate(last.fecha);
      if (d1 && d2) {
        const weeks = Math.max(0, Math.max(1, diffDays(d1, d2)) / 7);
        const plannedWeeks = 12;
        const t = clamp(plannedWeeks ? weeks / plannedWeeks : 0, 0, 1);
        const expected = pesoInicial + (pesoMeta - pesoInicial) * t;
        const delta = pesoActual - expected;
        if (Math.abs(delta) <= 0.6) progresoPesoEstado = "correcto";
        else if (delta > 0) progresoPesoEstado = "lento";
        else progresoPesoEstado = "rapido";
      }
    }

    return {
      pesoActual,
      cambioTotal,
      promedioSemanal,
      progresoMetaPct,
      mejoraFuerzaTotal,
      cardioWeek: round1(cardioWeek),
      cardioPromSemanal,
      entrenamientoPct,
      cardioPct,
      progresoPesoEstado,
    };
  }, [ordered, pesoMeta, routine?.daysPerWeek, routine?.objective]);

  function onField<K extends keyof SeguimientoEntry>(key: K, value: SeguimientoEntry[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function guardarRegistro() {
    const next: SeguimientoEntry = {
      fecha: String(form.fecha || todayISO()),
      peso: String(form.peso ?? ""),
      ejercicio: String(form.ejercicio ?? ""),
      pesoLevantado: String(form.pesoLevantado ?? ""),
      series: String(form.series ?? ""),
      repeticiones: String(form.repeticiones ?? ""),
      cardio: String(form.cardio ?? ""),
      notas: String(form.notas ?? ""),
    };

    const updated = [next, ...entries];
    saveEntries(updated);
    setEntries(updated);
    setSavedMsg(true);
    window.setTimeout(() => setSavedMsg(false), 1300);
    setForm((f) => ({
      ...f,
      fecha: todayISO(),
      ejercicio: "",
      pesoLevantado: "",
      series: "",
      repeticiones: "",
      cardio: "",
      notas: "",
    }));
  }

  const suggestions = React.useMemo(() => defaultExerciseSuggestions(routine?.objective), [routine?.objective]);

  const hasData = entries.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Seguimiento</h1>
        <p className="mt-2 text-sm text-white/60">Registra tu progreso diario y revisa tus estadísticas.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-xs text-white/60">Peso actual</div>
          <div className="mt-1 text-lg font-semibold">
            {Number.isFinite(stats.pesoActual) ? `${round1(stats.pesoActual)} kg` : "—"}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-xs text-white/60">Cambio total</div>
          <div className="mt-1 text-lg font-semibold">
            {Number.isFinite(stats.cambioTotal) ? `${stats.cambioTotal > 0 ? "+" : ""}${stats.cambioTotal} kg` : "—"}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-xs text-white/60">Progreso hacia meta</div>
          <div className="mt-1 text-lg font-semibold">
            {Number.isFinite(stats.progresoMetaPct) ? `${stats.progresoMetaPct}%` : "—"}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-xs text-white/60">Cardio semanal</div>
          <div className="mt-1 text-lg font-semibold">{Number.isFinite(stats.cardioWeek) ? `${stats.cardioWeek} min` : "—"}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-xs text-white/60">Mejora en fuerza</div>
          <div className="mt-1 text-lg font-semibold">{Number.isFinite(stats.mejoraFuerzaTotal) ? `+${stats.mejoraFuerzaTotal} kg` : "—"}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Calendario</div>
            <div className="mt-1 text-xs text-white/60">Toca un día para ver ejercicios y recomendación.</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCalMonth((d) => startOfMonth(addMonths(d, -1)))}
              className="h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80 hover:bg-white/10"
            >
              Mes anterior
            </button>
            <button
              type="button"
              onClick={() => setCalMonth((d) => startOfMonth(addMonths(d, 1)))}
              className="h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80 hover:bg-white/10"
            >
              Mes siguiente
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-xs text-white/60">{formatMonthKey(calMonth)}</div>
            <div className="mt-3 grid grid-cols-7 gap-2 text-xs text-white/60">
              <div>L</div>
              <div>M</div>
              <div>X</div>
              <div>J</div>
              <div>V</div>
              <div>S</div>
              <div>D</div>
            </div>

            <div className="mt-2 grid grid-cols-7 gap-2">
              {(() => {
                const start = startOfMonth(calMonth);
                const totalDays = daysInMonth(calMonth);
                const pad = dayIndexMon0(start);
                const cells = Array.from({ length: pad + totalDays }, (_, i) => {
                  if (i < pad) return null;
                  const dayNum = i - pad + 1;
                  const d = new Date(calMonth.getFullYear(), calMonth.getMonth(), dayNum);
                  const iso = toISODate(d);
                  const selected = iso === selectedDateIso;
                  const hasEntry = entries.some((e) => e.fecha === iso);
                  const plannedTraining = trainingDays.includes(dayIndexMon0(d) as WeekdayIndex);
                  const today = new Date();
                  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  const isPastOrToday = d.getTime() <= todayStart.getTime();
                  const isRestDay = !hasEntry && isPastOrToday;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSelectedDateIso(iso)}
                      className={`h-9 rounded-md border px-2 text-sm ${
                        selected
                          ? "border-blue-400/40 bg-blue-600/20 text-white"
                          : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                      }`}
                      title={hasEntry ? "Con registro" : isRestDay ? "Día de descanso" : ""}
                    >
                      <div className="flex items-center justify-between">
                        <span>{dayNum}</span>
                        <span className="flex items-center gap-1">
                          {isRestDay ? (
                            <span className="relative inline-flex h-2.5 w-2.5 items-center justify-center">
                              <span className="absolute inline-flex h-full w-full rounded-full bg-white/25 motion-safe:animate-ping" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white/60" />
                            </span>
                          ) : null}
                          {plannedTraining ? <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> : null}
                          {hasEntry ? <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> : null}
                        </span>
                      </div>
                    </button>
                  );
                });
                return cells;
              })()}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-sm font-semibold">{selectedDateIso}</div>
            {!routine?.title ? (
              <div className="mt-2 text-sm text-white/60">Selecciona una rutina para ver los ejercicios del día.</div>
            ) : null}

            {routine?.title ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-4">
                {(() => {
                  const selectedDate = parseISODate(selectedDateIso) ?? new Date();
                  const day = pickExercisesForDate(routine, selectedDate, trainingDays);
                  const hasExplicitExercises = !!day.exercises?.length;
                  const hasFocus = !!String(day.focus ?? "").trim();
                  const isRest = !hasExplicitExercises && (!hasFocus || day.focus === "Descanso");
                  const exs = hasExplicitExercises
                    ? day.exercises
                    : !isRest && hasFocus
                      ? templateExercisesForFocus(day.focus)
                      : [];
                  return (
                    <div>
                      <div className="text-xs text-white/60">Entrenamiento</div>
                      <div className="mt-1 text-sm font-semibold">{isRest ? "Descanso" : day.focus || "—"}</div>
                      {isRest ? (
                        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-semibold text-white">Día de descanso</div>
                              <div className="mt-1 text-xs text-white/60">Recupera, hidrátate y duerme bien.</div>
                            </div>
                            <div className="relative h-10 w-10">
                              <div className="absolute inset-0 rounded-full bg-blue-500/20 blur" />
                              <div className="absolute left-1 top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-blue-300/80" />
                              <div className="absolute right-1 top-3 h-2 w-2 animate-pulse rounded-full bg-blue-300/60" />
                              <div className="absolute left-4 bottom-1 h-1.5 w-1.5 animate-pulse rounded-full bg-blue-300/50" />
                            </div>
                          </div>
                          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/5">
                            <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-500/30" />
                          </div>
                        </div>
                      ) : exs.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {exs.map((ex) => (
                            <Link
                              key={ex}
                              href={`/dashboard/rutinas?exercise=${encodeURIComponent(ex)}`}
                              className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
                            >
                              {ex}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-white/60">Descanso o ejercicios no definidos.</div>
                      )}
                      {!isRest ? (
                        <div className="mt-2 text-xs text-white/50">Toca un ejercicio para ver el video en Rutinas.</div>
                      ) : null}
                    </div>
                  );
                })()}
              </div>
            ) : null}

            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs text-white/60">Recomendación de comida</div>
              {mealLoading ? (
                <div className="mt-2 text-sm text-white/60">Buscando recomendación…</div>
              ) : meal?.idMeal && meal?.strMealThumb ? (
                <div className="mt-3 flex gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={meal.strMealThumb} alt={meal.strMeal ?? "Comida"} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{meal.strMeal ?? "Comida"}</div>
                    <div className="mt-2">
                      <Link
                        href="/dashboard/nutricion"
                        className="inline-flex h-9 items-center rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80 hover:bg-white/10"
                      >
                        Ver más en Nutrición
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-sm text-white/60">No hay recomendación disponible aún.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Registro diario</div>
              <div className="mt-1 text-xs text-white/60">Se guarda en tu dispositivo.</div>
            </div>
            {savedMsg ? <div className="text-xs text-green-200">Registro guardado</div> : null}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs text-white/60">Fecha</div>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => onField("fecha", e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-white/20"
              />
            </div>
            <div>
              <div className="text-xs text-white/60">Peso corporal (kg)</div>
              <input
                value={form.peso}
                onChange={(e) => onField("peso", e.target.value)}
                inputMode="decimal"
                placeholder="Ej: 78"
                className="mt-1 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
              />
            </div>
            <div>
              <div className="text-xs text-white/60">Ejercicio</div>
              <input
                list="mygym-exercises"
                value={form.ejercicio}
                onChange={(e) => onField("ejercicio", e.target.value)}
                placeholder="Ej: Sentadilla"
                className="mt-1 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
              />
              <datalist id="mygym-exercises">
                {suggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div>
              <div className="text-xs text-white/60">Peso levantado (kg)</div>
              <input
                value={form.pesoLevantado}
                onChange={(e) => onField("pesoLevantado", e.target.value)}
                inputMode="decimal"
                placeholder="Ej: 60"
                className="mt-1 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
              />
            </div>
            <div>
              <div className="text-xs text-white/60">Series (opcional)</div>
              <input
                value={form.series ?? ""}
                onChange={(e) => onField("series", e.target.value)}
                inputMode="numeric"
                placeholder="Ej: 4"
                className="mt-1 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
              />
            </div>
            <div>
              <div className="text-xs text-white/60">Repeticiones (opcional)</div>
              <input
                value={form.repeticiones ?? ""}
                onChange={(e) => onField("repeticiones", e.target.value)}
                inputMode="numeric"
                placeholder="Ej: 10"
                className="mt-1 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
              />
            </div>
            <div>
              <div className="text-xs text-white/60">Cardio (min)</div>
              <input
                value={form.cardio}
                onChange={(e) => onField("cardio", e.target.value)}
                inputMode="numeric"
                placeholder="Ej: 20"
                className="mt-1 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
              />
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs text-white/60">Notas</div>
              <textarea
                value={form.notas}
                onChange={(e) => onField("notas", e.target.value)}
                rows={3}
                placeholder="Cómo te sentiste, energía, sueño, etc."
                className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={guardarRegistro}
              className="inline-flex h-10 items-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Guardar registro
            </button>
            <div className="text-xs text-white/50">
              {routine?.title ? `Rutina actual: ${routine.title}` : "Selecciona una rutina para mejorar el cumplimiento."}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
          <div className="text-sm font-semibold">Cumplimiento</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs text-white/60">Entrenamiento (7 días)</div>
              <div className="mt-1 text-lg font-semibold">
                {Number.isFinite(stats.entrenamientoPct) ? `${stats.entrenamientoPct}%` : "—"}
              </div>
              {Number.isFinite(stats.entrenamientoPct) ? <ProgressBar value={stats.entrenamientoPct} /> : null}
              <div className="mt-1 text-xs text-white/50">
                {routine?.daysPerWeek ? `Meta: ${routine.daysPerWeek} días/semana` : "Selecciona una rutina"}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs text-white/60">Cardio (7 días)</div>
              <div className="mt-1 text-lg font-semibold">{Number.isFinite(stats.cardioPct) ? `${stats.cardioPct}%` : "—"}</div>
              {Number.isFinite(stats.cardioPct) ? <ProgressBar value={stats.cardioPct} /> : null}
              <div className="mt-1 text-xs text-white/50">Objetivo sugerido según rutina</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4 sm:col-span-2">
              <div className="text-xs text-white/60">Progreso de peso</div>
              <div className="mt-1 text-lg font-semibold">
                {stats.progresoPesoEstado ? (stats.progresoPesoEstado === "correcto" ? "Correcto" : stats.progresoPesoEstado === "lento" ? "Lento" : "Rápido") : "—"}
              </div>
              {Number.isFinite(stats.progresoMetaPct) ? <ProgressBar value={stats.progresoMetaPct} /> : null}
              <div className="mt-1 text-xs text-white/50">
                {pesoMeta != null ? `Peso meta detectado desde Plan: ${pesoMeta} kg` : "Genera tu Plan para detectar tu peso meta"}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Historial</div>
            <div className="mt-1 text-xs text-white/60">Ordenado por fecha (más reciente primero).</div>
          </div>
          {!hasData ? null : <div className="text-xs text-white/50">Registros: {entries.length}</div>}
        </div>

        {!hasData ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-5 text-sm text-white/60">
            Aún no tienes registros. Guarda tu primer registro para ver estadísticas.
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {ordered.slice(0, 40).map((e, idx) => (
              <div key={`${e.fecha}-${idx}`} className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{e.fecha}</div>
                    <div className="mt-1 text-xs text-white/60">
                      {e.peso ? `Peso: ${e.peso} kg` : ""}
                      {e.peso && (e.ejercicio || e.cardio) ? " · " : ""}
                      {e.ejercicio ? `Ejercicio: ${e.ejercicio}` : ""}
                      {e.ejercicio && e.pesoLevantado ? ` (${e.pesoLevantado} kg)` : ""}
                      {(e.ejercicio || e.peso) && e.cardio ? " · " : ""}
                      {e.cardio ? `Cardio: ${e.cardio} min` : ""}
                    </div>
                  </div>
                </div>

                {e.notas ? <div className="mt-3 text-sm text-white/70">{e.notas}</div> : null}
              </div>
            ))}
            {ordered.length > 40 ? <div className="text-xs text-white/50">Mostrando 40 registros.</div> : null}
          </div>
        )}
      </section>
    </div>
  );
}
