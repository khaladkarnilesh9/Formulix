import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { NavItemKey } from './Sidebar';
import type { AdminTabKey } from '../../features/admin/layout/AdminSidebar';

export const userPaths: Record<NavItemKey, string> = {
  dashboard: '/', 'product-search': '/products', 'product-detail': '/products/detail',
  'formulation-explorer': '/formulations', 'ingredient-explorer': '/ingredients',
  'product-comparison': '/compare', 'manufacturer-directory': '/manufacturers',
  'brand-intelligence': '/brands', 'market-analytics': '/market-analytics', 'regulatory-intelligence': '/regulatory',
  'patent-intelligence': '/patents', 'technical-documents': '/documents',
  'saved-items': '/workspace', 'research-workspace': '/workspace/research', settings: '/settings',
};
export const adminTabs: AdminTabKey[] = ['admin-dashboard', 'admin-indian-agro', 'admin-products',
  'admin-products-new', 'admin-formulations', 'admin-ingredients', 'admin-manufacturers',
  'admin-brands', 'admin-registrations', 'admin-patents', 'admin-documents', 'admin-imports',
  'admin-review', 'admin-data-quality', 'admin-master-data', 'admin-audit-logs',
  'admin-field-audit', 'admin-e2e-tests', 'admin-settings'];
export const adminPath = (tab: AdminTabKey) => tab === 'admin-dashboard' ? '/admin' : `/admin/${tab.slice(6)}`;

export function usePortalNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const portal = location.pathname === '/admin' || location.pathname.startsWith('/admin/') ? 'admin' : 'user';
  const currentTab = (Object.keys(userPaths) as NavItemKey[]).find(tab => userPaths[tab] === location.pathname) ?? 'dashboard';
  const adminTab = adminTabs.find(tab => adminPath(tab) === location.pathname) ?? 'admin-dashboard';
  const lastUser = useRef('/');
  const lastAdmin = useRef('/admin');
  if (portal === 'user') lastUser.current = location.pathname + location.search;
  else lastAdmin.current = location.pathname + location.search;

  const params = new URLSearchParams(location.search);
  const [selection, setSelection] = useState({ product: params.get('product') ?? 'prod-1',
    formulation: params.get('formulation') ?? 'form-1', ingredient: params.get('ingredient') ?? 'ing-1',
    manufacturer: params.get('manufacturer') ?? 'mfg-1', document: params.get('document') ?? undefined });
  const selected = useRef(selection);
  useEffect(() => {
    const search = new URLSearchParams(location.search);
    const next = { ...selected.current };
    for (const key of Object.keys(next) as (keyof typeof next)[]) {
      if (search.has(key)) next[key] = search.get(key)!;
    }
    selected.current = next;
    setSelection(next);
  }, [location.search]);
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  const select = <K extends keyof typeof selection>(key: K, value: typeof selection[K]) => {
    selected.current = { ...selected.current, [key]: value };
    setSelection(selected.current);
  };
  const setCurrentTab = (tab: NavItemKey) => {
    const query = new URLSearchParams();
    const selectionKeys: Partial<Record<NavItemKey, keyof typeof selection>> = { 'product-detail': 'product', 'formulation-explorer': 'formulation',
      'ingredient-explorer': 'ingredient', 'manufacturer-directory': 'manufacturer',
      'patent-intelligence': 'document', 'technical-documents': 'document' };
    const key = selectionKeys[tab];
    if (key && selected.current[key]) query.set(key, selected.current[key]!);
    lastUser.current = userPaths[tab] + (query.size ? `?${query}` : '');
    navigate(lastUser.current);
  };
  return { portal, currentTab, adminTab, selection,
    setCurrentTab, setAdminTab: (tab: AdminTabKey) => {
      lastAdmin.current = adminPath(tab); navigate(lastAdmin.current);
    },
    setPortal: (value: 'user' | 'admin') => navigate(value === 'user' ? lastUser.current : lastAdmin.current),
    setSelectedProductId: (value: string) => select('product', value),
    setSelectedFormulationId: (value: string) => select('formulation', value),
    setSelectedIngredientCas: (value: string) => select('ingredient', value),
    setSelectedMfgId: (value: string) => select('manufacturer', value),
    setSelectedDocId: (value: string | undefined) => select('document', value),
  };
}
