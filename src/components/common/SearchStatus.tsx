import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

export function SearchStatus({ search, page = 1, pageSize = 50, onPage }: {
  search: { loading: boolean; error: string; count: number; totalPages?: number; refresh: () => void };
  page?: number; pageSize?: number; onPage?: (page: number) => void;
}) {
  if (search.loading) return <p role="status" className="text-xs text-slate-500">Searching database...</p>;
  if (search.error) return <div role="alert" className="flex items-center gap-3 text-sm text-red-600"><span>{search.error}</span><button className="fx-button" onClick={search.refresh} title="Retry search" aria-label="Retry search"><RotateCcw size={15} /></button></div>;
  return <div role="status" className="flex items-center justify-between text-xs text-slate-500">
    <span>{search.count.toLocaleString()} matching records</span>
    {onPage && (search.totalPages ?? Math.ceil(search.count / pageSize)) > 1 && <nav aria-label="Search pagination" className="flex items-center gap-3">
      <button className="fx-button" title="Previous search page" aria-label="Previous search page" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={15} /></button>
      <span>{page} / {search.totalPages ?? Math.max(1, Math.ceil(search.count / pageSize))}</span>
      <button className="fx-button" title="Next search page" aria-label="Next search page" disabled={page >= (search.totalPages ?? Math.ceil(search.count / pageSize))} onClick={() => onPage(page + 1)}><ChevronRight size={15} /></button>
    </nav>}
  </div>;
}
