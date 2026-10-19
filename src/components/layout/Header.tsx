import React, { useEffect, useRef } from 'react';
import {
  Search,
  Scale,
  Bookmark,
  Sun,
  Moon,
  Info,
  Menu,
  Database,
  MoreHorizontal,
  Settings,
  BookOpen,
  UserRound,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { NavItemKey } from './Sidebar';
import { getDatabaseCatalog, staffSignOut } from '../../services/formulationApi';
import { useToast } from '../common/Toast';

interface HeaderProps {
  currentTab: NavItemKey;
  onOpenSearch: () => void;
  onNavigate: (tab: NavItemKey) => void;
  onToggleSidebarMobile: () => void;
  onSwitchToAdmin?: () => void;
  breadcrumbSubtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenSearch,
  onNavigate,
  onToggleSidebarMobile,
  onSwitchToAdmin,
  breadcrumbSubtitle,
}) => {
  const { theme, toggleTheme, setTheme, comparisonProductIds, savedProductIds, savedFormulationIds, bookmarkedManufacturerIds, savedIngredients, savedBrands } = useWorkspaceStore();
  const totalSaved = savedProductIds.length + savedFormulationIds.length + bookmarkedManufacturerIds.length + savedIngredients.length + savedBrands.length;
  const session = getDatabaseCatalog().session;
  const { toast } = useToast();
  const overflow = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (overflow.current && !overflow.current.contains(event.target as Node)) overflow.current.open = false; };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const getBreadcrumbTitle = (tab: NavItemKey) => {
    switch (tab) {
      case 'dashboard':
        return 'Executive Formulation Dashboard';
      case 'product-search':
        return 'Commercial Product Intelligence';
      case 'product-detail':
        return 'Product Specification & Dossier';
      case 'formulation-explorer':
        return 'Formulation Recipe Intelligence';
      case 'ingredient-explorer':
        return 'Chemical Substance Explorer';
      case 'product-comparison':
        return 'Multi-Product Formulation Comparison';
      case 'manufacturer-directory':
        return 'Global Manufacturer & Formulator Directory';
      case 'brand-intelligence':
        return 'Brand Portfolio Intelligence';
      case 'market-analytics':
        return 'Market & Analytics Intelligence';
      case 'regulatory-intelligence':
        return 'Multi-Jurisdiction Regulatory Intelligence';
      case 'patent-intelligence':
        return 'Patent & Prior Art Intelligence';
      case 'technical-documents':
        return 'Technical Dossiers & SDS Archive';
      case 'saved-items':
        return 'Saved Formulations & Products';
      case 'research-workspace':
        return 'Research Notes & Project Workspace';
      case 'settings':
        return 'Platform Settings & Governance';
      default:
        return 'Formulation Intelligence';
    }
  };

  return (
    <>
    <header className="mobile-header sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-2 dark:border-slate-800 dark:bg-slate-950 md:hidden">
      <button onClick={onToggleSidebarMobile} aria-label="Open navigation" aria-haspopup="dialog" title="Open navigation" className="flex h-11 w-11 items-center justify-center text-slate-600 dark:text-slate-300"><Menu size={20} /></button>
      <span className="min-w-0 flex-1 text-center text-base font-bold text-slate-900 dark:text-white">Formulix</span>
      <button onClick={onOpenSearch} aria-label="Search Formulix" title="Search Formulix" className="flex h-11 w-11 items-center justify-center text-slate-600 dark:text-slate-300"><Search size={20} /></button>
      <button onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title="Toggle theme" className="flex h-11 w-11 items-center justify-center text-slate-600 dark:text-slate-300">{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button>
    </header>
    <header className="public-desktop-header compact-header sticky top-0 z-30 h-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 hidden md:flex items-center justify-between gap-4">
      {/* Left: Mobile Menu Toggle & Breadcrumbs */}
      <div className="header-title flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebarMobile}
          aria-label="Toggle navigation"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span>Formulix</span>
            <span>/</span>
            <span className="capitalize">{currentTab.replaceAll('-', ' ')}</span>
          </div>
          <h1 title={breadcrumbSubtitle || getBreadcrumbTitle(currentTab)} className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate">
            {breadcrumbSubtitle || getBreadcrumbTitle(currentTab)}
          </h1>
        </div>
      </div>

      {/* Center / Right: Global Search Trigger */}
      <div className="header-actions flex items-center gap-2 sm:gap-3">
        <button
          onClick={onOpenSearch}
          aria-label="Search Formulix"
          className="header-search flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate flex-1 text-left">{currentTab === 'ingredient-explorer' ? 'Search ingredients, CAS number, brands, formulations...' : 'Search brands, ingredients, CAS...'}</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
            ⌘K
          </kbd>
        </button>

        {/* Comparison Matrix Quick Button */}
        <button
          onClick={() => onNavigate('product-comparison')}
          className={`header-icon-button relative p-2 rounded-lg border transition-colors ${
            comparisonProductIds.length > 0
              ? 'border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
          title={`Compare Products (${comparisonProductIds.length} selected)`}
        >
          <Scale className="w-4 h-4" />
          {comparisonProductIds.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
              {comparisonProductIds.length}
            </span>
          )}
        </button>

        {/* Saved Items Quick Button */}
        <button
          onClick={() => onNavigate('saved-items')}
          className={`header-icon-button relative p-2 rounded-lg border transition-colors ${
            totalSaved > 0
              ? 'border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400'
              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
          title={`Saved Workspace Items (${totalSaved})`}
        >
          <Bookmark className="w-4 h-4" />
          {totalSaved > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">
              {totalSaved}
            </span>
          )}
        </button>

        {/* Theme Segmented Switcher */}
        <div className="header-theme flex items-center p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-xs">
          <button
            onClick={() => setTheme('light')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium ${
              theme === 'light'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Switch to Light Theme"
            aria-label="Switch to Light Theme"
            aria-pressed={theme === 'light'}
          >
            <Sun className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Light</span>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium ${
              theme === 'dark'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Switch to Dark Theme"
            aria-label="Switch to Dark Theme"
            aria-pressed={theme === 'dark'}
          >
            <Moon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dark</span>
          </button>
        </div>

        {/* Admin Data Operations Portal Switcher */}
        {onSwitchToAdmin && (
          <button
            onClick={() => window.open('/django-admin/', '_blank', 'noopener')}
            className="header-action header-admin flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer"
            title="Switch to Enterprise Admin Data Management Portal"
          >
            <Database className="w-3.5 h-3.5 text-blue-200" />
            <span className="hidden sm:inline">Admin Portal</span>
          </button>
        )}

        {/* Enterprise Demonstration Notice */}
        <details ref={overflow} className="fx-overflow fx-user-menu" onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); } }}>
          <summary aria-label="Account and workspace menu" title="Account and workspace menu">
            <span className="fx-user-avatar">{session?.authenticated ? session.username.charAt(0).toUpperCase() : <UserRound size={18} />}</span>
            <span className="fx-user-name">{session?.authenticated ? session.username : 'Workspace'}<small>{session?.staff ? 'Staff account' : 'Public access'}</small></span>
            <ChevronDown size={13} />
          </summary>
          <div className="fx-overflow-menu">
            <button onClick={event => { onNavigate('research-workspace'); event.currentTarget.closest('details')!.open = false; }}><BookOpen size={16} />Research workspace</button>
            <button onClick={event => { onNavigate('settings'); event.currentTarget.closest('details')!.open = false; }}><Settings size={16} />Platform settings</button>
            <a href="/django-admin/" target="_blank" rel="noopener noreferrer"><Database size={14} />Django administration</a>
            {session?.authenticated && <button onClick={async event => {
              event.currentTarget.closest('details')!.open = false;
              try { await staffSignOut(); toast('Signed out of staff preview'); }
              catch { toast('Sign-out failed. Try again.', 'warning'); }
            }}><LogOut size={16} />Sign out</button>}
          </div>
        </details>
      </div>
    </header>
    </>
  );
};
