from django.db import models
from apps.core.models import Entity, TimeStampedModel
from apps.core.validators import validate_http_url
from .validators import validate_company_logo

class Manufacturer(Entity):
    legal_name = models.CharField(max_length=300, db_index=True)
    display_name = models.CharField(max_length=300, blank=True)
    company_type = models.CharField(max_length=100, blank=True)
    headquarters = models.CharField(max_length=300, blank=True)
    country = models.ForeignKey("taxonomy.Country", null=True, blank=True, on_delete=models.PROTECT)
    website = models.URLField(max_length=2000, blank=True, validators=[validate_http_url])
    description = models.TextField(blank=True)
    year_established = models.PositiveIntegerField(null=True, blank=True)
    primary_sector = models.ForeignKey("taxonomy.IndustrySector", null=True, blank=True, on_delete=models.PROTECT)
    sector_labels = models.JSONField(default=list, blank=True)
    product_categories = models.JSONField(default=list, blank=True)
    declared_product_count = models.PositiveIntegerField(null=True, blank=True)
    brand_portfolio = models.JSONField(default=list, blank=True)
    compliance_information = models.JSONField(default=list, blank=True)
    aliases = models.JSONField(default=list, blank=True, help_text='Reviewed exact company aliases; never fuzzy matches.')
    logo = models.ImageField(upload_to='manufacturers/logos/', blank=True, validators=[validate_company_logo])
    logo_source_url = models.URLField(max_length=2000, blank=True, validators=[validate_http_url])
    logo_source_type = models.CharField(max_length=50, blank=True)
    logo_verified = models.BooleanField(default=False)
    logo_attribution = models.TextField(blank=True)

    def clean(self):
        super().clean()
        from django.core.exceptions import ValidationError
        if not isinstance(self.aliases,list) or any(not isinstance(value,str) or not value.strip() for value in self.aliases):
            raise ValidationError({'aliases':'Use a list of reviewed, nonempty company names.'})
        if self.logo_verified and not (self.logo and (self.logo_source_url or self.logo_attribution)):
            raise ValidationError({'logo_verified':'A reviewed logo needs an uploaded image and source or attribution.'})

class ManufacturerSector(TimeStampedModel):
    manufacturer = models.ForeignKey(Manufacturer, on_delete=models.CASCADE, related_name="sectors")
    industry_sector = models.ForeignKey("taxonomy.IndustrySector", on_delete=models.PROTECT)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["manufacturer", "industry_sector"], name="manufacturer_unique_sector")]

class ManufacturerCapability(TimeStampedModel):
    manufacturer = models.ForeignKey(Manufacturer, on_delete=models.CASCADE, related_name="capabilities")
    capability_type = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    source = models.ForeignKey("core.SourceReference", null=True, blank=True, on_delete=models.PROTECT)

class ManufacturerFacility(TimeStampedModel):
    manufacturer = models.ForeignKey(Manufacturer, on_delete=models.CASCADE, related_name="facilities")
    facility_name = models.CharField(max_length=200)
    location = models.CharField(max_length=300, blank=True)
    country = models.ForeignKey("taxonomy.Country", null=True, blank=True, on_delete=models.PROTECT)
    facility_type = models.CharField(max_length=100, blank=True)
