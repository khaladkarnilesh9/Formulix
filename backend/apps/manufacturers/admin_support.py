from django.contrib import admin
from django.utils.html import format_html
from apps.core.admin_support import EntityAdmin, ScientificAdminForm


class ManufacturerForm(ScientificAdminForm):
    def clean(self):
        data=super().clean()
        if 'logo' in self.changed_data and 'logo_verified' not in self.changed_data:
            data['logo_verified']=False
        return data


class ManufacturerAdmin(EntityAdmin):
    form=ManufacturerForm

    @admin.display(description='Company logo')
    def logo_preview(self,obj):
        if not obj.logo:
            return 'No company logo uploaded'
        return format_html('<img src="{}" width="78" height="78" style="object-fit:contain;background:white" alt="Company logo">',f'/api/v1/manufacturers/{obj.public_id}/logo/')

    def get_readonly_fields(self,request,obj=None):
        fields=[*super().get_readonly_fields(request,obj),'logo_preview']
        if not request.user.has_perm('audit.review_record'):
            fields.append('logo_verified')
        return tuple(dict.fromkeys(fields))
