from rest_framework.permissions import BasePermission, SAFE_METHODS

class CatalogPermission(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        model = view.model
        action = {"POST": "add", "PUT": "change", "PATCH": "change", "DELETE": "delete"}.get(request.method, "change")
        if getattr(view, "action", "") == "transition":
            return bool(request.user.is_authenticated)
        return bool(request.user.is_authenticated and request.user.has_perm(f"{model._meta.app_label}.{action}_{model._meta.model_name}"))

class OwnedPermission(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.method in SAFE_METHODS or not request.user.groups.filter(name="Read-only User").exists())
    def has_object_permission(self, request, view, obj):
        return obj.owner_id == request.user.pk
