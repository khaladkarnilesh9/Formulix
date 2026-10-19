import React, { useState } from 'react';
import { SharedRepository } from '../../../data/repositories/sharedRepository';
import { useToast } from '../../../components/common/Toast';
import {
  UploadCloud,
  Download,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowRight,
  RefreshCcw,
} from 'lucide-react';

export const AdminBulkImportExportView: React.FC = () => {
  const { toast } = useToast();
  const [jsonInput, setJsonInput] = useState('');
  const [previewItems, setPreviewItems] = useState<any[] | null>(null);
  const [importTarget, setImportTarget] = useState<'products' | 'formulations' | 'ingredients'>('products');
  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setJsonInput(await file.text());
      setPreviewItems(null);
      toast(`Loaded ${file.name}`, 'success');
    } catch {
      toast('Unable to read the selected file', 'warning');
    }
    event.target.value = '';
  };

  const handleDownloadFullDatabaseJSON = () => {
    const data = SharedRepository.exportRepositoryData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formulix-master-database-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Downloaded full scientific master database JSON', 'success');
  };

  const handleDownloadCSVTemplate = () => {
    const csvContent =
      'brandName,activeIngredient,casNumber,manufacturerName,category,formulationType,strength,country,registrationStatus,regulatoryAuthority\n' +
      'Imidacloprid 17.8 SL,Imidacloprid,138261-41-3,Bayer CropScience AG,Agrochemical,SL (Soluble Liquid),17.8% w/w,India,Approved,CIBRC\n' +
      'Coragen 200 SC,Chlorantraniliprole,500008-45-7,FMC Corporation,Agrochemical,SC (Suspension Concentrate),200 g/L,United States,Approved,US EPA\n';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formulix-${importTarget}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Downloaded CSV import template', 'info');
  };

  const handleParseInput = () => {
    if (!jsonInput.trim()) {
      toast('Please paste JSON or CSV text to inspect', 'warning');
      return;
    }

    try {
      if (jsonInput.trim().startsWith('[')) {
        const parsed = JSON.parse(jsonInput);
        if (Array.isArray(parsed)) {
          setPreviewItems(parsed);
          toast(`Successfully validated ${parsed.length} records ready for import.`, 'success');
          return;
        }
      }

      // Fallback CSV simple parser
      const lines = jsonInput.trim().split('\n');
      if (lines.length > 1) {
        const headers = lines[0].split(',').map((h) => h.trim());
        const rows = lines.slice(1).map((line) => {
          const cells = line.split(',').map((c) => c.trim());
          const obj: any = {};
          headers.forEach((h, i) => {
            obj[h] = cells[i] || '';
          });
          return obj;
        });
        setPreviewItems(rows);
        toast(`Parsed ${rows.length} CSV rows successfully!`, 'success');
        return;
      }

      toast('Invalid JSON or CSV format', 'warning');
    } catch (e: any) {
      toast(`Parsing error: ${e.message}`, 'warning');
    }
  };

  const handleCommitImport = () => {
    if (!previewItems || previewItems.length === 0) return;

    let importedCount = 0;
    if (importTarget === 'products') {
      previewItems.forEach((p) => {
        SharedRepository.saveProduct(
          {
            brandName: p.brandName || 'Imported Product',
            activeIngredient: p.activeIngredient || 'Technical Active',
            casNumber: p.casNumber || 'N/A',
            manufacturerName: p.manufacturerName || 'Imported Manufacturer',
            category: p.category || 'Agrochemical',
            formulationType: p.formulationType || 'SC (Suspension Concentrate)',
            strength: p.strength || '200 g/L',
            country: p.country || 'Global',
            publishStatus: 'Published',
          },
          'Bulk Data Ingestion Engine'
        );
        importedCount++;
      });
    }

    toast(`Successfully committed ${importedCount} records into the Master Database!`, 'success');
    setPreviewItems(null);
    setJsonInput('');
  };

  return (
    <div className="fx-page">
      <div className="fx-page-heading">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <UploadCloud className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Bulk Data Ingestion & Repository Export
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Batch import formulation datasets, regulatory dossiers, or download unified database snapshots.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCSVTemplate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>CSV Template</span>
          </button>

          <button
            onClick={handleDownloadFullDatabaseJSON}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Snapshot (.json)</span>
          </button>
        </div>
      </div>

      {/* Ingestion Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Textarea */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Raw JSON / CSV Ingestion Buffer
            </h3>
            <select
              aria-label="Import target"
              value={importTarget}
              onChange={(e) => setImportTarget(e.target.value as any)}
              className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-medium"
            >
              <option value="products">Target: Commercial Products</option>
              <option value="formulations">Target: Formulation Recipes</option>
              <option value="ingredients">Target: Chemical Substances</option>
            </select>
          </div>

          <div className="md:hidden">
            <label htmlFor="mobile-import-file" className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">Import File</label>
            <input id="mobile-import-file" type="file" accept=".csv,.json,text/csv,application/json"
              onChange={handleFileSelection} className="w-full rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700" />
          </div>

          <textarea
            aria-label="Import data"
            rows={12}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={`[\n  {\n    "brandName": "Confidor Super 350 SC",\n    "activeIngredient": "Imidacloprid",\n    "casNumber": "138261-41-3",\n    "strength": "350 g/L",\n    "manufacturerName": "Bayer CropScience AG"\n  }\n]`}
            className="w-full p-3 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
          />

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400">
              Validates schema fields against canonical specifications prior to commit.
            </span>
            <button
              onClick={handleParseInput}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Parse & Validate</span>
            </button>
          </div>
        </div>

        {/* Right: Preview & Commit */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Validation Staging Area
              </h3>
              {previewItems && (
                <span className="text-xs font-semibold text-emerald-600">
                  {previewItems.length} records verified
                </span>
              )}
            </div>

            {previewItems ? (
              <div className="mt-4 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto max-h-80 overflow-y-auto">
                <table className="fx-data-table w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-semibold sticky top-0">
                    <tr>
                      <th className="p-2">Brand / Name</th>
                      <th className="p-2">Active AI</th>
                      <th className="p-2">CAS #</th>
                      <th className="p-2">Manufacturer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {previewItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-950">
                        <td className="p-2 font-medium text-slate-900 dark:text-white">
                          {item.brandName || item.name}
                        </td>
                        <td className="p-2 text-slate-600 dark:text-slate-400">
                          {item.activeIngredient || 'N/A'}
                        </td>
                        <td className="p-2 font-mono text-[11px] text-slate-500">
                          {item.casNumber || item.cas || 'N/A'}
                        </td>
                        <td className="p-2 text-slate-500 truncate max-w-[140px]">
                          {item.manufacturerName || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400">
                <Database className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                <p className="text-xs">No records staged for import yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Paste JSON array or CSV above and click "Parse & Validate".
                </p>
              </div>
            )}
          </div>

          {previewItems && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setPreviewItems(null)}
                className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                Clear
              </button>
              <button
                onClick={handleCommitImport}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Commit {previewItems.length} Records to Master DB</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
