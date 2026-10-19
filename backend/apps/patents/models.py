from django.db import models
from apps.core.models import Entity, TimeStampedModel

class PatentFamily(TimeStampedModel):
    family_identifier = models.CharField(max_length=200, unique=True)
    source = models.ForeignKey("core.SourceReference", null=True, blank=True, on_delete=models.PROTECT)
    def __str__(self):
        return self.family_identifier

class Patent(Entity):
    publication_number = models.CharField(max_length=200, unique=True)
    application_number = models.CharField(max_length=200, blank=True)
    title = models.CharField(max_length=500)
    abstract = models.TextField(blank=True)
    applicant = models.CharField(max_length=300, blank=True)
    inventors = models.JSONField(default=list, blank=True)
    jurisdiction = models.ForeignKey("taxonomy.Jurisdiction", null=True, blank=True, on_delete=models.PROTECT)
    priority_date = models.DateField(null=True, blank=True)
    filing_date = models.DateField(null=True, blank=True)
    publication_date = models.DateField(null=True, blank=True)
    grant_date = models.DateField(null=True, blank=True)
    patent_status = models.CharField(max_length=100, blank=True)
    family = models.ForeignKey(PatentFamily, null=True, blank=True, on_delete=models.PROTECT)

class PatentIngredient(TimeStampedModel):
    patent = models.ForeignKey(Patent, on_delete=models.CASCADE, related_name="ingredients")
    ingredient = models.ForeignKey("ingredients.Ingredient", on_delete=models.PROTECT)
    evidence_notes = models.TextField(blank=True)

class PatentFormulation(TimeStampedModel):
    patent = models.ForeignKey(Patent, on_delete=models.PROTECT)
    formulation = models.ForeignKey("formulations.Formulation", on_delete=models.CASCADE, related_name="patent_references")
    publication_text = models.CharField(max_length=200, blank=True)
    relevant_example = models.TextField(blank=True)
    source = models.ForeignKey("core.SourceReference", null=True, blank=True, on_delete=models.PROTECT)

class PatentClaim(TimeStampedModel):
    patent = models.ForeignKey(Patent, on_delete=models.CASCADE, related_name="claims")
    claim_number = models.PositiveIntegerField()
    claim_text = models.TextField()
    claim_type = models.CharField(max_length=100, blank=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["patent", "claim_number"], name="patent_unique_claim")]

class PatentEvidence(TimeStampedModel):
    patent = models.ForeignKey(Patent, on_delete=models.CASCADE, related_name="evidence")
    evidence_type = models.CharField(max_length=100)
    ingredient = models.ForeignKey("ingredients.Ingredient", null=True, blank=True, on_delete=models.PROTECT)
    formulation = models.ForeignKey("formulations.Formulation", null=True, blank=True, on_delete=models.PROTECT)
    product = models.ForeignKey("products.CommercialProduct", null=True, blank=True, on_delete=models.PROTECT)
    source = models.ForeignKey("core.SourceReference", on_delete=models.PROTECT)
    source_reference = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    class Meta:
        constraints = [models.CheckConstraint(condition=(
            models.Q(ingredient__isnull=False, formulation__isnull=True, product__isnull=True) |
            models.Q(ingredient__isnull=True, formulation__isnull=False, product__isnull=True) |
            models.Q(ingredient__isnull=True, formulation__isnull=True, product__isnull=False)), name="patent_evidence_one_entity")]
