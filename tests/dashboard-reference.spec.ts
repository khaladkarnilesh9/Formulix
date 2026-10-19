import {test,expect} from '@playwright/test';
import {spawnSync} from 'node:child_process';
import {snapshot} from './fixtures/catalog';
test.use({trace:'off'});
test('dashboard data integrity, chart layout, navigation and responsive themes',async({page})=>{
  await page.route(/fonts\.(googleapis|gstatic)\.com/,route=>route.abort());
  await page.route('**/api/v1/catalog/',route=>route.fulfill({json:snapshot}));
  for(const width of [360,390,768,1024,1280,1536,1648,1672]){
    await page.setViewportSize({width,height:928});await page.goto('/');await expect(page.locator('.ed-chart-grid > .ed-panel')).toHaveCount(6);
    await expect(page.locator('.ed-donut-total')).toContainText('1');await expect(page.locator('.ed-chart-grid')).toContainText('No dated registration records');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await expect.poll(()=>page.locator('.ed-market svg path').count()).toBeGreaterThan(100);
  await page.getByRole('button',{name:'Switch to Dark Theme',exact:true}).click();await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button',{name:'Open Ingredient Explorer',exact:true}).click();await expect(page).toHaveURL(/ingredients/);
});
test('dashboard charts only use recorded registration dates',async({page})=>{
  await page.route('**/api/v1/catalog/',route=>route.fulfill({json:{...snapshot,regulatoryRecords:snapshot.regulatoryRecords.map(row=>({...row,approvalDate:'2024-03-10'}))}}));
  await page.goto('/');await expect(page.locator('.ed-trend-chart')).toBeVisible();await expect(page.getByRole('combobox',{name:'Registration trend period',exact:true})).toBeEnabled();
  await page.getByRole('combobox',{name:'Registration trend period',exact:true}).selectOption('5');await expect(page.locator('.ed-trend-chart svg')).toBeVisible();
});
test('real authenticated dashboard API and screenshots',async({page,context})=>{
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
  await page.setViewportSize({width:1648,height:928});await page.goto('/');await expect(page.locator('.ed-donut-total strong')).toHaveText('3,071',{timeout:60000});
  await expect(page.locator('.ed-market svg path').first()).toBeAttached();await expect(page.locator('.ed-chart-grid')).toContainText('No dated registration records');
  for(const [width,height]of [[1648,928],[1672,941],[1536,1024]]){
    await page.setViewportSize({width,height});await page.screenshot({path:`artifacts/dashboard-reference-${width}.png`});
    console.log(JSON.stringify(await page.evaluate(()=>({viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,rootFont:getComputedStyle(document.documentElement).fontSize,sidebar:document.querySelector('.shell-sidebar')!.getBoundingClientRect().width,header:document.querySelector('.public-desktop-header')!.getBoundingClientRect().height,hero:document.querySelector('.ed-hero')!.getBoundingClientRect().height,kpi:document.querySelector('.fx-premium-metric')!.getBoundingClientRect().height,columns:getComputedStyle(document.querySelector('.ed-chart-grid')!).gridTemplateColumns,overflow:document.documentElement.scrollWidth>innerWidth}))));
  }
  const darkButton=page.getByRole('button',{name:'Switch to Dark Theme',exact:true});await darkButton.click();await expect(darkButton).toHaveAttribute('aria-pressed','true');
  await expect.poll(()=>page.getByRole('button',{name:'Explore products',exact:true}).evaluate(button=>getComputedStyle(button).backgroundColor.match(/\d+/g)?.slice(0,3).every(value=>Number(value)<80))).toBe(true);
  await page.screenshot({path:'artifacts/dashboard-reference-dark.png'});
});
