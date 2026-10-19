import React from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useToast } from '../../components/common/Toast';
import {
  Settings,
  Database,
  Moon,
  Sun,
  Download,
  Trash2,
  ShieldCheck,
  Server,
  Info,
  CheckCircle2,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { toast } = useToast();
  const { theme, toggleTheme, setTheme, savedProductIds, savedFormulationIds, researchNotes } = useWorkspaceStore();

  const handleExportBackup = () => {
    const backup = {
      timestamp: new Date().toISOString(),
      platform: 'Formulix Scientific SaaS',
      savedProductIds,
      savedFormulationIds,
      researchNotes,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formulix_workspace_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Workspace backup exported as JSON');
  };

  const handleClearAllStorage = () => {
    if (window.confirm('Reset workspace storage and restore default catalog benchmark?')) {
      localStorage.removeItem('formulix_workspace_state_v1');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 w-full pb-16">
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Platform Governance & Workspace Settings
        </h2>
        <p className="text-xs text-slate-500">
          Manage local client storage, theme preferences, and API adapter connectivity.
        </p>
      </div>

      {/* Appearance */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Interface Color Theme
            </h3>
            <p className="text-xs text-slate-500">
              Deep navy and slate dark mode optimized for continuous laboratory analysis.
            </p>
          </div>

          <div className="flex items-center p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-xs">
            <button
              onClick={() => {
                setTheme('light');
                toast('Switched to Light Mode');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all font-medium ${
                theme === 'light'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light Theme</span>
            </button>
            <button
              onClick={() => {
                setTheme('dark');
                toast('Switched to Dark Mode');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all font-medium ${
                theme === 'dark'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark Theme</span>
            </button>
          </div>
        </div>
      </div>

      {/* Data Management & Persistence */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Workspace Data Persistence
          </h3>
          <p className="text-xs text-slate-500">
            Formulix stores research notes, comparisons, and bookmarks locally in browser local storage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleExportBackup}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON Archive</span>
          </button>

          <button
            onClick={handleClearAllStorage}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Workspace Cache</span>
          </button>
        </div>
      </div>

      {/* API Adapter Information */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
          <Server className="w-4 h-4 text-blue-500" />
          <span>Django REST API Architecture Ready</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          The Formulix service layer (`src/services/dataService.ts`) is architected with typed contracts matching standard DRF endpoints:
        </p>
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 font-mono text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
          <div>GET /api/v1/products/?query=&amp;category=&amp;country=</div>
          <div>GET /api/v1/formulations/:id/</div>
          <div>GET /api/v1/ingredients/:cas/</div>
          <div>GET /api/v1/regulatory-records/</div>
        </div>
      </div>

      {/* Synthetic Benchmark Disclaimer */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-600 dark:text-slate-400 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Formulation Intelligence Ethics & Demonstration Notice</span>
        </div>
        <p className="leading-relaxed">
          Formulix strictly adheres to open intellectual property standards. Chemical entities and active compositions represent published FAO/WHO specifications, patent gazettes, and public pharmacopeial monographs. Fictional combinations or proprietary manufacturing trade secrets are not disclosed.
        </p>
      </div>
    </div>
  );
};
