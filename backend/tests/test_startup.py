from django.test import SimpleTestCase, TestCase
from django.urls import reverse

from apps.products.models import CommercialProduct


class AdminURLTests(SimpleTestCase):
    def test_standard_admin_url_redirects(self):
        response = self.client.get("/admin/")
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "/django-admin/")

    def test_admin_subpaths_preserve_query_parameters(self):
        response = self.client.get("/admin/login/?next=%2Fadmin%2F")
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "/django-admin/login/?next=%2Fadmin%2F")

    def test_login_alias_displays_login_form(self):
        response = self.client.get("/admin/login/", follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'name="username"')
        self.assertContains(response, 'name="password"')


class StartupTests(TestCase):
    def test_health(self):
        response = self.client.get(reverse("health"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["service"], "Formulix")

    def test_admin_login(self):
        self.assertEqual(self.client.get(reverse("admin:login")).status_code, 200)

    def test_public_catalog_does_not_expose_drafts(self):
        draft = CommercialProduct.objects.create(product_name="Private draft")
        published = CommercialProduct.objects.create(
            product_name="Published test record", publication_status="Published"
        )
        response = self.client.get("/api/v1/products/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 1)
        self.assertEqual(response.json()["results"][0]["id"], published.public_id)
        self.assertEqual(self.client.get(f"/api/v1/products/{draft.pk}/").status_code, 404)

    def test_anonymous_catalog_writes_are_denied(self):
        response = self.client.post(
            "/api/v1/products/", {"brandName": "Unauthorized"}, content_type="application/json"
        )
        self.assertEqual(response.status_code, 403)
