from django.db import models
from django.core.exceptions import ValidationError
from apps.core.models import Entity, TimeStampedModel
from apps.core.validators import validate_http_url

class RegulatoryAuthority(TimeStampedModel):
    name = models.CharField(max_length=300, unique=True)
    abbreviation = models.CharField(max_length=30, blank=True)
    country = models.ForeignKey("taxonomy.Country", null=True, blank=True, on_delete=models.PROTECT)
    jurisdiction = models.ForeignKey("taxonomy.Jurisdiction", null=True, blank=True, on_delete=models.PROTECT)
    official_website = models.URLField(max_length=2000, blank=True, validators=[validate_http_url])
    def __str__(self):
        return self.name

class RegulatoryRegistration(Entity):
    registration_number = models.CharField(max_length=200, db_index=True)
    commercial_product = models.ForeignKey("products.CommercialProduct", null=True, blank=True, on_delete=models.PROTECT, related_name="registrations")
    product_text = models.CharField(max_length=300, blank=True)
    active_ingredient_text = models.TextField(blank=True)
    regulatory_authority = models.ForeignKey(RegulatoryAuthority, null=True, blank=True, on_delete=models.PROTECT)
    registration_holder = models.CharField(max_length=300, blank=True)
    jurisdiction = models.ForeignKey("taxonomy.Jurisdiction", null=True, blank=True, on_delete=models.PROTECT)
    approval_status = models.CharField(max_length=50, default="Under Review")
    effective_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    approval_date_text = models.CharField(max_length=100, blank=True)
    expiry_date_text = models.CharField(max_length=100, blank=True)
    last_verified_text = models.CharField(max_length=100, blank=True)
    regulatory_category = models.CharField(max_length=100, blank=True)
    source_reference = models.TextField(blank=True)
    class Meta(Entity.Meta):
        constraints = [models.UniqueConstraint(fields=["registration_number", "regulatory_authority", "jurisdiction"], name="registration_unique_docket")]
    def clean(self):
        super().clean()
        if self.effective_date and self.expiry_date and self.expiry_date < self.effective_date:
            raise ValidationError("Expiry must not precede the effective date.")

class RegulatoryDecision(TimeStampedModel):
    registration = models.ForeignKey(RegulatoryRegistration, on_delete=models.CASCADE, related_name="decisions")
    decision_type = models.CharField(max_length=100)
    decision_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True)
    source = models.ForeignKey("core.SourceReference", null=True, blank=True, on_delete=models.PROTECT)

class RegulatoryDocument(TimeStampedModel):
    registration = models.ForeignKey(RegulatoryRegistration, on_delete=models.CASCADE, related_name="documents")
    document = models.ForeignKey("documents.TechnicalDocument", on_delete=models.PROTECT)
    document_type = models.CharField(max_length=100, blank=True)
