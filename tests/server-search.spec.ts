import { test, expect, type Page } from '@playwright/test';
import { product, snapshot } from './fixtures/catalog';

const axial = { ...product, id: 'formulation-product:qa-axial', formulationId: 'qa-axial', brandName: 'Axial Pro 150',
  manufacturerName: 'Syngenta', activeIngredient: '5.0% Pinoxaden', country: 'Europe', formulationType: 'EC' };
const paginated = (results: unknown[], count = results.length, page = 1, pageSize = 8) => ({ results, count, page, page_size: pageSize,
  next: page * pageSize < count ? 'next' : null, previous: page > 1 ? 'previous' : null });
async function catalog(page: Page) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  await page.route('**/api/v1/catalog/', route => route.fulfill({ json: { ...snapshot, products: [], formulations: [] } }));
}

test('product search reads paginated server results absent from the loaded catalog and opens dossier', async ({ page }) => {
  await catalog(page);
  const queries: string[] = [];
  await page.route('**/api/v1/search/**', route => {
    const url = new URL(route.request().url());
    queries.push(url.searchParams.get('q') ?? '');
    return route.fulfill({ json: paginated(url.searchParams.get('q') === 'Axial-Pro 150' ? [axial] : []) });
  });
  await page.goto('/products');
  await page.getByRole('textbox', { name: 'Search products', exact: true }).fill('Axial-Pro 150');
  await expect(page.getByRole('row', { name: 'Open Axial Pro 150', exact: true })).toBeVisible();
  expect(queries).toContain('Axial-Pro 150');
  await page.getByRole('row', { name: 'Open Axial Pro 150', exact: true }).click();
  await expect(page).toHaveURL(/product=.*qa-axial/);
  await expect(page.getByRole('heading', { name: 'Axial Pro 150', exact: true })).toBeVisible();
});

test('rapid searches cancel stale requests and never replace the latest result', async ({ page }) => {
  await catalog(page);
  await page.route('**/api/v1/search/**', async route => {
    const q = new URL(route.request().url()).searchParams.get('q');
    if (q === 'old') await new Promise(resolve => setTimeout(resolve, 1100));
    await route.fulfill({ json: paginated(q === 'new' ? [axial] : q === 'old' ? [{ ...axial, brandName: 'Stale result' }] : []) }).catch(() => {});
  });
  await page.goto('/products');
  const input = page.getByRole('textbox', { name: 'Search products', exact: true });
  const requested = page.waitForRequest(request => request.url().includes('/search/') && new URL(request.url()).searchParams.get('q') === 'old');
  await input.fill('old');
  await requested;
  await input.fill('new');
  await expect(page.getByRole('row', { name: 'Open Axial Pro 150', exact: true })).toBeVisible();
  await page.waitForTimeout(1300);
  await expect(page.getByText('Stale result', { exact: true })).toHaveCount(0);
});

test('counts and page requests come from server, filters reset pagination', async ({ page }) => {
  await catalog(page);
  await page.route('**/api/v1/search/**', route => {
    const url = new URL(route.request().url());
    const current = Number(url.searchParams.get('page'));
    if (url.searchParams.get('group') === 'facets') return route.fulfill({ json: paginated([{ countries: ['India', 'Europe'], manufacturers: ['Syngenta'], formulationTypes: ['EC'], categoryCounts: { All: 17 }, manufacturerCountries: [], documentTypes: [], regulatoryAuthorities: [] }], 1, 1, 1) });
    return route.fulfill({ json: paginated([{ ...axial, brandName: current === 2 ? 'Page two product' : axial.brandName }], 17, current) });
  });
  await page.goto('/products');
  await expect(page.getByRole('row', { name: 'Open Axial Pro 150', exact: true })).toBeVisible();
  const buttons = page.getByRole('button', { name: /Next.*page/i });
  await buttons.first().click();
  await expect(page.getByRole('row', { name: 'Open Page two product', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  const request = page.waitForRequest(request => request.url().includes('/search/') && new URL(request.url()).searchParams.get('country') === 'India');
  await page.getByRole('combobox', { name: /Jurisdiction/ }).selectOption('India');
  const url = new URL((await request).url());
  expect(url.searchParams.get('page')).toBe('1');
});

test('malformed response and transport failure show errors, not an empty database', async ({ page }) => {
  await catalog(page);
  await page.route('**/api/v1/search/**', route => route.fulfill({ json: { data: [axial] } }));
  await page.goto('/products');
  await expect(page.getByRole('alert')).toContainText('Invalid search response');
  await page.unroute('**/api/v1/search/**');
  await page.route('**/api/v1/search/**', route => route.fulfill({ status: 503, json: { detail: 'Unavailable' } }));
  await page.getByRole('button', { name: 'Retry search', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('HTTP 503');
});

test('global search uses grouped API contract and preserves result navigation', async ({ page }) => {
  await catalog(page);
  await page.route('**/api/v1/search/**', route => route.fulfill({ json: { groups: {
    products: paginated([axial], 1, 1, 10), formulations: paginated([], 0, 1, 10),
    ingredients: paginated([], 0, 1, 10), manufacturers: paginated([], 0, 1, 10),
    regulatory: paginated([], 0, 1, 10), documents: paginated([], 0, 1, 10),
  } } }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Global search', exact: true }).click();
  await page.getByRole('textbox', { name: 'Global search', exact: true }).fill('Axial');
  await expect(page.getByRole('dialog').getByText('Axial Pro 150', { exact: true })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: /Axial Pro 150/ }).click();
  await expect(page).toHaveURL(/product=.*qa-axial/);
});

test('mobile server search stays within viewport', async ({ page }) => {
  await catalog(page);
  await page.route('**/api/v1/search/**', route => route.fulfill({ json: paginated([axial]) }));
  for (const width of [360, 390, 768, 1366, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/products');
    await expect(page.getByRole('row', { name: 'Open Axial Pro 150', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test('same-session catalog refresh retains completed results while search refreshes', async ({ page }) => {
  await catalog(page);
  let delay = false;
  await page.route('**/api/v1/search/**', async route => {
    if (delay) await new Promise(resolve => setTimeout(resolve, 1400));
    await route.fulfill({json: paginated([axial])}).catch(() => {});
  });
  await page.goto('/products');
  const row = page.getByRole('row', {name:'Open Axial Pro 150',exact:true});
  await expect(row).toBeVisible();
  delay = true;
  await page.locator('.pc-access summary').click();
  const request = page.waitForRequest(request => request.url().includes('/search/'));
  await page.getByRole('button', {name:'Refresh database catalog',exact:true}).click();
  await request;
  await expect(row).toBeVisible();
  await page.waitForTimeout(1600);
  await expect(row).toBeVisible();
});

test('access changes clear previously visible private search results immediately', async ({ page }) => {
  let privateAccess = true;
  await page.route('**/api/v1/catalog/',route=>route.fulfill({json:privateAccess?snapshot:{...snapshot,products:[],formulations:[],staffPreview:false,
    session:{authenticated:false,staff:false,canPreview:false,username:''}}}));
  await page.route('**/api/v1/search/**', async route => {
    const rows=privateAccess?[axial]:[];
    if (!privateAccess) await new Promise(resolve=>setTimeout(resolve,1000));
    await route.fulfill({json:paginated(rows)}).catch(()=>{});
  });
  await page.goto('/products');
  const row=page.getByRole('row',{name:'Open Axial Pro 150',exact:true});
  await expect(row).toBeVisible();
  privateAccess=false;
  await page.locator('.pc-access summary').click();
  await page.getByRole('button',{name:'Refresh database catalog',exact:true}).click();
  await expect(row).toHaveCount(0);
});

test('stalled database search produces a retryable timeout instead of endless loading', async ({ page }) => {
  await catalog(page);
  await page.addInitScript(()=>{
    const original=AbortSignal.timeout.bind(AbortSignal);
    AbortSignal.timeout=milliseconds=>original(milliseconds===30000?80:milliseconds);
  });
  await page.route('**/api/v1/search/**',async route=>{
    await new Promise(resolve=>setTimeout(resolve,450));
    await route.fulfill({json:paginated([axial])}).catch(()=>{});
  });
  await page.goto('/products');
  await expect(page.getByRole('alert')).toContainText('Database search timed out');
  await page.unroute('**/api/v1/search/**');
  await page.route('**/api/v1/search/**',route=>route.fulfill({json:paginated([axial])}));
  await page.getByRole('button',{name:'Retry search',exact:true}).click();
  await expect(page.getByRole('row',{name:'Open Axial Pro 150',exact:true})).toBeVisible();
});
