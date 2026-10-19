import React, { useState } from 'react';
import { SharedRepository } from '../../../data/repositories/sharedRepository';
import { DataQualityIssue } from '../../../data/schemas/canonicalSchemas';
import { useToast } from '../../../components/common/Toast';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Wrench,
  ExternalLink,
  Flame,
  ArrowRight,
} from 'lucide-react';

export const AdminDataQualityView: React.FC = () => {
  const { toast } = useToast();
  const [assessment, setAssessment] = useState(() => SharedRepository.assessDataQuality());

  const handleRefresh = () => {
    const updated = SharedRepository.assessDataQuality();
    setAssessment(updated);
    toast('Data quality integrity scan completed.', 'info');
  };

  const handleAutoResolve = (issueId: string) => {
    SharedRepository.autoResolveIssue(issueId);
    setAssessment(SharedRepository.assessDataQuality());
    toast('Issue successfully resolved & synced.', 'success');
  };

  return (
    <div className="fx-page">
      {/* Top Banner */}
      <div className="fx-page-heading">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <Activity className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Data Quality & Integrity Audit
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated validation engine identifying broken relationships, missing CAS numbers, unverified evidence, and syntax anomalies.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 shadow-xs transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Re-scan Master Database</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-xs text-slate-500 font-medium">Database Health Index</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
              {assessment.completenessScore}%
            </span>
            <span className="text-xs text-slate-500 font-semibold">Stored field completeness</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${assessment.completenessScore}%` }}
            />
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-xs text-slate-500 font-medium">Active Integrity Anomalies</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-500">
              {assessment.issues.length}
            </span>
            <span className="text-xs text-slate-400 font-medium">Flagged Items</span>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            {assessment.issues.filter(issue => issue.severity === 'High').length} high-priority issues identified by repository rules.
          </p>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-xs text-slate-500 font-medium">Stored evidence classification coverage</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-500">{assessment.provenanceScore}%</span>
            <span className="text-xs text-slate-400">Recorded labels</span>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Classification labels are not proof of regulatory compliance or independently verified sources.
          </p>
        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Quality Inspection Issues List
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {assessment.issues.length} detected
          </span>
        </div>

        {assessment.issues.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Zero Data Quality Issues Detected
            </p>
            <p className="text-xs text-slate-400 mt-1">
              All commercial products, formulations, ingredients, and regulatory links pass canonical validation.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {assessment.issues.map((issue) => (
              <div
                key={issue.id}
                className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-950/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        issue.severity === 'High'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : issue.severity === 'Medium'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {issue.severity} Severity
                    </span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {issue.entityType}: {issue.entityName}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      [{issue.field}]
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {issue.description}
                  </p>
                </div>

                <button
                  onClick={() => handleAutoResolve(issue.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 shrink-0 border border-blue-200 dark:border-blue-900"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Auto-Resolve</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
