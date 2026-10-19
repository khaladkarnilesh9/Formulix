import { getDatabaseCatalog, getFormulationApiState, subscribeFormulationApi } from './formulationApi';

let epoch = 0;
const records = new Map<string, unknown>();
let sessionKey: string | undefined;
subscribeFormulationApi(() => {
  const catalog = getDatabaseCatalog();
  const state = getFormulationApiState();
  const next = state === 'ready' ? JSON.stringify([catalog.session?.authenticated ?? false,
    catalog.session?.username ?? '', catalog.session?.canPreview ?? false, catalog.staffPreview]) : state;
  // Catalog content refreshes must not impersonate an authentication change.
  if (sessionKey !== undefined && sessionKey !== next) epoch++;
  sessionKey = next;
  records.clear();
});
export const searchEpoch = () => epoch;
export function rememberSearchRecords(group: string, rows: unknown[]) {
  if (group === 'patentReferences') group = 'formulations';
  rows.forEach(row => {
    if (row && typeof row === 'object' && 'id' in row && typeof row.id === 'string') records.set(`${group}:${row.id}`, row);
    if (group === 'brands' && row && typeof row === 'object' && 'products' in row && Array.isArray(row.products)) rememberSearchRecords('products', row.products);
  });
  while (records.size > 1000) records.delete(records.keys().next().value!);
}
export const searchedRecord = <T,>(group: string, id: string): T | undefined => records.get(`${group}:${id}`) as T | undefined;
