import { useState, useEffect } from 'react';
import {
  CommercialProduct,
  Formulation,
  ChemicalIngredient,
  Manufacturer,
  RegulatoryRecord,
  TechnicalDocument,
} from '../types';
import { SharedRepository, AdminProductRecord, AdminFormulationRecord } from '../data/repositories/sharedRepository';
import { getApiFormulations, getDatabaseCatalog, refreshFormulationApi, subscribeFormulationApi } from './formulationApi';
import { searchedRecord } from './searchRecords';

function publishedFormulations(): Formulation[] {
  return getApiFormulations();
}

export interface ProductFilterParams {
  query?: string;
  category?: string;
  formulationType?: string;
  country?: string;
  manufacturer?: string;
  registrationStatus?: string;
  activeIngredient?: string;
  sortBy?: 'name' | 'manufacturer' | 'country' | 'verified' | 'type' | 'classification' | 'updated';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  includeUnpublished?: boolean;
}

export interface FormulationFilterParams {
  query?: string;
  category?: string;
  formulationType?: string;
  ingredientFunction?: string;
  patentQuery?: string;
  includeUnpublished?: boolean;
}

export const DataService = {
  // Executive Dashboard Aggregations (computed live from repository)
  getDashboardMetrics: () => {
    const publishedProducts = getDatabaseCatalog().products;
    const publishedFormulations = DataService.getFormulations();
    const ingredients = getDatabaseCatalog().ingredients;
    const manufacturers = getDatabaseCatalog().manufacturers;
    const registrations = getDatabaseCatalog().regulatoryRecords;

    const totalProducts = publishedProducts.length;
    const totalFormulations = publishedFormulations.length;
    const totalActiveIngredients = ingredients.length;
    const totalManufacturers = manufacturers.length;
    const totalRegistrations = registrations.length;
    const patentLinkedFormulations = publishedFormulations.filter(formulation => formulation.patentReferences.length > 0).length;
    const total = totalProducts || 1;
    const categoryDistribution = [...new Set(publishedProducts.map(row => row.category))].map(category => {
      const count = publishedProducts.filter(product => product.category === category).length;
      return { name: category, count, share: `${Math.round(count / total * 100)}%` };
    });
    const typeCounts = new Map<string, number>();
    publishedProducts.forEach(product => typeCounts.set(product.formulationType, (typeCounts.get(product.formulationType) ?? 0) + 1));
    const formulationTypeDistribution = Array.from(typeCounts, ([type, count]) => ({ type, count }));
    const jurisdictions = Array.from(new Set([...publishedProducts.map(product => product.country), ...registrations.map(record => record.country)]));
    const flags: Record<string, string> = { India: 'IN', 'United States': 'US', 'European Union': 'EU', 'United Kingdom': 'GB', Germany: 'DE', Brazil: 'BR' };
    const countryCoverage = jurisdictions.map(country => ({ country,
      products: publishedProducts.filter(product => product.country === country).length,
      registrations: registrations.filter(record => record.country === country).length,
      flag: flags[country] ?? country.slice(0, 2).toUpperCase(),
    }));
    const manufacturerDistribution = manufacturers.map(manufacturer => ({ id: manufacturer.id, name: manufacturer.name,
      country: manufacturer.country, productsCount: publishedProducts.filter(product => product.manufacturerId === manufacturer.id).length,
      categories: manufacturer.productCategories.join(', '),
    }));

    return {
      publicationCounts: Object.entries(getDatabaseCatalog().publicationCounts).map(([status, count]) => ({ status, count })),
      databaseCounts: getDatabaseCatalog().databaseCounts,
      kpis: {
        totalProducts,
        totalFormulations,
        totalActiveIngredients,
        totalManufacturers,
        totalRegistrations,
        patentLinkedFormulations,
      },
      categoryDistribution,
      formulationTypeDistribution,
      countryCoverage,
      manufacturerDistribution,
      recentUpdates: publishedProducts.slice(0, 5),
    };
  },

  // Products
  getProducts: (params: ProductFilterParams = {}) => {
    let list = [...getDatabaseCatalog().products];

    if (params.query) {
      const q = params.query.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.brandName.toLowerCase().includes(q) ||
          p.genericName.toLowerCase().includes(q) ||
          p.activeIngredient.toLowerCase().includes(q) ||
          p.casNumber.toLowerCase().includes(q) ||
          p.manufacturerName.toLowerCase().includes(q) ||
          p.registrationNumber.toLowerCase().includes(q)
      );
    }

    if (params.category && params.category !== 'All') {
      list = list.filter((p) => p.category === params.category);
    }

    if (params.formulationType && params.formulationType !== 'All') {
      list = list.filter((p) => p.formulationType.includes(params.formulationType!));
    }

    if (params.country && params.country !== 'All') {
      list = list.filter((p) => p.country === params.country);
    }

    if (params.registrationStatus && params.registrationStatus !== 'All') {
      list = list.filter((p) => p.registrationStatus === params.registrationStatus);
    }

    if (params.manufacturer && params.manufacturer !== 'All') {
      list = list.filter((p) => p.manufacturerName.toLowerCase().includes(params.manufacturer!.toLowerCase()));
    }

    if (params.activeIngredient && params.activeIngredient !== 'All') {
      list = list.filter((p) => p.activeIngredient.toLowerCase().includes(params.activeIngredient!.toLowerCase()));
    }

    // Sort
    if (params.sortBy) {
      list.sort((a, b) => {
        let fieldA = '';
        let fieldB = '';
        if (params.sortBy === 'name') {
          fieldA = a.brandName;
          fieldB = b.brandName;
        } else if (params.sortBy === 'manufacturer') {
          fieldA = a.manufacturerName;
          fieldB = b.manufacturerName;
        } else if (params.sortBy === 'country') {
          fieldA = a.country;
          fieldB = b.country;
        } else if (params.sortBy === 'verified') {
          fieldA = a.lastVerifiedDate;
          fieldB = b.lastVerifiedDate;
        }
        const cmp = fieldA.localeCompare(fieldB);
        return params.sortOrder === 'desc' ? -cmp : cmp;
      });
    }

    const total = list.length;
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    const startIndex = (page - 1) * pageSize;
    const paginated = list.slice(startIndex, startIndex + pageSize);

    return {
      items: paginated,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  },

  getProductById: (id: string): CommercialProduct | undefined => {
    return searchedRecord<CommercialProduct>('products', id) ?? getDatabaseCatalog().products.find(record => record.id === id);
  },

  // Formulations
  getFormulations: (params: FormulationFilterParams = {}) => {
    let list: Formulation[] = publishedFormulations();

    if (params.query) {
      const q = params.query.toLowerCase().trim();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.intendedApplication.toLowerCase().includes(q) ||
          f.targetIndustry.toLowerCase().includes(q) ||
          f.sourceReference.toLowerCase().includes(q) ||
          Object.values(f.marketData ?? {}).some(value => value.toLowerCase().includes(q)) ||
          f.composition.some((c) => c.ingredient.toLowerCase().includes(q) || c.cas.toLowerCase().includes(q))
      );
    }

    if (params.category && params.category !== 'All') {
      list = list.filter((f) => f.category === params.category);
    }

    if (params.formulationType && params.formulationType !== 'All') {
      list = list.filter((f) => f.formulationType.includes(params.formulationType!));
    }

    if (params.ingredientFunction && params.ingredientFunction !== 'All') {
      list = list.filter((f) =>
        f.composition.some((c) => c.chemicalFunction.toLowerCase().includes(params.ingredientFunction!.toLowerCase()))
      );
    }

    if (params.patentQuery) {
      const pq = params.patentQuery.toLowerCase().trim();
      list = list.filter((f) =>
        f.patentReferences.some((p) => p.patentNumber.toLowerCase().includes(pq) || p.title.toLowerCase().includes(pq)) ||
        (f.marketData?.['Patent Reference'] ?? '').toLowerCase().includes(pq)
      );
    }

    return list;
  },

  getFormulationById: (id: string): Formulation | undefined => {
    return searchedRecord<Formulation>('formulations', id) ?? getApiFormulations().find(record => record.id === id);
  },

  // Ingredients
  getActiveIngredientReferences: (query = '', category = 'All') => {
    const needle = query.trim().toLowerCase();
    return (getDatabaseCatalog().activeIngredientReferences ?? []).filter(row =>
      (!needle || row.sourceText.toLowerCase().includes(needle)) &&
      (category === 'All' || row.categories.includes(category)));
  },
  getIngredients: (query?: string, category?: string) => {
    let list = getDatabaseCatalog().ingredients;
    if (query) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.casNumber.toLowerCase().includes(q) ||
          i.iupacName.toLowerCase().includes(q) ||
          i.molecularFormula.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q)
      );
    }
    if (category && category !== 'All') {
      list = list.filter((i) => i.category.toLowerCase().includes(category.toLowerCase()));
    }
    return list;
  },

  getIngredientById: (id: string): ChemicalIngredient | undefined => {
    return searchedRecord<ChemicalIngredient>('ingredients', id) ?? getDatabaseCatalog().ingredients.find((i) => i.id === id || i.casNumber === id);
  },

  // Manufacturers
  getManufacturers: (query?: string, country?: string, category?: string) => {
    let list = getDatabaseCatalog().manufacturers;
    if (query) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.headquarters.toLowerCase().includes(q) ||
          m.brandPortfolio.some((b) => b.toLowerCase().includes(q))
      );
    }
    if (country && country !== 'All') {
      list = list.filter((m) => m.country === country);
    }
    if (category && category !== 'All') {
      list = list.filter((m) => m.productCategories.includes(category as any));
    }
    return list;
  },

  getManufacturerById: (id: string): Manufacturer | undefined => {
    const cached = searchedRecord<Manufacturer & {recordKind?: string}>('manufacturers', id);
    const snapshot = getDatabaseCatalog().manufacturers.find((m) => m.id === id);
    return cached?.recordKind === 'Source-reported company' ? snapshot ?? cached : cached ?? snapshot;
  },

  // Regulatory Records
  getRegulatoryRecords: (query?: string, country?: string, authority?: string) => {
    let list = getDatabaseCatalog().regulatoryRecords;
    if (query) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.registrationNumber.toLowerCase().includes(q) ||
          r.productName.toLowerCase().includes(q) ||
          r.activeIngredient.toLowerCase().includes(q) ||
          r.registrationHolder.toLowerCase().includes(q)
      );
    }
    if (country && country !== 'All') {
      list = list.filter((r) => r.country === country);
    }
    if (authority && authority !== 'All') {
      list = list.filter((r) => r.regulatoryAuthority.includes(authority));
    }
    return list;
  },

  // Technical Documents & Patents
  getDocuments: (query?: string, type?: string) => {
    let list = getDatabaseCatalog().documents;
    if (query) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.documentNumber.toLowerCase().includes(q) ||
          d.issuer.toLowerCase().includes(q) ||
          d.relatedProducts.some((p) => p.toLowerCase().includes(q)) ||
          d.relatedIngredients.some((i) => i.toLowerCase().includes(q))
      );
    }
    if (type && type !== 'All') {
      list = list.filter((d) => d.type === type);
    }
    return list;
  },

  // Global search across all domains
  globalSearch: (query: string) => {
    if (!query || query.trim().length < 2) {
      return {
        products: [],
        formulations: [],
        ingredients: [],
        manufacturers: [],
        regulatory: [],
        documents: [],
      };
    }
    const q = query.toLowerCase().trim();

    return {
      products: getDatabaseCatalog().products.filter(
        (p) =>
          p.brandName.toLowerCase().includes(q) ||
          p.genericName.toLowerCase().includes(q) ||
          p.activeIngredient.toLowerCase().includes(q) ||
          p.casNumber.toLowerCase().includes(q)
      ),
      formulations: publishedFormulations().filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.formulationType.toLowerCase().includes(q) ||
          Object.values(f.marketData ?? {}).some(value => value.toLowerCase().includes(q)) ||
          f.composition.some((c) => c.ingredient.toLowerCase().includes(q))
      ),
      ingredients: getDatabaseCatalog().ingredients.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.casNumber.toLowerCase().includes(q) ||
          i.molecularFormula.toLowerCase().includes(q)
      ),
      manufacturers: getDatabaseCatalog().manufacturers.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.brandPortfolio.some((b) => b.toLowerCase().includes(q))
      ),
      regulatory: getDatabaseCatalog().regulatoryRecords.filter(
        (r) =>
          r.registrationNumber.toLowerCase().includes(q) ||
          r.productName.toLowerCase().includes(q)
      ),
      documents: getDatabaseCatalog().documents.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.documentNumber.toLowerCase().includes(q)
      ),
    };
  },
};

/**
 * Hook to trigger reactive rerenders in any component when SharedRepository changes
 */
export function useSharedRepositoryListener() {
  const [revision, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = SharedRepository.subscribe(() => {
      setTick((t) => t + 1);
    });
    const unsubscribeApi = subscribeFormulationApi(() => setTick(t => t + 1));
    void refreshFormulationApi();
    const refresh = () => { void refreshFormulationApi(); };
    const refreshOnFocus = () => { void refreshFormulationApi(true); };
    const interval = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refreshOnFocus);
    return () => {
      unsubscribe();
      unsubscribeApi();
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, []);
  return revision;
}
