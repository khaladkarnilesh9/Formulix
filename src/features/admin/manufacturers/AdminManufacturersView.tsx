import React, { useState } from 'react';
import { SharedRepository } from '../../../data/repositories/sharedRepository';
import { Manufacturer } from '../../../types';
import { useToast } from '../../../components/common/Toast';
import { AdminDialogPortal } from '../../../components/common/IntelligenceUI';
import {
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  Globe2,
  ExternalLink,
  ShieldCheck,
  Save,
  X,
  Award,
} from 'lucide-react';

interface AdminManufacturersViewProps {
  onPreviewInUserPortal?: (mfgId: string) => void;
}

export const AdminManufacturersView: React.FC<AdminManufacturersViewProps> = ({
  onPreviewInUserPortal,
}) => {
  const { toast } = useToast();
  const repo = SharedRepository.getState();
  const vocabularies = repo.masterVocabularies;

  const [searchQuery, setSearchQuery] = useState('');
  const [editingMfg, setEditingMfg] = useState<Manufacturer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<Manufacturer>>({
    name: '',
    country: 'Germany',
    headquarters: 'Leverkusen, Germany',
    founded: 1863,
    sector: ['Specialty Chemicals', 'Agrochemicals'],
    productCategories: ['Agrochemical'],
    productCount: 15,
    website: 'https://example.com',
    brandPortfolio: ['Confidor', 'Belt', 'Decis'],
    role: 'Manufacturer',
    overview: 'Global multinational chemical enterprise.',
    complianceCertifications: ['ISO 9001:2015', 'GLP Compliant', 'Responsible Care'],
  });

  const filteredMfg = repo.manufacturers.filter(
    (m) =>
      !searchQuery ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.brandPortfolio.some((b) => b.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenCreate = () => {
    setEditingMfg(null);
    setFormData({
      id: `mfg-${Date.now()}`,
      name: '',
      country: 'India',
      headquarters: 'Mumbai, India',
      founded: 1995,
      sector: ['Agrochemicals', 'Active Pharmaceutical Ingredients'],
      productCategories: ['Agrochemical'],
      productCount: 8,
      website: 'https://www.example.com',
      brandPortfolio: ['AgroMax', 'CropShield'],
      role: 'Contract Formulator',
      overview: 'Manufacturer of high-performance chemical formulations and technical actives.',
      complianceCertifications: ['ISO 9001:2015', 'GLP Certified', 'CIBRC Certified Facility'],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (mfg: Manufacturer) => {
    setEditingMfg(mfg);
    setFormData({ ...mfg });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.country?.trim()) {
      toast('Manufacturer Name and Country are required', 'warning');
      return;
    }

    try {
      SharedRepository.saveManufacturer(formData as any, 'Corporate Data Curator');
      toast(
        editingMfg
          ? `Updated manufacturer "${formData.name}"`
          : `Created manufacturer "${formData.name}"`,
        'success'
      );
      setIsModalOpen(false);
    } catch (err: any) {
      toast(err.message || 'Error saving manufacturer', 'warning');
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete manufacturer "${name}"?`)) {
      SharedRepository.deleteManufacturer(id, 'Admin Operator');
      toast(`Deleted manufacturer "${name}"`, 'info');
    }
  };

  return (
    <div className="fx-page">
      <div className="fx-page-heading">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Building2 className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Corporate Entity & Manufacturer Directory
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Maintain verified corporate entity profiles, multinational headquarters, compliance credentials, and commercial brand ownership.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Corporate Entity</span>
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search manufacturer name, country, or brand franchise..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
          />
        </div>
      </div>

      {/* Manufacturers Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredMfg.map((mfg) => (
          <div
            key={mfg.id}
            className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {mfg.country}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Est. {mfg.founded}
                </span>
              </div>

              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {mfg.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{mfg.headquarters}</p>

              <div className="mt-3">
                <span className="text-[11px] font-medium text-slate-400 block mb-1">
                  Brand Portfolio:
                </span>
                <div className="flex flex-wrap gap-1">
                  {mfg.brandPortfolio.map((brand, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                    >
                      {brand}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <span className="text-[11px] font-medium text-slate-400 block mb-1">
                  Compliance Certifications:
                </span>
                <div className="flex flex-wrap gap-1">
                  {mfg.complianceCertifications?.map((c, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>{c}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              {onPreviewInUserPortal && (
                <button
                  onClick={() => onPreviewInUserPortal(mfg.id)}
                  className="flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Public Profile</span>
                </button>
              )}

              <div className="flex items-center gap-1 ml-auto">
                <button
                  onClick={() => handleOpenEdit(mfg)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Edit Profile"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(mfg.id, mfg.name)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  title="Delete Profile"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <AdminDialogPortal open={isModalOpen} label="Manufacturer editor" onClose={() => setIsModalOpen(false)}>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full my-8">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingMfg ? 'Edit Manufacturer Profile' : 'Add Corporate Entity'}
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
                    Company Name *
                  </label>
                  <input aria-label="Company Name *"
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    placeholder="e.g. Syngenta AG"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Country *
                  </label>
                  <input aria-label="Country *"
                    type="text"
                    required
                    value={formData.country || ''}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    placeholder="e.g. Switzerland"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Headquarters
                  </label>
                  <input aria-label="Headquarters"
                    type="text"
                    value={formData.headquarters || ''}
                    onChange={(e) => setFormData({ ...formData, headquarters: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    placeholder="e.g. Basel, Switzerland"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Founded Year
                  </label>
                  <input aria-label="Founded Year"
                    type="number"
                    value={formData.founded || 2000}
                    onChange={(e) => setFormData({ ...formData, founded: parseInt(e.target.value) || 2000 })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Corporate Role / Tier
                </label>
                <select aria-label="Corporate Role / Tier"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                >
                  <option value="Manufacturer">Manufacturer</option>
                  <option value="Contract Formulator">Contract Formulator</option>
                  <option value="Distributor">Distributor</option>
                  <option value="Registrant">Registrant</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Brand Portfolio (Comma Separated)
                </label>
                <input aria-label="Brand Portfolio (Comma Separated)"
                  type="text"
                  value={formData.brandPortfolio?.join(', ') || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      brandPortfolio: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  placeholder="e.g. Confidor, Belt, Decis, Coragen"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Compliance Certifications (Comma Separated)
                </label>
                <input aria-label="Compliance Certifications (Comma Separated)"
                  type="text"
                  value={formData.complianceCertifications?.join(', ') || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      complianceCertifications: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  placeholder="e.g. ISO 9001:2015, GLP Certified, CIBRC Certified Facility"
                />
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
                  <span>{editingMfg ? 'Save Changes' : 'Create Entity'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </AdminDialogPortal>
    </div>
  );
};
