from django.apps import apps
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from django.views.generic import RedirectView
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework.routers import DefaultRouter

from apps.core.contracts import ENTITY_CONTRACTS
from apps.core.views import CatalogViewSet, DocumentViewSet, ManufacturerViewSet, dashboard, vocabularies
from apps.core.catalog import catalog_snapshot
from apps.core.search_api import search
from apps.accounts.session_api import staff_session


def health(request):
    return JsonResponse({"service": "Formulix", "status": "ok"})


router = DefaultRouter()
for prefix, contract in ENTITY_CONTRACTS.items():
    model = apps.get_model(contract["model"])
    viewset = type(
        f"{model.__name__}ViewSet",
        (DocumentViewSet if prefix == "documents" else ManufacturerViewSet if prefix == "manufacturers" else CatalogViewSet,),
        {"model": model, "resource_key": prefix, "__module__": __name__},
    )
    router.register(prefix, viewset, basename=model._meta.model_name)

urlpatterns = [
    path("", health, name="health"),
    path("django-admin/", admin.site.urls),
    path("admin/", RedirectView.as_view(url="/django-admin/", query_string=True), name="admin-alias"),
    path(
        "admin/<path:admin_path>",
        RedirectView.as_view(url="/django-admin/%(admin_path)s", query_string=True),
        name="admin-path-alias",
    ),
    path("api/v1/dashboard/summary/", dashboard, name="dashboard-summary"),
    path("api/v1/catalog/", catalog_snapshot, name="catalog-snapshot"),
    path("api/v1/search/", search, name="catalog-search"),
    path("api/v1/session/", staff_session, name="staff-session"),
    path("api/v1/vocabularies/", vocabularies, name="vocabularies"),
    path("api/v1/", include(router.urls)),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
