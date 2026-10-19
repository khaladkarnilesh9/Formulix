from django.db import migrations, models
import apps.core.validators
import apps.manufacturers.validators


class Migration(migrations.Migration):
    dependencies=[('manufacturers','0001_initial')]
    operations=[
        migrations.AddField(model_name='manufacturer',name='aliases',field=models.JSONField(blank=True,default=list,help_text='Reviewed exact company aliases; never fuzzy matches.')),
        migrations.AddField(model_name='manufacturer',name='logo',field=models.ImageField(blank=True,upload_to='manufacturers/logos/',validators=[apps.manufacturers.validators.validate_company_logo])),
        migrations.AddField(model_name='manufacturer',name='logo_source_url',field=models.URLField(blank=True,max_length=2000,validators=[apps.core.validators.validate_http_url])),
        migrations.AddField(model_name='manufacturer',name='logo_source_type',field=models.CharField(blank=True,max_length=50)),
        migrations.AddField(model_name='manufacturer',name='logo_verified',field=models.BooleanField(default=False)),
        migrations.AddField(model_name='manufacturer',name='logo_attribution',field=models.TextField(blank=True)),
    ]
