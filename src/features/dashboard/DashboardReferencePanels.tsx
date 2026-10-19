import { useState } from 'react';
import { Atom, Database, FileText, FlaskConical, Leaf, Tractor, Search, Package, ArrowUpRight, CalendarDays } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CatalogStatus } from '../../components/common/CatalogStatus';
import { getDatabaseCatalog } from '../../services/formulationApi';
import { DataService } from '../../services/dataService';
import { CountryMap } from '../analytics/MarketCharts';
import { allAnalyticsFilters, countsOf, ingredientOf, marketAnalytics } from '../analytics/analyticsModel';

export function DashboardHero({onNavigate,onOpenSearch}:{onNavigate:(module:string,itemId?:string)=>void;onOpenSearch:()=>void}) {
  return <section className="fx-scientific-hero ed-hero"><img className="fx-scientific-hero-image" src="/assets/scientific/dashboard-reference.webp" alt=""/><div className="fx-scientific-hero-veil"/>
    <div className="ed-hero-copy"><span>SCIENTIFIC INTELLIGENCE</span><h1><span>Formulation</span> &amp; Commercial<br/>Product Intelligence</h1><p>Scientific formulations, active ingredient records, commercial brands,<br className="ed-wide-break"/> manufacturers, patents, and regulatory source intelligence.</p>
      <div className="ed-hero-actions"><button className="fx-button fx-button-primary" onClick={onOpenSearch}><Search size={17}/>Global search</button><button className="fx-button" onClick={()=>onNavigate('product-search')}><Package size={17}/>Explore products<ArrowUpRight size={14}/></button></div>
    </div><div className="ed-hero-science" aria-hidden="true">{[FlaskConical,Atom,FileText,Leaf,Tractor].map((Icon,index)=><span key={index}><Icon size={30}/></span>)}</div><div className="ed-tagline">Driving<br/>Safer &amp; Smarter<br/>Agriculture<i/></div>
    <details className="ed-access"><summary><Database size={12}/>{getDatabaseCatalog().staffPreview?'Staff preview':'Catalog access'}</summary><div><CatalogStatus/></div></details>
  </section>;
}

export function DashboardMarket({onNavigate}:{onNavigate:(module:string,itemId?:string)=>void}) {
  const data=marketAnalytics(getDatabaseCatalog(),allAnalyticsFilters);
  const total=data.countries.reduce((sum,row)=>sum+row.count,0);
  return <div className="ed-panel ed-market"><div className="ed-panel-title"><div><h3>Market distribution</h3><p>Catalog listings by market / region</p></div><button className="fx-icon-button" title="Open market analytics" onClick={()=>onNavigate('market-analytics')}><ArrowUpRight size={14}/></button></div>
    <div className="ed-market-body"><CountryMap countries={data.countries} onSelectRegion={()=>onNavigate('market-analytics')}/><div className="ed-market-key">{data.countries.map((row,index)=><div key={row.name}><span style={{background:['#087bff','#7c3aed','#10b981','#f97316'][index%4]}}/><strong>{row.name}</strong><small>{total?`${(row.count*100/total).toFixed(1)}%`:'0%'}</small></div>)}</div></div>
  </div>;
}

export function DashboardRankings({onNavigate}:{onNavigate:(module:string,itemId?:string)=>void}) {
  const catalog=getDatabaseCatalog();
  const companies=DataService.getDashboardMetrics().manufacturerDistribution.sort((a,b)=>b.productsCount-a.productsCount||a.name.localeCompare(b.name)).slice(0,10);
  const ingredients=countsOf(catalog.products.map(ingredientOf).filter(value=>!['','Not recorded','N/A','-'].includes(value))).slice(0,10);
  const maxCompany=Math.max(1,...companies.map(row=>row.productsCount));
  const maxIngredient=Math.max(1,...ingredients.map(row=>row.count));
  const [range,setRange]=useState('10');
  const history=marketAnalytics(catalog,allAnalyticsFilters).trends;
  const newest=history.at(-1)?.year??0;
  const shown=range==='All'?history:history.filter(row=>row.year>newest-Number(range));
  return <>
    <div className="ed-panel"><div className="ed-panel-title"><div><h3>Top companies by formulations</h3><p>Top 10 companies by catalog listing count</p></div><button className="fx-icon-button" title="Open company directory" onClick={()=>onNavigate('manufacturer-directory')}><ArrowUpRight size={14}/></button></div>
      <div className="ed-rank-list">{companies.map(row=><button key={row.id} onClick={()=>onNavigate('manufacturer-directory',row.id)} title={row.name}><span>{row.name}</span><i><b style={{width:`${row.productsCount*100/maxCompany}%`}}/></i><strong>{row.productsCount.toLocaleString()}</strong></button>)}{!companies.length&&<p className="ed-empty">No company listings recorded.</p>}</div>
    </div>
    <div className="ed-panel"><div className="ed-panel-title"><div><h3>Top active ingredients</h3><p>Source-text listing counts, not normalized identities</p></div><button className="fx-icon-button" title="Open Ingredient Explorer" onClick={()=>onNavigate('ingredient-explorer')}><ArrowUpRight size={14}/></button></div>
      <div className="ed-rank-list">{ingredients.map(row=><button key={row.name} onClick={()=>onNavigate('ingredient-explorer',`source:${row.name}`)} title={row.name}><span>{row.name}</span><i><b style={{width:`${row.count*100/maxIngredient}%`}}/></i><strong>{row.count.toLocaleString()}</strong></button>)}{!ingredients.length&&<p className="ed-empty">No active source records.</p>}</div>
    </div>
    <div className="ed-panel"><div className="ed-panel-title"><div><h3>Registration trends</h3><p>Recorded registration dates by year</p></div><select aria-label="Registration trend period" disabled={!history.length} value={range} onChange={event=>setRange(event.target.value)}><option value="10">Last 10 years</option><option value="5">Last 5 years</option><option value="All">All recorded years</option></select></div>
      {shown.length?<div className="ed-trend-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={shown} margin={{top:10,right:12,bottom:0,left:-20}}><defs><linearGradient id="ed-registration-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3}/><stop offset="100%" stopColor="#7c3aed" stopOpacity={0.03}/></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--ed-border)"/><XAxis dataKey="year" tick={{fontSize:10,fill:'var(--ed-muted)'}}/><YAxis allowDecimals={false} tick={{fontSize:10,fill:'var(--ed-muted)'}}/><Tooltip contentStyle={{background:'var(--ed-panel)',border:'1px solid var(--ed-border)',fontSize:11}}/><Area name="Recorded dates" dataKey="starts" type="monotone" stroke="#7c3aed" fill="url(#ed-registration-fill)" dot={{r:3}} isAnimationActive={false}/></AreaChart></ResponsiveContainer></div>:<div className="ed-empty"><CalendarDays size={25}/><strong>No dated registration records</strong><span>Spreadsheet references do not establish approval dates.</span></div>}
    </div>
  </>;
}
