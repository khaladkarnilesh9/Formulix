import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const stage = process.env.FORMULIX_VISUAL_STAGE ?? 'after';
const directory = path.resolve('visual-audit', stage);

async function measurements(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const read = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return null;
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height,
        fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight,
        lineHeight: style.lineHeight, letterSpacing: style.letterSpacing,
        padding: style.padding, margin: style.margin, gap: style.gap, borderRadius: style.borderRadius,
        boxSizing: style.boxSizing, maxWidth: style.maxWidth, minWidth: style.minWidth,
        flexShrink: style.flexShrink, whiteSpace: style.whiteSpace,
        zoom: style.zoom, transform: style.transform, scrollWidth: element.scrollWidth };
    };
    const root = getComputedStyle(document.documentElement);
    const mediaQueries = new Set<string>();
    const scan = (rules: CSSRuleList) => {
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSMediaRule) mediaQueries.add(rule.conditionText);
        if ('cssRules' in rule) scan((rule as CSSGroupingRule).cssRules);
      }
    };
    for (const sheet of Array.from(document.styleSheets)) {
      try { scan(sheet.cssRules); } catch { /* Cross-origin font stylesheets do not expose CSS rules. */ }
    }
    return { environment: {
      innerWidth, innerHeight, devicePixelRatio,
      visualViewport: { width: visualViewport?.width, height: visualViewport?.height, scale: visualViewport?.scale },
      screen: { width: screen.width, height: screen.height },
      rootFontSize: root.fontSize, spacing: root.getPropertyValue('--spacing'),
      breakpoints: Object.fromEntries(['sm', 'md', 'lg', 'xl', '2xl'].map(key => [key, root.getPropertyValue(`--breakpoint-${key}`)])),
      activeQueries: Object.fromEntries([640, 768, 1024, 1280, 1536].map(width => [width, matchMedia(`(min-width: ${width}px)`).matches])),
      compiledMediaQueries: Array.from(mediaQueries),
      documentWidth: document.documentElement.scrollWidth,
      fontsStatus: document.fonts.status,
      fonts: Array.from(document.fonts).map(font => ({ family: font.family, weight: font.weight, status: font.status })),
    }, elements: Object.fromEntries(Object.entries({
      html: 'html', body: 'body', root: '#root', sidebar: '[data-drawer-background] > aside',
      sidebarBrand: 'aside > div:first-child', navigationItem: 'aside button[aria-current="page"]',
      frame: '[data-drawer-background]:has(> header)', header: '.public-desktop-header',
      breadcrumb: '.public-desktop-header > div:first-child', breadcrumbTitle: '.public-desktop-header h1',
      actions: '.public-desktop-header > div:last-child', search: '.public-desktop-header > div:last-child > button:first-child',
      adminButton: '.public-desktop-header button[title*="Admin Data"]',
      adminLabel: '.public-desktop-header button[title*="Admin Data"] > span',
      theme: '.public-desktop-header > div:last-child > div:first-of-type',
      main: 'main', content: 'main > div', card: 'main .grid > div',
      scientificViewer: 'main .fx-molecule-viewer svg[role="img"]',
    }).map(([name, selector]) => [name, read(selector)])) };
  });
}

test('capture rendering environment and before-after screenshots', async ({ page, browser }) => {
  await mkdir(directory, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  const failures: string[] = [];
  page.on('requestfailed', request => failures.push(`${request.url()}: ${request.failure()?.errorText}`));
  const report: Record<string, unknown> = {};
  for (const [name, route] of [['dashboard', '/'], ['ingredients', '/ingredients']]) {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    if (name === 'dashboard') await expect.poll(() => page.locator('.recharts-pie').first().evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(140);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const domDocument = await cdp.send('DOM.getDocument');
    const renderedFonts: Record<string, unknown> = {};
    for (const selector of ['.public-desktop-header h1', 'aside button[aria-current="page"]', 'main .font-mono']) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: domDocument.root.nodeId, selector });
      if (nodeId) renderedFonts[selector] = (await cdp.send('CSS.getPlatformFontsForNode', { nodeId })).fonts;
    }
    await cdp.detach();
    report[name] = { ...await measurements(page), renderedFonts };
    await page.screenshot({ path: path.join(directory, `${name}-1440x900.png`) });
  }
  await page.goto('/');
  await expect(page.locator('main')).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
  await expect.poll(async () => (await page.locator('[data-drawer-background] > aside').boundingBox())!.width).toBe(320);
  report.root20px = await measurements(page);
  await page.evaluate(() => { document.documentElement.style.removeProperty('font-size'); });
  await expect.poll(async () => (await page.locator('[data-drawer-background] > aside').boundingBox())!.width).toBe(256);
  const scaledContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.25 });
  const scaledPage = await scaledContext.newPage();
  await scaledPage.goto('http://127.0.0.1:3002/');
  await expect(scaledPage.locator('main')).toBeVisible();
  await scaledPage.evaluate(() => document.fonts.ready);
  report.dpr125 = await measurements(scaledPage);
  await scaledContext.close();
  report.requestFailures = failures;
  await writeFile(path.join(directory, 'measurements.json'), JSON.stringify(report, null, 2));
});

test.use({ trace: 'off' });

const routes = ['/', '/products', '/formulations', '/ingredients', '/compare',
  '/manufacturers', '/brands', '/regulatory', '/patents', '/admin'];

for (const width of [360, 390, 768, 1366, 1440, 1920]) {
  test(`shared layout fits all main pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
    const failures: string[] = [];
    page.on('pageerror', error => failures.push(error.message));
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('main'), route).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth), route).toBeLessThanOrEqual(width);
      const pageBounds = await page.locator('main').evaluate(element => {
        const container = element.firstElementChild!;
        const main = element.getBoundingClientRect();
        const content = container.getBoundingClientRect();
        const style = getComputedStyle(element);
        return { available: main.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), width: content.width };
      });
      expect(pageBounds.width, `${route} fills the page width`).toBeCloseTo(pageBounds.available, 0);
      const nav = page.getByRole('navigation', { name: 'Primary mobile navigation' });
      if (width < 768 && route !== '/admin') {
        await expect(nav).toBeVisible();
        await expect(nav.getByRole('link')).toHaveCount(5);
      } else await expect(nav).not.toBeVisible();
      if (width >= 1024) {
        const sidebar = page.locator('[data-drawer-background] > aside');
        expect((await sidebar.boundingBox())!.width).toBe(256);
        expect(await sidebar.locator('button[aria-current="page"]').evaluate(element => getComputedStyle(element).fontSize)).toBe('14px');
        expect((await page.locator('main').boundingBox())!.x).toBe(256);
      }
      if (width >= 768 && route !== '/admin') {
        const header = page.locator('.public-desktop-header');
        const admin = header.locator('.header-admin');
        await expect(admin).toBeVisible();
        expect((await admin.boundingBox())!.height).toBe(width >= 1536 ? 28 : 32);
        if (width >= 1280) expect((await admin.locator('span').boundingBox())!.height).toBe(16);
        const controls = header.locator('button:visible');
        const headerBox = (await header.boundingBox())!;
        for (let index = 0; index < await controls.count(); index++) {
          const control = (await controls.nth(index).boundingBox())!;
          expect(control.x).toBeGreaterThanOrEqual(headerBox.x);
          expect(control.x + control.width).toBeLessThanOrEqual(width);
          if (index > 0) {
            const previous = (await controls.nth(index - 1).boundingBox())!;
            expect(control.x).toBeGreaterThanOrEqual(previous.x + previous.width);
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });
}

test('sidebar collapse and mobile drawer share consistent layout dimensions', async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const route of ['/', '/admin']) {
    await page.goto(route);
    const sidebar = page.locator('[data-drawer-background] > aside');
    await sidebar.getByRole('button', { name: 'Collapse Sidebar', exact: true }).click();
    await expect.poll(async () => (await sidebar.boundingBox())!.width).toBe(72);
    await expect.poll(async () => (await page.locator('main').boundingBox())!.x).toBe(72);
    await sidebar.getByRole('button', { name: 'Expand Sidebar', exact: true }).click();
    await expect.poll(async () => (await sidebar.boundingBox())!.width).toBe(256);
    await expect.poll(async () => (await page.locator('main').boundingBox())!.x).toBe(256);
  }
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Formulix navigation' });
  await expect(drawer).toBeVisible();
  await expect.poll(async () => (await drawer.boundingBox())!.x).toBe(0);
  expect((await drawer.boundingBox())!.width).toBe(306);
  expect((await drawer.locator('aside').boundingBox())!.width).toBe(306);
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
});
