import React, { useState } from 'react';
import { SharedRepository } from '../../../data/repositories/sharedRepository';
import { AuditLogEntry } from '../../../data/schemas/canonicalSchemas';
import {
  History,
  Search,
  Filter,
  User,
  Clock,
  FileText,
  Tag,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export const AdminAuditLogsView: React.FC = () => {
  const repo = SharedRepository.getState();
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('All');

  const filteredLogs = repo.auditLogs.filter((log) => {
    const matchesSearch =
      !searchQuery ||
      log.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.author.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesEntity = entityFilter === 'All' || log.entityType === entityFilter;
    return matchesSearch && matchesEntity;
  });

  return (
    <div className="fx-page">
      <div className="fx-page-heading">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <History className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Audit Logs & Version History Trail
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Immutable log of all administrative actions, data edits, status transitions, and bulk ingestion operations.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search author, entity name, or summary remark..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
        >
          <option value="All">All Entity Types</option>
          <option value="Product">Commercial Products</option>
          <option value="Formulation">Formulation Recipes</option>
          <option value="Ingredient">Chemical Substances</option>
          <option value="Manufacturer">Manufacturers</option>
          <option value="Registration">Regulatory Registrations</option>
          <option value="Document">Technical Documents</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-950/60 transition-colors"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.action === 'Published'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : log.action === 'Created'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : log.action === 'Approved'
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {log.action}
                  </span>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    {log.entityType}: {log.entityName}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {log.summary}
                </p>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-slate-400 shrink-0 font-mono">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  <span>{log.author}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{log.timestamp}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
