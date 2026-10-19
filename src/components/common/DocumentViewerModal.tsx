import React from 'react';
import { TechnicalDocument } from '../../types';
import { Download, ExternalLink } from 'lucide-react';
import { useToast } from './Toast';
import { RecordDialog, DemoNotice, MetadataGrid } from './IntelligenceUI';
import { sourceHref, isDemoRecord } from '../../services/presentation';

interface DocumentViewerModalProps {
  document: TechnicalDocument | null;
  onClose: () => void;
  onSelectProduct?: (productName: string) => void;
  onSelectIngredient?: (ingredientName: string) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ document, onClose, onSelectProduct, onSelectIngredient }) => {
  const { toast } = useToast();
  const source = sourceHref(document?.sourceUrl);
  const directPdf = source && new URL(source).pathname.toLowerCase().endsWith('.pdf');
  const exportSummary = () => {
    if (!document) return;
    const content = `FORMULIX STORED RECORD SUMMARY\nDocument: ${document.documentNumber}\nTitle: ${document.title}\nIssuer: ${document.issuer}\nPublication: ${document.publicationDate}\nRecorded status: ${document.verifiedStatus}\n\n${document.summary}\n\nRelated products: ${document.relatedProducts.join(', ')}\nRelated ingredients: ${document.relatedIngredients.join(', ')}\nRecorded source: ${document.sourceUrl}\n\nThis export is record metadata, not the original publication. Seeded records are demonstration data.\n`;
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = `${document.documentNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}_summary.txt`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Record summary exported');
  };

  return <RecordDialog open={Boolean(document)} title={document?.title ?? 'Document record'} onClose={onClose}>
    {document && <div className="space-y-5">
      {isDemoRecord('document', document.id) && <DemoNotice compact />}
      <MetadataGrid items={[
        { label: 'Document type', value: document.type },
        { label: 'Publication number', value: document.documentNumber, mono: true },
        { label: 'Issuer', value: document.issuer },
        { label: 'Publication date', value: document.publicationDate, mono: true },
        { label: 'Declared format and size', value: `${document.format} / ${document.fileSize}` },
        { label: 'Stored verification label', value: document.verifiedStatus },
      ]} />
      <section><h3 className="font-semibold mb-2">Abstract / recorded summary</h3><p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{document.summary}</p></section>
      <section><h3 className="font-semibold mb-2">Related commercial products</h3>
        <div className="flex flex-wrap gap-2">{document.relatedProducts.length ? document.relatedProducts.map(product => <button key={product} className="fx-button" disabled={!onSelectProduct} onClick={() => { onClose(); onSelectProduct?.(product); }}>{product}</button>) : <span className="text-slate-500">Not recorded</span>}</div>
      </section>
      <section><h3 className="font-semibold mb-2">Related ingredients</h3>
        <div className="flex flex-wrap gap-2">{document.relatedIngredients.length ? document.relatedIngredients.map(ingredient => <button key={ingredient} className="fx-button" disabled={!onSelectIngredient} onClick={() => { onClose(); onSelectIngredient?.(ingredient); }}>{ingredient}</button>) : <span className="text-slate-500">Not recorded</span>}</div>
      </section>
      {directPdf && <section><h3 className="font-semibold mb-2">Source PDF</h3><iframe title={document.title} src={source} className="fx-pdf-preview" sandbox="allow-same-origin" /><p className="text-xs text-slate-500 mt-2">External previews depend on the source's availability and embedding policy.</p></section>}
      <footer className="flex flex-wrap gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
        {source ? <a className="fx-button" href={source} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} />Open recorded source</a> : <span className="text-slate-500">Source not recorded</span>}
        <button className="fx-button fx-button-primary" onClick={exportSummary}><Download size={16} />Export record summary</button>
      </footer>
    </div>}
  </RecordDialog>;
};
