import uuid

from django import forms
from django.contrib import messages
from django.core.exceptions import PermissionDenied, ValidationError
from django.shortcuts import redirect
from django.template.response import TemplateResponse
from django.urls import path, reverse

from apps.core.admin_support import EntityAdmin
from apps.formulations.spreadsheet_columns import COLUMNS, MARKETS
from apps.imports.formulation_excel import commit_workbook, preview_workbook


class WorkbookUploadForm(forms.Form):
    workbook = forms.FileField(widget=forms.FileInput(attrs={"accept": ".xlsx"}))
    market = forms.ChoiceField(choices=[("", "Select market"), *((value, value) for value in MARKETS)])


class FormulationAdmin(EntityAdmin):
    change_list_template = "admin/formulations/change_list.html"

    def get_readonly_fields(self, request, obj=None):
        return tuple(dict.fromkeys((*super().get_readonly_fields(request, obj), "import_key", "source_sheet", "source_row")))

    def get_fieldsets(self, request, obj=None):
        groups = super().get_fieldsets(request, obj)
        market_fields = ["market_region", *[field for field in COLUMNS.values() if field not in ("formulation_name", "formulation_type_text")]]
        for _, options in groups:
            options["fields"] = [field for field in options["fields"] if field not in market_fields]
        groups.insert(1, ("Market spreadsheet data (source-reported)", {"fields": market_fields}))
        return [(title, options) for title, options in groups if options["fields"]]

    def get_urls(self):
        return [path("upload-excel/", self.admin_site.admin_view(self.upload_excel), name="formulations_formulation_upload_excel"), *super().get_urls()]

    def upload_excel(self, request):
        if not request.user.has_perms(("formulations.add_formulation", "imports.add_importbatch", "imports.add_importrow")):
            raise PermissionDenied
        form = WorkbookUploadForm(request.POST or None, request.FILES or None)
        preview, token = None, None
        if request.method == "POST" and request.POST.get("confirm"):
            token = request.POST.get("token", "")
            saved = request.session.get("formulation_excel_preview")
            if not saved or saved["token"] != token:
                form.add_error(None, "Preview expired. Upload the workbook again.")
            else:
                try:
                    batch = commit_workbook(saved["data"], request.user)
                    request.session.pop("formulation_excel_preview", None)
                    messages.success(request, f"Imported {batch.imported_rows} drafts; {batch.rejected_rows} rejected rows. Review, approve and publish records to show them in React.")
                    return redirect(reverse("admin:formulations_formulation_changelist"))
                except ValidationError as error:
                    form.add_error(None, error)
        elif request.method == "POST" and form.is_valid():
            try:
                preview = preview_workbook(form.cleaned_data["workbook"], form.cleaned_data["market"])
                token = str(uuid.uuid4())
                request.session["formulation_excel_preview"] = {"token": token, "data": preview}
            except ValidationError as error:
                form.add_error(None, error)
        context = {**self.admin_site.each_context(request), "opts": self.model._meta,
                   "title": "Upload market formulations", "form": form, "preview": preview,
                   "preview_rows": preview["rows"][:25] if preview else [], "token": token}
        return TemplateResponse(request, "admin/formulations/upload_excel.html", context)
