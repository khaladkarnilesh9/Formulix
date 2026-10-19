"""Permission-scoped directory; source claims are not verified company identities."""
import hashlib
from uuid import UUID
from django.db.models import Q, F, Value, CharField, Count, Min
from django.db.models.functions import Cast, Lower
from rest_framework.exceptions import ValidationError
from .search import eligible, search_queryset, by_identity


def source_id(name):
    return 'source-company:'+hashlib.sha256(name.strip().casefold().encode()).hexdigest()[:24]


def resolve_source_name(request,key,hint=''):
    if hint:
        return hint if source_id(hint)==key else ''
    return next((name for name in eligible('formulations',request.user).exclude(company_name='').order_by().values_list('company_name',flat=True).distinct() if source_id(name)==key),'')


def names_condition(field,names):
    condition=Q(pk__in=[])
    for name in names:
        condition |= Q(**{field+'__iexact':name})
    return condition


def source_companies(request,params):
    form_params={key:value for key,value in params.items() if key!='identity'}
    forms=search_queryset('formulations',request.user,{**form_params,'market':'All'}).exclude(company_name='')
    if params.get('country','All') not in ('All','Not recorded',''):
        return forms.none()
    names=[]
    for name,aliases in eligible('manufacturers',request.user).values_list('legal_name','aliases'):
        names.extend([name,*aliases])
    return forms.alias(directory_company_key=Lower('company_name')).exclude(directory_company_key__in={name.lower() for name in names})


def source_company(name,forms):
    sectors=sorted(set(forms.exclude(industry_sector=None).order_by().values_list('industry_sector__name',flat=True)))
    return {'id':source_id(name),'name':name,'country':'Not recorded','headquarters':'','founded':None,
        'sector':sectors,'productCategories':sectors,'productCount':None,'indexedCount':forms.count(),
        'website':'','brandPortfolio':[],'role':'','overview':'Company description not recorded.',
        'complianceCertifications':[],'recordKind':'Source-reported company','aliases':[],'logoUrl':'','logoVerified':False}


def directory_listing(request,params,page,size):
    from .search_api import prepared,paginated
    from .serializers import SERIALIZERS
    stored=search_queryset('manufacturers',request.user,params)
    country=params.get('country','All')
    if country not in ('All',''):
        stored=stored.filter(country=None) if country=='Not recorded' else stored.filter(country__name__iexact=country)
    sector=params.get('category','All')
    if sector not in ('All',''):
        labels=[pk for pk,sectors,categories in stored.values_list('pk','sector_labels','product_categories') if sector.casefold() in {value.casefold() for value in [*sectors,*categories] if isinstance(value,str)}]
        stored=stored.filter(Q(primary_sector__name__iexact=sector)|Q(sectors__industry_sector__name__iexact=sector)|Q(pk__in=labels)).distinct()
    forms=source_companies(request,params)
    identity=params.get('identity')
    if identity:
        if identity.startswith('source-company:'):
            stored=stored.none()
            name=resolve_source_name(request,identity,params.get('companyName',''))
            forms=forms.filter(company_name__iexact=name) if name else forms.none()
        else:
            stored=by_identity(stored,identity)
            forms=forms.none()
    columns=('directory_kind','directory_id','directory_name')
    normal=stored.order_by().annotate(directory_kind=Value('stored'),directory_id=Cast('pk',CharField()),directory_name=F('legal_name')).values(*columns)
    sources=forms.order_by().values(company_key=Lower('company_name')).annotate(directory_kind=Value('source'),directory_id=Value(''),directory_name=Min('company_name')).values(*columns)
    rows=normal.union(sources)
    total=rows.count()
    direction='-' if params.get('sortOrder')=='desc' else ''
    selected=list(rows.order_by(direction+'directory_name','directory_kind','directory_id')[(page-1)*size:page*size])
    stored_rows={str(row.pk):row for row in prepared(request,'manufacturers',[row['directory_id'] for row in selected if row['directory_kind']=='stored'])}
    results=[]
    for row in selected:
        if row['directory_kind']=='stored':
            data=dict(SERIALIZERS['manufacturers'](stored_rows[str(UUID(row['directory_id']))],context={'request':request}).data)
        else:
            name=row['directory_name']
            data=source_company(name,eligible('formulations',request.user).filter(company_name__iexact=name))
        results.append(data)
    return paginated(request,total,results,page,size)


def company_context(request,params):
    from .serializers import SERIALIZERS
    key=params.get('manufacturerKey','')
    obj=None
    if key.startswith('source-company:'):
        name=resolve_source_name(request,key,params.get('companyName',''))
        forms=eligible('formulations',request.user).filter(company_name__iexact=name)
        if not name or source_id(name)!=key or not forms.exists():
            return None
        company=source_company(name,forms)
        names=[name]
    else:
        obj=by_identity(eligible('manufacturers',request.user),key).first()
        if not obj:
            return None
        company=dict(SERIALIZERS['manufacturers'](obj,context={'request':request}).data)
        names=[obj.legal_name,*obj.aliases]
    reported_forms=eligible('formulations',request.user).filter(names_condition('company_name',names))
    products=eligible('products',request.user).filter(names_condition('manufacturer_text',names)|Q(formulation_id__in=reported_forms.values('pk'))|(Q(manufacturer_id=obj.pk) if obj else Q(pk__in=[])))
    forms=eligible('formulations',request.user).filter(names_condition('company_name',names)|Q(pk__in=products.exclude(formulation=None).values('formulation_id'))).distinct()
    return company,obj,products,forms


def company_profile(request,params):
    from .search_api import paginated
    context=company_context(request,params)
    if context is None:
        return paginated(request,0,[],1,1)
    company,obj,products,forms=context
    standalone=forms.exclude(pk__in=eligible('products',request.user).exclude(formulation=None).values('formulation_id')).count()
    return paginated(request,1,[{'company':company,'indexedProducts':products.count()+standalone,
        'formulationCount':forms.count(),'declaredPortfolio':company.get('productCount')}],1,1)


def company_records(request,params,page,size):
    from .search_api import prepared,paginated
    from .catalog import build_catalog
    context=company_context(request,params)
    if context is None:
        return paginated(request,0,[],page,size)
    company,obj,products,forms=context
    section=params.get('section','formulations')
    if section=='formulations':
        query=forms.order_by(Lower('formulation_name'),'pk')
        ordered_ids=list(query.values_list('pk',flat=True)[(page-1)*size:page*size])
        selected=prepared(request,'formulations',ordered_ids)
        catalog=build_catalog(request,{'formulations':selected})
        linked={}
        for form_id,product_id,legacy in products.filter(formulation_id__in=selected.values('pk')).order_by('pk').values_list('formulation_id','pk','legacy_id'):
            linked.setdefault(str(form_id),legacy or str(product_id))
        form_ids={row.public_id:str(row.pk) for row in selected}
        for row in catalog['products']:
            row['id']=linked.get(form_ids.get(row.get('formulationId')),row['id'])
        positions={str(pk):index for index,pk in enumerate(ordered_ids)}
        catalog['products'].sort(key=lambda row:positions[form_ids[row['formulationId']]])
        return paginated(request,query.count(),catalog['products'],page,size)
    if section=='brands':
        stored=eligible('brands',request.user).filter(Q(manufacturer_id=obj.pk)|Q(owner_id=obj.pk)) if obj else eligible('brands',request.user).none()
        names=list(stored.values_list('brand_name',flat=True))
        sources=forms.exclude(formulation_name__in=names).order_by().values('formulation_name').annotate(total=Count('pk')).order_by('formulation_name')
        total=stored.count()+sources.count()
        start=(page-1)*size
        selected=list(stored.order_by('brand_name','pk')[start:start+size])
        rows=[{'name':row.brand_name,'id':row.public_id,'recordKind':'Stored brand','status':row.publication_status,'trademarkStatus':row.trademark_status} for row in selected]
        offset=max(0,start-stored.count())
        for row in sources[offset:offset+size-len(rows)]:
            variants=forms.filter(formulation_name=row['formulation_name'])
            rows.append({'name':row['formulation_name'],'recordKind':'Source-reported brand','productCount':row['total'],
                'status':'; '.join(sorted(set(variants.order_by().values_list('publication_status',flat=True)))),
                'activeIngredients':sorted(set(variants.exclude(active_ingredient_text='').values_list('active_ingredient_text',flat=True))),
                'formulationTypes':sorted(set(variants.exclude(formulation_type_text='').values_list('formulation_type_text',flat=True))),
                'markets':sorted(set(variants.exclude(market_region='').values_list('market_region',flat=True)))})
        return paginated(request,total,rows,page,size)
    if section=='ingredients':
        normalized=eligible('ingredients',request.user).filter(Q(formulationingredient__formulation_id__in=forms.values('pk'))|Q(productactiveingredient__product_id__in=products.values('pk'))).distinct().order_by('preferred_name','pk')
        sources=forms.order_by().exclude(active_ingredient_text='').exclude(active_ingredient_text__iexact='N/A').values('active_ingredient_text').annotate(total=Count('pk')).order_by('active_ingredient_text')
        offset=(page-1)*size
        rows=[{'name':ingredient.preferred_name,'id':ingredient.public_id,'casNumber':ingredient.cas_number or '',
            'chemicalClass':ingredient.chemical_class,'formulationCount':forms.filter(composition__ingredient=ingredient).distinct().count(),
            'brandCount':forms.filter(composition__ingredient=ingredient).order_by().values('formulation_name').distinct().count(),
            'evidence':ingredient.verification_status,'structureUrl':f'/ingredients?ingredient={ingredient.public_id}'} for ingredient in normalized[offset:offset+size]]
        source_start=max(0,offset-normalized.count())
        for row in sources[source_start:source_start+size-len(rows)]:
            matches=forms.filter(active_ingredient_text=row['active_ingredient_text'])
            rows.append({'name':row['active_ingredient_text'],'formulationCount':row['total'],
                'brandCount':matches.order_by().values('formulation_name').distinct().count(),
                'evidence':'Source-reported / unverified','casNumber':'','chemicalClass':'','structureUrl':''})
        return paginated(request,normalized.count()+sources.count(),rows,page,size)
    if section=='markets':
        groups=forms.order_by().exclude(market_region='').values('market_region').annotate(total=Count('pk'),brands=Count('formulation_name',distinct=True)).order_by('market_region')
        rows=[]
        for row in groups[(page-1)*size:page*size]:
            scoped=forms.filter(market_region=row['market_region'])
            rows.append({'name':row['market_region'],'formulations':row['total'],'brands':row['brands'],
                'products':products.filter(jurisdiction__name=row['market_region']).count(),
                'registrationReferences':scoped.exclude(registration_number_text='').exclude(registration_number_text__iexact='N/A').count()})
        return paginated(request,groups.count(),rows,page,size)
    if section=='regulatory':
        normalized=eligible('regulatory/registrations',request.user).filter(commercial_product_id__in=products.values('pk')).order_by('registration_number','pk')
        query=forms.exclude(registration_number_text='').exclude(registration_number_text__iexact='N/A').order_by('formulation_name','pk')
        offset=(page-1)*size
        rows=[{'name':row.commercial_product.product_name,'registrationNumber':row.registration_number,
            'country':row.jurisdiction.name if row.jurisdiction_id else 'Not recorded',
            'authority':row.regulatory_authority.name if row.regulatory_authority_id else 'Not recorded',
            'source':row.source_reference,'evidence':row.verification_status,'status':row.publication_status,
            'sourceUrl':row.source_url,'productId':row.commercial_product.public_id} for row in normalized.select_related('commercial_product','jurisdiction','regulatory_authority')[offset:offset+size]]
        start=max(0,offset-normalized.count())
        linked_ids={}
        for form_id,product_id,legacy in products.exclude(formulation=None).order_by('pk').values_list('formulation_id','pk','legacy_id'):
            linked_ids.setdefault(form_id,legacy or str(product_id))
        rows += [{'name':form.formulation_name,'registrationNumber':form.registration_number_text,'country':form.market_region,
            'authority':'Not recorded','source':form.source_reference,'evidence':'Source-reported / unverified','status':form.publication_status,
            'sourceUrl':form.source_url,'productId':linked_ids.get(form.pk,'formulation-product:'+form.public_id)} for form in query[start:start+size-len(rows)]]
        return paginated(request,query.count()+normalized.count(),rows,page,size)
    raise ValidationError({'section':'Unknown manufacturer profile tab.'})
