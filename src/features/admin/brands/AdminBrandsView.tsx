import React, { useState } from 'react';
import { SharedRepository } from '../../../data/repositories/sharedRepository';
import { useToast } from '../../../components/common/Toast';
import { AdminDialogPortal } from '../../../components/common/IntelligenceUI';
import {
  Tag,
  Search,
  Building2,
  Package,
  Globe2,
  Sparkles,
  ExternalLink,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
} from 'lucide-react';

interface AdminBrandsViewProps {
  onSelectProduct?: (productId: string) => void;
}

interface BrandEntry {
  id: string;
  name: string;
  manufacturerName: string;
  category: string;
  activeIngredient: string;
  strength: string;
  formulationType: string;
  registeredCountries: string[];
  status: string;
}

export const AdminBrandsView: React.FC<AdminBrandsViewProps> = ({ onSelectProduct }) => {
  const { toast } = useToast();
  const repo = SharedRepository.getState();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandEntry | null>(null);

  // Compute brands from products & manufacturers
  const brands: BrandEntry[] = repo.products.map((p) => ({
    id: p.id,
    name: p.brandName,
    manufacturerName: p.manufacturerName,
    category: p.category,
    activeIngredient: p.activeIngredient,
    strength: p.strength,
    formulationType: p.formulationType,
    registeredCountries: [p.country],
    status: p.registrationStatus,
  }));

  const [formData, setFormData] = useState<Partial<BrandEntry>>({
    name: '',
    manufacturerName: repo.manufacturers[0]?.name || 'Bayer CropScience AG',
    category: 'Agrochemical',
    activeIngredient: 'Chlorantraniliprole',
    strength: '200 g/L',
    formulationType: 'SC (Suspension Concentrate)',
    status: 'Approved',
  });

  const filteredBrands = brands.filter(
    (b) =>
      !searchQuery ||
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.manufacturerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.activeIngredient.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenEdit = (brand: BrandEntry) => {
    setEditingBrand(brand);
    setFormData({ ...brand });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast('Brand name is required', 'warning');
      return;
    }

    if (editingBrand) {
      // Update underlying product
      const target = repo.products.find((p) => p.id === editingBrand.id);
      if (target) {
        SharedRepository.saveProduct(
          {
            ...target,
            brandName: formData.name!,
            manufacturerName: formData.manufacturerName!,
            category: formData.category as any,
            activeIngredient: formData.activeIngredient!,
            strength: formData.strength!,
            formulationType: formData.formulationType!,
          },
          'Brand Intelligence Specialist'
        );
        toast(`Updated brand trademark "${formData.name}"`, 'success');
      }
    } else {
      // Create new commercial product under this brand
      SharedRepository.saveProduct(
        {
          brandName: formData.name!,
          genericName: `${formData.activeIngredient} Commercial Formulation`,
          activeIngredient: formData.activeIngredient!,
          manufacturerName: formData.manufacturerName!,
          category: formData.category as any,
          strength: formData.strength!,
          formulationType: formData.formulationType!,
          publishStatus: 'Published',
        },
        'Brand Intelligence Specialist'
      );
      toast(`Created brand record "${formData.name}"`, 'success');
    }
    setIsModalOpen(false);
  };

  return (
    <div className="fx-page">
      <div className="fx-page-heading">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Tag className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Brand Trademarks & Franchises
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Global trademark franchises, corporate brand ownership portfolios, and commercial distribution mappings.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingBrand(null);
            setFormData({
              name: '',
              manufacturerName: repo.manufacturers[0]?.name || 'Bayer CropScience AG',
              category: 'Agrochemical',
              activeIngredient: 'Chlorantraniliprole',
              strength: '18.5% SC',
              formulationType: 'SC (Suspension Concentrate)',
              status: 'Approved',
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Brand Record</span>
        </button>
      </div>

      <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search brand trademarks, owners, active ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBrands.map((b) => (
          <div
            key={b.id}
            className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {b.category}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  {b.status}
                </span>
              </div>

              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {b.name}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>{b.manufacturerName}</span>
              </p>

              <div className="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Active AI:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{b.activeIngredient}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Strength:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{b.strength}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Type:</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400">{b.formulationType}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              {onSelectProduct && (
                <button
                  onClick={() => onSelectProduct(b.id)}
                  className="flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>View Product</span>
                </button>
              )}

              <button
                onClick={() => handleOpenEdit(b)}
                className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 ml-auto"
                title="Edit Brand"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <AdminDialogPortal open={isModalOpen} label="Brand editor" onClose={() => setIsModalOpen(false)}>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingBrand ? 'Edit Brand Trademark' : 'Create Brand Trademark'}
              </h2>
              <button aria-label="Close editor" title="Close editor" onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Brand Trademark Name *
                </label>
                <input aria-label="Brand Trademark Name *"
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  placeholder="e.g. Coragen 200 SC"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Manufacturer Owner *
                </label>
                <select aria-label="Manufacturer Owner *"
                  value={formData.manufacturerName}
                  onChange={(e) => setFormData({ ...formData, manufacturerName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                >
                  {repo.manufacturers.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Active Ingredient
                  </label>
                  <input aria-label="Active Ingredient"
                    type="text"
                    value={formData.activeIngredient || ''}
                    onChange={(e) => setFormData({ ...formData, activeIngredient: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Strength / Concentration
                  </label>
                  <input aria-label="Strength / Concentration"
                    type="text"
                    value={formData.strength || ''}
                    onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
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
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Brand</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </AdminDialogPortal>
    </div>
  );
};
