import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { form, product, snapshot } from './fixtures/catalog';

const products = Array.from({ length: 8 }, (_, index) => ({ ...product, id: `qa-premium-product-${index}`,
  brandName: `QA Study Brand ${index + 1}`, formulationId: `qa-premium-form-${index}`,
  activeIngredient: index % 2 ? 'Azoxystrobin 18.2% + Difenoconazole 11.4% w/w' : 'Chlorantraniliprole 18.5% w/w',
  strength: index % 2 ? '18.2% + 11.4% w/w' : '18.5% w/w', manufacturerName: 'QA Research Company',
  country: index % 2 ? 'United States' : 'India' }));
const catalog = { ...snapshot, products,
  formulations: products.map((row, index) => ({ ...form, id: row.formulationId, name: row.brandName })),
  publicationCounts: { Draft: 8, Published: 0 },
  activeIngredientReferences: [{ id: 'qa-active', sourceText: 'Chlorantraniliprole 18.5% w/w', productIds: [products[0].id], categories: ['Agrochemical'], markets: ['India'], verificationStatus: 'Source-reported / unverified', recordKind: 'Source text' }],
};
test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  await page.route('**/api/v1/catalog/', route => route.fulfill({ json: catalog }));
});

test('premium assets, product interactions, mobile More navigation and themes', async ({ page }) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const [width, theme] of [[1440, 'light'], [1440, 'dark'], [768, 'light'], [390, 'light']] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/products');
    await expect(page.locator('main tbody tr')).toHaveCount(8);
    if ((await page.locator('html').evaluate(element => element.classList.contains('dark'))) !== (theme === 'dark')) {
      await page.getByRole('button', { name: width < 768 ? `Switch to ${theme} theme` : `Switch to ${theme === 'dark' ? 'Dark' : 'Light'} Theme`, exact: true }).click();
    }
    const hero = page.locator('.fx-scientific-hero');
    await expect(hero).toBeVisible();
    await expect.poll(() => hero.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    expect(await hero.evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(300);
    await expect(page.locator('.fx-premium-metric')).toHaveCount(6);
    await expect(page.getByText('Unverified', { exact: true }).first()).toBeVisible();
    await expect(page.locator('.fx-status-badge[data-status="Approved"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (width === 768) {
      const filters = await page.locator('.fx-product-filter-panel:visible').boundingBox();
      const table = await page.locator('main table').boundingBox();
      expect(table!.x).toBeGreaterThan(filters!.x + filters!.width);
    }
    await page.screenshot({ path: test.info().outputPath(`premium-products-${width}-${theme}.png`) });
  }
  const nav = page.getByRole('navigation', { name: 'Primary mobile navigation' });
  await expect(nav.locator('a, button')).toHaveCount(5);
  await nav.getByRole('button', { name: 'More navigation' }).click();
  const drawer = page.getByRole('dialog', { name: 'Formulix navigation' });
  await expect(drawer).toBeVisible();
  await drawer.getByRole('button', { name: 'Product Comparison', exact: true }).click();
  await expect(drawer).not.toBeVisible();
  await expect(page).toHaveURL(/compare/);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/products');
  await page.getByRole('textbox', { name: 'Search products', exact: true }).fill('Azoxystrobin');
  await expect(page.locator('main tbody tr')).toHaveCount(4);
  const first = page.locator('main tbody tr').first();
  await first.getByTitle('Save to Workspace', { exact: true }).click();
  await expect(first.getByTitle('Remove from Saved', { exact: true })).toBeVisible();
  await first.getByRole('checkbox').check();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const download = await downloadEvent;
  expect(await readFile((await download.path())!, 'utf8')).toContain('QA Study Brand');
  await page.getByRole('button', { name: 'Spec Sheet', exact: true }).first().click();
  await expect(page).toHaveURL(/products\/detail\?product=/);

  for (const [route, scene] of [['/', 'agriculture'], ['/formulations', 'formulation'], ['/ingredients', 'molecular'], ['/manufacturers', 'industry'],
    ['/regulatory', 'regulatory'], ['/patents', 'patents'], ['/workspace/research', 'research']] as const) {
    await page.goto(route);
    await expect(page.locator('.fx-scientific-hero')).toHaveAttribute('data-scene', scene);
    await expect.poll(() => page.locator('.fx-scientific-hero img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`premium-${scene}-1440.png`) });
  }
  expect(errors).toEqual([]);
});
