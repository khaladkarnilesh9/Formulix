import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { hierarchy, treemap } from 'd3-hierarchy';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection, Geometry } from 'geojson';
import { ResponsiveContainer, Sankey, Tooltip } from 'recharts';
import type { NodeProps, LinkProps } from 'recharts/types/chart/Sankey';
import { Plus, Minus, LocateFixed } from 'lucide-react';
import type { CommercialProduct } from '../../types';
import { analyticsColors, portfolioTree, productFlow, targetMatrix } from './analyticsModel';

export const chartTooltip = { background: 'var(--ma-panel)', border: '1px solid var(--ma-border)', borderRadius: 6, color: 'var(--ma-text)', fontSize: 11 };
const short = (text: string, length: number) => text.length > length ? `${text.slice(0, Math.max(1, length - 3))}...` : text;

function useChartSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 400, height: 190 });
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, ...size };
}

export function PortfolioTreemap({ products }: { products: CommercialProduct[] }) {
  const { ref, width, height } = useChartSize();
  const nodes = useMemo(() => {
    const root = hierarchy(portfolioTree(products)).sum(node => node.count ?? 0).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    return treemap<typeof root.data>().size([width, height]).paddingOuter(2).paddingInner(2)
      .paddingTop(node => node.depth === 1 ? 23 : node.depth === 2 ? 20 : 0).round(true)(root).descendants().slice(1);
  }, [products, width, height]);
  return <div ref={ref} className="ma-chart-area ma-treemap">
    <svg width="100%" height="100%" role="img" aria-label="Manufacturer, classification and formulation type treemap">
      {nodes.map((node, index) => {
        const w = Math.max(0, node.x1 - node.x0), h = Math.max(0, node.y1 - node.y0);
        const color = node.depth === 1 ? '#084bd2' : node.data.color || analyticsColors[0];
        return <g key={index}>
          <rect x={node.x0} y={node.y0} width={w} height={h} fill={color} fillOpacity={node.depth === 3 ? 0.9 : 1} rx={node.depth === 1 ? 5 : 2} stroke="#ffffff80" strokeWidth={0.5} />
          <title>{node.ancestors().reverse().slice(1).map(row => row.data.name).join(' / ')}: {node.value} listings</title>
          {w > 34 && h > 16 && <text x={node.x0 + 6} y={node.y0 + 14} fill="white" fontSize={node.depth === 1 ? 12 : 10} fontWeight={600}>
            {short(`${node.data.name}${node.depth < 3 ? ` (${node.value})` : ''}`, Math.floor((w - 10) / 6))}
          </text>}
          {node.depth === 3 && w > 34 && h > 34 && <text x={node.x0 + 6} y={node.y0 + 29} fill="white" fontSize={10}>{node.value}</text>}
        </g>;
      })}
    </svg>
  </div>;
}

export function AnalyticsFlow({ products }: { products: CommercialProduct[] }) {
  const data = useMemo(() => productFlow(products), [products]);
  const id = useId().replaceAll(':', '');
  const node = ({ x, y, width, height, payload }: NodeProps) => {
    const record = payload as unknown as typeof data.nodes[number];
    return <g>
      <rect x={x} y={y} width={width} height={Math.max(1, height)} fill={record.color} rx={3} />
      <title>{record.name}: {record.value} listings</title>
      <text x={x + width + 7} y={y + height / 2} dominantBaseline="middle" fill="var(--ma-text)" fontSize={11} fontWeight={record.stage === 0 ? 600 : 400}>
        {short(record.name, record.stage === 3 ? 12 : 17)} ({record.value})
      </text>
    </g>;
  };
  const link = (props: LinkProps) => <path d={`M${props.sourceX},${props.sourceY}C${props.sourceControlX},${props.sourceY} ${props.targetControlX},${props.targetY} ${props.targetX},${props.targetY}`}
    fill="none" stroke={`url(#${id}-${props.index})`} strokeOpacity={0.3} strokeWidth={Math.max(1, props.linkWidth)} />;
  return <div className="ma-chart-area ma-flow" aria-label="Company to brand to active ingredient to formulation flow">
    <ResponsiveContainer width="100%" height="100%">
      <Sankey data={data} node={node} link={link} nodeWidth={17} nodePadding={10} sort={false} iterations={32} margin={{ top: 6, bottom: 4, left: 5, right: 92 }}>
        <defs>{data.links.map((edge, index) => <linearGradient key={index} id={`${id}-${index}`}><stop offset="0%" stopColor={data.nodes[edge.source].color} /><stop offset="100%" stopColor={data.nodes[edge.target].color} /></linearGradient>)}</defs>
        <Tooltip contentStyle={chartTooltip} />
      </Sankey>
    </ResponsiveContainer>
  </div>;
}

export function TargetHeatmap({ products, mode }: { products: CommercialProduct[]; mode: 'Crop' | 'Pest' }) {
  const matrix = useMemo(() => targetMatrix(products, mode), [products, mode]);
  if (!matrix.targets.length) return <div className="ma-empty">No {mode.toLowerCase()} associations recorded.</div>;
  return <div className="ma-heatmap">
    <div className="ma-heat-grid" style={{ gridTemplateColumns: `105px repeat(${matrix.targets.length}, minmax(0, 1fr))` }}>
      {matrix.ingredients.map((ingredient, row) => <div className="ma-heat-row" key={ingredient}>
        <span className="ma-heat-label" title={ingredient}>{short(ingredient, 18)}</span>
        {matrix.cells[row].map((count, col) => <span key={col} className="ma-heat-cell" style={{ background: count ? `color-mix(in srgb, #0667f8 ${18 + count / matrix.max * 82}%, #e8f3ff)` : 'var(--ma-raised)' }}
          tabIndex={0} aria-label={`${ingredient}, ${matrix.targets[col]}: ${count} linked listings`} title={`${ingredient} / ${matrix.targets[col]}: ${count} linked listings`} />)}
      </div>)}
      <span />{matrix.targets.map(target => <span key={target} className="ma-heat-target" title={target}>{target}</span>)}
    </div>
    <div className="ma-heat-legend"><span>More<br />records</span><i /><span>Fewer<br />records</span></div>
  </div>;
}

const mapAliases: Record<string, string> = { 'united states of america': 'united states', 'usa': 'united states', 'u.s.': 'united states', 'uk': 'united kingdom', 'russian federation': 'russia', 'viet nam': 'vietnam', 'czech republic': 'czechia' };
const countryKey = (name: string) => mapAliases[name.toLowerCase()] || name.toLowerCase();
const mapColors = ['#edf4ff', '#cce4ff', '#98c8ff', '#59a2fb', '#1474fa', '#092b9a'];
const mapColor = (count: number) => mapColors[count > 50 ? 5 : count > 20 ? 4 : count > 10 ? 3 : count > 5 ? 2 : count > 0 ? 1 : 0];
type CountryCount = { name: string; count: number; registrations: number };

export function CountryMap({ countries, onSelectRegion }: { countries: CountryCount[]; onSelectRegion: (region: string) => void }) {
  const [geometry, setGeometry] = useState<FeatureCollection<Geometry>>();
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [hover, setHover] = useState<CountryCount>();
  useEffect(() => {
    const controller = new AbortController();
    fetch('/assets/maps/countries-110m.json', { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('Map unavailable');
      return response.json();
    }).then((topology: Topology) => {
      const collection = feature(topology, topology.objects.countries as GeometryCollection) as FeatureCollection<Geometry, { name?: string }>;
      setGeometry({ ...collection, features: collection.features.filter(country => country.properties?.name !== 'Antarctica') });
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, []);
  const projection = useMemo(() => geometry ? geoNaturalEarth1().fitExtent([[7, 4], [409, 194]], geometry) : undefined, [geometry]);
  const path = geoPath(projection);
  const indexed = new Map(countries.map(country => [countryKey(country.name), country]));
  const mappedNames = new Set(geometry?.features.map(country => countryKey(String(country.properties?.name ?? ''))));
  const regional = countries.filter(country => !mappedNames.has(countryKey(country.name))).reduce((sum, country) => sum + country.count, 0);
  return <div className="ma-map">
    {failed ? <div className="ma-empty">Country map unavailable.</div> : !geometry ? <div className="ma-empty">Loading map...</div> : <svg viewBox="0 0 420 200" role="img" aria-label="World map of catalog listings by country">
      <g transform={`translate(${210 * (1 - zoom)} ${100 * (1 - zoom)}) scale(${zoom})`}>
        {geometry.features.map(country => {
          const name = String(country.properties?.name ?? '');
          const count = indexed.get(countryKey(name));
          return <path key={country.id} d={path(country) || ''} fill={mapColor(count?.count ?? 0)} stroke="var(--ma-panel)" strokeWidth={0.45 / zoom}
            role={count ? 'button' : undefined} tabIndex={count ? 0 : undefined} aria-label={`${name}: ${count?.count ?? 0} listings`}
            onMouseEnter={() => setHover(count || { name, count: 0, registrations: 0 })} onMouseLeave={() => setHover(undefined)} onFocus={() => setHover(count)} onBlur={() => setHover(undefined)}
            onClick={() => { if (count) onSelectRegion(count.name); }} onKeyDown={event => { if (count && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onSelectRegion(count.name); } }}>
            <title>{name}: {count?.count ?? 0} listings, {count?.registrations ?? 0} registration references</title>
          </path>;
        })}
      </g>
    </svg>}
    <div className="ma-map-tools"><button title="Zoom in map" aria-label="Zoom in map" onClick={() => setZoom(value => Math.min(2.5, value + 0.25))}><Plus size={14} /></button><button title="Zoom out map" aria-label="Zoom out map" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - 0.25))}><Minus size={14} /></button><button title="Reset map view" aria-label="Reset map view" onClick={() => { setZoom(1); setHover(undefined); }}><LocateFixed size={14} /></button></div>
    <div className="ma-map-legend">{['> 50', '21 - 50', '11 - 20', '6 - 10', '1 - 5', '0'].map((label, index) => <span key={label}><i style={{ background: mapColors[5 - index] }} />{label}</span>)}</div>
    {hover && <div className="ma-map-tooltip"><strong>{hover.name}</strong><span>{hover.count} listings</span><span>{hover.registrations} references</span></div>}
    {!!regional && geometry && <span className="ma-map-regional" title="Regional source records are not assigned to individual countries">{regional.toLocaleString()} regional / unmapped listings</span>}
  </div>;
}
