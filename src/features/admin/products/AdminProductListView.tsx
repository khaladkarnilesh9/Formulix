import React, { useEffect, useState } from 'react';
import { SharedRepository, AdminProductRecord } from '../../../data/repositories/sharedRepository';
import { RecordPublishStatus } from '../../../data/schemas/canonicalSchemas';
import { useToast } from '../../../components/common/Toast';
import { EvidenceBadge, StatusIndicator } from '../../../components/common/EvidenceBadge';
import {
  Package,
  Search,
  Filter,
  Plus,
  Edit,
  Copy,
  Archive,
  Trash2,
  ExternalLink,
  Download,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpDown,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

interface AdminProductListViewProps {
  onEditProduct: (product: AdminProductRecord) => void;
  onCreateNewProduct: () => void;
  onPreviewInUserPortal: (productId: string) => void;
  initialStatusFilter?: string;
}

export const AdminProductListView: React.FC<AdminProductListViewProps> = ({
  onEditProduct,
  onCreateNewProduct,
  onPreviewInUserPortal,
  initialStatusFilter = 'All',
}) => {
  const { toast } = useToast();
  const repo = SharedRepository.getState();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'repository' | 'brandName' | 'manufacturerName' | 'country'>('repository');
  const [sortDescending, setSortDescending] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  useEffect(() => { setPage(1); }, [searchQuery, statusFilter, categoryFilter, sortBy, sortDescending]);

  // Filter products
  const filteredProducts = repo.products.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.activeIngredient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.casNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.manufacturerName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || p.publishStatus === statusFilter;
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const sortedProducts = sortBy === 'repository' ? filteredProducts : [...filteredProducts].sort((left, right) =>
    left[sortBy].localeCompare(right[sortBy]) * (sortDescending ? -1 : 1));
  const pageCount = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleProducts = sortedProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredProducts.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkStatusChange = (newStatus: RecordPublishStatus) => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach((id) => {
      SharedRepository.setProductPublishStatus(id, newStatus, 'Bulk Action Operator');
    });
    toast(`Updated ${selectedIds.length} records to ${newStatus}`);
    setSelectedIds([]);
  };

  const handleDelete = (prod: AdminProductRecord) => {
    if (window.confirm(`Are you sure you want to delete "${prod.brandName}"? This action is tracked in audit history.`)) {
      SharedRepository.deleteProduct(prod.id, 'Admin Operator');
      toast(`Deleted "${prod.brandName}"`);
    }
  };

  const handleDuplicate = (prod: AdminProductRecord) => {
    const duplicated = SharedRepository.duplicateProduct(prod.id, 'Admin Operator');
    toast(`Cloned "${prod.brandName}" as Draft`);
    onEditProduct(duplicated);
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(filteredProducts, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formulix_products_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${filteredProducts.length} product records`);
  };

  return (
    <div className="fx-page">
      {/* Action Header */}
      <div className="fx-page-heading">
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span>Commercial Product Master Records</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-300">
              {filteredProducts.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Stored product records used by public search, comparisons, and product dossiers.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={onCreateNewProduct}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Bulk Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Search admin products"
              type="text"
              placeholder="Search by brand name, active substance, CAS, or manufacturer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              aria-label="Product lifecycle filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Lifecycle Statuses</option>
              <option value="Published">Published (Live in Portal)</option>
              <option value="Draft">Draft (Internal)</option>
              <option value="Submitted for Review">Submitted for Review</option>
              <option value="Approved">Approved</option>
              <option value="Archived">Archived</option>
            </select>

            <select
              aria-label="Product sector filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Sectors</option>
              <option value="Agrochemical">Agrochemicals</option>
              <option value="Pharmaceutical">Pharmaceuticals</option>
              <option value="Industrial">Industrial Chemicals</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select className="fx-select" aria-label="Sort admin products" value={sortBy} onChange={event => setSortBy(event.target.value as typeof sortBy)}>
            <option value="repository">Repository order</option><option value="brandName">Brand name</option><option value="manufacturerName">Manufacturer</option><option value="country">Jurisdiction</option>
          </select>
          <button className="fx-icon-button" disabled={sortBy === 'repository'} aria-label={sortDescending ? 'Sort ascending' : 'Sort descending'} title={sortDescending ? 'Sort ascending' : 'Sort descending'} onClick={() => setSortDescending(value => !value)}><ArrowUpDown size={17} /></button>
          <span className="text-xs text-slate-500">{filteredProducts.length} matching records</span>
        </div>

        {/* Bulk Actions Row */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs">
            <span className="font-semibold text-blue-900 dark:text-blue-200">
              {selectedIds.length} records selected
            </span>

            <div className="flex items-center gap-2">
              <button className="fx-icon-button" title="Clear product selection" aria-label="Clear product selection" onClick={() => setSelectedIds([])}><X size={16} /></button>
              <button
                onClick={() => handleBulkStatusChange('Published')}
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
              >
                Publish Selected
              </button>
              <button
                onClick={() => handleBulkStatusChange('Archived')}
                className="px-2.5 py-1 rounded bg-slate-600 hover:bg-slate-700 text-white font-medium transition-colors"
              >
                Archive Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="fx-data-table w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-400 font-medium uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 text-center w-8">
                  <input
                    aria-label="Select all matching product records"
                    type="checkbox"
                    checked={filteredProducts.length > 0 && filteredProducts.every(product => selectedIds.includes(product.id))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                </th>
                <th className="py-3 px-3">Commercial Brand</th>
                <th className="py-3 px-3">Active Substance & CAS</th>
                <th className="py-3 px-3">Form Type & Strength</th>
                <th className="py-3 px-3">Manufacturer</th>
                <th className="py-3 px-3">Lifecycle State</th>
                <th className="py-3 px-3">Version / recorded verification</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {!filteredProducts.length && <tr><td colSpan={8} className="text-center py-10 text-slate-500">No matching product records</td></tr>}
              {visibleProducts.map((p) => {
                const isSelected = selectedIds.includes(p.id);

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      isSelected ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <td className="py-3 px-3 text-center">
                      <input
                        aria-label={`Select ${p.brandName}`}
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(p.id)}
                        className="rounded text-blue-600 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{p.brandName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {p.category} · {p.country}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {p.activeIngredient}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        CAS {p.casNumber}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-800 dark:text-slate-200">
                        {p.formulationType}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {p.strength}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      {p.manufacturerName}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                          p.publishStatus === 'Published'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : p.publishStatus === 'Draft'
                            ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                            : p.publishStatus === 'Submitted for Review'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            : p.publishStatus === 'Approved'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        }`}
                      >
                        {p.publishStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                      <div>v{p.version}</div>
                      <div className="text-[10px] text-slate-400">{p.lastVerifiedDate}</div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onPreviewInUserPortal(p.id)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                          title="Preview in Public User Portal"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditProduct(p)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                          title="Edit Product"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(p)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          title="Duplicate Record"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 p-3">
          <span className="text-xs text-slate-500">{filteredProducts.length ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredProducts.length)}` : '0'} of {filteredProducts.length} records</span>
          <div className="flex items-center gap-2"><button className="fx-icon-button" aria-label="Previous product page" title="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={18} /></button><span className="text-xs tabular-nums">{currentPage} / {pageCount}</span><button className="fx-icon-button" aria-label="Next product page" title="Next page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={18} /></button></div>
        </footer>
      </div>
    </div>
  );
};
