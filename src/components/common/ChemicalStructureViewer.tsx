import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Copy, Check } from 'lucide-react';
import { useToast } from './Toast';
import { useWorkspaceStore } from '../../stores/workspaceStore';

interface ChemicalStructureViewerProps {
  smiles?: string;
  name: string;
  formula: string;
  weight: number;
  structureType?: 'heterocycle' | 'aromatic' | 'chain' | 'polymeric' | 'complex';
}

export const ChemicalStructureViewer: React.FC<ChemicalStructureViewerProps> = ({ smiles, name, formula, weight }) => {
  const svg = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState('Loading structure');
  const { theme } = useWorkspaceStore();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    svg.current?.replaceChildren();
    if (!smiles) { setStatus('No SMILES recorded'); return; }
    setStatus('Loading structure');
    import('smiles-drawer').then(({ default: SmilesDrawer }) => {
      if (cancelled) return;
      SmilesDrawer.parse(smiles, tree => {
        if (cancelled || !svg.current) return;
        try {
          new SmilesDrawer.SvgDrawer({ width: 600, height: 280, padding: 24 }).draw(tree, svg.current, theme);
          setStatus('');
        } catch { setStatus('Structure could not be rendered from the stored SMILES'); }
      }, () => { if (!cancelled) setStatus('Stored SMILES could not be parsed'); });
    }).catch(() => { if (!cancelled) setStatus('Structure renderer is unavailable'); });
    return () => { cancelled = true; };
  }, [smiles, theme]);

  useEffect(() => { setZoom(1); }, [smiles]);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const copy = async () => {
    if (!smiles) return;
    try { await navigator.clipboard.writeText(smiles); setCopied(true); }
    catch { toast('Clipboard access is unavailable', 'warning'); }
  };

  return <div className="fx-molecule-viewer border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
    <div className="fx-molecule-toolbar">
      <div className="min-w-0"><strong>{name}</strong> <span className="font-mono text-slate-500">{formula}</span></div>
      <div className="flex items-center gap-1 shrink-0">
        <button title="Zoom in" aria-label="Zoom in" disabled={zoom >= 2} onClick={() => setZoom(value => Math.min(2, value + .25))}><ZoomIn size={17} /></button>
        <button title="Zoom out" aria-label="Zoom out" disabled={zoom <= .75} onClick={() => setZoom(value => Math.max(.75, value - .25))}><ZoomOut size={17} /></button>
        <button title="Reset zoom" aria-label="Reset zoom" onClick={() => setZoom(1)}><RotateCcw size={17} /></button>
        <span className="text-xs tabular-nums w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button title="Copy SMILES" aria-label="Copy SMILES" disabled={!smiles} onClick={copy}>{copied ? <Check size={17} /> : <Copy size={17} />}</button>
      </div>
    </div>
    <div className="fx-molecule-canvas">
      <svg ref={svg} role="img" aria-label={`Structure of ${name} from stored SMILES`} style={{ transform: `scale(${zoom})` }} />
      {status && <p role="status">{status}</p>}
    </div>
    <footer className="fx-molecule-footer"><span>MW: <strong>{Number.isFinite(weight) ? `${weight.toFixed(2)} g/mol` : 'Not recorded'}</strong></span><span>Stored SMILES depiction</span></footer>
  </div>;
};
