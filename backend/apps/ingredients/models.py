from django.db import models
from apps.core.models import Entity, TimeStampedModel
from apps.core.validators import validate_cas

class Ingredient(Entity):
    preferred_name = models.CharField(max_length=300, db_index=True)
    common_name = models.CharField(max_length=300, blank=True)
    iupac_name = models.TextField(blank=True)
    cas_number = models.CharField(max_length=20, null=True, blank=True, unique=True, validators=[validate_cas])
    molecular_formula = models.CharField(max_length=200, blank=True, db_index=True)
    molecular_weight = models.DecimalField(max_digits=18, decimal_places=8, null=True, blank=True)
    canonical_smiles = models.TextField(blank=True)
    isomeric_smiles = models.TextField(blank=True)
    inchi = models.TextField(blank=True)
    inchikey = models.CharField(max_length=100, blank=True, db_index=True)
    logp = models.DecimalField(max_digits=12, decimal_places=6, null=True, blank=True)
    physical_state = models.CharField(max_length=300, blank=True)
    melting_point = models.CharField(max_length=300, blank=True)
    boiling_point = models.CharField(max_length=300, blank=True)
    density = models.CharField(max_length=300, blank=True)
    solubility = models.TextField(blank=True)
    chemical_class = models.CharField(max_length=200, blank=True)
    ingredient_type = models.CharField(max_length=100, blank=True)
    industry_sector = models.ForeignKey("taxonomy.IndustrySector", null=True, blank=True, on_delete=models.PROTECT)
    description = models.TextField(blank=True)
    hazard_statements = models.JSONField(default=list, blank=True)
    declared_product_count = models.PositiveIntegerField(null=True, blank=True)
    structure_svg_type = models.CharField(max_length=30, blank=True)
    class Meta(Entity.Meta):
        constraints = [models.CheckConstraint(condition=models.Q(molecular_weight__isnull=True) | models.Q(molecular_weight__gt=0), name="ingredient_positive_weight")]

class IngredientSynonym(TimeStampedModel):
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name="synonyms")
    synonym = models.CharField(max_length=300)
    synonym_type = models.CharField(max_length=100, blank=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["ingredient", "synonym"], name="ingredient_unique_synonym")]

class IngredientIdentifier(TimeStampedModel):
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name="identifiers")
    identifier_type = models.CharField(max_length=100)
    identifier_value = models.CharField(max_length=300)
    source = models.ForeignKey("core.SourceReference", null=True, blank=True, on_delete=models.PROTECT)

class IngredientProperty(TimeStampedModel):
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name="scientific_properties")
    property_name = models.CharField(max_length=100)
    value = models.TextField()
    unit = models.ForeignKey("taxonomy.MeasurementUnit", null=True, blank=True, on_delete=models.PROTECT)
    conditions = models.TextField(blank=True)
    source = models.ForeignKey("core.SourceReference", null=True, blank=True, on_delete=models.PROTECT)

class IngredientRelationship(TimeStampedModel):
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name="relationships")
    related_ingredient = models.ForeignKey(Ingredient, on_delete=models.PROTECT, related_name="+")
    relationship_type = models.CharField(max_length=100)
    source = models.ForeignKey("core.SourceReference", null=True, blank=True, on_delete=models.PROTECT)
    class Meta:
        constraints = [models.CheckConstraint(condition=~models.Q(ingredient=models.F("related_ingredient")), name="ingredient_not_self_relationship")]
