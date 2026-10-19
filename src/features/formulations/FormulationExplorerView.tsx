import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Atom, Bookmark, Building2, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Copy, Database, Download, Droplets, ExternalLink, FileText, Filter, Flame, FlaskConical, Globe2, Layers, Leaf, RotateCcw, Search, ShieldCheck, Sprout, TriangleAlert, Waves, X, type LucideIcon } from 'lucide-react';
import { DataService, useSharedRepositoryListener } from '../../services/dataService';
import { getDatabaseCatalog } from '../../services/formulationApi';
import { useSearchFacets, useServerSearch } from '../../services/searchApi';
import { compositionSummary, sourceHref } from '../../services/presentation';
import { useSessionState } from '../../stores/useSessionState';
import { useRecordSelection } from '../../stores/useRecordSelection';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { MobileDrawer } from '../../components/layout/MobileDrawer';
import { EvidenceBadge } from '../../components/common/EvidenceBadge';
import { CatalogStatus } from '../../components/common/CatalogStatus';
import { SearchStatus } from '../../components/common/SearchStatus';
import { useToast } from '../../components/common/Toast';
import type { Formulation } from '../../types';

interface Props { initialFormulationId?: string; onSelectProduct: (id: string) => void; onSelectIngredient: (id: string) => void; }
type Tab = 'overview' | 'composition' | 'process' | 'properties' | 'sources';
interface Fact { label: string; value: string; icon: LucideIcon; tone: string; }
const categories = ['All', 'Agrochemical', 'Pharmaceutical', 'Industrial'];
const types = ['All', 'SC', 'SL', 'WG', 'Tablets', 'Controlled-release', 'Capsules', 'Coatings', 'Surfactant'];
const tabs: {id: Tab; label: string}[] = [{id:'overview',label:'Overview'},{id:'composition',label:'Composition'},{id:'process',label:'Process'},{id:'properties',label:'Properties'},{id:'sources',label:'Sources & Patents'}];
const valueOf = (value?: string) => value?.trim() ? value : 'Not available';

function factsOf(form: Formulation): Fact[] {
  const data = form.marketData ?? {};
  return [
    {label:'Company',value:data['Company Name'],icon:Building2,tone:'orange'},
    {label:'Market',value:data.Market,icon:Globe2,tone:'blue'},
    {label:'Product Classification',value:data['Product Classification'],icon:Leaf,tone:'green'},
    {label:'Formulation Type',value:form.formulationType,icon:FlaskConical,tone:'violet'},
    {label:'Active Ingredient & % (w/w)',value:data['Active Ingredient & % (w/w)'] || form.composition.filter(row=>['Active','API'].includes(row.ingredientCategory)).map(row=>`${row.ingredient} ${row.concentration} ${row.unit ?? ''}`).join('; '),icon:Atom,tone:'green'},
    {label:'Dispersing / Wetting Agent & CAS No.',value:data['Dispersing / Wetting Agent & CAS No.'],icon:Droplets,tone:'blue'},
    {label:'Carrier / Solvent Matrix & CAS No.',value:data['Carrier / Solvent Matrix & CAS No.'],icon:Layers,tone:'orange'},
    {label:'Functional Excipients & CAS No.',value:data['Functional Excipients & CAS No.'],icon:Atom,tone:'violet'},
    {label:'Density / Specific Gravity',value:data['Density / Specific Gravity (g/mL)'] || form.properties.density,icon:Droplets,tone:'cyan'},
    {label:'pH Range',value:data['pH Range'] || form.properties.ph,icon:FlaskConical,tone:'violet'},
    {label:'EPA / CIBRC Registration No.',value:data['EPA / CIBRC Registration No.'],icon:ShieldCheck,tone:'blue'},
    {label:'Flash Point Range',value:data['Flash Point Range (\u00b0C)'],icon:Flame,tone:'orange'},
    {label:'Viscosity Profile',value:data['Viscosity Profile (mPa\u00b7s / cP)'] || form.properties.viscosity,icon:Waves,tone:'cyan'},
    {label:'WHO Hazard Classification',value:data['WHO Hazard Classification'],icon:TriangleAlert,tone:'orange'},
    {label:'CIBRC Toxicity Color Band',value:data['CIBRC Toxicity Color Band'],icon:ShieldCheck,tone:'orange'},
    {label:'Patent Reference',value:data['Patent Reference'],icon:FileText,tone:'blue'},
  ].map(row=>({...row,value:valueOf(row.value)}));
}

function MaterialImage({ form, large = false }: { form: Formulation; large?: boolean }) {
  const [failed,setFailed] = useState(false);
  const supplied = (form as Formulation & {imageUrl?: string}).imageUrl;
  const genuine = supplied && sourceHref(supplied);
  const granular = /WG|WDG|WP|GR|SG|powder|granul/i.test(form.formulationType);
  const url = genuine || (granular ? '/assets/scientific/material-granules.webp' : '/assets/scientific/formulation-explorer.webp');
  useEffect(()=>setFailed(false),[url]);
  return <span className={`fe-material ${large?'fe-material-large':''} ${granular?'':'fe-material-liquid'}`} title={genuine?'Source-supplied product image':'Illustrative scientific material, not a product photograph'}>
    {!failed ? <img src={url} alt={genuine?`Source image for ${form.name}`:'Generic scientific illustration'} loading="lazy" onError={()=>setFailed(true)} /> : <FlaskConical size={large?40:28} />}
  </span>;
}

function FactTile({fact,compact=false}:{fact:Fact;compact?:boolean}) {
  return <div className={`fe-fact ${compact?'fe-fact-compact':''}`} data-tone={fact.tone}><span className="fe-fact-icon"><fact.icon size={21}/></span><div><span>{fact.label}</span><strong>{fact.value}</strong></div></div>;
}

function SourceProvenance({form}:{form:Formulation}) {
  const metadata=form as Formulation & {sourceTitle?:string;sourceType?:string;sourceSheet?:string;sourceRow?:number;createdAt?:string;sourceUrl?:string;verificationState?:string};
  const url=sourceHref(metadata.sourceUrl);
  const rows=[{label:'Source File',value:metadata.sourceTitle},{label:'Source Sheet',value:metadata.sourceSheet},
    {label:'Source Row',value:metadata.sourceRow==null?undefined:String(metadata.sourceRow)},
    {label:'Source Type',value:metadata.sourceType},{label:'Record Created',value:metadata.createdAt},{label:'Verification State',value:metadata.verificationState}];
  return <div className="fe-source-metadata"><div className="fe-property-grid">{rows.map(row=><FactTile key={row.label} fact={{...row,value:valueOf(row.value),icon:FileText,tone:'blue'}}/>)}</div>
    {url&&<a href={url} target="_blank" rel="noopener noreferrer" className="fe-action"><ExternalLink size={14}/>Recorded source</a>}
  </div>;
}

export function FormulationIntelligenceView({initialFormulationId,onSelectProduct,onSelectIngredient}:Props) {
  useSharedRepositoryListener();
  const {toast} = useToast();
  const catalog = getDatabaseCatalog();
  const facets = useSearchFacets();
  const [params] = useSearchParams();
  const {savedFormulationIds,toggleSavedFormulation} = useWorkspaceStore();
  const [query,setQuery] = useSessionState('formulations:search','');
  const [category,setCategory] = useSessionState('formulations:category','All');
  const [type,setType] = useSessionState('formulations:type','All');
  const [functionFilter,setFunctionFilter] = useSessionState('formulations:function','All');
  const [market,setMarket] = useState('All');
  const [status,setStatus] = useState('All');
  const [ordering,setOrdering] = useState('');
  const [page,setPage] = useState(1);
  const [filtersOpen,setFiltersOpen] = useState(false);
  const [tab,setTab] = useState<Tab>('overview');
  const [activeId,setActiveId] = useRecordSelection<string|null>('formulation',initialFormulationId||null);
  useEffect(()=>setPage(1),[query,category,type,functionFilter,market,status,ordering]);
  const search = useServerSearch<Formulation>('formulations',{q:query,category,formulationType:type,ingredientFunction:functionFilter,market,publishStatus:status,ordering},page,50);
  const known = activeId ? DataService.getFormulationById(activeId) : undefined;
  const legacyDefault = activeId==='form-1'&&!params.has('formulation');
  const detail = useServerSearch<Formulation>('formulations',{identity:activeId ?? undefined},1,1,!!activeId&&!known&&!legacyDefault);
  const form = known ?? (activeId&&!legacyDefault ? detail.results[0] : params.has('formulation') ? undefined : search.results[0]);
  const detailRef=useRef<HTMLDivElement>(null);
  const choose=(row:Formulation)=>{setActiveId(row.id);setTab('overview');if(window.innerWidth<1024)window.setTimeout(()=>detailRef.current?.scrollIntoView({block:'start',behavior:'smooth'}),100);};
  const save=(row:Formulation,event?:MouseEvent)=>{event?.stopPropagation();toggleSavedFormulation(row.id,row.name);toast(savedFormulationIds.includes(row.id)?'Formulation removed from saved items':'Formulation saved');};
  const reset=()=>{setQuery('');setCategory('All');setType('All');setFunctionFilter('All');setMarket('All');setStatus('All');setOrdering('');setPage(1);};
  const facts=form?factsOf(form):[];
  const allTypes=[...new Set([...types.filter(row=>row!=='All'),...(facets?.formulationTypes??[])])];
  const markets=facets?.countries.length?facets.countries:['Africa','India','China','Europe','South America','United States'];
  const companyCount=new Set(catalog.formulations.map(row=>row.marketData?.['Company Name']).filter(Boolean)).size;
  const counts=[{label:'Formulations',value:catalog.formulations.length,icon:FlaskConical,tone:'cyan'},{label:'Companies',value:companyCount,icon:Building2,tone:'violet'},{label:'Formulation Types',value:new Set(catalog.formulations.map(row=>row.formulationType).filter(Boolean)).size,icon:ClipboardList,tone:'blue'},{label:'Sectors',value:new Set(catalog.formulations.map(row=>row.category).filter(Boolean)).size,icon:Layers,tone:'violet'}];
  const exportRecord=(format:'json'|'csv')=>{
    if(!form)return;
    const entries=Object.entries(form.marketData??{});
    if(!entries.length) entries.push(['Product Name / Brand Name',form.name],...factsOf(form).map(fact=>[fact.label,fact.value] as [string,string]),['Source reference',form.sourceReference]);
    const quote=(text:string)=>`"${text.replaceAll('"','""')}"`;
    const body=format==='json'?JSON.stringify(form,null,2):['Field,Source value',...entries.map(([key,value])=>`${quote(key)},${quote(value)}`)].join('\r\n');
    const url=URL.createObjectURL(new Blob([body],{type:format==='json'?'application/json':'text/csv;charset=utf-8'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download=`${form.name.replace(/[^a-z0-9_-]+/gi,'-')}.${format}`;anchor.click();URL.revokeObjectURL(url);
  };
  const filterFields=<>
    <label>Sector<select aria-label="Formulation sector" value={category} onChange={event=>setCategory(event.target.value)}>{categories.map(value=><option key={value} value={value}>{value==='All'?'All Sectors':value}</option>)}</select></label>
    <label>Formulation Type<select aria-label="Formulation type" value={type} onChange={event=>setType(event.target.value)}><option value="All">All Types</option>{allTypes.map(value=><option key={value}>{value}</option>)}</select></label>
    <label>Market<select aria-label="Market region" value={market} onChange={event=>setMarket(event.target.value)}><option value="All">All Markets</option>{markets.map(value=><option key={value}>{value}</option>)}</select></label>
    <label>Status<select aria-label="Formulation publication status" value={status} onChange={event=>setStatus(event.target.value)}>{['All','Draft','In Review','Approved','Published','Rejected','Archived'].map(value=><option key={value} value={value}>{value==='All'?'All Statuses':value}</option>)}</select></label>
  </>;
  return <div className="formulation-explorer-page">
    <section className="fe-hero"><img src="/assets/scientific/formulation-explorer.webp" alt="" aria-hidden="true"/><div className="fe-hero-veil"/><div className="fe-hero-copy"><span>SCIENTIFIC INTELLIGENCE</span><h1><span>Formulation</span>{' '}Explorer</h1><p>Explore commercial formulations with detailed composition,<br className="fe-wide-break"/> process records, technical properties, and source provenance.</p></div>
      <div className="fe-hero-metrics">{counts.map(({label,value,icon:Icon,tone})=><div key={label} data-tone={tone}><span><Icon size={23}/></span><div><strong>{value.toLocaleString()}</strong><small>{label}</small></div></div>)}</div>
      <details className="fe-access"><summary title="Catalog access and staff sign-in"><Database size={13}/>{catalog.session?.canPreview?'Staff preview':'Catalog access'}<ChevronDown size={12}/></summary><div><CatalogStatus/></div></details>
    </section>
    <div className="fe-content">
      <form className="fe-filters" onSubmit={event=>{event.preventDefault();setPage(1);search.refresh();setFiltersOpen(false);}}>
        <div className="fe-filter-row"><label className="fe-query"><span className="sr-only">Search formulations</span><Search size={17}/><input type="search" maxLength={300} value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search formulations, brands, ingredients, CAS number..."/></label>
          <div className="fe-filter-fields">{filterFields}</div><button className="fe-mobile-filters fe-action" type="button" aria-label="Open formulation filters" onClick={()=>setFiltersOpen(true)}><Filter size={16}/></button><button type="submit" className="fe-action fe-primary"><Search size={16}/>Search</button><button type="button" className="fe-action" onClick={reset}>Reset</button>
        </div>
        <div className="fe-chip-row"><div role="group" aria-label="Quick sector filters">{categories.map(value=><button key={value} type="button" aria-pressed={category===value} onClick={()=>setCategory(value)}>{value}</button>)}</div><div role="group" aria-label="Quick formulation types">{types.map(value=><button key={value} type="button" aria-pressed={type===value} onClick={()=>setType(value)}>{value}</button>)}</div></div>
        <details className="fe-extra-filter"><summary>Ingredient function</summary><input aria-label="Ingredient function" value={functionFilter==='All'?'':functionFilter} onChange={event=>setFunctionFilter(event.target.value||'All')} placeholder="Recorded ingredient function"/></details>
      </form>
      <MobileDrawer open={filtersOpen} onClose={()=>setFiltersOpen(false)} label="Formulation filters"><div className="fe-mobile-filter-content"><h2>Formulation Filters</h2>{filterFields}<button className="fe-action fe-primary" onClick={()=>setFiltersOpen(false)}><Check size={16}/>Apply</button><button className="fe-action" onClick={reset}><RotateCcw size={15}/>Reset</button></div></MobileDrawer>
      <div className="fe-workbench">
        <section className="fe-results" aria-label="Formulation results"><header className="fe-results-heading"><strong>{search.count.toLocaleString()} matching formulations</strong><label>Sort by<select aria-label="Sort formulations" value={ordering} onChange={event=>setOrdering(event.target.value)}><option value="">Relevance</option><option value="formulation_name">Name A-Z</option><option value="-updated_at">Recently updated</option></select></label></header>
          {(search.loading||search.error)&&<SearchStatus search={search}/>}
          {!search.loading&&!search.error&&!search.results.length&&<div className="fe-empty"><Search size={28}/><h2>No matching formulations</h2><p>{catalog.staffPreview?'No records match the current filters.':'Only published records are public. Authorized staff can preview imported drafts.'}</p><button className="fe-action" onClick={reset}>Reset Filters</button></div>}
          {search.results.map(row=><article className="fe-result" data-selected={form?.id===row.id} key={row.id} tabIndex={0} aria-label={`Select ${row.name}`} onClick={()=>choose(row)} onKeyDown={event=>{if(event.target===event.currentTarget&&['Enter',' '].includes(event.key)){event.preventDefault();choose(row);}}}>
            <MaterialImage form={row}/><div className="fe-result-copy"><div className="fe-badges"><span className="fe-badge fe-sector">{row.category||'Not available'}</span><span className="fe-badge fe-type">{row.formulationType||'Not available'}</span></div><h2><button onClick={event=>{event.stopPropagation();choose(row);}}>{row.name}</button></h2><p className="fe-result-meta">{[row.marketData?.['Company Name'],row.marketData?.Market,row.marketData?.['Product Classification']].filter(Boolean).join(' / ')||'Not available'}</p><p className="fe-result-active">{factsOf(row)[4].value}</p><div className="fe-result-evidence"><EvidenceBadge evidence={row.verificationEvidence}/><span title={row.sourceReference}><FileText size={12}/>Source-reported composition</span></div><p className="fe-result-target" title={row.intendedApplication}>{row.intendedApplication}</p></div>
            <button className="fe-save" title={savedFormulationIds.includes(row.id)?'Unsave formulation':'Save formulation'} aria-label={`${savedFormulationIds.includes(row.id)?'Unsave':'Save'} ${row.name}`} aria-pressed={savedFormulationIds.includes(row.id)} onClick={event=>save(row,event)}><Bookmark size={19}/></button>
          </article>)}
          {search.count>50&&<nav className="fe-pagination" aria-label="Formulation pagination"><button className="fe-action" title="Previous page" aria-label="Previous formulation page" disabled={page===1} onClick={()=>setPage(page-1)}><ChevronLeft size={16}/></button><span>Page {page} of {Math.ceil(search.count/50)}</span><button className="fe-action" title="Next page" aria-label="Next formulation page" disabled={page*50>=search.count} onClick={()=>setPage(page+1)}><ChevronRight size={16}/></button></nav>}
        </section>
        <div className="fe-detail" ref={detailRef}>
          {!form ? <div className="fe-empty">{activeId&&(detail.loading||detail.error)?<SearchStatus search={detail}/>:<><FlaskConical size={32}/><h2>{activeId?'Formulation unavailable':'Select a formulation'}</h2>{activeId&&<p>This record may not exist or may not be available under your current permissions.</p>}</>}</div> : <>
            <header className="fe-detail-header"><div className="fe-detail-top"><MaterialImage form={form} large/><div className="fe-detail-title"><div className="fe-badges"><span className="fe-badge fe-sector">{form.category||'Not available'}</span><span className="fe-badge fe-type">{form.formulationType||'Not available'}</span></div><h2>{form.name}</h2><p>Target: {valueOf(form.targetIndustry)}</p><div className="fe-identity">{facts.slice(0,4).map(fact=><FactTile key={fact.label} compact fact={fact}/>)}</div></div>
              <div className="fe-detail-actions"><button className="fe-action" title="Bookmark selected formulation" aria-label="Bookmark selected formulation" aria-pressed={savedFormulationIds.includes(form.id)} onClick={()=>save(form)}><Bookmark size={18}/></button><details className="fe-export"><summary className="fe-action"><Download size={15}/>Export<ChevronDown size={14}/></summary><div><button onClick={()=>exportRecord('csv')}>CSV source values</button><button onClick={()=>exportRecord('json')}>JSON record</button></div></details><button className="fe-close" title="Close formulation details" aria-label="Close formulation details" onClick={()=>setActiveId(null)}><X size={16}/></button></div></div>
              <nav className="fe-tabs" role="tablist" aria-label="Formulation details">{tabs.map(item=><button type="button" role="tab" key={item.id} id={`fe-tab-${item.id}`} aria-controls={`fe-panel-${item.id}`} aria-selected={tab===item.id} onClick={()=>setTab(item.id)} onKeyDown={event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();const index=tabs.findIndex(value=>value.id===item.id);const next=tabs[(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length];setTab(next.id);document.getElementById(`fe-tab-${next.id}`)?.focus();}}}>{item.label}</button>)}</nav>
            </header>
            <section role="tabpanel" id="fe-panel-overview" aria-labelledby="fe-tab-overview" hidden={tab!=='overview'} className="fe-tab-content">
              <div className="fe-overview"><section className="fe-product-info"><h3>Product Information</h3><dl>{[{label:'Product Name / Brand',value:form.name},...facts.slice(0,5),{label:'Workflow',value:form.publishStatus||'Not available'}].map(fact=><div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}<div><dt>Evidence</dt><dd><EvidenceBadge evidence={form.verificationEvidence}/></dd></div><div><dt>Source</dt><dd>Source-reported composition</dd></div></dl></section>
                <div className="fe-overview-right"><section className="fe-target"><h3>Intended Application &amp; Target Use</h3><p><Sprout size={22}/>{valueOf(form.marketData?.['Pest Control / Target Diseases']||form.intendedApplication)}</p></section><section className="fe-quick-facts"><h3>Quick Facts</h3><div>{[facts[9],facts[8],facts[11],facts[12],facts[10],facts[13],facts[14],facts[15]].map(fact=><FactTile key={fact.label} fact={fact} compact/>)}</div></section></div>
              </div>
              <section className="fe-scientific-fields"><h3>Scientific Source Values</h3><p className="fe-provenance-note">Source-reported values; registration, patent and hazard claims require independent verification.</p><div className="fe-property-grid">{facts.map(fact=><FactTile key={fact.label} fact={fact}/>)}</div><div className="fe-target fe-target-full"><h3>Intended Application &amp; Target Use</h3><p><Leaf size={22}/>{valueOf(form.intendedApplication)}</p></div></section>
            </section>
            <section role="tabpanel" id="fe-panel-composition" aria-labelledby="fe-tab-composition" hidden={tab!=='composition'} className="fe-tab-content">
              <h3>Formulation Composition</h3><div className="fe-property-grid fe-composition-source">{facts.slice(4,8).map(fact=><FactTile key={fact.label} fact={fact}/>)}</div>
              {form.composition.length>0 ? <><div className="fe-table-scroll"><table className="fx-data-table"><thead><tr><th>Ingredient</th><th>CAS</th><th>Function</th><th>Concentration / Unit</th><th>Role</th><th>Source</th></tr></thead><tbody>{form.composition.map((row,index)=><tr key={index}><td><button onClick={()=>onSelectIngredient(row.cas||row.ingredient)}>{row.ingredient}</button></td><td>{row.cas}</td><td>{row.chemicalFunction}</td><td>{row.concentration} {row.unit}</td><td>{row.ingredientCategory}</td><td>{row.sourceEvidence||'Not available'}</td></tr>)}</tbody></table></div>{(()=>{const summary=compositionSummary(form.composition);return summary&&summary.groups.length>0?<div className="fe-composition-summary">{summary.groups.map(row=><span key={row.category}>{row.category}: {row.value}% w/w recorded</span>)}</div>:null;})()}</> : <p className="fe-empty-copy">No structured composition recorded. Original source text is retained above.</p>}
            </section>
            <section role="tabpanel" id="fe-panel-process" aria-labelledby="fe-tab-process" hidden={tab!=='process'} className="fe-tab-content">
              <h3>Manufacturing Process Records</h3>{!form.manufacturingInfo.processOverview&&!form.manufacturingInfo.mixingSequence.length&&!form.manufacturingInfo.equipment.length&&!form.manufacturingInfo.processingConditions.length&&!form.manufacturingInfo.qcParameters.length?<p className="fe-empty-copy">No recorded manufacturing process available for this formulation.</p>:<><p>{form.manufacturingInfo.processOverview}</p><ol className="fx-process-flow">{form.manufacturingInfo.mixingSequence.map((step,index)=><li key={index}>{step}</li>)}</ol>{[{label:'Equipment',values:form.manufacturingInfo.equipment},{label:'Processing conditions',values:form.manufacturingInfo.processingConditions},{label:'Quality checkpoints',values:form.manufacturingInfo.qcParameters}].map(group=><div key={group.label}><h3>{group.label}</h3>{group.values.length?<ul>{group.values.map((value,index)=><li key={index}>{value}</li>)}</ul>:<p>Not available</p>}</div>)}</>}
            </section>
            <section role="tabpanel" id="fe-panel-properties" aria-labelledby="fe-tab-properties" hidden={tab!=='properties'} className="fe-tab-content"><h3>Technical Properties</h3><div className="fe-property-grid">{facts.slice(8,15).map(fact=><FactTile key={fact.label} fact={fact}/>)}{Object.entries(form.properties).filter(([key])=>!['ph','density','viscosity'].includes(key)).map(([label,value])=><FactTile key={label} fact={{label,value:valueOf(value),icon:FlaskConical,tone:'cyan'}}/>)}</div></section>
            <section role="tabpanel" id="fe-panel-sources" aria-labelledby="fe-tab-sources" hidden={tab!=='sources'} className="fe-tab-content"><h3>Source Provenance &amp; Patent References</h3><p className="fe-provenance-note">Publication does not independently verify source composition, registration, patent or hazard claims.</p><SourceProvenance form={form}/><div className="fe-source-reference"><FileText size={22}/><span>{valueOf(form.sourceReference)}</span><button className="fe-action" title="Copy source reference" aria-label="Copy source reference" disabled={!form.sourceReference} onClick={async()=>{try{await navigator.clipboard.writeText(form.sourceReference);toast('Source reference copied');}catch{toast('Clipboard unavailable','warning');}}}><Copy size={15}/></button></div><EvidenceBadge evidence={form.verificationEvidence}/><FactTile fact={facts[15]}/>{form.patentReferences.map((patent,index)=><div className="fe-patent" key={index}><strong>{patent.patentNumber}</strong><p>{patent.title}</p><p>{patent.relevantExample}</p>{sourceHref(patent.url)&&<a className="fe-action" href={sourceHref(patent.url)!} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/>Recorded patent source</a>}</div>)}<h3>Related Commercial Products</h3>{form.commercialProductIds.length?form.commercialProductIds.map(id=>{const product=DataService.getProductById(id);return <button className="fe-action" key={id} onClick={()=>onSelectProduct(id)}>{product?.brandName||id}<ChevronRight size={15}/></button>;}):<p className="fe-empty-copy">No linked commercial product recorded.</p>}</section>
          </>}
        </div>
      </div>
    </div>
  </div>;
}
