const ROUTINE_KEY = "mygym:selectedRoutine";
const PROFILE_KEY = "mygym:userProfile";

function toNumber(value) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function leerDatosUsuario() {
  let routine = null;
  let profile = null;
  try {
    const raw = window.localStorage.getItem(ROUTINE_KEY);
    if (raw) routine = JSON.parse(raw);
  } catch {
    // ignore
  }

  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (raw) profile = JSON.parse(raw);
  } catch {
    // ignore
  }

  return { routine, profile };
}

export function determinarObjetivoNutricional(routine) {
  const objective = routine?.objective;
  switch (objective) {
    case "volumen":
      return "volumen";
    case "definicion":
      return "definicion";
    case "fuerza":
      return "fuerza";
    case "cardio":
      return "cardio";
    case "salud":
    default:
      return "mantenimiento";
  }
}

export function adaptarRecomendaciones({ objetivo, pesoKg, alturaCm, edad }) {
  const alturaM = alturaCm / 100;
  const bmi = alturaM > 0 ? pesoKg / (alturaM * alturaM) : 0;

  let perfil = "balance";
  if (Number.isFinite(bmi) && bmi > 0) {
    if (bmi < 19) perfil = "subir";
    else if (bmi > 27) perfil = "bajar";
  }

  const esJoven = edad < 18;
  const esMayor = edad >= 55;

  let intensidad = "normal";
  if (perfil === "subir") intensidad = "denso";
  if (perfil === "bajar" && objetivo === "definicion") intensidad = "ligero";
  if (objetivo === "cardio") intensidad = "ligero";

  let estilo = "variado";
  if (esMayor) estilo = "simple";
  if (esJoven) intensidad = "normal";

  return { intensidad, estilo };
}

export function keywordsPorObjetivo(objetivo, adapt) {
  const base = {
    volumen: ["chicken", "beef", "pasta", "rice"],
    definicion: ["fish", "salad", "egg", "chicken"],
    mantenimiento: ["rice", "chicken", "vegetable", "beans"],
    fuerza: ["beef", "chicken", "potato", "pasta"],
    cardio: ["salad", "fish", "vegetable", "soup"],
  };

  const extraDenso = ["pasta", "rice", "beef"];
  const extraLigero = ["salad", "soup", "fish"];

  const list = [...(base[objetivo] ?? base.mantenimiento)];
  if (adapt?.intensidad === "denso") list.unshift(...extraDenso);
  if (adapt?.intensidad === "ligero") list.unshift(...extraLigero);
  if (adapt?.estilo === "simple") list.push("chicken", "rice");

  return Array.from(new Set(list)).slice(0, 8);
}

export function keywordsPorSeccion(seccion, objetivo, adapt) {
  const base = keywordsPorObjetivo(objetivo, adapt);

  const desayuno = ["breakfast", "egg", "omelette", "pancake", "oats"];
  const comida = ["chicken", "beef", "rice", "pasta", "potato"];
  const cena = ["fish", "salad", "soup", "vegetable", "chicken"];

  let sectionWords = [];
  if (seccion === "desayuno") sectionWords = desayuno;
  if (seccion === "comida") sectionWords = comida;
  if (seccion === "cena") sectionWords = cena;

  const merged = [...sectionWords, ...base];
  return Array.from(new Set(merged)).slice(0, 10);
}

async function fetchMealsByKeyword(keyword) {
  const url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(keyword)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data?.meals ?? [];
}

export async function fetchMealDetails(idMeal) {
  const url = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(idMeal)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return (data?.meals ?? [])[0] ?? null;
}

export async function obtenerComidasPersonalizadas({ routine, profile, maxResults = 18 }) {
  const objetivo = determinarObjetivoNutricional(routine);
  const adapt = adaptarRecomendaciones({
    objetivo,
    pesoKg: toNumber(profile?.weightKg),
    alturaCm: toNumber(profile?.heightCm),
    edad: toNumber(profile?.age),
  });

  const keywords = keywordsPorObjetivo(objetivo, adapt);
  const results = [];
  const seen = new Set();

  for (const kw of keywords) {
    const list = await fetchMealsByKeyword(kw);
    for (const m of list) {
      if (!m?.idMeal || seen.has(m.idMeal)) continue;
      if (!m?.strMealThumb) continue;
      seen.add(m.idMeal);
      results.push(m);
      if (results.length >= maxResults) break;
    }
    if (results.length >= maxResults) break;
  }

  return results;
}

export async function obtenerComidasPersonalizadasPorSeccion({
  routine,
  profile,
  seccion,
  maxResults = 18,
}) {
  const objetivo = determinarObjetivoNutricional(routine);
  const adapt = adaptarRecomendaciones({
    objetivo,
    pesoKg: toNumber(profile?.weightKg),
    alturaCm: toNumber(profile?.heightCm),
    edad: toNumber(profile?.age),
  });

  const keywords = keywordsPorSeccion(seccion, objetivo, adapt);
  const results = [];
  const seen = new Set();

  for (const kw of keywords) {
    const list = await fetchMealsByKeyword(kw);
    for (const m of list) {
      if (!m?.idMeal || seen.has(m.idMeal)) continue;
      if (!m?.strMealThumb) continue;
      seen.add(m.idMeal);
      results.push(m);
      if (results.length >= maxResults) break;
    }
    if (results.length >= maxResults) break;
  }

  return results;
}

export function traducirCategoria(strCategory) {
  if (!strCategory) return "";
  const map = {
    Beef: "Carne de res",
    Chicken: "Pollo",
    Dessert: "Postre",
    Lamb: "Cordero",
    Miscellaneous: "Variado",
    Pasta: "Pasta",
    Pork: "Cerdo",
    Seafood: "Mariscos",
    Side: "Acompañamiento",
    Starter: "Entrada",
    Vegan: "Vegano",
    Vegetarian: "Vegetariano",
    Breakfast: "Desayuno",
    Goat: "Cabra",
  };
  return map[strCategory] ?? strCategory;
}

export function traducirArea(strArea) {
  if (!strArea) return "";
  const map = {
    American: "Americana",
    British: "Británica",
    Canadian: "Canadiense",
    Chinese: "China",
    Croatian: "Croata",
    Dutch: "Holandesa",
    Egyptian: "Egipcia",
    French: "Francesa",
    Greek: "Griega",
    Indian: "India",
    Irish: "Irlandesa",
    Italian: "Italiana",
    Jamaican: "Jamaiquina",
    Japanese: "Japonesa",
    Kenyan: "Keniata",
    Malaysian: "Malaya",
    Mexican: "Mexicana",
    Moroccan: "Marroquí",
    Polish: "Polaca",
    Portuguese: "Portuguesa",
    Russian: "Rusa",
    Spanish: "Española",
    Thai: "Tailandesa",
    Tunisian: "Tunecina",
    Turkish: "Turca",
    Vietnamese: "Vietnamita",
  };
  return map[strArea] ?? strArea;
}

export function estimateActivityFactor(daysPerWeek) {
  return clamp(1.2 + (Number(daysPerWeek ?? 0) / 7) * 0.5, 1.2, 1.65);
}

const TRANSLATION_CACHE_KEY = "mygym:translationCache:v1";

function readTranslationCache() {
  try {
    const raw = window.sessionStorage.getItem(TRANSLATION_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeTranslationCache(cache) {
  try {
    window.sessionStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

async function translateEnToEs(text) {
  const cleaned = String(text ?? "").trim();
  if (!cleaned) return "";

  const cache = readTranslationCache();
  if (cache[cleaned]) return cache[cleaned];

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: cleaned,
        source: "en",
        target: "es",
      }),
    });

    if (!res.ok) return cleaned;
    const data = await res.json();
    const translated = String(data?.translatedText ?? "").trim();
    const finalText = translated || cleaned;
    cache[cleaned] = finalText;
    writeTranslationCache(cache);
    return finalText;
  } catch {
    return cleaned;
  }
}

export async function traducirNombreComida(strMeal) {
  return translateEnToEs(strMeal);
}

export async function traducirInstrucciones(strInstructions) {
  return translateEnToEs(strInstructions);
}

export async function traducirTexto(str) {
  return translateEnToEs(str);
}

export async function traducirTextos(textos) {
  const list = Array.isArray(textos) ? textos.map((t) => String(t ?? "").trim()) : [];
  const cleaned = list.filter(Boolean);
  if (!cleaned.length) return [];

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: cleaned, source: "en", target: "es" }),
    });
    if (!res.ok) throw new Error("translate failed");
    const data = await res.json();
    const out = Array.isArray(data?.translatedTexts) ? data.translatedTexts : [];
    if (out.length === cleaned.length) return out.map((x) => String(x ?? ""));
    throw new Error("translate size mismatch");
  } catch {
    const out = [];
    for (const t of cleaned) out.push(await translateEnToEs(t));
    return out;
  }
}
