import React from 'react';
import { SharedRepository } from '../../../data/repositories/sharedRepository';
import { AdminTabKey } from '../layout/AdminSidebar';
import {
  Package,
  FlaskConical,
  Atom,
  Building2,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Activity,
  ArrowRight,
  TrendingUp,
  Archive,
  UploadCloud,
  FileEdit,
  Sprout,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface AdminDashboardViewProps {
  onNavigate: (tab: AdminTabKey, filterParam?: string) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onNavigate }) => {
  const repo = SharedRepository.getState();
  const quality = SharedRepository.assessDataQuality();

  const totalProducts = repo.products.length;
  const publishedProducts = repo.products.filter((p) => p.publishStatus === 'Published').length;
  const draftProducts = repo.products.filter((p) => p.publishStatus === 'Draft').length;
  const pendingReview = repo.products.filter((p) => p.publishStatus === 'Submitted for Review').length;
  const approvedProducts = repo.products.filter((p) => p.publishStatus === 'Approved').length;
  const archivedProducts = repo.products.filter((p) => p.publishStatus === 'Archived').length;

  const totalFormulations = repo.formulations.length;
  const totalIngredients = repo.ingredients.length;
  const totalManufacturers = repo.manufacturers.length;
  const totalRegistrations = repo.regulatoryRecords.length;
  const totalDocuments = repo.documents.length;

  const statusPieData = [
    { name: 'Published', value: publishedProducts, color: '#16a34a' },
    { name: 'Draft', value: draftProducts, color: '#64748b' },
    { name: 'Review Queue', value: pendingReview, color: '#f59e0b' },
    { name: 'Approved', value: approvedProducts, color: '#3b82f6' },
    { name: 'Archived', value: archivedProducts, color: '#94a3b8' },
  ].filter((d) => d.value > 0);

  const sectorBarData = [
    {
      name: 'Agrochemical',
      count: repo.products.filter((p) => p.category === 'Agrochemical').length,
    },
    {
      name: 'Pharmaceutical',
      count: repo.products.filter((p) => p.category === 'Pharmaceutical').length,
    },
    {
      name: 'Industrial',
      count: repo.products.filter((p) => p.category === 'Industrial').length,
    },
  ];

  const highestSectorCount = Math.max(...sectorBarData.map(sector => sector.count));
  const leadingSectors = highestSectorCount > 0 ? sectorBarData.filter(sector => sector.count === highestSectorCount).map(sector => sector.name).join(', ') : 'No records';

  return (
    <div className="fx-page">
      {/* Top Banner */}
      <div className="fx-page-heading">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-blue-600 dark:text-blue-400 font-bold uppercase">
            <span>Enterprise Data Operations Console</span>
            <span>·</span>
            <span>Single Source of Truth Active</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Formulation Master Data Operations
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Live catalog synchronization across commercial products, active substances, manufacturer profiles, and regulatory dossiers. Changes reflect immediately in the public portal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('admin-indian-agro')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
            title="Launch 1,200 Record Indian Agrochemical Acquisition Pipeline"
          >
            <Sprout className="w-3.5 h-3.5" />
            <span>Indian Agro Pipeline (1,200 Target)</span>
          </button>
          <button
            onClick={() => onNavigate('admin-products-new')}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
          >
            + Create New Product
          </button>
          <button
            onClick={() => onNavigate('admin-imports')}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Bulk Import CSV
          </button>
        </div>
      </div>

      {/* Lifecycle Status Metric Cards (Clickable) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => onNavigate('admin-products')}
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-blue-500 cursor-pointer transition-all space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Products</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {totalProducts}
          </div>
          <div className="text-[11px] text-blue-600 font-medium">All records</div>
        </div>

        <div
          onClick={() => onNavigate('admin-products', 'Published')}
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-emerald-500 cursor-pointer transition-all space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Published</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {publishedProducts}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">Live on User Portal</div>
        </div>

        <div
          onClick={() => onNavigate('admin-products', 'Draft')}
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-slate-500 cursor-pointer transition-all space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Drafts</span>
            <FileEdit className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-700 dark:text-slate-300">
            {draftProducts}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">Unpublished internal</div>
        </div>

        <div
          onClick={() => onNavigate('admin-review')}
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-amber-500 cursor-pointer transition-all space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Review Queue</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {pendingReview}
          </div>
          <div className="text-[11px] text-amber-600 font-medium">Awaiting approval</div>
        </div>

        <div
          onClick={() => onNavigate('admin-data-quality')}
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-rose-500 cursor-pointer transition-all space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Quality Issues</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {quality.issues.length}
          </div>
          <div className="text-[11px] text-rose-500 font-medium">Need correction</div>
        </div>

        <div
          onClick={() => onNavigate('admin-products', 'Archived')}
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-slate-500 cursor-pointer transition-all space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Archived</span>
            <Archive className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-600 dark:text-slate-400">
            {archivedProducts}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Historical records</div>
        </div>
      </div>

      {/* Entity Master Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div
          onClick={() => onNavigate('admin-formulations')}
          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-purple-500 cursor-pointer transition-all"
        >
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FlaskConical className="w-4 h-4 text-purple-500" />
            <span className="font-medium">Formulations</span>
          </div>
          <div className="text-xl font-bold font-mono mt-1 text-slate-900 dark:text-white">
            {totalFormulations}
          </div>
        </div>

        <div
          onClick={() => onNavigate('admin-ingredients')}
          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500 cursor-pointer transition-all"
        >
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Atom className="w-4 h-4 text-indigo-500" />
            <span className="font-medium">Chemical Actives</span>
          </div>
          <div className="text-xl font-bold font-mono mt-1 text-slate-900 dark:text-white">
            {totalIngredients}
          </div>
        </div>

        <div
          onClick={() => onNavigate('admin-manufacturers')}
          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-500 cursor-pointer transition-all"
        >
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Building2 className="w-4 h-4 text-amber-500" />
            <span className="font-medium">Manufacturers</span>
          </div>
          <div className="text-xl font-bold font-mono mt-1 text-slate-900 dark:text-white">
            {totalManufacturers}
          </div>
        </div>

        <div
          onClick={() => onNavigate('admin-registrations')}
          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 cursor-pointer transition-all"
        >
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="font-medium">Registrations</span>
          </div>
          <div className="text-xl font-bold font-mono mt-1 text-slate-900 dark:text-white">
            {totalRegistrations}
          </div>
        </div>

        <div
          onClick={() => onNavigate('admin-documents')}
          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-sky-500 cursor-pointer transition-all"
        >
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FileText className="w-4 h-4 text-sky-500" />
            <span className="font-medium">Tech Documents</span>
          </div>
          <div className="text-xl font-bold font-mono mt-1 text-slate-900 dark:text-white">
            {totalDocuments}
          </div>
        </div>
      </div>

      {/* Analytics Charts & Quality Scorecards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Publication Lifecycle Donut */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Publication Lifecycle Status
              </h3>
              <p className="text-xs text-slate-500">Master product distribution by state</p>
            </div>
            <span className="text-xs font-mono text-slate-400">N = {totalProducts}</span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={3}
                  isAnimationActive={false}
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--fx-surface)',
                    borderColor: 'var(--fx-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--fx-text)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            {statusPieData.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                  <span>{d.name}</span>
                </span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {d.value} ({Math.round((d.value / (totalProducts || 1)) * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sector Volume Bar Chart */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Catalog Products by Sector
              </h3>
              <p className="text-xs text-slate-500">Distribution across commercial domains</p>
            </div>
            <button
              onClick={() => onNavigate('admin-products')}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Grid →
            </button>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--fx-muted)' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--fx-muted)' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--fx-surface)',
                    borderColor: 'var(--fx-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--fx-text)',
                  }}
                />
                <Bar dataKey="count" fill="#245beb" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs flex items-center justify-between">
            <span className="text-slate-500">Highest representation:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{leadingSectors}</span>
          </div>
        </div>

        {/* Data Quality Health Card */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-500" />
                <span>Data Quality Index</span>
              </h3>
              <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {quality.issues.length} issues
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Repository rule scores, not independent scientific verification</p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-400">Schema Completeness</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{quality.completenessScore}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${quality.completenessScore}%` }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-400">Rule-based validity score</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{quality.validityScore}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${quality.validityScore}%` }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-400">Stored evidence classification coverage</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{quality.provenanceScore}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: `${quality.provenanceScore}%` }} />
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('admin-data-quality')}
            className="w-full py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Resolve {quality.issues.length} Identified Issues</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Recent Audit Trail Stream */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Recent Master Data Mutations & Audit Log
            </h3>
          </div>
          <button
            onClick={() => onNavigate('admin-audit-logs')}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Full Audit Trail →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="fx-data-table w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px] uppercase font-semibold">
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">Entity Type</th>
                <th className="py-2 px-3">Record Name</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">Operator</th>
                <th className="py-2 px-3">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {repo.auditLogs.slice(0, 5).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                    {log.entityType}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                    {log.entityName}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                        log.action === 'Published'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : log.action === 'Created'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          : log.action === 'Updated'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                    {log.author}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 max-w-md truncate" title={log.summary}>
                    {log.summary}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
