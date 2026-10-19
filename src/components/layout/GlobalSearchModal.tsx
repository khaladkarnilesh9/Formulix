import React, { useState, useEffect, useRef } from 'react';
import { useServerSearch } from '../../services/searchApi';
import { SearchStatus } from '../common/SearchStatus';
import { SearchHighlight } from '../common/SearchHighlight';
import type { CommercialProduct, Formulation, ChemicalIngredient, Manufacturer, RegulatoryRecord, TechnicalDocument } from '../../types';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useDialogFocus } from './MobileDrawer';
import {
  Search,
  X,
  Package,
  FlaskConical,
  Atom,
  Building2,
  FileCheck2,
  FileText,
  Clock,
  ArrowRight,
  CornerDownLeft,
} from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (module: string, itemId?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [fuzzy, setFuzzy] = useState(false);
  useEffect(() => { setPage(1); }, [query, fuzzy]);
  const search = useServerSearch<{group: string; record: unknown; count: number; matchMode?: string}>('all', { q: query, fuzzy }, page, 10, isOpen && query.trim().length >= 2);
  const records = <T,>(group: string) => search.results.filter(hit => hit.group === group).map(hit => hit.record as T);
  const countFor = (group: string) => search.results.find(hit => hit.group === group)?.count ?? 0;
  const results = { products: records<CommercialProduct>('products'), formulations: records<Formulation>('formulations'),
    ingredients: records<ChemicalIngredient>('ingredients'), manufacturers: records<Manufacturer>('manufacturers'),
    regulatory: records<RegulatoryRecord>('regulatory'), documents: records<TechnicalDocument>('documents') };
  const [activeCategory, setActiveCategory] = useState<'all' | 'products' | 'formulations' | 'ingredients' | 'manufacturers' | 'regulatory' | 'documents'>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus(isOpen, panelRef, onClose);
  const { recentSearches, addRecentSearch, clearRecentSearches } = useWorkspaceStore();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasResults =
    results.products.length > 0 ||
    results.formulations.length > 0 ||
    results.ingredients.length > 0 ||
    results.manufacturers.length > 0 ||
    results.regulatory.length > 0 ||
    search.results.length > 0;

  const handleSelect = (module: string, itemId: string, queryText?: string) => {
    if (queryText || query) {
      addRecentSearch(queryText || query);
    }
    onNavigate(module, itemId);
    onClose();
  };

  const handleQuickSuggestion = (item: string) => {
    setQuery(item);
  };

  return (
    <div onClick={event => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Search Formulix" onKeyDown={event => {
        const buttons = Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>('[data-search-results] button:not([disabled])') ?? []);
        const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
        if (['ArrowDown', 'ArrowUp'].includes(event.key) && buttons.length) {
          event.preventDefault(); buttons[(current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length].focus();
        } else if (event.key === 'Enter' && event.target === inputRef.current) {
          event.preventDefault(); if (buttons.length) buttons[0].click(); else search.refresh();
        }
      }} className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
          <input
            aria-label="Global search"
            ref={inputRef}
            type="text"
            placeholder="Search products, CAS numbers, active ingredients, formulations, patents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full py-4 text-sm bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
              ESC
            </kbd>
          )}
        </div>
        <button onClick={onClose} aria-label="Close search" title="Close search" className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-lg bg-white text-slate-500 dark:bg-slate-900 md:hidden"><X size={20} /></button>

        {/* Filter Categories */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-xs overflow-x-auto">
          {[
            { id: 'all', label: 'All Categories' },
            { id: 'products', label: 'Products' },
            { id: 'formulations', label: 'Formulations' },
            { id: 'ingredients', label: 'Active Ingredients' },
            { id: 'manufacturers', label: 'Manufacturers' },
            { id: 'regulatory', label: 'Regulatory' },
            { id: 'documents', label: 'Documents' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap font-medium text-xs ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Results Area */}
        <label className="flex items-center gap-2 px-4 py-2 text-xs text-slate-500"><input type="checkbox" checked={fuzzy} onChange={event => setFuzzy(event.target.checked)} />Spelling suggestions</label>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {query.trim().length >= 2 && <SearchStatus search={search} page={page} pageSize={10} onPage={setPage} />}
          {search.results.some(hit => hit.matchMode === 'fuzzy') && <p className="text-xs text-amber-700 dark:text-amber-400">Spelling Suggestions</p>}
          {!query.trim() ? (
            <div className="space-y-4">
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Recent Queries
                    </span>
                    <button
                      onClick={clearRecentSearches}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 normal-case font-normal"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleQuickSuggestion(s)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        <span>{s}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Recommended Explorations
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => handleQuickSuggestion('Chlorantraniliprole')}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-left hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="font-medium text-slate-900 dark:text-slate-100">Chlorantraniliprole SC</div>
                    <div className="text-slate-500">Agrochemical · CAS 500008-45-7</div>
                  </button>
                  <button
                    onClick={() => handleQuickSuggestion('Metformin ER')}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-left hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="font-medium text-slate-900 dark:text-slate-100">Metformin 500mg ER</div>
                    <div className="text-slate-500">Pharmaceutical · Hydrophilic Matrix</div>
                  </button>
                  <button
                    onClick={() => handleQuickSuggestion('Sodium Lauryl Sulfate')}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-left hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="font-medium text-slate-900 dark:text-slate-100">Sodium Lauryl Sulfate (SLS)</div>
                    <div className="text-slate-500">Industrial & Specialty Surfactant</div>
                  </button>
                  <button
                    onClick={() => handleQuickSuggestion('Imidacloprid 17.8%')}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-left hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="font-medium text-slate-900 dark:text-slate-100">Imidacloprid 17.8% SL</div>
                    <div className="text-slate-500">Agrochemical · FAO Spec 582/SL</div>
                  </button>
                </div>
              </div>
            </div>
          ) : search.loading || search.error ? null : !hasResults ? (
            <div className="py-12 text-center text-slate-500">
              <p className="text-sm font-medium">No matching intelligence records found for "{query}"</p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching by common chemical name, CAS number (e.g., 138261-41-3), or company name.
              </p>
            </div>
          ) : (
            <div className="space-y-4" data-search-results>
              {/* Products */}
              {search.results.filter(hit => ['brands', 'patents', 'activeIngredients', 'patentReferences'].includes(hit.group)).map((hit, index) => {
                const record = hit.record as { id?: string; key?: string; name?: string; brandName?: string; title?: string; publicationNumber?: string; sourceText?: string };
                const module = hit.group === 'activeIngredients' ? 'ingredients' : hit.group === 'patentReferences' ? 'formulations' : hit.group === 'brands' ? 'brand-intelligence' : 'patent-intelligence';
                if (activeCategory !== 'all' && !(activeCategory === 'ingredients' && hit.group === 'activeIngredients')) return null;
                return <div key={`${hit.group}:${record.id || record.key || record.sourceText || index}`}>
                  <p className="text-xs text-slate-500 mb-1">{hit.group === 'activeIngredients' ? 'Active ingredient source text' : hit.group === 'brands' ? 'Brand' : hit.group === 'patentReferences' ? 'Source-reported patent reference' : 'Patent'} ({hit.count})</p>
                  <button className="fx-button w-full justify-between text-left" onClick={() => handleSelect(module, hit.group === 'activeIngredients' ? `source:${record.sourceText || ''}` : hit.group === 'brands' ? record.brandName || '' : record.id || record.key || record.sourceText || '')}>
                    <span>{record.brandName || record.sourceText || record.title || record.name || record.publicationNumber}</span><ArrowRight size={14} />
                  </button>
                </div>;
              })}
              {(activeCategory === 'all' || activeCategory === 'products') && results.products.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    <Package className="w-3.5 h-3.5 text-blue-500" />
                    <span>Commercial Products ({countFor('products')})</span>
                  </div>
                  <div className="space-y-1">
                    {results.products.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelect('products', p.id, p.brandName)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            <SearchHighlight text={p.brandName} query={query} />
                          </div>
                          <div className="text-xs text-slate-500">
                            {p.activeIngredient} · {p.formulationType} · {p.manufacturerName}
                          </div>
                        </div>
                        <span className="text-xs font-mono text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-1">
                          View Spec <CornerDownLeft className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulations */}
              {(activeCategory === 'all' || activeCategory === 'formulations') && results.formulations.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    <FlaskConical className="w-3.5 h-3.5 text-purple-500" />
                    <span>Formulation Recipes ({countFor('formulations')})</span>
                  </div>
                  <div className="space-y-1">
                    {results.formulations.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => handleSelect('formulations', f.id, f.name)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                            <SearchHighlight text={f.name} query={query} />
                          </div>
                          <div className="text-xs text-slate-500">
                            {f.category} · {f.formulationType} · {f.properties.stability.slice(0, 50)}...
                          </div>
                        </div>
                        <span className="text-xs font-mono text-slate-400 group-hover:text-purple-600 flex items-center gap-1">
                          Recipe <CornerDownLeft className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Ingredients */}
              {(activeCategory === 'all' || activeCategory === 'ingredients') && results.ingredients.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    <Atom className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Chemical Active Substances ({countFor('ingredients')})</span>
                  </div>
                  <div className="space-y-1">
                    {results.ingredients.map((ing) => (
                      <button
                        key={ing.id}
                        onClick={() => handleSelect('ingredients', ing.id, ing.name)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                            {ing.name} <span className="font-mono text-xs text-slate-500">({ing.casNumber})</span>
                          </div>
                          <div className="text-xs text-slate-500">
                            Formula: {ing.molecularFormula} · MW: {ing.molecularWeight} g/mol
                          </div>
                        </div>
                        <span className="text-xs font-mono text-slate-400 group-hover:text-emerald-600 flex items-center gap-1">
                          Chemical Entity <CornerDownLeft className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Manufacturers */}
              {(activeCategory === 'all' || activeCategory === 'manufacturers') && results.manufacturers.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    <Building2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>Manufacturers & Formulators ({countFor('manufacturers')})</span>
                  </div>
                  <div className="space-y-1">
                    {results.manufacturers.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleSelect('manufacturers', m.id, m.name)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                            <SearchHighlight text={m.name} query={query} />
                          </div>
                          <div className="text-xs text-slate-500">
                            {m.country} · {m.productCategories.join(', ')} · Brands: {m.brandPortfolio.slice(0, 3).join(', ')}
                          </div>
                        </div>
                        <span className="text-xs font-mono text-slate-400 group-hover:text-amber-600 flex items-center gap-1">
                          Directory <CornerDownLeft className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Regulatory */}
              {(activeCategory === 'all' || activeCategory === 'regulatory') && results.regulatory.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    <FileCheck2 className="w-3.5 h-3.5 text-sky-500" />
                    <span>Regulatory Dossiers ({countFor('regulatory')})</span>
                  </div>
                  <div className="space-y-1">
                    {results.regulatory.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleSelect('regulatory', r.id, r.productName)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400">
                            {r.productName} — {r.registrationNumber}
                          </div>
                          <div className="text-xs text-slate-500">
                            {r.regulatoryAuthority} ({r.country}) · Holder: {r.registrationHolder}
                          </div>
                        </div>
                        <span className="text-xs font-mono text-slate-400 group-hover:text-sky-600 flex items-center gap-1">
                          Registry <CornerDownLeft className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents & Patents */}
              {(activeCategory === 'all' || activeCategory === 'documents') && results.documents.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    <FileText className="w-3.5 h-3.5 text-rose-500" />
                    <span>Technical Documents & Patents ({countFor('documents')})</span>
                  </div>
                  <div className="space-y-1">
                    {results.documents.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => handleSelect('technical-documents', d.id, d.title)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-rose-600 dark:group-hover:text-rose-400">
                            <SearchHighlight text={d.title} query={query} />
                          </div>
                          <div className="text-xs text-slate-500">
                            {d.type} · {d.documentNumber} · {d.issuer}
                          </div>
                        </div>
                        <span className="text-xs font-mono text-slate-400 group-hover:text-rose-600 flex items-center gap-1">
                          Dossier <CornerDownLeft className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              Navigation: <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded">↑</kbd>{' '}
              <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded">↓</kbd>
            </span>
            <span>
              Select: <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded">↵</kbd>
            </span>
          </div>
          <div className="font-mono">Global Index: 1,400+ Formulations & Products</div>
        </div>
      </div>
    </div>
  );
};
