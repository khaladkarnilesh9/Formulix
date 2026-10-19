import { test, expect } from '@playwright/test';

test.use({ trace: 'off' });
test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
});

test('molecular viewer depicts stored SMILES in both themes and supports zoom', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/ingredients?ingredient=ing-1');
    const viewer = page.locator('.fx-molecule-viewer');
    await expect.poll(() => viewer.locator('svg[role="img"] line, svg[role="img"] path').count()).toBeGreaterThan(10);
    await expect(viewer.locator('[role="status"]')).not.toBeVisible();
    const initial = await viewer.locator('svg[role="img"]').evaluate(element => element.innerHTML);
    await viewer.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await expect(viewer.getByText('125%', { exact: true })).toBeVisible();
    await viewer.getByRole('button', { name: 'Reset zoom', exact: true }).click();
    await expect(viewer.getByText('100%', { exact: true })).toBeVisible();
    await page.locator('main').getByRole('button', { name: 'Azoxystrobin', exact: true }).click();
    await expect.poll(() => viewer.locator('svg[role="img"]').evaluate(element => element.innerHTML)).not.toBe(initial);
    await expect.poll(() => viewer.locator('svg[role="img"] line, svg[role="img"] path').count()).toBeGreaterThan(10);
    if (width < 768) await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click();
    else await page.getByRole('button', { name: 'Switch to Light Theme', exact: true }).click();
    await expect.poll(() => viewer.locator('svg[role="img"] line, svg[role="img"] path').count()).toBeGreaterThan(10);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  expect(errors).toEqual([]);
});

test('research note validation, persistence, search, update and deletion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workspace/research');
  await page.getByRole('button', { name: 'New Research Note', exact: true }).click();
  await page.getByRole('button', { name: 'Save to Workspace', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'A note title is required' })).toBeVisible();
  await page.getByLabel('Title', { exact: true }).fill('QA scientific observations');
  await page.getByLabel('Research observations', { exact: true }).fill('Exact stored values: 18.5% w/w, pH 7.2. No automatic conversion.');
  await page.getByLabel('Tags', { exact: true }).fill('QA, Stability');
  await page.getByRole('button', { name: 'Save to Workspace', exact: true }).click();
  await page.reload();
  await page.getByRole('searchbox', { name: 'Search workspace' }).fill('QA scientific');
  await expect(page.getByRole('heading', { name: 'QA scientific observations', exact: true })).toBeVisible();
  await expect(page.getByText('Exact stored values: 18.5% w/w, pH 7.2. No automatic conversion.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit QA scientific observations', exact: true }).click();
  await page.getByLabel('Research observations', { exact: true }).fill('Updated plain-text observations.');
  await page.getByRole('button', { name: 'Update Note', exact: true }).click();
  await expect(page.getByText('Updated plain-text observations.', { exact: true })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete QA scientific observations', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'QA scientific observations', exact: true })).not.toBeVisible();
});

test('record dialogs retain metadata, trap focus, restore focus and export summaries', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/regulatory');
  const registration = page.locator('main tbody tr').first().getByRole('button').first();
  await registration.click();
  const regulatory = page.getByRole('dialog');
  await expect(regulatory).toBeVisible();
  await expect(regulatory.getByText('Registration identifier', { exact: true })).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  expect(await regulatory.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(regulatory).not.toBeVisible();
  await expect(registration).toBeFocused();
  await page.goto('/documents');
  const details = page.getByRole('button', { name: 'Record details', exact: true }).first();
  await details.click();
  const docDialog = page.getByRole('dialog');
  await expect(docDialog).toBeVisible();
  await expect(docDialog.getByText('Stored verification label', { exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await docDialog.getByRole('button', { name: 'Export record summary', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/_summary\.txt$/);
  await page.keyboard.press('Escape');
  await expect(details).toBeFocused();
  await page.goto('/patents');
  await expect(page.getByRole('heading', { name: 'Patent Intelligence', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Document type' })).not.toBeVisible();
});

test('dashboard counts and compatible composition calculations use repository data', async ({ page }) => {
  await page.goto('/');
  const report = await page.evaluate(async () => {
    const servicePath = '/src/services/dataService.ts';
    const repoPath = '/src/data/repositories/sharedRepository.ts';
    const presentationPath = '/src/services/presentation.ts';
    const { DataService } = await import(servicePath);
    const { SharedRepository } = await import(repoPath);
    const { compositionSummary, sourceHref } = await import(presentationPath);
    const item = (concentration: string, unit: string) => ({ ingredient: 'Recorded ingredient', cas: '', chemicalFunction: 'Active', ingredientCategory: 'Active', concentration, unit });
    return {
      products: DataService.getDashboardMetrics().kpis.totalProducts,
      actualProducts: SharedRepository.getAllProducts(false).length,
      formulations: DataService.getDashboardMetrics().kpis.totalFormulations,
      actualFormulations: SharedRepository.getAllFormulations(false).length,
      complete: compositionSummary([item('20', '% w/w'), item('80', '% w/w')]),
      partial: compositionSummary([item('20', '% w/w')]),
      mixed: compositionSummary([item('20', '% w/w'), item('80', 'g/L')]),
      invalid: compositionSummary([item('unknown', '% w/w')]),
      over: compositionSummary([item('101', '% w/w')]),
      unsafeSource: sourceHref('javascript:alert(1)'),
    };
  });
  expect(report.products).toBe(report.actualProducts);
  expect(report.formulations).toBe(report.actualFormulations);
  expect(report.complete.complete).toBe(true);
  expect(report.partial.complete).toBe(false);
  expect(report.mixed).toBeNull(); expect(report.invalid).toBeNull(); expect(report.over).toBeNull();
  expect(report.unsafeSource).toBeUndefined();
});

test('admin product sorting, filters and bulk-selection controls remain usable', async ({ page }) => {
  await page.goto('/admin/products');
  await page.getByRole('combobox', { name: 'Sort admin products', exact: true }).selectOption('brandName');
  const brands = page.locator('main tbody tr td:nth-child(2) > div:first-child > span:first-child');
  const ascending = await brands.allTextContents();
  expect(ascending).toEqual([...ascending].sort((left, right) => left.localeCompare(right)));
  await page.getByRole('button', { name: 'Sort descending', exact: true }).click();
  const descending = await brands.allTextContents();
  expect(descending).toEqual([...ascending].reverse());
  await page.getByRole('checkbox', { name: 'Select all matching product records', exact: true }).check();
  await expect(page.getByRole('button', { name: 'Publish Selected', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear product selection', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Publish Selected', exact: true })).not.toBeVisible();
  await page.getByRole('textbox', { name: 'Search admin products', exact: true }).fill('Confidor');
  await expect(page.locator('main tbody tr')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Next product page', exact: true })).toBeDisabled();
});

test('admin editors trap focus, close with Escape and restore the trigger', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [route, action] of [
    ['/admin/formulations', 'New Formulation Recipe'], ['/admin/ingredients', 'Catalog New Substance'],
    ['/admin/manufacturers', 'Add Corporate Entity'], ['/admin/brands', 'New Brand Record'],
    ['/admin/documents', 'Upload / Register Document'], ['/admin/registrations', 'New Regulatory Docket'],
  ]) {
    await page.goto(route);
    const trigger = page.getByRole('button', { name: action, exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    expect(await page.locator('main').evaluate(element => element.closest<HTMLElement>('[data-drawer-background]')?.inert)).toBe(true);
    await page.keyboard.press('Shift+Tab');
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
});
