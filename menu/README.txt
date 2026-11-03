PALATE · REUSABLE GUEST MENU

Open locally: http://127.0.0.1:8942/menu/
This folder lives inside Downloads/Palate, alongside the marketing homepage.
The homepage’s “Explore the menu” link opens this template.

WHAT WORKS
• Responsive dish list with photos, names, descriptions and prices.
• Bottom-sheet dish details on phones; side drawer on larger screens.
• Ingredient and allergen details, dietary filters and suggested pairings.
• Search across translated dish names and ingredients.
• A configurable lunch bundle with live totals and swappable dishes.
• Saved favorites, retained on this device for each restaurant.
• A meal recommendation demo that respects dietary filters, availability
  and budget. It selects a starter, main and drink, with valid swaps.
• 80 searchable languages, full sample-menu translations and RTL layouts.
• Skeleton loading, image fallbacks, retry states, keyboard focus handling
  and reduced-motion support.

REPLACE THE SAMPLE RESTAURANT
Edit menu-data.json:
  restaurant.id       Unique identifier; separates saved favorites.
  restaurant.name     Display name at the top.
  restaurant.monogram Short mark shown when there is no logo.
  restaurant.logo     Optional image path, e.g. assets/your-logo.svg.
  restaurant.sample   Set false when replacing the fictional content.
  restaurant.subtitle, address, hours, description
                     Text keyed by language, such as {"en":"..."}.
  restaurant.theme    accent, accentSoft, paper and warm colors in hex.
  restaurant.currency ISO currency code. Prices are stored in minor units.
  restaurant.languages / defaultLanguage
                     Available locales and initial default.
  restaurant.palateUrl Destination for the “Powered by Palate” link.

Edit items to replace names, photos, descriptions, ingredients, prices,
availability, dietary tags and pairing IDs. Edit each English text under
its “en” key; English renders directly from menu-data.json. Use available:
false to mark a dish sold out. Set imageKind to “photo” for actual restaurant
photography or “illustration” for AI illustration; the latter is labeled.

Each item has a stable id and category: starters, mains, sweets or drinks.
The current meal finder expects starters, mains and drinks for its three
courses. Keep those category IDs or update the engine when changing the
course structure. Set deal.enabled to false to hide the lunch promotion.

TRANSLATIONS
locales/{language}.json contains interface labels and translated restaurant,
category, item and deal text. Each file is loaded only when its language is
selected. language-manifest.json lists native names and writing directions.
Update the locale files whenever dishes or ingredient information changes.
Add new language codes to the manifest and restaurant.languages together.

English, Spanish and French started with curated sample copy. Additional
translations are machine-assisted, with restaurant terminology corrections
and completeness checks. They are not certified or comprehensively reviewed
by native speakers. Have restaurant staff review the relevant language and
allergen descriptions before publishing a real restaurant menu.
Translations are saved locally: guests’ language choices and searches are
not sent to an external translation service.

AI CONNECTION
The default recommendation mode is an explicitly labeled local demo.
No AI API key is included and there is no live model call.
To connect live AI, set assistant.endpoint to a same-origin POST endpoint.
It receives:
  {restaurantId, mood, filters, language}
Return:
  {"itemIds":["starter-id","main-id","drink-id"]}
The client checks course order, IDs, availability, dietary constraints and
budget before showing the result. Keep provider credentials on your server;
the server should validate menu data and constraints too. Local vocabulary
matching is intentionally limited; live multilingual reasoning belongs in
that endpoint. Money is displayed in the restaurant’s currency; no foreign
exchange conversion is performed.

This is a guest menu template, not a payment or ordering system. Saved dishes
are a shortlist; guests order with restaurant staff. The owner dashboard,
live AI service, analytics and QR publishing remain separate product work.

RUN / EDIT
Serve the parent Palate directory with any static HTTP server. For example:
  python3 -m http.server 8942 --bind 127.0.0.1
Then visit /menu/. A server is required because the menu loads JSON files.

Source changes:
  npm ci
  npm run build
  npm test
The included app.js and app.css are already built. No install is required
to serve the built template. React, Radix UI and Lucide are bundled locally.
Source is in src/. Icons use Lucide; dialogs and toggle groups use Radix UI.

See DESIGN-NOTES.txt for design references and sample image prompts.
See THIRD-PARTY-NOTICES.txt and assets/*-LICENSE.txt for library/font notices.
