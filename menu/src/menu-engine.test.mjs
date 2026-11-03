import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  filterItems,
  inferPreferences,
  planMeal,
  validMeal,
  alternatives,
  totalCents,
  localize,
} from "./menu-engine.mjs";
const data = JSON.parse(
  readFileSync(new URL("../menu-data.json", import.meta.url)),
);
const items = data.items;
test("diet filters combine rather than silently relaxing a preference", () => {
  const result = filterItems(items, { filters: ["vegan", "gluten-free"] });
  assert.deepEqual(
    result.map((i) => i.id),
    ["salad", "lemonade", "tea"],
  );
  assert.deepEqual(
    filterItems(items, { filters: ["spicy", "gluten-free"] }),
    [],
  );
});
test("search uses translated names and ingredients with accent-insensitive matching", () => {
  assert.ok(
    filterItems(items, { query: "tomates", language: "es" }).length > 0,
  );
  assert.equal(
    filterItems(items, { query: "burrata tomato", language: "en" })[0].id,
    "burrata",
  );
  assert.ok(
    filterItems(items, { query: "the jasmin", language: "fr" }).some(
      (i) => i.id === "tea",
    ),
  );
  assert.equal(localize({ en: "Fallback" }, "fr"), "Fallback");
});
test("recommendations satisfy the budget and use the required three courses", () => {
  const result = planMeal(items, "vegetarian under $35");
  assert.equal(result.items.length, 3);
  assert.deepEqual(
    result.items.map((i) => i.category),
    ["starters", "mains", "drinks"],
  );
  assert.ok(result.items.every((i) => i.dietary.includes("vegetarian")));
  assert.ok(totalCents(result.items) <= 3500);
  assert.equal(inferPreferences("under $30.99").budget, 3099);
});
test("unavailable dishes are excluded from suggestions and swaps", () => {
  const unavailable = items.map((i) => ({
    ...i,
    available: i.id !== "dumplings" && i.id !== "chicken",
  }));
  const result = planMeal(unavailable);
  assert.ok(result.items.length === 3);
  assert.ok(result.items.every((i) => i.available));
  assert.ok(
    alternatives(unavailable, result.items, 1, result.prefs).every(
      (i) => i.available,
    ),
  );
});
test("impossible budget and dietary combinations produce an honest empty state", () => {
  assert.equal(planMeal(items, "under $1").items.length, 0);
  assert.equal(planMeal(items, "gluten-free").items.length, 0);
  assert.equal(planMeal(items, "vegan and mild").items.length, 0);
});
test("spicy suggestions can include a normal drink; mild suggestions exclude spicy food", () => {
  const spicy = planMeal(items, "spicy");
  assert.equal(spicy.items.length, 3);
  assert.equal(spicy.items[0].id, "dumplings");
  const mild = planMeal(items, "not spicy");
  assert.equal(mild.items.length, 3);
  assert.ok(mild.items.every((i) => !i.dietary.includes("spicy")));
});
test("swapping preserves dietary choices, course and budget", () => {
  const result = planMeal(items, "vegetarian under $35");
  for (let i = 0; i < 3; i++)
    for (const replacement of alternatives(
      items,
      result.items,
      i,
      result.prefs,
    )) {
      const swapped = result.items.map((item, index) =>
        index === i ? replacement : item,
      );
      assert.equal(replacement.category, result.items[i].category);
      assert.ok(validMeal(swapped, result.prefs));
    }
  const vegan = planMeal(items, "vegan");
  assert.equal(alternatives(items, vegan.items, 1, vegan.prefs).length, 0);
});
test("meal validation rejects missing items and wrong course types", () => {
  const prefs = inferPreferences("");
  assert.equal(validMeal([undefined, items[2], items[6]], prefs), false);
  assert.equal(validMeal([items[0], items[0], items[0]], prefs), false);
});
test("bundle prices are calculated in integer cents", () => {
  const set = data.deal.itemIds.map((id) => items.find((i) => i.id === id));
  assert.equal(totalCents(set), 3400);
  assert.equal(totalCents(set, data.deal.discountCents), 2800);
});
test("sample content is complete in all advertised languages, with valid references", () => {
  const ids = new Set(items.map((i) => i.id));
  for (const item of items) {
    assert.ok(item.priceCents >= 0 && Number.isInteger(item.priceCents));
    assert.ok(item.pairsWith.every((id) => ids.has(id)));
    for (const lang of ["en", "es", "fr"])
      for (const field of ["name", "short", "description", "ingredients"])
        assert.ok(item[field][lang], `${item.id}.${field}.${lang}`);
  }
});
