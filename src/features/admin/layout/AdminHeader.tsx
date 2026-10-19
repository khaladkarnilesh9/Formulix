import React, { useState } from 'react';
import {
  Plus,
  ArrowLeft,
  Sun,
  Moon,
  UserCheck,
  ShieldAlert,
  Search,
  Menu,
  CheckCircle,
} from 'lucide-react';
import { useWorkspaceStore } from '../../../stores/workspaceStore';
import { AdminTabKey } from './AdminSidebar';

interface AdminHeaderProps {
  currentTab: AdminTabKey;
  onNavigate: (tab: AdminTabKey) => void;
  onExitToUserPortal: () => void;
  onToggleSidebarMobile: () => void;
  operatorRole: string;
  onChangeOperatorRole: (role: string) => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentTab,
  onNavigate,
  onExitToUserPortal,
  onToggleSidebarMobile,
  operatorRole,
  onChangeOperatorRole,
}) => {
  const { theme, setTheme, toggleTheme } = useWorkspaceStore();
  const mobileLabels: Partial<Record<AdminTabKey, string>> = {
    'admin-dashboard': 'Admin Overview', 'admin-products': 'Products', 'admin-products-new': 'Add Product',
    'admin-formulations': 'Formulations', 'admin-ingredients': 'Ingredients', 'admin-manufacturers': 'Manufacturers',
    'admin-brands': 'Brands', 'admin-registrations': 'Regulatory', 'admin-patents': 'Patents',
    'admin-documents': 'Documents', 'admin-imports': 'Bulk Import', 'admin-review': 'Review Queue',
    'admin-data-quality': 'Data Quality', 'admin-master-data': 'Master Data', 'admin-audit-logs': 'Audit Logs',
    'admin-field-audit': 'Field Audit', 'admin-e2e-tests': 'Test Suite', 'admin-settings': 'Settings',
    'admin-indian-agro': 'Agro Pipeline',
  };

  const getTabLabel = (tab: AdminTabKey) => {
    switch (tab) {
      case 'admin-dashboard':
        return 'Data Operations & System Health';
      case 'admin-indian-agro':
        return '1,200 Indian Agrochemical Formulation Acquisition Pipeline';
      case 'admin-products':
        return 'Product Master Data Management';
      case 'admin-products-new':
        return 'New Commercial Product Data Entry Wizard';
      case 'admin-formulations':
        return 'Formulation Recipe Master';
      case 'admin-ingredients':
        return 'Chemical Substance Master Catalog';
      case 'admin-manufacturers':
        return 'Corporate Entity & Manufacturer Directory';
      case 'admin-brands':
        return 'Brand Portfolio Management';
      case 'admin-registrations':
        return 'Regulatory Registrations & Dockets';
      case 'admin-documents':
        return 'Technical Document & SDS Management';
      case 'admin-imports':
        return 'Bulk Data Import Workspace';
      case 'admin-review':
        return 'Data Review & Publishing Approval Queue';
      case 'admin-data-quality':
        return 'Data Quality & Integrity Audit';
      case 'admin-master-data':
        return 'Controlled Vocabularies & Taxonomies';
      case 'admin-audit-logs':
        return 'Audit Logs & Revision Trail';
      case 'admin-field-audit':
        return 'Stored Field Coverage Matrix';
      case 'admin-e2e-tests':
        return 'Automated End-to-End Test Suite';
      case 'admin-settings':
        return 'Admin System & Storage Settings';
      default:
        return 'Admin Management';
    }
  };

  return (
    <header className="admin-header compact-header sticky top-0 z-30 h-14 md:h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-2 md:px-6 flex items-center justify-between gap-2 md:gap-4">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="header-title flex items-center gap-3 min-w-0">
        <button
          aria-label="Open admin navigation"
          aria-haspopup="dialog"
          title="Open admin navigation"
          onClick={onToggleSidebarMobile}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span className="text-blue-600 dark:text-blue-400 font-bold">Admin Portal</span>
            <span>/</span>
            <span className="capitalize">{currentTab.replace('admin-', '').replace('-', ' ')}</span>
          </div>
          <h1 title={getTabLabel(currentTab)} className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate">
            <span className="md:hidden">{mobileLabels[currentTab]}</span>
            <span className="hidden md:inline">{getTabLabel(currentTab)}</span>
          </h1>
        </div>
      </div>

      {/* Right Controls */}
      <div className="header-actions flex items-center gap-2 sm:gap-3">
        <button onClick={onToggleSidebarMobile} aria-label="Search admin menus" title="Search admin menus"
          className="flex h-11 w-11 items-center justify-center text-slate-500 md:hidden"><Search size={20} /></button>
        {/* Operator Role Simulator */}
        <div className="header-role hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-600 dark:text-slate-400">
          <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-[11px] text-slate-400">Demo role:</span>
          <select
            aria-label="Demo operator role"
            value={operatorRole}
            onChange={(e) => onChangeOperatorRole(e.target.value)}
            className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden text-xs cursor-pointer"
          >
            <option value="Principal Architect">Principal Architect</option>
            <option value="Senior Reviewer">Senior Reviewer</option>
            <option value="Regulatory Lead">Regulatory Lead</option>
            <option value="Chemical Curator">Chemical Curator</option>
          </select>
        </div>

        {/* Quick Action Button: New Product */}
        {currentTab !== 'admin-products-new' && (
          <button
            onClick={() => onNavigate('admin-products-new')}
            className="header-action hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Product</span>
          </button>
        )}

        {/* Theme Switcher */}
        <button onClick={toggleTheme} aria-label="Toggle admin theme" title="Toggle theme" className="flex h-11 w-11 items-center justify-center text-slate-500 md:hidden">{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button>
        <div className="header-theme hidden md:flex items-center p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-xs">
          <button
            onClick={() => setTheme('light')}
            className={`p-1.5 rounded-md transition-colors ${
              theme === 'light' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-400 hover:text-slate-700'
            }`}
            title="Light Theme"
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`p-1.5 rounded-md transition-colors ${
              theme === 'dark' ? 'bg-slate-800 text-blue-400 shadow-2xs' : 'text-slate-400 hover:text-slate-700'
            }`}
            title="Dark Theme"
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Return to Public Portal Button */}
        <button
          onClick={onExitToUserPortal}
          className="header-action flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors"
          title="Return to the public formulation intelligence portal"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">User Portal</span>
        </button>
      </div>
    </header>
  );
};
