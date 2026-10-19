import React, { useState } from 'react';
import { SharedRepository } from '../../../data/repositories/sharedRepository';
import { RegulatoryRecord } from '../../../types';
import { useToast } from '../../../components/common/Toast';
import { AdminDialogPortal } from '../../../components/common/IntelligenceUI';
import {
  ShieldCheck,
  Search,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Calendar,
  Building,
  Save,
  X,
  Clock,
  AlertTriangle,
} from 'lucide-react';

export const AdminRegistrationsView: React.FC = () => {
  const { toast } = useToast();
  const repo = SharedRepository.getState();
  const vocabularies = repo.masterVocabularies;

  const [searchQuery, setSearchQuery] = useState('');
  const [authorityFilter, setAuthorityFilter] = useState('All');
  const [editingRecord, setEditingRecord] = useState<RegulatoryRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<RegulatoryRecord>>({
    registrationNumber: '',
    productName: '',
    activeIngredient: '',
    regulatoryAuthority: 'Central Insecticides Board & Registration Committee (CIBRC)',
    country: 'India',
    approvalStatus: 'Approved',
    registrationHolder: 'Bayer CropScience AG',
    approvalDate: '2023-01-15',
    expiryDate: '2033-01-14',
    sourceDocument: 'Official Gazette Notification No. CIBRC/2023/182',
    officialLink: 'https://cibrc.nic.in/gazette/sample',
  });

  const filteredRecords = repo.regulatoryRecords.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      r.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.activeIngredient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.registrationHolder.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAuth = authorityFilter === 'All' || r.regulatoryAuthority.includes(authorityFilter);
    return matchesSearch && matchesAuth;
  });

  const handleOpenCreate = () => {
    setEditingRecord(null);
    setFormData({
      id: `reg-${Date.now()}`,
      registrationNumber: `REG-${Date.now().toString().slice(-6)}`,
      productName: repo.products[0]?.brandName || 'Chlorantraniliprole 18.5% SC',
      activeIngredient: 'Chlorantraniliprole',
      regulatoryAuthority: 'Central Insecticides Board & Registration Committee (CIBRC)',
      country: 'India',
      approvalStatus: 'Approved',
      registrationHolder: 'Bayer CropScience AG',
      approvalDate: '2023-06-01',
      expiryDate: '2033-05-31',
      sourceDocument: 'Gazette Docket CIR-92831/2023',
      officialLink: 'https://cibrc.nic.in',
      lastVerifiedDate: new Date().toISOString().slice(0, 10),
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: RegulatoryRecord) => {
    setEditingRecord(rec);
    setFormData({ ...rec });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.registrationNumber?.trim() || !formData.productName?.trim()) {
      toast('Registration Number and Product Name are required', 'warning');
      return;
    }

    try {
      SharedRepository.saveRegulatoryRecord(formData as any, 'Regulatory Affairs Specialist');
      toast(
        editingRecord
          ? `Updated regulatory registration ${formData.registrationNumber}`
          : `Added new regulatory registration ${formData.registrationNumber}`,
        'success'
      );
      setIsModalOpen(false);
    } catch (err: any) {
      toast(err.message || 'Error saving registration', 'warning');
    }
  };

  const handleDelete = (id: string, regNum: string) => {
    if (confirm(`Are you sure you want to delete regulatory registration "${regNum}"?`)) {
      SharedRepository.deleteRegulatoryRecord(id, 'Regulatory Affairs Specialist');
      toast(`Deleted regulatory record "${regNum}"`, 'info');
    }
  };

  return (
    <div className="fx-page">
      <div className="fx-page-heading">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Regulatory Registrations & Global Dockets
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Maintain official regulatory registrations, gazette notifications, authorization validity periods, and jurisdiction authority dockets.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Regulatory Docket</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search registration number, docket, active substance..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <select
          value={authorityFilter}
          onChange={(e) => setAuthorityFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
        >
          <option value="All">All Regulatory Authorities</option>
          <option value="CIBRC">CIBRC (India)</option>
          <option value="EPA">US EPA (United States)</option>
          <option value="EFSA">EFSA / EU Authority (Europe)</option>
          <option value="PMDA">PMDA / MAFF (Japan)</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="fx-data-table w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">Docket / Reg Number</th>
              <th className="p-3">Commercial Product</th>
              <th className="p-3">Active Substance</th>
              <th className="p-3">Authority & Country</th>
              <th className="p-3">Holder</th>
              <th className="p-3">Validity Period</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredRecords.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/60 transition-colors">
                <td className="p-3 font-mono font-medium text-slate-900 dark:text-white">
                  {r.registrationNumber}
                </td>
                <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                  {r.productName}
                </td>
                <td className="p-3 text-slate-600 dark:text-slate-400">
                  {r.activeIngredient}
                </td>
                <td className="p-3">
                  <div className="text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title={r.regulatoryAuthority}>
                    {r.regulatoryAuthority}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">{r.country}</div>
                </td>
                <td className="p-3 text-slate-600 dark:text-slate-400">
                  {r.registrationHolder}
                </td>
                <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                  {r.approvalDate} → {r.expiryDate}
                </td>
                <td className="p-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      r.approvalStatus === 'Approved'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {r.approvalStatus}
                  </span>
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => handleOpenEdit(r)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Edit Record"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(r.id, r.registrationNumber)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 ml-1"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminDialogPortal open={isModalOpen} label="Regulatory registration editor" onClose={() => setIsModalOpen(false)}>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingRecord ? 'Edit Regulatory Dossier' : 'New Regulatory Docket'}
              </h2>
              <button aria-label="Close editor" title="Close editor" onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Registration / Docket Number *
                  </label>
                  <input aria-label="Registration / Docket Number *"
                    type="text"
                    required
                    value={formData.registrationNumber || ''}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Commercial Product *
                  </label>
                  <input aria-label="Commercial Product *"
                    type="text"
                    required
                    value={formData.productName || ''}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
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
                    Country
                  </label>
                  <input aria-label="Country"
                    type="text"
                    value={formData.country || ''}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Regulatory Authority
                </label>
                <input aria-label="Regulatory Authority"
                  type="text"
                  value={formData.regulatoryAuthority || ''}
                  onChange={(e) => setFormData({ ...formData, regulatoryAuthority: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Approval Date
                  </label>
                  <input aria-label="Approval Date"
                    type="date"
                    value={formData.approvalDate || ''}
                    onChange={(e) => setFormData({ ...formData, approvalDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expiry Date
                  </label>
                  <input aria-label="Expiry Date"
                    type="date"
                    value={formData.expiryDate || ''}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
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
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </AdminDialogPortal>
    </div>
  );
};
