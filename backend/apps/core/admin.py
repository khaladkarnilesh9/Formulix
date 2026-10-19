from django.apps import apps
from django.contrib import admin
from django.db import models

from apps.core.admin_support import EntityAdmin, ImmutableAdmin, ScientificAdmin, ScientificInline
from apps.core.models import Entity, REFERENCE_FIELDS
from apps.formulations.admin import FormulationAdmin
from apps.manufacturers.admin_support import ManufacturerAdmin

admin.site.site_header = "Formulix Data Administration"
admin.site.site_title = "Formulix Admin"
admin.site.index_title = "Scientific and Commercial Records"
admin.site.index_template = "admin/formulix_index.html"

INLINE_CONFIG = {
    "ingredients.Ingredient": [
        ("ingredients.IngredientSynonym", "ingredient"),
        ("ingredients.IngredientIdentifier", "ingredient"),
        ("ingredients.IngredientProperty", "ingredient"),
        ("ingredients.IngredientRelationship", "ingredient"),
        ("core.EntitySource", "ingredient"),
    ],
    "formulations.Formulation": [
        ("formulations.FormulationIngredient", "formulation"),
        ("formulations.FormulationManufacturingStep", "formulation"),
        ("formulations.FormulationTechnicalProperty", "formulation"),
        ("formulations.FormulationQualityControl", "formulation"),
        ("formulations.FormulationPackaging", "formulation"),
        ("formulations.FormulationSource", "formulation"),
        ("patents.PatentFormulation", "formulation"),
    ],
    "products.CommercialProduct": [
        ("products.ProductActiveIngredient", "product"),
        ("products.ProductRegistrationLink", "product"),
        ("products.ProductDocumentLink", "product"),
        ("products.ProductPatentLink", "product"),
        ("products.ProductPackaging", "product"),
        ("core.EntitySource", "product"),
    ],
    "manufacturers.Manufacturer": [
        ("manufacturers.ManufacturerSector", "manufacturer"),
        ("manufacturers.ManufacturerCapability", "manufacturer"),
        ("manufacturers.ManufacturerFacility", "manufacturer"),
        ("brands.Brand", "owner"),
        ("core.EntitySource", "manufacturer"),
    ],
    "brands.Brand": [("core.EntitySource", "brand")],
    "regulatory.RegulatoryRegistration": [
        ("regulatory.RegulatoryDecision", "registration"),
        ("regulatory.RegulatoryDocument", "registration"),
        ("core.EntitySource", "registration"),
    ],
    "patents.Patent": [
        ("patents.PatentClaim", "patent"),
        ("patents.PatentIngredient", "patent"),
        ("patents.PatentFormulation", "patent"),
        ("products.ProductPatentLink", "patent"),
        ("patents.PatentEvidence", "patent"),
    ],
    "documents.TechnicalDocument": [("documents.DocumentAssociation", "technical_document")],
    "workspace.ResearchNote": [("workspace.ResearchNoteLink", "note")],
    "workspace.ResearchCollection": [("workspace.CollectionItem", "collection")],
}

def searchable_fields(model):
    fields = [field.name for field in model._meta.fields if isinstance(field, (models.CharField, models.TextField))]
    for field in model._meta.fields:
        if isinstance(field, models.ForeignKey):
            related = field.remote_field.model
            names = {item.name for item in related._meta.fields}
            label = next((name for name in ("username", "name", "product_name", "formulation_name", "preferred_name", "legal_name", "brand_name", "title", "source_title") if name in names), None)
            if label:
                fields.append(field.name + "__" + label)
    return tuple(fields[:12])

def autocomplete(model, exclude=()):
    return tuple(field.name for field in [*model._meta.fields, *model._meta.many_to_many]
                 if field.is_relation and not field.auto_created and field.name not in exclude)

def make_inline(label, fk_name):
    model = apps.get_model(label)
    excluded = tuple(name for name in REFERENCE_FIELDS if hasattr(model, name) and name != fk_name)
    config = {
        "model": model, "fk_name": fk_name, "exclude": excluded,
        "autocomplete_fields": autocomplete(model, (*excluded, fk_name)),
        "__module__": __name__,
    }
    # Brand publication remains on its standalone editor, not an unguarded company inline.
    if issubclass(model, Entity):
        config["readonly_fields"] = ("publication_status", "created_by", "reviewed_by", "published_by", "reviewed_at", "published_at", "version", "legacy_payload")
    if model._meta.model_name in ("formulationingredient", "productactiveingredient", "formulationmanufacturingstep"):
        config["template"] = "admin/edit_inline/stacked.html"
    return type(model.__name__ + fk_name.title() + "Inline", (ScientificInline,), config)

for app in apps.get_app_configs():
    if not app.name.startswith("apps.") or app.label == "accounts":
        continue
    for model in app.get_models():
        if model._meta.label == "core.SearchDocument":
            continue
        names = {field.name for field in model._meta.fields}
        base = EntityAdmin if issubclass(model, Entity) else ScientificAdmin
        if model._meta.label == "formulations.Formulation":
            base = FormulationAdmin
        if model._meta.label == "manufacturers.Manufacturer":
            base = ManufacturerAdmin
        if model._meta.label in ("audit.AuditEvent", "workspace.WorkspaceAuditEvent", "imports.ImportRow", "imports.ImportBatch"):
            base = ImmutableAdmin
        displays = ["record_label"]
        for name in ("publication_status", "verification_status", "industry_sector", "country", "approval_status", "severity", "resolution_status", "owner", "updated_at"):
            if name in names and len(displays) < 6:
                displays.append(name)
        filters = tuple(name for name in (
            "publication_status", "verification_status", "industry_sector", "country",
            "document_type", "approval_status", "severity", "resolution_status", "is_active", "company_type", "category", "status"
        ) if name in names)
        readonly = ("owner", "created_by", "reviewed_by", "published_by")
        config = {
            "list_display": tuple(displays), "list_filter": filters, "search_fields": searchable_fields(model),
            "ordering": ("-updated_at",), "autocomplete_fields": autocomplete(model, readonly),
            "inlines": tuple(make_inline(label, fk) for label, fk in INLINE_CONFIG.get(model._meta.label, ())),
            "__module__": __name__,
        }
        if model._meta.label == "formulations.Formulation":
            config.update(
                list_display=("record_label", "company_name", "market_region", "product_classification", "formulation_type_text", "active_ingredient_text", "publication_status"),
                list_filter=("market_region", "publication_status", "verification_status", "formulation_type_text"),
                search_fields=("formulation_name", "company_name", "active_ingredient_text", "registration_number_text", "target_pests_text", "patent_reference_text"),
            )
        if "file" in names:
            config["exclude"] = ("file_size", "mime_type")
        admin.site.register(model, type(model.__name__ + "Admin", (base,), config))
