import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  applyLocale,
  languages,
  normalizePrompt,
  languageLabel,
} from "./localization.mjs";
import { planMeal } from "./menu-engine.mjs";
const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const menu = read("../menu-data.json");
const english = read("../locales/en.json");
const walk = (value, path = "") =>
  Object.entries(value).flatMap(([key, v]) =>
    typeof v === "object" && v !== null
      ? walk(v, path + "." + key)
      : [[path + "." + key, v]],
  );
test("all 80 selectable languages have complete interface and menu text", () => {
  assert.equal(languages.length, 80);
  assert.equal(new Set(languages.map((l) => l.code)).size, 80);
  assert.deepEqual(
    menu.restaurant.languages,
    languages.map((l) => l.code),
  );
  const required = walk(english).filter(
    ([key]) => ![".language", ".translationSource"].includes(key),
  );
  for (const { code } of languages) {
    const bundle = read("../locales/" + code + ".json");
    assert.equal(bundle.language, code);
    const translated = new Map(walk(bundle));
    for (const [key, value] of required) {
      assert.ok(translated.has(key), code + " missing " + key);
      if (value !== "")
        assert.ok(String(translated.get(key)).trim(), code + " empty " + key);
      if (String(value).includes("{saving}"))
        assert.ok(
          translated.get(key).includes("{saving}"),
          code + " missing savings placeholder",
        );
    }
    const hydrated = applyLocale(menu, bundle);
    for (const item of hydrated.items)
      for (const field of ["name", "short", "description", "ingredients"])
        assert.equal(item[field][code], bundle.items[item.id][field]);
    assert.ok(languageLabel(code, code));
  }
});
test("right-to-left languages are explicitly marked", () => {
  for (const code of ["ar", "he", "fa", "ur", "ps", "sd", "ckb", "ug"])
    assert.equal(languages.find((l) => l.code === code).dir, "rtl");
  for (const code of ["en", "es", "hi", "zh-CN", "ja"])
    assert.equal(languages.find((l) => l.code === code).dir, "ltr");
});
test("native dietary terms and numerals work with the demo matcher", () => {
  for (const code of ["ar", "hi", "zh-CN", "de", "ja", "es"]) {
    const bundle = read("../locales/" + code + ".json");
    const vegetarian = normalizePrompt(bundle.ui.vegetarian + " $35", bundle);
    const result = planMeal(menu.items, vegetarian);
    assert.ok(
      result.prefs.filters.includes("vegetarian"),
      code + " vegetarian",
    );
    assert.equal(result.prefs.budget, 3500);
    assert.equal(result.items.length, 3);
    const vegan = normalizePrompt(bundle.ui.vegan + " $35", bundle);
    assert.ok(
      planMeal(menu.items, vegan).prefs.filters.includes("vegan"),
      code + " vegan",
    );
  }
  const ar = read("../locales/ar.json");
  assert.equal(
    planMeal(menu.items, normalizePrompt(ar.ui.vegetarian + " $٣٥", ar)).prefs
      .budget,
    3500,
  );
});
test("translation hydration preserves prices, availability, ingredients in other languages, and item IDs", () => {
  const localized = applyLocale(menu, read("../locales/ja.json"));
  assert.deepEqual(
    localized.items.map((i) => [i.id, i.priceCents, i.available]),
    menu.items.map((i) => [i.id, i.priceCents, i.available]),
  );
  assert.deepEqual(
    localized.items.map((i) => i.ingredients.en),
    menu.items.map((i) => i.ingredients.en),
  );
});
