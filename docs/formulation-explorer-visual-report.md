# Formulation Explorer Visual Verification

## Scope

Rebuilt the existing Formulation Explorer presentation against the supplied 1672 x 941 reference. Existing routing, permissions, scientific source values, server-side search, selection, bookmarks, pagination, and detail tabs are retained. No existing database records were changed or published.

## Measurements

At 1672 x 941, browser DPR 1 and root font size 16px:

| Element | Before | After |
| --- | --- | --- |
| Sidebar | 260px | 246px |
| Desktop header | 72px | 60px |
| Hero | 184px | 164px |
| Filter panel | Multi-section layout | 120px |
| Workbench start | Approximately 632px | 358px |
| Workbench columns | Previous layout | Approximately 39% / 61% |

At 1536 x 1024 the sidebar is approximately 226px, with the same header, hero and filter heights. No horizontal page overflow was found at 360, 390, 768, 1024, 1280, 1536 or 1672px.

## Files

- `src/features/formulations/FormulationExplorerView.tsx`: responsive master-detail interface, source properties, functional tabs and CSV/JSON exports.
- `src/features/formulations/FormulationIntelligenceView.tsx`: compatibility export for existing imports.
- `src/styles/formulation-explorer.css` and `src/index.css`: route-scoped styling.
- `src/App.tsx` and `src/components/layout/Sidebar.tsx`: avoid duplicated status presentation and adjust this route's subtitle.
- `backend/apps/core/search.py`: validated publication-status filtering and stable server-side ordering.
- `backend/apps/core/serializers.py`: expose existing source sheet and row as read-only metadata.
- `backend/tests/test_search.py`: workflow filter and ordering regression coverage.
- `tests/formulation-explorer.spec.ts` and `tests/formulation-explorer-live.spec.ts`: interaction, responsive and actual-data visual checks.

## Assets

Generated using the built-in image-generation tool, then optimized to WebP:

- `public/assets/scientific/formulation-explorer.webp` (approximately 166KB). Prompt: Wide 3:1 laboratory photo-illustration, left 40% pale sky-blue negative space, blue Erlenmeyer flask and glassware with green leaves predominantly on the right, subtle distant molecular motifs, no text, UI, logos, packaging or claims.
- `public/assets/scientific/material-granules.webp` (approximately 17KB). Prompt: Neutral square studio photo-illustration of cyan-blue crystalline granules on a cool gray-blue background, no branding, container, text or chemical labels; not a photograph or claim about a specific substance or product.

Material thumbnails are explicitly identified as generic illustrations, not verified product photographs. The supplied dashboard screenshot is not used as a page background.

## Verification

TypeScript checking and production build passed. The relevant backend search, catalog and spreadsheet tests passed: 52 tests. All four Playwright tests passed. Browser coverage includes search parameters, filters, reset, selection and history, bookmarks, tabs, source units, export, responsive layouts, dark mode and image fallback. Final screenshots were captured at 1672 x 941 and 1536 x 1024 in light mode, and 1536 x 1024 in dark mode.

Actual-data screenshots use read-only responses from the existing local Django database through an authorized in-process API request, supplied to an isolated browser test. This does not authenticate a real browser or expose drafts publicly. The actual Copper Oxychloride 50 102 record remains Draft, with source `european_market_formulations.xlsx`, `Master Database`, row 934. Its original `50.0% Copper Oxychloride` text is retained.

## Remaining Differences

The reference is an illustrative design, not a matching snapshot of this database. Counts, matches, source properties and permissions therefore remain real rather than reproducing its sample values. Generated laboratory and material imagery differs from the reference. Existing functional navigation groups and account actions remain available. Missing scientific values are shown as unavailable, never inferred from the image.

Existing build warnings remain for the large application bundle and Vite configuration's use of `__dirname`; these are outside this visual correction scope.
