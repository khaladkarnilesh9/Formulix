import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '../layout/MobileDrawer';
import { Search, X, Database, type LucideIcon } from 'lucide-react';
import { ScientificHero, type ScientificScene } from './ScientificHero';

export function PageHeader({ title, description, icon: Icon, count, actions, scene }: {
  title: string; description?: string; icon?: LucideIcon; count?: React.ReactNode; actions?: React.ReactNode;
  scene?: ScientificScene;
}) {
  if (scene) return <ScientificHero title={title} subtitle={description} icon={Icon} count={count} actions={actions} scene={scene} />;
  return <header className="fx-page-heading">
    <div className="flex min-w-0 items-start gap-3">
      {Icon && <span className="fx-page-icon"><Icon size={22} aria-hidden="true" /></span>}
      <div className="min-w-0">
        <h2 className="fx-page-title">{title}</h2>
        {description && <p className="fx-description">{description}</p>}
      </div>
    </div>
    {(count !== undefined || actions) && <div className="flex flex-wrap items-center gap-3">
      {count !== undefined && <span className="fx-count"><Database size={14} aria-hidden="true" />{count}</span>}{actions}
    </div>}
  </header>;
}

export function SearchField({ value, onChange, label, placeholder }: {
  value: string; onChange: (value: string) => void; label: string; placeholder?: string;
}) {
  return <div className="fx-search-field">
    <Search size={17} aria-hidden="true" />
    <input type="search" aria-label={label} placeholder={placeholder ?? label} value={value} onChange={event => onChange(event.target.value)} />
    {value && <button type="button" onClick={() => onChange('')} aria-label={`Clear ${label.toLowerCase()}`} title="Clear search"><X size={16} /></button>}
  </div>;
}

export function IntelligenceTabs<T extends string>({ value, onChange, tabs, label }: {
  value: T; onChange: (value: T) => void; tabs: { value: T; label: string; count?: number }[]; label: string;
}) {
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  return <div ref={container} className="fx-tabs" role="tablist" aria-label={label}>
    {tabs.map((tab, index) => <button key={tab.value} type="button" role="tab" id={`${id}-${tab.value}`}
      aria-selected={value === tab.value} tabIndex={value === tab.value ? 0 : -1}
      onClick={() => onChange(tab.value)} onKeyDown={event => {
        let next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault(); onChange(tabs[next].value);
        container.current?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
      }}>{tab.label}{tab.count !== undefined && <span>{tab.count}</span>}</button>)}
  </div>;
}

export function MetadataGrid({ items }: { items: { label: string; value: React.ReactNode; mono?: boolean }[] }) {
  return <dl className="fx-metadata-grid">{items.map(item => <div key={item.label}>
    <dt>{item.label}</dt><dd className={item.mono ? 'font-mono' : undefined}>{item.value ?? 'Not recorded'}</dd>
  </div>)}</dl>;
}

export function MetricStrip({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return <dl className="fx-metric-strip">{items.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>;
}

export function DemoNotice({ compact = false }: { compact?: boolean }) {
  return <div className={`fx-provenance ${compact ? 'fx-provenance-compact' : ''}`}>
    <Database size={14} aria-hidden="true" />
    <span><strong>Demonstration workspace.</strong> Seeded records and process illustrations are not independently verified commercial evidence.</span>
  </div>;
}

export function EmptyState({ title, detail, children }: { title: string; detail?: string; children?: React.ReactNode }) {
  return <div className="fx-empty"><Search size={24} aria-hidden="true" /><h3>{title}</h3>{detail && <p>{detail}</p>}{children}</div>;
}

export function RecordDialog({ open, title, onClose, children }: {
  open: boolean; title: string; onClose: () => void; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(open, ref, onClose);
  if (!open) return null;
  return createPortal(<div className="fx-dialog-overlay" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="fx-dialog">
      <header><h2>{title}</h2><button onClick={onClose} aria-label="Close record" title="Close record"><X size={20} /></button></header>
      <div className="fx-dialog-body">{children}</div>
    </div>
  </div>, document.body);
}

export function AdminDialogPortal({ open, label, onClose, children }: {
  open: boolean; label: string; onClose: () => void;
  children: React.ReactElement<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useDialogFocus(open, panel, onClose);
  if (!open) return null;
  return createPortal(<div className="fx-admin-dialog-host admin-page page-content text-slate-900 dark:text-slate-100">{React.cloneElement(children, {
    ref: panel, role: 'dialog', 'aria-modal': true, 'aria-label': label,
    onClick: event => {
      children.props.onClick?.(event);
      if (!event.defaultPrevented && event.target === event.currentTarget) onClose();
    },
  })}</div>, document.body);
}
