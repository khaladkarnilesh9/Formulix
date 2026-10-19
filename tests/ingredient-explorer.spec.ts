import {test,expect,type Page} from '@playwright/test';
import {spawnSync} from 'node:child_process';
import {snapshot,product} from './fixtures/catalog';
const source={sourceText:'75.0% Metribuzin',productCount:23,recordKind:'Active ingredient source text',verificationStatus:'Source-reported / unverified',categories:['Agrochemical'],markets:['United States','Europe'],updatedAt:'2026-10-10T00:00:00Z'};
const chemical={id:'qa-chemical',name:'QA verified chemical',casNumber:'21087-64-9',molecularFormula:'C8H14N4OS',molecularWeight:214.29,iupacName:'Stored QA identity',smiles:'CC(=O)O',inchiKey:'Stored QA key',category:'Triazinone',industrySector:'Agrochemical',verificationState:'Verified',sourceTitle:'QA stored source',synonyms:['Stored synonym'],scientificProperties:[{name:'Primary Use',value:'Herbicide',unit:'',conditions:''}],hazardStatements:[],relatedProductIds:[],relatedManufacturers:[],linkedListingCount:23,markets:['United States'],updatedAt:'2026-10-10T00:00:00Z'};
const result=(results:unknown[],count=results.length,page=1,size=20)=>({results,count,page,page_size:size,next:page*size<count?'next':null,previous:page>1?'previous':null});
async function setup(page:Page){
  await page.route(/fonts\.(googleapis|gstatic)\.com/,route=>route.abort());
  await page.route('**/api/v1/catalog/',route=>route.fulfill({json:snapshot}));
  await page.route('**/api/v1/search/**',route=>{
    const params=new URL(route.request().url()).searchParams;const group=params.get('group');const current=Number(params.get('page'));
    if(!group)return route.fulfill({json:{groups:{activeIngredients:result([source],1,1,10),ingredients:result([]),products:result([]),formulations:result([]),manufacturers:result([]),regulatory:result([]),documents:result([])}}});
    if(group==='facets')return route.fulfill({json:result([{countries:['United States','Europe'],manufacturers:['QA Company'],formulationTypes:['WG'],categoryCounts:{All:23,Agrochemical:23},activeSourceCount:21,chemicalCount:1,linkedFormulationCount:23}],1)});
    if(group==='activeIngredients')return route.fulfill({json:result(params.get('verificationStatus')==='Verified'?[]:params.get('sourceExact')?[source]:current===2?[{...source,sourceText:'Second page source'}]:[source,{...source,sourceText:'Mixture A + B'}],params.get('verificationStatus')==='Verified'?0:params.get('sourceExact')?1:21,current)});
    if(group==='ingredients')return route.fulfill({json:result([chemical])});
    if(group==='products')return route.fulfill({json:result([{...product,brandName:current===2?'Second linked formulation':'QA Metribuzin WG',activeIngredient:source.sourceText,country:'United States'}],23,current,10)});
    return route.fulfill({json:result([])});
  });
}
test('source identity, selection history, tabs, bookmarks, export and related pagination',async({page})=>{
  await setup(page);await page.setViewportSize({width:1648,height:928});await page.goto('/ingredients');
  await expect(page.locator('.ie-detail-title h2')).toHaveText(source.sourceText);
  await expect(page.locator('.ie-property-grid .ie-tile')).toHaveCount(12);
  const cas=page.locator('.ie-property-grid .ie-tile').filter({hasText:'CAS Number'});await expect(cas).toContainText('Not recorded');
  await page.getByRole('button',{name:'Save selected 75.0% Metribuzin',exact:true}).click();
  await expect(page.getByRole('button',{name:'Save selected 75.0% Metribuzin',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Mixture A + B',exact:true}).click();await expect(page).toHaveURL(/ingredient=source/);
  await page.getByRole('button',{name:'75.0% Metribuzin',exact:true}).click();await page.goBack();await expect(page.locator('.ie-detail-title h2')).toHaveText('Mixture A + B');
  await page.getByRole('tab',{name:'Chemical Identity',exact:true}).click();await expect(page.getByRole('tabpanel')).toContainText('CAS, formula, molecular weight and structure are not assigned');
  await page.getByRole('tab',{name:'Properties',exact:true}).click();await expect(page.getByRole('tabpanel')).toContainText('Formulation properties are not assigned');
  await page.getByRole('tab',{name:'Synonyms & References',exact:true}).click();await expect(page.getByRole('tabpanel')).toContainText('No recorded synonyms');
  await page.getByRole('tab',{name:'Regulatory Information',exact:true}).click();await expect(page.getByRole('tabpanel')).toContainText('not proof of approval');
  await page.getByRole('tab',{name:/^Formulations/}).click();await page.locator('.ie-related').getByRole('button',{name:'Next search page',exact:true}).click();await expect(page.getByRole('button',{name:'Second linked formulation',exact:true})).toBeVisible();
  await page.locator('.ie-export summary').click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download JSON'}).click();expect((await download).suggestedFilename()).toBe('formulix-ingredient.json');
  await page.getByRole('button',{name:'Second linked formulation',exact:true}).click();await expect(page).toHaveURL(/formulations\?formulation=qa-form/);
});
test('registry fields, server-side filters and searches, mobile drawer, dark mode and overflow',async({page})=>{
  await setup(page);await page.setViewportSize({width:1648,height:928});await page.goto('/ingredients?ingredient=qa-chemical');
  await expect(page.locator('.ie-detail-title h2')).toHaveText(chemical.name);await expect(page.locator('.ie-property-grid')).toContainText(chemical.casNumber);
  await page.getByRole('tab',{name:'Synonyms & References',exact:true}).click();await expect(page.getByRole('tabpanel')).toContainText('Stored synonym');
  await page.getByRole('tab',{name:'Chemical Identity',exact:true}).click();await expect(page.locator('.ie-identifier')).toHaveCount(5);
  for(const query of ['21087-64-9','Stored synonym']){const request=page.waitForRequest(r=>r.url().includes('/search/')&&new URL(r.url()).searchParams.get('q')===query);await page.getByRole('searchbox',{name:'Search chemical registry'}).fill(query);await request;}
  const request=page.waitForRequest(r=>r.url().includes('/search/')&&new URL(r.url()).searchParams.get('verificationStatus')==='Verified');await page.getByRole('combobox',{name:'Verification Status',exact:true}).selectOption('Verified');await request;
  await page.getByRole('button',{name:'Reset',exact:true}).click();await expect(page.getByRole('searchbox',{name:'Search chemical registry'})).toHaveValue('');
  for(const width of [360,390,768,1024,1280,1536,1648,1672]){await page.setViewportSize({width,height:width===1648?928:1024});await page.goto('/ingredients');await expect(page.locator('.ie-detail-title h2')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await page.screenshot({path:test.info().outputPath(`ingredients-${width}.png`)});}
  await page.getByRole('button',{name:'Switch to Dark Theme',exact:true}).click();await page.screenshot({path:test.info().outputPath('ingredients-dark.png')});
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Filters',exact:true}).click();await expect(page.getByRole('dialog',{name:'Ingredient filters'})).toBeVisible();await page.getByRole('button',{name:'Apply Filters',exact:true}).click();
});
test('actual read-only Metribuzin source records and API visual comparison',async({page})=>{
  const code=`import json
from django.db import connection
from django.contrib.auth import get_user_model
from django.urls import resolve
from rest_framework.test import APIRequestFactory,force_authenticate
with connection.cursor() as cursor: cursor.execute('PRAGMA query_only = ON')
user=get_user_model().objects.filter(is_active=True,is_superuser=True).first()
assert user
def get(params):
 request=APIRequestFactory().get('/api/v1/search/',params)
 force_authenticate(request,user=user)
 response=resolve('/api/v1/search/').func(request)
 assert response.status_code==200
 return response.data
print(json.dumps({'sources':get({'group':'activeIngredients','q':'metri','page_size':20}),'facets':get({'group':'facets'}),'linked':get({'group':'products','sourceExact':'75.0% Metribuzin','page_size':10})}))`;
  const process=spawnSync('E:/workspace2/formulation/backend/.venv/Scripts/python.exe',['manage.py','shell','-c',code],{cwd:'E:/workspace2/formulation/backend',encoding:'utf8',maxBuffer:20*1024*1024});
  expect(process.status,process.stderr).toBe(0);const data=JSON.parse(process.stdout.trim().split(/\r?\n/).at(-1)!);expect(data.sources.results.some((row:{sourceText:string})=>row.sourceText===source.sourceText)).toBe(true);
  console.log(JSON.stringify({actualSourceMatches:data.sources.count,actualLinkedListings:data.linked.count,registry:data.facets.results[0].chemicalCount}));
  await page.route('**/api/v1/catalog/',route=>route.fulfill({json:{...snapshot,products:[],formulations:[],ingredients:[]}}));
  await page.route('**/api/v1/search/**',route=>{const group=new URL(route.request().url()).searchParams.get('group');return route.fulfill({json:group==='facets'?data.facets:group==='activeIngredients'?data.sources:group==='products'?data.linked:result([])});});
  await page.addInitScript(()=>sessionStorage.setItem('formulix:ingredients:search',JSON.stringify('metri')));
  for(const [width,height] of [[1648,928],[1672,941],[1536,1024]]){
    await page.setViewportSize({width,height});await page.goto('/ingredients?ingredient='+encodeURIComponent('source:75.0% Metribuzin'));
    await expect(page.locator('.ie-detail-title h2')).toHaveText(source.sourceText);await expect(page.locator('.ie-property-grid')).toContainText('Not recorded');await expect(page.locator('.ie-related tbody tr')).toHaveCount(10);
    await expect.poll(()=>page.locator('.ie-hero > img').evaluate((image:HTMLImageElement)=>image.complete&&image.naturalWidth>0)).toBe(true);
    await page.screenshot({path:`artifacts/ingredient-explorer-${width}.png`});
    console.log(JSON.stringify(await page.evaluate(()=>({viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,rootFont:getComputedStyle(document.documentElement).fontSize,sidebar:document.querySelector('.shell-sidebar')!.getBoundingClientRect().width,header:document.querySelector('.public-desktop-header')!.getBoundingClientRect().height,hero:document.querySelector('.ie-hero')!.getBoundingClientRect().height,filters:document.querySelector('.ie-filters')!.getBoundingClientRect().height,columns:getComputedStyle(document.querySelector('.ie-workbench')!).gridTemplateColumns,overflow:document.documentElement.scrollWidth>innerWidth}))));
  }
  await page.getByRole('button',{name:'Switch to Dark Theme',exact:true}).click();await page.screenshot({path:'artifacts/ingredient-explorer-dark.png'});
});

test('global source navigation, saved ingredient reopening and scientific image fallback',async({page})=>{
  await setup(page);await page.setViewportSize({width:1648,height:928});await page.goto('/ingredients?ingredient=ing-1');
  await expect(page.locator('.ie-detail-title h2')).toHaveText(source.sourceText);await page.goto('/');
  await page.getByRole('button',{name:'Global search',exact:true}).click();await page.getByRole('textbox',{name:'Global search',exact:true}).fill('Metribuzin');
  await page.getByRole('dialog').getByRole('button',{name:source.sourceText,exact:true}).click();await expect(page).toHaveURL(/ingredient=source/);await expect(page.locator('.ie-detail-title h2')).toHaveText(source.sourceText);
  await page.getByRole('button',{name:`Save selected ${source.sourceText}`,exact:true}).click();await page.goto('/workspace');
  await page.getByRole('link',{name:source.sourceText,exact:true}).click();await expect(page.locator('.ie-detail-title h2')).toHaveText(source.sourceText);
  await page.locator('.ie-results').getByRole('button',{name:'Next search page',exact:true}).click();await expect(page.getByRole('button',{name:'Second page source',exact:true})).toBeVisible();
  await page.route('**/assets/scientific/material-powder.webp',route=>route.abort());await page.reload();await expect(page.locator('.ie-thumbnail-large > svg')).toBeVisible();
  await page.getByRole('tab',{name:'Overview',exact:true}).focus();await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'Chemical Identity',exact:true})).toHaveAttribute('aria-selected','true');
});
