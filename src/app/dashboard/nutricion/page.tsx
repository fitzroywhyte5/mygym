"use client";

import * as React from "react";
import Link from "next/link";

import {
  fetchMealDetails,
  leerDatosUsuario,
  obtenerComidasPersonalizadas,
  obtenerComidasPersonalizadasPorSeccion,
  traducirInstrucciones,
  traducirNombreComida,
  traducirTextos,
  traducirArea,
  traducirCategoria,
} from "@/lib/nutrition/themealdb";

type SelectedRoutine = {
  id: string;
  title: string;
  daysPerWeek: number;
  gender: "hombre" | "mujer";
  objective?: "fuerza" | "volumen" | "definicion" | "salud" | "cardio";
  subtitle?: string;
};

type UserProfile = {
  firstName: string;
  lastName: string;
  age: string;
  heightCm: string;
  weightKg: string;
};

type MealSummary = {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strCategory?: string;
  strArea?: string;
};

type MealDetails = MealSummary & {
  strInstructions?: string;
  strYoutube?: string;
  strSource?: string;
  [key: string]: unknown;
};

function extractIngredients(meal: MealDetails | null) {
  if (!meal) return [] as Array<{ ingredient: string; measure: string }>;
  const list: Array<{ ingredient: string; measure: string }> = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = String((meal as Record<string, unknown>)[`strIngredient${i}`] ?? "").trim();
    const measure = String((meal as Record<string, unknown>)[`strMeasure${i}`] ?? "").trim();
    if (!ingredient) continue;
    list.push({ ingredient, measure });
  }
  return list;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function toNumber(value: string) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function round(n: number) {
  return Math.round(n);
}

function computeTargets(params: {
  objective?: SelectedRoutine["objective"];
  gender: SelectedRoutine["gender"];
  age: number;
  heightCm: number;
  weightKg: number;
  daysPerWeek: number;
}) {
  const { objective, gender, age, heightCm, weightKg, daysPerWeek } = params;

  const sexConstant = gender === "hombre" ? 5 : -161;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexConstant;

  const activity = clamp(1.2 + (daysPerWeek / 7) * 0.5, 1.2, 1.65);
  const tdee = bmr * activity;

  let calories = tdee;
  let proteinPerKg = 1.8;
  let fatPerKg = 0.9;

  switch (objective) {
    case "volumen":
      calories = tdee + 300;
      proteinPerKg = 1.8;
      fatPerKg = 0.9;
      break;
    case "definicion":
      calories = tdee - 450;
      proteinPerKg = 2.1;
      fatPerKg = 0.8;
      break;
    case "fuerza":
      calories = tdee + 150;
      proteinPerKg = 2.0;
      fatPerKg = 0.9;
      break;
    case "cardio":
      calories = tdee - 250;
      proteinPerKg = 1.8;
      fatPerKg = 0.8;
      break;
    case "salud":
    default:
      calories = tdee;
      proteinPerKg = 1.6;
      fatPerKg = 0.9;
      break;
  }

  const proteinG = round(weightKg * proteinPerKg);
  const fatG = round(weightKg * fatPerKg);
  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  const remaining = Math.max(0, round(calories) - proteinKcal - fatKcal);
  const carbsG = round(remaining / 4);

  return {
    calories: round(calories),
    proteinG,
    fatG,
    carbsG,
    tdee: round(tdee),
  };
}

export default function NutricionPage() {
  const [routine, setRoutine] = React.useState<SelectedRoutine | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [meals, setMeals] = React.useState<MealSummary[]>([]);
  const [mealsLoading, setMealsLoading] = React.useState(false);
  const [mealsError, setMealsError] = React.useState<string | null>(null);
  const [selectedMeal, setSelectedMeal] = React.useState<MealDetails | null>(null);
  const [mealDetailsLoading, setMealDetailsLoading] = React.useState(false);
  const [mealSection, setMealSection] = React.useState<"todas" | "desayuno" | "comida" | "cena">("todas");
  const [translatedMealNames, setTranslatedMealNames] = React.useState<Record<string, string>>({});
  const [translatedInstructions, setTranslatedInstructions] = React.useState<string>("");
  const [translationLoading, setTranslationLoading] = React.useState(false);
  const [translatedSelectedMealName, setTranslatedSelectedMealName] = React.useState<string>("");
  const [translatedIngredients, setTranslatedIngredients] = React.useState<
    Array<{ ingredient: string; measure: string }>
  >([]);

  const ingredients = React.useMemo(() => extractIngredients(selectedMeal), [selectedMeal]);

  React.useEffect(() => {
    const { routine: r, profile: p } = leerDatosUsuario();
    setRoutine(r as SelectedRoutine | null);
    setProfile(p as UserProfile | null);
  }, []);

  React.useEffect(() => {
    function refreshFromStorage() {
      const { routine: r, profile: p } = leerDatosUsuario();
      setRoutine(r as SelectedRoutine | null);
      setProfile(p as UserProfile | null);
    }

    function onRoutineChanged() {
      refreshFromStorage();
    }

    function onProfileChanged() {
      refreshFromStorage();
    }

    window.addEventListener("mygym:routineChanged", onRoutineChanged);
    window.addEventListener("mygym:profileChanged", onProfileChanged);
    window.addEventListener("storage", refreshFromStorage);
    return () => {
      window.removeEventListener("mygym:routineChanged", onRoutineChanged);
      window.removeEventListener("mygym:profileChanged", onProfileChanged);
      window.removeEventListener("storage", refreshFromStorage);
    };
  }, []);

  const age = toNumber(profile?.age ?? "");
  const heightCm = toNumber(profile?.heightCm ?? "");
  const weightKg = toNumber(profile?.weightKg ?? "");

  const missingRoutine = !routine?.id;
  const missingProfile = !profile || !Number.isFinite(age) || !Number.isFinite(heightCm) || !Number.isFinite(weightKg);

  const targets = React.useMemo(() => {
    if (missingRoutine || missingProfile || !routine || !profile) return null;
    return computeTargets({
      objective: routine.objective,
      gender: routine.gender,
      age,
      heightCm,
      weightKg,
      daysPerWeek: routine.daysPerWeek,
    });
  }, [missingRoutine, missingProfile, routine, profile, age, heightCm, weightKg]);

  function openProfile() {
    try {
      window.dispatchEvent(new Event("mygym:openProfile"));
    } catch {
      // ignore
    }
  }

  async function mostrarRecomendacionNutricional() {
    if (missingRoutine || missingProfile || !routine || !profile) {
      setMeals([]);
      setMealsError(null);
      return;
    }

    setMealsLoading(true);
    setMealsError(null);
    setMeals([]);

    try {
      const list =
        mealSection === "todas"
          ? ((await obtenerComidasPersonalizadas({ routine, profile })) as MealSummary[])
          : ((await obtenerComidasPersonalizadasPorSeccion({
              routine,
              profile,
              seccion: mealSection,
            })) as MealSummary[]);
      if (!list.length) {
        setMealsError("No encontramos comidas para tu perfil. Prueba cambiando la rutina o tus datos.");
        return;
      }
      setMeals(list);
      setTranslatedMealNames({});
    } catch {
      setMealsError("No se pudieron cargar las comidas. Intenta de nuevo.");
    } finally {
      setMealsLoading(false);
    }
  }

  React.useEffect(() => {
    let canceled = false;
    async function translateNames() {
      if (!meals.length) return;
      const next: Record<string, string> = {};
      for (const meal of meals) {
        if (canceled) return;
        if (!meal?.idMeal || !meal?.strMeal) continue;
        if (translatedMealNames[meal.idMeal]) {
          next[meal.idMeal] = translatedMealNames[meal.idMeal];
          continue;
        }
        const t = await traducirNombreComida(meal.strMeal);
        if (canceled) return;
        next[meal.idMeal] = t;
      }
      if (!canceled) {
        setTranslatedMealNames((prev) => ({ ...prev, ...next }));
      }
    }

    void translateNames();
    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meals]);

  React.useEffect(() => {
    void mostrarRecomendacionNutricional();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routine?.id, routine?.objective, profile?.age, profile?.heightCm, profile?.weightKg, mealSection]);

  async function onOpenMealDetails(meal: MealSummary) {
    setSelectedMeal(null);
    setMealDetailsLoading(true);
    setTranslatedInstructions("");
    setTranslationLoading(false);
    setTranslatedSelectedMealName("");
    setTranslatedIngredients([]);
    try {
      const detail = (await fetchMealDetails(meal.idMeal)) as MealDetails | null;
      if (detail) {
        setSelectedMeal(detail);
        if (detail.strMeal) {
          const tName = await traducirNombreComida(String(detail.strMeal));
          setTranslatedSelectedMealName(tName);
        }

        const ing = extractIngredients(detail);
        if (ing.length) {
          const ingredientsOnly = ing.map((x) => x.ingredient);
          const measuresToTranslate = ing.map((x) => (x.measure && /[A-Za-z]/.test(x.measure) ? x.measure : ""));

          const [tIngredients, tMeasures] = await Promise.all([
            traducirTextos(ingredientsOnly),
            traducirTextos(measuresToTranslate.filter(Boolean)),
          ]);

          let measureIdx = 0;
          const out: Array<{ ingredient: string; measure: string }> = [];
          for (let i = 0; i < ing.length; i++) {
            const original = ing[i];
            const ingredient = String(tIngredients?.[i] ?? original.ingredient) || original.ingredient;

            let measure = original.measure;
            if (measure && /[A-Za-z]/.test(measure)) {
              const translated = String(tMeasures?.[measureIdx] ?? "").trim();
              if (translated) measure = translated;
              measureIdx++;
            }

            out.push({ ingredient, measure });
          }

          setTranslatedIngredients(out);
        }

        if (detail.strInstructions) {
          setTranslationLoading(true);
          const t = await traducirInstrucciones(String(detail.strInstructions));
          setTranslatedInstructions(t);
          setTranslationLoading(false);
        }
      }
    } finally {
      setMealDetailsLoading(false);
    }
  }

  function closeMealDetails() {
    setSelectedMeal(null);
    setMealDetailsLoading(false);
    setTranslatedInstructions("");
    setTranslationLoading(false);
    setTranslatedSelectedMealName("");
    setTranslatedIngredients([]);
  }

  const objectiveLabel = (() => {
    switch (routine?.objective) {
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
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nutrición</h1>
        <p className="mt-2 text-sm text-white/60">
          Recomendaciones según tu rutina y tus datos.
        </p>
      </div>

      {missingRoutine ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <div className="text-sm font-semibold">Primero elige una rutina</div>
          <div className="mt-2 text-sm text-white/60">
            Para personalizar tu alimentación, selecciona una rutina.
          </div>
          <div className="mt-4">
            <Link
              href="/dashboard/rutinas"
              className="inline-flex h-9 items-center rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80 hover:bg-white/10"
            >
              Ir a Rutinas
            </Link>
          </div>
        </div>
      ) : null}

      {!missingRoutine ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Rutina seleccionada</div>
              <div className="mt-2 text-base font-semibold">{routine?.title}</div>
              {routine?.subtitle ? (
                <div className="mt-1 text-sm text-white/60">{routine.subtitle}</div>
              ) : null}
              <div className="mt-2 text-sm text-white/60">
                {routine?.gender === "hombre" ? "Hombre" : "Mujer"} · {routine?.daysPerWeek} días/semana
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
      ) : null}

      {!missingRoutine && missingProfile ? (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5">
          <div className="text-sm font-semibold text-blue-100">Completa tus datos</div>
          <div className="mt-2 text-sm text-blue-100/80">
            Para calcular tu alimentación necesitas ingresar tu peso, altura y edad.
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openProfile}
              className="inline-flex h-9 items-center rounded-md bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Ingresar datos en Perfil
            </button>
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80 hover:bg-white/10"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      ) : null}

      {targets ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <div className="text-sm font-semibold">Calorías objetivo</div>
            <div className="mt-3 text-3xl font-semibold">{targets.calories}</div>
            <div className="mt-1 text-sm text-white/60">kcal/día</div>
            <div className="mt-4 text-xs text-white/50">Estimación de mantenimiento: {targets.tdee} kcal</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <div className="text-sm font-semibold">Macros recomendados</div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/60">Proteína</div>
                <div className="mt-1 text-base font-semibold">{targets.proteinG} g</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/60">Carbs</div>
                <div className="mt-1 text-base font-semibold">{targets.carbsG} g</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/60">Grasas</div>
                <div className="mt-1 text-base font-semibold">{targets.fatG} g</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <div className="text-sm font-semibold">Sugerencias rápidas</div>
            <div className="mt-3 space-y-2 text-sm text-white/70">
              <div>Prioriza proteína en cada comida.</div>
              <div>Incluye verduras/fibra diariamente.</div>
              <div>Hidrátate y ajusta por progreso semanal.</div>
            </div>
          </div>
        </div>
      ) : null}

      {!missingRoutine && !missingProfile ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">Comidas recomendadas</div>
              <div className="mt-1 text-sm text-white/60">Basadas en tu rutina y tus datos.</div>
            </div>
            <button
              type="button"
              onClick={() => void mostrarRecomendacionNutricional()}
              className="inline-flex h-9 items-center rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80 hover:bg-white/10"
            >
              Actualizar
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMealSection("todas")}
              className={`inline-flex h-9 items-center rounded-md border border-white/10 px-3 text-sm hover:bg-white/10 ${
                mealSection === "todas" ? "bg-white/10 text-white" : "bg-white/5 text-white/80"
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setMealSection("desayuno")}
              className={`inline-flex h-9 items-center rounded-md border border-white/10 px-3 text-sm hover:bg-white/10 ${
                mealSection === "desayuno" ? "bg-white/10 text-white" : "bg-white/5 text-white/80"
              }`}
            >
              Desayuno
            </button>
            <button
              type="button"
              onClick={() => setMealSection("comida")}
              className={`inline-flex h-9 items-center rounded-md border border-white/10 px-3 text-sm hover:bg-white/10 ${
                mealSection === "comida" ? "bg-white/10 text-white" : "bg-white/5 text-white/80"
              }`}
            >
              Comida
            </button>
            <button
              type="button"
              onClick={() => setMealSection("cena")}
              className={`inline-flex h-9 items-center rounded-md border border-white/10 px-3 text-sm hover:bg-white/10 ${
                mealSection === "cena" ? "bg-white/10 text-white" : "bg-white/5 text-white/80"
              }`}
            >
              Cena
            </button>
          </div>

          {mealsLoading ? (
            <div className="mt-5 text-sm text-white/60">Cargando comidas…</div>
          ) : mealsError ? (
            <div className="mt-5 text-sm text-white/60">{mealsError}</div>
          ) : meals.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {meals.map((meal) => (
                <div key={meal.idMeal} className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                  <div className="relative h-40 w-full bg-white/5">
                    <img
                      src={meal.strMealThumb}
                      alt={meal.strMeal}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4">
                    <div className="text-sm font-semibold text-white">
                      {translatedMealNames[meal.idMeal] ? translatedMealNames[meal.idMeal] : meal.strMeal}
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      {meal.strCategory ? traducirCategoria(meal.strCategory) : ""}
                      {meal.strCategory && meal.strArea ? " · " : ""}
                      {meal.strArea ? traducirArea(meal.strArea) : ""}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void onOpenMealDetails(meal)}
                        className="inline-flex h-9 items-center rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80 hover:bg-white/10"
                      >
                        Ver detalles
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 text-sm text-white/60">Aún no hay recomendaciones.</div>
          )}

          <div className="mt-4 text-xs text-white/40">Fuente: TheMealDB</div>
        </div>
      ) : null}

      {mealDetailsLoading || selectedMeal ? (
        <div className="fixed inset-0 z-[9997]">
          <button
            type="button"
            onClick={closeMealDetails}
            className="absolute inset-0 bg-black/60"
            aria-label="Cerrar"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <div className="pointer-events-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-black/80 backdrop-blur">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="text-sm font-semibold text-white">
                  {translatedSelectedMealName || selectedMeal?.strMeal || "Detalles"}
                </div>
                <button
                  type="button"
                  onClick={closeMealDetails}
                  className="h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80 hover:bg-white/10"
                >
                  Cerrar
                </button>
              </div>

              {mealDetailsLoading ? (
                <div className="p-4 text-sm text-white/60">Cargando…</div>
              ) : selectedMeal ? (
                <div className="max-h-[70vh] overflow-y-auto p-4">
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                    <img
                      src={selectedMeal.strMealThumb}
                      alt={selectedMeal.strMeal}
                      className="h-56 w-full object-cover"
                    />
                  </div>
                  <div className="mt-3 text-xs text-white/60">
                    {selectedMeal.strCategory ? traducirCategoria(String(selectedMeal.strCategory)) : ""}
                    {selectedMeal.strCategory && selectedMeal.strArea ? " · " : ""}
                    {selectedMeal.strArea ? traducirArea(String(selectedMeal.strArea)) : ""}
                  </div>

                  {(translatedIngredients.length || ingredients.length) ? (
                    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-semibold text-white">Ingredientes</div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {(translatedIngredients.length ? translatedIngredients : ingredients).map((it, idx) => (
                          <div key={`${it.ingredient}-${idx}`} className="text-sm text-white/75">
                            {it.measure ? `${it.measure} ` : ""}
                            {it.ingredient}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {selectedMeal.strInstructions ? (
                    <div className="mt-3 whitespace-pre-line text-sm text-white/70">
                      {translationLoading
                        ? "Traduciendo instrucciones…"
                        : translatedInstructions
                          ? translatedInstructions
                          : selectedMeal.strInstructions}
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-3">
                    {selectedMeal.strYoutube ? (
                      <a
                        href={String(selectedMeal.strYoutube)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80 hover:bg-white/10"
                      >
                        Ver en YouTube
                      </a>
                    ) : null}
                    {selectedMeal.strSource ? (
                      <a
                        href={String(selectedMeal.strSource)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80 hover:bg-white/10"
                      >
                        Fuente
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

