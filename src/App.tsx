/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { ToastProvider } from './components/common/Toast';
import { DataService, useSharedRepositoryListener } from './services/dataService';
import { CatalogStatus } from './components/common/CatalogStatus';
import { DashboardView } from './features/dashboard/DashboardView';
import { ProductSearchView } from './features/products/ProductSearchView';
import { ProductDetailView } from './features/products/ProductDetailView';
import { FormulationIntelligenceView } from './features/formulations/FormulationIntelligenceView';
import { IngredientExplorerView } from './features/ingredients/IngredientExplorerView';
import { ProductComparisonView } from './features/comparison/ProductComparisonView';
import { ManufacturerDirectoryView } from './features/manufacturers/ManufacturerDirectoryView';
import { BrandIntelligenceView } from './features/manufacturers/BrandIntelligenceView';
import { RegulatoryIntelligenceView } from './features/regulatory/RegulatoryIntelligenceView';
import { PatentDocumentsView } from './features/documents/PatentDocumentsView';
import { WorkspaceView } from './features/workspace/WorkspaceView';
import { SettingsView } from './features/settings/SettingsView';

// Admin Portal Components
import { AdminLayout } from './features/admin/layout/AdminLayout';
import { AdminDashboardView } from './features/admin/dashboard/AdminDashboardView';
import { AdminProductListView } from './features/admin/products/AdminProductListView';
import { AdminProductFormWizard } from './features/admin/products/AdminProductFormWizard';
import { AdminFormulationsView } from './features/admin/formulations/AdminFormulationsView';
import { AdminIngredientsView } from './features/admin/ingredients/AdminIngredientsView';
import { AdminManufacturersView } from './features/admin/manufacturers/AdminManufacturersView';
import { AdminBrandsView } from './features/admin/brands/AdminBrandsView';
import { AdminRegistrationsView } from './features/admin/regulatory/AdminRegistrationsView';
import { AdminDocumentsView } from './features/admin/documents/AdminDocumentsView';
import { AdminBulkImportExportView } from './features/admin/imports/AdminBulkImportExportView';
import { AdminIndianAgroAcquisitionView } from './features/admin/imports/AdminIndianAgroAcquisitionView';
import { AdminReviewQueueView } from './features/admin/review/AdminReviewQueueView';
import { AdminDataQualityView } from './features/admin/quality/AdminDataQualityView';
import { AdminMasterDataView } from './features/admin/masterdata/AdminMasterDataView';
import { AdminAuditLogsView } from './features/admin/audit/AdminAuditLogsView';
import { AdminFieldAuditMatrixView } from './features/admin/matrix/AdminFieldAuditMatrixView';
import { AdminE2ETestRunnerView } from './features/admin/testing/AdminE2ETestRunnerView';
import { AdminSettingsView as AdminSystemSettingsView } from './features/admin/settings/AdminSettingsView';
import { AdminProductRecord } from './data/repositories/sharedRepository';
import { MobileDrawer } from './components/layout/MobileDrawer';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { usePortalNavigation } from './components/layout/navigation';

const MarketAnalyticsView = lazy(() => import('./features/analytics/MarketAnalyticsView').then(module => ({ default: module.MarketAnalyticsView })));

export default function App() {
  useSharedRepositoryListener();
  // Top-level portal switch: 'user' | 'admin'
  const { portal, setPortal, currentTab, setCurrentTab, adminTab, setAdminTab, selection,
    setSelectedProductId, setSelectedFormulationId, setSelectedIngredientCas,
    setSelectedMfgId, setSelectedDocId } = usePortalNavigation();

  // User Portal Navigation State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState({ query: '', revision: 0 });

  // Admin Portal Navigation State
  const [operatorRole, setOperatorRole] = useState('Principal Architect');
  const [editingProduct, setEditingProduct] = useState<AdminProductRecord | null>(null);

  // Deep-dive selection states
  const { product: selectedProductId, formulation: selectedFormulationId,
    ingredient: selectedIngredientCas, manufacturer: selectedMfgId, document: selectedDocId } = selection;
  const [adminContextVisited, setAdminContextVisited] = useState(portal === 'admin');
  useEffect(() => { if (portal === 'admin') setAdminContextVisited(true); }, [portal]);

  // Global Keyboard Shortcut: ⌘K or Ctrl+K to open Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (module: string, itemId?: string) => {
    switch (module) {
      case 'dashboard':
        setCurrentTab('dashboard');
        break;
      case 'products':
      case 'product-search':
        if (itemId) {
          setSelectedProductId(itemId);
          setCurrentTab('product-detail');
        } else {
          setCurrentTab('product-search');
        }
        break;
      case 'product-detail':
        if (itemId) setSelectedProductId(itemId);
        setCurrentTab('product-detail');
        break;
      case 'formulations':
      case 'formulation-explorer':
        if (itemId) setSelectedFormulationId(itemId);
        setCurrentTab('formulation-explorer');
        break;
      case 'ingredients':
      case 'ingredient-explorer':
        if (itemId) setSelectedIngredientCas(itemId);
        setCurrentTab('ingredient-explorer');
        break;
      case 'product-comparison':
        setCurrentTab('product-comparison');
        break;
      case 'manufacturers':
      case 'manufacturer-directory':
        if (itemId) setSelectedMfgId(itemId);
        setCurrentTab('manufacturer-directory');
        break;
      case 'brand-intelligence':
        if (itemId) setBrandSearch(previous => ({ query: itemId, revision: previous.revision + 1 }));
        setCurrentTab('brand-intelligence');
        break;
      case 'market-analytics':
        setCurrentTab('market-analytics');
        break;
      case 'regulatory':
      case 'regulatory-intelligence':
        setCurrentTab('regulatory-intelligence');
        break;
      case 'documents':
      case 'patent-intelligence':
      case 'technical-documents':
        if (itemId) setSelectedDocId(itemId);
        setCurrentTab(module === 'technical-documents' ? 'technical-documents' : 'patent-intelligence');
        break;
      case 'saved-items':
        setCurrentTab('saved-items');
        break;
      case 'research-workspace':
        setCurrentTab('research-workspace');
        break;
      case 'settings':
        setCurrentTab('settings');
        break;
      default:
        setCurrentTab('dashboard');
    }
    setMobileSidebarOpen(false);
  };

  const handleSelectProduct = (id: string) => {
    setSelectedProductId(id);
    setCurrentTab('product-detail');
  };

  const handleSelectFormulation = (id: string) => {
    setSelectedFormulationId(id);
    setCurrentTab('formulation-explorer');
  };

  const handleSelectIngredient = (casOrId: string) => {
    setSelectedIngredientCas(casOrId);
    setCurrentTab('ingredient-explorer');
  };

  const handleSelectManufacturer = (id: string) => {
    setSelectedMfgId(id);
    setCurrentTab('manufacturer-directory');
  };

  const handleOpenDocument = (docId: string) => {
    setSelectedDocId(docId);
    setCurrentTab('patent-intelligence');
  };

  return (
    <ToastProvider>
      {portal === 'admin' ? (
        <AdminLayout
          currentTab={adminTab}
          onTabChange={(tab) => {
            if (tab === 'admin-products-new') {
              setEditingProduct(null);
            }
            setAdminTab(tab);
          }}
          onExitToUserPortal={() => setPortal('user')}
          operatorRole={operatorRole}
          onChangeOperatorRole={setOperatorRole}
        >
          {adminTab === 'admin-dashboard' && (
            <AdminDashboardView onNavigate={(tab) => setAdminTab(tab)} />
          )}

          {adminTab === 'admin-indian-agro' && (
            <AdminIndianAgroAcquisitionView />
          )}

          {adminTab === 'admin-products' && (
            <AdminProductListView
              onCreateNewProduct={() => {
                setEditingProduct(null);
                setAdminTab('admin-products-new');
              }}
              onEditProduct={(p) => {
                setEditingProduct(p);
                setAdminTab('admin-products-new');
              }}
              onPreviewInUserPortal={(productId) => {
                setSelectedProductId(productId);
                setCurrentTab('product-detail');
                setPortal('user');
              }}
            />
          )}

          {adminTab === 'admin-products-new' && (
            <AdminProductFormWizard
              initialProduct={editingProduct}
              onSaveSuccess={(p) => {
                setEditingProduct(null);
                setAdminTab('admin-products');
              }}
              onCancel={() => {
                setEditingProduct(null);
                setAdminTab('admin-products');
              }}
              operatorRole={operatorRole}
            />
          )}

          {adminTab === 'admin-formulations' && (
            <AdminFormulationsView
              onPreviewInUserPortal={(formId) => {
                setSelectedFormulationId(formId);
                setCurrentTab('formulation-explorer');
                setPortal('user');
              }}
            />
          )}

          {adminTab === 'admin-ingredients' && (
            <AdminIngredientsView
              onPreviewInUserPortal={(casOrId) => {
                setSelectedIngredientCas(casOrId);
                setCurrentTab('ingredient-explorer');
                setPortal('user');
              }}
            />
          )}

          {adminTab === 'admin-manufacturers' && (
            <AdminManufacturersView
              onPreviewInUserPortal={(mfgId) => {
                setSelectedMfgId(mfgId);
                setCurrentTab('manufacturer-directory');
                setPortal('user');
              }}
            />
          )}

          {adminTab === 'admin-brands' && (
            <AdminBrandsView
              onSelectProduct={(productId) => {
                setSelectedProductId(productId);
                setCurrentTab('product-detail');
                setPortal('user');
              }}
            />
          )}

          {adminTab === 'admin-registrations' && <AdminRegistrationsView />}

          {(adminTab === 'admin-patents' || adminTab === 'admin-documents') && (
            <AdminDocumentsView />
          )}

          {adminTab === 'admin-imports' && <AdminBulkImportExportView />}

          {adminTab === 'admin-review' && (
            <AdminReviewQueueView
              onInspectProduct={(p) => {
                setEditingProduct(p);
                setAdminTab('admin-products-new');
              }}
            />
          )}

          {adminTab === 'admin-data-quality' && <AdminDataQualityView />}

          {adminTab === 'admin-master-data' && <AdminMasterDataView />}

          {adminTab === 'admin-audit-logs' && <AdminAuditLogsView />}

          {adminTab === 'admin-field-audit' && <AdminFieldAuditMatrixView />}

          {adminTab === 'admin-e2e-tests' && <AdminE2ETestRunnerView />}

          {adminTab === 'admin-settings' && (
            <AdminSystemSettingsView
              operatorRole={operatorRole}
              onChangeOperatorRole={setOperatorRole}
            />
          )}
        </AdminLayout>
      ) : (
        <div data-module={currentTab} data-sidebar-collapsed={sidebarCollapsed} className="portal-layout min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-200">
          {/* Persistent Desktop Sidebar */}
          <div className="hidden lg:block" data-drawer-background>
            <Sidebar
              currentTab={currentTab}
              onTabChange={(tab) => {
                setCurrentTab(tab);
              }}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              onSwitchToAdmin={() => setPortal('admin')}
            />
          </div>

          {/* Mobile Drawer Sidebar */}
          <MobileDrawer open={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} label="Formulix navigation">
                <Sidebar
                  currentTab={currentTab}
                  onTabChange={(tab) => {
                    setCurrentTab(tab);
                    setMobileSidebarOpen(false);
                  }}
                  collapsed={false}
                  onToggleCollapse={() => setMobileSidebarOpen(false)}
                  onSwitchToAdmin={adminContextVisited ? () => {
                    setPortal('admin');
                    setMobileSidebarOpen(false);
                  } : undefined}
                />
          </MobileDrawer>

          {/* Main Workspace Frame */}
          <div
            data-drawer-background
            className="shell-frame flex-1 flex flex-col min-w-0 transition-all duration-300"
          >
            {/* Header */}
            <Header
              currentTab={currentTab}
              onOpenSearch={() => setIsSearchOpen(true)}
              onNavigate={(tab) => setCurrentTab(tab)}
              onToggleSidebarMobile={() => window.matchMedia('(min-width: 1024px)').matches ? setSidebarCollapsed(value => !value) : setMobileSidebarOpen(true)}
              onSwitchToAdmin={() => setPortal('admin')}
            />

            {/* Body Content Area */}
            <main className="public-page page-content flex-1 p-4">
              {!['market-analytics','formulation-explorer','ingredient-explorer','product-search','dashboard','brand-intelligence','manufacturer-directory'].includes(currentTab) && <CatalogStatus />}
              {currentTab === 'market-analytics' && <Suspense fallback={<div role="status" className="p-4 text-sm text-slate-500">Loading market analytics...</div>}><MarketAnalyticsView onOpenSearch={() => setIsSearchOpen(true)} onNavigateIngredients={() => setCurrentTab('ingredient-explorer')} /></Suspense>}
              {currentTab === 'dashboard' && (
                <DashboardView
                  onNavigate={handleNavigate}
                  onOpenSearch={() => setIsSearchOpen(true)}
                />
              )}

              {currentTab === 'product-search' && (
                <ProductSearchView
                  onSelectProduct={handleSelectProduct}
                  onNavigateComparison={() => setCurrentTab('product-comparison')}
                />
              )}

              {currentTab === 'product-detail' && (
                <ProductDetailView
                  productId={selectedProductId}
                  onBack={() => setCurrentTab('product-search')}
                  onNavigateToFormulation={handleSelectFormulation}
                  onNavigateToIngredient={handleSelectIngredient}
                  onNavigateToManufacturer={handleSelectManufacturer}
                  onOpenDocument={handleOpenDocument}
                />
              )}

              {currentTab === 'formulation-explorer' && (
                <FormulationIntelligenceView
                  initialFormulationId={selectedFormulationId}
                  onSelectProduct={handleSelectProduct}
                  onSelectIngredient={handleSelectIngredient}
                />
              )}

              {currentTab === 'ingredient-explorer' && (
                <IngredientExplorerView
                  initialCasOrId={selectedIngredientCas}
                  onSelectProduct={handleSelectProduct}
                  onSelectManufacturer={handleSelectManufacturer}
                />
              )}

              {currentTab === 'product-comparison' && (
                <ProductComparisonView
                  onSelectProduct={handleSelectProduct}
                  onNavigateToSearch={() => setCurrentTab('product-search')}
                />
              )}

              {currentTab === 'manufacturer-directory' && (
                <ManufacturerDirectoryView
                  initialManufacturerId={selectedMfgId}
                  onSelectProduct={handleSelectProduct}
                />
              )}

              {currentTab === 'brand-intelligence' && (
                <BrandIntelligenceView
                  key={brandSearch.revision} initialQuery={brandSearch.query}
                  onSelectProduct={handleSelectProduct}
                  onSelectManufacturer={handleSelectManufacturer}
                />
              )}

              {currentTab === 'regulatory-intelligence' && (
                <RegulatoryIntelligenceView
                  onSelectProduct={handleSelectProduct}
                />
              )}

              {(currentTab === 'patent-intelligence' || currentTab === 'technical-documents') && (
                <PatentDocumentsView
                  key={currentTab}
                  mode={currentTab === 'patent-intelligence' ? 'patents' : 'documents'}
                  onSelectProduct={(name) => {
                    const match = DataService.getProducts({ query: name }).items[0];
                    if (match) handleSelectProduct(match.id);
                    else setCurrentTab('product-search');
                  }}
                  onSelectIngredient={handleSelectIngredient}
                  selectedDocId={selectedDocId}
                />
              )}

              {currentTab === 'saved-items' && (
                <WorkspaceView
                  onSelectProduct={handleSelectProduct}
                  onSelectFormulation={handleSelectFormulation}
                  onSelectManufacturer={handleSelectManufacturer}
                  initialTab="saved"
                />
              )}

              {currentTab === 'research-workspace' && (
                <WorkspaceView
                  onSelectProduct={handleSelectProduct}
                  onSelectFormulation={handleSelectFormulation}
                  onSelectManufacturer={handleSelectManufacturer}
                  initialTab="notes"
                />
              )}

              {currentTab === 'settings' && <SettingsView />}
            </main>
          </div>
          <MobileBottomNav currentTab={currentTab} onOpenMore={() => setMobileSidebarOpen(true)} />

          {/* Global Search Dialog (⌘K) */}
          <GlobalSearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onNavigate={handleNavigate}
          />
        </div>
      )}
    </ToastProvider>
  );
}
