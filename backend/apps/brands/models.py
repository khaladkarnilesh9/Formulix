from django.db import models
from apps.core.models import Entity

class Brand(Entity):
    brand_name = models.CharField(max_length=200, db_index=True)
    owner = models.ForeignKey("manufacturers.Manufacturer", null=True, blank=True, on_delete=models.PROTECT, related_name="owned_brands")
    manufacturer = models.ForeignKey("manufacturers.Manufacturer", null=True, blank=True, on_delete=models.PROTECT, related_name="manufactured_brands")
    country = models.ForeignKey("taxonomy.Country", null=True, blank=True, on_delete=models.PROTECT)
    industry_sector = models.ForeignKey("taxonomy.IndustrySector", null=True, blank=True, on_delete=models.PROTECT)
    description = models.TextField(blank=True)
    trademark_status = models.CharField(max_length=100, blank=True)
