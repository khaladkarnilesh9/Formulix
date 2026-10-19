# Commercial Product Intelligence Verification

## Scope

The existing `/products` page was visually corrected against the supplied reference. Existing server-side search, pagination, bookmarks, four-product comparison limit, Spec Sheet navigation, exports and permissions remain in use. No database records, scientific values or publication states were modified.

## Reference Geometry

At 1648 x 928, DPR 1 and root font size 16px:

| Element | Implemented |
| --- | --- |
| Sidebar | 245.5px |
| Header | 64px |
| Agricultural hero | 202px |
| Six KPI cards | 126px tall |
| Sector/search toolbar | 106px tall |
| Workspace side padding | 22px |

At the actual attachment dimensions, 1672 x 941, the sidebar measures 249.1px. At 1536 x 1024 it measures 228.9px. Responsive checks found no horizontal page overflow at 360, 390, 768, 1024, 1280, 1536, 1648 or 1672px. Laptop tables scroll inside their own container; mobile table results retain the application's card-like row presentation.

The main table now uses the full workspace width. Filters open in an accessible dialog on desktop and mobile instead of permanently consuming a table column. Removed redundant status-band spacing, tightened toolbar and sort-bar spacing, and removed the extra gap before the table. Long scientific values remain readable rather than clipped.

## Files

Created:

- `src/features/products/ProductVisuals.tsx`: agricultural hero, neutral/source-supplied thumbnails, source-title presentation and an accessible portal action menu.
- `src/styles/product-intelligence.css`: route-scoped shell, hero, KPIs, controls, table, grid, dark theme and responsive styling.
- `tests/product-reference.spec.ts`: product workflows, responsive checks and real HTTP visual verification.
- `public/assets/scientific/product-agriculture.webp`, `product-thumbnail.webp`: optimized versions of the existing scientific agriculture asset.

Modified:

- `src/features/products/ProductSearchView.tsx`: reference composition, full-width results, functional filter dialog, grid thumbnails/checkboxes, manufacturer links, status presentation, action menus and export safety.
- `src/index.css`: stylesheet import.
- `src/App.tsx`: catalog access remains available within the hero without a duplicate status band.
- `src/services/dataService.ts`: additional supported sorting types.
- `backend/apps/core/search_api.py`: read-only sorting mappings.
- `backend/tests/test_search.py`: stable server-side sorting regression coverage.
- `tests/server-search.spec.ts`: adapt interactions to the new filter dialog and catalog-access popover.

## API and Data Integrity

Reused `/api/v1/search/` for complete-dataset product search, facets, filters, pagination and CSV export, plus the existing catalog for KPI totals. Added stable server-side sort options for formulation type, classification and last updated; existing sort options remain available. No models, migrations, import behavior or permissions changed.

Publication state and recorded registration status remain separate. Spreadsheet registration references are explicitly described as unverified source claims. CAS and source concentrations are not inferred or rewritten. Actual source filenames are read from existing source metadata; full provenance remains available in tooltips and record details.

CSV export fetches all eligible matching pages, respects the current filter scope, rejects a changed access session, escapes quoted fields and guards against spreadsheet formula execution. No fabricated export formats were added.

## Actual HTTP Verification

An isolated browser on `http://localhost:3002/products` reused an existing local staff session without creating users or changing records. API responses were not mocked for this check. India and Syngenta filters returned 93 eligible listings, including the actual Amistar Top record. The next page was fetched successfully from Django. KPI values came from the real eligible catalog, not constants copied from the image.

Screenshots:

- `artifacts/product-intelligence-1648.png`
- `artifacts/product-intelligence-1672.png`
- `artifacts/product-intelligence-1536.png`
- `artifacts/product-intelligence-dark.png`

## Checks

- TypeScript: passed (`npm run lint`).
- Production build: passed.
- Backend search/catalog regression tests: 47 passed.
- Browser product and server-search tests: 12 passed.

Coverage includes filters and chips, sorting, pagination beyond page one, table/grid switching, bookmarks, comparison, Spec Sheet navigation, action menus, full-scope CSV export, stale-request cancellation, same-session refresh behavior, permission changes, network failures, retryable timeouts, dark mode and responsive geometry.

There is no separately configured ESLint check: the project's lint script runs TypeScript validation. Existing warnings remain for the large application bundle and Vite configuration's `__dirname` usage.

## Remaining Visual Differences

The laboratory/crop hero uses the existing project illustration with real HTML headings, count badge, tagline and Lucide scientific symbols; its greenhouse composition differs from the generated reference. Thumbnails are clearly marked generic scientific illustrations, not invented branded packaging or verified product photos. Genuine source-supplied images are supported when present.

No historical KPI series exists, so decorative flat color accents replace the reference's rising sparklines. They encode no trend or growth claim. Full, longer source values may increase row height. Existing functional navigation groups, settings and staff-access controls remain rather than reproducing nonfunctional sample elements. Exact pixel parity is therefore not claimed.

The reused agriculture asset was optimized with Pillow into a 229,740-byte hero and a 25,610-byte thumbnail. No new image-generation request or screenshot-as-background was used in this pass.
