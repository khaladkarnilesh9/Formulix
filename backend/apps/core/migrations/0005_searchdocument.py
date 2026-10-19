from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("core", "0004_initial")]
    operations = [migrations.CreateModel(name="SearchDocument", fields=[
        ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
        ("resource", models.CharField(max_length=50)), ("object_id", models.UUIDField()),
        ("normalized_text", models.TextField()), ("source_text", models.TextField()),
        ("updated_at", models.DateTimeField(auto_now=True)),
    ], options={"constraints": [models.UniqueConstraint(fields=("resource", "object_id"), name="search_unique_entity")]})]
