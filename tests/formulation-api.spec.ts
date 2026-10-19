import { test, expect } from '@playwright/test';

const marketData = {
  Market: 'India', 'Company Name': 'QA workbook company', 'Product Name / Brand Name': 'QA imported SC 1',
  'Product Classification': 'Insecticide', 'Formulation Type': 'SC',
  'Active Ingredient & % (w/w)': 'Ingredient A 20% + Ingredient B 8% w/w',
  'Dispersing / Wetting Agent & CAS No.': 'Dispersant (CAS 37199-81-8)',
  'Carrier / Solvent Matrix & CAS No.': 'Water (CAS 7732-18-5)',
  'Functional Excipients & CAS No.': 'Glycol + gum', 'Density / Specific Gravity (g/mL)': '1.08 - 1.12 g/mL',
  'pH Range': '6.5 - 7.5', 'EPA / CIBRC Registration No.': 'QA-REG-1',
  'Flash Point Range (\u00b0C)': '> 100 C (source text)', 'Viscosity Profile (mPa\u00b7s / cP)': '400 - 600 cP',
  'WHO Hazard Classification': 'Class III', 'CIBRC Toxicity Color Band': 'Light Blue',
  'Patent Reference': 'QA Patent-1', 'Pest Control / Target Diseases': 'Armyworm',
};
const records = Array.from({ length: 61 }, (_, index) => ({
  id: `qa-api-${index + 1}`, name: `QA imported SC ${index + 1}`, category: 'Agrochemical', formulationType: 'SC',
  publishStatus: 'Published', verificationStatus: 'Imported unverified', verificationEvidence: 'Imported unverified',
  intendedApplication: 'Armyworm', targetIndustry: 'Agrochemical', sourceReference: 'QA.xlsx / Master Database / row 2',
  composition: [], manufacturingInfo: { processOverview: '', mixingSequence: [], processingConditions: [], equipment: [], qcParameters: [] },
  properties: { ph: '6.5 - 7.5', viscosity: '400 - 600 cP', density: '1.08 - 1.12 g/mL', particleSize: '', stability: '', shelfLife: '', appearance: '' },
  patentReferences: [], commercialProductIds: [], marketData: { ...marketData, 'Product Name / Brand Name': `QA imported SC ${index + 1}` },
}));
const snapshot = (forms: typeof records) => ({ products: [], formulations: forms, ingredients: [], manufacturers: [],
  regulatoryRecords: [], documents: [], staffPreview: false, publicationCounts: { Published: forms.length }, databaseCounts: {} });

test('published workbook API pagination, filtering, exact details and withdrawal', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  let withdrawn = false;
  await page.route('**/api/v1/catalog/', async route => {
    await route.fulfill({ json: snapshot(withdrawn ? [] : records) });
  });
  for (const width of [360, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/formulations');
    await expect(page.getByText('Published database formulations', { exact: true })).toBeVisible();
    await expect(page.getByText('Indexed Formulations (61)', { exact: true })).toBeVisible();
    await page.getByRole('combobox', { name: 'Market region' }).selectOption('India');
    await expect(page.getByText('Indexed Formulations (61)', { exact: true })).toBeVisible();
    await expect(page.getByText('Imported / unverified', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Demo Synthetic Model', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'QA imported SC 51', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Next formulation page' }).click();
    await expect(page.getByRole('button', { name: 'QA imported SC 51', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Previous formulation page' }).click();
    await page.getByRole('button', { name: 'QA imported SC 1', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Market Spreadsheet Record' })).toBeVisible();
    await expect(page.getByText('> 100 C (source text)', { exact: true })).toBeVisible();
    await expect(page.getByText('QA-REG-1', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: test.info().outputPath(`market-record-${width}.png`), fullPage: false });
  }
  withdrawn = true;
  await page.getByRole('combobox', { name: 'Market region' }).selectOption('All');
  await page.getByRole('button', { name: 'Refresh published formulations' }).click();
  await expect(page.getByRole('heading', { name: 'Market Spreadsheet Record' })).toHaveCount(0);
  await expect(page.getByText('Indexed Formulations (0)', { exact: true })).toBeVisible();
  await expect(page.getByText('No published formulations. Imported drafts are not public.', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('empty or unavailable API does not fall back to demo formulations', async ({ page }) => {
  let unavailable = false;
  await page.route('**/api/v1/catalog/', route => route.fulfill(unavailable
    ? { status: 503, body: 'Unavailable' }
    : { json: snapshot([]) }));
  await page.goto('/formulations');
  await expect(page.getByText('No published formulations. Imported drafts are not public.', { exact: true })).toBeVisible();
  await expect(page.getByText('Demo-origin recipe', { exact: true })).toHaveCount(0);
  unavailable = true;
  await page.getByRole('button', { name: 'Refresh published formulations' }).click();
  await expect(page.getByText('Formulation database is unavailable.', { exact: true })).toBeVisible();
  await expect(page.getByText('Indexed Formulations (0)', { exact: true })).toBeVisible();
});
