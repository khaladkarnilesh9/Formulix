import { test, expect } from '@playwright/test';
import { form as baseForm, product, snapshot as baseCatalog } from './fixtures/catalog';

const copper={...baseForm,id:'qa-copper',name:'Copper Oxychloride QA',formulationType:'WG',marketData:{...baseForm.marketData,
  'Product Classification':'Fungicide','Active Ingredient & % (w/w)':'50.0% Copper Oxychloride',
  'Dispersing / Wetting Agent & CAS No.':'QA dispersant / source text', 'Carrier / Solvent Matrix & CAS No.':'Water CAS 7732-18-5',
  'Functional Excipients & CAS No.':'Not recorded', 'pH Range':'5.9 - 7.2','Density / Specific Gravity (g/mL)':'0.69 g/mL',
  'Flash Point Range (\u00b0C)':'N/A (source-reported)', 'Viscosity Profile (mPa\u00b7s / cP)':'N/A (source-reported)',
  'WHO Hazard Classification':'QA unverified hazard reference','CIBRC Toxicity Color Band':'QA unverified band','Patent Reference':'QA patent reference',
  'Pest Control / Target Diseases':'Source-reported target use',
}};
const mixture={...copper,id:'qa-mixture',name:'QA Mixture SC',formulationType:'SC',marketData:{...copper.marketData,'Active Ingredient & % (w/w)':'18.2% Azoxystrobin + 11.4% Difenoconazole'}};
const missing={...baseForm,id:'qa-missing',name:'QA Missing Properties',marketData:undefined};
const rows=[copper,mixture,missing];

test.beforeEach(async({page})=>{
  await page.route(/fonts\.(googleapis|gstatic)\.com/,route=>route.abort());
  await page.route('**/api/v1/catalog/',route=>route.fulfill({json:{...baseCatalog,formulations:rows,products:[{...product,formulationId:copper.id}],publicationCounts:{Draft:3}}}));
  await page.route('**/api/v1/search/**',route=>{
    const params=new URL(route.request().url()).searchParams;
    let results:unknown[]=rows;
    if(params.get('group')==='facets')results=[{countries:['India'],manufacturers:['QA Company'],formulationTypes:['SC','WG'],categoryCounts:{All:3},manufacturerCountries:[],documentTypes:[],regulatoryAuthorities:[]}];
    else if(params.get('identity'))results=rows.filter(row=>row.id===params.get('identity'));
    else results=rows.filter(row=>!params.get('q')||row.name.toLowerCase().includes(params.get('q')!.toLowerCase()));
    return route.fulfill({json:{count:results.length,results,next:null,previous:null,page:1,page_size:50}});
  });
});

test('reference layout, selection history, bookmarks, tabs, scientific text and export',async({page})=>{
  await page.setViewportSize({width:1672,height:941});
  await page.goto('/formulations');
  await expect(page.locator('.fe-detail-title h2')).toHaveText(copper.name);
  await expect(page.locator('.fe-property-grid').first().locator('.fe-fact')).toHaveCount(16);
  const measurements=await page.evaluate(()=>({sidebar:document.querySelector('.shell-sidebar')!.getBoundingClientRect().width,
    header:document.querySelector('.public-desktop-header')!.getBoundingClientRect().height,hero:document.querySelector('.fe-hero')!.getBoundingClientRect().height,
    columns:getComputedStyle(document.querySelector('.fe-property-grid')!).gridTemplateColumns.split(' ').length}));
  expect(measurements).toEqual({sidebar:246,header:60,hero:164,columns:4});
  await page.locator('.fe-result').filter({hasText:mixture.name}).click();
  await expect(page).toHaveURL(/formulation=qa-mixture/);
  await expect(page.locator('.fe-detail-title h2')).toHaveText(mixture.name);
  await page.locator('.fe-result').filter({hasText:copper.name}).click();
  await page.goBack();
  await expect(page.locator('.fe-detail-title h2')).toHaveText(mixture.name);
  await page.getByRole('button',{name:'Bookmark selected formulation',exact:true}).click();
  await expect(page.getByRole('button',{name:'Bookmark selected formulation',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('tab',{name:'Composition',exact:true}).click();
  await expect(page.locator('#fe-panel-composition')).toContainText('18.2% Azoxystrobin + 11.4% Difenoconazole');
  await expect(page.locator('#fe-panel-composition')).toContainText('No structured composition');
  await page.getByRole('tab',{name:'Process',exact:true}).click();
  await expect(page.locator('#fe-panel-process')).toContainText('No recorded manufacturing process');
  await page.getByRole('tab',{name:'Properties',exact:true}).click();
  await expect(page.locator('#fe-panel-properties')).toContainText('0.69 g/mL');
  await page.getByRole('tab',{name:'Sources & Patents',exact:true}).click();
  await expect(page.locator('#fe-panel-sources')).toContainText(mixture.sourceReference);
  await page.locator('.fe-export summary').click();
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'JSON record',exact:true}).click();
  expect((await download).suggestedFilename()).toContain('.json');
  await page.locator('.fe-result').filter({hasText:missing.name}).click();
  await expect(page.locator('#fe-panel-overview')).toContainText('Not available');
});

test('search and filters use supported server parameters and reset together',async({page})=>{
  await page.goto('/formulations');
  await expect(page.locator('.fe-detail-title h2')).toBeVisible();
  const request=page.waitForRequest(r=>r.url().includes('/search/')&&new URL(r.url()).searchParams.get('publishStatus')==='Draft');
  await page.getByRole('combobox',{name:'Formulation publication status',exact:true}).selectOption('Draft');
  const url=new URL((await request).url());expect(url.searchParams.get('group')).toBe('formulations');expect(url.searchParams.get('page')).toBe('1');
  await page.getByRole('combobox',{name:'Sort formulations',exact:true}).selectOption('-updated_at');
  await page.getByRole('searchbox',{name:'Search formulations',exact:true}).fill('Copper');
  await expect(page.locator('.fe-result')).toHaveCount(1);
  await page.getByRole('button',{name:'Reset',exact:true}).click();
  await expect(page.getByRole('combobox',{name:'Formulation publication status',exact:true})).toHaveValue('All');
  await expect(page.locator('.fe-result')).toHaveCount(3);
});

test('responsive geometry, drawer, image fallback, dark theme and scoped styling',async({page})=>{
  for(const width of [360,390,768,1024,1280,1536,1672]){
    await page.setViewportSize({width,height:1024});
    await page.goto('/formulations');
    await expect(page.locator('.fe-detail-title h2')).toHaveText(copper.name);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({path:test.info().outputPath(`formulations-${width}-light.png`)});
  }
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Open formulation filters',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Formulation filters',exact:true})).toBeVisible();
  await page.getByRole('dialog').getByRole('combobox',{name:'Formulation type',exact:true}).selectOption('WG');
  await page.getByRole('button',{name:'Apply',exact:true}).click();
  await page.getByRole('button',{name:'Switch to dark theme',exact:true}).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.screenshot({path:test.info().outputPath('formulations-390-dark.png')});
  await page.route('**/material-granules.webp',route=>route.abort());
  await page.goto('/formulations');
  await expect(page.locator('.fe-material').first().locator('svg')).toBeVisible();
  await page.setViewportSize({width:1672,height:941});
  await page.goto('/products');
  expect(await page.locator('.shell-sidebar').first().evaluate(element=>element.getBoundingClientRect().width)).toBe(260);
});
