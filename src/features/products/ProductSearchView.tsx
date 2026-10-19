import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSearch, useSearchFacets, useServerSearch } from '../../services/searchApi';
import { SearchStatus } from '../../components/common/SearchStatus';
import { DataService, ProductFilterParams, useSharedRepositoryListener } from '../../services/dataService';
import { CommercialProduct } from '../../types';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { EvidenceBadge, StatusIndicator } from '../../components/common/EvidenceBadge';
import { useSessionState } from '../../stores/useSessionState';
import { RecordDialog } from '../../components/common/IntelligenceUI';
import { ProductActions, ProductHero, ProductThumbnail, productSourceTitle } from './ProductVisuals';
import { searchEpoch } from '../../services/searchRecords';
import { CatalogMetrics } from '../../components/common/CatalogMetrics';
import { useToast } from '../../components/common/Toast';
import {
  Search,
  Filter,
  LayoutGrid,
  List,
  Scale,
  Bookmark,
  Download,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RotateCcw,
  SlidersHorizontal,
  Check,
  Building2,
  Globe2,
  Calendar,
  Layers,
  Sparkles,
  X,
  PackageSearch,
  Leaf,
  FlaskConical,
  ShieldCheck,
} from 'lucide-react';

interface ProductSearchViewProps {
  onSelectProduct: (productId: string) => void;
  onNavigateComparison: () => void;
  initialQuery?: string;
}

export const ProductSearchView: React.FC<ProductSearchViewProps> = ({
  onSelectProduct,
  onNavigateComparison,
  initialQuery = '',
}) => {
  const catalogRevision = useSharedRepositoryListener();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    savedProductIds,
    toggleSavedProduct,
    comparisonProductIds,
    toggleComparisonProduct,
  } = useWorkspaceStore();

  const [searchQuery, setSearchQuery] = useSessionState('products:searchQuery', initialQuery);
  const [selectedCategory, setSelectedCategory] = useSessionState<string>('products:selectedCategory', 'All');
  const [selectedFormulationType, setSelectedFormulationType] = useSessionState<string>('products:selectedFormulationType', 'All');
  const [selectedCountry, setSelectedCountry] = useSessionState<string>('products:selectedCountry', 'All');
  const [selectedStatus, setSelectedStatus] = useSessionState<string>('products:selectedStatus', 'All');
  const [selectedManufacturer, setSelectedManufacturer] = useSessionState<string>('products:selectedManufacturer', 'All');
  const [sortBy, setSortBy] = useSessionState<ProductFilterParams['sortBy']>('products:sortBy', 'name');
  const [sortOrder, setSortOrder] = useSessionState<'asc' | 'desc'>('products:sortOrder', 'asc');
  const [viewMode, setViewMode] = useSessionState<'grid' | 'table'>('products:viewMode', 'table');
  const [currentPage, setCurrentPage] = useSessionState('products:currentPage', 1);
  const showFilterSidebar = false;
  const [exporting, setExporting] = useState(false);

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const activeFilters = [
    { label: 'Sector', value: selectedCategory, clear: () => setSelectedCategory('All') },
    { label: 'Type', value: selectedFormulationType, clear: () => setSelectedFormulationType('All') },
    { label: 'Jurisdiction', value: selectedCountry, clear: () => setSelectedCountry('All') },
    { label: 'Status', value: selectedStatus, clear: () => setSelectedStatus('All') },
    { label: 'Manufacturer', value: selectedManufacturer, clear: () => setSelectedManufacturer('All') },
  ].filter(filter => filter.value !== 'All');
  const pageSize = 8;

  const searchParams = {
      q: searchQuery,
      category: selectedCategory,
      formulationType: selectedFormulationType,
      country: selectedCountry,
      registrationStatus: selectedStatus,
      manufacturer: selectedManufacturer,
      sortBy,
      sortOrder,
  };
  const search = useServerSearch<CommercialProduct>('products', searchParams, currentPage, pageSize);
  const facets = useSearchFacets();
  const result = { items: search.results, total: search.count, page: currentPage, pageSize, totalPages: Math.max(1, Math.ceil(search.count / pageSize)) };
  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedCategory, selectedFormulationType, selectedCountry, selectedStatus, selectedManufacturer, sortBy, sortOrder]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedFormulationType('All');
    setSelectedCountry('All');
    setSelectedStatus('All');
    setSelectedManufacturer('All');
    setCurrentPage(1);
    toast('Filters reset to default view');
  };

  const handleToggleComparison = (product: CommercialProduct) => {
    const success = toggleComparisonProduct(product.id, product.brandName);
    if (!success) {
      toast('Maximum 4 products can be compared simultaneously', 'warning');
    } else {
      const isNowIn = !comparisonProductIds.includes(product.id);
      toast(
        isNowIn
          ? `Added "${product.brandName}" to comparison`
          : `Removed "${product.brandName}" from comparison`
      );
    }
  };

  const handleToggleBookmark = (product: CommercialProduct) => {
    toggleSavedProduct(product.id, product.brandName);
    const isSaved = savedProductIds.includes(product.id);
    toast(
      isSaved
        ? `Removed "${product.brandName}" from saved items`
        : `Saved "${product.brandName}" to your workspace`
    );
  };

  const handleExportCSV = async () => {
    if (exporting) return;
    setExporting(true);
    const epoch = searchEpoch();
    const allMatching: CommercialProduct[] = [];
    try {
      for (let page = 1; ; page++) {
        const batch = await fetchSearch<CommercialProduct>({ ...searchParams, group: 'products', page, page_size: 100 });
        if (searchEpoch() !== epoch) throw new Error('Catalog access changed. Restart the export.');
        allMatching.push(...batch.results);
        if (!batch.next) break;
      }
    } catch (error) { setExporting(false); toast(error instanceof Error ? error.message : 'Export failed', 'warning'); return; }
    setExporting(false);

    const headers = [
      'Brand Name',
      'Generic Name',
      'Active Ingredient',
      'CAS Number',
      'Formulation Type',
      'Strength',
      'Manufacturer',
      'Country',
      'Registration Status',
      'Registration Number',
      'Last Verified',
    ];

    const quote = (value: unknown) => {
      const text = String(value ?? '');
      return `"${(/^[=+@\-\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
    };
    const rows = allMatching.map(p => [p.brandName, p.genericName, p.activeIngredient, p.casNumber,
      p.formulationType, p.strength, p.manufacturerName, p.country, p.registrationStatus,
      p.registrationNumber, p.lastVerifiedDate].map(quote));

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formulix_products_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${allMatching.length} products to CSV`);
  };

  const filterPanel = (
    <div className="fx-product-filter-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-5 lg:sticky lg:top-20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <Filter className="w-3.5 h-3.5 text-blue-500" />
                <span>Refine Search</span>
              </div>
              <button
                onClick={handleResetFilters}
                className="text-[11px] text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Product Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                <Leaf size={15} className="text-emerald-600" />Industry Sector
              </label>
              <select
                aria-label="Industry Sector"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden"
              >
                <option value="All">All Sectors</option>
                <option value="Agrochemical">Agrochemicals</option>
                <option value="Pharmaceutical">Pharmaceuticals</option>
                <option value="Industrial">Industrial Chemicals</option>
              </select>
            </div>

            {/* Formulation Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                <FlaskConical size={15} className="text-violet-600" />Formulation Type
              </label>
              <select
                aria-label="Formulation Type"
                value={selectedFormulationType}
                onChange={(e) => {
                  setSelectedFormulationType(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden"
              >
                <option value="All">All Form Types</option>
                <option value="SC">SC — Suspension Concentrate</option>
                <option value="SL">SL — Soluble Liquid</option>
                <option value="WG">WG / WDG — Water Dispersible Granules</option>
                <option value="EC">EC — Emulsifiable Concentrate</option>
                <option value="Tablet">Tablets (Oral Solid)</option>
                <option value="Controlled-release">Controlled-release Matrix</option>
                <option value="Capsule">Capsules & Pellets</option>
                <option value="Coating">Polymer Coatings & Latexes</option>
                <option value="Surfactant">Surfactant Blends & Concentrates</option>
              </select>
            </div>

            <details open className="fx-advanced-filters">
              <summary className="cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">Advanced filters</summary>
              <div className="space-y-4 mt-4">
            {/* Country Jurisdiction */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                <Globe2 size={15} className="text-blue-600" />Jurisdiction
              </label>
              <select
                aria-label="Jurisdiction"
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden"
              >
                <option value="All">All Countries</option>
                {(facets?.countries ?? []).map(country => <option key={country} value={country}>{country}</option>)}
              </select>
            </div>

            {/* Registration Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                <ShieldCheck size={15} className="text-emerald-600" />Registration Status
              </label>
              <select
                aria-label="Registration Status"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden"
              >
                <option value="All">All Statuses</option>
                <option value="Unverified">Unverified source reference</option>
                <option value="Approved">Approved</option>
                <option value="Active">Active Registration</option>
                <option value="Under Review">Under Review</option>
                <option value="Conditional">Conditional Approval</option>
              </select>
            </div>

            {/* Manufacturer filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                <Building2 size={15} className="text-orange-600" />Manufacturer / Registrant
              </label>
              <select
                aria-label="Manufacturer / Registrant"
                value={selectedManufacturer}
                onChange={(e) => {
                  setSelectedManufacturer(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden"
              >
                <option value="All">All Manufacturers</option>
                {(facets?.manufacturers ?? []).map(company => <option key={company} value={company}>{company}</option>)}
              </select>
            </div>

              </div>
            </details>

            {/* Comparison Quick Status */}
            {comparisonProductIds.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600 dark:text-slate-400">Comparing</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                    {comparisonProductIds.length}/4
                  </span>
                </div>
                <button
                  onClick={onNavigateComparison}
                  className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Launch Matrix Comparison</span>
                </button>
              </div>
            )}
          </div>
  );

  return (
    <div className="fx-page pc-page">
      <ProductHero count={result.total} loading={search.loading} />
      <div className="pc-content">
      {(search.loading || search.error) && <SearchStatus search={search} />}
      <div className="fx-product-metrics-group">
        <CatalogMetrics compact />
        <p className="text-xs text-slate-500">Database product and formulation listings. Spreadsheet registration claims are unverified.</p>
      </div>
      <div className="fx-product-controls">
      <div className="fx-sector-tabs" role="group" aria-label="Product industry sector">
        {['All', 'Agrochemical', 'Pharmaceutical', 'Industrial'].map(category => <button key={category} type="button"
          aria-pressed={selectedCategory === category} onClick={() => { setSelectedCategory(category); setCurrentPage(1); }}>
          {category === 'All' ? <PackageSearch size={15} /> : category === 'Agrochemical' ? <Leaf size={15} /> : category === 'Pharmaceutical' ? <FlaskConical size={15} /> : <Building2 size={15} />}
          {category === 'All' ? 'All Products' : category}<span>{(facets?.categoryCounts[category] ?? 0).toLocaleString()}</span>
        </button>)}
      </div>
      {/* Search Header Bar */}
      <div className="fx-filter-toolbar flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            aria-label="Search products"
            placeholder="Search by brand name, active ingredient, CAS number, or registration..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-12 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
          />
          {searchQuery && <button type="button" aria-label="Clear product search" title="Clear search" onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className="absolute right-1 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded text-slate-500 bg-slate-50 dark:bg-slate-950"><X size={15} /></button>}
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Filter Sidebar Button */}
          <button
            onClick={() => {
              setMobileFiltersOpen(true);
            }}
            aria-label="Filters"
            aria-haspopup="dialog"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
              showFilterSidebar
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters{activeFilters.length > 0 ? ` (${activeFilters.length})` : ''}</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-950">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Table Grid View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={exporting} aria-busy={exporting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      </div>

      {activeFilters.length > 0 && <div className="fx-filter-chips" aria-label="Active product filters">{activeFilters.map(filter => <button key={filter.label} onClick={() => { filter.clear(); setCurrentPage(1); }} title={`Remove ${filter.label.toLowerCase()} filter`}><span>{filter.label}: {filter.value}</span><X size={13} /></button>)}<button onClick={handleResetFilters}>Reset all</button></div>}

      {/* Main Layout: Filters Sidebar + Results View */}
      <div className="pc-results-layout">
        {/* Advanced Filters Sidebar */}
        {showFilterSidebar && <div className="hidden md:block">{filterPanel}</div>}
        <RecordDialog open={mobileFiltersOpen} onClose={() => setMobileFiltersOpen(false)} title="Product filters">
          {filterPanel}<button className="fx-button fx-button-primary pc-apply" onClick={() => setMobileFiltersOpen(false)}>Apply Filters</button>
        </RecordDialog>

        {/* Results Container */}
        <div className={showFilterSidebar ? 'min-w-0 md:col-start-2 lg:col-span-3 space-y-4' : 'min-w-0 col-span-1 md:col-span-2 lg:col-span-4 space-y-4'}>
          {/* Results Summary Bar */}
          <div className="pc-sort-bar flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            <div>
              Showing <span className="font-mono font-semibold text-slate-900 dark:text-white">{result.items.length}</span> of{' '}
              <span className="font-mono font-semibold text-slate-900 dark:text-white">{result.total}</span> commercial formulations
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Sort by:</span>
              <select
                aria-label="Sort products"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-800 dark:text-slate-200 font-medium text-xs focus:outline-hidden"
              >
                <option value="name">Brand Name</option>
                <option value="manufacturer">Manufacturer</option>
                <option value="country">Jurisdiction</option>
                <option value="verified">Last Verified</option>
                <option value="type">Formulation Type</option>
                <option value="classification">Classification</option>
                <option value="updated">Last Updated</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400"
                title={`Toggle Sort Order (${sortOrder.toUpperCase()})`}
              >
                <ArrowUpDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {!search.loading && !search.error && result.items.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <Sparkles className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                No commercial products match your filters
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Try widening your search terms or clicking reset to restore full catalog view.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-4 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          ) : viewMode === 'table' ? (
            /* Detailed Data Table View */
            <div className="pc-table rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="mobile-product-results fx-data-table w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-950/50 text-slate-400 font-medium uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3 text-center w-10">Comp</th>
                      <th className="py-3 px-3">Brand & Category</th>
                      <th className="py-3 px-3">Active Ingredient & CAS</th>
                      <th className="py-3 px-3">Formulation & Strength</th>
                      <th className="py-3 px-3">Manufacturer</th>
                      <th className="py-3 px-3">Jurisdiction</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="fx-product-actions py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {result.items.map((prod) => {
                      const isCompared = comparisonProductIds.includes(prod.id);
                      const isSaved = savedProductIds.includes(prod.id);

                      return (
                        <tr
                          key={prod.id}
                          tabIndex={0}
                          aria-label={`Open ${prod.brandName}`}
                          onKeyDown={event => { if (event.target === event.currentTarget && event.key === 'Enter') onSelectProduct(prod.id); }}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer ${isCompared ? 'fx-row-selected' : ''}`}
                          onClick={() => onSelectProduct(prod.id)}
                        >
                          {/* Checkbox for comparison */}
                          <td data-label="Compare"
                            className="py-3 px-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              aria-label={`Compare ${prod.brandName}`}
                              type="checkbox"
                              checked={isCompared}
                              onChange={() => handleToggleComparison(prod)}
                              className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                              title="Select for comparison"
                            />
                          </td>

                          {/* Brand & Category */}
                          <td data-label="Product" className="py-3 px-3">
                            <div className="fx-product-identity"><ProductThumbnail product={prod}/><div>
                            <div className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {prod.brandName}
                            </div>
                            {prod.publishStatus && <div className="text-[11px] text-slate-500">{prod.publishStatus} / {prod.recordKind || 'Commercial product'}</div>}
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                              <span>{prod.category}</span>
                              <span aria-hidden="true">·</span>
                              <span className="pc-source text-slate-400" title={prod.dataSource}>{productSourceTitle(prod)}</span>
                            </div>
                            </div></div>
                          </td>

                          {/* Active Ingredient */}
                          <td data-label="Active ingredient / CAS" className="py-3 px-3">
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                              {prod.activeIngredient}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">
                              {prod.casNumber ? `CAS ${prod.casNumber}` : 'CAS not recorded'}
                            </div>
                          </td>

                          {/* Formulation Type & Strength */}
                          <td data-label="Formulation / strength" className="py-3 px-3">
                            <div className="text-slate-800 dark:text-slate-200">
                              {prod.formulationType}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {prod.strength}
                            </div>
                          </td>

                          {/* Manufacturer */}
                          <td data-label="Manufacturer" className="py-3 px-3 text-slate-600 dark:text-slate-300">
                            {prod.manufacturerId ? <button onClick={event => { event.stopPropagation(); navigate(`/manufacturers?manufacturer=${encodeURIComponent(prod.manufacturerId)}`); }}>{prod.manufacturerName}</button> : prod.manufacturerName}
                          </td>

                          {/* Country */}
                          <td data-label="Jurisdiction / registration" className="py-3 px-3">
                            <div className="text-slate-800 dark:text-slate-200 font-medium">
                              {prod.country}
                            </div>
                            <div className="text-[10px] text-slate-400 pc-registration">
                              {prod.registrationNumber}
                            </div>
                          </td>

                          {/* Registration Status */}
                          <td data-label="Status" className="py-3 px-3">
                            <span className="pc-status" data-status={prod.registrationStatus} title="Recorded registration status; publication and independent evidence verification are separate"><StatusIndicator status={prod.registrationStatus} /></span>
                          </td>

                          {/* Actions */}
                          <td data-label="Actions"
                            className="fx-product-actions py-3 px-3 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleToggleBookmark(prod)}
                                aria-label={`Save ${prod.brandName}`} aria-pressed={isSaved}
                                className={`p-1.5 rounded-md transition-colors ${
                                  isSaved
                                    ? 'text-purple-600 bg-purple-50 dark:bg-purple-950/50'
                                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                title={isSaved ? 'Remove from Saved' : 'Save to Workspace'}
                              >
                                <Bookmark className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onSelectProduct(prod.id)}
                                className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900 transition-colors"
                              >
                                Spec Sheet
                              </button>
                              <ProductActions product={prod} compared={isCompared} onOpen={() => onSelectProduct(prod.id)} onCompare={() => handleToggleComparison(prod)}
                                onManufacturer={() => navigate(`/manufacturers?manufacturer=${encodeURIComponent(prod.manufacturerId)}`)}
                                onCopy={async () => { try { await navigator.clipboard.writeText(`${location.origin}/products/detail?product=${encodeURIComponent(prod.id)}`); toast('Record link copied'); } catch { toast('Clipboard access is unavailable', 'warning'); } }}/>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Card Grid View */
            <div className="pc-grid grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.items.map((prod) => {
                const isCompared = comparisonProductIds.includes(prod.id);
                const isSaved = savedProductIds.includes(prod.id);

                return (
                  <div
                    key={prod.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-blue-500/50 transition-colors flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <ProductThumbnail product={prod}/>
                      {/* Top metadata row */}
                      <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-1.5">
                          <span>{prod.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{prod.country}</span>
                        </div>
                        <StatusIndicator status={prod.registrationStatus} />
                      </div>

                      {/* Title & Active Info */}
                      <div className="pt-3">
                        <h4
                          className="text-base font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                        >
                          <button className="text-left" onClick={() => onSelectProduct(prod.id)}>{prod.brandName}</button>
                        </h4>
                        <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                          {prod.genericName}
                        </div>
                        <div className="text-xs font-mono text-slate-400 mt-1">
                          {prod.casNumber ? `CAS ${prod.casNumber}` : 'CAS not recorded'} · {prod.strength}
                        </div>
                      </div>

                      {/* Brief description */}
                      <div className="mt-2 text-xs text-slate-700 dark:text-slate-300"><strong>{prod.activeIngredient}</strong><span className="block text-slate-500">{prod.formulationType}</span></div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                        {prod.description}
                      </p>

                      {/* Manufacturer */}
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">{prod.manufacturerId ? <button onClick={() => navigate(`/manufacturers?manufacturer=${encodeURIComponent(prod.manufacturerId)}`)}>{prod.manufacturerName}</button> : prod.manufacturerName}</span>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-xs"><input type="checkbox" aria-label={`Compare ${prod.brandName}`} checked={isCompared} onChange={() => handleToggleComparison(prod)}/><span>Compare</span></label>

                        <button
                          onClick={() => handleToggleBookmark(prod)}
                          className={`p-1.5 rounded-md border transition-colors ${
                            isSaved
                              ? 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/50 dark:border-purple-800'
                              : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title="Bookmark Product"
                          aria-label={`Save ${prod.brandName}`} aria-pressed={isSaved}
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => onSelectProduct(prod.id)}
                        className="px-3 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900 transition-colors"
                      >
                        Specification
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {result.totalPages > 1 && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
              <span className="text-slate-500">
                Page <span className="font-mono font-medium text-slate-900 dark:text-white">{result.page}</span> of{' '}
                <span className="font-mono font-medium text-slate-900 dark:text-white">{result.totalPages}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={result.page <= 1}
                  aria-label="Previous product page" title="Previous product page"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={result.page >= result.totalPages}
                  aria-label="Next product page" title="Next product page"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, result.totalPages))}
                  className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
