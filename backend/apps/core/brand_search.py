"""Read-only brand portfolios: stored identities and distinct source-name/company pairs."""
import hashlib
from django.db.models import Case, CharField, Count, Exists, F, Max, Min, OuterRef, Q, Value, When, Window
from django.db.models.functions import Cast, Coalesce, Lower, RowNumber, Trim
from .search import eligible, search_queryset, by_identity


def source_key(company, name):
    return 'source-brand:' + hashlib.sha256((company + '\0' + name).encode()).hexdigest()[:24]


def brand_queries(request, params):
    stored = search_queryset('brands', request.user, params)
    products = search_queryset('products', request.user, {**params, 'q': ''})
    market = params.get('market', 'All')
    if market not in ('All', ''):
        products = products.filter(jurisdiction__name__iexact=market)
        stored = stored.filter(products__pk__in=products.values('pk')).distinct()
    company = params.get('manufacturerExact')
    if company:
        stored = stored.filter(manufacturer_id__in=eligible('manufacturers', request.user).filter(legal_name__iexact=company).values('pk'))
    forms = search_queryset('formulations', request.user, params).exclude(formulation_name='')
    if company:
        forms = forms.filter(company_name__iexact=company)
    pair = eligible('brands', request.user).filter(brand_name__iexact=OuterRef('formulation_name'),
        manufacturer__legal_name__iexact=OuterRef('company_name'),
        manufacturer_id__in=eligible('manufacturers', request.user).values('pk'))
    forms = forms.alias(has_stored_brand=Exists(pair)).filter(has_stored_brand=False)
    name = params.get('brandNameExact')
    if name:
        stored = stored.filter(brand_name__iexact=name)
        forms = forms.filter(formulation_name__iexact=name)
    return stored, forms, products


def descriptors(request, stored, forms, products):
    visible_companies = eligible('manufacturers', request.user).values('pk')
    company = Case(When(manufacturer_id__in=visible_companies, then=F('manufacturer__legal_name')), default=Value(''), output_field=CharField())
    columns = ('row_kind', 'row_id', 'row_name', 'row_company', 'row_sector', 'row_count', 'row_updated')
    stored_rows = stored.order_by().annotate(row_kind=Value('stored'), row_id=Cast(F('pk'), CharField()),
        row_name=F('brand_name'), row_company=company, row_sector=Coalesce('industry_sector__name', Value('')),
        row_count=Count('products', filter=Q(products__pk__in=products.values('pk')), distinct=True),
        row_updated=Cast('updated_at', CharField())).values(*columns)
    source_rows = forms.order_by().values('formulation_name', 'company_name').annotate(
        row_kind=Value('source'), row_id=Value(''), row_name=F('formulation_name'), row_company=F('company_name'),
        row_sector=Coalesce(Min('industry_sector__name'), Value('')), row_count=Count('pk', distinct=True),
        row_updated=Cast(Max('updated_at'), CharField())).values(*columns)
    return stored_rows.union(source_rows)


def brand_summary(request):
    stored, forms, products = brand_queries(request, {})
    sources = forms.order_by().values('formulation_name', 'company_name')
    source_count = sources.distinct().count()
    linked = products.filter(brand_id__in=stored.values('pk'))
    chemicals=eligible('ingredients',request.user).values('pk')
    placeholders=('', 'n/a', 'na', 'none', '-', 'not recorded')
    active_products = linked.alias(active_key=Lower(Trim('active_ingredient_text'))).filter(~Q(active_key__in=placeholders)|Q(composition__ingredient_id__in=chemicals))
    active_forms = forms.alias(active_key=Lower(Trim('active_ingredient_text'))).filter(~Q(active_key__in=placeholders)|Q(composition__ingredient_id__in=chemicals))
    markets = linked.exclude(jurisdiction__name__isnull=True).exclude(jurisdiction__name='').order_by().values_list('jurisdiction__name', flat=True).union(
        forms.exclude(market_region='').order_by().values_list('market_region', flat=True))
    return {'totalBrands': stored.count()+source_count,
        'withFormulations': linked.filter(formulation_id__in=eligible('formulations', request.user).values('pk')).order_by().values('brand_id').distinct().count()+source_count,
        'withActiveIngredients': active_products.order_by().values('brand_id').distinct().count()+active_forms.order_by().values('formulation_name', 'company_name').distinct().count(),
        'markets': markets.count()}


def brand_listing(request, params, page, size):
    from .search_api import prepared, paginated
    from .catalog import build_catalog
    from .serializers import SERIALIZERS
    from uuid import UUID
    stored, forms, products = brand_queries(request, params)
    identity = params.get('brandKey')
    if identity and not identity.startswith('source-brand:'):
        stored = by_identity(stored, identity)
        forms = forms.none()
    elif identity:
        stored = stored.none()
        # Source deep links carry name/company hints, checked against the stable pair ID.
        if not params.get('brandNameExact') or not params.get('manufacturerExact'):
            forms = forms.none()
    rows = descriptors(request, stored, forms, products)
    sort = {'name':'row_name', 'manufacturer':'row_company', 'sector':'row_sector', 'count':'row_count', 'updated':'row_updated'}.get(params.get('sortBy'), 'row_name')
    sort = ('-' if params.get('sortOrder')=='desc' else '')+sort
    count = rows.count()
    selected = list(rows.order_by(sort, 'row_name', 'row_company', 'row_kind', 'row_id')[(page-1)*size:page*size])
    if identity and identity.startswith('source-brand:'):
        selected = [row for row in selected if source_key(row['row_company'], row['row_name'])==identity]
        count = len(selected)
    stored_ids = [UUID(row['row_id']) for row in selected if row['row_kind']=='stored']
    stored_objects = {str(row.pk):row for row in prepared(request, 'brands', stored_ids)}
    pairs = Q(pk__in=[])
    for row in selected:
        if row['row_kind']=='source':
            pairs |= Q(formulation_name=row['row_name'], company_name=row['row_company'])
    source_forms = forms.filter(pairs)
    source_variants = source_forms.annotate(variant_number=Window(RowNumber(), partition_by=[F('formulation_name'),F('company_name')], order_by=F('pk').asc())).filter(variant_number__lte=2).values('pk')
    # Materialize only the bounded page samples to avoid deeply nested window subqueries.
    sample_ids=list(source_variants.values_list('pk',flat=True))
    sample_forms=prepared(request,'formulations',sample_ids)
    source_products=list(eligible('products',request.user).filter(formulation_id__in=sample_ids).annotate(
        variant_number=Window(RowNumber(),partition_by=[F('formulation_id')],order_by=F('pk').asc())).filter(variant_number__lte=2).values_list('pk',flat=True))
    source_catalog = build_catalog(request, {'formulations':sample_forms,'products':prepared(request,'products',source_products)})
    source_pairs={form.public_id:(form.formulation_name,form.company_name) for form in sample_forms}
    stored_variants = products.filter(brand_id__in=stored_ids).annotate(variant_number=Window(RowNumber(), partition_by=[F('brand_id')], order_by=F('pk').asc())).filter(variant_number__lte=2).values('pk')
    stored_products = list(SERIALIZERS['products'](prepared(request,'products',stored_variants),many=True,context={'request':request}).data)
    metadata = {}
    for row in source_forms.order_by().values('formulation_name','company_name','industry_sector__name','formulation_type_text','active_ingredient_text','market_region').distinct():
        key=(row['formulation_name'],row['company_name'])
        details=metadata.setdefault(key,{'sectors':set(),'activeIngredients':set(),'formulationTypes':set(),'markets':set()})
        for external,field in (('sectors','industry_sector__name'),('activeIngredients','active_ingredient_text'),('formulationTypes','formulation_type_text'),('markets','market_region')):
            if row[field]:details[external].add(row[field])
    stored_metadata = {}
    for row in products.filter(brand_id__in=stored_ids).order_by().values('brand_id','industry_sector__name','active_ingredient_text','formulation_type_text','jurisdiction__name').distinct():
        details=stored_metadata.setdefault(str(row['brand_id']),{'sectors':set(),'activeIngredients':set(),'formulationTypes':set(),'markets':set()})
        for external,field in (('sectors','industry_sector__name'),('activeIngredients','active_ingredient_text'),('formulationTypes','formulation_type_text'),('markets','jurisdiction__name')):
            if row[field]:details[external].add(row[field])
    results=[]
    for row in selected:
        source=row['row_kind']=='source'
        obj=None if source else stored_objects[str(UUID(row['row_id']))]
        key=source_key(row['row_company'],row['row_name']) if source else obj.public_id
        samples=[product for product in source_catalog['products'] if source_pairs.get(product.get('formulationId'))==(row['row_name'],row['row_company'])] if source else [product for product in stored_products if product.get('brandId')==key]
        details=metadata.get((row['row_name'],row['row_company']),{}) if source else stored_metadata.get(str(obj.pk),{})
        if not details.get('sectors') and row['row_sector']:
            details={**details,'sectors':{row['row_sector']}}
        company_id=samples[0]['manufacturerId'] if source and samples else obj.manufacturer.public_id if obj and row['row_company'] else ''
        results.append({'key':key,'brandName':row['row_name'],'companyName':row['row_company'],'manufacturerId':company_id,
            'products':samples,'productCount':row['row_count'],'updatedAt':row['row_updated'],
            'trademarkStatus':obj.trademark_status if obj else '', 'recordKind':'Source-reported brand' if source else 'Stored brand',
            **{name:sorted(values) for name,values in details.items()}})
    return paginated(request,count,results,page,size)
