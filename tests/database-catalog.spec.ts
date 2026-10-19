import { test, expect } from '@playwright/test';

import { form, product, snapshot } from './fixtures/catalog';

test('one Django formulation drives products, comparison, regulatory, dashboard and demo cleanup', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  await page.route('**/api/v1/catalog/', route => route.fulfill({ json: snapshot }));
  await page.addInitScript(() => {
    if (localStorage.getItem('qa-workspace-seeded')) return;
    localStorage.setItem('qa-workspace-seeded', '1');
    localStorage.setItem('formulix_workspace_state_v2', JSON.stringify({
    savedProductIds: ['prod-1'], savedFormulationIds: ['form-1'], bookmarkedManufacturerIds: ['mfg-1'],
    comparisonProductIds: ['prod-1', 'prod-11'], researchNotes: [{ id: 'custom-note', title: 'Keep user note', content: 'User content', category: 'QA', tags: [], updatedAt: '' }],
    recentActivities: [], recentSearches: [], theme: 'light' }));
  });
  for (const width of [390, 1366, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/products');
    await expect(page.getByText('Staff preview / includes unpublished records', { exact: true })).toBeVisible();
    await expect(page.locator('main tbody tr')).toHaveCount(1);
    await expect(page.locator('main tbody')).toContainText(form.name);
    await expect(page.getByText('Confidor 200 SL', { exact: true })).toHaveCount(0);
    await page.locator('main tbody input[type=checkbox]').check();
    await page.goto('/compare');
    await expect(page.locator('main')).toContainText(form.name);
    await expect(page.locator('main')).toContainText('1.08 - 1.12 g/mL');
    await page.goto('/regulatory');
    await expect(page.locator('main tbody tr')).toHaveCount(1);
    await expect(page.locator('main tbody')).toContainText('QA-REG-001');
    await expect(page.locator('main tbody')).toContainText('Unverified');
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Formulation Publication Workflow' })).toBeVisible();
    await expect(page.getByText('Draft:', { exact: false })).toBeVisible();
    await expect(page.locator('main tbody')).toContainText(form.name);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: test.info().outputPath(`database-dashboard-${width}.png`) });
    if (width === 1440) {
      await page.getByRole('button', { name: 'Switch to Dark Theme', exact: true }).click();
      await expect(page.locator('html')).toHaveClass(/dark/);
      await page.screenshot({ path: test.info().outputPath('database-dashboard-1440-dark.png') });
      await page.getByRole('button', { name: 'Switch to Light Theme', exact: true }).click();
      await page.getByTitle('Collapse Sidebar', { exact: true }).click();
      await expect.poll(() => page.locator('.shell-sidebar').first().evaluate(element => Math.round(element.getBoundingClientRect().width))).toBe(72);
      expect(await page.locator('.shell-sidebar > div:first-child > div').first().evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(30);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.getByTitle('Expand Sidebar', { exact: true }).click();
      await expect.poll(() => page.locator('.shell-sidebar').first().evaluate(element => Math.round(element.getBoundingClientRect().width))).toBe(260);
    }
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('formulix_workspace_state_v2')!));
    expect(stored.savedProductIds).toEqual([]);
    expect(stored.researchNotes[0].id).toBe('custom-note');
  }
  expect(errors).toEqual([]);
});

test('in-app staff login loads private drafts immediately and logout clears them', async ({ page }) => {
  let signedIn = false;
  const session = () => ({ authenticated: signedIn, staff: signedIn, canPreview: signedIn, username: signedIn ? 'qa-staff' : '', csrfToken: 'qa-csrf' });
  await page.route('**/api/v1/session/', async route => {
    if (route.request().method() === 'POST') {
      expect(route.request().headers()['x-csrftoken']).toBe('qa-csrf');
      const credentials = route.request().postDataJSON();
      if (credentials.password !== 'qa-correct-password') {
        await route.fulfill({ status: 403, json: { detail: 'Sign-in failed. Check your staff credentials.' } });
        return;
      }
      signedIn = true;
    } else if (route.request().method() === 'DELETE') {
      signedIn = false;
    }
    await route.fulfill({ json: session() });
  });
  await page.route('**/api/v1/catalog/', route => route.fulfill({ json: signedIn ? { ...snapshot, session: session() }
    : { products: [], formulations: [], ingredients: [], manufacturers: [], documents: [], regulatoryRecords: [],
      staffPreview: false, publicationCounts: {}, databaseCounts: {}, session: session() } }));
  await page.goto('/');
  await page.getByRole('button', { name: 'View Uploaded Drafts', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Staff Sign In' });
  await dialog.getByLabel('Username', { exact: true }).fill('qa-staff');
  await dialog.getByLabel('Password', { exact: true }).fill('qa-wrong-password');
  await dialog.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Sign-in failed');
  await dialog.getByLabel('Password', { exact: true }).fill('qa-correct-password');
  await dialog.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Signed in as qa-staff', { exact: true })).toBeVisible();
  await expect(page.locator('main tbody')).toContainText(form.name);
  expect(await page.evaluate(() => Object.values(localStorage).join('').includes('qa-correct-password'))).toBe(false);
  await page.getByRole('button', { name: 'Sign out of staff preview', exact: true }).click();
  await expect(page.getByRole('button', { name: 'View Uploaded Drafts', exact: true })).toBeVisible();
  await expect(page.locator('main tbody')).not.toContainText(form.name);
});

test('active ingredient name search finds uploaded mixtures and linked brands without registry identities', async ({ page }) => {
  const sourceText = 'Azoxystrobin 20% + Difenoconazole 12.5% w/w';
  await page.route('**/api/v1/catalog/', route => route.fulfill({ json: { ...snapshot,
    products: [{ ...product, activeIngredient: sourceText, strength: sourceText }],
    activeIngredientReferences: [{ id: 'qa-active-source', sourceText, productIds: [product.id], categories: ['Agrochemical'],
      markets: ['India'], verificationStatus: 'Source-reported / unverified', recordKind: 'Active ingredient source text' }],
  } }));
  for (const width of [360, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/ingredients?ingredient=ing-1');
    await expect(page.getByText('Staff preview / includes unpublished records', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Agrochemical', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search active ingredients' }).fill('azoxystrobin');
    await expect(page.getByText('1 matching active ingredient source records', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: sourceText, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: form.name, exact: true })).toBeVisible();
    await expect(page.locator('.fx-molecule-viewer')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: test.info().outputPath(`active-ingredient-${width}.png`) });
    await page.getByRole('button', { name: form.name, exact: true }).click();
    await expect(page.locator('main')).toContainText(sourceText);
    await page.goto('/ingredients');
    await page.getByRole('searchbox', { name: 'Search active ingredients' }).fill('nonexistent-active');
    await expect(page.getByRole('heading', { name: 'No matching active ingredient records' })).toBeVisible();
  }
});
