from decimal import Decimal, InvalidOperation
from django.core.exceptions import ValidationError
from django.db import models
from apps.core.models import Entity, TimeStampedModel
from apps.core.validators import validate_cas

class Formulation(Entity):
    formulation_name = models.CharField(max_length=300, db_index=True)
    formulation_code = models.CharField(max_length=100, blank=True)
    industry_sector = models.ForeignKey("taxonomy.IndustrySector", null=True, blank=True, on_delete=models.PROTECT)
    product_category = models.ForeignKey("taxonomy.ProductCategory", null=True, blank=True, on_delete=models.PROTECT)
    formulation_type = models.ForeignKey("taxonomy.FormulationType", null=True, blank=True, on_delete=models.PROTECT)
    formulation_type_text = models.CharField(max_length=300, blank=True)
    description = models.TextField(blank=True)
    intended_application = models.TextField(blank=True)
    target_industry = models.CharField(max_length=300, blank=True)
    target_use = models.TextField(blank=True)
    formulation_status = models.CharField(max_length=100, blank=True)
    verification_label = models.CharField(max_length=100, blank=True)
    verification_evidence = models.CharField(max_length=100, default="Imported unverified")
    source_reference = models.TextField(blank=True)
    is_commercial = models.BooleanField(default=False)
    process_overview = models.TextField(blank=True)
    processing_conditions = models.JSONField(default=list, blank=True)
    equipment = models.JSONField(default=list, blank=True)
    company_name = models.TextField(blank=True)
    market_region = models.CharField(max_length=100, blank=True, db_index=True)
    product_classification = models.TextField(blank=True)
    active_ingredient_text = models.TextField(blank=True)
    dispersing_agent_text = models.TextField(blank=True)
    carrier_solvent_text = models.TextField(blank=True)
    functional_excipients_text = models.TextField(blank=True)
    density_text = models.TextField(blank=True)
    ph_range_text = models.TextField(blank=True)
    registration_number_text = models.TextField(blank=True)
    flash_point_text = models.TextField(blank=True)
    viscosity_text = models.TextField(blank=True)
    who_hazard_classification = models.TextField(blank=True)
    toxicity_color_band = models.TextField(blank=True)
    patent_reference_text = models.TextField(blank=True)
    target_pests_text = models.TextField(blank=True)
    import_key = models.CharField(max_length=64, unique=True, null=True, blank=True, editable=False)
    source_sheet = models.CharField(max_length=200, blank=True)
    source_row = models.PositiveIntegerField(null=True, blank=True)

class ConcentrationModel(TimeStampedModel):
    ingredient = models.ForeignKey("ingredients.Ingredient", null=True, blank=True, on_delete=models.PROTECT)
    ingredient_text = models.CharField(max_length=300, blank=True)
    cas_text = models.CharField(max_length=100, blank=True)
    chemical_function = models.ForeignKey("taxonomy.ChemicalFunction", null=True, blank=True, on_delete=models.PROTECT)
    function_text = models.CharField(max_length=300, blank=True)
    category_text = models.CharField(max_length=100, blank=True)
    concentration_text = models.CharField(max_length=300, blank=True)
    concentration_value = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    concentration_min = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    concentration_max = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    concentration_unit = models.ForeignKey("taxonomy.MeasurementUnit", null=True, blank=True, on_delete=models.PROTECT)
    unit_text = models.CharField(max_length=100, blank=True)
    concentration_basis = models.CharField(max_length=100, blank=True)
    sequence = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)
    source_evidence = models.CharField(max_length=100, default="Imported unverified")
    source = models.ForeignKey("core.SourceReference", null=True, blank=True, on_delete=models.PROTECT)
    class Meta:
        abstract = True
        ordering = ["sequence", "created_at"]
        constraints = [
            models.CheckConstraint(condition=models.Q(concentration_value__isnull=True) | models.Q(concentration_value__gte=0), name="%(app_label)s_%(class)s_nonnegative"),
            models.CheckConstraint(condition=models.Q(concentration_min__isnull=True) | models.Q(concentration_max__isnull=True) | models.Q(concentration_min__lte=models.F("concentration_max")), name="%(app_label)s_%(class)s_range")]
    def clean(self):
        super().clean()
        if self.cas_text and self.cas_text not in ("N/A", "Not recorded"):
            validate_cas(self.cas_text)
        unit = self.concentration_unit.code if self.concentration_unit_id else self.unit_text
        if unit in ("% w/w", "% w/v"):
            for number in (self.concentration_value, self.concentration_min, self.concentration_max):
                if number is not None and not 0 <= number <= 100:
                    raise ValidationError("Percentage concentrations must be between 0 and 100.")
            if self.concentration_text:
                try:
                    value = Decimal(self.concentration_text)
                except InvalidOperation:
                    pass  # Ranges and source text remain exact; no guessed numeric conversion.
                else:
                    if not 0 <= value <= 100:
                        raise ValidationError("Recorded percentage is out of range.")

class FormulationIngredient(ConcentrationModel):
    formulation = models.ForeignKey(Formulation, on_delete=models.CASCADE, related_name="composition")

class FormulationTechnicalProperty(TimeStampedModel):
    formulation = models.ForeignKey(Formulation, on_delete=models.CASCADE, related_name="technical_properties")
    property_name = models.CharField(max_length=100)
    value = models.TextField(blank=True)
    unit = models.ForeignKey("taxonomy.MeasurementUnit", null=True, blank=True, on_delete=models.PROTECT)
    test_method = models.TextField(blank=True)
    test_conditions = models.TextField(blank=True)
    source = models.ForeignKey("core.SourceReference", null=True, blank=True, on_delete=models.PROTECT)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["formulation", "property_name"], name="formulation_unique_property")]

class FormulationManufacturingStep(TimeStampedModel):
    formulation = models.ForeignKey(Formulation, on_delete=models.CASCADE, related_name="manufacturing_steps")
    step_number = models.PositiveIntegerField()
    operation_name = models.CharField(max_length=200, blank=True)
    equipment = models.TextField(blank=True)
    description = models.TextField(blank=True)
    temperature = models.CharField(max_length=100, blank=True)
    mixing_time = models.CharField(max_length=100, blank=True)
    process_parameters = models.JSONField(default=dict, blank=True)
    quality_checkpoint = models.TextField(blank=True)
    source = models.ForeignKey("core.SourceReference", null=True, blank=True, on_delete=models.PROTECT)
    class Meta:
        ordering = ["step_number"]
        constraints = [models.UniqueConstraint(fields=["formulation", "step_number"], name="formulation_unique_step")]

class FormulationQualityControl(TimeStampedModel):
    formulation = models.ForeignKey(Formulation, on_delete=models.CASCADE, related_name="quality_controls")
    test_name = models.CharField(max_length=200)
    specification = models.TextField(blank=True)
    method = models.TextField(blank=True)
    acceptance_criteria = models.TextField(blank=True)
    source = models.ForeignKey("core.SourceReference", null=True, blank=True, on_delete=models.PROTECT)

class FormulationPackaging(TimeStampedModel):
    formulation = models.ForeignKey(Formulation, on_delete=models.CASCADE, related_name="packaging")
    packaging_type = models.CharField(max_length=100, blank=True)
    material = models.CharField(max_length=200, blank=True)
    pack_size = models.CharField(max_length=200, blank=True)
    storage_conditions = models.TextField(blank=True)
    shelf_life = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)

class FormulationSource(TimeStampedModel):
    formulation = models.ForeignKey(Formulation, on_delete=models.CASCADE, related_name="sources")
    source = models.ForeignKey("core.SourceReference", on_delete=models.PROTECT)
    evidence_type = models.CharField(max_length=100, blank=True)
    supporting_notes = models.TextField(blank=True)
