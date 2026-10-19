import React, { useState } from 'react';
import { SharedRepository } from '../../../data/repositories/sharedRepository';
import { TechnicalDocument } from '../../../types';
import { useToast } from '../../../components/common/Toast';
import { AdminDialogPortal } from '../../../components/common/IntelligenceUI';
import {
  FileText,
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  FileCheck,
  Save,
  X,
  FileCode,
} from 'lucide-react';

export const AdminDocumentsView: React.FC = () => {
  const { toast } = useToast();
  const repo = SharedRepository.getState();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [editingDoc, setEditingDoc] = useState<TechnicalDocument | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<TechnicalDocument>>({
    title: '',
    type: 'Safety Data Sheet (SDS)',
    documentNumber: '',
    issuer: 'Manufacturer Technical Services',
    publicationDate: '2024-01-01',
    format: 'PDF',
    fileSize: '1.2 MB',
    summary: '',
    sourceUrl: 'https://example.com/doc',
    verifiedStatus: 'Verified',
    relatedProducts: [],
    relatedIngredients: [],
  });

  const filteredDocs = repo.documents.filter((d) => {
    const matchesSearch =
      !searchQuery ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.documentNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'All' || d.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleOpenCreate = () => {
    setEditingDoc(null);
    setFormData({
      id: `doc-${Date.now()}`,
      title: 'Safety Data Sheet — Chlorantraniliprole 18.5% SC (GHS Rev 9)',
      type: 'Safety Data Sheet (SDS)',
      documentNumber: 'SDS-COR-2024-09',
      issuer: 'Regulatory Compliance Dossier Archive',
      publicationDate: '2024-03-15',
      format: 'PDF',
      fileSize: '1.8 MB',
      summary: 'Comprehensive hazard identification, composition on ingredients, and handling precautions.',
      sourceUrl: 'https://example.gov/sds',
      verifiedStatus: 'Verified',
      relatedProducts: [repo.products[0]?.brandName || 'Chlorantraniliprole 18.5% SC'],
      relatedIngredients: ['Chlorantraniliprole'],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (doc: TechnicalDocument) => {
    setEditingDoc(doc);
    setFormData({ ...doc });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      toast('Document title is required', 'warning');
      return;
    }

    try {
      SharedRepository.saveDocument(formData as any, 'Technical Documentation Lead');
      toast(
        editingDoc
          ? `Updated document "${formData.title}"`
          : `Archived new document "${formData.title}"`,
        'success'
      );
      setIsModalOpen(false);
    } catch (err: any) {
      toast(err.message || 'Error saving document', 'warning');
    }
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      SharedRepository.deleteDocument(id, 'Admin Operator');
      toast(`Deleted document "${title}"`, 'info');
    }
  };

  return (
    <div className="fx-page">
      <div className="fx-page-heading">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Technical Dossier, Patent & SDS Management
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative archive of formulation patents, safety data sheets (SDS), technical data sheets (TDS), and regulatory dossiers.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Upload / Register Document</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search document title, patent number, authority..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
        >
          <option value="All">All Document Types</option>
          <option value="Formulation Patent">Formulation Patents</option>
          <option value="Safety Data Sheet (SDS)">Safety Data Sheets (SDS)</option>
          <option value="Technical Data Sheet (TDS)">Technical Data Sheets (TDS)</option>
          <option value="Regulatory Approval">Regulatory Approvals</option>
          <option value="Product Label">Product Labels</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {doc.type}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full font-medium">
                  <FileCheck className="w-3 h-3" />
                  <span>{doc.verifiedStatus}</span>
                </span>
              </div>

              <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">
                {doc.title}
              </h3>

              <div className="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs space-y-1">
                {doc.documentNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ref / Number:</span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                      {doc.documentNumber}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Issuer:</span>
                  <span className="text-slate-700 dark:text-slate-300 truncate max-w-[60%]">
                    {doc.issuer}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date & Size:</span>
                  <span className="text-slate-600 dark:text-slate-400 font-mono">
                    {doc.publicationDate} ({doc.format}, {doc.fileSize})
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">{doc.format}</span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(doc)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Edit Document Meta"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(doc.id, doc.title)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  title="Delete Document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AdminDialogPortal open={isModalOpen} label="Document metadata editor" onClose={() => setIsModalOpen(false)}>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingDoc ? 'Edit Document Metadata' : 'Register Technical Document'}
              </h2>
              <button aria-label="Close editor" title="Close editor" onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Document Title *
                </label>
                <input aria-label="Document Title *"
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Document Type *
                  </label>
                  <select aria-label="Document Type *"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Safety Data Sheet (SDS)">Safety Data Sheet (SDS)</option>
                    <option value="Technical Data Sheet (TDS)">Technical Data Sheet (TDS)</option>
                    <option value="Formulation Patent">Formulation Patent</option>
                    <option value="Regulatory Approval">Regulatory Approval</option>
                    <option value="Product Label">Product Label</option>
                    <option value="Scientific Literature">Scientific Literature</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ref / Document #
                  </label>
                  <input aria-label="Ref / Document #"
                    type="text"
                    value={formData.documentNumber || ''}
                    onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Authority or Issuer
                </label>
                <input aria-label="Authority or Issuer"
                  type="text"
                  value={formData.issuer || ''}
                  onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
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
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Document</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </AdminDialogPortal>
    </div>
  );
};
