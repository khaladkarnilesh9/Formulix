import uuid
from functools import reduce
from operator import or_
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from .validators import validate_http_url

class TimeStampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True

class PublicationStatus(models.TextChoices):
    DRAFT = "Draft"
    REVIEW = "In Review"
    APPROVED = "Approved"
    PUBLISHED = "Published"
    REJECTED = "Rejected"
    ARCHIVED = "Archived"

class PublishableModel(TimeStampedModel):
    publication_status = models.CharField(max_length=20, choices=PublicationStatus, default=PublicationStatus.DRAFT, db_index=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    published_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        abstract = True

class SourceTrackedModel(models.Model):
    source_type = models.CharField(max_length=80, blank=True)
    source_url = models.URLField(max_length=2000, blank=True, validators=[validate_http_url])
    source_title = models.TextField(blank=True)
    verification_status = models.CharField(max_length=20, choices=[(v, v) for v in ("Unverified", "Source linked", "Verified", "Demo", "Missing")], default="Unverified")
    last_verified_at = models.DateTimeField(null=True, blank=True)
    is_synthetic_demo = models.BooleanField(default=False)
    class Meta:
        abstract = True

class Entity(PublishableModel, SourceTrackedModel):
    legacy_id = models.CharField(max_length=100, null=True, blank=True, unique=True)
    legacy_payload = models.JSONField(default=dict, blank=True)
    version = models.PositiveIntegerField(default=1)
    class Meta:
        abstract = True
        ordering = ["-updated_at"]
    @property
    def public_id(self):
        return self.legacy_id or str(self.pk)
    def __str__(self):
        for name in ("product_name", "formulation_name", "preferred_name", "legal_name", "brand_name", "title", "registration_number", "publication_number"):
            if getattr(self, name, ""):
                return str(getattr(self, name))
        return self.public_id
    def clean(self):
        super().clean()
        if self.is_synthetic_demo and self.verification_status == "Verified":
            raise ValidationError("Demonstration data cannot be independently verified.")
        if self.verification_status == "Verified" and not (self.source_url or self.source_title):
            raise ValidationError("Verified classification requires a recorded source.")
        if self.publication_status == PublicationStatus.PUBLISHED:
            for field in self._meta.fields:
                if isinstance(field, models.ForeignKey) and getattr(self, field.attname, None):
                    related = getattr(self, field.name)
                    if isinstance(related, Entity) and related.publication_status != PublicationStatus.PUBLISHED:
                        raise ValidationError({field.name: "Related scientific records must be published first."})

class SourceReference(TimeStampedModel):
    source_title = models.CharField(max_length=500)
    source_type = models.CharField(max_length=80, blank=True)
    publisher = models.CharField(max_length=250, blank=True)
    source_url = models.URLField(max_length=2000, blank=True, validators=[validate_http_url])
    document_identifier = models.CharField(max_length=200, blank=True)
    publication_date = models.DateField(null=True, blank=True)
    accessed_at = models.DateTimeField(null=True, blank=True)
    license_information = models.TextField(blank=True)
    verification_status = models.CharField(max_length=30, default="Unverified")
    def __str__(self):
        return self.source_title

REFERENCE_FIELDS = ("product", "formulation", "ingredient", "manufacturer", "brand", "registration", "patent", "document")
def exactly_one_reference():
    return reduce(or_, (models.Q(**{field + "__isnull": field != chosen for field in REFERENCE_FIELDS}) for chosen in REFERENCE_FIELDS))

class EntityLinked(models.Model):
    product = models.ForeignKey("products.CommercialProduct", null=True, blank=True, on_delete=models.CASCADE, related_name="+")
    formulation = models.ForeignKey("formulations.Formulation", null=True, blank=True, on_delete=models.CASCADE, related_name="+")
    ingredient = models.ForeignKey("ingredients.Ingredient", null=True, blank=True, on_delete=models.CASCADE, related_name="+")
    manufacturer = models.ForeignKey("manufacturers.Manufacturer", null=True, blank=True, on_delete=models.CASCADE, related_name="+")
    brand = models.ForeignKey("brands.Brand", null=True, blank=True, on_delete=models.CASCADE, related_name="+")
    registration = models.ForeignKey("regulatory.RegulatoryRegistration", null=True, blank=True, on_delete=models.CASCADE, related_name="+")
    patent = models.ForeignKey("patents.Patent", null=True, blank=True, on_delete=models.CASCADE, related_name="+")
    document = models.ForeignKey("documents.TechnicalDocument", null=True, blank=True, on_delete=models.CASCADE, related_name="+")
    class Meta:
        abstract = True
        constraints = [models.CheckConstraint(condition=exactly_one_reference(), name="%(app_label)s_%(class)s_one_entity")]
    def clean(self):
        super().clean()
        if sum(bool(getattr(self, field + "_id")) for field in REFERENCE_FIELDS) != 1:
            raise ValidationError("Exactly one explicit scientific entity reference is required.")

class EntitySource(TimeStampedModel, EntityLinked):
    source = models.ForeignKey(SourceReference, on_delete=models.PROTECT, related_name="associations")
    field_path = models.CharField(max_length=200, blank=True)
    evidence_type = models.CharField(max_length=100, blank=True)
    supporting_notes = models.TextField(blank=True)
    class Meta(EntityLinked.Meta):
        abstract = False


class SearchDocument(models.Model):
    resource = models.CharField(max_length=50)
    object_id = models.UUIDField()
    normalized_text = models.TextField()
    source_text = models.TextField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["resource", "object_id"], name="search_unique_entity")]
