import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Atom, Building2, Copy, Database, ExternalLink, FileText, FlaskConical, Leaf, MoreVertical, PackageSearch, Scale, Tractor } from 'lucide-react';
import { CatalogStatus } from '../../components/common/CatalogStatus';
import { getDatabaseCatalog } from '../../services/formulationApi';
import { sourceHref } from '../../services/presentation';
import type { CommercialProduct } from '../../types';
import { DataService } from '../../services/dataService';

export function productSourceTitle(product:CommercialProduct) {
  const own=(product as CommercialProduct&{sourceTitle?:string}).sourceTitle;
  const form=product.formulationId?DataService.getFormulationById(product.formulationId):undefined;
  return own||(form as typeof form&{sourceTitle?:string})?.sourceTitle||product.dataSource||'Source not recorded';
}

export function ProductHero({count,loading}:{count:number;loading:boolean}) {
  return <section className="pc-hero"><img src="/assets/scientific/product-agriculture.webp" alt=""/><div className="pc-hero-veil"/>
    <div className="pc-hero-copy"><span>SCIENTIFIC INTELLIGENCE</span><h1><span>Commercial</span> Product Intelligence</h1>
      <p>Discover scientific formulations, active ingredients, commercial brands,<br className="pc-wide-break"/> manufacturers, and regulatory source intelligence.</p>
      <span className="pc-record-count" aria-live="polite"><FileText size={13}/>{loading&&count===0?'Searching database...':`${count.toLocaleString()} matching records`}</span>
    </div><div className="pc-hero-science" aria-hidden="true">{[Leaf,FlaskConical,Atom,FileText,Tractor].map((Icon,index)=><span key={index}><Icon size={27}/></span>)}</div>
    <div className="pc-tagline">From Science<br/>to Safer<br/>Agriculture<i/></div>
    <details className="pc-access"><summary><Database size={12}/>{getDatabaseCatalog().staffPreview?'Staff preview':'Catalog access'}</summary><div><CatalogStatus/></div></details>
  </section>;
}

export function ProductThumbnail({product}:{product:CommercialProduct}) {
  const [failed,setFailed]=useState(false);
  const image=sourceHref((product as CommercialProduct&{imageUrl?:string}).imageUrl);
  return <span className="pc-thumbnail" title={image?'Source-supplied product image':'Generic scientific agriculture illustration, not an authentic image of this brand'}>
    {failed?<PackageSearch size={23}/>:<img src={image||'/assets/scientific/product-thumbnail.webp'} alt={image?`Source image for ${product.brandName}`:'Generic scientific agriculture illustration'} loading="lazy" onError={()=>setFailed(true)}/>}
  </span>;
}

export function ProductActions({product,compared,onOpen,onCompare,onManufacturer,onCopy}:{product:CommercialProduct;compared:boolean;onOpen:()=>void;onCompare:()=>void;onManufacturer:()=>void;onCopy:()=>void}) {
  const [position,setPosition]=useState<{left:number;top:number}|null>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  const menu=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!position)return;
    menu.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const dismiss=(event:PointerEvent)=>{if(!menu.current?.contains(event.target as Node)&&!trigger.current?.contains(event.target as Node))setPosition(null);};
    const key=(event:globalThis.KeyboardEvent)=>{
      if(event.key==='Escape'){setPosition(null);trigger.current?.focus();}
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){
        event.preventDefault();const buttons=Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button')??[]);
        const index=buttons.indexOf(document.activeElement as HTMLButtonElement);buttons[(index+(event.key==='ArrowDown'?1:buttons.length-1))%buttons.length]?.focus();
      }
    };
    const close=()=>setPosition(null);
    document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',key);window.addEventListener('scroll',close,true);window.addEventListener('resize',close);
    return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',key);window.removeEventListener('scroll',close,true);window.removeEventListener('resize',close);};
  },[position]);
  const run=(action:()=>void)=>{setPosition(null);action();};
  return <><button ref={trigger} className="pc-more-trigger" aria-haspopup="menu" aria-expanded={!!position} aria-label={`More actions for ${product.brandName}`} title="More product actions" onClick={()=>{
    if(position){setPosition(null);return;}const bounds=trigger.current!.getBoundingClientRect();setPosition({left:Math.max(8,Math.min(bounds.right-215,innerWidth-223)),top:Math.max(8,Math.min(bounds.bottom+5,innerHeight-230))});
  }}><MoreVertical size={16}/></button>{position&&createPortal(<div ref={menu} className="pc-action-menu" role="menu" aria-label={`Actions for ${product.brandName}`} style={{left:position.left,top:position.top}}>
    <button role="menuitem" onClick={()=>run(onOpen)}><ExternalLink size={14}/>View Product</button>
    <button role="menuitem" onClick={()=>run(onCompare)}><Scale size={14}/>{compared?'Remove Comparison':'Compare Product'}</button>
    {product.manufacturerId&&<button role="menuitem" onClick={()=>run(onManufacturer)}><Building2 size={14}/>View Manufacturer</button>}
    <button role="menuitem" onClick={()=>run(onCopy)}><Copy size={14}/>Copy Record Link</button>
    <button role="menuitem" onClick={()=>run(onOpen)}><FileText size={14}/>View Source Information</button>
  </div>,document.body)}</>;
}
