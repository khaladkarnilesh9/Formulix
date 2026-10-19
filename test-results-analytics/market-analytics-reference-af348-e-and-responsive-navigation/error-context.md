# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: market-analytics.spec.ts >> reference geometry, actual charts, applied filters, map, theme and responsive navigation
- Location: tests\market-analytics.spec.ts:40:1

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: page.goto: Test timeout of 180000ms exceeded.
Call log:
  - navigating to "http://localhost:3001/market-analytics", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { form, product, snapshot } from './fixtures/catalog';
  3   | import { allAnalyticsFilters, marketAnalytics, productFlow, targetMatrix } from '../src/features/analytics/analyticsModel';
  4   | import type { DatabaseCatalog } from '../src/services/formulationApi';
  5   | 
  6   | const categories = ['Insecticides', 'Fungicides', 'Herbicides', 'PGR', 'Biopesticides', 'Others'];
  7   | const active = ['Azoxystrobin', 'Thiamethoxam', 'Chlorantraniliprole', 'Fluxapyroxad', 'Tebuconazole', 'Imidacloprid', 'Mancozeb', 'Glyphosate'];
  8   | const markets = ['India', 'United States', 'Brazil', 'China', 'Germany', 'United Kingdom', 'Kenya', 'France'];
  9   | const types = ['SC', 'WG', 'EC', 'SL', 'OD', 'WP', 'GR', 'Others'];
  10  | const crops = ['Rice', 'Wheat', 'Maize', 'Soybean', 'Cotton', 'Vegetables', 'Fruits'];
  11  | const products = Array.from({ length: 125 }, (_, index) => ({ ...product, id: `qa-analytics-${index}`,
  12  |   brandName: `QA Brand ${index % 24 + 1}`, formulationId: `qa-form-${index % 92}`, country: markets[index % markets.length],
  13  |   activeIngredient: active[index % active.length], formulationType: types[index % types.length],
  14  |   indicationsOrPests: ['Armyworm', 'Aphids', 'Blight'][index % 3] ? [['Armyworm', 'Aphids', 'Blight'][index % 3]] : [],
  15  |   marketData: { ...product.marketData, 'Product Classification': categories[index % categories.length], Crop: crops[index % crops.length] },
  16  | }));
  17  | const catalog = { ...snapshot, products,
  18  |   formulations: Array.from({ length: 92 }, (_, index) => ({ ...form, id: `qa-form-${index}` })),
  19  |   regulatoryRecords: products.map((row, index) => ({ ...snapshot.regulatoryRecords[0], id: `qa-reg-${index}`, productId: row.id,
  20  |     country: row.country, approvalDate: `${2015 + index % 12}-01-01`, expiryDate: `${2020 + index % 12}-01-01` })),
  21  | } as unknown as DatabaseCatalog;
  22  | 
  23  | test('analytics aggregations use exact catalog records and conserve flow totals', () => {
  24  |   const data = marketAnalytics(catalog, allAnalyticsFilters);
  25  |   expect(data.products).toHaveLength(125);
  26  |   expect(data.formulations).toHaveLength(92);
  27  |   expect(data.active).toHaveLength(8);
  28  |   expect(data.brands).toBe(24);
  29  |   expect(data.registrations).toHaveLength(125);
  30  |   expect(data.categories.reduce((sum, row) => sum + row.count, 0)).toBe(125);
  31  |   const flow = productFlow(products as DatabaseCatalog['products']);
  32  |   for (const stage of [0, 1, 2]) expect(flow.links.filter(link => flow.nodes[link.source].stage === stage).reduce((sum, link) => sum + link.value, 0)).toBe(125);
  33  |   expect(targetMatrix(products as DatabaseCatalog['products'], 'Crop').targets).toHaveLength(7);
  34  |   const year = marketAnalytics(catalog, { ...allAnalyticsFilters, year: '2015' });
  35  |   expect(year.products).toHaveLength(11);
  36  |   const missingDates = marketAnalytics({ ...catalog, regulatoryRecords: catalog.regulatoryRecords.map(row => ({ ...row, approvalDate: '', expiryDate: '' })) }, allAnalyticsFilters);
  37  |   expect(missingDates.trends).toEqual([]);
  38  | });
  39  | 
  40  | test('reference geometry, actual charts, applied filters, map, theme and responsive navigation', async ({ page }) => {
  41  |   test.setTimeout(180000);
  42  |   const errors: string[] = [];
  43  |   page.on('pageerror', error => errors.push(error.message));
  44  |   await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  45  |   await page.route('**/api/v1/catalog/', route => route.fulfill({ json: catalog }));
  46  |   await page.setViewportSize({ width: 1536, height: 1024 });
> 47  |   await page.goto('/market-analytics');
      |              ^ Error: page.goto: Test timeout of 180000ms exceeded.
  48  |   await expect(page.locator('.ma-metric').first()).toContainText('125');
  49  |   await expect.poll(() => page.locator('.ma-map svg path').count()).toBeGreaterThan(150);
  50  |   await expect.poll(() => page.locator('.ma-treemap svg rect').count()).toBeGreaterThan(10);
  51  |   await expect.poll(() => page.locator('.ma-flow svg path').count()).toBeGreaterThan(10);
  52  |   await expect(page.locator('.ma-panel')).toHaveCount(8);
  53  |   await expect(page.locator('.ma-metric')).toHaveCount(6);
  54  |   const sidebar = await page.locator('.shell-sidebar').first().boundingBox();
  55  |   expect(sidebar!.width).toBe(240);
  56  |   expect((await page.locator('.ma-hero').boundingBox())!.height).toBe(136);
  57  |   expect((await page.locator('.ma-metrics').boundingBox())!.height).toBe(80);
  58  |   expect((await page.locator('.ma-chart-grid').boundingBox())!.y).toBe(302);
  59  |   await page.getByRole('combobox', { name: 'Heatmap target', exact: true }).selectOption('Crop');
  60  |   await expect(page.locator('.ma-heat-cell')).toHaveCount(56);
  61  |   await page.screenshot({ path: test.info().outputPath('market-analytics-1536x1024-light.png') });
  62  |   await page.getByRole('combobox', { name: 'Analytics Region', exact: true }).selectOption('India');
  63  |   await expect(page.locator('.ma-metric').first()).toContainText('125');
  64  |   await page.getByRole('button', { name: 'Apply', exact: true }).click();
  65  |   await expect(page.locator('.ma-metric').first()).toContainText('16');
  66  |   await page.getByRole('button', { name: 'Reset', exact: true }).click();
  67  |   await expect(page.locator('.ma-metric').first()).toContainText('125');
  68  |   await page.getByRole('button', { name: 'Zoom in map', exact: true }).click();
  69  |   await expect(page.locator('.ma-map svg g')).toHaveAttribute('transform', /1.25/);
  70  |   await page.getByRole('button', { name: 'Reset map view', exact: true }).click();
  71  |   await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click();
  72  |   await expect(page.locator('html')).toHaveClass(/dark/);
  73  |   await page.screenshot({ path: test.info().outputPath('market-analytics-1536x1024-dark.png') });
  74  |   await page.getByRole('button', { name: 'Switch to light theme', exact: true }).click();
  75  |   await page.getByTitle('Collapse Sidebar', { exact: true }).click();
  76  |   await expect.poll(() => page.locator('.shell-sidebar').first().evaluate(element => element.getBoundingClientRect().width)).toBe(72);
  77  |   await page.getByTitle('Expand Sidebar', { exact: true }).click();
  78  |   for (const width of [360, 390, 768]) {
  79  |     await page.setViewportSize({ width, height: 1024 });
  80  |     await page.locator('.ma-hero').scrollIntoViewIfNeeded();
  81  |     expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  82  |     await page.screenshot({ path: test.info().outputPath(`market-analytics-${width}.png`) });
  83  |   }
  84  |   await page.setViewportSize({ width: 390, height: 844 });
  85  |   await page.getByRole('button', { name: 'More navigation', exact: true }).click();
  86  |   await expect(page.getByRole('dialog', { name: 'Formulix navigation' })).toBeVisible();
  87  |   await page.getByRole('dialog', { name: 'Formulix navigation' }).getByRole('button', { name: 'Market & Analytics', exact: true }).click();
  88  |   await expect(page.getByRole('dialog', { name: 'Formulix navigation' })).not.toBeVisible();
  89  |   await page.getByRole('button', { name: 'View All', exact: true }).click();
  90  |   await expect(page).toHaveURL(/ingredients/);
  91  |   expect(errors).toEqual([]);
  92  | });
  93  | 
  94  | test('empty catalog keeps analytics layout without fictitious metrics or trends', async ({ page }) => {
  95  |   await page.route('**/api/v1/catalog/', route => route.fulfill({ json: { ...catalog, products: [], formulations: [], regulatoryRecords: [] } }));
  96  |   await page.goto('/market-analytics');
  97  |   await expect(page.locator('.ma-metric').first()).toContainText('0');
  98  |   await expect(page.getByText('No dated registration records', { exact: true })).toBeVisible();
  99  |   await expect(page.getByRole('combobox', { name: 'Analytics Year Range' })).toBeDisabled();
  100 |   await expect(page.locator('.ma-panel')).toHaveCount(8);
  101 | });
  102 | 
```