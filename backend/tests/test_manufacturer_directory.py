from io import BytesIO
from tempfile import TemporaryDirectory
from PIL import Image
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase,override_settings
from django.core.cache import cache
from apps.manufacturers.models import Manufacturer
from apps.manufacturers.validators import validate_company_logo
from apps.formulations.models import Formulation
from apps.products.models import CommercialProduct
from apps.taxonomy.models import Country,IndustrySector
from apps.core.manufacturer_search import source_id


def image_file(name='logo.png'):
    data=BytesIO();Image.new('RGB',(64,64),'white').save(data,'PNG')
    return SimpleUploadedFile(name,data.getvalue(),content_type='image/png')


class ManufacturerDirectoryTests(TestCase):
    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    @classmethod
    def setUpTestData(cls):
        cls.admin=get_user_model().objects.create_superuser(username='directory-admin',password=None)
        cls.country=Country.objects.create(name='Germany',code='DE')
        cls.sector=IndustrySector.objects.create(name='Agrochemical',slug='agrochemical-directory')
        cls.company=Manufacturer.objects.create(legal_name='Zulu company',country=cls.country,primary_sector=cls.sector,
            declared_product_count=999,aliases=['Reviewed company alias'],publication_status='Published')
        cls.form=Formulation.objects.create(formulation_name='QA brand',company_name='Adama',market_region='India',
            industry_sector=cls.sector,active_ingredient_text='11% A + 12% B',registration_number_text='SOURCE-123',publication_status='Published')

    def search(self,group,**params):
        response=self.client.get('/api/v1/search/',{'group':group,**params})
        self.assertEqual(response.status_code,200,response.content[:300])
        return response.json()

    def test_global_sort_unknown_countries_and_industry(self):
        data=self.search('manufacturers',page_size=1)
        self.assertEqual(data['count'],2)
        self.assertEqual(data['results'][0]['name'],'Adama')
        self.assertIsNone(data['results'][0]['productCount'])
        self.assertEqual(data['results'][0]['indexedCount'],1)
        self.assertEqual(data['results'][0]['role'],'')
        self.assertEqual(self.search('manufacturers',country='Germany')['count'],1)
        self.assertEqual(self.search('manufacturers',country='United States')['count'],0)
        self.assertEqual(self.search('manufacturers',category='Agrochemical')['count'],2)
        self.assertEqual(self.search('manufacturers',category='Pharmaceutical')['count'],0)

    def test_source_id_hydration_without_hint_and_draft_visibility(self):
        key=source_id('Adama')
        self.assertEqual(self.search('manufacturerProfile',manufacturerKey=key)['results'][0]['indexedProducts'],1)
        self.assertEqual(self.search('manufacturers',identity=key)['count'],1)
        self.assertEqual(self.search('manufacturerProfile',manufacturerKey=key,companyName='Wrong company')['count'],0)
        self.form.publication_status='Draft';self.form.save()
        self.assertEqual(self.search('manufacturerProfile',manufacturerKey=key)['count'],0)
        self.client.force_login(self.admin)
        self.assertEqual(self.search('manufacturerProfile',manufacturerKey=key)['count'],1)

    def test_declared_and_indexed_counts_are_separate_and_alias_review(self):
        Formulation.objects.create(formulation_name='Reviewed source',company_name='Reviewed company alias',publication_status='Published')
        data=self.search('manufacturerProfile',manufacturerKey=str(self.company.pk))['results'][0]
        self.assertEqual(data['declaredPortfolio'],999)
        self.assertEqual(data['indexedProducts'],1)
        self.assertEqual(self.search('manufacturers',q='Reviewed company alias')['results'][0]['id'],str(self.company.pk))
        self.assertEqual(self.search('manufacturers')['count'],2)

    def test_tabs_exact_company_scope_preserves_mixtures_and_genuine_ids(self):
        product=CommercialProduct.objects.create(product_name='Different product label',formulation=self.form,publication_status='Published')
        key=source_id('Adama')
        self.assertEqual(self.search('manufacturerProfile',manufacturerKey=key)['results'][0]['indexedProducts'],1)
        for section in ('formulations','brands','ingredients','markets','regulatory'):
            self.assertEqual(self.search('manufacturerRecords',manufacturerKey=key,section=section)['count'],1)
        row=self.search('manufacturerRecords',manufacturerKey=key,section='formulations')['results'][0]
        self.assertEqual(row['id'],str(product.pk))
        self.assertEqual(row['activeIngredient'],'11% A + 12% B')
        row=self.search('manufacturerRecords',manufacturerKey=key,section='ingredients')['results'][0]
        self.assertEqual(row['evidence'],'Source-reported / unverified')
        self.assertEqual(row['casNumber'],'')
        row=self.search('manufacturerRecords',manufacturerKey=key,section='regulatory')['results'][0]
        self.assertEqual(row['productId'],str(product.pk))

    def test_company_table_pagination_and_hidden_data(self):
        for index in range(52):
            Formulation.objects.create(formulation_name=f'QA {index:02}',company_name='Adama',publication_status='Published')
        Formulation.objects.create(formulation_name='Hidden QA',company_name='Adama')
        data=self.search('manufacturerRecords',manufacturerKey=source_id('Adama'),section='formulations',page_size=50,page=2)
        self.assertEqual(data['count'],53)
        self.assertEqual(len(data['results']),3)

    def test_logo_format_size_and_review_validation(self):
        validate_company_logo(image_file())
        for file in (SimpleUploadedFile('fake.png',b'not an image'),SimpleUploadedFile('logo.svg',b'<svg/>'),image_file('wrong.jpg'),SimpleUploadedFile('huge.png',b'0'*(2*1024*1024+1))):
            with self.assertRaises(ValidationError):validate_company_logo(file)
        self.company.logo_verified=True
        with self.assertRaises(ValidationError):self.company.full_clean()
        self.company.logo_verified=False;self.company.aliases='Not a list'
        with self.assertRaises(ValidationError):self.company.full_clean()

    def test_logo_approval_visibility_admin_and_private_storage(self):
        with TemporaryDirectory() as folder,override_settings(MEDIA_ROOT=folder):
            self.company.logo=image_file();self.company.logo_source_url='https://example.com/reviewed-logo';self.company.save()
            url=f'/api/v1/manufacturers/{self.company.pk}/logo/'
            self.assertEqual(self.client.get(url).status_code,404)
            self.client.force_login(self.admin)
            response=self.client.get(url);self.assertEqual(response.status_code,200);response.close()
            self.company.logo_verified=True;self.company.save();self.client.logout()
            response=self.client.get(url);self.assertEqual(response.status_code,200);self.assertEqual(response['X-Content-Type-Options'],'nosniff');response.close()
            self.company.publication_status='Draft';self.company.save()
            self.assertEqual(self.client.get(url).status_code,404)
            self.assertIn('logo_preview',admin.site._registry[Manufacturer].get_readonly_fields(type('Request',(),{'user':self.admin})(),self.company))

