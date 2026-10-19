import { useEffect, useState } from 'react';
import { subscribeFormulationApi } from './formulationApi';
import { rememberSearchRecords, searchEpoch } from './searchRecords';

export interface SearchPage<T> {
  count: number; next: string | null; previous: string | null; results: T[];
  page: number; page_size: number; matchMode?: 'standard' | 'fuzzy';
  total_pages?: number;
}
export type SearchParams = Record<string, string | number | boolean | undefined>;
export interface SearchFacets {
  countries: string[]; manufacturers: string[]; formulationTypes: string[]; categoryCounts: Record<string, number>;
  manufacturerCountries: string[]; documentTypes: string[]; regulatoryAuthorities: string[];
  activeSourceCount: number; chemicalCount: number; linkedFormulationCount?: number;
}
export function useSearchFacets() {
  const search = useServerSearch<SearchFacets>('facets', {}, 1, 1);
  const data = search.results[0];
  return data && Array.isArray(data.countries) && Array.isArray(data.manufacturers) && data.categoryCounts ? data : undefined;
}
export const searchBase = new URL(`${(import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')}/`, window.location.origin);

export async function fetchSearch<T>(params: SearchParams, signal?: AbortSignal): Promise<SearchPage<T>> {
  const epoch = searchEpoch();
  const url = new URL('search/', searchBase);
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && !key.startsWith('_')) url.searchParams.set(key, String(value)); });
  if (params.group === 'all') url.searchParams.delete('group');
  const timeout = AbortSignal.timeout(30000);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let response: Response;
  let data: unknown;
  try {
    response = await fetch(url, { credentials: 'include', cache: 'no-store', signal: requestSignal });
    if (!response.ok) throw new Error(response.status === 429 ? 'Search request limit reached. Please retry shortly.' : `Search unavailable (HTTP ${response.status}).`);
    data = await response.json();
  } catch (error) {
    if (timeout.aborted && !signal?.aborted) throw new Error('Database search timed out. Check the Django server and retry.');
    throw error;
  }
  if (signal?.aborted || searchEpoch() !== epoch) throw new DOMException('Catalog session changed', 'AbortError');
  if (params.group === 'all' && data && typeof data === 'object' && 'groups' in data && data.groups && typeof data.groups === 'object') {
    const groups = Object.entries(data.groups) as [string, SearchPage<unknown>][];
    if (groups.some(([, value]) => !Array.isArray(value.results) || typeof value.count !== 'number')) throw new Error('Invalid grouped search response.');
    groups.forEach(([group, value]) => rememberSearchRecords(group, value.results));
    return { count: groups.reduce((count, [, group]) => count + group.count, 0),
      results: groups.flatMap(([group, value]) => value.results.map(record => ({ group, record, count: value.count, matchMode: value.matchMode }))),
      next: groups.find(([, value]) => value.next)?.[1].next ?? null, previous: Number(params.page) > 1 ? 'previous' : null,
      page: Number(params.page), page_size: Number(params.page_size),
      total_pages: Math.max(1, ...groups.map(([, value]) => Math.ceil(value.count / Number(params.page_size)))) } as SearchPage<T>;
  }
  if (!data || typeof data !== 'object' || !('results' in data) || !Array.isArray(data.results) || !('count' in data) || typeof data.count !== 'number') {
    throw new Error('Invalid search response.');
  }
  rememberSearchRecords(String(params.group), data.results);
  return data as SearchPage<T>;
}

export function useServerSearch<T>(group: string, params: SearchParams, page = 1, pageSize = 50, enabled = true) {
  const key = JSON.stringify({ ...params, group, page, page_size: pageSize, _catalogEpoch: searchEpoch() });
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ key: string; data?: SearchPage<T>; loading: boolean; error: string }>({ key: '', loading: true, error: '' });
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    const unsubscribe = subscribeFormulationApi(refresh);
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { unsubscribe(); window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    if (!enabled) { setState({ key, loading: false, error: '' }); return; }
    setState(previous => ({ key, data: previous.key === key ? previous.data : undefined, loading: true, error: '' }));
    const timer = window.setTimeout(async () => {
      try {
        const data = await fetchSearch<T>(JSON.parse(key), controller.signal);
        if (!controller.signal.aborted) setState({ key, data, loading: false, error: '' });
      } catch (error) {
        if (!controller.signal.aborted) setState({ key, loading: false, error: error instanceof Error ? error.message : 'Search unavailable.' });
      }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [key, revision, enabled]);
  const current = state.key === key ? state : { loading: enabled, error: '', data: undefined };
  return { results: current.data?.results ?? [], count: current.data?.count ?? 0, loading: current.loading,
    error: current.error, next: current.data?.next, previous: current.data?.previous,
    totalPages: current.data?.total_pages,
    refresh: () => setRevision(value => value + 1) };
}
