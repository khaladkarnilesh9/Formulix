import React, { useState, useEffect } from 'react';
import { SharedRepository, AdminProductRecord } from '../../../data/repositories/sharedRepository';
import { RecordPublishStatus } from '../../../data/schemas/canonicalSchemas';
import { useToast } from '../../../components/common/Toast';
import { PageHeader } from '../../../components/common/IntelligenceUI';
import {
  Package,
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle2,
  AlertCircle,
  Building2,
  Atom,
  FlaskConical,
  ShieldCheck,
  FileText,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

interface AdminProductFormWizardProps {
  initialProduct?: AdminProductRecord | null;
  onSaveSuccess: (product: AdminProductRecord) => void;
  onCancel: () => void;
  operatorRole: string;
}

export const AdminProductFormWizard: React.FC<AdminProductFormWizardProps> = ({
  initialProduct,
  onSaveSuccess,
  onCancel,
  operatorRole,
}) => {
  const { toast } = useToast();
  const repo = SharedRepository.getState();
  const vocabularies = repo.masterVocabularies;

  const [currentStep, setCurrentStep] = useState(1);
  const [manufacturerQuery, setManufacturerQuery] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Form State
  const [formData, setFormData] = useState<Partial<AdminProductRecord>>({
    id: initialProduct?.id || `prod-${Date.now()}`,
    brandName: initialProduct?.brandName || '',
    genericName: initialProduct?.genericName || '',
    category: initialProduct?.category || 'Agrochemical',
    formulationType: initialProduct?.formulationType || 'SC (Suspension Concentrate)',
    strength: initialProduct?.strength || '200 g/L',
    country: initialProduct?.country || 'India',
    description: initialProduct?.description || '',
    indicationsOrPests: initialProduct?.indicationsOrPests || ['Cotton Thrips', 'Chilli Aphids'],

    // Commercial
    manufacturerId: initialProduct?.manufacturerId || repo.manufacturers[0]?.id || 'mfg-1',
    manufacturerName: initialProduct?.manufacturerName || repo.manufacturers[0]?.name || 'Bayer CropScience AG',
    dataSource: initialProduct?.dataSource || 'Official Regulatory Gazette Dossier',

    // Chemical
    activeIngredient: initialProduct?.activeIngredient || 'Chlorantraniliprole',
    casNumber: initialProduct?.casNumber || '500008-45-7',

    // Formulation Link & Specs
    formulationId: initialProduct?.formulationId || 'form-2',
    specs: initialProduct?.specs || {
      ph: '6.5–7.5 (1% aq.)',
      density: '1.09 g/mL',
      viscosity: '520 mPa·s',
      flashPoint: 'Non-flammable',
      shelfLifeMonths: 36,
      storageTemp: '5–35 °C',
    },

    // Regulatory & Evidence
    registrationNumber: initialProduct?.registrationNumber || `REG-${Date.now().toString().slice(-6)}`,
    regulatoryAuthority: initialProduct?.regulatoryAuthority || 'US Environmental Protection Agency (US EPA)',
    registrationStatus: initialProduct?.registrationStatus || 'Approved',
    lastVerifiedDate: initialProduct?.lastVerifiedDate || new Date().toISOString().slice(0, 10),
    verificationEvidence: initialProduct?.verificationEvidence || 'Regulatory verified',

    patentIds: initialProduct?.patentIds || ['pat-1'],
    documentIds: initialProduct?.documentIds || ['doc-1'],

    publishStatus: initialProduct?.publishStatus || 'Draft',
  });

  // Handle active ingredient change and auto-populate CAS if found
  const handleActiveIngredientChange = (name: string) => {
    const matched = repo.ingredients.find((i) => i.name.toLowerCase() === name.toLowerCase());
    setFormData((prev) => ({
      ...prev,
      activeIngredient: name,
      casNumber: matched ? matched.casNumber : prev.casNumber,
    }));
  };

  // Handle manufacturer change and update name
  const handleManufacturerChange = (mfgId: string) => {
    const matched = repo.manufacturers.find((m) => m.id === mfgId);
    setFormData((prev) => ({
      ...prev,
      manufacturerId: mfgId,
      manufacturerName: matched ? matched.name : prev.manufacturerName,
      country: matched ? matched.country : prev.country,
    }));
  };

  const handleSave = (targetPublishStatus?: RecordPublishStatus) => {
    const errors: Record<string, string> = {};
    if (!formData.brandName?.trim()) errors.brandName = 'Brand Name is required';
    if (!formData.activeIngredient?.trim()) errors.activeIngredient = 'Active Ingredient is required';
    setValidationErrors(errors);
    if (!formData.brandName?.trim()) {
      toast('Brand Name is required', 'warning');
      setCurrentStep(1);
      return;
    }
    if (!formData.activeIngredient?.trim()) {
      toast('Active Ingredient is required', 'warning');
      setCurrentStep(3);
      return;
    }

    const statusToSave = targetPublishStatus || formData.publishStatus || 'Draft';

    const saved = SharedRepository.saveProduct(
      {
        ...formData,
        publishStatus: statusToSave,
      } as any,
      operatorRole
    );

    toast(
      statusToSave === 'Published'
        ? `Successfully published "${saved.brandName}" to User Portal`
        : `Saved "${saved.brandName}" as ${statusToSave}`
    );
    onSaveSuccess(saved);
  };

  const steps = [
    { number: 1, title: 'Product Identity' },
    { number: 2, title: 'Commercial Info' },
    { number: 3, title: 'Chemical Active' },
    { number: 4, title: 'Formulation Specs' },
    { number: 5, title: 'Regulatory & Dossiers' },
    { number: 6, title: 'Review & Publish' },
  ];

  return (
    <div className="product-wizard fx-page">
      <PageHeader title={initialProduct ? 'Edit Commercial Product' : 'New Commercial Product'} icon={Package} count={`Step ${currentStep} of ${steps.length}`} />
      {/* Top Wizard Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Products List</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave('Draft')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>
          <button
            onClick={() => handleSave('Published')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Publish Directly</span>
          </button>
        </div>
      </div>

      {/* Step Progress Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="wizard-progress grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs" aria-label={`Step ${currentStep} of 6: ${steps[currentStep - 1].title}`}>
          {steps.map((s) => {
            const isCompleted = currentStep > s.number;
            const isCurrent = currentStep === s.number;

            return (
              <button
                key={s.number}
                aria-current={isCurrent ? 'step' : undefined}
                title={s.title}
                onClick={() => setCurrentStep(s.number)}
                className={`p-2.5 rounded-lg text-left transition-all border ${
                  isCurrent
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                    : isCompleted
                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-medium'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Step {s.number}
                </div>
                <div className="truncate mt-0.5">{s.title}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Step Form Container */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-6">
        {/* STEP 1: PRODUCT IDENTITY */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Step 1: Product Identity & Commercial Classification
              </h3>
              <p className="text-xs text-slate-500">
                Primary product branding, category, and descriptive summary.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Commercial Brand Name *
                </label>
                <input aria-label="Commercial Brand Name *"
                  aria-invalid={!!validationErrors.brandName}
                  aria-describedby={validationErrors.brandName ? 'brand-name-error' : undefined}
                  type="text"
                  placeholder="e.g. Coragen 20 SC, Confidor 200 SL"
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
                {validationErrors.brandName && <p id="brand-name-error" role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{validationErrors.brandName}</p>}
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Generic Formulation Title *
                </label>
                <input aria-label="Generic Formulation Title *"
                  type="text"
                  placeholder="e.g. Chlorantraniliprole 18.5% w/w SC"
                  value={formData.genericName}
                  onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Industry Sector *
                </label>
                <select aria-label="Industry Sector *"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  {vocabularies.sectors.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Formulation Type / Delivery Form *
                </label>
                <select aria-label="Formulation Type / Delivery Form *"
                  value={formData.formulationType}
                  onChange={(e) => setFormData({ ...formData, formulationType: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  {vocabularies.formulationTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Strength / Delivery Load *
                </label>
                <input aria-label="Strength / Delivery Load *"
                  type="text"
                  placeholder="e.g. 18.5% w/w, 200 g/L, 500 mg"
                  value={formData.strength}
                  onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Jurisdiction / Country *
                </label>
                <select aria-label="Jurisdiction / Country *"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  {vocabularies.jurisdictions.map((j) => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-xs">
              <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Product Narrative Description *
              </label>
              <textarea aria-label="Product Narrative Description *"
                rows={3}
                placeholder="Comprehensive technical profile describing biological or functional activity..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div className="text-xs">
              <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Indications / Target Pest Spectrum (comma separated)
              </label>
              <input aria-label="Indications / Target Pest Spectrum (comma separated)"
                type="text"
                placeholder="e.g. Corn Earworm, Diamondback Moth, Rice Stem Borer"
                value={formData.indicationsOrPests?.join(', ')}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    indicationsOrPests: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                  })
                }
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* STEP 2: COMMERCIAL & MANUFACTURER */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Step 2: Corporate Manufacturer & Sourcing Attribution
              </h3>
              <p className="text-xs text-slate-500">
                Link to corporate registrant entity and commercial provenance records.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Manufacturer / Registrant *
                </label>
                <input type="search" aria-label="Find manufacturer" placeholder="Find manufacturer"
                  value={manufacturerQuery} onChange={event => setManufacturerQuery(event.target.value)}
                  className="mb-2 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950 md:hidden" />
                <select aria-label="Manufacturer / Registrant *"
                  value={formData.manufacturerId}
                  onChange={(e) => handleManufacturerChange(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  {repo.manufacturers.filter(m => m.id === formData.manufacturerId || m.name.toLowerCase().includes(manufacturerQuery.toLowerCase())).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.country})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Company Name (Denormalized)
                </label>
                <input aria-label="Company Name (Denormalized)"
                  type="text"
                  value={formData.manufacturerName}
                  onChange={(e) => setFormData({ ...formData, manufacturerName: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Data Source Document / Origin
                </label>
                <input aria-label="Data Source Document / Origin"
                  type="text"
                  placeholder="e.g. EPA PPLS Official Registration Docket, CIBRC Gazette"
                  value={formData.dataSource}
                  onChange={(e) => setFormData({ ...formData, dataSource: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Last Verification Audit Date
                </label>
                <input aria-label="Last Verification Audit Date"
                  type="date"
                  value={formData.lastVerifiedDate}
                  onChange={(e) => setFormData({ ...formData, lastVerifiedDate: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: CHEMICAL ACTIVE SUBSTANCE */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Step 3: Chemical Active Substance Linkage
              </h3>
              <p className="text-xs text-slate-500">
                Connect the product to the chemical substance master database.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Active Chemical Substance *
                </label>
                <select aria-label="Active Chemical Substance *"
                  aria-invalid={!!validationErrors.activeIngredient}
                  aria-describedby={validationErrors.activeIngredient ? 'active-ingredient-error' : undefined}
                  value={formData.activeIngredient}
                  onChange={(e) => handleActiveIngredientChange(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  {repo.ingredients.map((ing) => (
                    <option key={ing.id} value={ing.name}>
                      {ing.name} ({ing.casNumber})
                    </option>
                  ))}
                </select>
                {validationErrors.activeIngredient && <p id="active-ingredient-error" role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{validationErrors.activeIngredient}</p>}
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  CAS Registry Number *
                </label>
                <input aria-label="CAS Registry Number *"
                  type="text"
                  placeholder="e.g. 500008-45-7"
                  value={formData.casNumber}
                  onChange={(e) => setFormData({ ...formData, casNumber: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: FORMULATION SPECS */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Step 4: Formulation Specifications & Physical Limits
              </h3>
              <p className="text-xs text-slate-500">
                Link to recipe flowsheet and enter physicochemical analytical bounds.
              </p>
            </div>

            <div className="text-xs mb-3">
              <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Linked Formulation Recipe Flowsheet
              </label>
              <select aria-label="Linked Formulation Recipe Flowsheet"
                value={formData.formulationId}
                onChange={(e) => setFormData({ ...formData, formulationId: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                <option value="">No Formulation Recipe Linked</option>
                {repo.formulations.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.formulationType})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-medium text-slate-600 dark:text-slate-400 mb-1 block">pH Specification</label>
                <input aria-label="pH Specification"
                  type="text"
                  placeholder="e.g. 6.5–7.5"
                  value={formData.specs?.ph || ''}
                  onChange={(e) => setFormData({ ...formData, specs: { ...formData.specs, ph: e.target.value } })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-medium text-slate-600 dark:text-slate-400 mb-1 block">Density / Specific Gravity</label>
                <input aria-label="Density / Specific Gravity"
                  type="text"
                  placeholder="e.g. 1.09 g/mL"
                  value={formData.specs?.density || ''}
                  onChange={(e) => setFormData({ ...formData, specs: { ...formData.specs, density: e.target.value } })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-medium text-slate-600 dark:text-slate-400 mb-1 block">Dynamic Viscosity</label>
                <input aria-label="Dynamic Viscosity"
                  type="text"
                  placeholder="e.g. 520 mPa·s"
                  value={formData.specs?.viscosity || ''}
                  onChange={(e) => setFormData({ ...formData, specs: { ...formData.specs, viscosity: e.target.value } })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-medium text-slate-600 dark:text-slate-400 mb-1 block">Shelf Life (Months)</label>
                <input aria-label="Shelf Life (Months)"
                  type="number"
                  placeholder="e.g. 36"
                  value={formData.specs?.shelfLifeMonths || 24}
                  onChange={(e) => setFormData({ ...formData, specs: { ...formData.specs, shelfLifeMonths: Number(e.target.value) } })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="font-medium text-slate-600 dark:text-slate-400 mb-1 block">Storage Temperature</label>
                <input aria-label="Storage Temperature"
                  type="text"
                  placeholder="e.g. 5–35 °C"
                  value={formData.specs?.storageTemp || ''}
                  onChange={(e) => setFormData({ ...formData, specs: { ...formData.specs, storageTemp: e.target.value } })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-medium text-slate-600 dark:text-slate-400 mb-1 block">Flash Point</label>
                <input aria-label="Flash Point"
                  type="text"
                  placeholder="e.g. Non-flammable"
                  value={formData.specs?.flashPoint || ''}
                  onChange={(e) => setFormData({ ...formData, specs: { ...formData.specs, flashPoint: e.target.value } })}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: REGULATORY & EVIDENCE */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Step 5: Regulatory Compliance & Provenance Evidence
              </h3>
              <p className="text-xs text-slate-500">
                Official registration credentials, evidence tier, and attached technical dossiers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Registration Number *
                </label>
                <input aria-label="Registration Number *"
                  type="text"
                  placeholder="e.g. EPA Reg. No. 279-9613, CIR-28392/2001"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Regulatory Authority *
                </label>
                <select aria-label="Regulatory Authority *"
                  value={formData.regulatoryAuthority}
                  onChange={(e) => setFormData({ ...formData, regulatoryAuthority: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  {vocabularies.regulatoryAuthorities.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Registration Status *
                </label>
                <select aria-label="Registration Status *"
                  value={formData.registrationStatus}
                  onChange={(e) => setFormData({ ...formData, registrationStatus: e.target.value as any })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  {vocabularies.registrationStatuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Evidence Tier *
                </label>
                <select aria-label="Evidence Tier *"
                  value={formData.verificationEvidence}
                  onChange={(e) => setFormData({ ...formData, verificationEvidence: e.target.value as any })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  {vocabularies.verificationEvidenceTypes.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: REVIEW & PUBLISH */}
        {currentStep === 6 && (
          <div className="space-y-5">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Step 6: Summary Audit & Publishing Action
              </h3>
              <p className="text-xs text-slate-500">
                Verify all fields before publishing to the live user portal.
              </p>
            </div>

            {/* Product Summary Preview Box */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-blue-600 font-bold uppercase">{formData.category}</span>
                  <div className="text-base font-bold text-slate-900 dark:text-white">{formData.brandName}</div>
                  <div className="text-slate-500">{formData.genericName}</div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-emerald-100 text-emerald-800 text-[10px]">
                    {formData.registrationStatus}
                  </span>
                  <div className="font-mono text-slate-400 mt-1">{formData.strength}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-400">Active Substance:</span>
                  <div className="font-semibold">{formData.activeIngredient}</div>
                </div>
                <div>
                  <span className="text-slate-400">CAS Number:</span>
                  <div className="font-mono font-semibold">{formData.casNumber}</div>
                </div>
                <div>
                  <span className="text-slate-400">Manufacturer:</span>
                  <div className="font-semibold">{formData.manufacturerName}</div>
                </div>
                <div>
                  <span className="text-slate-400">Registration:</span>
                  <div className="font-mono font-semibold">{formData.registrationNumber}</div>
                </div>
              </div>
            </div>

            {/* Publishing Selection */}
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3 text-xs">
              <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Publishing Decision</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Publishing this record immediately synchronizes the Single Source of Truth repository. It will instantly appear in the public catalog search, comparison matrices, and executive dashboard KPIs.
              </p>

              <div className="wizard-actions flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleSave('Published')}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Publish to User Portal Now</span>
                </button>
                <button
                  onClick={() => handleSave('Submitted for Review')}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors"
                >
                  Submit for Formal Peer Review
                </button>
                <button
                  onClick={() => handleSave('Draft')}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold"
                >
                  Keep as Internal Draft
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Bottom Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((s) => Math.max(s - 1, 1))}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 disabled:opacity-40 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous Step</span>
          </button>

          {currentStep < 6 ? (
            <button
              onClick={() => setCurrentStep((s) => Math.min(s + 1, 6))}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => handleSave('Published')}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Complete & Publish Record</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
