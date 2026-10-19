from copy import deepcopy
from decimal import Decimal
from django.apps import apps
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import models, transaction
from rest_framework import serializers
from .contracts import ENTITY_CONTRACTS, SYSTEM_FIELDS
from .services import by_identity, audit
from apps.formulations.models import FormulationIngredient, FormulationTechnicalProperty, FormulationManufacturingStep, FormulationQualityControl
from apps.products.models import ProductActiveIngredient, ProductDocumentLink, ProductPatentLink
from apps.documents.validators import validate_document_file
from apps.formulations.spreadsheet_columns import COLUMNS

def public_related(queryset, request):
    if request.user.is_authenticated and request.user.has_perm(f"{queryset.model._meta.app_label}.view_{queryset.model._meta.model_name}"):
        return queryset
    return queryset.filter(publication_status="Published")


def related_rows(obj, name, *forward):
    manager = getattr(obj, name)
    if name in getattr(obj, "_prefetched_objects_cache", {}):
        return manager.all()
    return manager.select_related(*forward)


def visible_objects(queryset, request):
    return (row for row in queryset if row.publication_status == "Published" or request_can_view(request, row))

def composition_data(row):
    return {"ingredient": row.ingredient_text or (row.ingredient.preferred_name if row.ingredient_id else ""),
        "cas": row.cas_text or (row.ingredient.cas_number or "" if row.ingredient_id else ""),
        "chemicalFunction": row.function_text or (row.chemical_function.name if row.chemical_function_id else ""),
        "concentration": row.concentration_text or (str(row.concentration_value) if row.concentration_value is not None else ""),
        "unit": row.unit_text or (row.concentration_unit.code if row.concentration_unit_id else ""),
        "ingredientCategory": row.category_text, "sourceEvidence": row.source_evidence}

class CatalogSerializer(serializers.Serializer):
    contract_key = None
    def get_fields(self):
        spec = ENTITY_CONTRACTS[self.contract_key]
        model = apps.get_model(spec["model"])
        fields = {}
        for alias, name in spec["fields"].items():
            field = model._meta.get_field(name)
            options = {"required": not (field.blank or field.null or field.has_default()), "allow_null": field.null}
            if isinstance(field, models.JSONField):
                value = serializers.JSONField(**options)
            elif isinstance(field, models.DecimalField):
                value = serializers.DecimalField(max_digits=field.max_digits, decimal_places=field.decimal_places, coerce_to_string=False, **options)
            elif isinstance(field, models.IntegerField):
                value = serializers.IntegerField(min_value=0, **options)
            else:
                value = serializers.CharField(allow_blank=field.blank, max_length=getattr(field, "max_length", None), **options)
            fields[alias] = value
        for alias in (*spec["relations"], *spec["labels"]):
            fields[alias] = serializers.CharField(required=False, allow_blank=True)
        for alias in spec["nested"]:
            fields[alias] = serializers.JSONField(required=False)
        fields.update({
            "id": serializers.CharField(required=False),
            "serverId": serializers.UUIDField(read_only=True),
            "publishStatus": serializers.CharField(read_only=True),
            "createdAt": serializers.DateTimeField(read_only=True),
            "updatedAt": serializers.DateTimeField(read_only=True),
            "version": serializers.IntegerField(read_only=True),
            "isSyntheticDemo": serializers.BooleanField(required=False),
            "verificationState": serializers.CharField(read_only=True),
            "sourceTitle": serializers.CharField(required=False, allow_blank=True),
            "sourceType": serializers.CharField(required=False, allow_blank=True),
        })
        fields.setdefault("sourceUrl", serializers.URLField(required=False, allow_blank=True))
        if self.contract_key == "formulations":
            fields["marketData"] = serializers.DictField(child=serializers.CharField(), read_only=True)
            fields["sourceSheet"] = serializers.CharField(read_only=True)
            fields["sourceRow"] = serializers.IntegerField(read_only=True, allow_null=True)
        if self.contract_key == "documents":
            fields.update(file=serializers.FileField(required=False, write_only=True),
                          isRestricted=serializers.BooleanField(required=False),
                          hasFile=serializers.BooleanField(read_only=True),
                          downloadUrl=serializers.CharField(read_only=True, allow_null=True))
        if self.contract_key == "ingredients":
            for name in ("synonyms", "identifiers", "scientificProperties"):
                fields[name] = serializers.JSONField(read_only=True)
        return fields

    def allowed_fields(self):
        spec = ENTITY_CONTRACTS[self.contract_key]
        return set(spec["fields"]) | set(spec["relations"]) | set(spec["labels"]) | set(spec["nested"]) | SYSTEM_FIELDS | {"file", "isRestricted"}
    def to_internal_value(self, data):
        if not isinstance(data, dict):
            raise serializers.ValidationError("A JSON object is required.")
        unknown = set(data) - self.allowed_fields()
        if unknown:
            raise serializers.ValidationError({"unknown_fields": sorted(unknown)})
        return dict(data)
    def validate(self, data):
        spec = ENTITY_CONTRACTS[self.contract_key]
        model = apps.get_model(spec["model"])
        obj = deepcopy(self.instance) if self.instance else model()
        status = data.get("publishStatus", data.get("publicationStatus", "Draft"))
        if status not in ("Draft", getattr(self.instance, "publication_status", "Draft"),
                          "Submitted for Review" if getattr(self.instance, "publication_status", "") == "In Review" else ""):
            raise serializers.ValidationError({"publishStatus": "Use the publication transition endpoint."})
        if self.instance and self.instance.publication_status == "Published":
            raise serializers.ValidationError("Return a published record to Draft before editing.")
        if self.instance and "version" in data and data["version"] != self.instance.version:
            raise serializers.ValidationError({"version": "Record changed; reload before saving."})
        try:
            self.assign(obj, data)
            obj.full_clean(exclude=["created_at", "updated_at"])
        except (DjangoValidationError, ValueError, TypeError) as error:
            raise serializers.ValidationError(getattr(error, "message_dict", str(error))) from error
        return data
    def assign(self, obj, data):
        spec = ENTITY_CONTRACTS[self.contract_key]
        if "id" in data:
            if self.instance and str(data["id"]) != self.instance.public_id:
                raise DjangoValidationError("Identifiers are immutable.")
            if not self.instance:
                obj.legacy_id = str(data["id"])
        for external, field_name in spec["fields"].items():
            if external in data:
                value = data[external]
                field = obj._meta.get_field(field_name)
                if isinstance(field, models.DecimalField):
                    value = Decimal(str(value)) if value is not None and value != "" else None
                if field_name == "cas_number" and value in ("", None, "N/A", "Not recorded"):
                    value = None
                setattr(obj, field_name, value)
        for external, field_name in spec["relations"].items():
            if external in data:
                related_model = obj._meta.get_field(field_name).remote_field.model
                target = by_identity(related_model, data[external]) if data[external] else None
                if data[external] and not target:
                    raise DjangoValidationError({external: "Referenced record does not exist."})
                setattr(obj, field_name, target)
        for external, field_name in spec["labels"].items():
            if external in data:
                value = data[external]
                related_model = obj._meta.get_field(field_name).remote_field.model
                target = related_model.objects.filter(name=value).first() if value else None
                if value and not target:
                    raise DjangoValidationError({external: "Create the controlled reference in Django Admin first."})
                setattr(obj, field_name, target)
        if "isSyntheticDemo" in data:
            obj.is_synthetic_demo = bool(data["isSyntheticDemo"])
        for external, field in (("sourceTitle", "source_title"), ("sourceType", "source_type")):
            if external in data:
                setattr(obj, field, data[external])
        if "sourceUrl" in data and "sourceUrl" not in spec["fields"]:
            obj.source_url = data["sourceUrl"]
        if "file" in data:
            obj.mime_type = validate_document_file(data["file"])
            obj.file_size = data["file"].size
            obj.file = data["file"]
        if "isRestricted" in data and hasattr(obj, "is_restricted"):
            obj.is_restricted = bool(data["isRestricted"])
        if self.contract_key == "formulations" and "manufacturingInfo" in data:
            info = data["manufacturingInfo"]
            obj.process_overview = info.get("processOverview", "")
            obj.processing_conditions = info.get("processingConditions", [])
            obj.equipment = info.get("equipment", [])
        return obj
    @transaction.atomic
    def create(self, validated_data):
        model = apps.get_model(ENTITY_CONTRACTS[self.contract_key]["model"])
        obj = self.assign(model(), validated_data)
        obj.created_by = self.context["request"].user
        return self.persist(obj, validated_data, "Created")
    @transaction.atomic
    def update(self, instance, validated_data):
        obj = type(instance).objects.select_for_update().get(pk=instance.pk)
        if "version" in validated_data and obj.version != validated_data["version"]:
            raise serializers.ValidationError("Concurrent update detected.")
        self.assign(obj, validated_data)
        obj.version += 1
        return self.persist(obj, validated_data, "Updated")
    def persist(self, obj, data, action):
        original = {key: value for key, value in data.items() if key != "file" and key not in SYSTEM_FIELDS}
        obj.legacy_payload = {**obj.legacy_payload, **original}
        obj.full_clean(exclude=["created_at", "updated_at"])
        obj.save()
        self.save_nested(obj, data)
        audit(self.context["request"].user, obj, action)
        return obj
    def save_nested(self, obj, data):
        if "composition" in data and hasattr(obj, "composition"):
            if not isinstance(data["composition"], list):
                raise serializers.ValidationError({"composition": "Must be an array."})
            obj.composition.all().delete()
            child_model = FormulationIngredient if self.contract_key == "formulations" else ProductActiveIngredient
            parent = "formulation" if self.contract_key == "formulations" else "product"
            ingredient_model = apps.get_model("ingredients.Ingredient")
            for index, item in enumerate(data["composition"]):
                unknown = set(item) - {"ingredient", "cas", "chemicalFunction", "concentration", "unit", "ingredientCategory", "sourceEvidence"}
                if unknown:
                    raise serializers.ValidationError({"composition": f"Unknown fields: {sorted(unknown)}"})
                ingredient = ingredient_model.objects.filter(cas_number=item.get("cas")).first() if item.get("cas") else None
                row = child_model(**{parent: obj}, ingredient=ingredient, sequence=index,
                    ingredient_text=item.get("ingredient", ""), cas_text=item.get("cas", ""),
                    function_text=item.get("chemicalFunction", ""), concentration_text=str(item.get("concentration", "")),
                    unit_text=item.get("unit", ""), category_text=item.get("ingredientCategory", ""),
                    source_evidence=item.get("sourceEvidence", "Imported unverified"))
                try:
                    row.full_clean(exclude=["created_at", "updated_at"])
                except DjangoValidationError as error:
                    raise serializers.ValidationError({"composition": error.messages}) from error
                row.save()
        if self.contract_key == "formulations":
            if "properties" in data:
                for name, value in data["properties"].items():
                    FormulationTechnicalProperty.objects.update_or_create(formulation=obj, property_name=name, defaults={"value": value or ""})
            if "manufacturingInfo" in data:
                obj.manufacturing_steps.all().delete()
                obj.quality_controls.all().delete()
                for index, text in enumerate(data["manufacturingInfo"].get("mixingSequence", []), 1):
                    FormulationManufacturingStep.objects.create(formulation=obj, step_number=index, description=text)
                for text in data["manufacturingInfo"].get("qcParameters", []):
                    FormulationQualityControl.objects.create(formulation=obj, test_name=text)
        if self.contract_key == "products":
            for key, child_model, field, resource in (("documentIds", ProductDocumentLink, "document", "documents.TechnicalDocument"),
                                                     ("patentIds", ProductPatentLink, "patent", "patents.Patent")):
                if key in data:
                    getattr(obj, "document_links" if key == "documentIds" else "patent_links").all().delete()
                    for identity in data[key]:
                        related = by_identity(apps.get_model(resource), identity)
                        if not related:
                            raise serializers.ValidationError({key: f"Unknown related identifier: {identity}"})
                        child_model.objects.create(product=obj, **{field: related})
    def to_representation(self, obj):
        spec = ENTITY_CONTRACTS[self.contract_key]
        data = deepcopy(obj.legacy_payload)
        for external, field in spec["fields"].items():
            value = getattr(obj, field)
            if isinstance(value, Decimal):
                value = float(value)
            data[external] = value
        for external, field in spec["relations"].items():
            target = getattr(obj, field)
            data[external] = target.public_id if target else ""
        for external, field in spec["labels"].items():
            target = getattr(obj, field)
            data[external] = target.name if target else ""
        data.update(id=obj.public_id, serverId=str(obj.pk), publishStatus=("Submitted for Review" if obj.publication_status == "In Review" else obj.publication_status),
            createdAt=obj.created_at.isoformat(), updatedAt=obj.updated_at.isoformat(), version=obj.version,
            isSyntheticDemo=obj.is_synthetic_demo, verificationState=obj.verification_status,
            sourceTitle=obj.source_title, sourceType=obj.source_type, sourceUrl=obj.source_url or data.get("sourceUrl", ""))
        if self.contract_key in ("products", "formulations"):
            data["composition"] = [composition_data(row) for row in related_rows(obj, "composition", "ingredient", "chemical_function", "concentration_unit")]
            if not data.get("formulationType") and obj.formulation_type_id:
                data["formulationType"] = obj.formulation_type.name
        if self.contract_key == "products":
            if obj.manufacturer_id:
                data["manufacturerName"] = obj.manufacturer.display_name or obj.manufacturer.legal_name
            data["documentIds"] = [link.document.public_id for link in related_rows(obj, "document_links", "document") if link.document.publication_status == "Published" or request_can_view(self.context["request"], link.document)]
            data["patentIds"] = [link.patent.public_id for link in related_rows(obj, "patent_links", "patent") if link.patent.publication_status == "Published" or request_can_view(self.context["request"], link.patent)]
        elif self.contract_key == "formulations":
            if obj.market_region or obj.company_name:
                data["marketData"] = {"Market": obj.market_region, **{heading: getattr(obj, field) for heading, field in COLUMNS.items()}}
            data["sourceSheet"], data["sourceRow"] = obj.source_sheet, obj.source_row
            data["manufacturingInfo"] = {"processOverview": obj.process_overview, "mixingSequence": [step.description or step.operation_name for step in obj.manufacturing_steps.all()],
                "processingConditions": obj.processing_conditions, "equipment": obj.equipment,
                "qcParameters": [row.test_name for row in obj.quality_controls.all()]}
            data["properties"] = {name: "" for name in ("ph", "viscosity", "density", "particleSize", "stability", "shelfLife", "appearance")}
            data["properties"].update({row.property_name: row.value for row in obj.technical_properties.all()})
            for name, field in (("ph", "ph_range_text"), ("viscosity", "viscosity_text"), ("density", "density_text")):
                if getattr(obj, field):
                    data["properties"][name] = getattr(obj, field)
            data["commercialProductIds"] = [product.public_id for product in visible_objects(obj.products.all(), self.context["request"])]
            data["patentReferences"] = [{"patentNumber": row.patent.publication_number, "title": row.patent.title,
                "publication": row.publication_text, "url": row.patent.source_url, "relevantExample": row.relevant_example}
                for row in related_rows(obj, "patent_references", "patent") if row.patent.publication_status == "Published" or request_can_view(self.context["request"], row.patent)]
        elif self.contract_key == "ingredients":
            from .search import eligible
            request = self.context["request"]
            products = eligible("products", request.user).filter(
                models.Q(composition__ingredient_id=obj.pk) | models.Q(formulation_id__in=eligible("formulations", request.user).filter(composition__ingredient_id=obj.pk).values("pk"))).distinct()
            forms = eligible("formulations", request.user).filter(composition__ingredient_id=obj.pk).exclude(
                pk__in=eligible("products", request.user).exclude(formulation_id=None).values("formulation_id")).distinct()
            data.setdefault("relatedProductIds", [])
            data.setdefault("relatedManufacturers", [])
            data.update(industrySector=obj.industry_sector.name if obj.industry_sector_id else "",
                recordKind="Chemical registry entry", isomericSmiles=obj.isomeric_smiles, inchi=obj.inchi,
                linkedListingCount=products.count()+forms.count(),
                markets=sorted({value for value in [*products.values_list("jurisdiction__name", flat=True), *forms.values_list("market_region", flat=True)] if value}),
                density=obj.density, ingredientType=obj.ingredient_type,
                synonyms=[row.synonym for row in obj.synonyms.all()],
                identifiers=[{"type": row.identifier_type, "value": row.identifier_value} for row in obj.identifiers.all()],
                scientificProperties=[{"name": row.property_name, "value": row.value,
                    "unit": row.unit.code if row.unit_id else "", "conditions": row.conditions}
                    for row in related_rows(obj, "scientific_properties", "unit")])
        elif self.contract_key == "manufacturers":
            names = [row.brand_name for row in visible_objects(obj.owned_brands.all(), self.context["request"])]
            data["brandPortfolio"] = list(dict.fromkeys([*obj.brand_portfolio, *names]))
            data.update(logoUrl=f'/api/v1/manufacturers/{obj.public_id}/logo/' if obj.logo and (obj.logo_verified or request_can_view(self.context['request'],obj)) else '',
                logoVerified=obj.logo_verified,logoSourceUrl=obj.logo_source_url,logoAttribution=obj.logo_attribution,recordKind='Stored company')
        elif self.contract_key == "regulatory/registrations":
            data["productName"] = obj.commercial_product.product_name if obj.commercial_product_id else obj.product_text
            data["approvalDate"] = obj.approval_date_text or (obj.effective_date.isoformat() if obj.effective_date else "")
            data["expiryDate"] = obj.expiry_date_text or (obj.expiry_date.isoformat() if obj.expiry_date else "")
        elif self.contract_key == "documents":
            data.setdefault("relatedProducts", [])
            data.setdefault("relatedIngredients", [])
            for association in related_rows(obj, "associations", "product", "ingredient"):
                if association.product_id and (association.product.publication_status == "Published" or request_can_view(self.context["request"], association.product)):
                    if association.product.product_name not in data["relatedProducts"]:
                        data["relatedProducts"].append(association.product.product_name)
                if association.ingredient_id and (association.ingredient.publication_status == "Published" or request_can_view(self.context["request"], association.ingredient)):
                    if association.ingredient.preferred_name not in data["relatedIngredients"]:
                        data["relatedIngredients"].append(association.ingredient.preferred_name)
            data["hasFile"] = bool(obj.file)
            data["downloadUrl"] = f"/api/v1/documents/{obj.public_id}/download/" if obj.file else None
        return data

def request_can_view(request, obj):
    return request.user.is_authenticated and request.user.has_perm(f"{obj._meta.app_label}.view_{obj._meta.model_name}")

SERIALIZERS = {
    key: type(spec["model"].split(".")[-1] + "Serializer", (CatalogSerializer,), {"contract_key": key})
    for key, spec in ENTITY_CONTRACTS.items()
}
