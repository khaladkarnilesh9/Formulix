import json
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.core.management.base import BaseCommand, CommandError

from apps.core.contracts import ENTITY_CONTRACTS
from apps.core.search import fields_for, search_queryset


class Command(BaseCommand):
    help = "Read-only search diagnostics. Does not publish, import, or update records."

    def add_arguments(self, parser):
        parser.add_argument("--query", required=True)
        parser.add_argument("--username", help="Check API visibility for this existing user.")
        parser.add_argument("--limit", type=int, default=20)

    def handle(self, *args, **options):
        user = AnonymousUser()
        if options["username"]:
            user = get_user_model().objects.filter(username=options["username"], is_active=True).first()
            if user is None:
                raise CommandError("Active user not found.")
        diagnostic = SimpleNamespace(is_staff=True, has_perm=lambda permission: True, is_authenticated=True)
        result = {"query": options["query"], "visibility": "public" if not user.is_authenticated else "selected user's permissions", "models": {}}
        for resource, spec in ENTITY_CONTRACTS.items():
            matches = search_queryset(resource, diagnostic, {"q": options["query"]})
            eligible = search_queryset(resource, user, {"q": options["query"]})
            rows = []
            for record in matches[:max(1, min(options["limit"], 100))]:
                row = {"pk": str(record.pk), "publicId": record.public_id, "publicationStatus": record.publication_status,
                       "apiEligible": eligible.filter(pk=record.pk).exists()}
                for field in ("formulation_name", "product_name", "brand_name", "preferred_name", "legal_name", "company_name", "active_ingredient_text", "formulation_type_text", "source_reference", "source_sheet", "source_row"):
                    if hasattr(record, field):
                        row[field] = getattr(record, field)
                if hasattr(record, "composition"):
                    row["compositionRows"] = record.composition.count()
                if resource == "formulations":
                    from apps.imports.models import ImportRow
                    row["importRows"] = list(ImportRow.objects.filter(formulation=record).values("batch_id", "batch__filename", "import_status", "row_number"))
                    for entry in row["importRows"]:
                        entry["batch_id"] = str(entry["batch_id"])
                if not row["apiEligible"]:
                    row["excludedReason"] = "Not published, or selected user lacks staff preview permission."
                rows.append(row)
            result["models"][resource] = {"model": spec["model"], "databaseMatches": matches.count(), "eligibleMatches": eligible.count(), "searchableFields": fields_for(resource), "records": rows}
        self.stdout.write(json.dumps(result, indent=2))
