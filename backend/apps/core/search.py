"""Read-only database search. Source text and entity identity are never rewritten."""
import re
import unicodedata
from difflib import SequenceMatcher
from functools import lru_cache
from uuid import UUID

from django.apps import apps
from django.db.models import Case, CharField, Exists, F, Func, IntegerField, OuterRef, Q, Value, When
from django.db.models.functions import Cast, Coalesce, Lower, Replace

from .contracts import ENTITY_CONTRACTS
from .services import can_view_all

PRIMARY = {"products": "product_name", "formulations": "formulation_name",
           "ingredients": "preferred_name", "manufacturers": "legal_name", "brands": "brand_name",
           "regulatory/registrations": "registration_number", "patents": "publication_number", "documents": "title"}
CHILD_FIELDS = {
    "products": ["composition__ingredient_text", "composition__cas_text"],
    "formulations": ["composition__ingredient_text", "composition__cas_text", "composition__function_text"],
    "ingredients": ["synonyms__synonym", "identifiers__identifier_value"],
}
# Every related entity is filtered independently before its fields can affect a match.
RELATED = {
    "products": [("manufacturer_id", "manufacturers", "id"), ("brand_id", "brands", "id"),
                 ("formulation_id", "formulations", "id"), ("composition__ingredient_id", "ingredients", "id")],
    "formulations": [("composition__ingredient_id", "ingredients", "id"), ("products__id", "products", "id"),
                     ("patent_references__patent_id", "patents", "id")],
    "ingredients": [("productactiveingredient__product_id", "products", "id"),
                    ("formulationingredient__formulation_id", "formulations", "id")],
    "manufacturers": [("products__id", "products", "id"), ("owned_brands__id", "brands", "id")],
    "brands": [("manufacturer_id", "manufacturers", "id"), ("products__id", "products", "id")],
    "regulatory/registrations": [("commercial_product_id", "products", "id")],
    "patents": [("ingredients__ingredient_id", "ingredients", "id"),
                ("patentformulation__formulation_id", "formulations", "id"),
                ("productpatentlink__product_id", "products", "id")],
    "documents": [("associations__product_id", "products", "id"), ("associations__ingredient_id", "ingredients", "id"),
                  ("associations__manufacturer_id", "manufacturers", "id")],
}
PUNCTUATION = "-+/,;:()[]%\t\n\r\u2010\u2011\u2012\u2013\u2014\u2212\u00a0"
TRANSLATION = str.maketrans({char: " " for char in PUNCTUATION})


@lru_cache(maxsize=4096)
def normalize(value):
    value = unicodedata.normalize("NFKC", value).casefold()
    value = value.translate(TRANSLATION)
    return " ".join(value.split())


def eligible(resource, user):
    model = apps.get_model(ENTITY_CONTRACTS[resource]["model"])
    query = model.objects.all()
    if not (user.is_staff and can_view_all(user, model)):
        query = query.filter(publication_status="Published")
    return query


def by_identity(query, identity):
    condition = Q(legacy_id=identity)
    try:
        condition |= Q(pk=UUID(identity))
    except (ValueError, TypeError):
        pass
    if query.model._meta.label_lower == "ingredients.ingredient":
        condition |= Q(cas_number=identity)
    return query.filter(condition)


def fields_for(resource):
    model = apps.get_model(ENTITY_CONTRACTS[resource]["model"])
    fields = [field.name for field in model._meta.fields
              if field.get_internal_type() in ("CharField", "TextField", "JSONField")
              and field.name not in ("legacy_payload", "import_key", "verification_evidence", "legacy_id")]
    fields += CHILD_FIELDS.get(resource, [])
    for field in model._meta.fields:
        if field.is_relation and field.related_model._meta.app_label == "taxonomy":
            related_fields = {f.name for f in field.related_model._meta.fields}
            fields += [field.name + "__" + name for name in ("name", "code") if name in related_fields]
    return fields


class SearchNormalize(Func):
    function = "formulix_normalize"
    output_field = CharField()

    def as_postgresql(self, compiler, connection, **extra_context):
        expression = Lower(self.source_expressions[0])
        for char in PUNCTUATION:
            expression = Replace(expression, Value(char), Value(" "))
        for _ in range(5):
            expression = Replace(expression, Value("  "), Value(" "))
        return compiler.compile(expression)


def normalized_expression(field):
    return SearchNormalize(Coalesce(Cast(F(field), CharField()), Value("")))


def direct_match(query, resource, token, identifier=False, complete=False):
    from .models import SearchDocument
    documents = SearchDocument.objects.filter(resource=resource)
    matches = documents.filter(source_text__iregex=r"(?<![0-9])" + re.escape(token) + r"(?![0-9])") if identifier else documents.filter(normalized_text__contains=token)
    if complete:
        return query, Q(pk__in=matches.values("object_id"))
    condition = Q(pk__in=[])
    for index, field in enumerate(fields_for(resource)):
        if identifier:
            condition |= Q(**{field + "__iregex": r"(?<![0-9])" + re.escape(token) + r"(?![0-9])"})
        else:
            alias = f"search_text_{index}"
            query = query.alias(**{alias: normalized_expression(field)})
            condition |= Q(**{alias + "__contains": token})
    # Bulk operations that bypass save signals remain searchable until reindexing.
    return query, Q(pk__in=matches.values("object_id")) | (~Q(pk__in=documents.values("object_id")) & condition)


def search_queryset(resource, user, params, related=True, context=None):
    context = {} if context is None else context
    query = eligible(resource, user)
    identity = params.get("identity")
    if identity and resource != "products":
        query = by_identity(query, identity.removeprefix("formulation-product:") if resource == "formulations" else identity)
    raw = params.get("q", params.get("search", params.get("query", ""))).strip()[:300]
    cas = raw.translate(str.maketrans({c: "-" for c in "\u2010\u2011\u2012\u2013\u2014\u2212"}))
    identifier = bool(re.fullmatch(r"\d{2,7}-\d{2}-\d", cas))
    structure = resource == "ingredients" and (bool(re.fullmatch(r"[A-Z]{14}-[A-Z]{10}-[A-Z]", raw.upper())) or params.get("identifier") == "true"
        or raw.startswith("InChI=") or (not re.search(r"\s", raw) and bool(re.search(r"[=#@\[\]()]", raw))))
    if structure:
        query = query.filter(Q(inchikey__iexact=raw) | Q(canonical_smiles=raw) | Q(isomeric_smiles=raw) | Q(inchi=raw))
    else:
        tokens = [cas] if identifier else normalize(raw).split()
        for token in tokens[:20]:
            from .models import SearchDocument
            if resource not in context:
                context[resource] = not query.model.objects.exclude(pk__in=SearchDocument.objects.filter(resource=resource).values("object_id")).exists()
            query, condition = direct_match(query, resource, token, identifier, context[resource])
            if related:
                for lookup, target, target_field in RELATED.get(resource, []):
                    matches = search_queryset(target, user, {"q": token}, related=False, context=context)
                    if target == "products":
                        related_forms = search_queryset("formulations", user, {"q": token}, related=False, context=context)
                        matches = eligible("products", user).filter(Q(pk__in=matches.order_by().values("pk")) | Q(formulation_id__in=related_forms.order_by().values("pk")))
                    condition |= Q(**{lookup + "__in": matches.order_by().values(target_field)})
            query = query.filter(condition)
    model = query.model
    spec = ENTITY_CONTRACTS[resource]
    aliases = {**spec["fields"], **{key: field + "__name" for key, field in spec["labels"].items()}}
    aliases.update({"manufacturer": "manufacturer_text" if resource == "products" else "company_name",
                    "publishStatus": "publication_status",
                    "verificationStatus": "verification_status",
                    "classification": "product_category__name" if resource == "products" else "product_classification", "market": "market_region",
                    "activeIngredient": "active_ingredient_text",
                    "ingredientFunction": "composition__function_text", "patentQuery": "patent_reference_text"})
    for external, lookup in aliases.items():
        value = params.get(external)
        if not value or value == "All" or external in ("q", "search", "query"):
            continue
        if resource == "ingredients" and external == "category":
            query = query.filter(Q(chemical_class__icontains=value) | Q(industry_sector__name__iexact=value))
            continue
        if external == "manufacturer" and resource in ("products", "brands"):
            condition = Q(manufacturer_id__in=eligible("manufacturers", user).filter(legal_name__icontains=value).values("pk"))
            if resource == "products":
                condition |= Q(manufacturer_text__icontains=value)
            query = query.filter(condition)
            continue
        if lookup.split("__")[0] not in {f.name for f in model._meta.get_fields()}:
            continue
        values = value.split("|")
        condition = Q(pk__in=[])
        for item in values:
            condition |= Q(**{lookup + "__icontains": item}) if external in ("manufacturer", "formulationType", "activeIngredient", "ingredientFunction", "patentQuery") else Q(**{lookup + "__iexact": item})
            if external == "formulationType" and resource in ("products", "formulations"):
                condition |= Q(formulation_type__code__iexact=item) | Q(formulation_type__name__iexact=item)
        query = query.filter(condition)
    query = query.distinct().alias(search_name=normalized_expression(PRIMARY[resource]))
    company = params.get("manufacturerExact")
    if resource == "ingredients" and params.get("market", "All") not in ("", "All"):
        market = params["market"]
        products = eligible("products", user).filter(jurisdiction__name__iexact=market)
        forms = eligible("formulations", user).filter(market_region__iexact=market)
        query = query.filter(Q(productactiveingredient__product_id__in=products.values("pk")) |
                             Q(formulationingredient__formulation_id__in=forms.values("pk"))).distinct()
    if company and resource == "formulations":
        query = query.filter(company_name__iexact=company)
    elif company and resource == "products":
        query = query.filter(Q(manufacturer_text__iexact=company) | Q(manufacturer_id__in=eligible("manufacturers", user).filter(legal_name__iexact=company).values("pk")))
    needle = normalize(raw)
    ranks = [When(search_name=needle, then=Value(0))]
    if resource == "ingredients":
        from apps.ingredients.models import IngredientSynonym
        query = query.alias(search_alias=Exists(IngredientSynonym.objects.filter(ingredient_id=OuterRef("pk"), synonym__iexact=raw)))
        ranks += [When(cas_number__iexact=cas, then=Value(1)), When(search_alias=True, then=Value(2))]
    if resource in ("products", "formulations"):
        ranks += [When(active_ingredient_text__iexact=raw, then=Value(1)), When(formulation_type_text__iexact=raw, then=Value(2))]
    ranks += [When(search_name__startswith=needle, then=Value(3)), When(search_name__contains=needle, then=Value(4))]
    rank = Case(*ranks, default=Value(5), output_field=IntegerField()) if needle else Value(0, IntegerField())
    query = query.annotate(search_rank=rank, search_label=Lower(F(PRIMARY[resource]))).order_by("search_rank", "search_label", "pk")
    ordering = params.get("ordering", "")
    if ordering.lstrip("-") in (PRIMARY[resource], "updated_at", "created_at"):
        query = query.order_by(ordering, "pk")
    return query


def fuzzy_queryset(resource, user, params):
    """Bounded, opt-in spelling suggestions, never aliases or identifier matches."""
    raw = params.get("q", "")
    tokens = normalize(raw).split()
    if len(tokens) != 1 or len(tokens[0]) < 7 or not tokens[0].isalpha():
        return None
    candidates = search_queryset(resource, user, {**params, "q": tokens[0][:3]}, related=False)
    identities = []
    for row in candidates.values("pk", PRIMARY[resource], *(["active_ingredient_text"] if resource in ("products", "formulations") else []))[:200]:
        words = normalize(" ".join(str(value) for key, value in row.items() if key != "pk")).split()
        if any(SequenceMatcher(None, tokens[0], word).ratio() >= .88 for word in words):
            identities.append(row["pk"])
    return search_queryset(resource, user, {**params, "q": ""}).filter(pk__in=identities).annotate(search_rank=Value(7, IntegerField()))
