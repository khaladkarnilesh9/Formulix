from django.db import models
from apps.core.models import Entity, TimeStampedModel, EntityLinked

class TechnicalDocument(Entity):
    title = models.CharField(max_length=500)
    document_type = models.CharField(max_length=100, db_index=True)
    document_number = models.CharField(max_length=200, blank=True, db_index=True)
    description = models.TextField(blank=True)
    issuer = models.CharField(max_length=300, blank=True)
    publication_date = models.DateField(null=True, blank=True)
    publication_date_text = models.CharField(max_length=100, blank=True)
    file = models.FileField(upload_to="documents/%Y/%m/", blank=True)
    is_restricted = models.BooleanField(default=True)
    mime_type = models.CharField(max_length=100, blank=True)
    file_size = models.PositiveBigIntegerField(null=True, blank=True)
    declared_file_size = models.CharField(max_length=100, blank=True)
    declared_format = models.CharField(max_length=30, blank=True)
    language = models.CharField(max_length=50, blank=True)
    verification_label = models.CharField(max_length=100, blank=True)

class DocumentAssociation(TimeStampedModel, EntityLinked):
    technical_document = models.ForeignKey(TechnicalDocument, on_delete=models.CASCADE, related_name="associations")
    evidence_notes = models.TextField(blank=True)
    class Meta(EntityLinked.Meta):
        abstract = False
