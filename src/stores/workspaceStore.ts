import { useState, useEffect } from 'react';
import { ResearchNote, ActivityItem } from '../types';
import { mockInitialNotes, mockInitialActivities, mockProducts, mockFormulations, mockManufacturers } from '../mocks/mockData';

interface WorkspaceState {
  savedBrands: {key:string;brandName:string;companyName:string}[];
  savedIngredients: { id: string; name: string; recordKind: string }[];
  savedProductIds: string[];
  savedFormulationIds: string[];
  bookmarkedManufacturerIds: string[];
  comparisonProductIds: string[];
  researchNotes: ResearchNote[];
  recentActivities: ActivityItem[];
  recentSearches: string[];
  theme: 'light' | 'dark';
}

const STORAGE_KEY = 'formulix_workspace_state_v2';

const getInitialState = (): WorkspaceState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.savedIngredients = Array.isArray(parsed.savedIngredients) ? parsed.savedIngredients : [];
      parsed.savedBrands = Array.isArray(parsed.savedBrands) ? parsed.savedBrands : [];
      const productIds = new Set(mockProducts.map(row => row.id));
      const formulationIds = new Set(mockFormulations.map(row => row.id));
      const manufacturerIds = new Set(mockManufacturers.map(row => row.id));
      parsed.savedProductIds = (parsed.savedProductIds ?? []).filter((id: string) => !productIds.has(id));
      parsed.comparisonProductIds = (parsed.comparisonProductIds ?? []).filter((id: string) => !productIds.has(id));
      parsed.savedFormulationIds = (parsed.savedFormulationIds ?? []).filter((id: string) => !formulationIds.has(id));
      parsed.bookmarkedManufacturerIds = (parsed.bookmarkedManufacturerIds ?? []).filter((id: string) => !manufacturerIds.has(id));
      parsed.researchNotes = (parsed.researchNotes ?? []).filter((note: ResearchNote) => !mockInitialNotes.some(seed => seed.id === note.id && seed.title === note.title && seed.content === note.content));
      parsed.recentActivities = (parsed.recentActivities ?? []).filter((activity: ActivityItem) => !mockInitialActivities.some(seed => seed.id === activity.id));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      return parsed;
    }
  } catch (e) {
    console.error('Failed to parse saved state', e);
  }
  return {
    savedIngredients: [],
    savedBrands: [],
    savedProductIds: [],
    savedFormulationIds: [],
    bookmarkedManufacturerIds: [],
    comparisonProductIds: [],
    researchNotes: [],
    recentActivities: [],
    recentSearches: [],
    theme: 'light',
  };
};

let globalState = getInitialState();

// Apply initial theme immediately to document
if (typeof document !== 'undefined') {
  if (globalState.theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

const listeners = new Set<() => void>();

function notify() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(globalState));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
  listeners.forEach((l) => l());
}

export function useWorkspaceStore() {
  const [state, setState] = useState<WorkspaceState>(globalState);

  useEffect(() => {
    const listener = () => setState({ ...globalState });
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // Sync theme with document element
  useEffect(() => {
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.theme]);

  const toggleSavedProduct = (productId: string, productName?: string) => {
    const exists = globalState.savedProductIds.includes(productId);
    const updated = exists
      ? globalState.savedProductIds.filter((id) => id !== productId)
      : [...globalState.savedProductIds, productId];

    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      action: exists ? 'Removed from saved products' : 'Saved product to workspace',
      targetType: 'Product',
      targetName: productName || productId,
      timestamp: 'Just now',
      targetId: productId,
    };

    globalState = {
      ...globalState,
      savedProductIds: updated,
      recentActivities: [newActivity, ...globalState.recentActivities.slice(0, 19)],
    };
    notify();
  };

  const toggleSavedIngredient = (record: WorkspaceState['savedIngredients'][number]) => {
    globalState = { ...globalState, savedIngredients: globalState.savedIngredients.some(row => row.id === record.id)
      ? globalState.savedIngredients.filter(row => row.id !== record.id) : [...globalState.savedIngredients, record] };
    notify();
  };
  const toggleSavedBrand = (record:WorkspaceState['savedBrands'][number]) => {
    globalState={...globalState,savedBrands:globalState.savedBrands.some(row=>row.key===record.key)
      ?globalState.savedBrands.filter(row=>row.key!==record.key):[...globalState.savedBrands,record]};
    notify();
  };

  const toggleSavedFormulation = (formulationId: string, formulationName?: string) => {
    const exists = globalState.savedFormulationIds.includes(formulationId);
    const updated = exists
      ? globalState.savedFormulationIds.filter((id) => id !== formulationId)
      : [...globalState.savedFormulationIds, formulationId];

    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      action: exists ? 'Removed from saved formulations' : 'Saved formulation recipe',
      targetType: 'Formulation',
      targetName: formulationName || formulationId,
      timestamp: 'Just now',
      targetId: formulationId,
    };

    globalState = {
      ...globalState,
      savedFormulationIds: updated,
      recentActivities: [newActivity, ...globalState.recentActivities.slice(0, 19)],
    };
    notify();
  };

  const toggleBookmarkedManufacturer = (manufacturerId: string, manufacturerName?: string) => {
    const exists = globalState.bookmarkedManufacturerIds.includes(manufacturerId);
    const updated = exists
      ? globalState.bookmarkedManufacturerIds.filter((id) => id !== manufacturerId)
      : [...globalState.bookmarkedManufacturerIds, manufacturerId];

    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      action: exists ? 'Unbookmarked manufacturer' : 'Bookmarked manufacturer profile',
      targetType: 'Manufacturer',
      targetName: manufacturerName || manufacturerId,
      timestamp: 'Just now',
      targetId: manufacturerId,
    };

    globalState = {
      ...globalState,
      bookmarkedManufacturerIds: updated,
      recentActivities: [newActivity, ...globalState.recentActivities.slice(0, 19)],
    };
    notify();
  };

  const toggleComparisonProduct = (productId: string, productName?: string): boolean => {
    const exists = globalState.comparisonProductIds.includes(productId);
    if (exists) {
      globalState = {
        ...globalState,
        comparisonProductIds: globalState.comparisonProductIds.filter((id) => id !== productId),
      };
      notify();
      return true;
    } else {
      if (globalState.comparisonProductIds.length >= 4) {
        return false; // Limit reached
      }
      const newActivity: ActivityItem = {
        id: `act-${Date.now()}`,
        action: 'Added product to comparison matrix',
        targetType: 'Product',
        targetName: productName || productId,
        timestamp: 'Just now',
        targetId: productId,
      };

      globalState = {
        ...globalState,
        comparisonProductIds: [...globalState.comparisonProductIds, productId],
        recentActivities: [newActivity, ...globalState.recentActivities.slice(0, 19)],
      };
      notify();
      return true;
    }
  };

  const clearComparison = () => {
    globalState = {
      ...globalState,
      comparisonProductIds: [],
    };
    notify();
  };

  const addNote = (title: string, content: string, category: string, tags: string[]) => {
    const newNote: ResearchNote = {
      id: `note-${Date.now()}`,
      title,
      content,
      category,
      tags,
      updatedAt: 'Just now',
    };
    globalState = {
      ...globalState,
      researchNotes: [newNote, ...globalState.researchNotes],
    };
    notify();
  };

  const updateNote = (id: string, title: string, content: string, tags: string[]) => {
    globalState = {
      ...globalState,
      researchNotes: globalState.researchNotes.map((n) =>
        n.id === id ? { ...n, title, content, tags, updatedAt: 'Just now' } : n
      ),
    };
    notify();
  };

  const deleteNote = (id: string) => {
    globalState = {
      ...globalState,
      researchNotes: globalState.researchNotes.filter((n) => n.id !== id),
    };
    notify();
  };

  const addRecentSearch = (query: string) => {
    if (!query.trim()) return;
    const clean = query.trim();
    const filtered = globalState.recentSearches.filter((s) => s.toLowerCase() !== clean.toLowerCase());
    globalState = {
      ...globalState,
      recentSearches: [clean, ...filtered.slice(0, 7)],
    };
    notify();
  };

  const clearRecentSearches = () => {
    globalState = {
      ...globalState,
      recentSearches: [],
    };
    notify();
  };

  const toggleTheme = () => {
    const newTheme = globalState.theme === 'dark' ? 'light' : 'dark';
    globalState = {
      ...globalState,
      theme: newTheme,
    };
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    notify();
  };

  const setTheme = (newTheme: 'light' | 'dark') => {
    globalState = {
      ...globalState,
      theme: newTheme,
    };
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    notify();
  };

  const recordActivity = (action: string, targetType: ActivityItem['targetType'], targetName: string, targetId?: string) => {
    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      action,
      targetType,
      targetName,
      timestamp: 'Just now',
      targetId,
    };
    globalState = {
      ...globalState,
      recentActivities: [newActivity, ...globalState.recentActivities.slice(0, 19)],
    };
    notify();
  };

  return {
    ...state,
    toggleSavedIngredient,
    toggleSavedBrand,
    toggleSavedProduct,
    toggleSavedFormulation,
    toggleBookmarkedManufacturer,
    toggleComparisonProduct,
    clearComparison,
    addNote,
    updateNote,
    deleteNote,
    addRecentSearch,
    clearRecentSearches,
    toggleTheme,
    setTheme,
    recordActivity,
  };
}
