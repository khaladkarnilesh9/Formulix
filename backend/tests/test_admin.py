from django.apps import apps
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory, TestCase
from django.urls import reverse

from apps.audit.models import AuditEvent
from apps.core.admin_support import published_parent
from apps.core.models import SearchDocument
from apps.formulations.models import Formulation, FormulationIngredient
from apps.ingredients.models import Ingredient
from apps.products.models import CommercialProduct
from apps.workspace.models import ResearchNote, SavedItem

class AdminTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.operator = get_user_model().objects.create_superuser(username="test-operator", password=None)
        cls.curator = get_user_model().objects.create_user(username="test-curator", password=None, is_staff=True)
        cls.other = get_user_model().objects.create_user(username="test-other", password=None)
        cls.curator.user_permissions.add(*Permission.objects.filter(
            content_type__app_label__in=("products", "formulations", "ingredients", "workspace")))
        cls.formulation = Formulation.objects.create(formulation_name="Test workbench")
        cls.published = CommercialProduct.objects.create(product_name="Published fixture", publication_status="Published")
        cls.ingredient = Ingredient.objects.create(preferred_name="Fixture ingredient", publication_status="Published")

    def setUp(self):
        self.client.force_login(self.operator)
        self.factory = RequestFactory()

    def request(self, user):
        request = self.factory.get("/django-admin/")
        request.user = user
        return request

    def test_every_business_model_registered_and_configured(self):
        for model in apps.get_models():
            if model is SearchDocument:
                self.assertFalse(admin.site.is_registered(model))
                continue
            if model._meta.app_config.name.startswith("apps."):
                with self.subTest(model=model._meta.label):
                    self.assertTrue(admin.site.is_registered(model))
                    configured = admin.site._registry[model]
                    self.assertTrue(configured.search_fields)
                    self.assertTrue(configured.list_display)
                    self.assertEqual(configured.list_per_page, 50)

    def test_index_contains_catalog_and_api_links(self):
        response = self.client.get(reverse("admin:index"))
        self.assertContains(response, "Formulix Data Administration")
        for label in ("commercialproduct", "formulation", "ingredient", "manufacturer", "brand", "regulatoryregistration", "patent", "technicaldocument"):
            self.assertContains(response, f"/{label}/")
        self.assertContains(response, "/api/v1/")
        self.assertContains(response, "/api/docs/")

    def test_all_business_changelists_and_add_forms_render(self):
        for model, configured in admin.site._registry.items():
            if not model._meta.app_config.name.startswith("apps."):
                continue
            prefix = f"admin:{model._meta.app_label}_{model._meta.model_name}"
            with self.subTest(model=model._meta.label, page="list"):
                self.assertEqual(self.client.get(reverse(prefix + "_changelist")).status_code, 200)
            if configured.has_add_permission(self.request(self.operator)):
                with self.subTest(model=model._meta.label, page="add"):
                    self.assertEqual(self.client.get(reverse(prefix + "_add")).status_code, 200)

    def test_formulation_editor_contains_scientific_inlines(self):
        url = reverse("admin:formulations_formulation_change", args=[self.formulation.pk])
        response = self.client.get(url)
        for prefix in ("composition", "manufacturing_steps", "technical_properties", "quality_controls", "packaging", "sources", "patent_references"):
            self.assertContains(response, f'id="id_{prefix}-TOTAL_FORMS"')

    def test_published_ingredient_does_not_freeze_draft_composition(self):
        row = FormulationIngredient.objects.create(formulation=self.formulation, ingredient=self.ingredient)
        self.assertFalse(published_parent(row))
        self.formulation.publication_status = "Published"
        self.formulation.save()
        self.assertTrue(published_parent(row))

    def test_saved_published_product_can_be_unbookmarked(self):
        saved = SavedItem.objects.create(owner=self.curator, product=self.published)
        configured = admin.site._registry[SavedItem]
        self.assertTrue(configured.has_delete_permission(self.request(self.curator), saved))

    def test_workspace_admin_is_owner_scoped(self):
        own = ResearchNote.objects.create(owner=self.curator, title="Own note")
        ResearchNote.objects.create(owner=self.other, title="Private note")
        configured = admin.site._registry[ResearchNote]
        self.assertEqual(list(configured.get_queryset(self.request(self.curator))), [own])
        response = self.client.get(reverse("admin:workspace_researchnote_add"))
        self.assertEqual(response.status_code, 200)

    def test_publication_actions_cannot_skip_review(self):
        item = CommercialProduct.objects.create(product_name="Publication fixture")
        url = reverse("admin:products_commercialproduct_changelist")
        self.client.post(url, {"action": "publish_records", "_selected_action": [str(item.pk)], "index": 0})
        item.refresh_from_db()
        self.assertEqual(item.publication_status, "Draft")
        for action, status in (("submit_for_review", "In Review"), ("approve_records", "Approved"), ("publish_records", "Published")):
            response = self.client.post(url, {"action": action, "_selected_action": [str(item.pk)], "index": 0})
            self.assertEqual(response.status_code, 302)
            item.refresh_from_db()
            self.assertEqual(item.publication_status, status)
        self.assertEqual(AuditEvent.objects.filter(entity_id=str(item.pk)).count(), 3)

    def test_curator_cannot_publish_or_edit_verification(self):
        configured = admin.site._registry[CommercialProduct]
        request = self.request(self.curator)
        self.assertNotIn("publish_records", configured.get_actions(request))
        self.assertNotIn("approve_records", configured.get_actions(request))
        self.assertIn("verification_status", configured.get_readonly_fields(request))

    def test_published_records_protected_from_delete_and_inline_edits(self):
        configured = admin.site._registry[CommercialProduct]
        self.assertFalse(configured.has_delete_permission(self.request(self.operator), self.published))
        readonly = configured.get_readonly_fields(self.request(self.operator), self.published)
        self.assertIn("product_name", readonly)
        for inline in configured.get_inline_instances(self.request(self.operator), self.published):
            self.assertFalse(inline.has_add_permission(self.request(self.operator), self.published))
            self.assertFalse(inline.has_delete_permission(self.request(self.operator), self.published))

    def test_invalid_document_upload_rejected_in_admin_form(self):
        document = apps.get_model("documents.TechnicalDocument")
        configured = admin.site._registry[document]
        form_class = configured.get_form(self.request(self.operator))
        form = form_class(data={"title": "Invalid file fixture", "document_type": "Safety Data Sheet (SDS)"},
                          files={"file": SimpleUploadedFile("invalid.pdf", b"<html>not pdf</html>")})
        self.assertFalse(form.is_valid())
        self.assertIn("file", form.errors)

    def test_audit_events_are_read_only(self):
        configured = admin.site._registry[AuditEvent]
        request = self.request(self.operator)
        self.assertFalse(configured.has_add_permission(request))
        self.assertFalse(configured.has_change_permission(request))
        self.assertFalse(configured.has_delete_permission(request))
