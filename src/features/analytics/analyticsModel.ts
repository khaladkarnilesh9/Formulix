import type { DatabaseCatalog } from '../../services/formulationApi';
import type { CommercialProduct } from '../../types';

export const analyticsColors = ['#076bff', '#12bf80', '#ff951b', '#9255ff', '#f34ba9', '#96a6bd'];
const classificationRanks: Record<string, number> = { insecticide: 0, insecticides: 0, fungicide: 1, fungicides: 1, herbicide: 2, herbicides: 2, pgr: 3, 'plant growth regulator': 3, 'plant growth regulators': 3, biopesticide: 4, biopesticides: 4, others: 5, other: 5 };
export const classificationRank = (name: string) => classificationRanks[name.trim().toLowerCase()] ?? 6;
export const classificationColor = (name: string, fallback = 5) => analyticsColors[classificationRanks[name.trim().toLowerCase()] ?? fallback % analyticsColors.length];
const typeRanks = ['SC', 'WG', 'EC', 'SL', 'OD', 'WP', 'GR', 'OTHERS'];
export const typeRank = (name: string) => { const rank = typeRanks.indexOf(name.toUpperCase() === 'WDG' ? 'WG' : name.toUpperCase()); return rank < 0 ? 8 : rank; };
export const typeColor = (name: string) => ['#076bff', '#12bf80', '#ff951b', '#9255ff', '#f34ba9', '#12bde6', '#53ce92', '#96a6bd'][Math.min(7, typeRank(name))];
export interface AnalyticsFilters { manufacturer: string; region: string; classification: string; ingredient: string; type: string; year: string; }
export const allAnalyticsFilters: AnalyticsFilters = { manufacturer: 'All', region: 'All', classification: 'All', ingredient: 'All', type: 'All', year: 'All' };
export const classificationOf = (product: CommercialProduct) => product.marketData?.['Product Classification']?.trim() || product.category || 'Not recorded';
export const typeOf = (product: CommercialProduct) => product.formulationType.split('(')[0].trim() || 'Not recorded';
export const companyOf = (product: CommercialProduct) => product.manufacturerName.trim() || 'Not recorded';
export const ingredientOf = (product: CommercialProduct) => product.activeIngredient.trim() || 'Not recorded';
export const countsOf = (values: string[]) => [...values.reduce((counts, name) => counts.set(name, (counts.get(name) ?? 0) + 1), new Map<string, number>())]
  .map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
export const dateYear = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date.getUTCFullYear() : undefined;
};
const recorded = (value: string) => value && !['not recorded', 'n/a', 'na', 'none', '-'].includes(value.trim().toLowerCase());

export function marketAnalytics(catalog: DatabaseCatalog, filters: AnalyticsFilters) {
  const yearProductIds = new Set(catalog.regulatoryRecords.filter(row => String(dateYear(row.approvalDate)) === filters.year).map(row => row.productId));
  const products = catalog.products.filter(product =>
    (filters.manufacturer === 'All' || companyOf(product) === filters.manufacturer)
    && (filters.region === 'All' || product.country === filters.region)
    && (filters.classification === 'All' || classificationOf(product) === filters.classification)
    && (filters.ingredient === 'All' || ingredientOf(product) === filters.ingredient)
    && (filters.type === 'All' || typeOf(product) === filters.type)
    && (filters.year === 'All' || yearProductIds.has(product.id)));
  const productIds = new Set(products.map(product => product.id));
  const formIds = new Set(products.map(product => product.formulationId).filter(Boolean));
  const registrations = catalog.regulatoryRecords.filter(row => productIds.has(row.productId) && (filters.year === 'All' || String(dateYear(row.approvalDate)) === filters.year));
  const formulations = catalog.formulations.filter(row => formIds.has(row.id) || row.commercialProductIds.some(id => productIds.has(id)));
  const categories = countsOf(products.map(classificationOf));
  const types = countsOf(products.map(typeOf));
  const active = countsOf(products.map(ingredientOf).filter(recorded));
  const countries = countsOf(products.map(product => product.country).filter(recorded)).map(row => ({ ...row,
    registrations: registrations.filter(record => record.country === row.name).length }));
  const brands = new Set(products.filter(row => row.brandName.trim()).map(row => JSON.stringify([row.manufacturerId || companyOf(row), row.brandName.trim().toLowerCase()]))).size;
  const yearCounts = new Map<number, { year: number; starts: number; expiry: number }>();
  for (const registration of registrations) {
    for (const [field, value] of [['starts', registration.approvalDate], ['expiry', registration.expiryDate]] as const) {
      const year = dateYear(value);
      if (year === undefined) continue;
      const row = yearCounts.get(year) ?? { year, starts: 0, expiry: 0 };
      row[field] += 1;
      yearCounts.set(year, row);
    }
  }
  const datedYears = [...yearCounts.keys()].sort((a, b) => a - b);
  const trends = datedYears.length ? Array.from({ length: Math.min(12, datedYears.at(-1)! - datedYears[0] + 1) }, (_, index) => {
    const year = Math.max(datedYears[0], datedYears.at(-1)! - 11) + index;
    return yearCounts.get(year) ?? { year, starts: 0, expiry: 0 };
  }) : [];
  return { products, registrations, formulations, categories, types, active, countries, brands, trends,
    datedReferences: registrations.filter(row => dateYear(row.approvalDate) !== undefined).length };
}

export interface PortfolioNode { name: string; count?: number; color?: string; children?: PortfolioNode[]; }
export function portfolioTree(products: CommercialProduct[]): PortfolioNode {
  const companies = countsOf(products.map(companyOf));
  const top = new Set(companies.slice(0, 4).map(row => row.name));
  const buckets = new Map<string, CommercialProduct[]>();
  for (const product of products) {
    const name = top.has(companyOf(product)) ? companyOf(product) : 'Other manufacturers';
    if (!buckets.has(name)) buckets.set(name, []);
    buckets.get(name)!.push(product);
  }
  return { name: 'Portfolio', children: [...buckets].map(([name, rows]) => ({ name, children: countsOf(rows.map(classificationOf)).map((category, index) => ({
    name: category.name, color: classificationColor(category.name, index),
    children: countsOf(rows.filter(row => classificationOf(row) === category.name).map(typeOf)).map(type => ({ name: type.name, count: type.count, color: classificationColor(category.name, index) })),
  })) })) };
}

export function productFlow(products: CommercialProduct[]) {
  const fields = [companyOf, (row: CommercialProduct) => row.brandName.trim() || 'Not recorded', ingredientOf, typeOf];
  const others = ['Other manufacturers', 'Other brands', 'Other active records', 'Other types'];
  const stages = fields.map((field, stage) => {
    const keyOf = (row: CommercialProduct) => JSON.stringify(stage === 0 ? [row.manufacturerId || companyOf(row)] : stage === 1 ? [row.manufacturerId || companyOf(row), field(row)] : [field(row)]);
    const labels = new Map(products.map(row => [keyOf(row), field(row)]));
    const counts = countsOf(products.map(keyOf));
    const visible = counts.slice(0, stage === 0 ? 3 : 4);
    const names = visible.map(row => row.name);
    const otherKey = JSON.stringify(['aggregate', stage]);
    labels.set(otherKey, others[stage]);
    if (counts.length > visible.length) names.push(otherKey);
    return { names, top: new Set(visible.map(row => row.name)), keyOf, labels, otherKey };
  });
  const nodes = stages.flatMap((stage, stageIndex) => stage.names.map((name, index) => ({
    name: stage.labels.get(name)!, stage: stageIndex, color: analyticsColors[index % analyticsColors.length],
    value: products.filter(row => (stage.top.has(stage.keyOf(row)) ? stage.keyOf(row) : stage.otherKey) === name).length,
  })));
  const offsets = stages.map((_, index) => stages.slice(0, index).reduce((sum, stage) => sum + stage.names.length, 0));
  const links = new Map<string, { source: number; target: number; value: number }>();
  for (const product of products) {
    const indexes = stages.map((stage, index) => offsets[index] + stage.names.indexOf(stage.top.has(stage.keyOf(product)) ? stage.keyOf(product) : stage.otherKey));
    for (let index = 0; index < indexes.length - 1; index++) {
      const source = indexes[index], target = indexes[index + 1];
      const key = `${source}:${target}`;
      const link = links.get(key) ?? { source, target, value: 0 };
      link.value += 1;
      links.set(key, link);
    }
  }
  return { nodes, links: [...links.values()] };
}

export function cropTargets(product: CommercialProduct) {
  const keys = ['Crop', 'Crops', 'Target Crop', 'Target Crops', 'Crop / Target Crop'];
  return [...new Set(keys.map(key => product.marketData?.[key]?.trim()).filter((value): value is string => Boolean(value)))];
}
export function targetMatrix(products: CommercialProduct[], mode: 'Crop' | 'Pest') {
  const targetsOf = (product: CommercialProduct) => mode === 'Crop' ? cropTargets(product) : product.indicationsOrPests.map(value => value.trim()).filter(recorded);
  const usable = products.filter(product => recorded(ingredientOf(product)) && targetsOf(product).length);
  const ingredients = countsOf(usable.map(ingredientOf)).slice(0, 8).map(row => row.name);
  const targets = countsOf(usable.flatMap(targetsOf)).slice(0, 7).map(row => row.name);
  const cells = ingredients.map(ingredient => targets.map(target => usable.filter(product => ingredientOf(product) === ingredient && targetsOf(product).includes(target)).length));
  return { ingredients, targets, cells, max: Math.max(1, ...cells.flat()) };
}
