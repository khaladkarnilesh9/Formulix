# Market & Analytics Visual Audit

## Scope

The workspace did not contain a Market & Analytics page. Following the user's
clarification, a new `/market-analytics` route was added. Existing dashboards,
backend models, API contracts, publication permissions, and calculations were
not changed. All new analytics are read-only aggregations of the shared catalog.

## Reference Comparison

Target viewport: 1536 x 1024, browser DPR 1, root font size 16px.
Reference measurements are approximate, not original design specifications.

| Surface | Reference | Implementation / Correction |
| --- | --- | --- |
| Sidebar | Approximately 240px | 240px expanded, 72px collapsed; scoped to this page |
| Sidebar menu | Tight groups, 40px navigation rows | 40px rows, compact headings, reference-positioned admin shortcut |
| Branding | Filled two-leaf mark, scientific tagline | Existing Lucide leaf retained; scientific tagline on this page |
| Banner | Approximately 136px high | 136px; 32px headline; no separate desktop header above it |
| Banner artwork | Fields, flask, molecular network, hexagon icons | Original greenhouse/flask image; no screenshot text baked into assets |
| Filters | Single horizontal row, compact labels and inputs | Six labeled filters, Apply and Reset; year control enabled only for recorded dates |
| KPI row | Six pastel tiles in an approximately 80px band | Six tiles in an 80px band; 46px icon circles, 20px counts |
| KPI growth | Green percentages and miniature trend bars | Percentages omitted; miniature bars show real snapshot distributions |
| Top charts | Three panels starting around y=303 | y=303; column ratio 1.08 : 1 : 1.08; 10px gaps; 234px row |
| Second row | Treemap, trends, heatmap | Same positions; 244px row; actual source relationships and dates |
| Bottom row | Wide Sankey and narrower ranking | 2.45 : 1 ratio; 208px row; four-stage flow with conserved totals |
| Colors | Blue / green / orange / violet / pink / gray | Stable category and formulation-code colors across matching charts |
| Surfaces | White panels, pale blue borders, light shadows | 8px radii, restrained shadows, light-blue canvas; dark theme preserved |
| Treemap | Nested company, category and formulation rectangles | D3 hierarchy and treemap, proportional to actual counts, complete hover labels |
| Heatmap | Ingredient-to-crop associations | Recorded crop or pest associations only; frequency is not measured usage |
| Map | Country boundaries and blue count bins | Local world-atlas geometry; keyboard/hover details and functional zoom |

## Deliberate Differences

- No fictional counts, growth percentages, approvals, company logos, or
  repository totals from the reference are inserted into application data.
- Treemap areas, Sankey widths, bar heights, map shades, ranking lengths, and
  heatmap intensities reflect real catalog counts; they cannot match sample
  reference values unless the underlying data matches.
- Recorded starts and expiry dates are plotted. A renewal series cannot be
  reproduced because the current catalog has no renewal-event field.
- Undated spreadsheet registration references produce a missing-dates state,
  not a fabricated historical curve. A year selection filters recorded approval years.
- Active records count exact source text, including mixtures. They are not
  presented as independently verified chemical registry identities.
- Regional market records are not distributed among countries without evidence.
- The banner and leaf mark are not pixel-identical to the generated reference.
- Search, theme, and catalog/staff-access controls remain available in the banner.

## Verification Artifacts

The Playwright analytics suite uses an isolated QA catalog to exercise every
chart type and capture populated screenshots; those QA records are not written
to Django or used by the running application.

Screenshots: `test-results-analytics-production/market-analytics-reference-af348-e-and-responsive-navigation/`.
Desktop captures: `market-analytics-1536x1024-light.png` and
`market-analytics-1536x1024-dark.png`. Responsive captures cover 360px, 390px,
and 768px. Tests check chart geometry, map/treemap/flow rendering, filtering,
zoom, theme, collapse, mobile More navigation, empty states, staff dialog access,
and conservation of Sankey listing totals.

The live localhost route was also captured at 1536 x 1024 in
`visual-audit/market-analytics-live-1536x1024.png`, using a fresh public session.
All eight panels rendered with no JavaScript errors or horizontal overflow.
