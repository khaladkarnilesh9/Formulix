from django.db import models
from apps.core.models import Entity, TimeStampedModel
from apps.formulations.models import ConcentrationModel

class CommercialProduct(Entity):
    product_name = models.CharField(max_length=300, db_index=True)
    generic_name = models.CharField(max_length=300, blank=True)
    brand = models.ForeignKey("brands.Brand", null=True, blank=True, on_delete=models.PROTECT, related_name="products")
    manufacturer = models.ForeignKey("manufacturers.Manufacturer", null=True, blank=True, on_delete=models.PROTECT, related_name="products")
    registrant = models.ForeignKey("manufacturers.Manufacturer", null=True, blank=True, on_delete=models.PROTECT, related_name="registered_products")
    formulation = models.ForeignKey("formulations.Formulation", null=True, blank=True, on_delete=models.PROTECT, related_name="products")
    industry_sector = models.ForeignKey("taxonomy.IndustrySector", null=True, blank=True, on_delete=models.PROTECT)
    product_category = models.ForeignKey("taxonomy.ProductCategory", null=True, blank=True, on_delete=models.PROTECT)
    formulation_type = models.ForeignKey("taxonomy.FormulationType", null=True, blank=True, on_delete=models.PROTECT)
    formulation_type_text = models.CharField(max_length=300, blank=True)
    active_ingredient_text = models.TextField(blank=True)
    cas_text = models.CharField(max_length=200, blank=True)
    manufacturer_text = models.CharField(max_length=300, blank=True)
    strength = models.CharField(max_length=300, blank=True)
    jurisdiction = models.ForeignKey("taxonomy.Jurisdiction", null=True, blank=True, on_delete=models.PROTECT)
    registration_status = models.CharField(max_length=50, default="Under Review")
    registration_number = models.CharField(max_length=200, blank=True, db_index=True)
    regulatory_authority_text = models.CharField(max_length=300, blank=True)
    data_source = models.TextField(blank=True)
    last_verified_text = models.CharField(max_length=100, blank=True)
    verification_evidence = models.CharField(max_length=100, default="Imported unverified")
    description = models.TextField(blank=True)
    intended_use = models.TextField(blank=True)
    indications_or_pests = models.JSONField(default=list, blank=True)
    commercial_status = models.CharField(max_length=100, blank=True)
    specifications = models.JSONField(default=dict, blank=True)

class ProductActiveIngredient(ConcentrationModel):
    product = models.ForeignKey(CommercialProduct, on_delete=models.CASCADE, related_name="composition")

class ProductRegistrationLink(TimeStampedModel):
    product = models.ForeignKey(CommercialProduct, on_delete=models.CASCADE, related_name="registration_links")
    registration = models.ForeignKey("regulatory.RegulatoryRegistration", on_delete=models.PROTECT)
    evidence_notes = models.TextField(blank=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["product", "registration"], name="product_unique_registration")]

class ProductDocumentLink(TimeStampedModel):
    product = models.ForeignKey(CommercialProduct, on_delete=models.CASCADE, related_name="document_links")
    document = models.ForeignKey("documents.TechnicalDocument", on_delete=models.PROTECT)
    evidence_notes = models.TextField(blank=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["product", "document"], name="product_unique_document")]

class ProductPatentLink(TimeStampedModel):
    product = models.ForeignKey(CommercialProduct, on_delete=models.CASCADE, related_name="patent_links")
    patent = models.ForeignKey("patents.Patent", on_delete=models.PROTECT)
    evidence_notes = models.TextField(blank=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["product", "patent"], name="product_unique_patent")]

class ProductPackaging(TimeStampedModel):
    product = models.ForeignKey(CommercialProduct, on_delete=models.CASCADE, related_name="packaging")
    packaging_type = models.CharField(max_length=100, blank=True)
    pack_size = models.CharField(max_length=200, blank=True)
    unit = models.ForeignKey("taxonomy.MeasurementUnit", null=True, blank=True, on_delete=models.PROTECT)
    notes = models.TextField(blank=True)
