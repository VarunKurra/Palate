export const normalize = (text) =>
  String(text || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
export const localize = (value, language = "en") =>
  typeof value === "string" ? value : (value?.[language] ?? value?.en ?? "");
export const matchesDiet = (item, filters = []) =>
  filters.every((tag) => item.dietary.includes(tag));
export function filterItems(
  items,
  { category = "all", filters = [], query = "", language = "en" } = {},
) {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  return items.filter(
    (item) =>
      (category === "all" || item.category === category) &&
      matchesDiet(item, filters) &&
      words.every((word) =>
        normalize(
          [
            localize(item.name, language),
            localize(item.short, language),
            localize(item.ingredients, language),
          ].join(" "),
        ).includes(word),
      ),
  );
}
export function inferPreferences(mood = "", filters = []) {
  const q = normalize(mood),
    required = new Set(filters);
  if (/\b(vegan|vegano|vegana|vegetalien|vegetalienne)\b/.test(q))
    required.add("vegan");
  else if (
    /\b(vegetarian|vegetariano|vegetariana|vegetarien|vegetarienne)\b/.test(q)
  )
    required.add("vegetarian");
  if (/gluten[ -]?free|no gluten|sin gluten|sans gluten/.test(q))
    required.add("gluten-free");
  if (
    /dairy[ -]?free|lactose[ -]?free|no dairy|sin lactosa|sans lactose|sin leche|sans lait/.test(
      q,
    )
  )
    required.add("lactose-free");
  const mild = /not spicy|no spice|mild|sin picante|pas epice|sans piment/.test(
    q,
  );
  if (!mild && /spicy|picante|epice/.test(q)) required.add("spicy");
  const price = q.match(
    /(?:under|below|less than|up to|budget|menos de|hasta|moins de|maximum)\s*\$?\s*(\d+(?:\.\d{1,2})?)/,
  );
  const budget = price ? Math.round(Number(price[1]) * 100) : null;
  const terms = q.split(/[^a-z]+/).filter((w) => w.length > 2);
  const aliases = {
    ligero: "light",
    leger: "light",
    fresco: "fresh",
    fraiche: "fresh",
    reconfortant: "comfort",
    picante: "spicy",
    epice: "spicy",
    pollo: "chicken",
    poulet: "chicken",
    pates: "pasta",
    proteina: "protein",
    proteine: "protein",
    verduras: "vegetables",
    legumes: "vegetables",
  };
  return {
    filters: [...required],
    mild,
    budget,
    terms: terms.map((w) => aliases[w] || w),
  };
}
export function totalCents(items, discount = 0) {
  return Math.max(
    0,
    items.reduce((sum, item) => sum + item.priceCents, 0) - discount,
  );
}
export function validMeal(meal, prefs, discount = 0) {
  const dietary = prefs.filters.filter((f) => f !== "spicy");
  return (
    meal.length === 3 &&
    meal.map((i) => (i?.course||i?.category)).join(",") === "starters,mains,drinks" &&
    meal.every((i) => i?.available && matchesDiet(i, dietary)) &&
    (!prefs.mild || meal.every((i) => !i.dietary.includes("spicy"))) &&
    (!prefs.filters.includes("spicy") ||
      meal.slice(0, 2).some((i) => i.dietary.includes("spicy"))) &&
    (prefs.budget === null || totalCents(meal, discount) <= prefs.budget)
  );
}
export function planMeal(items, mood = "", filters = []) {
  const prefs = inferPreferences(mood, filters),
    groups = ["starters", "mains", "drinks"].map((c) =>
      items.filter((i) => (i.course||i.category) === c && i.available),
    );
  let best = null;
  for (const a of groups[0])
    for (const m of groups[1])
      for (const d of groups[2]) {
        const meal = [a,m,d];
        if(!validMeal(meal,prefs))continue;
        const score=meal.reduce((s,i)=>s+i.moods.filter(word=>prefs.terms.includes(word)).length*4+(i.badge ? 0.2 : 0),0);
        const total=totalCents(meal);
        if(!best||score>best.score||(score===best.score&&total<best.total))best={items:meal,score,total};
      }
  return {items:best?.items??[],prefs};
}
export function alternatives(items, meal, index, prefs, discount = 0) {
  return items.filter(
    (i) =>
      (i.course||i.category) === (meal[index].course||meal[index].category) &&
      i.id !== meal[index].id &&
      validMeal(
        meal.map((x, n) => (n === index ? i : x)),
        prefs,
        discount,
      ),
  );
}
