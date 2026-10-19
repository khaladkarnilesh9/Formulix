import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';

test('read-only live Copper Oxychloride API data visual comparison',async({page})=>{
  const code=`import json
from django.db import connection
from django.contrib.auth import get_user_model
from django.urls import resolve
from rest_framework.test import APIRequestFactory,force_authenticate
from apps.formulations.models import Formulation
with connection.cursor() as cursor: cursor.execute('PRAGMA query_only = ON')
user=get_user_model().objects.filter(is_active=True,is_superuser=True).first()
target=Formulation.objects.filter(formulation_name='Copper Oxychloride 50 102').first()
assert user and target
def get(path,params=None):
    request=APIRequestFactory().get(path,params or {})
    force_authenticate(request,user=user)
    response=resolve(path).func(request)
    assert response.status_code==200
    return response.data
print(json.dumps({'catalog':get('/api/v1/catalog/'),'matches':get('/api/v1/search/',{'group':'formulations','q':'Copper Oxychloride','page_size':50}),
 'facets':get('/api/v1/search/',{'group':'facets'}),'target':target.public_id,'status':target.publication_status}))`;
  const result=spawnSync('E:/workspace2/formulation/backend/.venv/Scripts/python.exe',['manage.py','shell','-c',code],{cwd:'E:/workspace2/formulation/backend',encoding:'utf8',maxBuffer:100*1024*1024});
  test.skip(result.status!==0,'Live development database or requested record unavailable.');
  const data=JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1)!);
  expect(data.status).toBe('Draft');
  await page.route('**/api/v1/catalog/',route=>route.fulfill({json:data.catalog}));
  await page.route('**/api/v1/search/**',route=>{
    const params=new URL(route.request().url()).searchParams;
    return route.fulfill({json:params.get('group')==='facets'?data.facets:params.get('identity')?{...data.matches,count:1,results:data.matches.results.filter((row:{id:string})=>row.id===params.get('identity'))}:data.matches});
  });
  await page.addInitScript(()=>sessionStorage.setItem('formulix:formulations:search',JSON.stringify('Copper Oxychloride')));
  for(const width of [1672,1536]){
    await page.setViewportSize({width,height:width===1672?941:1024});
    await page.goto(`/formulations?formulation=${data.target}`);
    await expect(page.locator('.fe-detail-title h2')).toHaveText('Copper Oxychloride 50 102');
    await expect(page.locator('.fe-results-heading')).toContainText('23 matching formulations');
    await expect(page.locator('.fe-product-info')).toContainText('Albaugh');
    await expect(page.locator('.fe-product-info')).toContainText('50.0% Copper Oxychloride');
    await expect.poll(()=>page.locator('.fe-hero > img').evaluate((image:HTMLImageElement)=>image.complete&&image.naturalWidth>0)).toBe(true);
    await page.screenshot({path:test.info().outputPath(`live-formulation-explorer-${width}-light.png`)});
    console.log(JSON.stringify(await page.evaluate(()=>({viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,font:getComputedStyle(document.documentElement).fontSize,
      sidebar:document.querySelector('.shell-sidebar')!.getBoundingClientRect().width,header:document.querySelector('.public-desktop-header')!.getBoundingClientRect().height,
      hero:document.querySelector('.fe-hero')!.getBoundingClientRect().height,filter:document.querySelector('.fe-filters')!.getBoundingClientRect().height,
      columns:getComputedStyle(document.querySelector('.fe-workbench')!).gridTemplateColumns,overflow:document.documentElement.scrollWidth>innerWidth}))));
  }
  await page.getByRole('button',{name:'Switch to Dark Theme',exact:true}).click();
  await page.screenshot({path:test.info().outputPath('live-formulation-explorer-1536-dark.png')});
});
