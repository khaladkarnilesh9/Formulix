import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
});

const sizes = [[320, 568], [360, 800], [375, 812], [390, 844], [412, 915],
  [768, 1024], [1024, 768], [1440, 900]];
const publicRoutes = ['/', '/products', '/products/detail?product=prod-1', '/formulations',
  '/ingredients', '/compare', '/manufacturers', '/brands', '/regulatory', '/patents',
  '/documents', '/workspace', '/workspace/research', '/settings'];
const adminRoutes = ['', 'indian-agro', 'products', 'products-new', 'formulations',
  'ingredients', 'manufacturers', 'brands', 'registrations', 'patents', 'documents',
  'imports', 'review', 'data-quality', 'master-data', 'audit-logs', 'field-audit',
  'e2e-tests', 'settings'].map(path => `/admin${path ? `/${path}` : ''}`);

for (const [width, height] of sizes) {
  test(`all routes fit ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const failures: string[] = [];
    for (const route of [...publicRoutes, ...adminRoutes]) {
      await page.goto(route);
      await expect(page.locator('main'), `${route}: ${errors.join('; ')}`).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (overflow > 1) failures.push(`${route}: ${overflow}px overflow`);
      const nav = page.getByRole('navigation', { name: 'Primary mobile navigation' });
      if (width < 768 && !route.startsWith('/admin')) {
        await expect(nav).toBeVisible();
        await expect(nav.locator('a, button')).toHaveCount(5);
        const padding = await page.locator('main').evaluate(element => parseFloat(getComputedStyle(element).paddingBottom));
        expect(padding).toBeGreaterThanOrEqual(88);
      } else await expect(nav).not.toBeVisible();
    }
    expect(errors).toEqual([]);
    expect(failures).toEqual([]);
  });
}

test('mobile navigation, focus, history, filters, saved items and themes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Formulix navigation' });
  await expect(drawer).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close navigation' })).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  await page.keyboard.press('Shift+Tab');
  expect(await drawer.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Open navigation', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.mouse.click(380, 300);
  await expect(drawer).not.toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Primary mobile navigation' });
  for (const label of ['Products', 'Formulations', 'Ingredients', 'Home']) {
    await nav.getByRole('link', { name: label, exact: true }).click();
    await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
  }
  await nav.getByRole('link', { name: 'Products', exact: true }).click();
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  const filters = page.getByRole('dialog', { name: 'Product filters' });
  await expect(filters).toBeVisible();
  await filters.getByRole('combobox', { name: 'Industry Sector' }).selectOption('Agrochemical');
  await page.getByRole('button', { name: 'Close navigation' }).click();
  await page.getByRole('textbox', { name: 'Search products', exact: true }).fill('Confidor');
  await expect(page.locator('.mobile-product-results tbody tr')).toHaveCount(1);
  expect(await page.locator('.mobile-product-results').evaluate(element => element.getBoundingClientRect().width)).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Spec Sheet', exact: true }).click();
  await expect(page).toHaveURL(/products\/detail\?product=/);
  await expect(nav.getByRole('link', { name: 'Products', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.goBack();
  await expect(page.getByRole('textbox', { name: 'Search products', exact: true })).toHaveValue('Confidor');
  await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Switch to light theme', exact: true }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
});

test('mobile admin drawer and complete product draft', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Open admin navigation' }).click();
  const drawer = page.getByRole('dialog', { name: 'Admin navigation' });
  await expect(drawer).toBeVisible();
  await drawer.getByRole('button', { name: 'Add Product', exact: true }).click();
  await expect(drawer).not.toBeVisible();
  await expect(page).toHaveURL('/admin/products-new');
  await page.locator('.product-wizard input').first().fill('Mobile verification draft');
  for (let step = 1; step <= 6; step++) {
    await page.locator('.wizard-progress button').nth(step - 1).click();
    const fields = page.locator('.product-wizard input:visible, .product-wizard select:visible, .product-wizard textarea:visible');
    for (let index = 0; index < await fields.count(); index++) {
      const field = fields.nth(index);
      await field.scrollIntoViewIfNeeded();
      const box = await field.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(321);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  }
  await page.getByRole('button', { name: 'Save Draft', exact: true }).click();
  await expect(page).toHaveURL('/admin/products');
  await expect(page.getByText('Mobile verification draft', { exact: true })).toBeVisible();
});

test('responsive screenshots', async ({ page }) => {
  for (const [width, height] of [[390, 844], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    for (const [name, route] of [['dashboard', '/'], ['products', '/products'], ['formulation', '/formulations'], ['admin-form', '/admin/products-new']]) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      if (name === 'dashboard') {
        await expect.poll(async () => page.locator('.recharts-pie').first().evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(140);
      }
      await page.screenshot({ path: `test-results/${name}-${width}.png`, fullPage: true });
    }
  }
});

test('all mobile admin dialogs expose fields and ingredient rows', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  for (const [route, action] of [
    ['/admin/formulations', 'New Formulation Recipe'], ['/admin/ingredients', 'Catalog New Substance'],
    ['/admin/manufacturers', 'Add Corporate Entity'], ['/admin/brands', 'New Brand Record'],
    ['/admin/documents', 'Upload / Register Document'], ['/admin/registrations', 'New Regulatory Docket'],
  ]) {
    await page.goto(route);
    await page.getByRole('button', { name: action, exact: true }).click();
    const form = page.locator('form');
    await expect(form).toBeVisible();
    if (route === '/admin/formulations') {
      await page.getByRole('button', { name: 'Add Excipient / Active' }).click();
      await page.getByRole('textbox', { name: 'Ingredient 2 name' }).fill('Mobile test ingredient');
      await page.getByRole('textbox', { name: 'Ingredient 2 concentration' }).fill('1% w/w');
    }
    const fields = form.locator('input:visible, select:visible, textarea:visible, button:visible');
    for (let index = 0; index < await fields.count(); index++) {
      await fields.nth(index).scrollIntoViewIfNeeded();
      const box = await fields.nth(index).boundingBox();
      expect(box!.x, `${route} field ${index}`).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width, `${route} field ${index}`).toBeLessThanOrEqual(321);
      expect(box!.y, `${route} field ${index} scrolls into view`).toBeGreaterThanOrEqual(0);
      expect(box!.y, `${route} field ${index} scrolls into view`).toBeLessThan(568);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  }
});

test('mobile import file and global search', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/admin/imports');
  await page.getByLabel('Import File').setInputFiles({ name: 'mobile-import.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([{ brandName: 'Mobile import preview', activeIngredient: 'Imidacloprid' }])) });
  await expect(page.getByRole('textbox', { name: 'Import data' })).toHaveValue(/Mobile import preview/);
  await page.getByRole('button', { name: 'Parse & Validate' }).click();
  await expect(page.getByText('Mobile import preview', { exact: true })).toBeVisible();
  await page.goto('/');
  await page.getByRole('button', { name: 'Search Formulix', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Search Formulix' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Global search' }).fill('Confidor');
  await expect(page.getByRole('dialog', { name: 'Search Formulix' }).getByText('Confidor 200 SL', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close search' }).click();
  await expect(page.getByRole('dialog', { name: 'Search Formulix' })).not.toBeVisible();
});

test('explorer selection survives navigation and reload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/formulations');
  await page.locator('main h3').filter({ hasText: 'Chlorantraniliprole' }).first().click();
  await expect(page).toHaveURL(/formulation=form-2/);
  const nav = page.getByRole('navigation', { name: 'Primary mobile navigation' });
  await nav.getByRole('link', { name: 'Home', exact: true }).click();
  await nav.getByRole('link', { name: 'Formulations', exact: true }).click();
  await expect(page.locator('main h2').last()).toContainText('Chlorantraniliprole');
  await page.reload();
  await expect(page.locator('main h2').last()).toContainText('Chlorantraniliprole');
});
