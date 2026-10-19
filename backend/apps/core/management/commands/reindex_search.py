from django.apps import apps
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.core.contracts import ENTITY_CONTRACTS
from apps.core.models import SearchDocument
from apps.core.search_index import document_values


class Command(BaseCommand):
    help = "Rebuild derived search documents only; scientific entities are not modified."

    def handle(self, *args, **options):
        with transaction.atomic():
            for resource, spec in ENTITY_CONTRACTS.items():
                model = apps.get_model(spec["model"])
                batch = []
                count = 0
                for identity in model.objects.order_by("pk").values_list("pk", flat=True).iterator(chunk_size=200):
                    values = document_values(resource, identity)
                    batch.append(SearchDocument(resource=resource, object_id=identity, updated_at=timezone.now(), **values))
                    count += 1
                    if len(batch) == 200:
                        SearchDocument.objects.bulk_create(batch, update_conflicts=True, unique_fields=["resource", "object_id"], update_fields=["source_text", "normalized_text", "updated_at"])
                        batch = []
                if batch:
                    SearchDocument.objects.bulk_create(batch, update_conflicts=True, unique_fields=["resource", "object_id"], update_fields=["source_text", "normalized_text", "updated_at"])
                SearchDocument.objects.filter(resource=resource).exclude(object_id__in=model.objects.values("pk")).delete()
                self.stdout.write(f"{resource}: {count} search documents rebuilt")
