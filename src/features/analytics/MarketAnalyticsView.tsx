import { useMemo, useState, type ReactNode } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend, LabelList } from 'recharts';
import { Box, FlaskConical, Atom, Tag, Globe2, FileText, Info, Filter, RotateCcw, CalendarDays, Search, Sun, Moon, Database } from 'lucide-react';
import { getDatabaseCatalog, getFormulationApiState } from '../../services/formulationApi';
import { useSharedRepositoryListener } from '../../services/dataService';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { CatalogStatus } from '../../components/common/CatalogStatus';
import { AnalyticsFlow, CountryMap, PortfolioTreemap, TargetHeatmap, chartTooltip } from './MarketCharts';
import { allAnalyticsFilters, classificationColor, classificationRank, classificationOf, companyOf, countsOf, dateYear, ingredientOf, marketAnalytics, typeColor, typeRank, typeOf, type AnalyticsFilters } from './analyticsModel';

function Panel({ title, info, children, className = '', actions, subtitle }: { title: string; info: string; children: ReactNode; className?: string; actions?: ReactNode; subtitle?: string }) {
  return <section className={`ma-panel ${className}`}>
    <header><div><h2>{title}<Info size={12} tabIndex={0} aria-label={info}><title>{info}</title></Info></h2>{subtitle && <p>{subtitle}</p>}</div>{actions}</header>
    {children}
  </section>;
}

export function MarketAnalyticsView({ onOpenSearch, onNavigateIngredients }: { onOpenSearch: () => void; onNavigateIngredients: () => void }) {
  const revision = useSharedRepositoryListener();
  const [filters, setFilters] = useState<AnalyticsFilters>(allAnalyticsFilters);
  const [applied, setApplied] = useState<AnalyticsFilters>(allAnalyticsFilters);
  const [heatMode, setHeatMode] = useState<'Crop' | 'Pest'>('Pest');
  const { theme, toggleTheme } = useWorkspaceStore();
  const catalog = getDatabaseCatalog();
  const data = useMemo(() => marketAnalytics(catalog, applied), [revision, applied, catalog]);
  const options = useMemo(() => ({
    manufacturer: countsOf(catalog.products.map(companyOf)).map(row => row.name).sort(),
    region: [...new Set(catalog.products.map(row => row.country).filter(Boolean))].sort(),
    classification: countsOf(catalog.products.map(classificationOf)).map(row => row.name).sort(),
    ingredient: countsOf(catalog.products.map(ingredientOf)).map(row => row.name).filter(name => name !== 'Not recorded').sort(),
    type: countsOf(catalog.products.map(typeOf)).map(row => row.name).sort(),
    year: [...new Set(catalog.regulatoryRecords.map(row => dateYear(row.approvalDate)).filter((year): year is number => year !== undefined))].sort((a, b) => a - b).map(String),
  }), [revision, catalog]);
  const choose = (key: keyof AnalyticsFilters, value: string) => { const next = { ...applied, [key]: value }; setApplied(next); setFilters(next); };
  const metrics = [
    { label: 'Products', value: data.products.length, icon: Box, tone: 'blue', series: data.categories },
    { label: 'Formulations', value: data.formulations.length, icon: FlaskConical, tone: 'violet', series: data.types },
    { label: 'Active records', value: data.active.length, icon: Atom, tone: 'green', series: data.active },
    { label: 'Brands', value: data.brands, icon: Tag, tone: 'orange', series: countsOf(data.products.map(row => row.brandName)) },
    { label: 'Markets', value: data.countries.length, icon: Globe2, tone: 'pink', series: data.countries },
    { label: 'References', value: data.registrations.length, icon: FileText, tone: 'blue', series: countsOf(data.registrations.map(row => row.country)) },
  ];
  const orderedCategories = [...data.categories].sort((a, b) => classificationRank(a.name) - classificationRank(b.name));
  const pieRows = orderedCategories.length > 6 ? [...orderedCategories.slice(0, 5), { name: 'Other classifications', count: orderedCategories.slice(5).reduce((sum, row) => sum + row.count, 0) }] : orderedCategories;
  const orderedTypes = [...data.types].sort((a, b) => typeRank(a.name) - typeRank(b.name));
  const types = orderedTypes.length > 8 ? [...orderedTypes.slice(0, 7), { name: 'Others', count: orderedTypes.slice(7).reduce((sum, row) => sum + row.count, 0) }] : orderedTypes;
  const noProducts = <div className="ma-empty">No matching catalog listings.</div>;
  const filterFields: { key: keyof AnalyticsFilters; label: string; all: string }[] = [
    { key: 'manufacturer', label: 'Manufacturer', all: 'All manufacturers' }, { key: 'region', label: 'Region', all: 'All countries / regions' },
    { key: 'classification', label: 'Pesticide Category', all: 'All classifications' }, { key: 'ingredient', label: 'Active Ingredient', all: 'All active records' },
    { key: 'type', label: 'Formulation Type', all: 'All formulation types' }, { key: 'year', label: 'Year Range', all: options.year.length ? 'All years' : 'No recorded dates' },
  ];
  return <div className="market-analytics-page">
    <section className="ma-hero">
      <img src="/assets/scientific/agriculture.jpg" alt="" aria-hidden="true" />
      <div className="ma-hero-veil" />
      <div className="ma-hero-copy"><p>Formulix / <strong>Market &amp; Analytics</strong></p><h1>Market &amp; Analytics Intelligence</h1><span>Explore company-wise, group-wise, active ingredient, formulation, and country-wise insights.</span></div>
      <div className="ma-hero-tools">
        <button aria-label="Search Formulix" title="Search Formulix" onClick={onOpenSearch}><Search size={16} /></button>
        <button aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title="Toggle theme" onClick={toggleTheme}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
        <details className="ma-catalog-menu"><summary title="Catalog access and staff sign-in"><Database size={14} />{getFormulationApiState() === 'unavailable' ? 'Catalog offline' : catalog.session?.canPreview ? 'Staff catalog' : 'Public catalog'}</summary><div className="ma-catalog-popover"><CatalogStatus /></div></details>
      </div>
    </section>
    <div className="ma-content">
      <form className="ma-filters" onSubmit={event => { event.preventDefault(); setApplied({ ...filters }); }}>
        {filterFields.map(field => <label key={field.key}>{field.label}<span className={field.key === 'year' ? 'ma-year-select' : ''}>
          {field.key === 'year' && <CalendarDays size={14} />}
          <select aria-label={`Analytics ${field.label}`} value={filters[field.key]} disabled={field.key === 'year' && !options.year.length}
            title={field.key === 'year' && !options.year.length ? 'No registration approval dates recorded' : undefined}
            onChange={event => setFilters(current => ({ ...current, [field.key]: event.target.value }))}>
            <option value="All">{field.all}</option>{options[field.key].map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </span></label>)}
        <div className="ma-filter-actions"><button type="submit" className="ma-apply"><Filter size={16} />Apply</button><button type="button" className="ma-reset" onClick={() => { setFilters(allAnalyticsFilters); setApplied(allAnalyticsFilters); }}><RotateCcw size={12} />Reset</button></div>
      </form>
      <div className="ma-metrics" aria-label="Filtered catalog metrics">{metrics.map(({ icon: Icon, ...metric }) => <div key={metric.label} className="ma-metric" data-tone={metric.tone}>
        <span className="ma-metric-icon"><Icon size={28} strokeWidth={2} /></span><div><strong>{getFormulationApiState() === 'ready' ? metric.value.toLocaleString() : '--'}</strong><span>{metric.label}</span></div>
        <div className="ma-mini-bars" role="img" aria-label={`${metric.label} snapshot distribution`} title="Current catalog distribution; not a growth trend">
          {metric.series.slice(0, 6).map((row, index) => <i key={index} style={{ height: `${Math.max(3, row.count / Math.max(1, ...metric.series.map(item => item.count)) * 23)}px` }} />)}
        </div>
      </div>)}</div>
      <div className="ma-chart-grid">
        <Panel title="Product Portfolio by Pesticide Category" info="Classification is source-reported. Counts represent catalog listings." subtitle={`Total Products: ${data.products.length.toLocaleString()}`} className="ma-portfolio-panel">
          {data.products.length ? <div className="ma-donut-layout"><div className="ma-donut">
            <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieRows} dataKey="count" nameKey="name" innerRadius="55%" outerRadius="92%" stroke="none" isAnimationActive={false}>
              {pieRows.map((row, index) => <Cell key={row.name} fill={classificationColor(row.name, index)} />)}
            </Pie><Tooltip contentStyle={chartTooltip} /></PieChart></ResponsiveContainer>
            <div className="ma-donut-center"><strong>{data.products.length.toLocaleString()}</strong><span>Products</span></div>
          </div><div className="ma-category-legend">{pieRows.map((row, index) => <button key={row.name} title={`${row.name}: ${row.count} listings`} disabled={row.name === 'Other classifications'} onClick={() => choose('classification', row.name)}>
            <i style={{ background: classificationColor(row.name, index) }} /><span>{row.name}</span><strong>{row.count}</strong><small>({(row.count / data.products.length * 100).toFixed(1)}%)</small>
          </button>)}</div></div> : noProducts}
        </Panel>
        <Panel title="Formulation Type Distribution" info="Distribution of formulation type codes in the filtered product catalog." subtitle={`Total Formulations: ${data.formulations.length.toLocaleString()}`}>
          {types.length ? <div className="ma-chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={types} margin={{ left: -23, right: 3, top: 20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--ma-grid)" /><XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--ma-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--ma-border)' }} interval={0} tickFormatter={value => String(value).slice(0, 7)} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--ma-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={chartTooltip} cursor={{ fill: 'var(--ma-raised)' }} /><Bar dataKey="count" name="Listings" radius={[3, 3, 0, 0]} isAnimationActive={false} maxBarSize={36}>{types.map(row => <Cell key={row.name} fill={typeColor(row.name)} />)}<LabelList dataKey="count" position="top" fill="var(--ma-text)" fontSize={11} fontWeight={600} /></Bar>
          </BarChart></ResponsiveContainer></div> : noProducts}
        </Panel>
        <Panel title="Country-wise Product Coverage" info="Map uses source-reported countries. Regional entries are not assigned to individual countries. References are not verified approvals.">
          <CountryMap countries={data.countries} onSelectRegion={value => choose('region', value)} />
        </Panel>
        <Panel title="Manufacturer → Category → Formulation Type" info="Rectangle area is proportional to catalog listing count. Hover to see the complete recorded names.">
          {data.products.length ? <PortfolioTreemap products={data.products} /> : noProducts}
        </Panel>
        <Panel title="Registration Trends by Year" info="Uses recorded approval and expiry dates only. No renewal events or dates are inferred.">
          {data.trends.length ? <div className="ma-chart-area"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.trends} margin={{ top: 4, left: -25, right: 6, bottom: 0 }}>
            <CartesianGrid stroke="var(--ma-grid)" /><XAxis dataKey="year" tick={{ fontSize: 9, fill: 'var(--ma-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--ma-border)' }} interval="preserveStartEnd" /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--ma-muted)' }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={chartTooltip} /><Legend verticalAlign="top" height={30} iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 9 }} />
            <Line type="linear" dataKey="starts" name="Recorded starts" stroke="#076bff" strokeWidth={1.6} dot={{ r: 2.6 }} isAnimationActive={false} /><Line type="linear" dataKey="expiry" name="Recorded expiries" stroke="#ff951b" strokeWidth={1.6} dot={{ r: 2.6 }} isAnimationActive={false} />
          </LineChart></ResponsiveContainer></div> : <div className="ma-empty"><CalendarDays size={26} /><strong>No dated registration records</strong><span>Approval and expiry dates are not recorded for these references.</span></div>}
        </Panel>
        <Panel title="Active Ingredient vs Crop / Target Pest" info="Cell color represents linked catalog listings, not measured usage or efficacy." actions={<select className="ma-heat-select" aria-label="Heatmap target" value={heatMode} onChange={event => setHeatMode(event.target.value as 'Crop' | 'Pest')}><option value="Crop">View: Crop</option><option value="Pest">View: Pest</option></select>}>
          <TargetHeatmap products={data.products} mode={heatMode} />
        </Panel>
        <div className="ma-bottom-grid">
        <Panel title="Product Flow Analysis" info="Manufacturer → brand → exact active ingredient source text → formulation type. Minor groups are aggregated; each link counts listings." className="ma-flow-panel">
          {data.products.length ? <AnalyticsFlow products={data.products} /> : noProducts}
        </Panel>
        <Panel title="Top Active Ingredients" info="Counts exact source-reported active ingredient text, including mixtures, not independently verified chemical identities." actions={<button className="ma-text-action" onClick={onNavigateIngredients}>View All</button>} className="ma-top-panel">
          {data.active.length ? <div className="ma-ranking">{data.active.slice(0, 8).map(row => <button key={row.name} onClick={() => choose('ingredient', row.name)} title={`${row.name}: ${row.count} listings`}><span>{row.name}</span><i><b style={{ width: `${row.count / data.active[0].count * 100}%` }} /></i><strong>{row.count}</strong></button>)}</div> : noProducts}
        </Panel>
        </div>
      </div>
    </div>
  </div>;
}
