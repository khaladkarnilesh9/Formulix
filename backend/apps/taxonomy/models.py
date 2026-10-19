from django.db import models
from apps.core.models import TimeStampedModel

class NamedReference(TimeStampedModel):
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    class Meta:
        abstract = True
        ordering = ["name"]
    def __str__(self):
        return self.name

class IndustrySector(NamedReference):
    slug = models.SlugField(unique=True)

class ProductCategory(NamedReference):
    slug = models.SlugField(unique=True)
    industry_sector = models.ForeignKey(IndustrySector, on_delete=models.PROTECT)
    parent_category = models.ForeignKey("self", null=True, blank=True, on_delete=models.PROTECT)

class FormulationType(NamedReference):
    code = models.CharField(max_length=30, unique=True)
    full_name = models.CharField(max_length=200)
    industry_sector = models.ForeignKey(IndustrySector, null=True, blank=True, on_delete=models.PROTECT)

class ChemicalFunction(NamedReference):
    category = models.CharField(max_length=100, blank=True)

class Country(NamedReference):
    code = models.CharField(max_length=3, blank=True)

class Jurisdiction(NamedReference):
    country = models.ForeignKey(Country, null=True, blank=True, on_delete=models.PROTECT)

class MeasurementUnit(NamedReference):
    code = models.CharField(max_length=50, unique=True)
    concentration_basis = models.CharField(max_length=50, blank=True)

class Vocabulary(TimeStampedModel):
    key = models.CharField(max_length=100, unique=True)
    values = models.JSONField(default=list)
    def __str__(self):
        return self.key
