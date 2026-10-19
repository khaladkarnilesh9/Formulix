import React, { useState } from 'react';
import { AdminSidebar, AdminTabKey } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { MobileDrawer } from '../../../components/layout/MobileDrawer';
import { DemoNotice } from '../../../components/common/IntelligenceUI';

interface AdminLayoutProps {
  currentTab: AdminTabKey;
  onTabChange: (tab: AdminTabKey) => void;
  onExitToUserPortal: () => void;
  operatorRole: string;
  onChangeOperatorRole: (role: string) => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onTabChange,
  onExitToUserPortal,
  operatorRole,
  onChangeOperatorRole,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div data-sidebar-collapsed={collapsed} className="portal-layout min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-200">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block" data-drawer-background>
        <AdminSidebar
          currentTab={currentTab}
          onTabChange={onTabChange}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          onExitToUserPortal={onExitToUserPortal}
        />
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} label="Admin navigation">
            <AdminSidebar
              currentTab={currentTab}
              onTabChange={(tab) => {
                onTabChange(tab);
                setMobileOpen(false);
              }}
              collapsed={false}
              operatorRole={operatorRole}
              onChangeOperatorRole={onChangeOperatorRole}
              onToggleCollapse={() => setMobileOpen(false)}
              onExitToUserPortal={() => { setMobileOpen(false); onExitToUserPortal(); }}
            />
      </MobileDrawer>

      {/* Main Content Viewport */}
      <div
        data-drawer-background
        className="shell-frame flex-1 flex flex-col min-w-0 transition-all duration-300"
      >
        <AdminHeader
          currentTab={currentTab}
          onNavigate={onTabChange}
          onExitToUserPortal={onExitToUserPortal}
          onToggleSidebarMobile={() => setMobileOpen(true)}
          operatorRole={operatorRole}
          onChangeOperatorRole={onChangeOperatorRole}
        />

        <main className="admin-page page-content flex-1 p-4">
          <DemoNotice compact />
          {children}
        </main>
      </div>
    </div>
  );
};
