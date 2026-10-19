import React, { useState } from 'react';
import { SharedRepository } from '../../../data/repositories/sharedRepository';
import { MasterVocabularies } from '../../../data/schemas/canonicalSchemas';
import { useToast } from '../../../components/common/Toast';
import {
  Sliders,
  Plus,
  Trash2,
  Save,
  Check,
  Layers,
  HelpCircle,
  FolderTree,
} from 'lucide-react';

export const AdminMasterDataView: React.FC = () => {
  const { toast } = useToast();
  const repo = SharedRepository.getState();
  const [vocabularies, setVocabularies] = useState<MasterVocabularies>(repo.masterVocabularies);
  const [activeCategory, setActiveCategory] = useState<keyof MasterVocabularies>('formulationTypes');
  const [newEntryValue, setNewEntryValue] = useState('');

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntryValue.trim()) return;

    const currentList = (vocabularies[activeCategory] as any[]) || [];
    if (currentList.includes(newEntryValue.trim())) {
      toast('Entry already exists in this vocabulary', 'warning');
      return;
    }

    const updated = {
      ...vocabularies,
      [activeCategory]: [...currentList, newEntryValue.trim()],
    };

    setVocabularies(updated);
    SharedRepository.updateMasterVocabularies(updated, 'Ontology Lead');
    setNewEntryValue('');
    toast(`Added "${newEntryValue.trim()}" to ${String(activeCategory)}`, 'success');
  };

  const handleRemoveEntry = (val: string) => {
    const currentList = (vocabularies[activeCategory] as any[]) || [];
    const updated = {
      ...vocabularies,
      [activeCategory]: currentList.filter((item) => item !== val),
    };
    setVocabularies(updated);
    SharedRepository.updateMasterVocabularies(updated, 'Ontology Lead');
    toast(`Removed "${val}"`, 'info');
  };

  const categoryLabels: Record<keyof MasterVocabularies, string> = {
    formulationTypes: 'Formulation Types & Dosage Forms',
    sectors: 'Industry Sectors & Divisions',
    ingredientCategories: 'Chemical Substance Categories',
    ingredientFunctions: 'Formulation Excipient Functional Classes',
    jurisdictions: 'Global Regulatory Jurisdictions',
    regulatoryAuthorities: 'Authoritative Regulatory Bodies',
    registrationStatuses: 'Registration Lifecycle Statuses',
    verificationEvidenceTypes: 'Verification Evidence Levels',
    concentrationUnits: 'Concentration & Strength Units',
    companyRoles: 'Corporate Manufacturer Tiers',
    documentTypes: 'Technical Document Classifications',
  };

  return (
    <div className="fx-page">
      <div className="fx-page-heading">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Sliders className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Controlled Vocabularies & Taxonomies
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Standardize scientific ontology, chemical functional classes, dosage abbreviations, and regulatory bodies across all entry wizards.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left: Vocabulary selector */}
        <div className="space-y-1 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-2">
            Taxonomy Catalogs
          </div>
          {(Object.keys(categoryLabels) as (keyof MasterVocabularies)[]).map((catKey) => (
            <button
              key={catKey}
              onClick={() => setActiveCategory(catKey)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                activeCategory === catKey
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="truncate">{categoryLabels[catKey]}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800">
                {(vocabularies[catKey] as any[])?.length || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Right: Items Editor */}
        <div className="md:col-span-3 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {categoryLabels[activeCategory]}
                </h3>
                <p className="text-xs text-slate-500">
                  Controls the allowed dropdown values in admin and user portal filters.
                </p>
              </div>
            </div>

            {/* Add new entry input */}
            <form onSubmit={handleAddEntry} className="flex gap-2">
              <input
                type="text"
                value={newEntryValue}
                onChange={(e) => setNewEntryValue(e.target.value)}
                placeholder={`Add new ${categoryLabels[activeCategory]} term...`}
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Term</span>
              </button>
            </form>

            {/* List of current vocabulary entries */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              {((vocabularies[activeCategory] as any[]) || []).map((val, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 group"
                >
                  <span className="font-medium truncate mr-2">{val}</span>
                  <button
                    onClick={() => handleRemoveEntry(val)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove term"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
