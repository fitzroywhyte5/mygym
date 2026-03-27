"use client";

import * as React from "react";

type SelectedRoutine = {
  id: string;
  title: string;
  daysPerWeek: number;
  gender: "hombre" | "mujer";
  objective?: "fuerza" | "volumen" | "definicion" | "salud" | "cardio";
  subtitle?: string;
};

type UserProfile = {
  firstName?: string;
  lastName?: string;
  age?: string;
  heightCm?: string;
  weightKg?: string;
  sex?: string;
};

type PlanObjective = "definicion" | "volumen" | "mantenimiento";

type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type PlanResult = {
  pesoActual: number;
  pesoMeta: number;
  diferencia: number;
  objetivo: PlanObjective;
  semanasMin: number;
  semanasMax: number;
  proyeccionUnidad: "semanal" | "mensual";
  proyeccion: Array<{ label: string; pesoEstimado: number }>;
};

const ROUTINE_KEY = "mygym:selectedRoutine";
const PROFILE_KEY = "mygym:userProfile";
const PLAN_KEY = "mygym:plan";

function toNumber(value: string) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function bmi(heightCm: number, weightKg: number) {
  const h = heightCm / 100;
  if (!Number.isFinite(h) || h <= 0) return NaN;
  if (!Number.isFinite(weightKg) || weightKg <= 0) return NaN;
  return weightKg / (h * h);
}

function bmiLabel(b: number) {
  if (!Number.isFinite(b)) return null;
  if (b < 18.5) return "Bajo peso";
  if (b < 25) return "Normal";
  if (b < 30) return "Sobrepeso";
  return "Obesidad";
}

function readStringField(obj: unknown, key: string) {
  if (!obj || typeof obj !== "object") return "";
  const rec = obj as Record<string, unknown>;
  const val = rec[key];
  return typeof val === "string" || typeof val === "number" ? String(val) : "";
}

function leerDatos() {
  let routine: SelectedRoutine | null = null;
  let profile: UserProfile | null = null;
  let savedPlan: Partial<FormState> | null = null;
  let storedPlan: StoredPlan | null = null;

  try {
    const raw = window.localStorage.getItem(ROUTINE_KEY);
    if (raw) routine = JSON.parse(raw) as SelectedRoutine;
  } catch {
    // ignore
  }

  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (raw) profile = JSON.parse(raw) as UserProfile;
  } catch {
    // ignore
  }

  try {
    const raw = window.localStorage.getItem(PLAN_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (
        parsed &&
        typeof parsed === "object" &&
        "form" in (parsed as Record<string, unknown>)
      ) {
        const p = parsed as Partial<StoredPlan>;
        if (p.form && typeof p.form === "object") {
          storedPlan = {
            form: {
              pesoActual: readStringField(p.form, "pesoActual"),
              pesoMeta: readStringField(p.form, "pesoMeta"),
              estatura: readStringField(p.form, "estatura"),
              edad: readStringField(p.form, "edad"),
            },
            generated: Boolean(p.generated),
            lockedForm: p.lockedForm
              ? {
                  pesoActual: readStringField(p.lockedForm, "pesoActual"),
                  pesoMeta: readStringField(p.lockedForm, "pesoMeta"),
                  estatura: readStringField(p.lockedForm, "estatura"),
                  edad: readStringField(p.lockedForm, "edad"),
                }
              : null,
          };
        }
      } else {
        savedPlan = parsed as Partial<FormState>;
      }
    }
  } catch {
    // ignore
  }

  return { routine, profile, savedPlan, storedPlan };
}

function determinarObjetivo(pesoActual: number, pesoMeta: number): PlanObjective {
  if (pesoMeta < pesoActual) return "definicion";
  if (pesoMeta > pesoActual) return "volumen";
  return "mantenimiento";
}

function estimarRitmoSemanal(objetivo: PlanObjective) {
  if (objetivo === "definicion") return { min: 0.4, max: 0.8 };
  if (objetivo === "volumen") return { min: 0.2, max: 0.5 };
  return { min: 0, max: 0 };
}

function calcularRangoSemanas(diferencia: number, objetivo: PlanObjective) {
  const absDiff = Math.abs(diferencia);
  if (!absDiff || objetivo === "mantenimiento") {
    return { semanasMin: 0, semanasMax: 0 };
  }

  const ritmo = estimarRitmoSemanal(objetivo);
  const semanasMin = absDiff / ritmo.max;
  const semanasMax = absDiff / ritmo.min;
  return {
    semanasMin: Math.max(1, Math.ceil(semanasMin)),
    semanasMax: Math.max(1, Math.ceil(semanasMax)),
  };
}

function generarProyeccion(pesoActual: number, pesoMeta: number, semanasMin: number, semanasMax: number) {
  if (!Number.isFinite(pesoActual) || !Number.isFinite(pesoMeta)) {
    return { proyeccionUnidad: "semanal" as const, proyeccion: [] as PlanResult["proyeccion"] };
  }

  const diff = pesoMeta - pesoActual;
  if (!diff || (!semanasMin && !semanasMax)) {
    return {
      proyeccionUnidad: "semanal" as const,
      proyeccion: [{ label: "Semana 1", pesoEstimado: round1(pesoActual) }],
    };
  }

  const semanasAvg = clamp(Math.round((semanasMin + semanasMax) / 2), 1, 208);
  const usarMensual = semanasAvg >= 24;

  if (usarMensual) {
    const meses = clamp(Math.ceil(semanasAvg / 4), 1, 48);
    const proyeccion = Array.from({ length: meses }, (_, i) => {
      const t = (i + 1) / meses;
      return {
        label: `Mes ${i + 1}`,
        pesoEstimado: round1(pesoActual + diff * t),
      };
    });
    return { proyeccionUnidad: "mensual" as const, proyeccion };
  }

  const semanas = clamp(semanasAvg, 1, 52);
  const proyeccion = Array.from({ length: semanas }, (_, i) => {
    const t = (i + 1) / semanas;
    return {
      label: `Semana ${i + 1}`,
      pesoEstimado: round1(pesoActual + diff * t),
    };
  });
  return { proyeccionUnidad: "semanal" as const, proyeccion };
}

export function calcularPlan(datosUsuario: {
  pesoActual: number;
  pesoMeta: number;
}) {
  const diferencia = round2(datosUsuario.pesoMeta - datosUsuario.pesoActual);
  const objetivo = determinarObjetivo(datosUsuario.pesoActual, datosUsuario.pesoMeta);
  const { semanasMin, semanasMax } = calcularRangoSemanas(diferencia, objetivo);
  const { proyeccionUnidad, proyeccion } = generarProyeccion(
    datosUsuario.pesoActual,
    datosUsuario.pesoMeta,
    semanasMin,
    semanasMax,
  );

  const result: PlanResult = {
    pesoActual: round1(datosUsuario.pesoActual),
    pesoMeta: round1(datosUsuario.pesoMeta),
    diferencia,
    objetivo,
    semanasMin,
    semanasMax,
    proyeccionUnidad,
    proyeccion,
  };

  return result;
}

function formatTiempoEstimado(semanasMin: number, semanasMax: number) {
  if (!semanasMin && !semanasMax) return "Sin cambios";
  const min = Math.max(1, semanasMin);
  const max = Math.max(1, semanasMax);
  if (max >= 12) {
    const minMes = Math.max(1, Math.round((min / 4) * 10) / 10);
    const maxMes = Math.max(minMes, Math.round((max / 4) * 10) / 10);
    return `${minMes}–${maxMes} meses`;
  }
  return `${min}–${max} semanas`;
}

function objetivoLabel(obj: PlanObjective) {
  switch (obj) {
    case "definicion":
      return "Definición";
    case "volumen":
      return "Volumen";
    case "mantenimiento":
    default:
      return "Mantenimiento";
  }
}

type FormState = {
  pesoActual: string;
  pesoMeta: string;
  estatura: string;
  edad: string;
};

type StoredPlan = {
  form: FormState;
  generated: boolean;
  lockedForm: FormState | null;
  trainingDays?: WeekdayIndex[];
};

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

export default function PlanPage() {
  const [routine, setRoutine] = React.useState<SelectedRoutine | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [form, setForm] = React.useState<FormState>({
    pesoActual: "",
    pesoMeta: "",
    estatura: "",
    edad: "",
  });
  const [generated, setGenerated] = React.useState(false);
  const [lockedForm, setLockedForm] = React.useState<FormState | null>(null);
  const [trainingDays, setTrainingDays] = React.useState<WeekdayIndex[]>([]);
  const [trainingDaysError, setTrainingDaysError] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    const { routine: r, profile: p, savedPlan, storedPlan } = leerDatos();
    setRoutine(r);
    setProfile(p);

    if (storedPlan) {
      setGenerated(Boolean(storedPlan.generated));
      setLockedForm(storedPlan.lockedForm ?? null);
      setTrainingDays(normalizeTrainingDays((storedPlan as StoredPlan).trainingDays));
      setForm((prev) => ({
        pesoActual: String(storedPlan.form?.pesoActual ?? prev.pesoActual ?? ""),
        pesoMeta: String(storedPlan.form?.pesoMeta ?? prev.pesoMeta ?? ""),
        estatura: String(storedPlan.form?.estatura ?? prev.estatura ?? ""),
        edad: String(storedPlan.form?.edad ?? prev.edad ?? ""),
      }));
      return;
    }

    setForm((prev) => ({
      pesoActual: String(savedPlan?.pesoActual ?? p?.weightKg ?? prev.pesoActual ?? ""),
      pesoMeta: String(savedPlan?.pesoMeta ?? prev.pesoMeta ?? ""),
      estatura: String(savedPlan?.estatura ?? p?.heightCm ?? prev.estatura ?? ""),
      edad: String(savedPlan?.edad ?? p?.age ?? prev.edad ?? ""),
    }));
  }, []);

  React.useEffect(() => {
    function refreshFromStorage() {
      const { routine: r, profile: p } = leerDatos();
      setRoutine(r);
      setProfile(p);
    }

    window.addEventListener("mygym:routineChanged", refreshFromStorage);
    window.addEventListener("mygym:profileChanged", refreshFromStorage);
    window.addEventListener("storage", refreshFromStorage);
    return () => {
      window.removeEventListener("mygym:routineChanged", refreshFromStorage);
      window.removeEventListener("mygym:profileChanged", refreshFromStorage);
      window.removeEventListener("storage", refreshFromStorage);
    };
  }, []);

  React.useEffect(() => {
    const max = routine?.daysPerWeek ?? 0;
    if (!max) return;
    setTrainingDays((prev) => {
      if (prev.length <= max) return prev;
      const next = prev.slice(0, max);
      try {
        const stored: StoredPlan = {
          form,
          generated,
          lockedForm,
          trainingDays: next,
        };
        window.localStorage.setItem(PLAN_KEY, JSON.stringify(stored));
      } catch {
        // ignore
      }
      return next;
    });
  }, [routine?.daysPerWeek, form, generated, lockedForm]);

  const maxTrainingDays = routine?.daysPerWeek ?? 0;
  const planReady = Boolean(
    form.pesoActual.trim() &&
      form.pesoMeta.trim() &&
      form.estatura.trim() &&
      form.edad.trim() &&
      (!maxTrainingDays || trainingDays.length === maxTrainingDays),
  );

  const resultado = React.useMemo(() => {
    if (!generated) return null;
    const base = lockedForm ?? form;
    const ready = Boolean(base.pesoActual.trim() && base.pesoMeta.trim() && base.estatura.trim() && base.edad.trim());
    if (!ready) return null;
    const pesoActual = toNumber(base.pesoActual);
    const pesoMeta = toNumber(base.pesoMeta);
    const estatura = toNumber(base.estatura);
    const edad = toNumber(base.edad);

    if (!Number.isFinite(pesoActual) || pesoActual <= 0) return null;
    if (!Number.isFinite(pesoMeta) || pesoMeta <= 0) return null;
    if (!Number.isFinite(estatura) || estatura <= 0) return null;
    if (!Number.isFinite(edad) || edad <= 0) return null;

    return calcularPlan({ pesoActual, pesoMeta });
  }, [generated, lockedForm, form]);

  const planParaAvisos = React.useMemo(() => {
    const base = generated ? lockedForm ?? form : form;
    const pesoActual = toNumber(base.pesoActual);
    const pesoMeta = toNumber(base.pesoMeta);
    if (!Number.isFinite(pesoActual) || pesoActual <= 0) return null;
    if (!Number.isFinite(pesoMeta) || pesoMeta <= 0) return null;
    return calcularPlan({ pesoActual, pesoMeta });
  }, [generated, lockedForm, form]);

  const avisos = React.useMemo(() => {
    const plan = planParaAvisos;
    if (!plan) return [] as Array<{ type: "warning" | "danger"; title: string; message: string }>;
    const list: Array<{ type: "warning" | "danger"; title: string; message: string }> = [];

    const base = generated ? lockedForm ?? form : form;
    const estatura = toNumber(base.estatura);
    const bActual = bmi(estatura, plan.pesoActual);
    const bMeta = bmi(estatura, plan.pesoMeta);
    const bMetaLabel = bmiLabel(bMeta);

    if (routine?.objective === "volumen" && plan.objetivo === "definicion") {
      list.push({
        type: "warning",
        title: "Tu meta no coincide con tu rutina",
        message:
          "Tu meta es bajar peso (definición) pero tu rutina actual está orientada a volumen. Se recomienda cambiar a una rutina de definición o ajustar el enfoque.",
      });
    }
    if (routine?.objective === "definicion" && plan.objetivo === "volumen") {
      list.push({
        type: "warning",
        title: "Tu meta no coincide con tu rutina",
        message:
          "Tu meta es subir peso (volumen) pero tu rutina actual está orientada a definición. Se recomienda cambiar a una rutina de volumen o ajustar el enfoque.",
      });
    }

    if (Number.isFinite(bMeta)) {
      if (bMeta < 18.5) {
        list.push({
          type: "danger",
          title: "Advertencia de salud (IMC meta bajo)",
          message: `Con tu estatura, tu peso meta proyecta un IMC aprox. de ${round1(bMeta)} (${bMetaLabel}). Esto puede ser riesgoso. Considera una meta más conservadora o consulta a un profesional.`,
        });
      } else if (bMeta >= 30) {
        list.push({
          type: "warning",
          title: "Advertencia de salud (IMC meta alto)",
          message: `Con tu estatura, tu peso meta proyecta un IMC aprox. de ${round1(bMeta)} (${bMetaLabel}). Considera un plan progresivo y seguimiento profesional.`,
        });
      }
    }

    if (Number.isFinite(plan.pesoActual) && plan.pesoActual > 0) {
      const pct = Math.abs(plan.diferencia) / plan.pesoActual;
      if (pct >= 0.15) {
        list.push({
          type: "warning",
          title: "Cambio de peso agresivo",
          message:
            "El cambio propuesto es mayor o igual al 15% de tu peso actual. Para salud y adherencia, suele ser mejor dividirlo en metas intermedias.",
        });
      }
    }

    if (Number.isFinite(bActual) && Number.isFinite(bMeta)) {
      const labelActual = bmiLabel(bActual);
      if (labelActual && bMetaLabel && labelActual !== bMetaLabel) {
        list.push({
          type: "warning",
          title: "Cambio de categoría (IMC)",
          message: `Tu IMC actual aprox. es ${round1(bActual)} (${labelActual}) y el IMC meta aprox. es ${round1(bMeta)} (${bMetaLabel}). Ajusta la meta si no se siente realista.`,
        });
      }
    }

    return list;
  }, [planParaAvisos, routine?.objective, generated, lockedForm, form]);

  const displayName = React.useMemo(() => {
    const first = String(profile?.firstName ?? "").trim();
    if (first) return first;
    return "";
  }, [profile?.firstName]);

  const objetivoActual = React.useMemo(() => {
    if (!resultado) return null;
    return objetivoLabel(resultado.objetivo);
  }, [resultado]);

  function onChange(key: keyof FormState, value: string) {
    if (generated) return;
    setForm((f) => {
      const next = { ...f, [key]: value };
      try {
        const stored: StoredPlan = { form: next, generated: false, lockedForm: null, trainingDays };
        window.localStorage.setItem(PLAN_KEY, JSON.stringify(stored));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function persistStored(nextForm: FormState, nextGenerated: boolean, nextLocked: FormState | null) {
    try {
      const stored: StoredPlan = {
        form: nextForm,
        generated: nextGenerated,
        lockedForm: nextLocked,
        trainingDays,
      };
      window.localStorage.setItem(PLAN_KEY, JSON.stringify(stored));
    } catch {
      // ignore
    }
  }

  function toggleTrainingDay(idx: WeekdayIndex) {
    setTrainingDaysError(null);
    setTrainingDays((prev) => {
      const next = prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx];
      const max = routine?.daysPerWeek ?? 0;
      if (!prev.includes(idx) && max && next.length > max) {
        setTrainingDaysError(`Solo puedes seleccionar ${max} días, según tu rutina.`);
        return prev;
      }
      next.sort((a, b) => a - b);
      try {
        const stored: StoredPlan = {
          form,
          generated,
          lockedForm,
          trainingDays: next,
        };
        window.localStorage.setItem(PLAN_KEY, JSON.stringify(stored));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function generar() {
    setError(null);
    setTrainingDaysError(null);

    if (maxTrainingDays && trainingDays.length !== maxTrainingDays) {
      return setTrainingDaysError(`Debes seleccionar exactamente ${maxTrainingDays} días de entrenamiento.`);
    }

    const pesoActual = toNumber(form.pesoActual);
    const pesoMeta = toNumber(form.pesoMeta);
    const estatura = toNumber(form.estatura);
    const edad = toNumber(form.edad);

    if (!Number.isFinite(pesoActual) || pesoActual <= 0) return setError("Ingresa un peso actual válido.");
    if (!Number.isFinite(pesoMeta) || pesoMeta <= 0) return setError("Ingresa un peso meta válido.");
    if (!Number.isFinite(estatura) || estatura <= 0) return setError("Ingresa una estatura válida.");
    if (!Number.isFinite(edad) || edad <= 0) return setError("Ingresa una edad válida.");

    const snapshot: FormState = {
      pesoActual: form.pesoActual,
      pesoMeta: form.pesoMeta,
      estatura: form.estatura,
      edad: form.edad,
    };
    setLockedForm(snapshot);
    setGenerated(true);
    persistStored(form, true, snapshot);
  }

  function cambiarPlan() {
    setConfirmOpen(true);
  }

  function confirmarCambioPlan() {
    setGenerated(false);
    setLockedForm(null);
    persistStored(form, false, null);
    setConfirmOpen(false);
  }

  function cancelarCambioPlan() {
    setConfirmOpen(false);
  }

  return (
    <div className="space-y-8">
      {confirmOpen ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={cancelarCambioPlan}
            role="button"
            tabIndex={0}
            aria-label="Cerrar"
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-black/80 p-6 backdrop-blur">
              <div className="text-lg font-semibold">¿Cambiar tu plan?</div>
              <div className="mt-2 text-sm text-white/70">
                {displayName ? (
                  <span>
                    {displayName}, si cambias el plan se desbloquearán los campos y tendrás que volver a generarlo.
                  </span>
                ) : (
                  <span>Si cambias el plan se desbloquearán los campos y tendrás que volver a generarlo.</span>
                )}
              </div>
              <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
                <div className="text-xs text-white/50">Resumen</div>
                <div className="mt-1">
                  {objetivoActual ? `Objetivo actual: ${objetivoActual}. ` : ""}
                  {routine?.title ? `Rutina: ${routine.title}. ` : ""}
                  {routine?.daysPerWeek ? `Frecuencia: ${routine.daysPerWeek} días/semana.` : ""}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={cancelarCambioPlan}
                  className="inline-flex h-10 items-center rounded-md border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Mantener plan
                </button>
                <button
                  type="button"
                  onClick={confirmarCambioPlan}
                  className="inline-flex h-10 items-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  Sí, cambiar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div>
        <h1 className="text-2xl font-semibold">Plan</h1>
        <p className="mt-2 text-sm text-white/60">
          Define tu meta de peso y obtén un plan estimado conectado a tu rutina actual.
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
          <div className="text-sm font-semibold">Generar plan</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs text-white/60">Peso actual (kg)</div>
              <input
                value={form.pesoActual}
                onChange={(e) => onChange("pesoActual", e.target.value)}
                inputMode="decimal"
                disabled={generated}
                className="mt-1 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
                placeholder="Ej: 78"
              />
            </div>
            <div>
              <div className="text-xs text-white/60">Peso meta (kg)</div>
              <input
                value={form.pesoMeta}
                onChange={(e) => onChange("pesoMeta", e.target.value)}
                inputMode="decimal"
                disabled={generated}
                className="mt-1 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
                placeholder="Ej: 72"
              />
            </div>
            <div>
              <div className="text-xs text-white/60">Estatura (cm)</div>
              <input
                value={form.estatura}
                onChange={(e) => onChange("estatura", e.target.value)}
                inputMode="numeric"
                disabled={generated}
                className="mt-1 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
                placeholder="Ej: 175"
              />
            </div>
            <div>
              <div className="text-xs text-white/60">Edad</div>
              <input
                value={form.edad}
                onChange={(e) => onChange("edad", e.target.value)}
                inputMode="numeric"
                disabled={generated}
                className="mt-1 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
                placeholder="Ej: 26"
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs text-white/60">Días de entrenamiento</div>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {([
                { label: "L", idx: 0 },
                { label: "M", idx: 1 },
                { label: "X", idx: 2 },
                { label: "J", idx: 3 },
                { label: "V", idx: 4 },
                { label: "S", idx: 5 },
                { label: "D", idx: 6 },
              ] as const).map((d) => {
                const active = trainingDays.includes(d.idx);
                return (
                  <button
                    key={d.idx}
                    type="button"
                    onClick={() => toggleTrainingDay(d.idx)}
                    className={`h-10 rounded-md border text-sm font-semibold ${
                      active
                        ? "border-green-400/40 bg-green-600/20 text-white"
                        : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                    }`}
                    aria-pressed={active}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            {trainingDaysError ? <div className="mt-2 text-xs text-red-200">{trainingDaysError}</div> : null}
            <div className="mt-2 text-xs text-white/50">
              Selecciona los días para que se marquen en el calendario de Seguimiento.
            </div>
          </div>

          {error ? <div className="mt-3 text-sm text-red-200">{error}</div> : null}

          {!generated && avisos.length ? (
            <div className="mt-4 grid gap-3">
              {avisos.map((a, idx) => (
                <div
                  key={`${a.title}-${idx}`}
                  className={`rounded-xl border bg-black/30 p-4 ${a.type === "danger" ? "border-red-400/30" : "border-yellow-300/20"}`}
                >
                  <div
                    className={`text-sm font-semibold ${
                      a.type === "danger" ? "text-red-100" : "text-yellow-100"
                    }`}
                  >
                    {a.title}
                  </div>
                  <div className="mt-1 text-sm text-white/70">{a.message}</div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-5 flex items-center gap-3">
            {generated ? (
              <button
                type="button"
                onClick={cambiarPlan}
                className="inline-flex h-10 items-center rounded-md border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10"
              >
                Cambiar plan
              </button>
            ) : (
              <button
                type="button"
                onClick={generar}
                disabled={!planReady}
                className="inline-flex h-10 items-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Generar plan
              </button>
            )}
            <div className="text-xs text-white/50">
              {generated ? "Plan generado. Para editar, usa \"Cambiar plan\"." : "Genera el plan para ver resultados."}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
          <div className="text-sm font-semibold">Resumen conectado</div>
          <div className="mt-3 text-sm text-white/70">
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs text-white/60">Rutina actual</div>
              <div className="mt-1 text-sm font-semibold">
                {routine?.title ? routine.title : "Aún no has seleccionado una rutina"}
              </div>
              <div className="mt-1 text-xs text-white/60">
                {routine?.daysPerWeek ? `${routine.daysPerWeek} días/semana` : ""}
                {routine?.subtitle ? ` · ${routine.subtitle}` : ""}
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs text-white/60">Datos del usuario</div>
              <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-white/70">
                <div>
                  <div className="text-white/50">Peso actual (perfil)</div>
                  <div className="mt-1 text-sm text-white">{profile?.weightKg ? `${profile.weightKg} kg` : "—"}</div>
                </div>
                <div>
                  <div className="text-white/50">Estatura (perfil)</div>
                  <div className="mt-1 text-sm text-white">{profile?.heightCm ? `${profile.heightCm} cm` : "—"}</div>
                </div>
                <div>
                  <div className="text-white/50">Edad (perfil)</div>
                  <div className="mt-1 text-sm text-white">{profile?.age ? profile.age : "—"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {resultado ? (
        <section className="rounded-2xl border border-white/10 bg-black/20 p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Resultado</div>
              <div className="mt-1 text-sm text-white/60">
                Este plan está orientado a <span className="text-white">{objetivoLabel(resultado.objetivo)}</span> basado
                en tu rutina actual.
              </div>
            </div>
            <div className="text-xs text-white/60">Tiempo estimado: {formatTiempoEstimado(resultado.semanasMin, resultado.semanasMax)}</div>
          </div>

          {avisos.length ? (
            <div className="mt-5 grid gap-3">
              {avisos.map((a, idx) => (
                <div
                  key={`${a.title}-${idx}`}
                  className={`rounded-xl border bg-black/30 p-4 ${
                    a.type === "danger"
                      ? "border-red-400/30"
                      : "border-yellow-300/20"
                  }`}
                >
                  <div className={`text-sm font-semibold ${a.type === "danger" ? "text-red-100" : "text-yellow-100"}`}>
                    {a.title}
                  </div>
                  <div className="mt-1 text-sm text-white/70">{a.message}</div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs text-white/60">Peso actual</div>
              <div className="mt-1 text-lg font-semibold">{resultado.pesoActual} kg</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs text-white/60">Peso meta</div>
              <div className="mt-1 text-lg font-semibold">{resultado.pesoMeta} kg</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs text-white/60">Diferencia</div>
              <div className="mt-1 text-lg font-semibold">{resultado.diferencia > 0 ? "+" : ""}{resultado.diferencia} kg</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs text-white/60">Objetivo detectado</div>
              <div className="mt-1 text-lg font-semibold">{objetivoLabel(resultado.objetivo)}</div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Proyección de progreso ({resultado.proyeccionUnidad})</div>
              <div className="text-xs text-white/50">Estimación lineal según ritmo promedio</div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {resultado.proyeccion.slice(0, 18).map((p) => (
                <div key={p.label} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm">
                  <div className="text-xs text-white/60">{p.label}</div>
                  <div className="mt-0.5 font-semibold">{p.pesoEstimado} kg</div>
                </div>
              ))}
            </div>
            {resultado.proyeccion.length > 18 ? (
              <div className="mt-3 text-xs text-white/50">Mostrando 18 puntos para mantener la vista limpia.</div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
