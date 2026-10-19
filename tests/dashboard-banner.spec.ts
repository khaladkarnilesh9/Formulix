import { test, expect } from '@playwright/test';
import { snapshot } from './fixtures/catalog';

test('executive dashboard uses dedicated reference artwork and retains header actions', async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  await page.route('**/api/v1/catalog/', route => route.fulfill({ json: snapshot }));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const hero = page.locator('.fx-executive-dashboard > .fx-scientific-hero');
    await expect(hero).toBeVisible({ timeout: 30000 });
    await expect(hero.locator('img')).toHaveAttribute('src', '/assets/scientific/dashboard-reference.webp');
    await expect.poll(() => hero.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(hero.getByRole('heading', { name: 'Formulation & Commercial Product Intelligence', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await hero.screenshot({ path: test.info().outputPath(`executive-bloom-${width}.png`) });
  }
  await page.getByRole('button', { name: 'Global search', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Search Formulix', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Explore products', exact: true }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.locator('.pc-hero img')).toHaveAttribute('src', '/assets/scientific/product-agriculture.webp');
});
