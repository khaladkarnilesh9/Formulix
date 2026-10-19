from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.test import TestCase
from django.db import connection
from django.test.utils import CaptureQueriesContext

from apps.formulations.models import Formulation
from apps.products.models import CommercialProduct


class CatalogTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = get_user_model().objects.create_superuser(username="catalog-admin", password=None)
        cls.staff = get_user_model().objects.create_user(username="catalog-staff", password=None, is_staff=True)
        cls.regular = get_user_model().objects.create_user(username="catalog-regular", password=None)
        cls.regular.user_permissions.add(Permission.objects.get(codename="view_formulation"))
        cls.form = Formulation.objects.create(formulation_name="QA Brand SC", company_name="QA Company", market_region="India",
            active_ingredient_text="A 20% + B 8% w/w", formulation_type_text="SC", registration_number_text="Source REG-001",
            density_text="1.08 - 1.12 g/mL", source_reference="QA.xlsx / Sheet / row 2")

    def snapshot(self):
        response = self.client.get("/api/v1/catalog/")
        self.assertEqual(response.status_code, 200)
        return response.json()

    def test_drafts_private_including_regular_user_with_view_permission(self):
        self.assertEqual(self.snapshot()["formulations"], [])
        self.client.force_login(self.staff)
        self.assertEqual(self.snapshot()["formulations"], [])
        self.client.force_login(self.regular)
        self.assertEqual(self.snapshot()["formulations"], [])

    def test_staff_preview_connects_all_pages_without_creating_scientific_entities(self):
        self.client.force_login(self.admin)
        data = self.snapshot()
        self.assertTrue(data["staffPreview"])
        self.assertEqual(data["publicationCounts"]["Draft"], 1)
        product = data["products"][0]
        self.assertEqual(product["formulationId"], str(self.form.pk))
        self.assertEqual(product["brandName"], self.form.formulation_name)
        self.assertEqual(product["specs"]["density"], self.form.density_text)
        self.assertEqual(product["registrationStatus"], "Unverified")
        self.assertEqual(data["regulatoryRecords"][0]["productId"], product["id"])
        self.assertEqual(data["regulatoryRecords"][0]["approvalStatus"], "Unverified")
        self.assertEqual(data["manufacturers"][0]["country"], "Not recorded")
        self.assertEqual(data["manufacturers"][0]["productCount"], 1)
        self.assertEqual(data["databaseCounts"]["products"], 0)
        self.assertFalse(CommercialProduct.objects.exists())
        self.form.refresh_from_db()
        self.assertEqual(self.form.publication_status, "Draft")

    def test_public_published_listing_and_withdrawal(self):
        self.form.publication_status = "Published"
        self.form.save()
        data = self.snapshot()
        self.assertFalse(data["staffPreview"])
        self.assertEqual(len(data["products"]), 1)
        self.assertEqual(len(data["regulatoryRecords"]), 1)
        self.form.publication_status = "Archived"
        self.form.save()
        data = self.snapshot()
        for key in ("formulations", "products", "manufacturers", "regulatoryRecords"):
            self.assertEqual(data[key], [])

    def test_real_product_link_not_duplicated(self):
        self.client.force_login(self.admin)
        product = CommercialProduct.objects.create(product_name="QA linked product", formulation=self.form)
        data = self.snapshot()
        self.assertEqual(len(data["products"]), 1)
        self.assertEqual(data["products"][0]["id"], str(product.pk))

    def test_query_count_is_bounded_for_large_catalog(self):
        self.client.force_login(self.admin)
        Formulation.objects.bulk_create([Formulation(formulation_name=f"QA additional {index}") for index in range(35)])
        with CaptureQueriesContext(connection) as queries:
            data = self.snapshot()
        self.assertEqual(len(data["formulations"]), 36)
        self.assertLess(len(queries), 25)

    def test_review_status_count_uses_actual_workflow(self):
        self.client.force_login(self.admin)
        self.form.publication_status = "In Review"
        self.form.save()
        self.assertEqual(self.snapshot()["publicationCounts"]["In Review"], 1)

    def test_active_ingredient_source_search_data_preserves_mixtures_and_permissions(self):
        self.form.active_ingredient_text = "Azoxystrobin 20% + Difenoconazole 12.5% w/w"
        self.form.save()
        self.assertEqual(self.snapshot()["activeIngredientReferences"], [])
        self.client.force_login(self.admin)
        data = self.snapshot()
        reference = data["activeIngredientReferences"][0]
        self.assertEqual(reference["sourceText"], self.form.active_ingredient_text)
        self.assertEqual(reference["productIds"], [data["products"][0]["id"]])
        self.assertEqual(reference["categories"], [data["products"][0]["category"]])
        self.assertEqual(reference["markets"], ["India"])
        self.assertEqual(reference["verificationStatus"], "Source-reported / unverified")
        self.assertFalse("smiles" in reference or "casNumber" in reference)
        self.assertEqual(data["ingredients"], [])

    def test_source_active_text_deduplicates_without_merging_different_mixtures(self):
        self.client.force_login(self.admin)
        Formulation.objects.create(formulation_name="QA second brand", active_ingredient_text=self.form.active_ingredient_text,
                                   company_name="QA Company", market_region="Europe")
        Formulation.objects.create(formulation_name="QA different mixture", active_ingredient_text="A 20% + C 8% w/w",
                                   company_name="QA Company", market_region="India")
        references = self.snapshot()["activeIngredientReferences"]
        self.assertEqual(len(references), 2)
        original = next(row for row in references if row["sourceText"] == self.form.active_ingredient_text)
        self.assertEqual(len(original["productIds"]), 2)
        self.assertEqual(set(original["markets"]), {"India", "Europe"})
