# Formulix Visual Fidelity Audit

## Scope and Reference Limits

The existing project and its original downloaded ZIP were inspected. The two
AI Studio/local reference screenshots were not supplied during the initial audit.
A Dashboard reference was subsequently supplied; the follow-up is recorded below.
Exact visual parity has not been established. Measurements below come from automated Chrome, not
the user's existing browser tab. Scientific content, data, routing, and business
logic were not changed.

## Rendering Environment

The Dashboard and Ingredient Explorer were captured at 1440 x 900 CSS pixels:

- `window.innerWidth`: 1440; `window.innerHeight`: 900.
- `window.devicePixelRatio`: 1; `visualViewport.scale`: 1.
- Computed root font size: 16px; default line height: 24px.
- Chrome's rendered-font API confirmed custom Plus Jakarta Sans for headings
  and navigation, and JetBrains Mono for scientific identifiers. A computed
  font-family list alone was not used as proof of font loading.
- Tailwind Preflight is active: body margin is 0 and box sizing is border-box.
- No app-wide CSS zoom or scale transform was found. The molecular viewer's
  SVG zoom and the drawer's translation animation are local controls.
- `#root` and the document are viewport-wide. There is no root max-width cap.
- Expanded desktop sidebar: 256px. Main workspace: x=256px, width=1184px.
- Main padding: 32px; inner content width: 1120px. These values were preserved.

Tailwind uses its standard rem-based media queries: `sm` 40rem (640px), `md`
48rem (768px), `lg` 64rem (1024px), `xl` 80rem (1280px), and `2xl` 96rem
(1536px), at standard browser settings. The compiled queries were inspected.
Breakpoint variables are not all emitted as runtime custom properties by
Tailwind; compiled media queries and the installed theme were checked instead.
Mobile CSS applies below 768px; the desktop sidebar starts at 1024px.

## Findings

The original archive and the local project use the same sidebar width (`16rem`),
header height (`4rem`), font families, and Tailwind dependency range. There was
no evidence of an accidental desktop sidebar increase to 330 CSS pixels.

The reported approximate 330/263 ratio is close to 1.25, but it does not prove
which browser setting differs. A settled 20px root-font experiment produced a
320px sidebar and 80px header. A separate DPR=1.25 experiment retained the
256px CSS sidebar, which corresponds to 320 physical pixels. DPR can reflect
both display density and page zoom, so it is not a standalone zoom reading.
See [MDN's devicePixelRatio explanation](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio).

The confirmed header defect was flex shrinking: the Admin Portal label wrapped
to two lines, making its button taller. Controls competed with a wide search
trigger and the demo notice, truncating the Dashboard title. Sidebar width and
workspace offset were also specified independently, although they agreed at
the measured viewport.

## Targeted Changes

| Measurement, Dashboard at 1440 x 900 | Before | After |
| --- | --- | --- |
| Root font size | 16px | 16px |
| Expanded sidebar | 256px | 256px |
| Header height | 64px | 64px |
| Search trigger width | 245.06px | 216px |
| Admin Portal button height | 44px | 32px |
| Admin Portal label height | 32px, two lines | 16px, one line |
| Header action gap | 12px | 8px |
| Header title font size | 16px | 16px |
| Main padding | 32px | 32px |
| First KPI card padding / radius | 16px / 12px | 16px / 12px |

Shared rem-based tokens now control sidebar width, collapsed width, workspace
offset, header height, and control height. Controls have stable dimensions and
the Admin Portal label does not wrap. Theme and Admin labels use compact icon
forms on narrower tablet layouts, retaining their tooltips and actions. The
demo notice uses its existing information icon with the full text in its title
and accessible name, showing the full inline label at wide desktop sizes.
Mobile 44px controls, the drawer, and exactly five bottom tabs are preserved.

No global font-size override, zoom hack, transform scaling, or blanket reduction
of page padding, card gaps, scientific typography, or border radius was added.

## Files Modified

- `src/index.css`: shared layout tokens and header density rules.
- `src/App.tsx`: public shell width/offset use the shared token.
- `src/components/layout/Sidebar.tsx`: shared sidebar width.
- `src/components/layout/Header.tsx`: stable controls and responsive labels.
- `src/features/admin/layout/AdminLayout.tsx`: shared admin shell width/offset.
- `src/features/admin/layout/AdminSidebar.tsx`: shared sidebar width.
- `src/features/admin/layout/AdminHeader.tsx`: matching control proportions.
- `tests/visual-fidelity.spec.ts`: diagnostics, screenshots, and layout checks.
- `.gitignore`: generated visual-audit artifacts.
- This report.

## Verification and Artifacts

Seven targeted browser checks passed. All ten requested primary pages were
checked at 360, 390, 768, 1366, and 1440px: Dashboard, Products, Formulations,
Ingredients, Comparison, Manufacturers, Brands, Regulatory, Patents, and Admin.
There was no page-level horizontal overflow. Public/admin sidebar collapse
measured 72px with a matching main offset, restoring to 256px. At 360px, drawer
and inner sidebar both measured 306px; keyboard closing remained functional.

Before/after screenshots and detailed JSON measurements are in
`visual-audit/before/` and `visual-audit/after/`. Both Dashboard and Ingredient
Explorer screenshots use a 1440 x 900 viewport. The final scaling experiments
wait for layout transitions to settle; the early baseline scaling snapshots
can include transition frames and are not used for the comparison table.

Four original mobile interaction/admin form checks passed, along with the
project's TypeScript check (`npm run lint`) and production build. The build retains its existing
Vite native-config and large-chunk warnings, unrelated to layout fidelity.

To reproduce the targeted checks with the existing preview on port 3002:

```sh
npx playwright test tests/visual-fidelity.spec.ts --workers=1
```

## Remaining Differences

The user's browser zoom, font preferences, OS display scaling, and AI Studio
iframe viewport are not directly observable from this automated browser.
Compare both tabs at 100% browser zoom and the same CSS viewport before using
screenshot pixel widths to choose CSS values. The supplied Dashboard reference
can now be compared visually; other reference pages have not been supplied.
No exact pixel-parity claim is made.

## Supplied Dashboard Reference Follow-up

The supplied image is 1920 pixels wide, with the application beginning below
the browser and AI Studio toolbar. The roughly 306-image-pixel sidebar and
77-image-pixel header are consistent with the existing 256 CSS-pixel sidebar
and 64 CSS-pixel header at approximately 1.2x effective rendering scale.
This is an inference from multiple dimensions, not a confirmed browser zoom
setting. The reference is scrolled to the country coverage/table section.

A comparison capture used a 1600 x 692 CSS viewport, DPR 1.2, loaded original
fonts, and a stable scrollbar gutter to approximate the reference environment.
The sidebar, country panel, table columns, footer, and activity section already
aligned closely. The remaining shared-layout difference was the wide header.

At Tailwind's wide-desktop breakpoint (1536px and above), the public header now
uses the original 16rem search width, 0.75rem action gaps, and original icon,
theme, notice, and button padding. Admin Portal remains on one line. Smaller
desktop/tablet density rules and mobile controls are preserved. Application
code does not use the capture's DPR simulation or scrollbar-gutter override.

The local application capture is
`visual-audit/reference/dashboard-reference.png`, with computed measurements in
`visual-audit/reference/measurements.json`. The new reproducible check is
`tests/ai-studio-reference.spec.ts`. Browser chrome, Windows taskbar, and AI
Studio's hosting toolbar are outside this React application and were not added.
Selection-dependent comparison badges may differ from the reference; saved
items and comparison state were not changed to force a screenshot match.

Seven follow-up browser checks passed, covering the reference proportions,
all ten primary pages at 360/390/768/1366/1440px, and sidebar collapse/drawer
dimensions. TypeScript and the production build also passed.

## Full-width Pages and Larger Navigation

Following the supplied Product Search reference and the request for wider pages,
the remaining centered width caps were removed from 28 public/admin page views,
including both settings pages and the product wizard. Dashboard was already
full-width, and the acquisition pipeline did not have a page width cap. Shared
outer padding remains 16px on desktop/tablet, with mobile safe-area spacing.
Dialog sizes and short empty-state messages retain their own width constraints.

Public and admin sidebar menu labels increased from 12px to 14px; section
headings are 12px. Tooltips expose complete labels when space is limited.
Routing, scientific content, and saved/comparison state remain unchanged.
Product Search captures are in `visual-audit/reference/products-1600.png` and
`visual-audit/reference/products-1920.png`. Layout checks now verify that page
content fills the available inner width, including at 1920px.
