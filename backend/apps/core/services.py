from uuid import UUID
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied
from apps.audit.models import AuditEvent
from .models import PublicationStatus

def by_identity(model, identity):
    query = Q(legacy_id=str(identity))
    try:
        query |= Q(pk=UUID(str(identity)))
    except (ValueError, TypeError, AttributeError):
        pass
    return model.objects.filter(query).first()

def can_view_all(user, model):
    return bool(user.is_authenticated and user.has_perm(f"{model._meta.app_label}.view_{model._meta.model_name}"))

def audit(actor, obj, action, summary="", changes=None):
    return AuditEvent.objects.create(actor=actor if actor.is_authenticated else None,
        actor_name=actor.get_username() if actor.is_authenticated else "",
        entity_type=obj._meta.label, entity_id=str(obj.pk), entity_name=str(obj),
        action=action, summary=summary, changes=changes or {})

@transaction.atomic
def transition(obj, target, actor, notes=""):
    obj = type(obj).objects.select_for_update().get(pk=obj.pk)
    target = {"Submitted for Review": "In Review"}.get(target, target)
    allowed = {
        "Draft": {"In Review"}, "In Review": {"Approved", "Rejected", "Draft"},
        "Approved": {"Published", "Draft"}, "Published": {"Archived", "Draft"},
        "Rejected": {"Draft"}, "Archived": {"Draft"},
    }
    if target not in allowed.get(obj.publication_status, set()):
        raise ValidationError("Submit, approve, and publish in order; no direct Draft-to-Published transition.")
    permission = "audit.publish_record" if target in ("Published", "Archived") else (
        "audit.review_record" if target in ("Approved", "Rejected") or obj.publication_status == "Published"
        else f"{obj._meta.app_label}.change_{obj._meta.model_name}")
    if not actor.has_perm(permission):
        raise PermissionDenied("This publication transition requires an authorized role.")
    previous = obj.publication_status
    obj.publication_status = target
    if target == PublicationStatus.APPROVED:
        obj.reviewed_by, obj.reviewed_at = actor, timezone.now()
    if target == PublicationStatus.PUBLISHED:
        obj.published_by, obj.published_at = actor, timezone.now()
        for relation_name in ("composition",):
            if hasattr(obj, relation_name):
                for child in getattr(obj, relation_name).all():
                    child.full_clean()
                    if child.ingredient_id and child.ingredient.publication_status != "Published":
                        raise ValidationError("Composition ingredients must be published first.")
    obj.version += 1
    obj.full_clean()
    obj.save()
    audit(actor, obj, target, notes, {"publication_status": {"before": previous, "after": target}})
    return obj
