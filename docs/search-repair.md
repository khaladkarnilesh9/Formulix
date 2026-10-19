# Search Repair And Field Audit

## Read-Only Diagnosis

The active development database is SQLite (`backend/db.sqlite3`). Axial Pro 150 exists once as formulation `bcde1de3-a7d1-4262-9e38-1ac59ffc0344`, imported from `european_market_formulations.xlsx / Master Database / row 238`. Its source manufacturer is Syngenta, type EC, market Europe, and active text `5.0% Pinoxaden`. It is Draft / Unverified, with no normalized composition rows. Public exclusion is intentional. Authorized staff catalog access returns its formulation listing.

The database initially contained 3,071 Draft formulations, with no stored commercial products, brands, manufacturers or ingredients. Frontend product listings are projections of those formulations, not additional database products. The old `/products/` CRUD list searched only stored commercial products, whereas React searched the full snapshot using inconsistent whole-phrase predicates. Hyphens, repeated spaces, AND ingredient queries, carrier CAS numbers, classifications and formulation types were missed. This was not a first-page-only bug in the existing snapshot.

The European workbook read-only preview found 1,023 unique rows and skipped 1,023 exact repeated manufacturer-sheet rows. All 1,023 keys already existed. Existing fingerprints, import records, publication states and source values were not changed or reimported. New previews prefer Master Database provenance even if a manufacturer sheet appears first; manufacturer-only unique rows are retained.

## Search Contract

`GET /api/v1/search/?group=products&q=Axial-Pro%20150&page=1&page_size=8`

Returns `count`, `next`, `previous`, `results`, `page`, `page_size` and optional `matchMode`. Omit `group` for independently paginated groups. Available groups: products, formulations, ingredients, activeIngredients, manufacturers, brands, regulatory, patents, patentReferences, documents. Group totals refer to their respective entities/source listings; do not add them to compute unique product analytics.

The existing CRUD endpoints remain available. They use the shared database predicate but continue to represent their own stored models. The search endpoint additionally returns explicitly labelled source projections. Source company/brand/active/patent-reference results are not normalized or verified entities.

Search is AND across query tokens, OR across searchable fields, AND across independent filters. Pipe-separated filter values support OR selections. Formulation abbreviation filters match stored type text and controlled type names/codes. CAS queries use complete identifier boundaries and never fuzzy matching. `identifier=true` requests exact SMILES/InChI/InChIKey matching for the ingredient group. Query limits are 300 characters and 20 tokens; page sizes are 1-100. Rank favors exact names, then prefixes, partial names and other fields. Stored ingredient synonyms are searched without inventing aliases.

`fuzzy=true` explicitly enables bounded spelling suggestions only if standard matching returns no results. Suggestions are labelled `matchMode=fuzzy`, require one alphabetic token of at least seven characters, inspect at most 200 prefix candidates, and require similarity >= 0.88. They are not chemical equivalences and cannot cover every misspelling.

Drafts require both staff status and the relevant model view permission. Public and non-staff users see only Published records. Related entity matches independently respect their visibility. Linked eligible commercial products suppress duplicate formulation projections; hidden links do not suppress public formulations. Database IDs are preserved, including legacy public IDs. Equal names alone do not merge distinct stored records.

React search uses a 300 ms debounce, AbortController, response-key checks, typed pagination parsing, explicit loading/error states, retry and page reset on filter changes. A bounded record cache enables opening newly found dossiers; catalog/session changes clear it and invalidate in-flight results. Product and regulatory exports walk all matching API pages instead of exporting just the visible page.

## Excel Field Mapping

All rows map to `formulations.Formulation`. All 17 columns are exposed without rewriting through the serializer's `marketData` dictionary, searchable from their model fields, and displayed in formulation source metadata. Relevant projections also expose the following aliases.

| Excel Column | Django Field | Additional API / React Representation |
| --- | --- | --- |
| Company Name | company_name | product.manufacturerName; source company |
| Product Name / Brand Name | formulation_name | formulation.name; product.brandName; source brand |
| Product Classification | product_classification | marketData classification; analytics classification |
| Formulation Type | formulation_type_text | formulation.formulationType; product.formulationType |
| Active Ingredient & % (w/w) | active_ingredient_text | product.activeIngredient/strength; source ingredient text |
| Dispersing / Wetting Agent & CAS No. | dispersing_agent_text | exact marketData text; searchable CAS |
| Carrier / Solvent Matrix & CAS No. | carrier_solvent_text | exact marketData text; searchable CAS |
| Functional Excipients & CAS No. | functional_excipients_text | exact marketData text; searchable CAS |
| Density / Specific Gravity (g/mL) | density_text | formulation.properties.density; product.specs.density |
| pH Range | ph_range_text | formulation.properties.ph; product.specs.ph |
| EPA / CIBRC Registration No. | registration_number_text | product.registrationNumber; unverified regulatory reference |
| Flash Point Range (degrees C) | flash_point_text | product.specs.flashPoint; marketData original header |
| Viscosity Profile (mPa*s / cP) | viscosity_text | formulation.properties.viscosity; product.specs.viscosity |
| WHO Hazard Classification | who_hazard_classification | exact marketData text |
| CIBRC Toxicity Color Band | toxicity_color_band | exact marketData text |
| Patent Reference | patent_reference_text | source patent reference, separate from stored patents |
| Pest Control / Target Diseases | target_pests_text | formulation.intendedApplication; product.indicationsOrPests |

Existing optional composition relations remain distinct: ingredient, role/function, concentration, unit and source evidence. Imported combined text is not destructively parsed or automatically assigned a chemical identity. Raw values and units retain their original meaning. Metadata references are not claims of official approval.

## Diagnostics

```powershell
python manage.py diagnose_search --query "Axial Pro 150"
python manage.py diagnose_search --query "Axial Pro 150" --username admin
python manage.py diagnose_search --query "Azoxystrobin Difenoconazole"
python manage.py diagnose_search --query "7732-18-5"
```

The command is read-only and reuses the production search predicate. It reports model, identity, fields, status, source provenance and selected-user eligibility. It does not publish records or expose passwords/session values.

## Limits And Remaining Work

`core.SearchDocument` is a derived, per-entity search index. Migration `core.0005_searchdocument` adds only its table; no scientific schema or source row is altered. Precomputed normalized text supports Unicode matching without expensive per-keystroke source normalization. Save/delete signals synchronize entities, source composition, synonyms, identifiers and controlled taxonomy labels. Index changes participate in import transactions. Newly committed eligible records are immediately discoverable; React refreshes on catalog changes, focus and a minute interval. Bulk-created records missing an index document use a correctness fallback. Bulk updates/fixture loads bypassing Django save signals require reindexing.

```powershell
python manage.py migrate
python manage.py reindex_search
```

The reindex command atomically rebuilds derived documents only and removes orphan index entries. It was run locally for all 3,071 existing formulations. It does not delete, publish or modify scientific entities. Search applies current source-model permissions and publication state, not index visibility claims. SQLite fallback/ranking uses a deterministic connection-local normalization function; PostgreSQL uses compatible SQL normalization. Deployment-specific PostgreSQL behavior still needs testing.

Local read-only API timings after indexing and query construction improvements were approximately 0.31-0.69 seconds for individual tested groups and 2.52 seconds for a grouped Axial query, against 3,071 formulations. These are in-process development measurements, not network or 100,000-record benchmarks.

Search results and product filter facets are database-filtered. The legacy whole-catalog endpoint is deliberately retained for existing dashboard/analytics calculations, some secondary-page options, saved record hydration and admin workflows. The shared shell still loads that snapshot. Removing it completely requires a separate server-side aggregate/detail migration; this pass does not claim browser memory or query performance is production-ready at 100,000 records. SQLite substring searches can scan derived documents, despite bounded responses. PostgreSQL trigram indexes would need workload-specific measurement. Facet option lists are capped at 1,000 distinct values per model field; records remain searchable even if their facet falls outside that list.

Source-brand cards currently include at most 100 related variants; all variants remain individually discoverable through product search. Source brand/company case variants are not silently reconciled. Exact spreadsheet fingerprints deduplicate repeated sheets, but formatting-different or conflicting rows require review rather than destructive automatic merging.

Saved notes and staged admin records retain their existing local-workspace behavior; these have not been converted into backend search entities. No scientific-record deletion, bulk publication, fabricated relationship, chart calculation or routing rewrite was performed. Only the derived search-index schema was added.
