import React, { useState } from 'react';
import { SharedRepository } from '../../../data/repositories/sharedRepository';
import { ChemicalIngredient } from '../../../types';
import { useToast } from '../../../components/common/Toast';
import { AdminDialogPortal } from '../../../components/common/IntelligenceUI';
import { ChemicalStructureViewer } from '../../../components/common/ChemicalStructureViewer';
import {
  Atom,
  Search,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Save,
  X,
  ShieldAlert,
  Layers,
  Copy,
  Check,
} from 'lucide-react';

interface AdminIngredientsViewProps {
  onPreviewInUserPortal?: (casOrId: string) => void;
}

export const AdminIngredientsView: React.FC<AdminIngredientsViewProps> = ({
  onPreviewInUserPortal,
}) => {
  const { toast } = useToast();
  const repo = SharedRepository.getState();
  const vocabularies = repo.masterVocabularies;

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [editingIngredient, setEditingIngredient] = useState<ChemicalIngredient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIngredientForPreview, setSelectedIngredientForPreview] = useState<ChemicalIngredient | null>(
    repo.ingredients[0] || null
  );

  const [formData, setFormData] = useState<Partial<ChemicalIngredient>>({
    name: '',
    casNumber: '',
    iupacName: '',
    molecularFormula: 'C10H10',
    molecularWeight: 200,
    smiles: 'CC(=O)O',
    category: 'Agrochemical Active',
    physicalState: 'Crystalline solid',
    meltingPoint: '120 °C',
    waterSolubility: '10 mg/L',
    logP: 2.1,
    description: '',
    hazardStatements: ['H302: Harmful if swallowed'],
  });

  const filteredIngredients = repo.ingredients.filter((ing) => {
    const matchesSearch =
      !searchQuery ||
      ing.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ing.casNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ing.iupacName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'All' || ing.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleOpenCreate = () => {
    setEditingIngredient(null);
    setFormData({
      id: `ing-${Date.now()}`,
      name: '',
      casNumber: '',
      iupacName: '',
      molecularFormula: 'C18H14ClFN2O4',
      molecularWeight: 376.77,
      smiles: 'COc1ccc(cc1)C(=O)NC2=CC=C(Cl)C=C2',
      category: 'Agrochemical Active',
      physicalState: 'White crystalline solid',
      meltingPoint: '172 - 175 °C',
      boilingPoint: 'Decomposes before boiling',
      waterSolubility: '0.9 mg/L (pH 7, 20°C)',
      logP: 2.86,
      hazardStatements: ['H302: Harmful if swallowed', 'H410: Very toxic to aquatic life'],
      description: 'Novel synthetic active chemical substance for target formulations.',
      relatedProductIds: [],
      relatedManufacturers: ['Bayer CropScience AG'],
      structureSvgType: 'aromatic',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ing: ChemicalIngredient) => {
    setEditingIngredient(ing);
    setFormData({ ...ing });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.casNumber?.trim()) {
      toast('Name and CAS Number are required', 'warning');
      return;
    }

    try {
      SharedRepository.saveIngredient(formData as any, 'Chemical Database Curator');
      toast(
        editingIngredient
          ? `Updated chemical substance "${formData.name}"`
          : `Cataloged new substance "${formData.name}"`,
        'success'
      );
      setIsModalOpen(false);
    } catch (err: any) {
      toast(err.message || 'Error saving substance', 'warning');
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete substance "${name}"?`)) {
      SharedRepository.deleteIngredient(id, 'Admin Operator');
      toast(`Deleted substance "${name}"`, 'info');
    }
  };

  return (
    <div className="fx-page">
      {/* Top Banner */}
      <div className="fx-page-heading">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Atom className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Chemical Substance Master Catalog
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Maintain authoritative chemical records, CAS registry numbers, SMILES strings, molecular weights, and GHS hazard statements.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Catalog New Substance</span>
        </button>
      </div>

      {/* Main Viewport: Split List & 2D Chemical Structure Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: List & Filters (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search substance, CAS #, IUPAC name..."
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
              {vocabularies.ingredientCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Substance List */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredIngredients.map((ing) => (
              <div
                key={ing.id}
                onClick={() => setSelectedIngredientForPreview(ing)}
                className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer transition-colors ${
                  selectedIngredientForPreview?.id === ing.id
                    ? 'bg-blue-50/60 dark:bg-blue-950/40 border-l-4 border-l-blue-600'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-950/50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                      {ing.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      CAS: {ing.casNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5 font-mono">
                    {ing.molecularFormula} • MW {ing.molecularWeight} g/mol
                  </p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{ing.iupacName}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded text-[11px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {ing.category}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(ing);
                    }}
                    className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Edit Record"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(ing.id, ing.name);
                    }}
                    className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Delete Substance"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Chemical Structure Viewer & Dossier (1 col) */}
        <div className="space-y-4">
          {selectedIngredientForPreview ? (
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-20 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Chemical Structure Dossier
                </h3>
                {onPreviewInUserPortal && (
                  <button
                    onClick={() => onPreviewInUserPortal(selectedIngredientForPreview.casNumber)}
                    className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Public View</span>
                  </button>
                )}
              </div>

              {/* 2D Structure Canvas */}
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
                <ChemicalStructureViewer
                  name={selectedIngredientForPreview.name}
                  formula={selectedIngredientForPreview.molecularFormula}
                  weight={selectedIngredientForPreview.molecularWeight}
                  smiles={selectedIngredientForPreview.smiles}
                />
              </div>

              {/* Physical Attributes */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">IUPAC Name</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 text-right max-w-[60%] truncate">
                    {selectedIngredientForPreview.iupacName}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">SMILES String</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 text-right max-w-[60%] truncate">
                    {selectedIngredientForPreview.smiles}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Melting Point</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {selectedIngredientForPreview.meltingPoint || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Water Solubility</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {selectedIngredientForPreview.waterSolubility || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">logP Octanol/Water</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                    {selectedIngredientForPreview.logP}
                  </span>
                </div>
              </div>

              {/* Hazard Statements */}
              {selectedIngredientForPreview.hazardStatements && (
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider block mb-1">
                    GHS Hazard Classification
                  </span>
                  <div className="space-y-1">
                    {selectedIngredientForPreview.hazardStatements.map((h, i) => (
                      <div
                        key={i}
                        className="text-[11px] text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-1.5 rounded flex items-center gap-1.5"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              Select a substance to inspect its 2D chemical structure and properties
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      <AdminDialogPortal open={isModalOpen} label="Chemical substance editor" onClose={() => setIsModalOpen(false)}>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full my-8">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingIngredient ? 'Edit Chemical Substance' : 'Catalog New Substance'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                aria-label="Close editor"
                title="Close editor"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Substance Name *
                  </label>
                  <input aria-label="Substance Name *"
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    placeholder="e.g. Chlorantraniliprole"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    CAS Registry Number *
                  </label>
                  <input aria-label="CAS Registry Number *"
                    type="text"
                    required
                    value={formData.casNumber || ''}
                    onChange={(e) => setFormData({ ...formData, casNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    placeholder="e.g. 500008-45-7"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Molecular Formula
                  </label>
                  <input aria-label="Molecular Formula"
                    type="text"
                    value={formData.molecularFormula || ''}
                    onChange={(e) => setFormData({ ...formData, molecularFormula: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Molecular Weight (g/mol)
                  </label>
                  <input aria-label="Molecular Weight (g/mol)"
                    type="number"
                    step="0.01"
                    value={formData.molecularWeight || 0}
                    onChange={(e) => setFormData({ ...formData, molecularWeight: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  IUPAC Name
                </label>
                <input aria-label="IUPAC Name"
                  type="text"
                  value={formData.iupacName || ''}
                  onChange={(e) => setFormData({ ...formData, iupacName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  SMILES String
                </label>
                <input aria-label="SMILES String"
                  type="text"
                  value={formData.smiles || ''}
                  onChange={(e) => setFormData({ ...formData, smiles: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select aria-label="Category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  >
                    {vocabularies.ingredientCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    logP (Partition Coefficient)
                  </label>
                  <input aria-label="logP (Partition Coefficient)"
                    type="number"
                    step="0.1"
                    value={formData.logP ?? 2.0}
                    onChange={(e) => setFormData({ ...formData, logP: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingIngredient ? 'Save Changes' : 'Catalog Substance'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </AdminDialogPortal>
    </div>
  );
};
