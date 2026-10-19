import React, { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Plus,
  FlaskConical,
  Atom,
  Building2,
  Tag,
  ShieldCheck,
  FileText,
  UploadCloud,
  CheckSquare,
  Activity,
  Sliders,
  History,
  FileCode2,
  TestTube2,
  Settings,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Sprout,
} from 'lucide-react';
import { SharedRepository } from '../../../data/repositories/sharedRepository';

export type AdminTabKey =
  | 'admin-dashboard'
  | 'admin-indian-agro'
  | 'admin-products'
  | 'admin-products-new'
  | 'admin-formulations'
  | 'admin-ingredients'
  | 'admin-manufacturers'
  | 'admin-brands'
  | 'admin-registrations'
  | 'admin-patents'
  | 'admin-documents'
  | 'admin-imports'
  | 'admin-review'
  | 'admin-data-quality'
  | 'admin-master-data'
  | 'admin-audit-logs'
  | 'admin-field-audit'
  | 'admin-e2e-tests'
  | 'admin-settings';

interface AdminSidebarProps {
  currentTab: AdminTabKey;
  onTabChange: (tab: AdminTabKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onExitToUserPortal: () => void;
  operatorRole?: string;
  onChangeOperatorRole?: (role: string) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  onExitToUserPortal,
  operatorRole,
  onChangeOperatorRole,
}) => {
  const [navQuery, setNavQuery] = useState('');
  const repo = SharedRepository.getState();
  const pendingReviewCount = repo.products.filter(
    (p) => p.publishStatus === 'Submitted for Review' || p.publishStatus === 'Draft'
  ).length;

  const qualityIssues = SharedRepository.assessDataQuality().issues.length;

  const adminNavGroups = [
    {
      label: 'Specialized Pipelines',
      items: [
        {
          key: 'admin-indian-agro' as AdminTabKey,
          label: 'Indian Agrochemical Pipeline',
          icon: Sprout,
          badge: '1,200 Target',
          badgeColor: 'bg-blue-600 text-white',
        },
      ],
    },
    {
      label: 'Operations & Quality',
      items: [
        {
          key: 'admin-dashboard' as AdminTabKey,
          label: 'Data Ops Dashboard',
          icon: LayoutDashboard,
        },
        {
          key: 'admin-review' as AdminTabKey,
          label: 'Review & Publishing Queue',
          icon: CheckSquare,
          badge: pendingReviewCount > 0 ? pendingReviewCount : undefined,
          badgeColor: 'bg-amber-500 text-white',
        },
        {
          key: 'admin-data-quality' as AdminTabKey,
          label: 'Data Quality & Integrity',
          icon: Activity,
          badge: qualityIssues > 0 ? qualityIssues : undefined,
          badgeColor: 'bg-rose-500 text-white',
        },
      ],
    },
    {
      label: 'Core Master Data',
      items: [
        {
          key: 'admin-products' as AdminTabKey,
          label: 'Commercial Products',
          icon: Package,
          badge: repo.products.length,
        },
        { key: 'admin-products-new' as AdminTabKey, label: 'Add Product', icon: Plus },
        {
          key: 'admin-formulations' as AdminTabKey,
          label: 'Formulation Recipes',
          icon: FlaskConical,
          badge: repo.formulations.length,
        },
        {
          key: 'admin-ingredients' as AdminTabKey,
          label: 'Chemical Ingredients',
          icon: Atom,
          badge: repo.ingredients.length,
        },
        {
          key: 'admin-manufacturers' as AdminTabKey,
          label: 'Manufacturers & Orgs',
          icon: Building2,
          badge: repo.manufacturers.length,
        },
        {
          key: 'admin-brands' as AdminTabKey,
          label: 'Brand Trademarks',
          icon: Tag,
        },
      ],
    },
    {
      label: 'Regulatory & Dossiers',
      items: [
        { key: 'admin-patents' as AdminTabKey, label: 'Patent Management', icon: FileText },
        {
          key: 'admin-registrations' as AdminTabKey,
          label: 'Regulatory Registrations',
          icon: ShieldCheck,
          badge: repo.regulatoryRecords.length,
        },
        {
          key: 'admin-documents' as AdminTabKey,
          label: 'Technical Documents & SDS',
          icon: FileText,
          badge: repo.documents.length,
        },
      ],
    },
    {
      label: 'Workspaces & Tools',
      items: [
        {
          key: 'admin-imports' as AdminTabKey,
          label: 'Bulk Data Import (CSV/JSON)',
          icon: UploadCloud,
        },
        {
          key: 'admin-master-data' as AdminTabKey,
          label: 'Controlled Vocabularies',
          icon: Sliders,
        },
        {
          key: 'admin-audit-logs' as AdminTabKey,
          label: 'Audit Trail & History',
          icon: History,
          badge: repo.auditLogs.length,
        },
        {
          key: 'admin-field-audit' as AdminTabKey,
          label: 'Field Coverage Matrix (100%)',
          icon: FileCode2,
          badge: 'Verified',
          badgeColor: 'bg-emerald-600 text-white',
        },
        {
          key: 'admin-e2e-tests' as AdminTabKey,
          label: 'E2E Automated Test Suite',
          icon: TestTube2,
          badge: '10 Tests',
          badgeColor: 'bg-blue-600 text-white',
        },
        {
          key: 'admin-settings' as AdminTabKey,
          label: 'Admin System Settings',
          icon: Settings,
        },
      ],
    },
  ];

  return (
    <aside
      className="shell-sidebar fixed left-0 top-0 bottom-0 z-40 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 transition-all duration-300 flex flex-col"
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
              Fx
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                <span>Formulix</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-mono font-bold uppercase border border-blue-200 dark:border-blue-700">
                  Admin
                </span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Data operations
              </span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm mx-auto shadow-xs">
            Fx
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
            collapsed ? 'hidden sm:block mx-auto mt-2' : ''
          }`}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <div className="admin-menu-search hidden space-y-2 border-b border-slate-200 p-3 dark:border-slate-800">
        <input aria-label="Search admin menus" placeholder="Search admin menus" value={navQuery}
          onChange={event => setNavQuery(event.target.value)}
          className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-800 dark:bg-slate-900" />
        {onChangeOperatorRole && <select aria-label="Demo operator role" value={operatorRole}
          onChange={event => onChangeOperatorRole(event.target.value)}
          className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm dark:border-slate-800 dark:bg-slate-900">
          {['Principal Architect', 'Senior Reviewer', 'Regulatory Lead', 'Chemical Curator'].map(role => <option key={role}>{role}</option>)}
        </select>}
      </div>

      {/* Exit to Public User Portal Button */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <button
          onClick={onExitToUserPortal}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800 transition-all ${
            collapsed ? 'p-2' : ''
          }`}
          title="Exit to Public User Portal"
        >
          <ArrowLeft className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
          {!collapsed && <span>Return to User Portal</span>}
        </button>
      </div>

      {/* Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {adminNavGroups.map(group => ({ ...group, items: group.items.filter(item => item.label.toLowerCase().includes(navQuery.toLowerCase())) }))
          .filter(group => group.items.length > 0).map((group) => (
          <div key={group.label} className="space-y-0.5">
            {!collapsed && (
              <div className="fx-nav-group">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.key;

              return (
                <button
                  key={item.key}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onTabChange(item.key)}
                  title={item.label}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left relative ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  {!collapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                        (item as any).badgeColor || (isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300')
                      } ${collapsed ? 'absolute top-1.5 right-1.5' : ''}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer System Status */}
      {!collapsed ? (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 text-[11px]">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
              Shared Repo Active
            </span>
            <span className="font-mono text-xs text-slate-400">Local storage</span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
            Demonstration repository / public portal sync
          </p>
        </div>
      ) : (
        <div className="p-2 border-t border-slate-200 dark:border-slate-800 flex justify-center">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" title="System Operational" />
        </div>
      )}
    </aside>
  );
};
