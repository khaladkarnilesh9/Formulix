import React, { useState } from 'react';
import { SharedRepository } from '../../../data/repositories/sharedRepository';
import { useToast } from '../../../components/common/Toast';
import {
  Settings,
  Database,
  RotateCcw,
  Download,
  Trash2,
  ShieldCheck,
  Server,
  HardDrive,
  Info,
} from 'lucide-react';

interface AdminSettingsViewProps {
  operatorRole: string;
  onChangeOperatorRole: (role: string) => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  operatorRole,
  onChangeOperatorRole,
}) => {
  const { toast } = useToast();
  const repo = SharedRepository.getState();

  const handleResetToBenchmarkData = () => {
    if (confirm('Clear the legacy local editing cache? Local custom catalog edits will be removed. Django database records are not affected.')) {
      SharedRepository.resetToDefaultMocks();
      toast('Local editing cache cleared. Django records unchanged.', 'info');
    }
  };

  const handleDownloadBackup = () => {
    const data = SharedRepository.exportRepositoryData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formulix-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Master repository backup downloaded successfully', 'success');
  };

  return (
    <div className="fx-page">
      <div className="fx-page-heading">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Settings className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Admin System & Storage Configuration
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Legacy local cache and operator simulations. Django is the primary catalog.
            </p>
          </div>
        </div>
      </div>

      {/* Operator Role Simulator */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Active Administrative Persona
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configures the author signature tagged on audit log entries and publication lifecycle transitions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {[
            'Principal Architect',
            'Senior Reviewer',
            'Regulatory Lead',
            'Chemical Curator',
          ].map((role) => (
            <button
              key={role}
              onClick={() => {
                onChangeOperatorRole(role);
                toast(`Switched active operator role to "${role}"`, 'info');
              }}
              className={`p-3 rounded-xl border text-left text-xs transition-all ${
                operatorRole === role
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              <span className="block truncate">{role}</span>
              <span className="text-[10px] text-slate-400 mt-1 block">Level 4 Auth</span>
            </button>
          ))}
        </div>
      </div>

      {/* Repository Stats */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-blue-600" />
          <span>Local Storage Persistence Metrics</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950">
            <span className="text-slate-400">Products</span>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {repo.products.length} records
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950">
            <span className="text-slate-400">Formulation Recipes</span>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {repo.formulations.length} recipes
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950">
            <span className="text-slate-400">Chemical Substances</span>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {repo.ingredients.length} CAS records
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950">
            <span className="text-slate-400">Manufacturers</span>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {repo.manufacturers.length} entities
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950">
            <span className="text-slate-400">Regulatory Dockets</span>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {repo.regulatoryRecords.length} dockets
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950">
            <span className="text-slate-400">Audit Trail Entries</span>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {repo.auditLogs.length} events
            </p>
          </div>
        </div>
      </div>

      {/* Danger & Reset Controls */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
          Database Backup & Reset Actions
        </h3>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownloadBackup}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Download Master Backup</span>
          </button>

          <button
            onClick={handleResetToBenchmarkData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Clear Local Editing Cache</span>
          </button>
        </div>
      </div>
    </div>
  );
};
