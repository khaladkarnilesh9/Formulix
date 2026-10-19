# Formulix Django Backend

The React frontend stays at the repository root. This backend is separate from RxnDB.

## Windows Development

From the project root:

```powershell
cd backend
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements\development.txt
python manage.py migrate
python manage.py setup_roles
python manage.py createsuperuser
python manage.py runserver 127.0.0.1:8001
```

SQLite is used when DATABASE_URL is empty. Production requires PostgreSQL, an environment secret,
explicit allowed hosts/origins, HTTPS, and config.settings.production. Never serve private_media
directly through a web server.

## Administration

Open http://127.0.0.1:8001/django-admin/ (or the /admin/ redirect).
All Formulix business models and the custom user are registered. Primary editors include
composition, manufacturing steps, properties, QC, packaging, source and relationship inlines.
Reference data can be created through its own sections and related-object selectors.

Publication actions follow Draft -> In Review -> Approved -> Published.
Publish ingredients/manufacturers/brands/formulations needed by a product before publishing that product.
Published records and their scientific children become read-only. Return the owning record to Draft
to edit it; publish again only after approval. Published records cannot be mass-deleted.
Source verification is a separate human-managed classification, not a consequence of publication.
Raw React payloads remain read-only to preserve the original source.

Audit events and import history rows are system-managed and read-only.

## Market Formulation Workbooks

Open Django Admin > Formulations > Upload Excel. Choose an explicit market and upload one of
the 17-column .xlsx workbooks. Preview checks all compatible sheets and removes exact duplicate
rows; confirmation creates unverified drafts and an auditable import batch with original values.
Reuploading the same workbook is idempotent. Errors are retained in import history.
Ranges, units, mixtures, CAS mentions, registration numbers, patent references and hazard labels
remain source text, not automatically verified scientific entities or inferred numeric values.
The original spreadsheet row is preserved in legacy_payload. Source file/sheet/row are recorded.
Operators need add permissions for formulation, import batch and import row, plus staff access.
Review, approve and publish through the existing formulation actions to expose records publicly.

All public React catalogs use /api/v1/catalog/, not the local demonstration repository.
Products without a separate commercial record are displayed as formulation listings, linked by
stable IDs to their formulation. Spreadsheet registration numbers appear as unverified references;
neither listing creates a new scientific database entity or official approval. Company names are
source-reported; location, incorporation year, role and certifications are not inferred.
Dashboard totals distinguish catalog listings/references from physical database table counts.
Ingredient Explorer has an Active Ingredient Records tab for exact source text from visible product
and formulation listings. Searches match active names within mixtures, retaining concentrations.
Matching source records link to brands/formulations and retain the same public/staff visibility.
The Chemical Registry tab is separate: source text never fabricates CAS, SMILES, molecular weights,
or a registry entry. No mixture splitting or scientific identity assignment is performed.
The snapshot includes publication status counts for the records the current user may view.

Anonymous users see Published data only. Authorized staff also see permitted unpublished records
in a clearly labeled staff preview. Click Staff Sign In or View Uploaded Drafts inside React.
Use the existing Django staff credentials; the catalog reloads immediately after sign-in.
The /api/v1/session/ endpoint enforces CSRF on login/logout and rate-limits login attempts.
Passwords are not stored in the client repository. Sign-out removes the private catalog from memory.
This works through the same-origin Vite proxy, including session/CSRF handling.
An existing login on 127.0.0.1:8001 may not authenticate a frontend opened at localhost
because cookie hosts differ.
hosts differ. Private drafts are never made public just by visiting React.

The client refreshes every minute, on window focus, or through the refresh control. API records
are not copied into localStorage. Known demo catalog rows and demo workspace selections are
removed from the browser's existing local cache; custom records, notes and theme are preserved.
New local repositories start empty. Legacy local React admin editors remain separate from Django;
the primary Admin Portal buttons now open the actual Django Admin.
Vite proxies /api, /django-admin and /static to 127.0.0.1:8001 by default. Set
FORMULIX_BACKEND_URL to override the proxy target, then restart Vite after configuration changes.
For deployment set VITE_API_BASE_URL to the backend API base (including /api/v1), or configure
a same-origin reverse proxy including the admin login and static assets.

Workspace administration is owner-scoped for non-superusers. Superusers have privileged administrative
access. Staff must have appropriate model permissions to see sections. setup_roles creates groups only:
assign them to users explicitly and enable staff status for authorized Django Admin operators.
Existing group permissions are preserved unless setup_roles --reset-existing is explicitly requested.

## APIs

- /api/v1/ : API browser and the existing catalog resources.
- /api/v1/dashboard/summary/ : published record counts.
- /api/v1/catalog/ : shared React catalog, linked formulation listings and staff preview.
- /api/docs/ and /api/redoc/ : API documentation.
- /api/v1/<resource>/<identifier>/transition/ : controlled publication changes.
- /api/v1/documents/<identifier>/download/ : permission-checked stored files.

Each catalog editor includes an API record link after saving. Public catalog endpoints show
Published records only. Django Admin session authentication permits authorized catalog operations.
Documents require validated PDF, DOCX or XML uploads; restricted files are not public media.

Dedicated workspace/auth APIs, complete nested write contracts, other spreadsheet formats and
migration of legacy local React admin editing workflows remain unfinished.
No existing browser data has been deleted or automatically migrated.

## Checks

```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test
```
