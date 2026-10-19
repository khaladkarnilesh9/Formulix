# Manufacturer Directory Reference Implementation

Target: http://localhost:3002/manufacturers

Reference: `data table formulation/Formulix Manufacturer Directory Dashboard.png` (1672 x 941); requested primary viewport: 1648 x 928.

## Implementation

- Shared sidebar/header retained; scoped navy styling and selected Manufacturer Directory navigation.
- Dedicated existing industrial facility photograph, real HTML heading, country/industry controls and science icons.
- 40/60 master-detail split, compact company cards, logo tiles, profile header, five metrics, classification strip and five functional tabs.
- Complete server-side company search, reviewed aliases, industry/country filters, alphabetical pagination and source-ID hydration.
- Manufacturer selection persists in the URL and restores on refresh, including source IDs without a name hint.
- Existing bookmarks and product dossiers preserved. Brand details open Brand Intelligence; registry identities and recorded regulatory source links are available where supplied.
- Lazy tab requests use existing cancellable search hooks and staff/public eligibility rules. Scientific mixtures remain original source text.

## Backend And Data Integrity

New `manufacturerProfile` and `manufacturerRecords` groups reuse `/api/v1/search/`. The manufacturer directory combines stored companies and distinct source company names, sorted globally. Only explicit stored relationships and reviewed exact names/aliases contribute to company dossiers; there is no fuzzy company merging.

Indexed products count eligible stored products plus eligible formulation projections without another eligible product. Declared portfolio is the actual stored `declared_product_count`, not a copy of the indexed count. Unknown headquarters, country, founding year, company role, website, description or compliance claims remain missing.

The local database has 15 source-reported company labels and no canonical Manufacturer records. Adama has 279 indexed formulations, Albaugh 186, BASF 279, Bayer 279, Biostadt 93 and Corteva 280. Source companies have no recorded declared portfolio size or independently verified headquarters/classification. `Sumitomo` and `Sumitomo Chemical` remain separate source names.

Formulation and regulatory Inspect actions retain an eligible genuine product ID when a linked product exists. Formulation rows preserve server alphabetical order after serialization. Drafts remain restricted to authorized staff; no source records or publication states were changed or deleted.

## Logo Management

Migration `manufacturers.0002_company_logos` adds an image upload, source URL/type, review flag, attribution and reviewed aliases. It was applied locally and passes the migration drift check. Pillow was added to the backend requirements.

In Django Admin, Manufacturers supports upload, replacement/removal, preview and provenance. Replacement resets logo review unless explicitly reviewed. Existing publication editing safeguards remain in effect; return published records to Draft before editing. Review permissions are required to approve logos.

Uploads accept PNG, JPEG and WebP, at most 2 MB and 4096 pixels per dimension. Contents are validated, not only extensions. SVG uploads and disguised/non-image files are rejected. Uploaded logos stay in the existing private media storage and are served through `/api/v1/manufacturers/{id}/logo/` with eligibility checks and `nosniff`; unreviewed logos are not public. No public access to private document media was enabled.

There is no unrestricted server URL fetcher. Source URL fields are provenance only. Optional developer download scripts use a fixed reviewed asset list.

Resolved, source-attributed logos:

- Albaugh: [official corporate website](https://www.albaugh.com/), original green wordmark SVG.
- Biostadt: [official corporate website](https://www.biostadt.com/), original corporate PNG.
- Corteva: [official media kit](https://engage.corteva.com/media), original corporate PNG.

These local assets are used only for exact reviewed labels, never similar names. They do not verify imported company identities. Company trademarks are retained; source availability is not a blanket license grant. Deployment owners should review applicable brand-use terms.

Still needing an appropriate uploaded/reviewed logo: Adama, BASF, Bayer, FMC, Gowan, Insecticides India Ltd, Nufarm, PI Industries, Sumitomo, Sumitomo Chemical, Syngenta and UPL. Neutral factory icons replace missing or failed assets; no fake logos were generated.

For a source-only company, an authorized curator can add its reviewed canonical Manufacturer identity in Django Admin with the exact company name, upload its logo and provenance, and follow the existing publication workflow. No such records were invented during implementation.

## Measurements And Screenshots

| Viewport | Sidebar | Header | Hero | Directory/Profile | List Card | Logo/Profile Logo |
| --- | --- | --- | --- | --- | --- | --- |
| 1648 x 928 | 248.84px | 68px | 204px | 559.66 / 839.50px | 86px | 54 / 78px |
| 1672 x 941 | 252.47px | 68px | 204px | 567.81 / 851.72px | 86px | 54 / 78px |
| 1536 x 1024 | 231.92px | 68px | 204px | 521.63 / 782.45px | 86px | 54 / 78px |

Screenshots captured and inspected: `artifacts/manufacturer-reference-1648.png`, `manufacturer-reference-1672.png`, `manufacturer-reference-1536.png` and `manufacturer-reference-dark.png`. Mobile/tablet screenshots are in Playwright test results. No horizontal overflow at 360, 390, 768, 1366, 1440, 1536, 1648 or 1672px. Mobile stacks the scrollable directory above the profile; the shared drawer and five-item bottom navigation are retained.

## Files

- `src/features/manufacturers/ManufacturerReferenceView.tsx`, `ManufacturerDirectoryView.tsx`, `companyLogoSources.ts`
- `src/styles/manufacturer-directory.css`, `src/index.css`, `src/types/index.ts`, `src/App.tsx`
- `public/assets/company-logos/albaugh.svg`, `biostadt.png`, `corteva.png`
- `backend/apps/core/manufacturer_search.py`, `search_api.py`, `contracts.py`, `serializers.py`, `views.py`, `admin.py`
- `backend/apps/manufacturers/models.py`, `validators.py`, `admin_support.py`, `migrations/0002_company_logos.py`
- `backend/config/urls.py`, `backend/requirements/base.in`
- `backend/tests/test_manufacturer_directory.py`, `tests/manufacturer-reference.spec.ts`
- `scripts/inspect-manufacturer-logos.py`, `download-reviewed-company-logos.py`

## Verification

- TypeScript: passed (`npm run lint` runs `tsc --noEmit`; no separate ESLint configuration is available).
- Production build: passed. Existing large JavaScript bundle and Vite `__dirname` warnings remain.
- Django system check: passed. Migration drift check: no changes detected.
- Full Django suite: 91 tests passed. Final focused manufacturer tests also passed after the genuine-ID correction.
- Combined Manufacturer Directory and Brand Intelligence browser regression: 7 tests passed. Final Manufacturer Directory browser suite: 3 tests passed after visual refinements.
- Tests cover company filters/aliases, public/staff visibility, distinct declared/indexed metrics, URL restoration, source mixtures, table pagination, all tabs, bookmarks, corporate links, logo format/size/review/private access, rendered official assets, failed-image fallbacks, responsive layouts and dark mode.

## Remaining Visual Differences

- The industrial photograph and icon arrangement are not the exact reference composition.
- Only three official assets were successfully resolved; missing companies show neutral icons.
- Missing descriptions, roles, websites, declared portfolios and verified headquarters are not invented to match illustrative text. Corporate Site is disabled when no website is recorded.
- Original uploaded rows and truthful source evidence determine the table content, record counts and status labels.
- Existing Formulix logo, account controls, Settings navigation and staff-access menu remain. Card corners follow the application's 8px convention. Exact pixel parity is not claimed.
