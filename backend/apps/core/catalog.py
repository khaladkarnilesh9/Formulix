import hashlib

from django.apps import apps

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from apps.core.serializers import SERIALIZERS
from apps.core.views import CatalogViewSet
from apps.core.contracts import ENTITY_CONTRACTS
from apps.accounts.session_api import session_info


class CatalogAnonThrottle(AnonRateThrottle):
    scope = "catalog_anon"


class CatalogUserThrottle(UserRateThrottle):
    scope = "catalog_user"


@extend_schema(responses=OpenApiTypes.OBJECT)
@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([CatalogAnonThrottle, CatalogUserThrottle])
def catalog_snapshot(request):
    response = Response(build_catalog(request))
    response["Cache-Control"] = "no-store"
    return response


def build_catalog(request, queries=None):
    """One read catalog; projections never create scientific approval or database entities."""
    if queries is not None and "formulations" in queries:
        from django.db.models.functions import Lower, Trim
        from .search import eligible
        companies = {name.strip().casefold() for name in queries["formulations"].values_list("company_name", flat=True) if name.strip()}
        queries = {**queries, "manufacturers": eligible("manufacturers", request.user).select_related("country").prefetch_related("owned_brands")
                   .alias(source_name=Lower(Trim("legal_name"))).filter(source_name__in=companies)}
    result = {}
    for key, resource in (("formulations", "formulations"), ("products", "products"),
                          ("ingredients", "ingredients"), ("manufacturers", "manufacturers"),
                          ("regulatoryRecords", "regulatory/registrations"), ("documents", "documents")):
        if queries is not None:
            query = queries.get(resource)
            if query is None:
                result[key] = []
                continue
        else:
            view = CatalogViewSet()
            view.request, view.resource_key = request, resource
            view.model = apps.get_model(ENTITY_CONTRACTS[resource]["model"])
            query = view.get_queryset()
        if not request.user.is_staff:
            query = query.filter(publication_status="Published")
        result[key] = SERIALIZERS[resource](query, many=True, context={"request": request}).data
    result["databaseCounts"] = {key: len(rows) for key, rows in result.items()}
    companies = {row["name"].strip().casefold(): row for row in result["manufacturers"]}
    linked = {row.get("formulationId") for row in result["products"]}
    for form in result["formulations"]:
        source = form.get("marketData", {})
        company = source.get("Company Name", "").strip()
        manufacturer = companies.get(company.casefold()) if company else None
        if company and not manufacturer:
            manufacturer = {"id": "source-company:" + hashlib.sha256(company.casefold().encode()).hexdigest()[:24],
                "name": company, "country": "Not recorded", "headquarters": "", "founded": None,
                "sector": [], "productCategories": [], "productCount": 0, "website": "", "brandPortfolio": [],
                "role": "Manufacturer", "overview": "Company name reported in uploaded formulation records; role and location unverified.",
                "complianceCertifications": [], "recordKind": "Source-reported company"}
            result["manufacturers"].append(manufacturer)
            companies[company.casefold()] = manufacturer
        if form["id"] in linked:
            continue
        registration = source.get("EPA / CIBRC Registration No.", "")
        product = {"id": "formulation-product:" + form["id"], "formulationId": form["id"],
            "brandName": form["name"], "genericName": "", "activeIngredient": source.get("Active Ingredient & % (w/w)", "") or "; ".join(row["ingredient"] for row in form["composition"] if row["ingredientCategory"] in ("Active", "API")),
            "casNumber": "", "manufacturerId": manufacturer["id"] if manufacturer else "",
            "manufacturerName": company, "category": form.get("category") or "Not recorded",
            "formulationType": form["formulationType"], "strength": source.get("Active Ingredient & % (w/w)", ""),
            "country": source.get("Market", "Not recorded"), "registrationStatus": "Unverified",
            "registrationNumber": registration, "regulatoryAuthority": "Not recorded", "dataSource": form["sourceReference"],
            "lastVerifiedDate": "", "verificationEvidence": form["verificationEvidence"],
            "description": form.get("intendedApplication", ""), "indicationsOrPests": [form["intendedApplication"]] if form["intendedApplication"] else [],
            "patentIds": [], "documentIds": [], "composition": form["composition"],
            "specs": {"ph": form["properties"]["ph"], "density": form["properties"]["density"],
                      "viscosity": form["properties"]["viscosity"], "flashPoint": source.get("Flash Point Range (\u00b0C)", "")},
            "publishStatus": form["publishStatus"], "recordKind": "Formulation listing", "marketData": source}
        result["products"].append(product)
        if registration.strip().casefold() not in ("", "n/a", "na", "not recorded", "none", "-"):
            result["regulatoryRecords"].append({"id": "formulation-registration:" + form["id"],
                "productId": product["id"], "productName": product["brandName"], "activeIngredient": product["activeIngredient"],
                "registrationNumber": registration, "regulatoryAuthority": "Not recorded", "country": product["country"],
                "approvalStatus": "Unverified", "registrationHolder": company, "approvalDate": "", "expiryDate": "",
                "sourceDocument": form["sourceReference"], "lastVerifiedDate": "", "officialLink": "",
                "publishStatus": form["publishStatus"], "recordKind": "Spreadsheet registration reference"})
    active_references = {}
    for product in result["products"]:
        text = product.get("activeIngredient", "")
        key = text.strip().casefold()
        if key in ("", "n/a", "na", "not recorded", "none", "-"):
            continue
        entry = active_references.setdefault(key, {
            "id": "source-active:" + hashlib.sha256(key.encode()).hexdigest()[:24],
            "sourceText": text, "productIds": [], "categories": [], "markets": [],
            "verificationStatus": "Source-reported / unverified", "recordKind": "Active ingredient source text",
        })
        entry["productIds"].append(product["id"])
        for field, value in (("categories", product.get("category", "")), ("markets", product.get("country", ""))):
            if value and value not in entry[field]:
                entry[field].append(value)
    result["activeIngredientReferences"] = sorted(active_references.values(), key=lambda entry: entry["sourceText"].casefold())
    for company in result["manufacturers"]:
        products = [row for row in result["products"] if row.get("manufacturerId") == company["id"]]
        company["productCount"] = len(products)
        company["brandPortfolio"] = list(dict.fromkeys(row["brandName"] for row in products))
        company["productCategories"] = list(dict.fromkeys(row["category"] for row in products))
    result["staffPreview"] = request.user.is_staff and any(
        row.get("publishStatus") != "Published" for key in ("products", "formulations") for row in result[key])
    result["publicationCounts"] = {status: sum(row.get("publishStatus") == ("Submitted for Review" if status == "In Review" else status) for row in result["formulations"])
                                  for status in ("Draft", "In Review", "Approved", "Published", "Rejected", "Archived")}
    result["session"] = session_info(request)
    return result
