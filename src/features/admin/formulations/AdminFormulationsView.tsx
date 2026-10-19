import React, { useState } from 'react';
import { SharedRepository, AdminFormulationRecord } from '../../../data/repositories/sharedRepository';
import { RecordPublishStatus } from '../../../data/schemas/canonicalSchemas';
import { useToast } from '../../../components/common/Toast';
import { AdminDialogPortal } from '../../../components/common/IntelligenceUI';
import { CompositionItem } from '../../../types';
import {
  FlaskConical,
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  FileText,
  Save,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AdminFormulationsViewProps {
  onPreviewInUserPortal?: (formulationId: string) => void;
}

export const AdminFormulationsView: React.FC<AdminFormulationsViewProps> = ({
  onPreviewInUserPortal,
}) => {
  const { toast } = useToast();
  const repo = SharedRepository.getState();
  const vocabularies = repo.masterVocabularies;

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [editingFormulation, setEditingFormulation] = useState<AdminFormulationRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<AdminFormulationRecord>>({
    name: '',
    category: 'Agrochemical',
    formulationType: 'SC (Suspension Concentrate)',
    intendedApplication: '',
    targetIndustry: 'Crop Protection',
    verificationStatus: 'Standard Formulation Reference',
    verificationEvidence: 'Manufacturer disclosed',
    sourceReference: '',
    publishStatus: 'Published',
    composition: [],
    properties: {
      ph: '6.5 - 7.5',
      viscosity: '600 mPa·s',
      density: '1.12 g/cm³',
      particleSize: 'd50 = 1.8 µm',
      stability: 'Passes accelerated storage (54°C, 14 days)',
      shelfLife: '24 Months',
      appearance: 'Off-white suspension',
    },
    manufacturingInfo: {
      processOverview: 'High shear wet media milling in bead mill.',
      mixingSequence: ['Charge water and dispersant', 'Add technical active', 'Milled to d50 < 2µm', 'Add xanthan gum thickener'],
      processingConditions: ['Temperature < 35°C', 'Agitator RPM 800'],
      equipment: ['Horizontal Bead Mill', 'Stainless Steel Reactor'],
      qcParameters: ['Active assay ± 1.5%', 'Wet sieve residue < 0.1%'],
    },
  });

  const filteredFormulations = repo.formulations.filter((f) => {
    const matchesSearch =
      !searchQuery ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.formulationType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.composition.some((c) => c.ingredient.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'All' || f.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || f.publishStatus === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleOpenCreate = () => {
    setEditingFormulation(null);
    setFormData({
      id: `form-${Date.now()}`,
      name: '',
      category: 'Agrochemical',
      formulationType: 'SC (Suspension Concentrate)',
      intendedApplication: 'Systemic foliar spray for target crops',
      targetIndustry: 'Crop Protection',
      verificationStatus: 'Standard Formulation Reference',
      verificationEvidence: 'Manufacturer disclosed',
      sourceReference: 'Global Regulatory Filing & Gazette Bulletin',
      publishStatus: 'Published',
      composition: [
        {
          ingredient: 'Chlorantraniliprole Tech',
          cas: '500008-45-7',
          chemicalFunction: 'Active Ingredient',
          concentration: '18.5% w/w',
          ingredientCategory: 'Active',
          sourceEvidence: 'Manufacturer disclosed',
        },
        {
          ingredient: 'Sodium alkyl naphthalene sulfonate',
          cas: '26264-58-4',
          chemicalFunction: 'Dispersing Agent',
          concentration: '3.0% w/w',
          ingredientCategory: 'Surfactant',
          sourceEvidence: 'Patent disclosed',
        },
        {
          ingredient: 'Xanthan Gum',
          cas: '11138-66-2',
          chemicalFunction: 'Thickener & Rheology Modifier',
          concentration: '0.2% w/w',
          ingredientCategory: 'Stabilizer',
          sourceEvidence: 'Manufacturer disclosed',
        },
        {
          ingredient: 'Deionized Water',
          cas: '7732-18-5',
          chemicalFunction: 'Carrier Solvent',
          concentration: 'Q.S. to 100%',
          ingredientCategory: 'Carrier',
          sourceEvidence: 'Manufacturer disclosed',
        },
      ],
      properties: {
        ph: '6.5 - 7.5',
        viscosity: '600 mPa·s',
        density: '1.12 g/cm³',
        particleSize: 'd50 = 1.8 µm',
        stability: 'Passes accelerated storage (54°C, 14 days)',
        shelfLife: '24 Months',
        appearance: 'Off-white suspension',
      },
      manufacturingInfo: {
        processOverview: 'High shear wet media milling in bead mill.',
        mixingSequence: ['Charge water and wetting agent', 'Add technical active', 'Milled to d50 < 2µm', 'Add xanthan gum stabilizer'],
        processingConditions: ['Temperature < 35°C', 'Agitator RPM 800'],
        equipment: ['Horizontal Bead Mill', 'SS-316 Reactor'],
        qcParameters: ['Active assay ± 1.5%', 'Wet sieve residue < 0.1%'],
      },
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (formulation: AdminFormulationRecord) => {
    setEditingFormulation(formulation);
    setFormData({ ...formulation });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast('Formulation name is required', 'warning');
      return;
    }

    try {
      SharedRepository.saveFormulation(
        formData as any,
        'Formulation Lead Architect'
      );
      toast(
        editingFormulation
          ? `Updated formulation "${formData.name}"`
          : `Created new formulation "${formData.name}"`,
        'success'
      );
      setIsModalOpen(false);
    } catch (err: any) {
      toast(err.message || 'Error saving formulation', 'warning');
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete formulation "${name}"?`)) {
      SharedRepository.deleteFormulation(id, 'Admin Operator');
      toast(`Deleted formulation "${name}"`, 'info');
    }
  };

  // Composition item handlers
  const handleAddCompositionItem = () => {
    const newItem: CompositionItem = {
      ingredient: '',
      cas: '',
      chemicalFunction: 'Active Ingredient',
      concentration: '5.0% w/w',
      ingredientCategory: 'Active',
      sourceEvidence: 'Manufacturer disclosed',
    };
    setFormData({
      ...formData,
      composition: [...(formData.composition || []), newItem],
    });
  };

  const handleUpdateCompositionItem = (index: number, field: keyof CompositionItem, val: string) => {
    const updated = [...(formData.composition || [])];
    updated[index] = { ...updated[index], [field]: val };
    setFormData({ ...formData, composition: updated });
  };

  const handleRemoveCompositionItem = (index: number) => {
    const updated = (formData.composition || []).filter((_, i) => i !== index);
    setFormData({ ...formData, composition: updated });
  };

  return (
    <div className="fx-page">
      {/* Header */}
      <div className="fx-page-heading">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <FlaskConical className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Formulation Recipe Master
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage comprehensive formulation recipes, full active and excipient compositions, processing sequences, and physicochemical profiles.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Formulation Recipe</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search formulation name, type, ingredient CAS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
        >
          <option value="All">All Categories</option>
          {vocabularies.sectors.map((sec) => (
            <option key={sec} value={sec}>
              {sec}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
        >
          <option value="All">All Statuses</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
          <option value="Approved">Approved</option>
        </select>
      </div>

      {/* Formulations List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFormulations.map((f) => (
          <div
            key={f.id}
            className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {f.category}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    f.publishStatus === 'Published'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {f.publishStatus}
                </span>
              </div>

              <h3 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1">
                {f.name}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {f.formulationType}
              </p>

              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                {f.intendedApplication}
              </p>

              {/* Composition Preview */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <div className="text-[11px] font-medium text-slate-500 mb-1 flex items-center justify-between">
                  <span>Composition Elements</span>
                  <span className="font-mono text-slate-400">{f.composition.length} items</span>
                </div>
                <div className="space-y-1">
                  {f.composition.slice(0, 3).map((c, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded"
                    >
                      <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                        {c.ingredient}
                      </span>
                      <span className="font-mono text-slate-500 text-[10px] shrink-0 ml-2">
                        {c.concentration}
                      </span>
                    </div>
                  ))}
                  {f.composition.length > 3 && (
                    <div className="text-[10px] text-slate-400 italic text-center">
                      +{f.composition.length - 3} more excipients
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              {onPreviewInUserPortal && (
                <button
                  onClick={() => onPreviewInUserPortal(f.id)}
                  className="flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Public Dossier</span>
                </button>
              )}

              <div className="flex items-center gap-1 ml-auto">
                <button
                  onClick={() => handleOpenEdit(f)}
                  className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Edit Recipe"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(f.id, f.name)}
                  className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Delete Formulation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Create Modal */}
      <AdminDialogPortal open={isModalOpen} label="Formulation editor" onClose={() => setIsModalOpen(false)}>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col my-8">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600">
                  <FlaskConical className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingFormulation ? 'Edit Formulation Recipe' : 'New Formulation Recipe'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Propagates live to the User Portal Formulation Discovery engine
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                aria-label="Close editor"
                title="Close editor"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Meta */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Recipe / Formulation Name *
                  </label>
                  <input aria-label="Recipe / Formulation Name *"
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
                    placeholder="e.g. Chlorantraniliprole 18.5% SC Master Recipe"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Industry Sector *
                  </label>
                  <select aria-label="Industry Sector *"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  >
                    {vocabularies.sectors.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Formulation Type / Dosage Form *
                  </label>
                  <select aria-label="Formulation Type / Dosage Form *"
                    value={formData.formulationType}
                    onChange={(e) => setFormData({ ...formData, formulationType: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  >
                    {vocabularies.formulationTypes.map((ft) => (
                      <option key={ft} value={ft}>
                        {ft}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Publication Lifecycle Status *
                  </label>
                  <select aria-label="Publication Lifecycle Status *"
                    value={formData.publishStatus}
                    onChange={(e) => setFormData({ ...formData, publishStatus: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Published">Published (Live in User Portal)</option>
                    <option value="Approved">Approved (Ready to Publish)</option>
                    <option value="Submitted for Review">Submitted for Review</option>
                    <option value="Draft">Draft (Internal Only)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Intended Application & Spectrum
                </label>
                <textarea aria-label="Intended Application & Spectrum"
                  rows={2}
                  value={formData.intendedApplication || ''}
                  onChange={(e) => setFormData({ ...formData, intendedApplication: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
                  placeholder="Target crops, pests, therapeutic dose, or substrate..."
                />
              </div>

              {/* Composition Table Builder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Recipe Composition Matrix (100% Quantitative)
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddCompositionItem}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded hover:bg-slate-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Excipient / Active</span>
                  </button>
                </div>

                <div className="ingredient-cards border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
                  <table className="fx-data-table w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-2">Chemical Substance</th>
                        <th className="p-2">CAS Number</th>
                        <th className="p-2">Function</th>
                        <th className="p-2">Concentration</th>
                        <th className="p-2">Source</th>
                        <th className="p-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(formData.composition || []).map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/50">
                          <td data-label="Chemical substance" className="p-2">
                            <input
                              type="text"
                              value={c.ingredient}
                              aria-label={`Ingredient ${idx + 1} name`}
                              onChange={(e) => handleUpdateCompositionItem(idx, 'ingredient', e.target.value)}
                              placeholder="Substance Name"
                              className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                            />
                          </td>
                          <td data-label="CAS number" className="p-2">
                            <input
                              type="text"
                              value={c.cas}
                              aria-label={`Ingredient ${idx + 1} CAS number`}
                              onChange={(e) => handleUpdateCompositionItem(idx, 'cas', e.target.value)}
                              placeholder="CAS #"
                              className="w-28 px-2 py-1 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                            />
                          </td>
                          <td data-label="Function" className="p-2">
                            <input
                              type="text"
                              value={c.chemicalFunction}
                              aria-label={`Ingredient ${idx + 1} function`}
                              onChange={(e) => handleUpdateCompositionItem(idx, 'chemicalFunction', e.target.value)}
                              placeholder="e.g. Dispersant"
                              className="w-28 px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                            />
                          </td>
                          <td data-label="Concentration" className="p-2">
                            <input
                              type="text"
                              value={c.concentration}
                              aria-label={`Ingredient ${idx + 1} concentration`}
                              onChange={(e) => handleUpdateCompositionItem(idx, 'concentration', e.target.value)}
                              placeholder="e.g. 5% w/w"
                              className="w-24 px-2 py-1 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                            />
                          </td>
                          <td data-label="Source" className="p-2">
                            <select
                              value={c.sourceEvidence}
                              aria-label={`Ingredient ${idx + 1} source`}
                              onChange={(e) => handleUpdateCompositionItem(idx, 'sourceEvidence', e.target.value)}
                              className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                            >
                              <option value="Regulatory verified">Regulatory verified</option>
                              <option value="Manufacturer disclosed">Manufacturer disclosed</option>
                              <option value="Patent disclosed">Patent disclosed</option>
                              <option value="Literature reported">Literature reported</option>
                            </select>
                          </td>
                          <td data-label="Action" className="p-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveCompositionItem(idx)}
                              aria-label={`Remove ingredient ${idx + 1}`}
                              className="p-1 text-rose-500 hover:text-rose-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Physicochemical Properties */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Physicochemical Specifications
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">pH Range</label>
                    <input aria-label="pH Range"
                      type="text"
                      value={formData.properties?.ph || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          properties: {
                            ph: e.target.value,
                            viscosity: formData.properties?.viscosity || '600 mPa·s',
                            density: formData.properties?.density || '1.12 g/cm³',
                            particleSize: formData.properties?.particleSize || 'd50 = 1.8 µm',
                            stability: formData.properties?.stability || 'Stable',
                            shelfLife: formData.properties?.shelfLife || '24 Months',
                            appearance: formData.properties?.appearance || 'Uniform suspension',
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                      placeholder="e.g. 6.5 - 7.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Density / Specific Gravity</label>
                    <input aria-label="Density / Specific Gravity"
                      type="text"
                      value={formData.properties?.density || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          properties: {
                            ph: formData.properties?.ph || '7.0',
                            viscosity: formData.properties?.viscosity || '600 mPa·s',
                            density: e.target.value,
                            particleSize: formData.properties?.particleSize || 'd50 = 1.8 µm',
                            stability: formData.properties?.stability || 'Stable',
                            shelfLife: formData.properties?.shelfLife || '24 Months',
                            appearance: formData.properties?.appearance || 'Uniform suspension',
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                      placeholder="e.g. 1.12 g/cm³"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Viscosity</label>
                    <input aria-label="Viscosity"
                      type="text"
                      value={formData.properties?.viscosity || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          properties: {
                            ph: formData.properties?.ph || '7.0',
                            viscosity: e.target.value,
                            density: formData.properties?.density || '1.12 g/cm³',
                            particleSize: formData.properties?.particleSize || 'd50 = 1.8 µm',
                            stability: formData.properties?.stability || 'Stable',
                            shelfLife: formData.properties?.shelfLife || '24 Months',
                            appearance: formData.properties?.appearance || 'Uniform suspension',
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                      placeholder="e.g. 600 mPa·s"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingFormulation ? 'Save Changes' : 'Create Formulation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </AdminDialogPortal>
    </div>
  );
};
