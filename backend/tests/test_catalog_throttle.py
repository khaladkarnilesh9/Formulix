from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase
from rest_framework.throttling import AnonRateThrottle

from apps.core.catalog import CatalogAnonThrottle


class CatalogThrottleTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_general_anonymous_budget_does_not_block_catalog(self):
        with patch.object(AnonRateThrottle, "allow_request", return_value=False):
            with patch.object(CatalogAnonThrottle, "allow_request", return_value=True):
                self.assertEqual(self.client.get("/api/v1/catalog/").status_code, 200)

    def test_catalog_has_its_own_limit_and_retry_header(self):
        with patch.object(CatalogAnonThrottle, "get_rate", return_value="2/min"):
            self.assertEqual(self.client.get("/api/v1/catalog/").status_code, 200)
            self.assertEqual(self.client.get("/api/v1/catalog/").status_code, 200)
            response = self.client.get("/api/v1/catalog/")
        self.assertEqual(response.status_code, 429)
        self.assertIn("Retry-After", response)
