from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class FormulixUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (("Formulix Profile", {"fields": ("display_name",)}),)
    add_fieldsets = UserAdmin.add_fieldsets + (("Formulix Profile", {"fields": ("display_name", "email")}),)
    list_display = ("username", "display_name", "email", "is_staff", "is_active")
    search_fields = ("username", "display_name", "email")
    list_filter = ("is_staff", "is_superuser", "is_active", "groups")
    list_per_page = 50
