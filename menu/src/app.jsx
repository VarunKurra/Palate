import {normalizeMenu} from './menu-data.mjs';
import {loadMenu,liveSlug,embeddedPreview,track,requestRecommendation} from './live-menu.js';
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as Dialog from "@radix-ui/react-dialog";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronRight,
  Flame,
  Globe2,
  Info,
  Leaf,
  MapPin,
  MilkOff,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sprout,
  UtensilsCrossed,
  WheatOff,
  X,
  Clock,
  RefreshCw,
  Plus,
} from "lucide-react";
import { copy } from "./copy.js";
import {
  alternatives,
  filterItems,
  inferPreferences,
  localize,
  matchesDiet,
  normalize,
  planMeal,
  totalCents,
} from "./menu-engine.mjs";
import {
  languages,
  loadLocale,
  applyLocale,
  languageLabel,
  normalizePrompt,
} from "./localization.mjs";
import "./styles.css";
const dietIcons = {
  vegetarian: Leaf,
  vegan: Sprout,
  "lactose-free": MilkOff,
  "gluten-free": WheatOff,
  spicy: Flame,
};
const diets = Object.keys(dietIcons);
const readStore = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const store = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};
function RestaurantMark({ restaurant, size }) {
  return restaurant.logo ? (
    <img src={restaurant.logo} alt="" />
  ) : restaurant.monogram ? (
    <span>{restaurant.monogram}</span>
  ) : (
    <Sprout size={size} />
  );
}
function Photo({ item, className = "", eager = false, t }) {
  const [state, setState] = useState("loading");
  const image = useRef();
  useEffect(() => {
    setState("loading");
    if (image.current?.complete)
      setState(image.current.naturalWidth ? "ready" : "error");
  }, [item.image]);
  return (
    <span className={`photo ${className} photo-${state}`}>
      <img
        ref={image}
        src={item.image}
        alt={item.alt || ""}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setState("ready")}
        onError={() => setState("error")}
      />
      {state === "error" && (
        <span className="photo-fallback">
          <UtensilsCrossed size={24} />
          <span>{t.comingPhoto}</span>
        </span>
      )}
    </span>
  );
}
const PanelTitle = ({ children, titleRef }) => (
  <Dialog.Title ref={titleRef} tabIndex={-1} className="panel-title">
    {children}
  </Dialog.Title>
);
const DietTags = ({ item, limit = 5, t }) => (
  <div className="diet-tags">
    {item.dietary
      .filter((tag) => tag !== "vegetarian" || !item.dietary.includes("vegan"))
      .slice(0, limit)
      .map((tag) => {
        const Icon = dietIcons[tag];
        return (
          <span key={tag} className={tag === "spicy" ? "spicy" : ""}>
            <Icon size={13} />
            {t[tag]}
          </span>
        );
      })}
  </div>
);
function App() {
  const [data, setData] = useState(null),
    [loadError, setLoadError] = useState(false),
    [attempt, setAttempt] = useState(0);
  const [language, setLanguage] = useState(() =>
    readStore("palate-menu-language", "en"),
  );
  const [locale, setLocale] = useState(null),
    [languageQuery, setLanguageQuery] = useState(""),
    [languageLoading, setLanguageLoading] = useState(null),
    [languageError, setLanguageError] = useState("");
  const [category, setCategory] = useState("all"),
    [filters, setFilters] = useState([]),
    [query, setQuery] = useState("");
  const [panel, setPanel] = useState(null),
    [lastPanel, setLastPanel] = useState(null),
    [saved, setSaved] = useState([]),
    [toast, setToast] = useState("");
  const [mood, setMood] = useState(""),
    [meal, setMeal] = useState(null),
    [swapIndex, setSwapIndex] = useState(null),
    [finding, setFinding] = useState(false),
    [finderError, setFinderError] = useState("");
  const triggerRef = useRef(null),
    titleRef = useRef(null),
    scrollRef = useRef(null),
    toastTimer = useRef(null),
    requestRef = useRef(null);
  const t = locale?.ui || copy[language] || copy.en,
    loc = (value) => localize(value, language);
  const languageRequest = useRef(null);
  useEffect(() => {
    if(embeddedPreview)return;
    const abort = new AbortController();
    let expired = false;
    setLoadError(false);
    const timeout = setTimeout(() => {
      expired = true;
      abort.abort();
    }, 15000);
    (async () => {
      const menu = normalizeMenu(await loadMenu(abort.signal));
      const code = menu.restaurant.languages.includes(language)
        ? language
        : menu.restaurant.defaultLanguage;
      const bundle = await loadLocale(code, abort.signal);
      setLocale(bundle);
      setLanguage(code);
      setData(applyLocale(menu, bundle));
      track("menu_view",null,code);
      const ids = new Set(menu.items.map((i) => i.id));
      const stored = readStore("palate-saved:" + menu.restaurant.id, []);
      setSaved(Array.isArray(stored) ? stored.filter((id) => ids.has(id)) : []);
    })()
      .catch((error) => {
        if (error.name !== "AbortError" || expired) setLoadError(true);
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      abort.abort();
    };
  }, [attempt]);
  useEffect(()=>{
    if(!embeddedPreview)return;
    document.documentElement.dataset.embedded='true';
    const receive=e=>{if(e.origin!==location.origin||e.source!==window.parent||e.data?.type!=='palate:preview-data')return;
      try{const menu=normalizeMenu(e.data.menu);setData(menu);setLoadError(false);}catch{setLoadError(true);}};
    window.addEventListener('message',receive);
    window.parent.postMessage({type:'palate:preview-ready'},location.origin);
    return()=>window.removeEventListener('message',receive);
  },[]);
  async function selectLanguage(code) {
    if (languageLoading) return;
    setLanguageLoading(code);
    setLanguageError("");
    const controller = new AbortController();
    languageRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const bundle = await loadLocale(code, controller.signal);
      setData((previous) => applyLocale(previous, bundle));
      setLocale(bundle);
      setLanguage(code);
      track("language",null,code);
      setLanguageQuery("");
      close();
    } catch {
      setLanguageError(t.languageError);
    } finally {
      clearTimeout(timeout);
      setLanguageLoading(null);
    }
  }
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir =
      languages.find((l) => l.code === language)?.dir || "ltr";
    store("palate-menu-language", language);
  }, [language]);
  useEffect(() => {
    if (data) {
      store("palate-saved:" + data.restaurant.id, saved);
      document.title = data.restaurant.name + " — " + t.menu + " · Palate";
    }
  }, [saved, data, language]);
  useEffect(() => {
    if (!data) return;
    document.documentElement.dataset.menuFont=data.restaurant.font||'inter';
    document.title=data.restaurant.name+' · Menu';
    for (const [key, value] of Object.entries(data.restaurant.theme || {})) {
      if (/^#[0-9a-f]{3,8}$/i.test(value))
        document.documentElement.style.setProperty("--" + key, value);
    }
  }, [data]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
    titleRef.current?.focus({ preventScroll: true });
  }, [panel?.type, panel?.id, swapIndex, meal]);
  useEffect(
    () => () => {
      clearTimeout(toastTimer.current);
      requestRef.current?.abort();
      languageRequest.current?.abort();
    },
    [],
  );
  const price = (cents) =>
    new Intl.NumberFormat(language, {
      style: "currency",
      currency: data?.restaurant.currency || "USD",
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  const notify = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  };
  const open = (next, event) => {
    if (!panel)
      triggerRef.current = event?.currentTarget || document.activeElement;
    setPanel(next);
  };
  const close = () => {
    setPanel(null);
    setLastPanel(null);
    setLanguageError("");
    setLanguageQuery("");
    setSwapIndex(null);
    requestRef.current?.abort();
    setFinding(false);
  };
  const saveDish = (id) => {
    const already = saved.includes(id);
    if(!already) track("save",id,language);
    setSaved((s) => (already ? s.filter((x) => x !== id) : [...s, id]));
    notify(already ? t.removed : t.savedDish);
  };
  const reset = () => {
    setQuery("");
    setFilters([]);
    setCategory("all");
  };
  const filtered = useMemo(
    () =>
      data
        ? filterItems(data.items, { category, filters, query, language })
        : [],
    [data, category, filters, query, language],
  );
  useEffect(()=>{if(panel?.type==='dish')track('dish_view',panel.id,language);},[panel?.type,panel?.id]);
  useEffect(()=>{if(filters.length)track('filter',null,language);},[filters.join(',')]);
  useEffect(()=>{if(!liveSlug)return;const timer=setInterval(()=>setAttempt(a=>a+1),30000);return()=>clearInterval(timer);},[]);
  const currentItem = data?.items.find((i) => i.id === panel?.id);
  const savedItems = data?.items.filter((i) => saved.includes(i.id)) || [];
  const categories = data
    ? [
        { id: "all", name: { en: t.all, es: t.all, fr: t.all } },
        ...data.categories,
      ]
    : [];
  const pickCategory = (id) => {
    setCategory(id);
    if (window.scrollY > 240)
      document.querySelector("#menu-list")?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
  };
  const openFinder = (event) => {
    setMeal(null);
    setSwapIndex(null);
    setFinderError("");
    open({ type: "finder" }, event);
  };
  const openDeal = (event) => {
    track("deal_view",null,language);
    const items = data.deal.itemIds
      .map((id) => data.items.find((i) => i.id === id))
      .filter(Boolean);
    setMeal({
      items,
      prefs: inferPreferences("", []),
      discount: data.deal.discountCents,
      deal: true,
    });
    setSwapIndex(null);
    open({ type: "finder" }, event);
  };
  async function findMeal(event) {
    event.preventDefault();
    track("recommendation",null,language);
    setFinderError("");
    if(liveSlug){
      const controller=new AbortController(); requestRef.current=controller; setFinding(true);
      const timeout=setTimeout(()=>controller.abort(),12000);
      const normalizedMood=normalizePrompt(mood,locale);
      try{
        const result=await requestRecommendation(normalizedMood,filters,language,controller.signal);
        const prefs=inferPreferences(normalizedMood,filters);
        const suggested=(result.itemIds||[]).map(id=>data.items.find(i=>i.id===id));
        const {validMeal}=await import('./menu-engine.mjs');
        if(suggested.length&&!validMeal(suggested,prefs))throw Error('Invalid recommendation');
        setMeal({items:suggested,prefs,discount:0,deal:false});
      }catch(e){if(!controller.signal.aborted)setMeal({...planMeal(data.items,normalizedMood,filters),discount:0,deal:false});}
      finally{clearTimeout(timeout);setFinding(false);}
      return;
    }
    if (!data.assistant?.endpoint) {
      setMeal({
        ...planMeal(data.items, normalizePrompt(mood, locale), filters),
        discount: 0,
        deal: false,
      });
      return;
    }
    // Configure only a same-origin server endpoint; API keys stay on the server.
    const url = new URL(data.assistant.endpoint, location.href);
    if (url.origin !== location.origin) {
      setFinderError(t.errorBody);
      return;
    }
    const controller = new AbortController();
    requestRef.current = controller;
    setFinding(true);
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          restaurantId: data.restaurant.id,
          mood,
          filters,
          language,
        }),
      });
      if (!response.ok) throw Error("Suggestion unavailable");
      const result = await response.json();
      const suggested = (result.itemIds || []).map((id) =>
        data.items.find((i) => i.id === id),
      );
      const prefs = inferPreferences(normalizePrompt(mood, locale), filters);
      const { validMeal } = await import("./menu-engine.mjs");
      if (
        !validMeal(suggested, prefs) ||
        suggested.map((i) => i.course||i.category).join(",") !== "starters,mains,drinks"
      )
        throw Error("Invalid suggestion");
      setMeal({ items: suggested, prefs, discount: 0, deal: false });
    } catch {
      if (panel) setFinderError(t.errorBody);
    } finally {
      clearTimeout(timeout);
      setFinding(false);
    }
  }
  const saveMeal = () => {
    setSaved((s) => [...new Set([...s, ...meal.items.map((i) => i.id)])]);
    notify(t.savedMeal);
  };
  const renderCard = (item, index) => (
    <article
      key={item.id}
      className={`dish-card ${!item.available ? "is-unavailable" : ""}`}
    >
      <button
        className="dish-open"
        onClick={(e) => open({ type: "dish", id: item.id }, e)}
        aria-label={`${loc(item.name)}, ${price(item.priceCents)}${!item.available ? ", " + t.sold : ""}`}
      >
        <div className="dish-copy">
          <h3>{loc(item.name)}</h3>
          <div className="card-bottom">
            <strong>{price(item.priceCents)}</strong>
            {!item.available && <span className="sold-label">{t.sold}</span>}
          </div>
        </div>
        <Photo
          item={item}
          t={t}
          eager={filtered[0]?.id === item.id || filtered[1]?.id === item.id}
        />
      </button>
      <button
        className={`save-icon ${saved.includes(item.id) ? "is-saved" : ""}`}
        aria-label={`${saved.includes(item.id) ? t.unsave : t.save}: ${loc(item.name)}`}
        aria-pressed={saved.includes(item.id)}
        onClick={() => saveDish(item.id)}
      >
        <Bookmark
          size={18}
          fill={saved.includes(item.id) ? "currentColor" : "none"}
        />
      </button>
    </article>
  );
  const visibleLanguages = languages
    .filter((option) => data?.restaurant.languages.includes(option.code))
    .filter((option) =>
      [
        option.nativeName,
        languageLabel(option.code, language),
        languageLabel(option.code, "en"),
      ].some((label) => normalize(label).includes(normalize(languageQuery))),
    );
  const categoryButtons = () =>
    categories.map((c) => (
      <button
        key={c.id}
        className={category === c.id ? "active" : ""}
        onClick={() => pickCategory(c.id)}
        aria-pressed={category === c.id}
      >
        {loc(c.name)}

      </button>
    ));
  if (!data)
    return (
      <main className="boot-shell" aria-busy={!loadError}>
        {loadError ? (
          <div className="load-error">
            <UtensilsCrossed />
            <h1>{t.loadError}</h1>
            <p>{t.errorBody}</p>
            <button
              className="primary"
              onClick={() => setAttempt((a) => a + 1)}
            >
              {t.retry}
              <RefreshCw size={17} />
            </button>
          </div>
        ) : (
          <>
            <span className="sr-only">{t.loading}</span>
            <div className="boot-mark" />
            <div className="boot-line" />
            <div className="boot-wide" />
            <div className="boot-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} />
              ))}
            </div>
          </>
        )}
      </main>
    );
  return (
    <>
      <a className="skip-link" href="#menu-list">
        {t.viewAll}
      </a>
      {data.restaurant.editorPreview&&!embeddedPreview&&<div className="editor-preview-banner">Draft preview <a href="/dashboard/">Back to dashboard <ArrowRight size={15}/></a></div>}
      <header className="topbar">
        <div className="topbar-inner">
          <button
            className="restaurant-brand"
            onClick={(e) => open({ type: "about" }, e)}
            aria-label={t.about}
          >
            <span className="restaurant-emblem">
              <RestaurantMark restaurant={data.restaurant} size={26} />
            </span>
            <span>
              <strong>{data.restaurant.name}</strong>

            </span>
          </button>
          <div className="header-actions">
            <button
              className="header-saved"
              onClick={(e) => open({ type: "saved" }, e)}
            >
              <Bookmark size={18} />
              {t.saved}
              <span>{saved.length}</span>
            </button>
            <button
              className="language-button"
              aria-label={t.language}
              onClick={(e) => open({ type: "language" }, e)}
            >
              <Globe2 size={17} />
              <span>{language.toUpperCase()}</span>
              <ChevronDown size={13} />
            </button>
          </div>
        </div>
      </header>
      <main className="page">
        <div className="welcome">
          <div className="welcome-text">
            <h1>{t.yourMenu}</h1>
          </div>
          <button
            className="restaurant-info"
            onClick={(e) => open({ type: "about" }, e)}
          >
            <Info size={17} />
            {t.about}
            <ArrowRight size={16} />
          </button>
        </div>
        {data.items.length===0?<section className="new-menu-empty" id="menu-list"><div className="empty-plate" aria-hidden="true"><img src="assets/palate-logo.svg" alt=""/></div><h2>{t.menuComingSoon||'Our menu is on its way.'}</h2><p>{t.menuComingSoonBody||'We’re getting the dishes ready. Please check back soon.'}</p></section>:<><div className="promos">
          {data.deal?.enabled &&
            data.deal.itemIds.every(
              (id) => data.items.find((i) => i.id === id)?.available,
            ) && (
              <button className="deal-card" onClick={openDeal}>
                <div className="deal-text">
                  <h2>{loc(data.deal.name)}</h2>
                  <p>{loc(data.deal.description)}</p>
                  <span className="deal-link">
                    {t.viewSet}
                    <ArrowRight size={16} />
                    <strong>
                      {price(
                        totalCents(
                          data.deal.itemIds.map((id) =>
                            data.items.find((i) => i.id === id),
                          ),
                          data.deal.discountCents,
                        ),
                      )}
                    </strong>
                  </span>
                </div>
                <div className="deal-art">
                  <img
                    src={
                      data.items.find((i) => i.id === data.deal.itemIds[1])
                        ?.image
                    }
                    alt=""
                  />

                </div>
              </button>
            )}
          <button className="finder-card" onClick={openFinder}>
            <span className="finder-symbol">
              <BrainCircuit size={26} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div>
              <h2>{t.finder}</h2>
              <span>
                {t.mood}
                <ArrowRight size={16} />
              </span>
            </div>
          </button>
        </div>
        <div className="menu-layout">
          <aside className="desktop-sidebar">
            <nav aria-label={t.menuLabel}>{categoryButtons()}</nav>
            <button
              className="allergy-link"
              onClick={(e) => open({ type: "allergy" }, e)}
            >
              <ShieldCheck size={18} />
              <span>{t.allergy}</span>
              <ChevronRight size={14} />
            </button>
            <a className="powered" href={data.restaurant.palateUrl}>
              {t.powered}
              <img src="assets/palate-logo.svg" alt="" />
              <strong>palate</strong>
              <ArrowRight size={13} />
            </a>
          </aside>
          <div className="menu-main">
            <div className="menu-tools">
              <div className="search-box">
                <Search size={19} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.search}
                  aria-label={t.searchLabel}
                  type="search"
                  autoComplete="off"
                />
                {query && (
                  <button
                    aria-label={t.clearSearch}
                    onClick={() => setQuery("")}
                  >
                    <X size={17} />
                  </button>
                )}
              </div>
              <ToggleGroup.Root
                dir={languages.find((l) => l.code === language)?.dir}
                className="filter-row"
                type="multiple"
                value={filters}
                onValueChange={setFilters}
                aria-label={t.filters}
              >
                {diets.map((tag) => {
                  const Icon = dietIcons[tag];
                  return (
                    <ToggleGroup.Item
                      key={tag}
                      value={tag}
                      className="filter-chip"
                      aria-label={t[tag]}
                    >
                      <Icon size={15} />
                      {t[tag]}
                      {filters.includes(tag) && <Check size={13} />}
                    </ToggleGroup.Item>
                  );
                })}
              </ToggleGroup.Root>
              {filters.length > 0 && (
                <div className="filter-summary">
                  <span>
                    {filters.length}{" "}
                    {filters.length === 1 ? t.preference : t.preferences}
                  </span>
                  <button onClick={() => setFilters([])}>
                    {t.clear}
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>
            <nav className="mobile-categories" aria-label={t.menuLabel}>
              {categoryButtons()}
            </nav>
            <div id="menu-list" className="menu-list" tabIndex={-1}>
              <div className={`result-count ${!query && !filters.length ? "sr-only" : ""}`} aria-live="polite">
                {filtered.length} {filtered.length === 1 ? t.dish : t.dishes}
                {query && <> · “{query}”</>}
              </div>
              {filtered.length === 0 ? (
                <div className="empty-state">
                  <span>
                    <Search size={28} />
                  </span>
                  <h2>{t.empty}</h2>
                  <p>{t.emptyBody}</p>
                  <button className="secondary" onClick={reset}>
                    {t.reset}
                    <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                data.categories.map((c) => {
                  const items = filtered.filter((i) => i.category === c.id);
                  return (
                    items.length > 0 && (
                      <section
                        key={c.id}
                        className="dish-section"
                        aria-labelledby={"category-" + c.id}
                      >
                        <div className="section-heading">
                          <h2 id={"category-" + c.id}>{loc(c.name)}</h2>
                          <span
                            className="category-count"
                            aria-label={`${items.length} ${items.length === 1 ? t.dish : t.dishes}`}
                          >
                            {new Intl.NumberFormat(language).format(
                              items.length,
                            )}
                          </span>
                        </div>
                        <div className="dish-grid">
                          {items.map((item, index) => renderCard(item, index))}
                        </div>
                      </section>
                    )
                  );
                })
              )}
            </div>
            <footer className="menu-footer">
              <button onClick={(e) => open({ type: "allergy" }, e)}>
                <ShieldCheck size={17} />
                {t.allergy}
                <ChevronRight size={14} />
              </button>
              <span>
                {data.restaurant.sample
                  ? t.photosNote
                  : data.items.some((i) => i.imageKind === "illustration")
                    ? t.photosLive
                    : ""}
              </span>
              <a className="powered" href={data.restaurant.palateUrl}>
                {t.powered}
                <img src="assets/palate-logo.svg" alt="" />
                <strong>palate</strong>
                <ArrowRight size={13} />
              </a>
            </footer>
          </div>
        </div></>}
      </main>
      {data.items.length>0&&<nav className="mobile-dock" aria-label={t.menu}>
        <button
          className={!panel ? "dock-active" : ""}
          onClick={() => {
            close();
            document.querySelector("#menu-list")?.scrollIntoView({
              behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "instant"
                : "smooth",
            });
          }}
        >
          <UtensilsCrossed size={20} />
          <span>{t.menu}</span>
        </button>
        <button className="dock-finder" onClick={openFinder}>
          <BrainCircuit size={23} strokeWidth={1.8} aria-hidden="true" />
          <span>{t.findMeal}</span>
        </button>
        <button
          className={panel?.type === "saved" ? "dock-active" : ""}
          onClick={(e) => open({ type: "saved" }, e)}
        >
          <span className="dock-icon">
            <Bookmark size={20} />
            {saved.length > 0 && <b>{saved.length}</b>}
          </span>
          <span>{t.saved}</span>
        </button>
      </nav>}
      <div className={`toast ${toast ? "show" : ""}`} role="status">
        <Check size={16} />
        {toast}
      </div>
      <Dialog.Root
        open={!!panel}
        onOpenChange={(value) => {
          if (!value) close();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="sheet-overlay" />
          <Dialog.Content
            className={`sheet ${panel?.type === "dish" ? "dish-sheet" : ""}`}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              titleRef.current?.focus({ preventScroll: true });
            }}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              if (triggerRef.current?.isConnected)
                triggerRef.current.focus({ preventScroll: true });
            }}
            aria-describedby="panel-description"
          >
            <div className="sheet-chrome">
              <span className="sheet-grabber" />
              <Dialog.Close asChild>
                <button className="sheet-close" aria-label={t.close}>
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>
            <div className="sheet-scroll" ref={scrollRef}>
              {panel?.type === "dish" && currentItem && (
                <>
                  <div className="detail-photo">
                    <Photo item={currentItem} t={t} eager />
                    {currentItem.imageKind === "illustration" && (
                      <span className="image-label">{t.illustration}</span>
                    )}
                  </div>
                  <div className="panel-padding">
                    <div className="detail-heading">
                      <PanelTitle titleRef={titleRef}>
                        {loc(currentItem.name)}
                      </PanelTitle>
                      <strong>{price(currentItem.priceCents)}</strong>
                    </div>
                    <DietTags t={t} item={currentItem} />
                    {!currentItem.available && (
                      <div className="sold-notice">{t.sold}</div>
                    )}
                    <Dialog.Description
                      id="panel-description"
                      className="detail-description"
                    >
                      {loc(currentItem.description)}
                    </Dialog.Description>
                    <section className="ingredients-block">
                      <h3>{t.ingredients}</h3>
                      <p>{loc(currentItem.ingredients)}</p>
                      <div className="allergen-line">
                        <Info size={15} />
                        <span>
                          {currentItem.allergens.length ? (
                            <>
                              <strong>{t.allergens}: </strong>
                              {currentItem.allergens
                                .map((a) => t[a] || a)
                                .join(", ")}
                            </>
                          ) : (
                            t.noAllergens
                          )}
                        </span>
                      </div>
                    </section>
                    <button
                      className="inline-allergy"
                      onClick={() => {
                        setLastPanel(panel);
                        setPanel({ type: "allergy" });
                      }}
                    >
                      <ShieldCheck size={16} />
                      {t.allergy}
                      <ChevronRight size={14} />
                    </button>
                    <section className="pairings-block">
                      <h3>{t.pairs}</h3>
                      <div>
                        {currentItem.pairsWith
                          .map((id) => data.items.find((i) => i.id === id))
                          .filter((i) => i?.available)
                          .map((item) => (
                            <button
                              key={item.id}
                              className="pairing-row"
                              onClick={() =>
                                setPanel({ type: "dish", id: item.id })
                              }
                            >
                              <Photo item={item} t={t} />
                              <span>
                                <strong>{loc(item.name)}</strong>
                                <small>{price(item.priceCents)}</small>
                              </span>
                              <ChevronRight size={18} />
                            </button>
                          ))}
                      </div>
                    </section>
                  </div>
                </>
              )}
              {panel?.type === "language" && (
                <div className="panel-padding standard-panel language-panel">
                  <PanelTitle titleRef={titleRef}>{t.language}</PanelTitle>
                  <Dialog.Description
                    id="panel-description"
                    className="sr-only"
                  >
                    {t.languageIntro}
                  </Dialog.Description>
                  <div className="search-box language-search">
                    <Search size={18} />
                    <input
                      type="search"
                      value={languageQuery}
                      onChange={(e) => setLanguageQuery(e.target.value)}
                      placeholder={t.languageSearch}
                      aria-label={t.languageSearch}
                    />
                    {languageQuery && (
                      <button
                        aria-label={t.clearSearch}
                        onClick={() => setLanguageQuery("")}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div
                    className="language-options"
                    aria-busy={!!languageLoading}
                  >
                    {visibleLanguages.map((option) => (
                      <button
                        key={option.code}
                        onClick={() => selectLanguage(option.code)}
                        disabled={!!languageLoading}
                        aria-pressed={language === option.code}
                      >
                        <span>
                          <strong lang={option.code} dir={option.dir}>
                            {option.nativeName}
                          </strong>
                          <small>{languageLabel(option.code, language)}</small>
                        </span>
                        {languageLoading === option.code ? (
                          <span
                            className="spinner"
                            aria-label={t.languageLoading}
                          />
                        ) : language === option.code ? (
                          <Check size={20} />
                        ) : (
                          <span className="radio-ring" />
                        )}
                      </button>
                    ))}
                  </div>
                  {visibleLanguages.length === 0 && (
                    <p className="language-empty">{t.languageEmpty}</p>
                  )}
                  {languageError && (
                    <p role="alert" className="form-error">
                      {languageError}
                    </p>
                  )}
                </div>
              )}
              {panel?.type === "about" && (
                <div className="panel-padding standard-panel">
                  <span className="about-emblem">
                    <RestaurantMark restaurant={data.restaurant} size={38} />
                  </span>
                  <PanelTitle titleRef={titleRef}>
                    {data.restaurant.name}
                  </PanelTitle>
                  <Dialog.Description id="panel-description">
                    {loc(data.restaurant.subtitle)}
                  </Dialog.Description>
                  <p className="about-copy">
                    {data.restaurant.sample
                      ? t.aboutBody
                      : loc(data.restaurant.description)}
                  </p>
                  <div className="info-row">
                    <MapPin size={21} />
                    <div>
                      <h3>{t.address}</h3>
                      <p>{loc(data.restaurant.address)}</p>
                    </div>
                  </div>
                  <div className="info-row">
                    <Clock size={21} />
                    <div>
                      <h3>{t.hours}</h3>
                      <p>{loc(data.restaurant.hours)}</p>
                    </div>
                  </div>
                  <p className="sample-note">
                    {data.restaurant.sample
                      ? t.photosNote
                      : data.items.some((i) => i.imageKind === "illustration")
                        ? t.photosLive
                        : ""}
                  </p>
                </div>
              )}
              {panel?.type === "allergy" && (
                <div className="panel-padding standard-panel">
                  {lastPanel && (
                    <button
                      className="back-button"
                      onClick={() => {
                        setPanel(lastPanel);
                        setLastPanel(null);
                      }}
                    >
                      <ArrowLeft size={17} />
                      {t.back}
                    </button>
                  )}
                  <ShieldCheck className="panel-symbol" />
                  <PanelTitle titleRef={titleRef}>{t.allergyTitle}</PanelTitle>
                  <Dialog.Description
                    id="panel-description"
                    className="allergy-body"
                  >
                    {data.restaurant.sample ? t.allergyBody : t.allergyLive}
                  </Dialog.Description>
                </div>
              )}
              {panel?.type === "saved" && (
                <div className="panel-padding standard-panel">
                  <Bookmark className="panel-symbol" />
                  <PanelTitle titleRef={titleRef}>{t.savedTitle}</PanelTitle>
                  <Dialog.Description id="panel-description">
                    {t.savedIntro}
                  </Dialog.Description>
                  {savedItems.length === 0 ? (
                    <div className="empty-state saved-empty">
                      <h3>{t.savedEmpty}</h3>
                      <p>{t.savedEmptyBody}</p>
                      <button className="primary" onClick={close}>
                        {t.browse}
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="saved-list">
                        {savedItems.map((item) => (
                          <div className="saved-row" key={item.id}>
                            <button
                              className="saved-dish"
                              onClick={() =>
                                setPanel({ type: "dish", id: item.id })
                              }
                            >
                              <Photo item={item} t={t} />
                              <span>
                                <strong>{loc(item.name)}</strong>
                                <small>
                                  {price(item.priceCents)}
                                  {!item.available ? " · " + t.sold : ""}
                                </small>
                              </span>
                            </button>
                            <button
                              className="remove-saved"
                              aria-label={`${t.unsave}: ${loc(item.name)}`}
                              onClick={() => saveDish(item.id)}
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="meal-total">
                        <span>{t.total}</span>
                        <strong>{price(totalCents(savedItems))}</strong>
                      </div>
                      <p className="shortlist-note">{t.notOrder}</p>
                      <button
                        className="text-button"
                        onClick={() => setSaved([])}
                      >
                        {t.clearSaved}
                      </button>
                    </>
                  )}
                </div>
              )}
              {panel?.type === "finder" && (
                <div className="panel-padding standard-panel finder-panel">
                  {!meal ? (
                    <>
                      <PanelTitle titleRef={titleRef}>{t.mood}</PanelTitle>
                      <Dialog.Description id="panel-description">
                        {t.finderIntro}
                      </Dialog.Description>
                      <form onSubmit={findMeal} className="finder-form">
                        <label className="sr-only" htmlFor="mood">
                          {t.mood}
                        </label>
                        <textarea
                          id="mood"
                          value={mood}
                          onChange={(e) => setMood(e.target.value)}
                          placeholder={t.moodPlaceholder}
                          maxLength={300}
                          rows={3}
                        />
                        <div className="suggestion-chips">
                          {t.suggestions.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setMood(s)}
                            >
                              {s}
                              <Plus size={13} />
                            </button>
                          ))}
                        </div>
                        {filters.length > 0 && (
                          <p className="included-prefs">
                            <Check size={15} />
                            {t.applyPrefs}
                            <span>{filters.map((f) => t[f]).join(" · ")}</span>
                          </p>
                        )}
                        <button
                          className="primary"
                          type="submit"
                          disabled={finding}
                        >
                          {finding ? (
                            <>
                              <span className="spinner" />
                              {t.loading}
                            </>
                          ) : (
                            <>
                              {t.build}
                              <ArrowRight size={18} />
                            </>
                          )}
                        </button>
                        {finderError && (
                          <p role="alert" className="form-error">
                            {finderError}
                          </p>
                        )}
                        <span className="sample-note">
                          {!data.assistant?.endpoint && data.restaurant.sample && t.suggestionNote}
                        </span>
                      </form>
                    </>
                  ) : meal.items.length === 0 ? (
                    <>
                      <PanelTitle titleRef={titleRef}>{t.noMeal}</PanelTitle>
                      <Dialog.Description id="panel-description">
                        {t.noMealBody}
                      </Dialog.Description>
                      <button className="primary" onClick={() => setMeal(null)}>
                        {t.editMood}
                        <ArrowLeft size={16} />
                      </button>
                    </>
                  ) : swapIndex !== null ? (
                    <>
                      <button
                        className="back-button"
                        onClick={() => setSwapIndex(null)}
                      >
                        <ArrowLeft size={16} />
                        {t.back}
                      </button>
                      <PanelTitle titleRef={titleRef}>{t.swapTitle}</PanelTitle>
                      <Dialog.Description id="panel-description">
                        {[t.starter, t.main, t.drink][swapIndex]}
                      </Dialog.Description>
                      <div className="swap-list">
                        {alternatives(
                          data.items,
                          meal.items,
                          swapIndex,
                          meal.prefs,
                          meal.discount,
                        ).map((item) => (
                          <button
                            key={item.id}
                            className="swap-option"
                            onClick={() => {
                              setMeal({
                                ...meal,
                                items: meal.items.map((x, i) =>
                                  i === swapIndex ? item : x,
                                ),
                              });
                              setSwapIndex(null);
                            }}
                          >
                            <Photo item={item} t={t} />
                            <span>
                              <strong>{loc(item.name)}</strong>
                              <small>{loc(item.short)}</small>
                              <b>{price(item.priceCents)}</b>
                            </span>
                            <ArrowRight size={18} />
                          </button>
                        ))}
                        {alternatives(
                          data.items,
                          meal.items,
                          swapIndex,
                          meal.prefs,
                          meal.discount,
                        ).length === 0 && <p>{t.noSwaps}</p>}
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        className="back-button"
                        onClick={() => setMeal(null)}
                      >
                        <ArrowLeft size={16} />
                        {t.editMood}
                      </button>
                      <PanelTitle titleRef={titleRef}>
                        {meal.deal ? t.set : t.result}
                      </PanelTitle>
                      <Dialog.Description id="panel-description">
                        {meal.deal
                          ? t.dealIntro.replace(
                              "{saving}",
                              price(meal.discount),
                            )
                          : t.resultIntro}
                      </Dialog.Description>
                      {meal.prefs.budget !== null && (
                        <div className="budget-badge">
                          <Check size={14} />
                          {t.resultBudget} · {price(meal.prefs.budget)}
                        </div>
                      )}
                      <div className="meal-list">
                        {meal.items.map((item, i) => (
                          <div className="meal-item" key={i}>
                            <div className="course-label">
                              <span>{String(i + 1).padStart(2, "0")}</span>
                              {[t.starter, t.main, t.drink][i]}
                            </div>
                            <div className="meal-item-main">
                              <Photo item={item} t={t} />
                              <div>
                                <h3>{loc(item.name)}</h3>
                                <span>{price(item.priceCents)}</span>
                                <DietTags t={t} item={item} limit={2} />
                              </div>
                              <button
                                className="swap-button"
                                onClick={() => setSwapIndex(i)}
                                aria-label={`${t.swap}: ${loc(item.name)}`}
                              >
                                <RefreshCw size={14} />
                                {t.swap}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {meal.discount > 0 && (
                        <div className="discount-row">
                          <span>
                            {t.separate} <s>{price(totalCents(meal.items))}</s>
                          </span>
                          <b>
                            {t.saving} {price(meal.discount)}
                          </b>
                        </div>
                      )}
                      <div className="meal-total">
                        <span>{meal.deal ? t.setTotal : t.total}</span>
                        <strong>
                          {price(totalCents(meal.items, meal.discount))}
                        </strong>
                      </div>
                      <p className="shortlist-note">{t.notOrder}</p>
                    </>
                  )}
                </div>
              )}
            </div>
            {panel?.type === "dish" && currentItem && (
              <div className="sheet-footer">
                <button
                  className={`primary ${saved.includes(currentItem.id) ? "saved-primary" : ""}`}
                  onClick={() => saveDish(currentItem.id)}
                >
                  <Bookmark
                    size={18}
                    fill={
                      saved.includes(currentItem.id) ? "currentColor" : "none"
                    }
                  />
                  {saved.includes(currentItem.id) ? t.unsave : t.save}
                  <span>{price(currentItem.priceCents)}</span>
                </button>
              </div>
            )}
            {panel?.type === "finder" &&
              meal?.items.length > 0 &&
              swapIndex === null && (
                <div className="sheet-footer">
                  <button className="primary" onClick={saveMeal}>
                    <Bookmark size={18} />
                    {t.saveMeal}
                    <ArrowRight size={18} />
                  </button>
                </div>
              )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
