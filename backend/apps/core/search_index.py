import json
import unicodedata

from django.apps import apps
from django.db.models.signals import post_delete, post_save, pre_save

from .contracts import ENTITY_CONTRACTS
from .models import SearchDocument
from .search import fields_for, normalize

RESOURCES = {spec["model"].lower(): resource for resource, spec in ENTITY_CONTRACTS.items()}
CHILDREN = {
    "ingredients.ingredientsynonym": [("ingredient_id", "ingredients")],
    "ingredients.ingredientidentifier": [("ingredient_id", "ingredients")],
    "formulations.formulationingredient": [("formulation_id", "formulations")],
    "products.productactiveingredient": [("product_id", "products")],
}


def document_values(resource, identity, using="default"):
    model = apps.get_model(ENTITY_CONTRACTS[resource]["model"])
    values = model.objects.using(using).filter(pk=identity).values(*fields_for(resource))
    texts = set()
    found = False
    for row in values:
        found = True
        for value in row.values():
            if value is not None:
                texts.add(json.dumps(value, ensure_ascii=False) if isinstance(value, (dict, list)) else str(value))
    if not found:
        return None
    source = "\n".join(sorted(texts))
    cas_source = unicodedata.normalize("NFKC", source).translate(str.maketrans({char: "-" for char in "\u2010\u2011\u2012\u2013\u2014\u2212"}))
    return {"source_text": cas_source, "normalized_text": normalize(source)}


def remember_previous_parent(sender, instance, using="default", **kwargs):
    parents = CHILDREN.get(sender._meta.label_lower, [])
    if not parents or not instance.pk:
        return
    previous = sender.objects.using(using).filter(pk=instance.pk).values(*[field for field, _ in parents]).first()
    instance._search_previous_parents = [(resource, previous[field]) for field, resource in parents
        if previous and previous[field] and previous[field] != getattr(instance, field)]


def update_document(resource, identity, using="default"):
    values = document_values(resource, identity, using)
    manager = SearchDocument.objects.using(using)
    if values is None:
        manager.filter(resource=resource, object_id=identity).delete()
    else:
        manager.update_or_create(resource=resource, object_id=identity, defaults=values)


def synchronize(sender, instance, using="default", raw=False, **kwargs):
    if raw:
        return
    resource = RESOURCES.get(sender._meta.label_lower)
    if resource:
        update_document(resource, instance.pk, using)
    for foreign_key, parent in CHILDREN.get(sender._meta.label_lower, []):
        identity = getattr(instance, foreign_key)
        if identity:
            update_document(parent, identity, using)
    for parent, identity in getattr(instance, "_search_previous_parents", []):
        update_document(parent, identity, using)
    if sender._meta.app_label == "taxonomy":
        for target, spec in ENTITY_CONTRACTS.items():
            model = apps.get_model(spec["model"])
            for field in model._meta.fields:
                if field.is_relation and field.related_model == sender:
                    for identity in model.objects.using(using).filter(**{field.name: instance.pk}).values_list("pk", flat=True).iterator():
                        update_document(target, identity, using)


def connect_signals():
    pre_save.connect(remember_previous_parent, dispatch_uid="search_document_parent", weak=False)
    post_save.connect(synchronize, dispatch_uid="search_document_save", weak=False)
    post_delete.connect(synchronize, dispatch_uid="search_document_delete", weak=False)
