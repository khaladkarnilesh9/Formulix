from django.contrib.auth import get_user_model
from unittest.mock import patch
from django.core.cache import cache
from django.test import Client, TestCase

from apps.formulations.models import Formulation


class StaffSessionTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.staff = get_user_model().objects.create_superuser(username="qa-session-staff", password="isolated-test-password")
        cls.regular = get_user_model().objects.create_user(username="qa-session-public", password="isolated-test-password")
        cls.form = Formulation.objects.create(formulation_name="Private imported fixture")

    def setUp(self):
        cache.clear()
        self.client = Client(enforce_csrf_checks=True)

    def sign_in(self, username="qa-session-staff", password="isolated-test-password"):
        token = self.client.get("/api/v1/session/").json()["csrfToken"]
        return self.client.post("/api/v1/session/", {"username": username, "password": password},
                                content_type="application/json", HTTP_X_CSRFTOKEN=token)

    def test_cookie_sign_in_renders_private_catalog_and_logout_removes_it(self):
        self.assertEqual(self.client.get("/api/v1/catalog/").json()["formulations"], [])
        response = self.sign_in()
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["canPreview"])
        self.assertIn("sessionid", self.client.cookies)
        catalog = self.client.get("/api/v1/catalog/").json()
        self.assertEqual(catalog["formulations"][0]["id"], str(self.form.pk))
        self.assertEqual(catalog["session"]["username"], self.staff.username)
        self.assertTrue(catalog["staffPreview"])
        logout = self.client.delete("/api/v1/session/", HTTP_X_CSRFTOKEN=response.json()["csrfToken"])
        self.assertEqual(logout.status_code, 200)
        self.assertFalse(logout.json()["authenticated"])
        self.assertEqual(self.client.get("/api/v1/catalog/").json()["formulations"], [])
        self.form.refresh_from_db()
        self.assertEqual(self.form.publication_status, "Draft")

    def test_login_requires_csrf_even_when_anonymous(self):
        response = self.client.post("/api/v1/session/", {"username": self.staff.username, "password": "isolated-test-password"}, content_type="application/json")
        self.assertEqual(response.status_code, 403)
        self.assertNotIn("sessionid", self.client.cookies)

    def test_wrong_password_and_nonstaff_rejected(self):
        self.assertEqual(self.sign_in(password="wrong").status_code, 403)
        self.assertEqual(self.sign_in(username=self.regular.username).status_code, 403)
        self.assertEqual(self.client.get("/api/v1/catalog/").json()["formulations"], [])

    def test_login_throttled(self):
        with patch("apps.accounts.session_api.StaffLoginThrottle.timer", return_value=1000):
            for _ in range(15):
                self.assertEqual(self.sign_in(password="wrong").status_code, 403)
            self.assertEqual(self.sign_in(password="wrong").status_code, 429)
