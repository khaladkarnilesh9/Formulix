from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.test import TestCase
from django.core.management import call_command
from django.db import transaction
from io import StringIO
from apps.core.models import SearchDocument

from apps.formulations.models import Formulation, FormulationIngredient
from apps.ingredients.models import Ingredient, IngredientSynonym
from apps.products.models import CommercialProduct
from apps.taxonomy.models import IndustrySector
from apps.patents.models import Patent
from apps.brands.models import Brand
from apps.manufacturers.models import Manufacturer


class SearchTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = get_user_model().objects.create_superuser(username="search-admin", password=None)
        cls.staff = get_user_model().objects.create_user(username="limited-staff", password=None, is_staff=True)
        cls.regular = get_user_model().objects.create_user(username="regular", password=None)
        cls.regular.user_permissions.add(Permission.objects.get(codename="view_formulation"))
        cls.sector = IndustrySector.objects.create(name="Agrochemical", slug="agrochemical-search")
        cls.axial = Formulation.objects.create(formulation_name="Axial Pro 150", company_name="Syngenta",
            market_region="Europe", product_classification="Herbicide", formulation_type_text="EC",
            active_ingredient_text="5.0% Pinoxaden", carrier_solvent_text="Water (CAS 7732-18-5)",
            registration_number_text="EU REG-150", industry_sector=cls.sector, source_reference="QA Master Database / row 238")
        cls.mixture = Formulation.objects.create(formulation_name="Amistar Top", company_name="Syngenta",
            market_region="India", product_classification="Fungicide", formulation_type_text="SC",
            active_ingredient_text="18.2% Azoxystrobin + 11.4% Difenoconazole", industry_sector=cls.sector,
            publication_status="Published")

    def search(self, query="", group="products", **params):
        response = self.client.get("/api/v1/search/", {"q": query, "group": group, **params})
        self.assertEqual(response.status_code, 200, response.content[:300])
        return response.json()

    def login(self):
        self.client.force_login(self.admin)

    def test_axial_exact_partial_case_hyphen_spacing_unicode(self):
        self.login()
        for query in ("Axial Pro 150", "Axial", "AXIAL PRO 150", "Axial-Pro 150", "Axial  Pro 150", "Axial\u2011Pro 150", "\uff21xial Pro 150"):
            with self.subTest(query=query):
                data = self.search(query)
                self.assertEqual(data["count"], 1)
                self.assertEqual(data["results"][0]["formulationId"], str(self.axial.pk))

    def test_public_drafts_and_archives_excluded(self):
        self.assertEqual(self.search("Axial")["count"], 0)
        self.mixture.publication_status = "Archived"
        self.mixture.save()
        self.assertEqual(self.search("Amistar")["count"], 0)

    def test_staff_requires_model_permission(self):
        self.client.force_login(self.staff)
        self.assertEqual(self.search("Axial")["count"], 0)
        self.staff.user_permissions.add(Permission.objects.get(codename="view_formulation"))
        self.assertEqual(self.search("Axial")["count"], 1)

    def test_regular_user_view_permission_does_not_enable_preview(self):
        self.client.force_login(self.regular)
        self.assertEqual(self.search("Axial")["count"], 0)

    def test_single_and_multi_active_search(self):
        for query in ("Azoxy", "Azoxystrobin", "Difenoconazole", "Azoxystrobin Difenoconazole"):
            self.assertEqual(self.search(query)["count"], 1)
        self.assertEqual(self.search("Azoxystrobin Pinoxaden")["count"], 0)

    def test_cas_exact_boundaries_and_no_fuzzy_identifiers(self):
        self.login()
        self.assertEqual(self.search("7732-18-5")["count"], 1)
        self.assertEqual(self.search("7732-18-6", fuzzy="true")["count"], 0)
        Formulation.objects.create(formulation_name="Wrong CAS", carrier_solvent_text="17732-18-5", publication_status="Published")
        self.assertEqual(self.search("7732-18-5")["count"], 1)

    def test_type_classification_manufacturer_registration_search(self):
        self.login()
        for query in ("EC", "Herbicide", "Pinoxaden", "EU REG-150"):
            self.assertEqual(self.search(query)["count"], 1)
        self.assertEqual(self.search("Syngenta")["count"], 2)

    def test_independent_filters_and_multi_select(self):
        self.login()
        self.assertEqual(self.search("Syngenta", formulationType="SC", category="Agrochemical", country="India", manufacturer="Syngenta")["count"], 1)
        self.assertEqual(self.search("Syngenta", classification="Herbicide", country="India")["count"], 0)
        self.assertEqual(self.search("Syngenta", country="India|Europe")["count"], 2)

    def test_product_presentation_sorts_are_stable_and_server_side(self):
        self.login()
        for field in ('type', 'classification', 'updated'):
            for order in ('asc', 'desc'):
                with self.subTest(field=field, order=order):
                    first=self.search('', sortBy=field, sortOrder=order, page_size=1)
                    second=self.search('', sortBy=field, sortOrder=order, page_size=1, page=2)
                    self.assertEqual(first['count'], 2)
                    self.assertNotEqual(first['results'][0]['id'], second['results'][0]['id'])
                    self.assertEqual(first['results'][0]['id'], self.search('', sortBy=field, sortOrder=order, page_size=1)['results'][0]['id'])

    def test_pagination_searches_beyond_first_page_and_counts(self):
        self.login()
        Formulation.objects.bulk_create([Formulation(formulation_name=f"AA filler {index:03d}") for index in range(65)])
        result = self.search("", page_size=10)
        self.assertEqual(result["count"], 67)
        self.assertEqual(len(result["results"]), 10)
        self.assertIsNotNone(result["next"])
        self.assertEqual(self.search("Axial")["count"], 1)
        ids = []
        for page in range(1, 8):
            ids.extend(row["id"] for row in self.search("", page_size=10, page=page)["results"])
        self.assertEqual(len(set(ids)), 67)

    def test_duplicate_names_preserve_database_identity(self):
        self.login()
        Formulation.objects.create(formulation_name="Axial Pro 150", company_name="Different company")
        rows = self.search("Axial Pro 150")["results"]
        self.assertEqual(len(rows), 2)
        self.assertNotEqual(rows[0]["id"], rows[1]["id"])

    def test_visible_linked_product_prevents_duplicate_projection(self):
        self.login()
        product = CommercialProduct.objects.create(product_name="Axial Pro 150", formulation=self.axial)
        result = self.search("Pinoxaden")
        self.assertEqual(result["count"], 1)
        self.assertEqual(result["results"][0]["id"], str(product.pk))

    def test_hidden_link_does_not_hide_public_formulation_listing(self):
        CommercialProduct.objects.create(product_name="Hidden product", formulation=self.mixture)
        self.assertEqual(self.search("Amistar")["count"], 1)

    def test_hidden_related_entity_cannot_affect_public_search(self):
        secret = Ingredient.objects.create(preferred_name="Confidential chemical")
        FormulationIngredient.objects.create(formulation=self.mixture, ingredient=secret)
        self.assertEqual(self.search("Confidential")["count"], 0)

    def test_normalized_relationship_and_stored_synonym(self):
        chemical = Ingredient.objects.create(preferred_name="Azoxystrobin", publication_status="Published")
        IngredientSynonym.objects.create(ingredient=chemical, synonym="Stored QA alias")
        FormulationIngredient.objects.create(formulation=self.mixture, ingredient=chemical)
        self.assertEqual(self.search("Stored QA alias", "ingredients")["count"], 1)
        self.assertEqual(self.search("Stored QA alias", "products")["count"], 1)
        self.assertEqual(self.search("Amistar", "ingredients")["count"], 1)

    def test_structure_identifiers_are_exact(self):
        Ingredient.objects.create(preferred_name="QA molecule", canonical_smiles="CC(=O)O", publication_status="Published")
        self.assertEqual(self.search("CC(=O)O", "ingredients", identifier="true")["count"], 1)
        self.assertEqual(self.search("CC(=O)", "ingredients", identifier="true")["count"], 0)

    def test_sources_remain_text_without_creating_chemical_entities(self):
        result = self.search("Azoxystrobin Difenoconazole", "activeIngredients")
        self.assertEqual(result["count"], 1)
        self.assertEqual(result["results"][0]["sourceText"], self.mixture.active_ingredient_text)
        self.assertEqual(Ingredient.objects.count(), 0)

    def test_source_metadata_filters_sort_and_exact_deep_link(self):
        self.login()
        source = self.axial.active_ingredient_text
        result = self.search('', 'activeIngredients', sourceExact=source)
        self.assertEqual(result['count'], 1)
        self.assertEqual(result['results'][0]['categories'], ['Agrochemical'])
        self.assertEqual(result['results'][0]['markets'], ['Europe'])
        self.assertNotIn('casNumber', result['results'][0])
        self.assertEqual(self.search('', 'activeIngredients', verificationStatus='Verified')['count'], 0)
        self.assertEqual(self.search('', 'activeIngredients', market='India', country='India')['count'], 1)
        descending = self.search('', 'activeIngredients', sortBy='-name')['results']
        self.assertEqual([row['sourceText'] for row in descending], sorted([source, self.mixture.active_ingredient_text], reverse=True))
        self.axial.verification_status = 'Verified'
        self.axial.source_title = 'QA source'
        self.axial.save()
        self.assertEqual(self.search('', 'activeIngredients', sourceExact=source, verificationStatus='Unverified')['count'], 1)

    def test_registry_identity_metadata_and_permission_safe_linked_pagination(self):
        chemical = Ingredient.objects.create(preferred_name='QA chemical', cas_number='21087-64-9',
            industry_sector=self.sector, publication_status='Published', verification_status='Verified', source_title='QA reference')
        IngredientSynonym.objects.create(ingredient=chemical, synonym='QA synonym')
        FormulationIngredient.objects.create(formulation=self.mixture, ingredient=chemical)
        FormulationIngredient.objects.create(formulation=self.axial, ingredient=chemical)
        # A product may inherit the normalized relationship from its formulation.
        CommercialProduct.objects.create(product_name='Linked listing', formulation=self.mixture, publication_status='Published')
        result = self.search('QA synonym', 'ingredients', verificationStatus='Verified')
        self.assertEqual(result['count'], 1)
        self.assertEqual(result['results'][0]['synonyms'], ['QA synonym'])
        self.assertEqual(result['results'][0]['linkedListingCount'], 1)
        self.assertEqual(self.search('', ingredientId=chemical.public_id)['count'], 1)
        self.assertEqual(self.search('', ingredientId='unknown')['count'], 0)
        self.assertEqual(self.search('', 'ingredients', market='Europe')['count'], 0)
        self.assertEqual(self.search('21087-64-9', 'ingredients')['count'], 1)
        self.login()
        self.assertEqual(self.search('', ingredientId=chemical.public_id, page_size=1, page=2)['count'], 2)
        self.assertEqual(len(self.search('', ingredientId=chemical.public_id, page_size=1, page=2)['results']), 1)
        self.assertEqual(self.search('', 'ingredients', market='Europe')['count'], 1)

    def test_new_eligible_record_immediately_searchable(self):
        self.assertEqual(self.search("Cabrio Top")["count"], 0)
        Formulation.objects.create(formulation_name="Cabrio Top", publication_status="Published")
        self.assertEqual(self.search("Cabrio Top")["count"], 1)

    def test_exact_name_ranks_above_description(self):
        Formulation.objects.create(formulation_name="AA weak match", description="Amistar Top", publication_status="Published")
        self.assertEqual(self.search("Amistar Top")["results"][0]["brandName"], "Amistar Top")

    def test_explicit_fuzzy_search_labelled_not_synonym(self):
        result = self.search("Azoxystobin", "formulations", fuzzy="true")
        self.assertEqual(result["count"], 1)
        self.assertEqual(result["matchMode"], "fuzzy")
        self.assertEqual(self.search("Azoxystobin", "formulations")["count"], 0)

    def test_grouped_cross_model_search_and_patents(self):
        Patent.objects.create(publication_number="QA-PAT-123", title="Azoxystrobin process", applicant="QA Applicant", publication_status="Published")
        self.assertEqual(self.search("QA-PAT-123", "patents")["count"], 1)
        response = self.client.get("/api/v1/search/", {"q": "Azoxystrobin", "page_size": 5})
        self.assertEqual(response.status_code, 200)
        groups = response.json()["groups"]
        self.assertEqual(groups["products"]["count"], 1)
        self.assertEqual(groups["patents"]["count"], 1)
        self.assertEqual(groups["brands"]["count"], 1)
        self.assertEqual(groups["manufacturers"]["count"], 1)

    def test_legacy_ids_preserved(self):
        self.login()
        self.axial.legacy_id = "legacy-axial"
        self.axial.save()
        self.assertEqual(self.search("Axial")["results"][0]["id"], "formulation-product:legacy-axial")

    def test_search_does_not_mutate_status_or_scientific_text(self):
        self.login()
        self.search("Pinoxaden")
        self.axial.refresh_from_db()
        self.assertEqual(self.axial.publication_status, "Draft")
        self.assertEqual(self.axial.active_ingredient_text, "5.0% Pinoxaden")
        self.assertEqual(CommercialProduct.objects.count(), 0)

    def test_invalid_parameters_and_empty_search(self):
        self.assertEqual(self.search("")["count"], 1)
        for params in ({"group": "unknown"}, {"page": "bad"}, {"page_size": 101}, {"page": 0}):
            self.assertEqual(self.client.get("/api/v1/search/", params).status_code, 400)

    def test_index_updates_on_save_and_child_removal(self):
        self.mixture.active_ingredient_text = "NewSourceIngredient 18.2% w/w"
        self.mixture.save()
        self.assertEqual(self.search("NewSourceIngredient")["count"], 1)
        self.assertEqual(self.search("Azoxystrobin")["count"], 0)
        child = FormulationIngredient.objects.create(formulation=self.mixture, ingredient_text="QA Excipient")
        self.assertEqual(self.search("QA Excipient")["count"], 1)
        child.delete()
        self.assertEqual(self.search("QA Excipient")["count"], 0)

    def test_index_and_scientific_entity_rollback_together(self):
        try:
            with transaction.atomic():
                Formulation.objects.create(formulation_name="Rollback product", publication_status="Published")
                raise ValueError("QA rollback")
        except ValueError:
            pass
        self.assertEqual(self.search("Rollback product")["count"], 0)
        self.assertFalse(SearchDocument.objects.filter(normalized_text__contains="rollback product").exists())

    def test_component_parent_move_removes_stale_match(self):
        self.login()
        child = FormulationIngredient.objects.create(formulation=self.mixture, ingredient_text="Moved QA additive")
        child.formulation = self.axial
        child.save()
        rows = self.search("Moved QA additive")["results"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["formulationId"], str(self.axial.pk))

    def test_reindex_recovers_bulk_update_without_changing_source_records(self):
        Formulation.objects.filter(pk=self.mixture.pk).update(formulation_name="Bulk QA product")
        source = self.mixture.active_ingredient_text
        call_command("reindex_search", stdout=StringIO())
        self.assertEqual(self.search("Bulk QA product")["count"], 1)
        self.mixture.refresh_from_db()
        self.assertEqual(self.mixture.active_ingredient_text, source)
        self.assertEqual(self.mixture.publication_status, "Published")

    def test_cas_unicode_separator_is_exact_without_rewriting_source(self):
        self.mixture.carrier_solvent_text = "Water CAS 7732\u201118\u20115"
        self.mixture.save()
        self.assertEqual(self.search("7732-18-5")["count"], 1)
        self.mixture.refresh_from_db()
        self.assertIn("\u2011", self.mixture.carrier_solvent_text)

    def test_regulatory_placeholder_counts_do_not_inflate_results(self):
        self.login()
        self.mixture.registration_number_text = " N/A "
        self.mixture.save()
        result = self.search("", "regulatory")
        self.assertEqual(result["count"], len(result["results"]))
        self.assertEqual(result["count"], 1)

    def test_facets_use_all_eligible_data_not_current_page(self):
        self.assertEqual(self.search("", "facets")["results"][0]["countries"], ["India"])
        self.login()
        data = self.search("", "facets")["results"][0]
        self.assertEqual(data["categoryCounts"]["All"], 2)
        self.assertEqual(data["countries"], ["Europe", "India"])

    def test_product_fuzzy_is_explicit_and_identifiers_not_suggested(self):
        result = self.search("Azoxystobin", fuzzy="true")
        self.assertEqual(result["count"], 1)
        self.assertEqual(result["matchMode"], "fuzzy")
        self.assertEqual(self.search("Azoxystobin")["count"], 0)

    def test_active_sources_include_stored_products_without_formulation(self):
        CommercialProduct.objects.create(product_name="Standalone source product", active_ingredient_text="Copper oxychloride 50%", publication_status="Published")
        result = self.search("Copper oxychloride", "activeIngredients")
        self.assertEqual(result["count"], 1)
        self.assertEqual(result["results"][0]["sourceText"], "Copper oxychloride 50%")

    def test_brand_does_not_expose_hidden_manufacturer(self):
        company = Manufacturer.objects.create(legal_name="Private company identity")
        Brand.objects.create(brand_name="Public QA brand", manufacturer=company, publication_status="Published")
        result = self.search("Public QA brand", "brands")
        self.assertEqual(result["count"], 1)
        self.assertEqual(result["results"][0]["companyName"], "")
        self.assertEqual(result["results"][0]["manufacturerId"], "")
        self.assertEqual(self.search("Private company identity", "brands")["count"], 0)

    def test_projection_uses_eligible_stored_manufacturer_identity(self):
        self.login()
        company = Manufacturer.objects.create(legal_name="Syngenta")
        result = self.search("Axial", "products")
        self.assertEqual(result["results"][0]["manufacturerId"], str(company.pk))
        self.assertEqual(self.search("Axial", "brands")["results"][0]["manufacturerId"], str(company.pk))

    def test_identity_hydration_is_bounded_and_obeys_visibility(self):
        identity = "formulation-product:" + str(self.axial.pk)
        self.assertEqual(self.search("", identity=identity)["count"], 0)
        self.login()
        result = self.search("", identity=identity)
        self.assertEqual(result["count"], 1)
        self.assertEqual(result["results"][0]["id"], identity)
        self.assertEqual(self.search("", "formulations", identity=str(self.axial.pk))["count"], 1)

    def test_formulation_workflow_filter_and_stable_sort(self):
        self.login()
        draft=self.search("", "formulations", publishStatus="Draft")
        self.assertEqual(draft["count"],1)
        self.assertEqual(draft["results"][0]["name"],"Axial Pro 150")
        ordered=self.search("", "formulations", ordering="formulation_name")
        self.assertEqual([row["name"] for row in ordered["results"]],["Amistar Top","Axial Pro 150"])

    def test_brand_summary_counts_distinct_pairs_and_obeys_permissions(self):
        Formulation.objects.create(formulation_name="Amistar Top",company_name="Syngenta",market_region="Europe",publication_status="Published")
        self.assertEqual(self.search("","brandSummary")["results"][0],{
            "totalBrands":1,"withFormulations":1,"withActiveIngredients":1,"markets":2})
        self.login()
        self.assertEqual(self.search("","brandSummary")["results"][0]["totalBrands"],2)

    def test_brand_pagination_globally_sorts_source_and_stored_names(self):
        Brand.objects.create(brand_name="Zeta stored",publication_status="Published",industry_sector=self.sector)
        first=self.search("","brands",page_size=1,sortBy="name")
        self.assertEqual(first["count"],2)
        self.assertEqual(first["results"][0]["brandName"],"Amistar Top")
        second=self.search("","brands",page_size=1,page=2,sortBy="name")
        self.assertEqual(second["results"][0]["brandName"],"Zeta stored")
        self.assertEqual(second["results"][0]["sectors"],["Agrochemical"])
        descending=self.search("","brands",page_size=1,sortBy="name",sortOrder="desc")
        self.assertEqual(descending["results"][0]["brandName"],"Zeta stored")

    def test_brand_metadata_includes_variants_outside_bounded_samples(self):
        for index in range(4):
            Formulation.objects.create(formulation_name="Amistar Top",company_name="Syngenta",
                market_region=f"Market {index}",active_ingredient_text=f"Exact source {index}",publication_status="Published")
        row=self.search("Amistar","brands")["results"][0]
        self.assertEqual(row["productCount"],5)
        self.assertLessEqual(len(row["products"]),2)
        self.assertIn("Exact source 3",row["activeIngredients"])
        self.assertIn("Market 3",row["markets"])
        key=row["key"]
        resolved=self.search("","brands",brandKey=key,brandNameExact="Amistar Top",manufacturerExact="Syngenta")
        self.assertEqual(resolved["results"][0]["key"],key)
        self.assertEqual(self.search("","brands",brandKey=key,brandNameExact="Wrong name",manufacturerExact="Syngenta")["count"],0)

    def test_brand_comparison_uses_genuine_linked_product_identity(self):
        product=CommercialProduct.objects.create(product_name="Different product label",formulation=self.mixture,publication_status="Published")
        row=self.search("Amistar","brands")["results"][0]
        self.assertEqual([item["id"] for item in row["products"]],[str(product.pk)])
        linked=self.search("","products",brandNameExact="Amistar Top",manufacturerExact="Syngenta")
        self.assertEqual([item["id"] for item in linked["results"]],[str(product.pk)])
        self.assertEqual(self.search("","products",brandNameExact="Amistar Top",manufacturerExact="Other company")["count"],0)
