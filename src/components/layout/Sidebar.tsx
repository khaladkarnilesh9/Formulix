import React, { useState } from 'react';
import {
  LayoutDashboard,
  Search,
  FlaskConical,
  Atom,
  Scale,
  Building2,
  Tag,
  ShieldCheck,
  FileText,
  Bookmark,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Database,
  ExternalLink,
  Leaf,
  ChartNoAxesCombined,
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { getDatabaseCatalog, getFormulationApiState } from '../../services/formulationApi';

export type NavItemKey =
  | 'dashboard'
  | 'product-search'
  | 'product-detail'
  | 'formulation-explorer'
  | 'ingredient-explorer'
  | 'product-comparison'
  | 'manufacturer-directory'
  | 'brand-intelligence'
  | 'market-analytics'
  | 'regulatory-intelligence'
  | 'patent-intelligence'
  | 'technical-documents'
  | 'saved-items'
  | 'research-workspace'
  | 'settings';

interface SidebarProps {
  currentTab: NavItemKey;
  onTabChange: (tab: NavItemKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSwitchToAdmin?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  onSwitchToAdmin,
}) => {
  const { savedProductIds, savedFormulationIds, comparisonProductIds, bookmarkedManufacturerIds, savedIngredients, savedBrands } = useWorkspaceStore();
  const totalSaved = savedProductIds.length + savedFormulationIds.length + bookmarkedManufacturerIds.length + savedIngredients.length + savedBrands.length;
  const connection = getFormulationApiState();
  const [closedGroups, setClosedGroups] = useState<string[]>([]);

  const navigationGroups = [
    {
      label: 'Overview',
      items: [
        {
          key: 'dashboard' as NavItemKey,
          label: 'Executive Dashboard',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      label: 'Product Intelligence',
      items: [
        {
          key: 'product-search' as NavItemKey,
          label: 'Product Search',
          icon: Search,
        },
        {
          key: 'formulation-explorer' as NavItemKey,
          label: 'Formulation Explorer',
          icon: FlaskConical,
        },
        {
          key: 'ingredient-explorer' as NavItemKey,
          label: 'Ingredient Explorer',
          icon: Atom,
        },
        {
          key: 'product-comparison' as NavItemKey,
          label: 'Product Comparison',
          icon: Scale,
          badge: comparisonProductIds.length > 0 ? comparisonProductIds.length : undefined,
        },
      ],
    },
    {
      label: 'Market & Companies',
      items: [
        {
          key: 'manufacturer-directory' as NavItemKey,
          label: 'Manufacturer Directory',
          icon: Building2,
        },
        {
          key: 'brand-intelligence' as NavItemKey,
          label: 'Brand Intelligence',
          icon: Tag,
        },
        {
          key: 'market-analytics' as NavItemKey,
          label: 'Market & Analytics',
          icon: ChartNoAxesCombined,
        },
      ],
    },
    {
      label: 'Scientific & Regulatory',
      items: [
        {
          key: 'regulatory-intelligence' as NavItemKey,
          label: 'Regulatory Intelligence',
          icon: ShieldCheck,
        },
        {
          key: 'patent-intelligence' as NavItemKey,
          label: 'Patent Intelligence',
          icon: FileText,
        },
        {
          key: 'technical-documents' as NavItemKey,
          label: 'Technical Documents',
          icon: Database,
        },
      ],
    },
    {
      label: 'Workspace',
      items: [
        {
          key: 'saved-items' as NavItemKey,
          label: 'Saved Items',
          icon: Bookmark,
          badge: totalSaved > 0 ? totalSaved : undefined,
        },
        {
          key: 'research-workspace' as NavItemKey,
          label: 'Research Workspace',
          icon: BookOpen,
        },
      ],
    },
    {
      label: 'System',
      items: [
        {
          key: 'settings' as NavItemKey,
          label: 'Platform Settings',
          icon: Settings,
        },
      ],
    },
  ];

  return (
    <aside
      className="shell-sidebar fixed left-0 top-0 bottom-0 z-40 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col"
    >
      {/* Brand Header */}
      <div className="fx-brand-header h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="fx-brand-mark w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
              <Leaf size={25} aria-hidden="true" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="fx-brand-name text-base font-bold text-slate-900 dark:text-white truncate">
                Formulix
              </span>
              <span className="text-[11px] text-slate-500 truncate">
                {['market-analytics','formulation-explorer','ingredient-explorer'].includes(currentTab) ? 'Scientific Intelligence' : 'Product intelligence'}
              </span>
            </div>
          </div>
        ) : (
          <div className="fx-brand-mark w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm mx-auto shadow-xs">
            <Leaf size={23} aria-hidden="true" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors ${
            collapsed ? 'hidden sm:block mx-auto mt-2' : ''
          }`}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Scroll Area */}
      <div className="fx-nav-scroll flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navigationGroups.map((group) => (
          <div key={group.label} className="space-y-0.5">
            {!collapsed && !(currentTab === 'market-analytics' && group.label === 'Overview') && (
              <button type="button" className="fx-nav-group" aria-expanded={!closedGroups.includes(group.label)}
                onClick={() => setClosedGroups(previous => previous.includes(group.label) ? previous.filter(label => label !== group.label) : [...previous, group.label])}>
                <span>{group.label}</span><ChevronDown size={13} className={closedGroups.includes(group.label) ? '-rotate-90' : ''} />
              </button>
            )}
            {(collapsed || (currentTab === 'market-analytics' && group.label === 'Overview') || !closedGroups.includes(group.label) ? group.items : []).map((item) => {
              const Icon = item.icon;
              const isActive =
                currentTab === item.key ||
                (item.key === 'product-search' && currentTab === 'product-detail');

              return (
                <button
                  key={item.key}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onTabChange(item.key)}
                  title={item.label}
                  className={`fx-nav-item w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left relative ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/80 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                    }`}
                  />
                  {!collapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-semibold ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
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

      {/* Admin Switcher Shortcut */}
      {onSwitchToAdmin && (
        <div className="p-2 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => window.open('/django-admin/', '_blank', 'noopener')}
            title={collapsed ? "Admin Data Operations Portal" : undefined}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <Database className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
            {!collapsed && (
              <div className="flex-1 text-left">
                <span className="block leading-tight">Admin Data Ops</span>
                <span className="text-[10px] text-slate-400 font-normal">{getDatabaseCatalog().session?.canPreview ? 'Django data operations' : 'Staff sign-in required'}</span>
              </div>
            )}
          </button>
        </div>
      )}

      {/* Footer System Status */}
      {!collapsed ? (
        <div className="fx-sidebar-status p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-[11px]">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="flex items-center gap-1.5">
              <span data-connection={connection} className="fx-system-dot" />
              {connection === 'ready' ? 'Django catalog connected' : connection === 'loading' ? 'Connecting to Django' : 'Backend unavailable'}
            </span>
            <span className="font-mono text-[10px]">v2.6</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Database records. Source claims require independent verification.
          </p>
        </div>
      ) : (
        <div className="p-2 border-t border-slate-200 dark:border-slate-800 text-center">
          <span data-connection={connection} className="fx-system-dot" title={connection === 'ready' ? 'Django catalog connected' : 'Backend connection pending'} />
        </div>
      )}
    </aside>
  );
};
