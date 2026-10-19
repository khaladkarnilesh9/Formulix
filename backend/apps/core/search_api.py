import hashlib
from types import SimpleNamespace
from urllib.parse import urlencode

from django.db.models import CharField, Count, Exists, F, OuterRef, Q, Value, Window
from django.db.models.functions import Cast, Lower, RowNumber, Trim
from django.db import connection
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .catalog import build_catalog, CatalogAnonThrottle, CatalogUserThrottle
from .contracts import ENTITY_CONTRACTS
from .search import by_identity, eligible, fuzzy_queryset, search_queryset
from .serializers import SERIALIZERS
from .views import CatalogViewSet

GROUPS = {"products": "products", "formulations": "formulations", "ingredients": "ingredients",
          "manufacturers": "manufacturers", "brands": "brands", "regulatory": "regulatory/registrations",
          "patents": "patents", "documents": "documents", "activeIngredients": "formulations", "patentReferences": "formulations", "facets": "products", "brandSummary": "brands", "manufacturerProfile":"manufacturers", "manufacturerRecords":"manufacturers"}


def search_facets(request):
    products = eligible("products", request.user)
    forms = eligible("formulations", request.user).exclude(pk__in=products.exclude(formulation_id=None).values("formulation_id"))
    def values(query, field, limit=1000):
        return list(query.exclude(**{field: ""}).exclude(**{field + "__isnull": True}).order_by(field).values_list(field, flat=True).distinct()[:limit])
    def both(product_field, form_field):
        return sorted(set(values(products, product_field) + values(forms, form_field)))
    category_counts = {}
    for query in (products, forms):
        for row in query.order_by().values("industry_sector__name").annotate(total=Count("pk")):
            category = row["industry_sector__name"] or "Not recorded"
            category_counts[category] = category_counts.get(category, 0) + row["total"]
    category_counts["All"] = products.count() + forms.count()
    def active_values(query):
        return query.alias(active_key=Lower(Trim("active_ingredient_text"))).exclude(active_key__in=("", "n/a", "na", "none", "not recorded", "-")).order_by().values_list("active_ingredient_text", flat=True).distinct()
    def active_count(query):
        return query.alias(active_key=Lower(Trim("active_ingredient_text"))).exclude(active_key__in=("", "n/a", "na", "none", "not recorded", "-")).count()
    return {"countries": both("jurisdiction__name", "market_region"),
            "manufacturers": sorted(set(both("manufacturer_text", "company_name") + values(eligible("manufacturers", request.user), "legal_name"))),
            "formulationTypes": both("formulation_type_text", "formulation_type_text"), "categoryCounts": category_counts,
            "manufacturerCountries": values(eligible("manufacturers", request.user), "country__name"),
            "documentTypes": values(eligible("documents", request.user), "document_type"),
            "regulatoryAuthorities": values(eligible("regulatory/registrations", request.user), "regulatory_authority__name"),
            "activeSourceCount": active_values(products).union(active_values(forms)).count(),
            "linkedFormulationCount": active_count(products) + active_count(forms),
            "chemicalCount": eligible("ingredients", request.user).count()}


def prepared(request, resource, identities):
    view = CatalogViewSet()
    view.request = SimpleNamespace(user=request.user, query_params={})
    view.resource_key = resource
    view.model = eligible(resource, request.user).model
    return view.get_queryset().filter(pk__in=identities)


def paginated(request, count, results, page, size, **metadata):
    def link(number):
        params = request.query_params.copy()
        params["page"] = number
        params["page_size"] = size
        return request.build_absolute_uri(request.path + "?" + urlencode(params))
    return {"count": count, "next": link(page + 1) if page * size < count else None,
            "previous": link(page - 1) if page > 1 else None, "results": results,
            "page": page, "page_size": size, **metadata}


def product_search(request, params, page, size):
    source_company=params.get('manufacturerExact') if params.get('brandNameExact') else None
    product_params={key:value for key,value in params.items() if not (source_company and key=='manufacturerExact')}
    products = search_queryset("products", request.user, product_params)
    form_params = {**params, "market": params.get("country", params.get("market", "All"))}
    if "activeIngredient" in params:
        form_params["activeIngredient"] = params["activeIngredient"]
    forms = search_queryset("formulations", request.user, form_params)
    if params.get("ingredientId"):
        ingredients = by_identity(eligible("ingredients", request.user), params["ingredientId"])
        forms = forms.filter(composition__ingredient_id__in=ingredients.values("pk")).distinct()
        products = products.filter(Q(composition__ingredient_id__in=ingredients.values("pk")) |
                                   Q(formulation_id__in=forms.values("pk"))).distinct()
    # Exclusion uses ALL eligible linked products, not just this search/page.
    forms = forms.exclude(pk__in=eligible("products", request.user).exclude(formulation_id=None).values("formulation_id"))
    identity = params.get("identity")
    if identity:
        if identity.startswith("formulation-product:"):
            products = products.none()
        else:
            products = by_identity(products, identity)
            forms = forms.none()
    if params.get("registrationStatus", "All") not in ("All", "Unverified", ""):
        forms = forms.none()
    if params.get("sourceExact"):
        forms = forms.filter(active_ingredient_text=params["sourceExact"])
        products = products.filter(active_ingredient_text=params["sourceExact"])
    if params.get('brandNameExact'):
        forms = forms.filter(formulation_name__iexact=params['brandNameExact'])
        linked_forms=search_queryset('formulations',request.user,form_params).filter(formulation_name__iexact=params['brandNameExact'])
        direct=Q(product_name__iexact=params['brandNameExact'])
        if source_company:
            direct &= Q(manufacturer_text__iexact=source_company)|Q(manufacturer_id__in=eligible('manufacturers',request.user).filter(legal_name__iexact=source_company).values('pk'))
        products = products.filter(direct|Q(formulation_id__in=linked_forms.values('pk')))
    if params.get('brandId'):
        brands = by_identity(eligible('brands', request.user), params['brandId'])
        products = products.filter(brand_id__in=brands.values('pk'))
        forms = forms.none()
    def identities(query, resource):
        sort = {"name": "search_label", "manufacturer": "manufacturer_text" if resource == "products" else "company_name",
                "country": "jurisdiction__name" if resource == "products" else "market_region",
                "verified": "last_verified_text" if resource == "products" else "updated_at",
                "type": "formulation_type_text", "updated": "updated_at",
                "classification": "product_category__name" if resource == "products" else "product_classification"}.get(params.get("sortBy"), "search_label")
        return query.order_by().annotate(search_identity=Cast(F("pk"), CharField()), search_kind=Value(resource),
                                        search_sort=Cast(F(sort), CharField())).values("search_identity", "search_kind", "search_rank", "search_label", "search_sort").distinct()
    combined = identities(products, "products").union(identities(forms, "formulations"))
    count = combined.count()
    fuzzy = False
    if not count and params.get("fuzzy") == "true":
        product_suggestions = fuzzy_queryset("products", request.user, params)
        form_suggestions = fuzzy_queryset("formulations", request.user, form_params)
        if product_suggestions is not None and form_suggestions is not None:
            products = product_suggestions
            forms = form_suggestions.exclude(pk__in=eligible("products", request.user).exclude(formulation_id=None).values("formulation_id"))
            if params.get("registrationStatus", "All") not in ("All", "Unverified", ""):
                forms = forms.none()
            combined = identities(products, "products").union(identities(forms, "formulations"))
            count = combined.count()
            fuzzy = True
    ordering = "-search_sort" if params.get("sortOrder") == "desc" else "search_sort"
    selected = list(combined.order_by("search_rank", ordering, "search_identity", "search_kind")[(page - 1) * size:page * size])
    queries = {resource: prepared(request, resource, [row["search_identity"] for row in selected if row["search_kind"] == resource])
               for resource in ("products", "formulations")}
    catalog = build_catalog(request, queries)
    indexed = {row["id"]: row for row in catalog["products"]}
    public_ids = {resource: {str(record.pk): record.public_id for record in query} for resource, query in queries.items()}
    results = []
    for row in selected:
        # UUID strings returned by SQLite UNION have no hyphens.
        from uuid import UUID
        identity = str(UUID(row["search_identity"]))
        # Preserve legacy public IDs, which are part of existing frontend deep links.
        public_id = public_ids[row["search_kind"]][identity]
        key = "formulation-product:" + public_id if row["search_kind"] == "formulations" else public_id
        if key in indexed:
            results.append(indexed[key])
    return paginated(request, count, results, page, size, matchMode="fuzzy" if fuzzy else "standard")


def group_search(request, group, page, size):
    params = request.query_params.dict()
    if group in ('manufacturers','manufacturerProfile','manufacturerRecords'):
        from .manufacturer_search import directory_listing,company_profile,company_records
        if group=='manufacturers':return directory_listing(request,params,page,size)
        if group=='manufacturerProfile':return company_profile(request,params)
        return company_records(request,params,page,size)
    if group == 'brands':
        from .brand_search import brand_listing
        return brand_listing(request,params,page,size)
    if group == 'brandSummary':
        from .brand_search import brand_summary
        return paginated(request,1,[brand_summary(request)],1,1)
    if group == "facets":
        return paginated(request, 1, [search_facets(request)], 1, 1)
    if group == "products":
        return product_search(request, params, page, size)
    resource = GROUPS[group]
    query = search_queryset(resource, request.user, params)
    if group == "patentReferences":
        query = query.exclude(patent_reference_text="").exclude(patent_reference_text__iexact="N/A")
    if group == "activeIngredients":
        source_params = {key: value for key, value in params.items() if key != "verificationStatus"}
        query = search_queryset("formulations", request.user, source_params)
        products = search_queryset("products", request.user, source_params)
        query = query.exclude(pk__in=eligible("products", request.user).exclude(formulation_id=None).values("formulation_id"))
        if params.get("sourceExact"):
            query = query.filter(active_ingredient_text=params["sourceExact"])
            products = products.filter(active_ingredient_text=params["sourceExact"])
        # Grouped concentration/mixture text is never a verified chemical identity.
        if params.get("verificationStatus", "All") not in ("All", "", "Unverified"):
            return paginated(request, 0, [], page, size)
        def grouped(query):
            return query.alias(active_key=Lower(Trim("active_ingredient_text"))).exclude(active_key__in=("", "n/a", "na", "none", "not recorded", "-")).order_by().values(source_text=F("active_ingredient_text")).annotate(listing_count=Count("pk", distinct=True))
        product_sql, product_params = grouped(products).query.sql_with_params()
        form_sql, form_params = grouped(query).query.sql_with_params()
        # Django cannot aggregate a UNION queryset. Only ORM-compiled, parameterized
        # subqueries enter this fixed SQL wrapper; no user text becomes SQL syntax.
        sql = f"SELECT source_text, SUM(listing_count) AS total FROM ({product_sql} UNION ALL {form_sql}) source_listings GROUP BY source_text"
        parameters = (*product_params, *form_params)
        with connection.cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) FROM ({sql}) source_groups", parameters)
            count = cursor.fetchone()[0]
            order = {"name": "source_text", "-name": "source_text DESC", "count": "total DESC, source_text"}.get(params.get("sortBy"), "source_text")
            cursor.execute(sql + f" ORDER BY {order} LIMIT %s OFFSET %s", (*parameters, size, (page - 1) * size))
            values = cursor.fetchall()
        metadata = {text: {"categories": set(), "markets": set(), "updatedAt": ""} for text, _ in values}
        for queryset, market_field in ((products, "jurisdiction__name"), (query, "market_region")):
            rows = queryset.filter(active_ingredient_text__in=metadata).order_by().values(
                "active_ingredient_text", "industry_sector__name", market_field, "updated_at").distinct()
            for row in rows:
                details = metadata[row["active_ingredient_text"]]
                if row["industry_sector__name"]:
                    details["categories"].add(row["industry_sector__name"])
                if row[market_field]:
                    details["markets"].add(row[market_field])
                details["updatedAt"] = max(details["updatedAt"], row["updated_at"].isoformat())
        results = [{"sourceText": text, "productCount": total,
                    "recordKind": "Active ingredient source text", "verificationStatus": "Source-reported / unverified",
                    **{key: sorted(value) if isinstance(value, set) else value for key, value in metadata[text].items()}}
                   for text, total in values]
        return paginated(request, count, results, page, size)
    if group == "regulatory":
        # Registration source references remain unverified and separate from normalized registrations.
        forms = search_queryset("formulations", request.user, {**params, "market": params.get("country", "All")}).alias(registration_key=Lower(Trim("registration_number_text"))).exclude(registration_key__in=("", "n/a", "na", "none", "not recorded", "-"))
        if params.get("regulatoryAuthority", "All") not in ("All", "Not recorded", ""):
            forms = forms.none()
        form_count, stored_count = forms.count(), query.count()
        offset = (page - 1) * size
        stored = list(query[offset:offset + size]) if offset < stored_count else []
        results = list(SERIALIZERS[resource](stored, many=True, context={"request": request}).data)
        remaining = size - len(results)
        if remaining:
            form_offset = max(0, offset - stored_count)
            rows = forms[form_offset:form_offset + remaining]
            catalog = build_catalog(request, {"formulations": prepared(request, "formulations", rows.values("pk"))})
            results.extend(catalog["regulatoryRecords"])
        return paginated(request, form_count + stored_count, results, page, size)
    count = query.count()
    fuzzy = False
    if not count and params.get("fuzzy") == "true":
        suggestions = fuzzy_queryset(resource, request.user, params)
        if suggestions is not None:
            query, fuzzy = suggestions, True
            count = query.count()
    identities = list(query.values_list("pk", flat=True)[(page - 1) * size:page * size])
    records = {row.pk: row for row in prepared(request, resource, identities)}
    results = SERIALIZERS[resource]([records[identity] for identity in identities], many=True, context={"request": request}).data
    return paginated(request, count, results, page, size, matchMode="fuzzy" if fuzzy else "standard")


@extend_schema(responses=OpenApiTypes.OBJECT, parameters=[
    OpenApiParameter("q", OpenApiTypes.STR, description="AND-matched search terms; max 300 characters."),
    OpenApiParameter("group", OpenApiTypes.STR, enum=list(GROUPS), description="Omit for grouped results."),
    OpenApiParameter("page", OpenApiTypes.INT, description="One-based page."),
    OpenApiParameter("page_size", OpenApiTypes.INT, description="1-100 records per group."),
    OpenApiParameter("fuzzy", OpenApiTypes.BOOL, description="Opt-in labelled spelling suggestions."),
    OpenApiParameter("identifier", OpenApiTypes.BOOL, description="Exact chemical structure identifiers."),
    OpenApiParameter("identity", OpenApiTypes.STR, description="Hydrate an eligible record by its UUID or legacy public ID."),
    *[OpenApiParameter(field, OpenApiTypes.STR) for field in ("category", "country", "manufacturer", "classification", "formulationType", "registrationStatus", "activeIngredient", "regulatoryAuthority", "type")],
])
@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([CatalogAnonThrottle, CatalogUserThrottle])
def search(request):
    try:
        page = int(request.query_params.get("page", 1))
        size = int(request.query_params.get("page_size", 20))
    except (ValueError, TypeError):
        raise ValidationError("page and page_size must be integers.")
    if page < 1 or size < 1 or size > 100:
        raise ValidationError("page must be positive; page_size must be between 1 and 100.")
    group = request.query_params.get("group")
    if group and group not in GROUPS:
        raise ValidationError("Unknown search group.")
    data = group_search(request, group, page, size) if group else {"groups": {key: group_search(request, key, page, size) for key in GROUPS if key not in ("facets", "brandSummary", "manufacturerProfile", "manufacturerRecords")}}
    response = Response(data)
    response["Cache-Control"] = "private, no-store"
    return response
