from django.conf import settings
from django.db import models
from apps.core.models import TimeStampedModel, EntityLinked

class AuditEvent(TimeStampedModel):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    actor_name = models.CharField(max_length=200)
    entity_type = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=100)
    entity_name = models.CharField(max_length=500, blank=True)
    action = models.CharField(max_length=100)
    summary = models.TextField(blank=True)
    changes = models.JSONField(default=dict, blank=True)
    class Meta:
        ordering = ["-created_at"]

class DataQualityIssue(TimeStampedModel, EntityLinked):
    issue_type = models.CharField(max_length=100)
    severity = models.CharField(max_length=20, choices=[(v, v) for v in ("High", "Medium", "Low")])
    description = models.TextField()
    field_path = models.CharField(max_length=200, blank=True)
    resolution_status = models.CharField(max_length=30, default="Open")
    detected_at = models.DateTimeField(auto_now_add=True)
    class Meta(EntityLinked.Meta):
        abstract = False

class ReviewTask(TimeStampedModel, EntityLinked):
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    review_status = models.CharField(max_length=30, default="Pending")
    reviewer_notes = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    class Meta(EntityLinked.Meta):
        abstract = False
        permissions = [("review_record", "Review scientific records"), ("publish_record", "Publish approved scientific records")]
