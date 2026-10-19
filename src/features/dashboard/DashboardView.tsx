import React from 'react';
import { DataService, useSharedRepositoryListener } from '../../services/dataService';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { StatusIndicator } from '../../components/common/EvidenceBadge';
import { DemoNotice, EmptyState } from '../../components/common/IntelligenceUI';
import { ScientificHero } from '../../components/common/ScientificHero';
import { CatalogMetrics } from '../../components/common/CatalogMetrics';
import { DashboardHero, DashboardMarket, DashboardRankings } from './DashboardReferencePanels';
import { Package, FlaskConical, Atom, Building2, ShieldCheck, FileText, Search, ArrowUpRight, Clock, Globe2, GitCompareArrows } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardViewProps { onNavigate: (module: string, itemId?: string) => void; onOpenSearch: () => void; }

const chartColors = ['#10b981', '#087bff', '#7c3aed', '#f97316', '#ec4899', '#06b6d4'];
const tooltipStyle = { backgroundColor: 'var(--fx-surface)', border: '1px solid var(--fx-border)', borderRadius: 6, color: 'var(--fx-text)', fontSize: 12 };

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenSearch }) => {
  useSharedRepositoryListener();
  const data = DataService.getDashboardMetrics();
  const { recentActivities } = useWorkspaceStore();
  const shortcuts = [
    { label: 'Products', icon: Package, route: 'product-search' },
    { label: 'Formulations', icon: FlaskConical, route: 'formulation-explorer' },
    { label: 'Ingredients', icon: Atom, route: 'ingredient-explorer' },
    { label: 'Compare', icon: GitCompareArrows, route: 'product-comparison' },
    { label: 'Patents', icon: FileText, route: 'patent-intelligence' },
    { label: 'Regulatory', icon: ShieldCheck, route: 'regulatory-intelligence' },
  ];
  return <div className="fx-page fx-executive-dashboard">
    <DashboardHero onNavigate={onNavigate} onOpenSearch={onOpenSearch}/>
    <div className="ed-content">
    <CatalogMetrics />
    <nav aria-label="Research shortcuts" className="fx-research-shortcuts">
      {shortcuts.map(({ label, icon: Icon, route }) => <button key={route} onClick={() => onNavigate(route)}><Icon size={17} />{label}<ArrowUpRight size={13} /></button>)}
    </nav>
    <section className="ed-chart-grid">
      <div className="ed-panel ed-sector">
        <div className="ed-panel-title"><div><h3>Sector portfolio</h3><p>Database listing distribution</p></div><button className="fx-icon-button" title="Explore sectors" onClick={()=>onNavigate('product-search')}><ArrowUpRight size={14}/></button></div>
        <div className="ed-sector-body">{data.kpis.totalProducts ? <div className="ed-donut"><ResponsiveContainer width="100%" height="100%">
          <PieChart><Pie data={data.categoryDistribution} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} isAnimationActive={false}>
            {data.categoryDistribution.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
          </Pie><Tooltip contentStyle={tooltipStyle} formatter={(value: unknown) => [String(value), 'Records']} /></PieChart>
        </ResponsiveContainer><div className="ed-donut-total"><strong>{data.kpis.totalProducts.toLocaleString()}</strong><span>Products</span></div></div> : <EmptyState title="No published products" />}
        <div className="ed-sector-key space-y-2">{data.categoryDistribution.map((item, index) => <div key={item.name} className="flex items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-sm" style={{ background: chartColors[index % chartColors.length] }} />{item.name}</span><span>{item.share}</span>
        </div>)}</div></div>
      </div>
      <div className="ed-panel">
        <div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-semibold">Formulation type representation</h3><p className="fx-description">Stored formulation types across the visible Django catalog</p></div>
          <button onClick={() => onNavigate('formulation-explorer')} className="fx-button" title="Explore formulations"><ArrowUpRight size={16} /></button>
        </div>
        {data.formulationTypeDistribution.length ? <div className="ed-type-chart"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.formulationTypeDistribution} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <XAxis dataKey="type" tickFormatter={value => String(value).split('(')[0].trim()} tick={{ fill: 'var(--fx-muted)', fontSize: 9 }} interval={0} height={25}/>
            <YAxis allowDecimals={false} tick={{ fill: 'var(--fx-muted)', fontSize: 9 }} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--fx-raised)' }} />
            <Bar dataKey="count" name="Catalog listings" fill="#245beb" radius={[3, 3, 0, 0]} maxBarSize={52} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer></div> : <EmptyState title="No formulation types recorded" />}
      </div>
      <DashboardMarket onNavigate={onNavigate}/>
      <DashboardRankings onNavigate={onNavigate}/>
    </section>
    <p className="fx-data-note">Live database records. Source verification is independent of publication status.</p>
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="fx-surface p-5 lg:col-span-3">
        <h3 className="text-base font-semibold">Formulation Publication Workflow</h3>
        <div className="flex flex-wrap gap-5 mt-3 text-xs">{data.publicationCounts.map(row => <span key={row.status}>{row.status}: <strong>{row.count.toLocaleString()}</strong></span>)}</div>
        <div className="h-48 mt-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.publicationCounts}><XAxis dataKey="status" tick={{ fontSize: 11, fill: 'var(--fx-muted)' }} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--fx-muted)' }} /><Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--fx-raised)' }} /><Bar dataKey="count" name="Formulations" fill="#10b981" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
      </div>
      <div className="fx-surface p-5">
        <div className="flex items-center gap-2"><Globe2 size={17} className="text-blue-600" /><h3 className="text-base font-semibold">Country-wise Commercial Coverage</h3></div>
        <p className="fx-description">Repository products and registrations by jurisdiction</p>
        <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">{data.countryCoverage.map(country => <div key={country.country} className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs">
          <span className="flex items-center gap-2"><span className="font-mono text-[11px] text-slate-500">{country.flag}</span>{country.country}</span>
          <span className="font-mono text-slate-500">{country.products} products / {country.registrations} records</span>
        </div>)}</div>
      </div>
      <div className="fx-surface p-5 lg:col-span-2">
        <div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-semibold">Recent product records</h3><p className="fx-description">Published commercial dossiers</p></div><button className="fx-button" onClick={() => onNavigate('product-search')}>View catalog<ArrowUpRight size={14} /></button></div>
        <div className="overflow-x-auto mt-4"><table className="fx-data-table"><thead><tr><th>Product</th><th>Active ingredient</th><th>Formulation</th><th>Manufacturer</th><th>Recorded status</th><th>Action</th></tr></thead>
          <tbody>{data.recentUpdates.map(product => <tr key={product.id}>
            <td><strong>{product.brandName}</strong><div className="text-[11px] text-slate-500">{product.country} / {product.strength}</div></td>
            <td>{product.activeIngredient}<div className="font-mono text-[11px] text-slate-500">{product.casNumber}</div></td>
            <td>{product.formulationType}</td><td>{product.manufacturerName}</td><td><StatusIndicator status={product.registrationStatus} /></td>
            <td><button onClick={() => onNavigate('product-detail', product.id)} className="fx-button" title={`Open ${product.brandName} dossier`}><ArrowUpRight size={15} /></button></td>
          </tr>)}</tbody></table></div>
      </div>
    </section>
    <section className="border-t border-slate-200 dark:border-slate-800 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-semibold">Commercial portfolio overview</h3><p className="fx-description">Published products linked by stored manufacturer identifier</p></div><button className="fx-button" onClick={() => onNavigate('manufacturer-directory')}><Building2 size={15} />Company directory</button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 mt-4">
        {[...data.manufacturerDistribution].sort((left, right) => right.productsCount - left.productsCount).map(company => <button key={company.id} className="flex items-center justify-between gap-3 py-3 border-b border-slate-200 dark:border-slate-800 text-left" onClick={() => onNavigate('manufacturer-directory', company.id)}>
          <span className="min-w-0"><span className="block text-sm font-medium">{company.name}</span><span className="text-xs text-slate-500">{company.country} / {company.categories || 'Not recorded'}</span></span><span className="text-sm font-mono shrink-0">{company.productsCount}<ArrowUpRight size={13} className="inline ml-2 text-blue-600" /></span>
        </button>)}
      </div>
    </section>
    <section className="border-t border-slate-200 dark:border-slate-800 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-base font-semibold"><Clock size={17} />Research activity</h3><button onClick={() => onNavigate('research-workspace')} className="fx-button"><ArrowUpRight size={15} />Research workspace</button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">{recentActivities.slice(0, 6).map(activity => <div key={activity.id} className="fx-card">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500"><span>{activity.action}</span><span>{activity.timestamp}</span></div>
        <div className="mt-2 font-medium text-sm">{activity.targetName}</div><div className="mt-2 text-[11px] text-slate-500">{activity.targetType}</div>
      </div>)}</div>
    </section>
    </div>
  </div>;
};
