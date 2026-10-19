from django import forms
from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied, ValidationError
from django.core.files.uploadedfile import UploadedFile
from django.db import models, transaction
from django.urls import reverse
from django.utils.html import format_html
from rest_framework.exceptions import PermissionDenied as APIPermissionDenied

from apps.core.contracts import ENTITY_CONTRACTS
from apps.core.models import Entity, PublicationStatus
from apps.core.services import audit, can_view_all, transition
from apps.documents.validators import validate_document_file

IDENTITY_FIELDS = (
    "product_name", "formulation_name", "preferred_name", "legal_name", "brand_name",
    "registration_number", "publication_number", "source_title", "source_name", "title", "name", "key",
)
SYSTEM_FIELDS = (
    "id", "created_at", "updated_at", "created_by", "reviewed_by", "published_by",
    "reviewed_at", "published_at", "version", "publication_status",
)
SOURCE_FIELDS = (
    "source_type", "source_title", "source_url", "verification_status",
    "last_verified_at", "is_synthetic_demo", "source_reference", "verification_evidence",
    "verification_label", "source",
)

def owner_lookup(model):
    names = {field.name for field in model._meta.fields}
    if "owner" in names:
        return "owner"
    for name in ("note", "collection"):
        if name in names and hasattr(model._meta.get_field(name).remote_field.model, "owner"):
            return name + "__owner"
    return None

def published_parent(obj):
    if obj is None:
        return False
    if isinstance(obj, Entity):
        return obj.publication_status == PublicationStatus.PUBLISHED
    ownership = {
        "ingredients": "ingredient", "formulations": "formulation", "products": "product",
        "manufacturers": "manufacturer", "regulatory": "registration", "patents": "patent",
        "documents": "technical_document",
    }
    parent_name = ownership.get(obj._meta.app_label)
    references = ("product", "formulation", "ingredient", "manufacturer", "brand", "registration", "patent", "document")
    protected_fields = references if obj._meta.label == "core.EntitySource" else (parent_name,)
    for field in obj._meta.fields:
        if isinstance(field, models.ForeignKey) and field.name in protected_fields and getattr(obj, field.attname, None):
            parent = getattr(obj, field.name)
            if isinstance(parent, Entity) and parent.publication_status == PublicationStatus.PUBLISHED:
                return True
    return False

class ScientificAdminForm(forms.ModelForm):
    class Meta:
        fields = "__all__"

    def clean_file(self):
        value = self.cleaned_data.get("file")
        if isinstance(value, UploadedFile):
            validate_document_file(value)
        return value

class ScientificAdmin(admin.ModelAdmin):
    form = ScientificAdminForm
    list_per_page = 50
    list_select_related = True
    save_on_top = True
    show_full_result_count = False
    formfield_overrides = {
        models.TextField: {"widget": forms.Textarea(attrs={"rows": 3, "cols": 55})},
        models.JSONField: {"widget": forms.Textarea(attrs={"rows": 3, "cols": 65})},
    }

    @admin.display(description="Record")
    def record_label(self, obj):
        for field in IDENTITY_FIELDS:
            value = getattr(obj, field, None)
            if value:
                return str(value)
        for field in obj._meta.fields:
            if isinstance(field, models.ForeignKey) and field.name not in ("owner", "created_by", "reviewed_by", "published_by"):
                value = getattr(obj, field.name, None)
                if value:
                    return str(value)
        return str(obj.pk)

    @admin.display(description="Catalog API")
    def api_record(self, obj):
        if obj._state.adding:
            return "-"
        for resource, spec in ENTITY_CONTRACTS.items():
            if spec["model"].lower() == obj._meta.label_lower:
                return format_html('<a href="{}">Open API record</a>', f"/api/v1/{resource}/{obj.public_id}/")
        return "-"

    @admin.display(description="Original document")
    def file_access(self, obj):
        if not getattr(obj, "file", None):
            return "No original file stored"
        url = reverse("technicaldocument-download", kwargs={"id": obj.public_id})
        return format_html('<a href="{}">Download stored file</a>', url)

    def get_queryset(self, request):
        query = super().get_queryset(request)
        lookup = owner_lookup(self.model)
        if lookup and not request.user.is_superuser:
            query = query.filter(**{lookup: request.user})
        return query

    def get_readonly_fields(self, request, obj=None):
        names = {field.name for field in self.model._meta.fields}
        readonly = [name for name in SYSTEM_FIELDS if name in names]
        if "legacy_payload" in names:
            readonly.append("legacy_payload")
        if obj and "legacy_id" in names:
            readonly.append("legacy_id")
        if "owner" in names and not request.user.is_superuser:
            readonly.append("owner")
        if not request.user.has_perm("audit.review_record"):
            readonly.extend(name for name in ("verification_status", "last_verified_at") if name in names)
        if isinstance(obj, Entity) or issubclass(self.model, Entity):
            readonly.append("api_record")
        if "file" in names:
            readonly.extend(["mime_type", "file_size", "file_access"])
        if published_parent(obj):
            readonly.extend(field.name for field in self.model._meta.fields)
            readonly.extend(field.name for field in self.model._meta.many_to_many)
        return tuple(dict.fromkeys(readonly))

    def get_fieldsets(self, request, obj=None):
        fields = list(self.get_fields(request, obj))
        system = [field for field in fields if field in SYSTEM_FIELDS or field in ("api_record", "file_access")]
        identity = [field for field in fields if field in IDENTITY_FIELDS or field in ("legacy_id",)]
        source = [field for field in fields if field in SOURCE_FIELDS and field not in system + identity]
        original = [field for field in fields if field == "legacy_payload"]
        other = [field for field in fields if field not in system + source + identity + original]
        groups = []
        for title, values, collapse in (
            ("Identity", identity, False), ("Scientific and commercial data", other, False),
            ("Source and verification", source, False), ("Workflow and system metadata", system, True),
            ("Preserved React source payload", original, True),
        ):
            if values:
                groups.append((title, {"fields": values, **({"classes": ("collapse",)} if collapse else {})}))
        return groups

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        related = db_field.remote_field.model
        lookup = owner_lookup(related)
        if lookup and not request.user.is_superuser:
            kwargs["queryset"] = related.objects.filter(**{lookup: request.user})
        elif issubclass(related, Entity) and not can_view_all(request.user, related):
            kwargs["queryset"] = related.objects.filter(publication_status="Published")
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def formfield_for_manytomany(self, db_field, request, **kwargs):
        related = db_field.remote_field.model
        if issubclass(related, Entity) and not can_view_all(request.user, related):
            kwargs["queryset"] = related.objects.filter(publication_status="Published")
        return super().formfield_for_manytomany(db_field, request, **kwargs)

    def has_delete_permission(self, request, obj=None):
        return not published_parent(obj) and super().has_delete_permission(request, obj)

    def save_model(self, request, obj, form, change):
        if change and published_parent(type(obj).objects.get(pk=obj.pk)):
            raise PermissionDenied("Return the published record to Draft before editing.")
        if not change and hasattr(obj, "created_by_id"):
            obj.created_by = request.user
        if hasattr(obj, "owner_id") and not request.user.is_superuser:
            obj.owner = request.user
        if change and hasattr(obj, "version"):
            obj.version += 1
        if request.FILES.get("file"):
            obj.mime_type = validate_document_file(request.FILES["file"])
            obj.file_size = request.FILES["file"].size
        elif "file" in form.changed_data and not obj.file:
            obj.mime_type = ""
            obj.file_size = None
        with transaction.atomic():
            super().save_model(request, obj, form, change)
            audit(request.user, obj, "Updated" if change else "Created", "Django Admin")

    def delete_model(self, request, obj):
        if published_parent(obj):
            raise PermissionDenied("Published data cannot be deleted.")
        with transaction.atomic():
            audit(request.user, obj, "Deleted", "Django Admin")
            super().delete_model(request, obj)

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        with transaction.atomic():
            for obj in formset.deleted_objects:
                if published_parent(obj):
                    raise PermissionDenied("Published scientific child records cannot be deleted.")
                audit(request.user, obj, "Deleted", "Django Admin inline")
                obj.delete()
            for obj in instances:
                updating = not obj._state.adding
                if updating and published_parent(type(obj).objects.get(pk=obj.pk)):
                    raise PermissionDenied("Return the parent record to Draft before editing.")
                if not updating and hasattr(obj, "created_by_id"):
                    obj.created_by = request.user
                if updating and hasattr(obj, "version"):
                    obj.version += 1
                obj.full_clean()
                obj.save()
                audit(request.user, obj, "Updated" if updating else "Created", "Django Admin inline")
            formset.save_m2m()

    def delete_queryset(self, request, queryset):
        objects = list(queryset)
        if any(published_parent(obj) for obj in objects):
            raise PermissionDenied("Published records cannot be mass-deleted.")
        with transaction.atomic():
            for obj in objects:
                audit(request.user, obj, "Deleted", "Django Admin bulk deletion")
            super().delete_queryset(request, queryset)

class EntityAdmin(ScientificAdmin):
    actions = ["submit_for_review", "approve_records", "publish_records", "reject_records", "archive_records", "return_to_draft"]

    def get_actions(self, request):
        actions = super().get_actions(request)
        if not request.user.has_perm("audit.review_record"):
            for name in ("approve_records", "reject_records"):
                actions.pop(name, None)
        if not request.user.has_perm("audit.publish_record"):
            for name in ("publish_records", "archive_records"):
                actions.pop(name, None)
        change_perm = f"{self.model._meta.app_label}.change_{self.model._meta.model_name}"
        if not request.user.has_perm(change_perm):
            actions.pop("submit_for_review", None)
        if not request.user.has_perm(change_perm) and not request.user.has_perm("audit.review_record"):
            actions.pop("return_to_draft", None)
        return actions

    def apply_transition(self, request, queryset, target):
        done = 0
        for obj in queryset:
            try:
                transition(obj, target, request.user, "Django Admin publication action")
                done += 1
            except (ValidationError, APIPermissionDenied) as error:
                detail = "; ".join(error.messages) if isinstance(error, ValidationError) else str(error)
                self.message_user(request, f"{obj}: {detail}", level=messages.ERROR)
        if done:
            self.message_user(request, f"{done} record(s) moved to {target}.", level=messages.SUCCESS)

    @admin.action(description="Submit selected Draft records for review")
    def submit_for_review(self, request, queryset):
        self.apply_transition(request, queryset, "In Review")

    @admin.action(description="Approve selected records in review")
    def approve_records(self, request, queryset):
        self.apply_transition(request, queryset, "Approved")

    @admin.action(description="Publish selected approved records")
    def publish_records(self, request, queryset):
        self.apply_transition(request, queryset, "Published")

    @admin.action(description="Reject selected records in review")
    def reject_records(self, request, queryset):
        self.apply_transition(request, queryset, "Rejected")

    @admin.action(description="Archive selected published records")
    def archive_records(self, request, queryset):
        self.apply_transition(request, queryset, "Archived")

    @admin.action(description="Return selected records to Draft for editing")
    def return_to_draft(self, request, queryset):
        self.apply_transition(request, queryset, "Draft")

class ScientificInline(admin.TabularInline):
    extra = 0
    show_change_link = True
    formfield_overrides = ScientificAdmin.formfield_overrides

    def get_readonly_fields(self, request, obj=None):
        readonly = list(self.readonly_fields)
        if published_parent(obj):
            return tuple(field.name for field in self.model._meta.fields if field.name != self.fk_name)
        readonly.extend(field for field in ("id", "created_at", "updated_at") if hasattr(self.model, field))
        if hasattr(self.model, "verification_status") and not request.user.has_perm("audit.review_record"):
            readonly.extend(("verification_status", "last_verified_at"))
        return tuple(dict.fromkeys(readonly))

    def has_add_permission(self, request, obj=None):
        return not published_parent(obj) and super().has_add_permission(request, obj)

    def has_change_permission(self, request, obj=None):
        return not published_parent(obj) and super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        return not published_parent(obj) and super().has_delete_permission(request, obj)

class ImmutableAdmin(ScientificAdmin):
    actions = None
    def has_add_permission(self, request):
        return False
    def has_change_permission(self, request, obj=None):
        return False
    def has_delete_permission(self, request, obj=None):
        return False
    def get_readonly_fields(self, request, obj=None):
        return tuple(field.name for field in self.model._meta.fields)
