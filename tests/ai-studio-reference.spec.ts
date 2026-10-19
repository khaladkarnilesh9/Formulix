import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

test('capture dashboard at the supplied AI Studio reference proportions', async ({ browser }) => {
  const directory = path.resolve('visual-audit/reference');
  await mkdir(directory, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 692 }, deviceScaleFactor: 1.2 });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3002/');
  await expect(page.locator('main')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'html { scrollbar-gutter: stable; }' });
  await page.getByRole('heading', { name: 'Country-wise Commercial Coverage' }).evaluate(element => {
    const card = element.closest('section')!;
    const header = document.querySelector('.public-desktop-header')!;
    window.scrollTo(0, window.scrollY + card.getBoundingClientRect().top - header.getBoundingClientRect().height + 8);
  });
  const metrics = await page.evaluate(() => {
    const measure = (selector: string) => {
      const element = document.querySelector(selector)!;
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height,
        gap: style.gap, fontSize: style.fontSize, whiteSpace: style.whiteSpace };
    };
    return { viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, root: getComputedStyle(document.documentElement).fontSize },
      sidebar: measure('.shell-sidebar'), header: measure('.public-desktop-header'),
      search: measure('.header-search'), admin: measure('.header-admin'),
      actions: measure('.header-actions'), overflow: measure('.fx-overflow'),
      content: measure('main > div') };
  });
  await writeFile(path.join(directory, 'measurements.json'), JSON.stringify(metrics, null, 2));
  await page.screenshot({ path: path.join(directory, 'dashboard-reference.png') });
  expect(metrics.sidebar.width).toBe(256);
  expect(metrics.header.height).toBe(64);
  expect(metrics.search.width).toBe(256);
  expect(metrics.actions.gap).toBe('12px');
  expect(metrics.admin.whiteSpace).toBe('nowrap');
  await expect(page.locator('.fx-overflow summary')).toBeVisible();
  await context.close();
});

test('capture full-width Product Search with larger sidebar labels', async ({ browser }) => {
  const directory = path.resolve('visual-audit/reference');
  await mkdir(directory, { recursive: true });
  for (const width of [1600, 1920]) {
    const context = await browser.newContext({ viewport: { width, height: 692 }, deviceScaleFactor: width === 1600 ? 1.2 : 1 });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:3002/products');
    await expect(page.locator('main')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: 'html { scrollbar-gutter: stable; }' });
    const bounds = await page.locator('main').evaluate(element => {
      const main = element.getBoundingClientRect();
      const content = element.firstElementChild!.getBoundingClientRect();
      const padding = getComputedStyle(element);
      return { available: main.width - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight), width: content.width };
    });
    expect(bounds.width).toBeCloseTo(bounds.available, 0);
    expect(await page.locator('.shell-sidebar button[aria-current="page"]').evaluate(element => getComputedStyle(element).fontSize)).toBe('14px');
    await page.screenshot({ path: path.join(directory, `products-${width}.png`) });
    await context.close();
  }
});
