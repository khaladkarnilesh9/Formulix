import {test,expect,type Page} from '@playwright/test';
import {spawnSync} from 'node:child_process';
import {snapshot,product} from './fixtures/catalog';
test.use({trace:'off'});
const company={...snapshot.manufacturers[0],name:'Albaugh',id:'qa-company',productCount:999,country:'Germany',headquarters:'Recorded headquarters',sector:['Agrochemical'],website:'https://www.albaugh.com/',role:'Manufacturer',recordKind:'Stored company',logoUrl:'',complianceCertifications:[]};
async function mocked(page:Page){
  await page.route(/fonts\.(googleapis|gstatic)\.com/,route=>route.abort());
  await page.route('**/api/v1/catalog/',route=>route.fulfill({json:{...snapshot,manufacturers:[company]}}));
  await page.route('**/api/v1/search/**',route=>{
    const params=new URL(route.request().url()).searchParams;const group=params.get('group');let rows:unknown[]=[];
    if(group==='facets')rows=[{countries:['India'],manufacturers:['Albaugh'],manufacturerCountries:['Germany','France'],categoryCounts:{All:55,Agrochemical:55}}];
    if(group==='manufacturers')rows=params.get('q')==='missing'||params.get('country')==='India'?[]:[company];
    if(group==='manufacturerProfile')rows=params.get('manufacturerKey')==='unknown'?[]:[{company,indexedProducts:55,formulationCount:55,declaredPortfolio:999}];
    if(group==='manufacturerRecords'){
      const section=params.get('section');
      if(section==='formulations')rows=Array.from({length:55},(_,index)=>({...product,id:`qa-product-${index}`,brandName:`QA Brand ${String(index).padStart(2,'0')}`}));
      if(section==='brands')rows=[{name:'QA Brand',recordKind:'Source-reported brand',activeIngredients:['Exact mixture 11% A + 12% B'],formulationTypes:['SC'],markets:['India']}];
      if(section==='ingredients')rows=[{name:'Exact mixture 11% A + 12% B',formulationCount:55,brandCount:55,evidence:'Source-reported / unverified'}];
      if(section==='markets')rows=[{name:'India',products:0,formulations:55,brands:55,registrationReferences:55}];
      if(section==='regulatory')rows=[{name:'QA Brand',registrationNumber:'SOURCE-123',country:'India',authority:'Not recorded',evidence:'Source-reported / unverified',status:'Draft',source:'QA.xlsx',productId:'qa-product-0'}];
    }
    const current=Number(params.get('page')||1),size=Number(params.get('page_size')||50);
    return route.fulfill({json:{count:rows.length,results:rows.slice((current-1)*size,current*size),page:current,page_size:size,next:current*size<rows.length?'next':null,previous:current>1?'previous':null}});
  });
}
test('manufacturer selection, URL reload, server pages, all tabs, corporate site and bookmarks',async({page})=>{
  await mocked(page);await page.goto('/manufacturers');await expect(page.locator('.md-profile h2')).toHaveText('Albaugh');
  await expect(page).toHaveURL(/manufacturer=qa-company/);await page.reload();await expect(page.locator('.md-profile h2')).toHaveText('Albaugh');
  await expect(page.locator('.md-metrics')).toContainText('999');await expect(page.locator('.md-metrics')).toContainText('55');
  await expect(page.getByRole('link',{name:'Visit Corporate Site'})).toHaveAttribute('href','https://www.albaugh.com/');
  await expect(page.locator('.md-logo img').first()).toHaveJSProperty('naturalWidth',160);
  await page.getByRole('button',{name:'Save manufacturer Albaugh',exact:true}).click();await expect(page.getByRole('button',{name:'Save manufacturer Albaugh',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.md-records tbody tr')).toHaveCount(50);await page.getByRole('button',{name:'Next company record page',exact:true}).click();await expect(page.locator('.md-records tbody tr')).toHaveCount(5);
  for(const [label,text]of [['Commercial Brands','Exact mixture'],['Active Ingredients','Source-reported / unverified'],['Markets & Regions','Commercial markets are not headquarters'],['Regulatory Info','SOURCE-123']]){
    await page.getByRole('tab',{name:label,exact:true}).click();await expect(page.locator('.md-records')).toContainText(text);
  }
  await page.getByRole('tab',{name:'Formulations',exact:true}).click();await expect(page.locator('.md-records tbody tr')).toHaveCount(50);
  await page.locator('.md-records tbody tr').first().getByRole('button',{name:'Inspect',exact:true}).click();await expect(page).toHaveURL(/product=qa-product-0/);
});
test('directory filters, unknown company, fallback logos, responsive layout and dark mode',async({page})=>{
  await mocked(page);
  await page.goto('/manufacturers');await expect(page.locator('.md-company-card')).toHaveCount(1);
  await page.getByRole('button',{name:'India',exact:true}).click();await expect(page.getByText('No matching manufacturers',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Reset filters',exact:true}).click();await expect(page.locator('.md-company-card')).toHaveCount(1);
  await page.getByRole('searchbox',{name:'Search manufacturers'}).fill('missing');await expect(page.getByText('No matching manufacturers',{exact:true})).toBeVisible();
  await page.goto('/manufacturers?manufacturer=unknown');await expect(page.getByText('Manufacturer unavailable',{exact:true})).toBeVisible();
  await page.route('**/assets/company-logos/albaugh.svg',route=>route.abort());
  for(const width of [360,390,768,1366,1440,1648]){
    await page.setViewportSize({width,height:928});await page.goto('/manufacturers');await expect(page.locator('.md-profile h2')).toHaveText('Albaugh');
    await expect(page.locator('.md-logo').first().locator('svg')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({path:test.info().outputPath(`manufacturer-${width}.png`)});
  }
  await page.getByRole('button',{name:'Switch to Dark Theme',exact:true}).click();await expect(page.locator('html')).toHaveClass(/dark/);
});
test('live authenticated manufacturer dossier and reference screenshots',async({page,context})=>{
  const code=`import json
from django.db import connection
from django.contrib.sessions.models import Session
from django.contrib.auth import get_user_model
from django.utils import timezone
with connection.cursor() as cursor: cursor.execute('PRAGMA query_only=ON')
key=''
for session in Session.objects.filter(expire_date__gt=timezone.now()).order_by('-expire_date'):
 identity=session.get_decoded().get('_auth_user_id')
 if identity and get_user_model().objects.filter(pk=identity,is_active=True,is_superuser=True).exists():
  key=session.session_key
  break
print(json.dumps({'key':key}))`;
  const result=spawnSync('E:/workspace2/formulation/backend/.venv/Scripts/python.exe',['manage.py','shell','-c',code],{cwd:'E:/workspace2/formulation/backend',encoding:'utf8'});
  test.skip(result.status!==0,'Local database unavailable');const session=JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1)!);test.skip(!session.key,'No active staff session');
  await context.addCookies([{name:'sessionid',value:session.key,domain:'localhost',path:'/',httpOnly:true,sameSite:'Lax'}]);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:1648,height:928});await page.goto('/manufacturers');
  await expect(page.locator('.md-profile h2')).toHaveText('Adama',{timeout:60000});
  await expect(page.locator('.md-records tbody tr')).toHaveCount(50,{timeout:60000});
  await expect(page.locator('.fx-user-name')).toContainText('Staff account',{timeout:65000});
  for(const [width,height]of [[1648,928],[1672,941],[1536,1024]]){
    await page.setViewportSize({width,height});await expect(page.locator('.md-workbench').getByRole('status').filter({hasText:'Searching database...'})).toHaveCount(0);
    await page.screenshot({path:`artifacts/manufacturer-reference-${width}.png`});
    console.log(JSON.stringify(await page.evaluate(()=>({viewport:[innerWidth,innerHeight],sidebar:document.querySelector('.shell-sidebar')!.getBoundingClientRect().width,
      header:document.querySelector('.public-desktop-header')!.getBoundingClientRect().height,hero:document.querySelector('.md-hero')!.getBoundingClientRect().height,
      columns:getComputedStyle(document.querySelector('.md-workbench')!).gridTemplateColumns,card:document.querySelector('.md-company-card')!.getBoundingClientRect().height,
      logo:document.querySelector('.md-logo')!.getBoundingClientRect().width,largeLogo:document.querySelector('.md-logo-large')!.getBoundingClientRect().width,
      overflow:document.documentElement.scrollWidth>innerWidth}))));
  }
  for(const name of ['Albaugh','Biostadt','Corteva']){
    await page.getByRole('button',{name:`Select ${name}`,exact:true}).click();await expect(page.locator('.md-profile h2')).toHaveText(name);
    await expect.poll(()=>page.locator('.md-logo-large img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
  }
  for(const tab of ['Commercial Brands','Active Ingredients','Markets & Regions','Regulatory Info']){
    await page.getByRole('tab',{name:tab,exact:true}).click();await expect(page.locator('.md-records tbody tr').first()).toBeVisible();
  }
  await page.getByRole('tab',{name:'Formulations',exact:true}).click();
  await page.getByRole('button',{name:'Select Adama',exact:true}).click();await expect(page.locator('.md-profile h2')).toHaveText('Adama');
  await expect(page.locator('.md-records tbody tr')).toHaveCount(50);
  await expect(page.locator('.md-metrics > div').nth(1)).toContainText('279');
  await page.getByRole('button',{name:'Switch to Dark Theme',exact:true}).click();
  await expect.poll(()=>page.locator('.md-records').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(25, 37, 59)');
  await expect(page.locator('.md-workbench').getByRole('status').filter({hasText:'Searching database...'})).toHaveCount(0);
  await page.screenshot({path:'artifacts/manufacturer-reference-dark.png'});expect(errors).toEqual([]);
});
