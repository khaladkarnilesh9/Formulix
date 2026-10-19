from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle


class StaffCredentials(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=4096, trim_whitespace=False, write_only=True)


class StaffLoginThrottle(SimpleRateThrottle):
    scope = "staff_session"
    rate = "15/min"

    def get_cache_key(self, request, view):
        if request.method != "POST":
            return None
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


def session_info(request):
    user = request.user
    return {"authenticated": user.is_authenticated, "staff": user.is_staff,
            "canPreview": bool(user.is_staff and user.has_perm("formulations.view_formulation")),
            "username": user.get_username() if user.is_authenticated else ""}


@extend_schema(request=StaffCredentials, responses=OpenApiTypes.OBJECT)
@api_view(["GET", "POST", "DELETE"])
@permission_classes([AllowAny])
@throttle_classes([StaffLoginThrottle])
def staff_session(request):
    original = request._request
    if request.method in ("POST", "DELETE"):
        # DRF skips session CSRF checks for anonymous users; login must enforce them explicitly.
        SessionAuthentication().enforce_csrf(request)
    if request.method == "POST":
        fields = StaffCredentials(data=request.data)
        fields.is_valid(raise_exception=True)
        user = authenticate(original, **fields.validated_data)
        if not user or not user.is_staff or not user.has_perm("formulations.view_formulation"):
            return Response({"detail": "Sign-in failed. An active staff account with formulation view permission is required."}, status=403)
        login(original, user)
        request.user = user
    elif request.method == "DELETE":
        logout(original)
        request.user = original.user
    response = Response({**session_info(request), "csrfToken": get_token(original)})
    response["Cache-Control"] = "no-store"
    return response
