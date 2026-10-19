# Ingredient Explorer Verification

## Implementation

The `/ingredients` route now follows the supplied reference using real React controls: a laboratory hero, compact KPI tiles and filters, a 39/61 master-detail workbench, scientific thumbnails, six accessible tabs, twelve overview fields, and a related-formulations table. Existing sidebar collapse, mobile drawer, bottom navigation, global search, theme and account actions remain available.

Source text and chemical registry entries remain separate. Concentrations, mixtures, salts and technical-grade source names are not normalized or assigned a molecular identity. Missing scientific values remain `Not recorded`. All database records, publication states and scientific source text were preserved.

## Measurements

| Element | Before, 1648 x 928 | After, 1648 x 928 |
| --- | --- | --- |
| Sidebar | 260px | 243.9px |
| Header | 72px | 60px |
| Laboratory hero | Previous generic page header | 184px |
| Filter panel | Multiple separate sections | 116px |
| Workbench columns | Previous grid | 526.5px / 823.6px |
| Root font / DPR | 16px / 1 | 16px / 1 |

The sidebar measures 247.5px at the actual attachment size, 1672 x 941, and 227.3px at 1536 x 1024. No horizontal page overflow was found at 360, 390, 768, 1024, 1280, 1536, 1648 or 1672px. Technical tables scroll within their own container.

The existing font stack remains Plus Jakarta Sans with system fallbacks. Fonts are supplied through Google Fonts in `index.html`; offline interaction fixtures deliberately block those requests and exercise fallback fonts. The reference does not establish its actual browser zoom or loaded font metrics, so exact font parity is not claimed. No global zoom, scaling transform or base-font reduction was used.

## Files and Components

- `src/features/ingredients/IngredientWorkbench.tsx`: ingredient explorer, thumbnail, evidence and scientific tile components; filters, detail tabs, keyboard tab navigation, exports and linked listing pagination.
- `src/features/ingredients/IngredientExplorerView.tsx`: compatibility export for the existing route.
- `src/styles/ingredient-explorer.css`, `src/index.css`: route-scoped shell and workbench styles, responsive and dark themes.
- `src/App.tsx`: status remains accessible in the hero without a duplicate status band.
- `src/components/layout/Header.tsx`, `Sidebar.tsx`, `GlobalSearchModal.tsx`: contextual search label, ingredient bookmark counts and correctly typed source-text navigation.
- `src/stores/workspaceStore.ts`, `src/features/workspace/WorkspaceView.tsx`: persistent ingredient bookmarks with reopening and removal in Saved Items.
- `backend/apps/core/search.py`, `search_api.py`, `serializers.py`, `views.py`: permission-safe read-only search/metadata extensions.
- `src/services/searchApi.ts`: additional optional linked-listing facet count.
- `backend/tests/test_search.py`, `tests/ingredient-explorer.spec.ts`: regression and browser coverage.
- `public/assets/scientific/ingredient-explorer.webp`, `material-powder.webp`: optimized decorative imagery.

## APIs

Reused `/api/v1/search/` for facets, active source groups, chemical registry records and linked product/formulation listings. Added exact source hydration, source sorting and complete selected-source market/category metadata; registry verification/market filters; normalized ingredient relationship filtering for linked listings; and read-only stored synonyms, identifiers and scientific properties. Source groups always remain unverified, even if an underlying formulation's evidence status changes. Eligibility and staff permissions still apply independently to every entity.

No models, migrations, import logic, chart calculations or publication permissions changed. Search is server-side with pagination and stale-request cancellation, not filtering the first loaded React page.

## Real Data and Tests

The development database contains one source group matching `metri`: `75.0% Metribuzin`, with 93 eligible staff-preview listings. It has 71 source groups and zero chemical registry entries. Its CAS number, formula, molecular weight and structure therefore remain unassigned. Verified chemical behavior was tested with isolated test fixtures, not fabricated production records.

Actual-data screenshots use read-only, authorized in-process Django API responses in an isolated browser transport. This does not log a real browser into Django or expose drafts publicly. Real users still need the appropriate staff session to view drafts.

Passed: full Django suite (79 tests); TypeScript validation (`npm run lint`); production build; twelve combined browser regression tests covering Ingredient Explorer, Formulation Explorer and server search; and a final four-test Ingredient Explorer pass adding global source navigation, saved record reopening and image fallback. Coverage also includes CAS and stored synonym search, filters, record types, sorting, both paginations, selection history, six tabs, keyboard navigation, JSON export, related navigation, mobile filters, dark mode and responsive geometry.

No separate ESLint script is configured: the project's `lint` command performs TypeScript checking. Existing build warnings remain for large bundle size and Vite configuration's `__dirname` usage.

## Screenshots

- `artifacts/ingredient-explorer-before.png`
- `artifacts/ingredient-explorer-1648.png`
- `artifacts/ingredient-explorer-1672.png`
- `artifacts/ingredient-explorer-1536.png`
- `artifacts/ingredient-explorer-dark.png`

## Asset Generation

Assets were generated using the built-in image-generation tool, then converted to WebP with Pillow. Neither asset is the reference screenshot.

Hero prompt: Wide laboratory photographic banner; left 45% clean pale sky-blue negative space; right modern white microscope with navy accents, glassware with cyan-blue liquid, generic white/cobalt molecular teaching model, green botanical leaves; bright clinical lighting; no text, UI, logos, labels, packaging or scientific claims. Saved as `public/assets/scientific/ingredient-explorer.webp` (109,308 bytes).

Thumbnail prompt: Neutral square studio photograph-style illustration of white fine powder in a plain shallow stainless laboratory dish, cool gray background, diffuse lighting; no text, labels, identifiers, packaging or claims about a particular substance. Saved as `public/assets/scientific/material-powder.webp` (5,698 bytes). Thumbnail alt text and tooltip explicitly identify it as a generic illustration, never a verified photograph or molecular structure.

## Remaining Differences

The reference includes invented sample records, populated molecular identities and additional sector chips. The actual database does not contain those records or identities, so the page intentionally shows real counts, one matching Metribuzin source group, recorded sector options and missing-field states. Longer genuine source values can increase row height. Generic generated imagery differs from the reference. Existing functional System/settings navigation and catalog access controls remain. These differences prevent an honest claim of exact pixel parity.
