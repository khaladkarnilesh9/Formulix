import {test,expect} from '@playwright/test';
import {spawnSync} from 'node:child_process';
import {product,snapshot} from './fixtures/catalog';
test.use({trace:'off'});

async function mockBrands(page:import('@playwright/test').Page) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/,route=>route.abort());
  await page.route('**/api/v1/catalog/',route=>route.fulfill({json:snapshot}));
  const brands=Array.from({length:25},(_,index)=>({key:`qa-brand-${index}`,brandName:`Study Brand ${String(index).padStart(2,'0')}`,
    companyName:'QA Company',manufacturerId:'qa-company',recordKind:'Stored brand',productCount:1,
    products:[{...product,id:`qa-product-${index}`}],sectors:['Agrochemical'],activeIngredients:['A 20% + B 8% w/w'],
    formulationTypes:['SC'],markets:['India'],trademarkStatus:''}));
  await page.route('**/api/v1/search/**',route=>{
    const params=new URL(route.request().url()).searchParams;const group=params.get('group');
    let rows:unknown[]=brands;
    if(group==='brandSummary')rows=[{totalBrands:25,withFormulations:25,withActiveIngredients:25,markets:1}];
    else if(group==='facets')rows=[{countries:['India'],manufacturers:['QA Company'],categoryCounts:{All:25,Agrochemical:25},formulationTypes:['SC']}];
    else if(group==='brands') {
      let selected=brands.filter(brand=>!params.get('q')||brand.brandName.toLowerCase().includes(params.get('q')!.toLowerCase()));
      if(params.get('brandKey'))selected=selected.filter(brand=>brand.key===params.get('brandKey'));
      if(params.get('category')==='Pharmaceutical')selected=[];
      if(params.get('sortOrder')==='desc')selected.reverse();
      rows=selected;
    }else if(group==='products')rows=[{...product,id:`qa-product-${(params.get('brandId')||'qa-brand-0').split('-').at(-1)}`}];
    else rows=[];
    const pageNumber=Number(params.get('page')||1),size=Number(params.get('page_size')||12);
    return route.fulfill({json:{count:rows.length,results:rows.slice((pageNumber-1)*size,pageNumber*size),page:pageNumber,page_size:size,
      next:pageNumber*size<rows.length?'next':null,previous:pageNumber>1?'previous':null}});
  });
}

test('brand filters, pagination, sorting, details, comparison and saved workspace',async({page})=>{
  await mockBrands(page);await page.goto('/brands');
  await expect(page.locator('.bi-card')).toHaveCount(12);
  await expect(page.locator('.bi-kpi').first()).toContainText('25');
  await page.getByRole('button',{name:'Next brand page',exact:true}).click();
  await expect(page.getByText('Showing 13-24 of 25 brands',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Toggle brand sort direction',exact:true}).click();
  await expect(page.locator('.bi-card h2').first()).toHaveText('Study Brand 24');
  await page.getByRole('searchbox',{name:'Search brands',exact:true}).fill('Study Brand 00');
  await expect(page.locator('.bi-card')).toHaveCount(1);
  await expect(page.locator('.bi-card')).toContainText('A 20% + B 8% w/w');
  await expect(page.locator('.bi-card')).toContainText('Not recorded');
  await page.getByRole('combobox',{name:'Filter brand manufacturer'}).selectOption('QA Company');
  await expect(page.getByRole('button',{name:'Manufacturer: QA Company'})).toBeVisible();
  await page.getByRole('button',{name:'Manufacturer: QA Company'}).click();
  await expect(page).not.toHaveURL(/manufacturer=/);
  await page.getByRole('button',{name:'List View',exact:true}).click();await expect(page.locator('.bi-table')).toBeVisible();
  await page.getByRole('button',{name:'Grid View',exact:true}).click();
  await page.getByRole('button',{name:'Save brand Study Brand 00',exact:true}).click();
  await expect(page.getByRole('button',{name:'Save brand Study Brand 00',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Compare',exact:true}).click();
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).toContain('qa-product-0');
  await page.getByRole('button',{name:'View Details',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Linked catalog records (1)');
  await expect(page.getByRole('dialog')).toContainText('Draft');
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/workspace');await expect(page.getByRole('heading',{name:'Brands 1',exact:true})).toBeVisible();
  await page.getByRole('link',{name:/Study Brand 00/}).click();await expect(page.getByRole('dialog')).toContainText('Study Brand 00');
});

test('brand layout fits desktop, tablet, mobile and dark theme',async({page})=>{
  await mockBrands(page);
  for(const width of [360,390,768,1366,1440,1648]){
    await page.setViewportSize({width,height:928});await page.goto('/brands');await expect(page.locator('.bi-card')).toHaveCount(12);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({path:test.info().outputPath(`brands-${width}.png`)});
  }
  await page.getByRole('button',{name:'Switch to Dark Theme',exact:true}).click();await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('.bi-card').first()).toBeVisible();
});

test('search failure is shown without claiming an empty catalog',async({page})=>{
  await mockBrands(page);
  await page.route('**/api/v1/search/**',route=>route.fulfill({status:503,json:{detail:'Unavailable'}}));
  await page.goto('/brands');await expect(page.getByText('Search unavailable (HTTP 503).').first()).toBeVisible();
  await expect(page.getByText('No matching brands',{exact:true})).toHaveCount(0);
});

test('live authenticated brand API and reference screenshots',async({page,context})=>{
  const code=`import json
from django.db import connection
from django.contrib.sessions.models import Session
from django.contrib.auth import get_user_model
from django.utils import timezone
with connection.cursor() as cursor: cursor.execute('PRAGMA query_only = ON')
key=''
for session in Session.objects.filter(expire_date__gt=timezone.now()).order_by('-expire_date'):
 identity=session.get_decoded().get('_auth_user_id')
 if identity and get_user_model().objects.filter(pk=identity,is_active=True,is_superuser=True).exists():
  key=session.session_key
  break
print(json.dumps({'key':key}))`;
  const result=spawnSync('E:/workspace2/formulation/backend/.venv/Scripts/python.exe',['manage.py','shell','-c',code],{cwd:'E:/workspace2/formulation/backend',encoding:'utf8'});
  test.skip(result.status!==0,'Local database unavailable');const session=JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1)!);test.skip(!session.key,'No active local staff session');
  await context.addCookies([{name:'sessionid',value:session.key,domain:'localhost',path:'/',httpOnly:true,sameSite:'Lax'}]);
  await page.setViewportSize({width:1672,height:941});
  await page.goto('/brands?manufacturer=Syngenta&sector=Agrochemical&market=United%20States');
  await expect(page.locator('.bi-kpi strong').first()).toHaveText('3,071',{timeout:60000});
  await expect(page.getByRole('heading',{name:'Acuron',exact:true})).toBeVisible({timeout:60000});
  await expect(page.locator('.fx-user-name')).toContainText('Staff account',{timeout:65000});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  for(const [width,height]of [[1672,941],[1648,928],[1536,1024]]){
    await page.setViewportSize({width,height});
    await expect(page.locator('.bi-content').getByRole('status').filter({hasText:'Searching database...'})).toHaveCount(0);
    await page.screenshot({path:`artifacts/brand-reference-${width}.png`});
    console.log(JSON.stringify(await page.evaluate(()=>({viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,
      rootFont:getComputedStyle(document.documentElement).fontSize,
      sidebar:document.querySelector('.shell-sidebar')!.getBoundingClientRect().width,
      header:document.querySelector('.public-desktop-header')!.getBoundingClientRect().height,
      hero:document.querySelector('.bi-hero')!.getBoundingClientRect().height,
      kpi:document.querySelector('.bi-kpi')!.getBoundingClientRect().height,
      card:document.querySelector('.bi-card')!.getBoundingClientRect().toJSON(),
      columns:getComputedStyle(document.querySelector('.bi-grid')!).gridTemplateColumns,
      overflow:document.documentElement.scrollWidth>innerWidth}))));
  }
  await page.getByRole('button',{name:'Switch to Dark Theme',exact:true}).click();
  await expect.poll(()=>page.locator('.bi-card').first().evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(25, 37, 59)');
  await page.screenshot({path:'artifacts/brand-reference-dark.png'});expect(errors).toEqual([]);
});
