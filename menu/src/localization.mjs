import manifest from "../language-manifest.json" with { type: "json" };
export const languages = manifest;
const cache = new Map();
export async function loadLocale(code, signal) {
  if (!languages.some((lang) => lang.code === code))
    throw new Error("Unsupported language");
  if (cache.has(code)) return cache.get(code);
  const response = await fetch(`./locales/${code}.json`, {
    signal,
    cache: "no-cache",
  });
  if (!response.ok) throw new Error("Translation unavailable");
  const bundle = await response.json();
  if (bundle.language !== code || !bundle.ui || !bundle.items)
    throw new Error("Invalid translation");
  cache.set(code, bundle);
  return bundle;
}
export function applyLocale(menu, bundle) {
  const code = bundle.language;
  if (code === "en" || menu.restaurant.sample === false) return menu;
  const restaurant = { ...menu.restaurant };
  for (const [field, value] of Object.entries(bundle.restaurant))
    restaurant[field] = { ...restaurant[field], [code]: value };
  return {
    ...menu,
    restaurant,
    categories: menu.categories.map((c) => ({
      ...c,
      name: { ...c.name, [code]: bundle.categories[c.id] },
    })),
    items: menu.items.map((item) => {
      const translated = { ...item };
      for (const [field, value] of Object.entries(bundle.items[item.id] || {}))
        translated[field] = { ...item[field], [code]: value };
      return translated;
    }),
    deal: {
      ...menu.deal,
      ...Object.fromEntries(
        Object.entries(bundle.deal).map(([field, value]) => [
          field,
          { ...menu.deal[field], [code]: value },
        ]),
      ),
    },
  };
}
export function languageLabel(code, inLanguage) {
  try {
    return new Intl.DisplayNames([inLanguage], { type: "language" }).of(code);
  } catch {
    return code;
  }
}
export function normalizePrompt(input, bundle) {
  // Translate known menu vocabulary locally; this is deliberately a small demo matcher.
  let normalized = String(input)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  const pairs = Object.entries(bundle?.matcher || {})
    .map(([english, native]) => [
      english,
      native
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase(),
    ])
    .sort((a, b) => b[1].length - a[1].length);
  const tokens = [];
  for (const [english, native] of pairs) {
    const escaped = native.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const word = /^[a-z -]+$/.test(native)
      ? `(?<![a-z])${escaped}(?![a-z])`
      : escaped;
    normalized = normalized.replace(new RegExp(word, "gu"), () => {
      const token = `ZXQ${tokens.length}QXZ`;
      tokens.push(english);
      return token;
    });
  }
  normalized = normalized.replace(
    /ZXQ(\d+)QXZ/g,
    (_, index) => tokens[Number(index)],
  );
  const digitStarts = [
    0x0660, 0x06f0, 0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66,
    0x0ce6, 0x0d66, 0x0e50, 0x0ed0, 0x1040,
  ];
  normalized = [...normalized]
    .map((char) => {
      const n = char.codePointAt(0);
      for (const start of digitStarts)
        if (n >= start && n <= start + 9) return String(n - start);
      return char;
    })
    .join("");
  // An amount with a currency symbol is an unambiguous budget in this meal finder.
  if (
    !/(under|below|less than|up to|budget|menos de|hasta|moins de|maximum)\s*\$?\s*\d/.test(
      normalized,
    )
  ) {
    const budget =
      normalized.match(/[$€£₹]\s*(\d+(?:[.,]\d{1,2})?)/) ||
      normalized.match(/(\d+(?:[.,]\d{1,2})?)\s*[$€£₹]/);
    if (budget) normalized += " under " + budget[1].replace(",", ".");
  }
  return normalized;
}
