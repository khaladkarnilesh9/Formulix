from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand
from django.db import transaction

class Command(BaseCommand):
    help = "Create Formulix permission groups without creating users or assigning roles."

    def add_arguments(self, parser):
        parser.add_argument("--reset-existing", action="store_true", help="Explicitly replace permissions on existing Formulix groups.")

    @transaction.atomic
    def handle(self, *args, **options):
        catalog_apps = ("taxonomy", "core", "ingredients", "manufacturers", "brands",
                        "formulations", "products", "regulatory", "patents", "documents")
        read = Permission.objects.filter(content_type__app_label__in=catalog_apps, codename__startswith="view_")
        mutate = Permission.objects.filter(content_type__app_label__in=catalog_apps)
        workspace = Permission.objects.filter(content_type__app_label="workspace").exclude(
            content_type__model="workspaceauditevent").exclude(codename="delete_workspacepreference")
        review = Permission.objects.filter(content_type__app_label="audit", codename="review_record")
        publish = Permission.objects.filter(content_type__app_label="audit", codename="publish_record")
        roles = {
            "Super Admin": Permission.objects.all(),
            "Data Administrator": mutate | review | publish,
            "Data Curator": mutate,
            "Scientific Reviewer": read | review,
            "Publisher": read | publish,
            "Standard User": workspace,
            "Read-only User": Permission.objects.filter(
                content_type__app_label="workspace", codename__startswith="view_"),
        }
        for name, permissions in roles.items():
            group, created = Group.objects.get_or_create(name=name)
            if not created and not options["reset_existing"]:
                self.stdout.write(f"Preserved existing group: {name}")
                continue
            group.permissions.set(permissions)
        self.stdout.write(self.style.SUCCESS("Formulix groups checked. User membership and staff access were not changed."))
