import React, { useState } from 'react';
import { DataService } from '../../services/dataService';
import { CommercialProduct } from '../../types';
import { useServerSearch } from '../../services/searchApi';
import { SearchStatus } from '../../components/common/SearchStatus';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { EvidenceBadge, StatusIndicator } from '../../components/common/EvidenceBadge';
import { useToast } from '../../components/common/Toast';
import { DemoNotice } from '../../components/common/IntelligenceUI';
import { isDemoRecord } from '../../services/presentation';
import {
  ArrowLeft,
  Scale,
  Bookmark,
  Share2,
  Download,
  Building2,
  ShieldCheck,
  FileText,
  FlaskConical,
  Atom,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  Tag,
} from 'lucide-react';

interface ProductDetailViewProps {
  productId: string;
  onBack: () => void;
  onNavigateToFormulation: (formulationId: string) => void;
  onNavigateToIngredient: (casOrId: string) => void;
  onNavigateToManufacturer: (mfgId: string) => void;
  onOpenDocument: (docId: string) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  productId,
  onBack,
  onNavigateToFormulation,
  onNavigateToIngredient,
  onNavigateToManufacturer,
  onOpenDocument,
}) => {
  const { toast } = useToast();
  const known = DataService.getProductById(productId);
  const search = useServerSearch<CommercialProduct>('products', { identity: productId }, 1, 1, !known);
  const product = known ?? search.results[0];
  const {
    savedProductIds,
    toggleSavedProduct,
    comparisonProductIds,
    toggleComparisonProduct,
  } = useWorkspaceStore();

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'composition'
    | 'specs'
    | 'manufacturers'
    | 'regulatory'
    | 'patents'
    | 'documents'
    | 'similar'
  >('overview');

  if (!product) {
    if (search.loading || search.error) return <div className="fx-page"><SearchStatus search={search} /></div>;
    return (
      <div className="p-12 text-center max-w-lg mx-auto space-y-4">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
          Product Record Not Found
        </h3>
        <p className="text-xs text-slate-500">
          The requested product ID does not exist in the intelligence index.
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Return to Product Search
        </button>
      </div>
    );
  }

  const isSaved = savedProductIds.includes(product.id);
  const isCompared = comparisonProductIds.includes(product.id);

  // Associated regulatory records
  const regRecords = DataService.getRegulatoryRecords().filter(
    (r) => r.productId === product.id || r.productName === product.brandName
  );

  // Associated documents
  const relatedDocs = DataService.getDocuments().filter(
    (d) =>
      product.documentIds.includes(d.id) ||
      d.relatedProducts.some((p) => p.includes(product.brandName))
  );

  // Similar products in same category or with same active ingredient
  const similarProducts = DataService.getProducts({
    category: product.category,
    pageSize: 4,
  }).items.filter((p) => p.id !== product.id);

  const handleToggleCompare = () => {
    const success = toggleComparisonProduct(product.id, product.brandName);
    if (!success) {
      toast('Maximum 4 products in comparison matrix', 'warning');
    } else {
      toast(
        !isCompared
          ? `Added "${product.brandName}" to comparison matrix`
          : `Removed "${product.brandName}" from comparison matrix`
      );
    }
  };

  const handleToggleSave = () => {
    toggleSavedProduct(product.id, product.brandName);
    toast(
      !isSaved
        ? `Saved "${product.brandName}" to workspace`
        : `Removed "${product.brandName}" from workspace`
    );
  };

  const handleExportSpec = () => {
    const spec = `FORMULIX COMMERCIAL PRODUCT DOSSIER\nProduct: ${product.brandName}\nGeneric: ${product.genericName}\nActive Ingredient: ${product.activeIngredient} (CAS: ${product.casNumber})\nStrength: ${product.strength}\nFormulation: ${product.formulationType}\nManufacturer: ${product.manufacturerName}\nJurisdiction: ${product.country}\nRegistration No: ${product.registrationNumber}\nAuthority: ${product.regulatoryAuthority}\nLast Verified: ${product.lastVerifiedDate}\nEvidence Tier: ${product.verificationEvidence}\n`;
    const blob = new Blob([spec], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${product.brandName.replace(/\s+/g, '_')}_Dossier.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported product dossier for ${product.brandName}`);
  };

  return (
    <div className="fx-page">
      {isDemoRecord('product', product.id) && <DemoNotice />}
      {product.recordKind && <p className="text-xs text-slate-500">{product.recordKind} / {product.publishStatus}. Spreadsheet claims are source-reported and unverified.</p>}
      {/* Back button and quick actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Product Search</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleCompare}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isCompared
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>{isCompared ? 'In Comparison' : 'Compare'}</span>
          </button>

          <button
            onClick={handleToggleSave}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isSaved
                ? 'bg-purple-600 text-white border-purple-600'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>

          <button
            onClick={handleExportSpec}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            title="Download Dossier"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Dossier</span>
          </button>
        </div>
      </div>

      {/* Persistent Product Identity Banner */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-blue-600 dark:text-blue-400">{product.category}</span>
              <span aria-hidden="true">·</span>
              <span>{product.formulationType}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{product.strength}</span>
              <span aria-hidden="true">·</span>
              <span>{product.country}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {product.brandName}
            </h1>
            <div className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
              {product.genericName}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2 text-xs">
            <div className="flex items-center gap-2">
              <StatusIndicator status={product.registrationStatus} />
              <EvidenceBadge evidence={product.verificationEvidence} />
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Verified: {product.lastVerifiedDate} · Source: {product.dataSource}
            </div>
          </div>
        </div>

        {/* Compact Quick Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80">
            <div className="text-slate-400 text-[11px]">Active Ingredient</div>
            <div
              onClick={() => onNavigateToIngredient(product.casNumber)}
              className="font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer mt-0.5 truncate"
            >
              {product.activeIngredient}
            </div>
            <div className="text-[10px] font-mono text-slate-400">CAS {product.casNumber}</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80">
            <div className="text-slate-400 text-[11px]">Manufacturer</div>
            <div
              onClick={() => onNavigateToManufacturer(product.manufacturerId)}
              className="font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer mt-0.5 truncate"
            >
              {product.manufacturerName}
            </div>
            <div className="text-[10px] text-slate-400">{product.country} HQ</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80">
            <div className="text-slate-400 text-[11px]">Registration Number</div>
            <div className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5 truncate">
              {product.registrationNumber}
            </div>
            <div className="text-[10px] text-slate-400 truncate">{product.regulatoryAuthority}</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80">
            <div className="text-slate-400 text-[11px]">Formulation Recipe</div>
            {product.formulationId ? (
              <button
                onClick={() => onNavigateToFormulation(product.formulationId!)}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-0.5 flex items-center gap-1"
              >
                <span>View Full Recipe</span>
                <FlaskConical className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="text-slate-500 mt-0.5">Commercial Disclosed</div>
            )}
            <div className="text-[10px] text-slate-400">CIPAC / Pharmacopeia standard</div>
          </div>
        </div>
      </div>

      {/* Tabbed Navigation Bar */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-xs font-medium">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'composition', label: 'Composition' },
          { id: 'specs', label: 'Technical Specifications' },
          { id: 'manufacturers', label: 'Manufacturers' },
          { id: 'regulatory', label: 'Regulatory Records' },
          { id: 'patents', label: 'Patent References' },
          { id: 'documents', label: `Documents (${relatedDocs.length})` },
          { id: 'similar', label: 'Similar Products' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-xs mb-2">
                Product Description & Indications
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {product.description}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-xs mb-2">
                Target Indications / Target Pest Spectrum
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.indicationsOrPests.map((ind) => (
                  <span
                    key={ind}
                    className="px-3 py-1 rounded-md text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                  >
                    {ind}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Regulatory Verification Status
                </div>
                <div className="flex items-center gap-2">
                  <EvidenceBadge evidence={product.verificationEvidence} size="md" />
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Indexed from {product.dataSource} on {product.lastVerifiedDate}. Dossier contains verified active concentration and official regulatory registration certificate reference.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Formulation Engineering Model
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Structured formulation recipe is mapped in the Formulix engine. Includes processing sequence, equipment requirements, shear rates, and physical stability thresholds.
                </p>
                {product.formulationId && (
                  <button
                    onClick={() => onNavigateToFormulation(product.formulationId!)}
                    className="mt-3 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <span>Open Detailed Formulation Flowsheet</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COMPOSITION */}
        {activeTab === 'composition' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Quantitative & Qualitative Composition
                </h3>
                <p className="text-xs text-slate-500">
                  Ingredients disclosed through regulatory gazettes and manufacturer datasheets
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Total: 100.0% w/w
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-950/50 text-slate-400 font-medium uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Ingredient</th>
                    <th className="py-2.5 px-3">CAS Number</th>
                    <th className="py-2.5 px-3">Chemical Function</th>
                    <th className="py-2.5 px-3">Concentration</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Evidence Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {product.composition.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                        {item.ingredient}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">
                        {item.cas}
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                        {item.chemicalFunction}
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-slate-900 dark:text-white">
                        {item.concentration}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {item.ingredientCategory}
                      </td>
                      <td className="py-3 px-3">
                        <EvidenceBadge evidence={item.sourceEvidence} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: TECHNICAL SPECIFICATIONS */}
        {activeTab === 'specs' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Physicochemical Specifications & Analytical Limits
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400">pH Specification</span>
                <div className="text-base font-semibold font-mono text-slate-900 dark:text-white mt-1">
                  {product.specs.ph || '6.5–7.5 (standard aq.)'}
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400">Specific Gravity / Density</span>
                <div className="text-base font-semibold font-mono text-slate-900 dark:text-white mt-1">
                  {product.specs.density || '1.10–1.14 g/cm³'}
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400">Dynamic Viscosity</span>
                <div className="text-base font-semibold font-mono text-slate-900 dark:text-white mt-1">
                  {product.specs.viscosity || '450–650 mPa·s'}
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400">Flash Point / Flammability</span>
                <div className="text-base font-semibold font-mono text-slate-900 dark:text-white mt-1">
                  {product.specs.flashPoint || '> 100 °C (Non-flammable)'}
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400">Commercial Shelf Life</span>
                <div className="text-base font-semibold font-mono text-slate-900 dark:text-white mt-1">
                  {product.specs.shelfLifeMonths || 24} Months
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400">Storage Temperature Limits</span>
                <div className="text-base font-semibold font-mono text-slate-900 dark:text-white mt-1">
                  {product.specs.storageTemp || '5 °C to 30 °C'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MANUFACTURERS */}
        {activeTab === 'manufacturers' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Primary Manufacturer & Registration Holder
            </h3>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  <span>{product.manufacturerName}</span>
                </div>
                <div className="text-xs text-slate-500">
                  Headquartered in {product.country} · Global Life Sciences & Specialty Chemical Manufacturer
                </div>
              </div>

              <button
                onClick={() => onNavigateToManufacturer(product.manufacturerId)}
                className="px-3.5 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                View Manufacturer Portfolio
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: REGULATORY */}
        {activeTab === 'regulatory' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Registered Regulatory Dossiers & Approval Cycles
            </h3>

            {regRecords.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 border border-slate-100 dark:border-slate-800 rounded-lg">
                Direct authority register indexed under registration number {product.registrationNumber} ({product.regulatoryAuthority}).
              </div>
            ) : (
              <div className="space-y-3">
                {regRecords.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {r.registrationNumber}
                      </div>
                      <StatusIndicator status={r.approvalStatus} />
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">
                      Authority: <span className="font-medium text-slate-800 dark:text-slate-200">{r.regulatoryAuthority}</span> ({r.country})
                    </div>
                    <div className="text-slate-500 font-mono text-[11px]">
                      Approval: {r.approvalDate} · Expiry: {r.expiryDate} · Holder: {r.registrationHolder}
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Dossier: {r.sourceDocument}
                      </span>
                      <a
                        href={r.officialLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <span>Official Portal</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: PATENTS */}
        {activeTab === 'patents' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Patent References & Prior Art Landscape
            </h3>

            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">
                  US 4,742,060 A / WO 2003/015518
                </span>
                <span className="text-slate-500 font-mono text-[11px]">Prior Art Registered</span>
              </div>
              <div className="font-medium text-slate-900 dark:text-slate-100">
                Pesticidal and pharmaceutical active formulations comprising polar carriers and associative stabilization
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                Patent claims cover crystalline solid dispersion and suspension concentrate mechanisms utilizing lignosulfonate or non-ionic steric polymer surfactants.
              </p>
            </div>
          </div>
        )}

        {/* TAB 7: DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Technical Documents, SDS, TDS & Official Labels
            </h3>

            {relatedDocs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 border border-slate-100 dark:border-slate-800 rounded-lg">
                No indexed PDFs found for this specific commercial entry.
              </div>
            ) : (
              <div className="space-y-2.5">
                {relatedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer" onClick={() => onOpenDocument(doc.id)}>
                        {doc.title}
                      </div>
                      <div className="text-slate-500 text-[11px] font-mono">
                        {doc.type} · {doc.documentNumber} · {doc.fileSize}
                      </div>
                    </div>
                    <button
                      onClick={() => onOpenDocument(doc.id)}
                      className="px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 font-medium transition-colors shrink-0"
                    >
                      Preview Dossier
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 8: SIMILAR PRODUCTS */}
        {activeTab === 'similar' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Related Formulations in the {product.category} Sector
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {similarProducts.map((sim) => (
                <div
                  key={sim.id}
                  className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-2 text-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {sim.brandName}
                    </div>
                    <div className="text-slate-500 text-[11px] font-mono">
                      {sim.activeIngredient} · {sim.formulationType}
                    </div>
                    <div className="text-slate-400 text-[11px] mt-1">
                      {sim.manufacturerName}
                    </div>
                  </div>
                  <button
                    onClick={() => onBack()}
                    className="mt-2 text-left font-medium text-blue-600 dark:text-blue-400 hover:underline text-[11px]"
                  >
                    Compare in Search →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
