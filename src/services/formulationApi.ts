import type { ActiveIngredientReference, ChemicalIngredient, CommercialProduct, Formulation, Manufacturer, RegulatoryRecord, TechnicalDocument } from '../types';

export interface DatabaseCatalog {
  activeIngredientReferences?: ActiveIngredientReference[];
  session?: { authenticated: boolean; staff: boolean; canPreview: boolean; username: string };
  products: CommercialProduct[];
  formulations: Formulation[];
  ingredients: ChemicalIngredient[];
  manufacturers: Manufacturer[];
  regulatoryRecords: RegulatoryRecord[];
  documents: TechnicalDocument[];
  staffPreview: boolean;
  publicationCounts: Record<string, number>;
  databaseCounts: Record<string, number>;
}
const emptyCatalog = (): DatabaseCatalog => ({ products: [], formulations: [], ingredients: [], manufacturers: [],
  regulatoryRecords: [], documents: [], staffPreview: false, publicationCounts: {}, databaseCounts: {} });
let catalog = emptyCatalog();
let state: 'loading' | 'ready' | 'unavailable' = 'loading';
let pending: Promise<void> | undefined;
let refreshedAt = 0;
let retryAt = 0;
let errorMessage = '';
const listeners = new Set<() => void>();
const configured = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env.VITE_API_BASE_URL;
const base = new URL(`${(configured || '/api/v1').replace(/\/$/, '')}/`, window.location.origin);

export async function staffSignIn(username: string, password: string) {
  const sessionUrl = new URL('session/', base);
  const csrfResponse = await fetch(sessionUrl, { credentials: 'include', cache: 'no-store' });
  if (!csrfResponse.ok) throw new Error('Staff sign-in endpoint unavailable. Restart the Django server.');
  const csrf = await csrfResponse.json();
  const response = await fetch(sessionUrl, { method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf.csrfToken },
    body: JSON.stringify({ username, password }) });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || 'Sign-in failed. Check your staff username and password.');
  }
  // Finish any anonymous request before reloading with the newly authenticated cookie.
  if (pending) await pending;
  retryAt = 0;
  await refreshFormulationApi(true);
  if (state !== 'ready' || !catalog.session?.canPreview) {
    throw new Error('Sign-in completed, but the catalog session was not accepted. Check browser cookie settings.');
  }
}

export async function staffSignOut() {
  if (pending) await pending;
  const sessionUrl = new URL('session/', base);
  const csrfResponse = await fetch(sessionUrl, { credentials: 'include', cache: 'no-store' });
  if (!csrfResponse.ok) throw new Error('Session endpoint unavailable');
  const csrf = await csrfResponse.json();
  const response = await fetch(sessionUrl, { method: 'DELETE', credentials: 'include', headers: { 'X-CSRFToken': csrf.csrfToken } });
  if (!response.ok) throw new Error('Sign-out failed');
  catalog = emptyCatalog();
  state = 'loading';
  retryAt = 0;
  listeners.forEach(listener => listener());
  await refreshFormulationApi(true);
}

export const getDatabaseCatalog = () => catalog;
export const getApiFormulations = () => catalog.formulations;
export const getFormulationApiState = () => state;
export const getFormulationApiError = () => errorMessage;
export function subscribeFormulationApi(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function refreshFormulationApi(force = false): Promise<void> {
  if (pending) return pending;
  if (Date.now() < retryAt) return Promise.resolve();
  if (!force && Date.now() - refreshedAt < 60000) return Promise.resolve();
  pending = (async () => {
    try {
      const response = await fetch(new URL('catalog/', base), { credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(60000) });
      if (response.status === 429) {
        const header = response.headers.get('Retry-After');
        const seconds = header && Number.isFinite(Number(header)) ? Math.max(1, Number(header)) : 60;
        retryAt = Date.now() + seconds * 1000;
        throw new Error(`Catalog request limit reached. Please retry after ${Math.ceil(seconds)} seconds.`);
      }
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Catalog endpoint not found (HTTP 404). Check that the Vite proxy targets the Formulix backend.');
        }
        throw new Error(`Catalog request failed (HTTP ${response.status}).`);
      }
      const data = await response.json();
      for (const key of ['products', 'formulations', 'ingredients', 'manufacturers', 'regulatoryRecords', 'documents']) {
        if (!Array.isArray(data[key])) throw new Error('Invalid catalog response');
      }
      catalog = data;
      state = 'ready';
      errorMessage = '';
      retryAt = 0;
    } catch (error) {
      // Clear stale public records, including records withdrawn since the last fetch.
      catalog = emptyCatalog();
      state = 'unavailable';
      errorMessage = error instanceof Error && error.message !== 'Failed to fetch'
        ? error.message
        : 'Django backend unavailable';
    } finally {
      refreshedAt = Date.now();
      pending = undefined;
      listeners.forEach(listener => listener());
    }
  })();
  return pending;
}
