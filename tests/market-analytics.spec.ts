import { test, expect } from '@playwright/test';
import { form, product, snapshot } from './fixtures/catalog';
import { allAnalyticsFilters, marketAnalytics, productFlow, targetMatrix } from '../src/features/analytics/analyticsModel';
import type { DatabaseCatalog } from '../src/services/formulationApi';

const categories = ['Insecticides', 'Fungicides', 'Herbicides', 'PGR', 'Biopesticides', 'Others'];
const active = ['Azoxystrobin', 'Thiamethoxam', 'Chlorantraniliprole', 'Fluxapyroxad', 'Tebuconazole', 'Imidacloprid', 'Mancozeb', 'Glyphosate'];
const markets = ['India', 'United States', 'Brazil', 'China', 'Germany', 'United Kingdom', 'Kenya', 'France'];
const types = ['SC', 'WG', 'EC', 'SL', 'OD', 'WP', 'GR', 'Others'];
const crops = ['Rice', 'Wheat', 'Maize', 'Soybean', 'Cotton', 'Vegetables', 'Fruits'];
const products = Array.from({ length: 125 }, (_, index) => ({ ...product, id: `qa-analytics-${index}`,
  brandName: `QA Brand ${index % 24 + 1}`, formulationId: `qa-form-${index % 92}`, country: markets[index % markets.length],
  activeIngredient: active[index % active.length], formulationType: types[index % types.length],
  indicationsOrPests: ['Armyworm', 'Aphids', 'Blight'][index % 3] ? [['Armyworm', 'Aphids', 'Blight'][index % 3]] : [],
  marketData: { ...product.marketData, 'Product Classification': categories[index % categories.length], Crop: crops[index % crops.length] },
}));
const catalog = { ...snapshot, products,
  formulations: Array.from({ length: 92 }, (_, index) => ({ ...form, id: `qa-form-${index}` })),
  regulatoryRecords: products.map((row, index) => ({ ...snapshot.regulatoryRecords[0], id: `qa-reg-${index}`, productId: row.id,
    country: row.country, approvalDate: `${2015 + index % 12}-01-01`, expiryDate: `${2020 + index % 12}-01-01` })),
} as unknown as DatabaseCatalog;

test('analytics aggregations use exact catalog records and conserve flow totals', () => {
  const data = marketAnalytics(catalog, allAnalyticsFilters);
  expect(data.products).toHaveLength(125);
  expect(data.formulations).toHaveLength(92);
  expect(data.active).toHaveLength(8);
  expect(data.brands).toBe(24);
  expect(data.registrations).toHaveLength(125);
  expect(data.categories.reduce((sum, row) => sum + row.count, 0)).toBe(125);
  const flow = productFlow(products as DatabaseCatalog['products']);
  for (const stage of [0, 1, 2]) expect(flow.links.filter(link => flow.nodes[link.source].stage === stage).reduce((sum, link) => sum + link.value, 0)).toBe(125);
  expect(targetMatrix(products as DatabaseCatalog['products'], 'Crop').targets).toHaveLength(7);
  const year = marketAnalytics(catalog, { ...allAnalyticsFilters, year: '2015' });
  expect(year.products).toHaveLength(11);
  const missingDates = marketAnalytics({ ...catalog, regulatoryRecords: catalog.regulatoryRecords.map(row => ({ ...row, approvalDate: '', expiryDate: '' })) }, allAnalyticsFilters);
  expect(missingDates.trends).toEqual([]);
  const sharedBrandFlow = productFlow([
    { ...catalog.products[0], manufacturerId: 'company-a', manufacturerName: 'Company A', brandName: 'Shared Name' },
    { ...catalog.products[1], manufacturerId: 'company-b', manufacturerName: 'Company B', brandName: 'Shared Name' },
  ]);
  expect(sharedBrandFlow.nodes.filter(node => node.stage === 1)).toHaveLength(2);
});

test('reference geometry, actual charts, applied filters, map, theme and responsive navigation', async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  await page.route('**/api/v1/catalog/', route => route.fulfill({ json: catalog }));
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.goto('/market-analytics', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.ma-metric').first()).toContainText('125', { timeout: 30000 });
  await expect.poll(() => page.locator('.ma-map svg path').count()).toBeGreaterThan(150);
  await expect.poll(() => page.locator('.ma-treemap svg rect').count()).toBeGreaterThan(10);
  await expect.poll(() => page.locator('.ma-flow svg path').count()).toBeGreaterThan(10);
  await expect(page.locator('.ma-panel')).toHaveCount(8);
  await expect(page.locator('.ma-metric')).toHaveCount(6);
  const sidebar = await page.locator('.shell-sidebar').first().boundingBox();
  expect(sidebar!.width).toBe(240);
  expect((await page.locator('.ma-hero').boundingBox())!.height).toBe(136);
  expect((await page.locator('.ma-metrics').boundingBox())!.height).toBe(80);
  expect((await page.locator('.ma-chart-grid').boundingBox())!.y).toBe(303);
  await page.getByRole('combobox', { name: 'Heatmap target', exact: true }).selectOption('Crop');
  await expect(page.locator('.ma-heat-cell')).toHaveCount(56);
  await page.screenshot({ path: test.info().outputPath('market-analytics-1536x1024-light.png') });
  await page.getByRole('combobox', { name: 'Analytics Region', exact: true }).selectOption('India');
  await expect(page.locator('.ma-metric').first()).toContainText('125');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.locator('.ma-metric').first()).toContainText('16');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.locator('.ma-metric').first()).toContainText('125');
  await page.getByRole('button', { name: 'Zoom in map', exact: true }).click();
  await expect(page.locator('.ma-map svg g')).toHaveAttribute('transform', /1.25/);
  await page.getByRole('button', { name: 'Reset map view', exact: true }).click();
  await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.screenshot({ path: test.info().outputPath('market-analytics-1536x1024-dark.png') });
  await page.getByRole('button', { name: 'Switch to light theme', exact: true }).click();
  await page.getByTitle('Collapse Sidebar', { exact: true }).click();
  await expect.poll(() => page.locator('.shell-sidebar').first().evaluate(element => element.getBoundingClientRect().width)).toBe(72);
  await page.getByTitle('Expand Sidebar', { exact: true }).click();
  for (const width of [360, 390, 768]) {
    await page.setViewportSize({ width, height: 1024 });
    await page.locator('.ma-hero').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: test.info().outputPath(`market-analytics-${width}.png`) });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'More navigation', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Formulix navigation' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Formulix navigation' }).getByRole('button', { name: 'Market & Analytics', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Formulix navigation' })).not.toBeVisible();
  await page.getByRole('button', { name: 'View All', exact: true }).click();
  await expect(page).toHaveURL(/ingredients/);
  expect(errors).toEqual([]);
});

test('empty catalog keeps analytics layout without fictitious metrics or trends', async ({ page }) => {
  await page.route('**/api/v1/catalog/', route => route.fulfill({ json: { ...catalog, products: [], formulations: [], regulatoryRecords: [], staffPreview: false,
    session: { authenticated: false, staff: false, canPreview: false, username: '' } } }));
  await page.goto('/market-analytics');
  await expect(page.locator('.ma-metric').first()).toContainText('0');
  await expect(page.getByText('No dated registration records', { exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Analytics Year Range' })).toBeDisabled();
  await expect(page.locator('.ma-panel')).toHaveCount(8);
  await page.locator('.ma-catalog-menu summary').click();
  await page.getByRole('button', { name: 'Staff Sign In', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Staff Sign In', exact: true })).toBeVisible();
});

test('analytics sizing remains scoped and existing routes keep their shared layout', async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  await page.route('**/api/v1/catalog/', route => route.fulfill({ json: catalog }));
  await page.setViewportSize({ width: 1536, height: 1024 });
  for (const route of ['/products', '/brands', '/regulatory', '/market-analytics', '/']) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main')).toBeVisible();
    const market = route === '/market-analytics';
    await expect.poll(() => page.locator('.shell-sidebar').first().evaluate(element => element.getBoundingClientRect().width)).toBe(market ? 240 : 260);
    if (market) await expect(page.locator('.ma-hero')).toBeVisible();
    else await expect(page.locator('.public-desktop-header')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1536);
  }
});
