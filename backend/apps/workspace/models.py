from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from apps.core.models import TimeStampedModel, EntityLinked, REFERENCE_FIELDS

class OwnedModel(TimeStampedModel):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    class Meta:
        abstract = True

class ResearchWorkspace(OwnedModel):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

class SavedItem(OwnedModel, EntityLinked):
    saved_at = models.DateTimeField(auto_now_add=True)
    class Meta(EntityLinked.Meta):
        abstract = False
        constraints = EntityLinked.Meta.constraints + [
            models.UniqueConstraint(fields=["owner", field], condition=models.Q(**{field + "__isnull": False}), name="saved_unique_" + field) for field in REFERENCE_FIELDS]

class ResearchNote(OwnedModel):
    legacy_id = models.CharField(max_length=100, blank=True)
    title = models.CharField(max_length=300)
    content = models.TextField(blank=True)
    category = models.CharField(max_length=100, blank=True)
    tags = models.JSONField(default=list, blank=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["owner", "legacy_id"], condition=~models.Q(legacy_id=""), name="note_owner_legacy_id")]

class ResearchNoteLink(TimeStampedModel, EntityLinked):
    note = models.ForeignKey(ResearchNote, on_delete=models.CASCADE, related_name="links")
    supporting_notes = models.TextField(blank=True)
    class Meta(EntityLinked.Meta):
        abstract = False

class ResearchCollection(OwnedModel):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

class CollectionItem(TimeStampedModel, EntityLinked):
    collection = models.ForeignKey(ResearchCollection, on_delete=models.CASCADE, related_name="items")
    class Meta(EntityLinked.Meta):
        abstract = False

class WorkspacePreference(OwnedModel):
    theme = models.CharField(max_length=10, choices=[("light", "Light"), ("dark", "Dark")], default="light")
    recent_searches = models.JSONField(default=list, blank=True)
    comparison_products = models.ManyToManyField("products.CommercialProduct", blank=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["owner"], name="workspace_single_preferences")]
    def clean(self):
        super().clean()
        if not isinstance(self.recent_searches, list):
            raise ValidationError("Recent searches must be an array.")

class WorkspaceAuditEvent(OwnedModel):
    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=100, blank=True)
    entity_name = models.CharField(max_length=300, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
