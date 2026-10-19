from django.conf import settings
from django.db import models
from apps.core.models import TimeStampedModel, EntityLinked

class ImportSource(TimeStampedModel):
    source_name = models.CharField(max_length=300)
    source_url = models.URLField(max_length=2000, blank=True)
    source_type = models.CharField(max_length=100, blank=True)
    license_information = models.TextField(blank=True)
    access_date = models.DateField(null=True, blank=True)
    verification_status = models.CharField(max_length=30, default="Unverified")

class ImportBatch(TimeStampedModel):
    import_type = models.CharField(max_length=100)
    filename = models.CharField(max_length=300)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=30, default="Preview")
    total_rows = models.PositiveIntegerField(default=0)
    valid_rows = models.PositiveIntegerField(default=0)
    imported_rows = models.PositiveIntegerField(default=0)
    rejected_rows = models.PositiveIntegerField(default=0)
    error_summary = models.JSONField(default=list, blank=True)
    sha256 = models.CharField(max_length=64)
    field_mapping = models.JSONField(default=dict, blank=True)
    source = models.ForeignKey(ImportSource, null=True, blank=True, on_delete=models.PROTECT)
    license_acknowledged = models.BooleanField(default=False)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["uploaded_by", "import_type", "sha256"], name="import_idempotent_batch")]

class ImportRow(TimeStampedModel, EntityLinked):
    batch = models.ForeignKey(ImportBatch, on_delete=models.CASCADE, related_name="rows")
    row_number = models.PositiveIntegerField()
    raw_data = models.JSONField(default=dict)
    normalized_data = models.JSONField(default=dict)
    validation_errors = models.JSONField(default=list, blank=True)
    import_status = models.CharField(max_length=30, default="Pending")
    class Meta:
        constraints = [models.UniqueConstraint(fields=["batch", "row_number"], name="import_unique_row")]
    # Pending/rejected rows have no linked record; their original source data is retained.
    def clean(self):
        if self.import_status == "Imported":
            EntityLinked.clean(self)
