import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

test.use({ trace: 'off' });
test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
});

const publicRoutes = ['/', '/products', '/products/detail?product=prod-1', '/formulations', '/ingredients', '/compare',
  '/manufacturers', '/brands', '/market-analytics', '/regulatory', '/patents', '/documents', '/workspace', '/workspace/research', '/settings'];
const adminRoutes = ['', 'products', 'products-new', 'formulations', 'ingredients', 'manufacturers', 'brands',
  'registrations', 'patents', 'documents', 'imports', 'review', 'data-quality', 'audit-logs', 'master-data',
  'settings', 'indian-agro', 'field-audit', 'e2e-tests'].map(route => `/admin${route ? `/${route}` : ''}`);

test('intelligence phases smoke', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/', '/products', '/formulations', '/ingredients', '/compare', '/manufacturers', '/brands', '/regulatory']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth), route).toBeLessThanOrEqual(width);
    }
  }
  expect(errors).toEqual([]);
});

for (const [width, height] of [[320, 568], [360, 800], [390, 844], [768, 1024], [1366, 768], [1440, 900], [1920, 1080]]) {
  for (const theme of ['light', 'dark']) {
    test(`enterprise pages ${theme} ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.addInitScript(theme => {
        const saved = JSON.parse(localStorage.getItem('formulix_workspace_state_v2') ?? 'null');
        if (saved) { saved.theme = theme; localStorage.setItem('formulix_workspace_state_v2', JSON.stringify(saved)); }
      }, theme);
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      if (theme === 'dark') {
        if (width < 768) await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click();
        else await page.getByRole('button', { name: 'Switch to Dark Theme', exact: true }).click();
      }
      for (const route of [...publicRoutes, ...adminRoutes]) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('main'), `${route}: ${errors.join('; ')}`).toBeVisible({ timeout: 15000 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth), route).toBeLessThanOrEqual(width);
        await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^$/);
        const nav = page.getByRole('navigation', { name: 'Primary mobile navigation' });
        if (width < 768 && !route.startsWith('/admin')) {
          await expect(nav).toBeVisible(); await expect(nav.locator('a, button')).toHaveCount(5);
        } else await expect(nav).not.toBeVisible();
      }
      expect(errors).toEqual([]);
    });
  }
}

test('enterprise screenshots', async ({ page }) => {
  test.setTimeout(240000);
  const directory = path.resolve('visual-audit/enterprise');
  await mkdir(directory, { recursive: true });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark']) {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      if (theme === 'dark') {
        if (width < 768) await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click();
        else await page.getByRole('button', { name: 'Switch to Dark Theme', exact: true }).click();
      } else if (await page.locator('html').evaluate(element => element.classList.contains('dark'))) {
        if (width < 768) await page.getByRole('button', { name: 'Switch to light theme', exact: true }).click();
        else await page.getByRole('button', { name: 'Switch to Light Theme', exact: true }).click();
      }
      for (const route of [...publicRoutes, '/admin', '/admin/products-new']) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('main')).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        if (route === '/ingredients') await expect.poll(() => page.locator('.fx-molecule-canvas svg[role="img"] line, .fx-molecule-canvas svg[role="img"] path').count()).toBeGreaterThan(10);
        const slug = route === '/' ? 'dashboard' : route.split('?')[0].slice(1).replaceAll('/', '-');
        await page.screenshot({ path: path.join(directory, `${slug}-${width}-${theme}.png`), fullPage: true });
      }
    }
  }
});
