from uuid import UUID
from django.apps import apps
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from django.db.models.deletion import ProtectedError
from django.http import FileResponse
from rest_framework import serializers, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from .contracts import ENTITY_CONTRACTS
from .permissions import CatalogPermission
from .serializers import SERIALIZERS
from .services import can_view_all, transition, audit


class PublicationTransitionSerializer(serializers.Serializer):
    target = serializers.ChoiceField(choices=["Draft", "In Review", "Submitted for Review", "Approved", "Published", "Rejected", "Archived"])
    notes = serializers.CharField(required=False, allow_blank=True)


class DashboardSummarySerializer(serializers.Serializer):
    counts = serializers.DictField(child=serializers.IntegerField())

class CatalogViewSet(viewsets.ModelViewSet):
    permission_classes = [CatalogPermission]
    lookup_field = "id"
    resource_key = None
    model = None
    def get_serializer_class(self):
        return SERIALIZERS[self.resource_key]
    def get_queryset(self):
        query = self.model.objects.all()
        if not can_view_all(self.request.user, self.model):
            query = query.filter(publication_status="Published")
        forward = [field.name for field in self.model._meta.fields if field.is_relation]
        query = query.select_related(*forward)
        spec = ENTITY_CONTRACTS[self.resource_key]
        for external, field in {**spec["fields"], **spec["labels"]}.items():
            value = self.request.query_params.get(external)
            if value and value != "All":
                lookup = field + "__name" if external in spec["labels"] else field
                query = query.filter(**{lookup: value})
        from .search import search_queryset
        matches = search_queryset(self.resource_key, self.request.user, self.request.query_params)
        query = query.filter(pk__in=matches.order_by().values("pk"))
        ordering = self.request.query_params.get("ordering", "-updated_at")
        permitted = {field.name for field in self.model._meta.fields if not field.is_relation}
        if ordering.lstrip("-") in permitted:
            query = query.order_by(ordering, "pk")
        if self.resource_key in ("products", "formulations"):
            query = query.prefetch_related("composition__ingredient", "composition__chemical_function", "composition__concentration_unit")
        if self.resource_key == "products":
            query = query.prefetch_related("document_links__document", "patent_links__patent")
        if self.resource_key == "formulations":
            query = query.prefetch_related("manufacturing_steps", "quality_controls", "technical_properties", "patent_references__patent", "products")
        if self.resource_key == "manufacturers":
            query = query.prefetch_related("owned_brands")
        if self.resource_key == "ingredients":
            query = query.select_related("industry_sector").prefetch_related("synonyms", "identifiers", "scientific_properties__unit")
        if self.resource_key == "documents":
            query = query.prefetch_related("associations__product", "associations__ingredient")
        return query
    def get_object(self):
        identity = self.kwargs["id"]
        query = Q(legacy_id=identity)
        try:
            query |= Q(pk=UUID(identity))
        except ValueError:
            pass
        obj = self.get_queryset().filter(query).first()
        if obj is None:
            raise NotFound()
        self.check_object_permissions(self.request, obj)
        return obj
    def perform_destroy(self, instance):
        if instance.publication_status == "Published":
            raise PermissionDenied("Archive a published record; it cannot be deleted.")
        try:
            audit(self.request.user, instance, "Deleted")
            instance.delete()
        except ProtectedError as error:
            raise ValidationError("Other scientific records reference this record; archive instead.") from error
    @extend_schema(request=PublicationTransitionSerializer)
    @action(detail=True, methods=["post"])
    def transition(self, request, id=None):
        try:
            obj = transition(self.get_object(), request.data.get("target"), request.user, request.data.get("notes", ""))
        except DjangoValidationError as error:
            raise ValidationError(error.messages) from error
        return Response(self.get_serializer(obj).data)
    def download(self, request, id=None):
        if self.resource_key != "documents":
            raise NotFound()
        obj = self.get_object()
        if obj.is_restricted and not (request.user.is_authenticated and (obj.created_by_id == request.user.pk or can_view_all(request.user, self.model))):
            raise NotFound()
        if not obj.file:
            raise NotFound("No original file is stored.")
        response = FileResponse(obj.file.open("rb"), as_attachment=True, filename=obj.file.name.rsplit("/", 1)[-1], content_type=obj.mime_type or "application/octet-stream")
        response["X-Content-Type-Options"] = "nosniff"
        response["Cache-Control"] = "private, no-store"
        return response

class DocumentViewSet(CatalogViewSet):
    @action(detail=True, methods=["get"])
    def download(self, request, id=None):
        return super().download(request, id)

class ManufacturerViewSet(CatalogViewSet):
    @action(detail=True,methods=['get'])
    def logo(self,request,id=None):
        obj=self.get_object()
        if not obj.logo or (not obj.logo_verified and not can_view_all(request.user,self.model)):
            raise NotFound('No approved company logo is available.')
        import mimetypes
        response=FileResponse(obj.logo.open('rb'),content_type=mimetypes.guess_type(obj.logo.name)[0] or 'application/octet-stream')
        response['X-Content-Type-Options']='nosniff'
        response['Cache-Control']='private, no-store'
        return response


@extend_schema(responses=DashboardSummarySerializer)
@api_view(["GET"])
@permission_classes([AllowAny])
def dashboard(request):
    counts = {}
    for key, spec in ENTITY_CONTRACTS.items():
        counts[key] = apps.get_model(spec["model"]).objects.filter(publication_status="Published").count()
    return Response({"counts": counts})

@extend_schema(responses=OpenApiTypes.OBJECT)
@api_view(["GET"])
@permission_classes([AllowAny])
def vocabularies(request):
    from apps.taxonomy.models import Vocabulary
    return Response({row.key: row.values for row in Vocabulary.objects.all()})
