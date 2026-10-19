import { mockProducts, mockFormulations, mockIngredients, mockManufacturers, mockRegulatoryRecords, mockDocuments } from '../mocks/mockData';
import type { CompositionItem } from '../types';

const seeds = { product: mockProducts, formulation: mockFormulations, ingredient: mockIngredients,
  manufacturer: mockManufacturers, regulatory: mockRegulatoryRecords, document: mockDocuments };

export function isDemoRecord(kind: keyof typeof seeds, id: string) {
  return seeds[kind].some(record => record.id === id);
}

export function sourceHref(value?: string) {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

export function compositionSummary(items: CompositionItem[]) {
  if (!items.length) return null;
  const groups = new Map<string, number>();
  for (const item of items) {
    const match = item.concentration.trim().match(/^(\d+(?:\.\d+)?)\s*(%\s*w\/w)?$/i);
    if (!match || (item.unit?.trim() ?? match[2]?.trim()) !== '% w/w') return null;
    const value = Number(match[1]);
    groups.set(item.ingredientCategory, (groups.get(item.ingredientCategory) ?? 0) + value);
  }
  const total = Array.from(groups.values()).reduce((sum, value) => sum + value, 0);
  if (total <= 0 || total > 100.05) return null;
  return { total, complete: Math.abs(total - 100) < 0.05,
    groups: Array.from(groups, ([category, value]) => ({ category, value })) };
}
