# Brand Intelligence Reference Implementation

Target: `/brands`, using `data table formulation/Brand Intelligence Dashboard.png`.
Reference image: 1672 x 941; prompt viewport: 1648 x 928. No other page was redesigned.

## Changes

- Scoped navy sidebar, 66px header, photographic greenhouse banner, four pastel KPI cards, compact toolbar/chips and three-column brand cards.
- Server-side search, exact manufacturer/sector/market filters, stable global sorting, pagination, grid/list views and URL state.
- Persistent brand bookmarks, Saved Items links, accessible brand details and comparison of actual product IDs.
- Distinct source name/company portfolios remain explicitly separate from stored brand identities. Ingredient mixtures retain their source text. Missing trademark data displays `Not recorded`.
- Read-only brand summary and portfolio queries respect existing publication and staff permissions. No database records, models, publication states, imports or scientific values were changed.

## Measurements

Browser measurements: devicePixelRatio 1, root font 16px; no zoom or transform scaling.

| Viewport | Sidebar | Header | Banner | KPI | First card | Grid |
| --- | --- | --- | --- | --- | --- | --- |
| 1672 x 941 | 252.47px | 66px | 228px | 114px | 450.50 x 295.56px | 3 columns |
| 1648 x 928 | 248.84px | 66px | 228px | 114px | 443.72 x 295.56px | 3 columns |
| 1536 x 1024 | 231.92px | 66px | 228px | 114px | 412.02 x 331.84px | 3 columns |

The reference's approximate targets are 250px sidebar, 66px header and 225px banner. Cards grow with source text rather than truncate scientific mixtures. Desktop content gutters are 22px. No horizontal overflow at 360, 390, 768, 1366, 1440, 1536, 1648 or 1672px.

## Real Data

Authenticated local database totals observed: 3,071 portfolios, 3,071 with formulations, 3,071 with recorded active ingredient text, and 3 reported markets. Syngenta / Agrochemical / United States returns 93 portfolios including Acuron and its variants.

`GET /api/v1/search/?group=brandSummary` counts eligible stored brands plus distinct eligible source name/company pairs, suppressing pairs represented by visible stored brands. Formulation/ingredient metrics count qualifying portfolios, not rows or page samples. Markets count distinct recorded country/region names. These are source-reported geographic labels, not independently verified market coverage.

`group=brands` globally sorts the combined stored/source result set and returns complete eligible sector, ingredient, type and market metadata for each selected portfolio. Product samples are bounded; the details dialog loads linked records separately using server pagination. Source deep links validate the stable pair key. Linked commercial products retain genuine IDs rather than duplicated projected IDs.

## Files

- `src/features/manufacturers/BrandReferenceView.tsx`, `BrandIntelligenceView.tsx`
- `src/styles/brand-intelligence.css`, `src/index.css`
- `src/stores/workspaceStore.ts`, `src/features/workspace/WorkspaceView.tsx`
- `src/components/layout/Header.tsx`, `Sidebar.tsx`, `src/App.tsx`
- `backend/apps/core/brand_search.py`, `search_api.py`
- `backend/tests/test_search.py`, `tests/brand-intelligence.spec.ts`

## Verification

- TypeScript (`npm run lint`): passed.
- Production build: passed. Existing large-bundle and Vite `__dirname` warnings remain.
- Django suite: 84 tests passed, including permission checks, distinct pair metrics, mixed stored/source sorting, complete metadata and genuine product identity.
- Final targeted search suite after the linked-product/manufacturer edge-case correction: 43 tests passed.
- Brand browser suite: 4 tests passed; filters/chips, pagination, sorting, grid/list, bookmarks/reopening, details, comparison, errors, responsive sizes and dark theme.
- Combined Brand Intelligence and existing shared-search browser regression suite: 13 tests passed.
- Live authenticated screenshots captured and visually inspected: `artifacts/brand-reference-1672.png`, `brand-reference-1648.png`, `brand-reference-1536.png`, `brand-reference-dark.png`.
- Existing staff session used for live verification; no user accounts or source records created or modified.

## Remaining Differences

- Existing greenhouse/flask artwork is reused; it is not the exact reference composition. Generic scientific thumbnails are not invented official brand packaging.
- Real totals and filtered result counts intentionally differ from illustrative numbers in the reference.
- Decorative KPI bars have no historical meaning and are hidden from assistive technology.
- Market names remain source text rather than invented flag/territory associations. A market filter and staff-access menu preserve functionality beyond the illustration.
- Existing logo, sidebar Settings navigation and account controls are preserved. Card radii use the application's 8px convention. Exact pixel parity is not claimed.
