import { useEffect, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Search, ShieldAlert } from 'lucide-react';
import { DataService } from '../../services/dataService';
import { useServerSearch } from '../../services/searchApi';
import { SearchStatus } from '../../components/common/SearchStatus';
import type { CommercialProduct } from '../../types';
import { EmptyState, MetadataGrid } from '../../components/common/IntelligenceUI';

export function ActiveIngredientSources({ query, category, onQueryChange, onSelectProduct, onCountChange }: {
  query: string; category: string; onQueryChange: (value: string) => void; onSelectProduct: (id: string) => void;
  onCountChange?: (count: number) => void;
}) {
  const [selectedId, setSelectedId] = useState('');
  const [page, setPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  useEffect(() => { setPage(1); setProductPage(1); }, [query, category]);
  useEffect(() => { setProductPage(1); }, [selectedId]);
  const search = useServerSearch<{sourceText: string; productCount: number; recordKind: string; verificationStatus: string}>('activeIngredients', { q: query, category }, page, 50);
  useEffect(() => { onCountChange?.(search.count); }, [search.count, onCountChange]);
  const references = search.results.map(row => ({ ...row, id: row.sourceText }));
  const pages = Math.max(1, Math.ceil(search.count / 50));
  const current = page;
  const visible = references;
  const active = references.find(row => row.id === selectedId) ?? visible[0];
  const listingSearch = useServerSearch<CommercialProduct>('products', { sourceExact: active?.sourceText, category }, productPage, 20, !!active);
  const products = listingSearch.results;
  const productPages = Math.max(1, Math.ceil(listingSearch.count / 20));
  const currentProductPage = productPage;
  const markets = [...new Set(products.map(row => row.country))];
  return <>
    <label className="relative block max-w-2xl">
      <span className="sr-only">Search active ingredients</span><Search size={16} className="absolute left-3 top-3 text-slate-400" />
      <input type="search" value={query} onChange={event => onQueryChange(event.target.value)} placeholder="Search active ingredient names, mixtures, or source concentrations" className="w-full border rounded-md bg-transparent pl-9 pr-3 py-2 text-sm" />
    </label>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <section className="lg:col-span-5 space-y-3" aria-label="Active ingredient search results">
        <SearchStatus search={search} />
        {!search.loading && !search.error && !references.length && <EmptyState title="No matching active ingredient records" />}
        {visible.map(row => <button key={row.id} onClick={() => setSelectedId(row.id)} aria-pressed={row.id === active?.id}
          className={`block w-full text-left border rounded-md p-3 space-y-2 ${row.id === active?.id ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-800'}`}>
          <span className="block text-sm font-semibold break-words">{row.sourceText}</span>
          <span className="block text-xs text-slate-500">{row.productCount} matching listings</span>
          <span className="block text-xs text-amber-700 dark:text-amber-400">{row.verificationStatus}</span>
        </button>)}
        {pages > 1 && <nav aria-label="Active ingredient pagination" className="flex items-center justify-between text-xs">
          <button aria-label="Previous active ingredient page" title="Previous page" disabled={current === 1} onClick={() => setPage(current - 1)} className="p-2 disabled:opacity-40"><ChevronLeft size={17} /></button>
          <span>{current} / {pages}</span>
          <button aria-label="Next active ingredient page" title="Next page" disabled={current === pages} onClick={() => setPage(current + 1)} className="p-2 disabled:opacity-40"><ChevronRight size={17} /></button>
        </nav>}
      </section>
      {active && <section className="lg:col-span-7 space-y-4" aria-label="Active ingredient source details">
        <h3 className="text-lg font-semibold break-words">{active.sourceText}</h3>
        <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400"><ShieldAlert size={16} className="shrink-0" />Exact source text, not a verified chemical identity. Mixtures, percentages and salts have not been normalized.</p>
        <MetadataGrid items={[{ label: 'Record type', value: active.recordKind }, { label: 'Evidence', value: active.verificationStatus },
          { label: 'Markets on this page', value: markets.join(', ') }, { label: 'Molecular identity / structure', value: 'Not recorded' }]} />
        <h4 className="text-sm font-semibold">Formulations Containing This Active Ingredient Text</h4>
        <SearchStatus search={listingSearch} />
        <div className="overflow-x-auto"><table className="fx-data-table"><thead><tr><th>Brand / formulation</th><th>Company</th><th>Market</th><th>Source status</th></tr></thead>
          <tbody>{products.map(product => <tr key={product.id}>
            <td><button onClick={() => onSelectProduct(product.id)} className="flex items-center gap-1 text-left font-semibold text-blue-600"><span>{product.brandName}</span><ArrowUpRight size={14} className="shrink-0" /></button></td>
            <td>{product.manufacturerName || 'Not recorded'}</td><td>{product.country}</td><td>{product.publishStatus || 'Not recorded'}</td>
          </tr>)}</tbody></table></div>
        {productPages > 1 && <nav aria-label="Linked formulation pagination" className="flex items-center justify-between text-xs">
          <button aria-label="Previous linked formulation page" title="Previous page" disabled={currentProductPage === 1} onClick={() => setProductPage(currentProductPage - 1)} className="p-2 disabled:opacity-40"><ChevronLeft size={17} /></button>
          <span>{currentProductPage} / {productPages}</span>
          <button aria-label="Next linked formulation page" title="Next page" disabled={currentProductPage === productPages} onClick={() => setProductPage(currentProductPage + 1)} className="p-2 disabled:opacity-40"><ChevronRight size={17} /></button>
        </nav>}
      </section>}
    </div>
  </>;
}
