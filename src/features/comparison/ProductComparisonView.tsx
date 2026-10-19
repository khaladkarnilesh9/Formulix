import React, { useState } from 'react';
import { DataService } from '../../services/dataService';
import { CommercialProduct } from '../../types';
import { useServerSearch } from '../../services/searchApi';
import { SearchStatus } from '../../components/common/SearchStatus';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { EvidenceBadge, StatusIndicator } from '../../components/common/EvidenceBadge';
import { useToast } from '../../components/common/Toast';
import { PageHeader, MetricStrip, DemoNotice, SearchField } from '../../components/common/IntelligenceUI';
import {
  Scale,
  Plus,
  X,
  Trash2,
  Download,
  AlertCircle,
  Check,
  Building2,
  Globe2,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface ProductComparisonViewProps {
  onSelectProduct: (productId: string) => void;
  onNavigateToSearch: () => void;
}

export const ProductComparisonView: React.FC<ProductComparisonViewProps> = ({
  onSelectProduct,
  onNavigateToSearch,
}) => {
  const { toast } = useToast();
  const {
    comparisonProductIds,
    toggleComparisonProduct,
    clearComparison,
  } = useWorkspaceStore();

  const [highlightDifferences, setHighlightDifferences] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addQuery, setAddQuery] = useState('');

  const comparedProducts: CommercialProduct[] = comparisonProductIds
    .map((id) => DataService.getProductById(id))
    .filter((p): p is CommercialProduct => p !== undefined);

  const search = useServerSearch<CommercialProduct>('products', { q: addQuery }, 1, 50, showAddModal);
  const allAvailableProducts = search.results.filter(
    (p) => !comparisonProductIds.includes(p.id)
  );

  const handleAddProduct = (prod: CommercialProduct) => {
    const success = toggleComparisonProduct(prod.id, prod.brandName);
    if (!success) {
      toast('Maximum 4 products allowed in comparison matrix', 'warning');
    } else {
      toast(`Added "${prod.brandName}" to comparison`);
    }
    setShowAddModal(false);
  };

  const handleRemoveProduct = (prod: CommercialProduct) => {
    toggleComparisonProduct(prod.id, prod.brandName);
    toast(`Removed "${prod.brandName}" from comparison`);
  };

  const handleExportComparison = () => {
    if (comparedProducts.length === 0) return;
    const text = `FORMULIX PRODUCT COMPARISON MATRIX\nGenerated: ${new Date().toLocaleString()}\nProducts: ${comparedProducts.map((p) => p.brandName).join(' vs ')}\n\n` +
      comparedProducts.map((p) => (
        `[${p.brandName}]\nManufacturer: ${p.manufacturerName}\nActive: ${p.activeIngredient} (CAS: ${p.casNumber})\nStrength: ${p.strength}\nFormulation: ${p.formulationType}\nJurisdiction: ${p.country}\nReg: ${p.registrationNumber} (${p.registrationStatus})\nDensity: ${p.specs.density || 'N/A'}\nViscosity: ${p.specs.viscosity || 'N/A'}\nShelf Life: ${p.specs.shelfLifeMonths === undefined ? 'Not recorded' : `${p.specs.shelfLifeMonths} Months`}\n\n`
      )).join('----------------------------------------\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formulix_comparison_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Comparison report downloaded');
  };

  // Helper function to check if all values in row are identical
  const areValuesDifferent = (accessor: (p: CommercialProduct) => string) => {
    if (comparedProducts.length <= 1) return false;
    const firstVal = accessor(comparedProducts[0]);
    return comparedProducts.some((p) => accessor(p) !== firstVal);
  };

  return (
    <div className="fx-page">
      <PageHeader scene="formulation" title="Product Comparison Workbench" icon={Scale} description="Recorded ingredient strengths, technical specifications, and jurisdictional status." count={`${comparedProducts.length} / 4 selected`} />
      <MetricStrip items={[{ label: 'Products selected', value: comparedProducts.length }, { label: 'Ingredients represented', value: new Set(comparedProducts.map(product => product.activeIngredient)).size }, { label: 'Jurisdictions', value: new Set(comparedProducts.map(product => product.country)).size }]} />
      <p className="text-xs text-slate-500">Comparison of database products and formulation listings. Missing measurements are not inferred.</p>
      {/* Top Header & Actions */}
      <div className="fx-toolbar">

        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium cursor-pointer text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={highlightDifferences}
              onChange={(e) => setHighlightDifferences(e.target.checked)}
              className="rounded text-blue-600 border-slate-300"
            />
            <span>Highlight Variance</span>
          </label>

          {comparedProducts.length < 4 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product ({comparedProducts.length}/4)</span>
            </button>
          )}

          {comparedProducts.length > 0 && (
            <>
              <button
                onClick={handleExportComparison}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                title="Download Comparison"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
              <button
                onClick={() => {
                  clearComparison();
                  toast('Comparison matrix cleared');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Clear All Selected"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Scientific Equivalence Disclaimer Notice */}
      <div className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-600 dark:text-slate-400">
        <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <span className="font-semibold text-slate-800 dark:text-slate-200">Regulatory & Chemical Equivalence Note: </span>
          Variations in active content or physical form do not constitute proof of bioequivalence or field bio-efficacy unless substantiated by formal regulatory bridge studies or registered bio-equivalence filings.
        </p>
      </div>

      {/* Comparison Matrix or Empty State */}
      {comparedProducts.length === 0 ? (
        <div className="p-16 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <Scale className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              No products selected for comparison
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No database listings have been selected.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onNavigateToSearch}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Browse Commercial Catalog
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="fx-data-table fx-comparison-table w-full text-left text-xs border-collapse">
              {/* Product Header Row */}
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
                  <th className="p-4 w-56 text-slate-400 uppercase tracking-wider font-semibold text-[11px] align-top">
                    Commercial Entity
                  </th>
                  {comparedProducts.map((p) => (
                    <th key={p.id} className="p-4 min-w-[220px] align-top">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-mono text-[10px] text-blue-600 dark:text-blue-400 uppercase">
                            {p.category}
                          </div>
                          <div
                            onClick={() => onSelectProduct(p.id)}
                            className="font-bold text-sm sm:text-base text-slate-900 dark:text-white hover:underline cursor-pointer"
                          >
                            {p.brandName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {p.genericName}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveProduct(p)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-200/50 dark:hover:bg-slate-800"
                          title="Remove from comparison"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </th>
                  ))}
                  {/* Empty Slot Placeholder if < 4 products */}
                  {Array.from({ length: 4 - comparedProducts.length }).map((_, idx) => (
                    <th key={`empty-${idx}`} className="p-4 min-w-[180px] bg-slate-50/40 dark:bg-slate-950/20 border-l border-dashed border-slate-200 dark:border-slate-800 text-center align-middle">
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-blue-600 hover:border-blue-400 text-xs font-medium transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Product</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Data Rows */}
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* Active Ingredient */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="p-3.5 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                    Active Ingredient
                  </td>
                  {comparedProducts.map((p) => {
                    const isDiff = highlightDifferences && areValuesDifferent((prod) => prod.activeIngredient);
                    return (
                      <td key={p.id} className={`p-3.5 font-medium ${isDiff ? 'bg-blue-50/40 dark:bg-blue-950/20 text-blue-950 dark:text-blue-200' : 'text-slate-800 dark:text-slate-200'}`}>
                        {p.activeIngredient}
                      </td>
                    );
                  })}
                  {Array.from({ length: 4 - comparedProducts.length }).map((_, i) => (
                    <td key={i} className="p-3.5 bg-slate-50/20 dark:bg-slate-950/10" />
                  ))}
                </tr>

                {/* CAS Registry */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="p-3.5 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                    CAS Number
                  </td>
                  {comparedProducts.map((p) => (
                    <td key={p.id} className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                      {p.casNumber}
                    </td>
                  ))}
                  {Array.from({ length: 4 - comparedProducts.length }).map((_, i) => (
                    <td key={i} className="p-3.5 bg-slate-50/20 dark:bg-slate-950/10" />
                  ))}
                </tr>

                {/* Strength / Concentration */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="p-3.5 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                    Strength / Load
                  </td>
                  {comparedProducts.map((p) => {
                    const isDiff = highlightDifferences && areValuesDifferent((prod) => prod.strength);
                    return (
                      <td key={p.id} className={`p-3.5 font-mono font-semibold ${isDiff ? 'bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200' : 'text-slate-900 dark:text-white'}`}>
                        {p.strength}
                      </td>
                    );
                  })}
                  {Array.from({ length: 4 - comparedProducts.length }).map((_, i) => (
                    <td key={i} className="p-3.5 bg-slate-50/20 dark:bg-slate-950/10" />
                  ))}
                </tr>

                {/* Formulation Type */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="p-3.5 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                    Formulation Form
                  </td>
                  {comparedProducts.map((p) => {
                    const isDiff = highlightDifferences && areValuesDifferent((prod) => prod.formulationType);
                    return (
                      <td key={p.id} className={`p-3.5 ${isDiff ? 'bg-purple-50/40 dark:bg-purple-950/20 font-semibold text-purple-900 dark:text-purple-200' : 'text-slate-800 dark:text-slate-200'}`}>
                        {p.formulationType}
                      </td>
                    );
                  })}
                  {Array.from({ length: 4 - comparedProducts.length }).map((_, i) => (
                    <td key={i} className="p-3.5 bg-slate-50/20 dark:bg-slate-950/10" />
                  ))}
                </tr>

                {/* Manufacturer */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="p-3.5 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                    Manufacturer
                  </td>
                  {comparedProducts.map((p) => (
                    <td key={p.id} className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                      {p.manufacturerName}
                    </td>
                  ))}
                  {Array.from({ length: 4 - comparedProducts.length }).map((_, i) => (
                    <td key={i} className="p-3.5 bg-slate-50/20 dark:bg-slate-950/10" />
                  ))}
                </tr>

                {/* Jurisdiction */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="p-3.5 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                    Country Jurisdiction
                  </td>
                  {comparedProducts.map((p) => (
                    <td key={p.id} className="p-3.5 text-slate-800 dark:text-slate-200">
                      {p.country}
                    </td>
                  ))}
                  {Array.from({ length: 4 - comparedProducts.length }).map((_, i) => (
                    <td key={i} className="p-3.5 bg-slate-50/20 dark:bg-slate-950/10" />
                  ))}
                </tr>

                {/* Registration Number & Status */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="p-3.5 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                    Registration Status
                  </td>
                  {comparedProducts.map((p) => (
                    <td key={p.id} className="p-3.5 space-y-1">
                      <StatusIndicator status={p.registrationStatus} />
                      <div className="font-mono text-[10px] text-slate-400 truncate max-w-[190px]">
                        {p.registrationNumber}
                      </div>
                    </td>
                  ))}
                  {Array.from({ length: 4 - comparedProducts.length }).map((_, i) => (
                    <td key={i} className="p-3.5 bg-slate-50/20 dark:bg-slate-950/10" />
                  ))}
                </tr>

                {/* Specific Gravity / Density */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="p-3.5 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                    Density / Specific Gravity
                  </td>
                  {comparedProducts.map((p) => (
                    <td key={p.id} className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                      {p.specs.density || 'Not recorded'}
                    </td>
                  ))}
                  {Array.from({ length: 4 - comparedProducts.length }).map((_, i) => (
                    <td key={i} className="p-3.5 bg-slate-50/20 dark:bg-slate-950/10" />
                  ))}
                </tr>

                {/* Viscosity */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="p-3.5 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                    Viscosity Specs
                  </td>
                  {comparedProducts.map((p) => (
                    <td key={p.id} className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                      {p.specs.viscosity || 'Not recorded'}
                    </td>
                  ))}
                  {Array.from({ length: 4 - comparedProducts.length }).map((_, i) => (
                    <td key={i} className="p-3.5 bg-slate-50/20 dark:bg-slate-950/10" />
                  ))}
                </tr>

                {/* Shelf Life */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="p-3.5 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                    Shelf Life Limits
                  </td>
                  {comparedProducts.map((p) => (
                    <td key={p.id} className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                      {p.specs.shelfLifeMonths === undefined ? 'Not recorded' : `${p.specs.shelfLifeMonths} Months`}
                    </td>
                  ))}
                  {Array.from({ length: 4 - comparedProducts.length }).map((_, i) => (
                    <td key={i} className="p-3.5 bg-slate-50/20 dark:bg-slate-950/10" />
                  ))}
                </tr>

                {/* Evidence Tier */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="p-3.5 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                    Verification Tier
                  </td>
                  {comparedProducts.map((p) => (
                    <td key={p.id} className="p-3.5">
                      <EvidenceBadge evidence={p.verificationEvidence} />
                    </td>
                  ))}
                  {Array.from({ length: 4 - comparedProducts.length }).map((_, i) => (
                    <td key={i} className="p-3.5 bg-slate-50/20 dark:bg-slate-950/10" />
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Product Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Select Product for Comparison ({comparedProducts.length}/4)
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              <SearchField label="Search comparison products" placeholder="Brand, ingredient, or company" value={addQuery} onChange={setAddQuery} />
              <SearchStatus search={search} />
              {allAvailableProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleAddProduct(p)}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {p.brandName}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {p.activeIngredient} · {p.formulationType} · {p.manufacturerName}
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
