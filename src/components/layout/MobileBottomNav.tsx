import React from 'react';
import { Link } from 'react-router-dom';
import { House, PackageSearch, FlaskConical, Atom, MoreHorizontal } from 'lucide-react';
import type { NavItemKey } from './Sidebar';
import { userPaths } from './navigation';

const items = [
  { key: 'dashboard', label: 'Home', icon: House },
  { key: 'product-search', label: 'Products', icon: PackageSearch },
  { key: 'formulation-explorer', label: 'Formulations', icon: FlaskConical },
  { key: 'ingredient-explorer', label: 'Ingredients', icon: Atom },
] as const;

export function MobileBottomNav({ currentTab, onOpenMore }: { currentTab: NavItemKey; onOpenMore: () => void }) {
  const moreActive = !items.some(item => item.key === currentTab || (item.key === 'product-search' && currentTab === 'product-detail'));
  return <nav aria-label="Primary mobile navigation" data-drawer-background
    className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 md:hidden">
    {items.map(({ key, label, icon: Icon }) => {
    const active = currentTab === key || (key === 'product-search' && currentTab === 'product-detail');
      return <Link key={key} to={userPaths[key]} aria-current={active ? 'page' : undefined}
        className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 transition-colors ${active
          ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
        <Icon size={20} aria-hidden="true" />
        <span className="text-[10px] font-medium">{label}</span>
      </Link>;
    })}
    <button type="button" onClick={onOpenMore} aria-label="More navigation" aria-haspopup="dialog" aria-current={moreActive ? 'page' : undefined} className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 ${moreActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}><MoreHorizontal size={20} /><span className="text-[10px] font-medium">More</span></button>
  </nav>;
}
