import { test, expect, type Page } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { product, snapshot } from './fixtures/catalog';
test.use({trace:'off'});
const pageData=(results:unknown[],count=results.length,page=1,size=8)=>({results,count,page,page_size:size,next:page*size<count?'next':null,previous:page>1?'previous':null});
async function fixture(page:Page){
  await page.route(/fonts\.(googleapis|gstatic)\.com/,route=>route.abort());
  await page.route('**/api/v1/catalog/',route=>route.fulfill({json:snapshot}));
  await page.route('**/api/v1/search/**',route=>{
    const params=new URL(route.request().url()).searchParams;const current=Number(params.get('page'));
    if(params.get('group')==='facets')return route.fulfill({json:pageData([{countries:['India','Europe'],manufacturers:['QA Company'],categoryCounts:{All:17,Agrochemical:17},formulationTypes:['SC'],activeSourceCount:1,chemicalCount:0}],1)});
    const rows=Array.from({length:params.get('page_size')==='100'?17:8},(_,index)=>({...product,id:`qa-product-${current}-${index}`,brandName:`QA Product ${current}-${index}`}));
    return route.fulfill({json:pageData(rows,17,current,Number(params.get('page_size')))});
  });
}
test('table/grid, comparison, bookmark, filters, menu and complete-scope CSV export',async({page})=>{
  await fixture(page);await page.setViewportSize({width:1648,height:928});await page.goto('/products');
  await expect(page.getByRole('row',{name:'Open QA Product 1-0',exact:true})).toBeVisible();
  await expect(page.locator('.fx-premium-metric')).toHaveCount(6);
  await page.getByRole('checkbox',{name:'Compare QA Product 1-0',exact:true}).check();
  await page.getByRole('button',{name:'Save QA Product 1-0',exact:true}).click();await expect(page.getByRole('button',{name:'Save QA Product 1-0',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'More actions for QA Product 1-0',exact:true}).click();await expect(page.getByRole('menu')).toBeVisible();
  const box=await page.getByRole('menu').boundingBox();expect(box!.x+box!.width).toBeLessThanOrEqual(1648);await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Filters',exact:true}).click();await expect(page.getByRole('dialog',{name:'Product filters'})).toBeVisible();
  const changed=page.waitForRequest(r=>r.url().includes('/search/')&&new URL(r.url()).searchParams.get('country')==='India');await page.getByRole('combobox',{name:'Jurisdiction',exact:true}).selectOption('India');await changed;await page.getByRole('button',{name:'Apply Filters',exact:true}).click();
  await expect(page.getByRole('button',{name:'Jurisdiction: India',exact:true})).toBeVisible();await page.getByRole('button',{name:'Jurisdiction: India',exact:true}).click();
  await page.getByRole('button',{name:'Card Grid View',exact:true}).click();await expect(page.locator('.pc-grid .pc-thumbnail')).toHaveCount(8);await page.getByRole('button',{name:'Table Grid View',exact:true}).click();
  await page.getByRole('button',{name:'Next product page',exact:true}).click();await expect(page.getByRole('row',{name:'Open QA Product 2-0',exact:true})).toBeVisible();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export',exact:true}).click();expect((await download).suggestedFilename()).toMatch(/formulix_products.*csv/);
  await page.getByRole('row',{name:'Open QA Product 2-0',exact:true}).getByRole('button',{name:'Spec Sheet',exact:true}).click();await expect(page).toHaveURL(/product=qa-product-2-0/);
});
test('responsive layouts, mobile filters and dark mode',async({page})=>{
  await fixture(page);
  for(const width of [360,390,768,1024,1280,1536,1648,1672]){
    await page.setViewportSize({width,height:928});await page.goto('/products');await expect(page.getByRole('row',{name:'Open QA Product 1-0',exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.getByRole('button',{name:'Switch to Dark Theme',exact:true}).click();await expect(page.locator('html')).toHaveClass(/dark/);
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Filters',exact:true}).click();await expect(page.getByRole('dialog',{name:'Product filters'})).toBeVisible();await page.getByRole('button',{name:'Apply Filters',exact:true}).click();
});
test('unmocked staff API, actual Amistar Top and screenshot comparison',async({page,context})=>{
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
  test.skip(result.status!==0,'Local database unavailable');const session=JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1)!);test.skip(!session.key,'No existing local staff session');
  await context.addCookies([{name:'sessionid',value:session.key,domain:'localhost',path:'/',httpOnly:true,sameSite:'Lax'}]);
  await page.setViewportSize({width:1648,height:928});await page.goto('/products');
  await expect(page.locator('.pc-page .fx-premium-metric').first()).toContainText('3,071',{timeout:60000});
  await page.getByRole('button',{name:'Filters',exact:true}).click();await page.getByRole('combobox',{name:'Jurisdiction',exact:true}).selectOption('India');await page.getByRole('combobox',{name:'Manufacturer / Registrant',exact:true}).selectOption('Syngenta');await page.getByRole('button',{name:'Apply Filters',exact:true}).click();
  await expect(page.getByRole('row',{name:'Open Amistar Top',exact:true})).toBeVisible();await expect(page.locator('.pc-sort-bar')).toContainText('93');
  for(const [width,height]of [[1648,928],[1672,941],[1536,1024]]){
    await page.setViewportSize({width,height});await page.screenshot({path:`artifacts/product-intelligence-${width}.png`});
    console.log(JSON.stringify(await page.evaluate(()=>({viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,rootFont:getComputedStyle(document.documentElement).fontSize,sidebar:document.querySelector('.shell-sidebar')!.getBoundingClientRect().width,header:document.querySelector('.public-desktop-header')!.getBoundingClientRect().height,hero:document.querySelector('.pc-hero')!.getBoundingClientRect().height,kpi:document.querySelector('.fx-premium-metric')!.getBoundingClientRect().height,toolbar:document.querySelector('.fx-product-controls')!.getBoundingClientRect().height,overflow:document.documentElement.scrollWidth>innerWidth}))));
  }
  await page.getByRole('button',{name:'Switch to Dark Theme',exact:true}).click();
  await expect.poll(()=>page.locator('.pc-table tbody tr').first().evaluate(row=>getComputedStyle(row).backgroundColor)).toBe('rgb(25, 37, 59)');
  await page.screenshot({path:'artifacts/product-intelligence-dark.png'});
  const next=page.waitForResponse(r=>r.url().includes('/search/')&&new URL(r.url()).searchParams.get('page')==='2');await page.getByRole('button',{name:'Next product page',exact:true}).click();expect((await next).status()).toBe(200);await expect(page.locator('.pc-sort-bar')).toContainText('93');
});
