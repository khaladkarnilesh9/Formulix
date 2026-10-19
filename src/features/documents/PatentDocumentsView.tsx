import React, { useEffect, useState } from 'react';
import { useServerSearch } from '../../services/searchApi';
import { SearchStatus } from '../../components/common/SearchStatus';
import { DataService, useSharedRepositoryListener } from '../../services/dataService';
import { TechnicalDocument, Formulation } from '../../types';
import { DocumentViewerModal } from '../../components/common/DocumentViewerModal';
import { PageHeader, SearchField, DemoNotice, MetadataGrid, EmptyState } from '../../components/common/IntelligenceUI';
import { sourceHref, isDemoRecord } from '../../services/presentation';
import { FileText, Eye, ExternalLink, ScrollText } from 'lucide-react';

interface PatentDocumentsViewProps {
  onSelectProduct: (productName: string) => void;
  onSelectIngredient: (ingredientName: string) => void;
  selectedDocId?: string;
  mode?: 'patents' | 'documents';
}
interface PatentSearchRecord { id: string; title: string; publicationNumber: string; applicationNumber: string; applicant: string; abstract: string; sourceUrl: string; patentStatus: string; }

export const PatentDocumentsView: React.FC<PatentDocumentsViewProps> = ({
  onSelectProduct, onSelectIngredient, selectedDocId, mode = 'documents',
}) => {
  useSharedRepositoryListener();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [previewDocument, setPreviewDocument] = useState<TechnicalDocument | null>(
    selectedDocId ? DataService.getDocuments().find(document => document.id === selectedDocId) || null : null
  );
  const patentMode = mode === 'patents';
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [searchQuery, selectedType, patentMode]);
  const search = useServerSearch<TechnicalDocument>('documents', { q: searchQuery, type: patentMode ? 'Formulation Patent' : selectedType }, page, 50);
  const documents = search.results;
  const patents = useServerSearch<PatentSearchRecord>('patents', { q: searchQuery }, page, 50, patentMode);
  const selectedPatent = useServerSearch<PatentSearchRecord>('patents', { identity: selectedDocId }, 1, 1, patentMode && !!selectedDocId);
  const patentRecords = [...selectedPatent.results, ...patents.results.filter(record => !selectedPatent.results.some(selected => selected.id === record.id))];
  const selectedDocument = useServerSearch<TechnicalDocument>('documents', { identity: selectedDocId }, 1, 1, !patentMode && !!selectedDocId);
  useEffect(() => { if (selectedDocument.results[0]) setPreviewDocument(selectedDocument.results[0]); }, [selectedDocument.results]);
  const references = useServerSearch<Formulation>('patentReferences', { q: searchQuery }, page, 50, patentMode);
  const types = [...new Set(DataService.getDocuments().map(document => document.type))];

  return <div className="fx-page">
    <SearchStatus search={search} page={page} onPage={setPage} />
    <PageHeader scene={patentMode ? 'patents' : 'regulatory'} title={patentMode ? 'Patent Intelligence' : 'Technical Document Library'} icon={patentMode ? ScrollText : FileText} count={`${patentMode ? patents.count + references.count + search.count : search.count} matches`} />
    <p className="text-xs text-slate-500">Documents recorded in the Django catalog. Spreadsheet patent references are not automatically verified documents.</p>
    <div className="fx-toolbar">
      <SearchField value={searchQuery} onChange={setSearchQuery} label={patentMode ? 'Search patents' : 'Search documents'} placeholder="Title, publication number, issuer or chemical" />
      {!patentMode && <select className="fx-select" aria-label="Document type" value={selectedType} onChange={event => setSelectedType(event.target.value)}>
        <option value="All">All document types</option>{types.map(type => <option key={type}>{type}</option>)}
      </select>}
    </div>
    {patentMode && <>
      <h2 className="text-base font-semibold">Stored Patent Records</h2>
      <SearchStatus search={patents} page={page} onPage={setPage} />
      {patentRecords.map(patent => <article key={patent.id} className="fx-card space-y-3">
        <h3 className="text-base font-semibold">{patent.title || patent.publicationNumber}</h3>
        <MetadataGrid items={[{label: 'Publication number', value: patent.publicationNumber}, {label: 'Application number', value: patent.applicationNumber}, {label: 'Applicant', value: patent.applicant}, {label: 'Recorded status', value: patent.patentStatus}]} />
        <p className="text-sm text-slate-600 dark:text-slate-400">{patent.abstract}</p>
        {sourceHref(patent.sourceUrl) && <a href={sourceHref(patent.sourceUrl)!} target="_blank" rel="noopener noreferrer" className="fx-button"><ExternalLink size={15} />Recorded source</a>}
      </article>)}
      <h2 className="text-base font-semibold">Formulation Source References</h2>
      <SearchStatus search={references} page={page} onPage={setPage} />
      {references.results.map(form => <article key={form.id} className="fx-card space-y-2"><h3 className="text-sm font-semibold">{form.name}</h3><p className="text-sm break-words">{form.marketData?.['Patent Reference']}</p><p className="text-xs text-slate-500">Source-reported / unverified. {form.sourceReference}</p></article>)}
      <h2 className="text-base font-semibold">Patent Documents</h2>
    </>}
    {!search.loading && !search.error && !documents.length && !patentMode && <EmptyState title="No matching records" detail="No records match the current search." />}
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {documents.map(document => {
        const source = sourceHref(document.sourceUrl);
        return <article key={document.id} className="fx-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{document.type}</span>
            <span className="fx-record-origin">{isDemoRecord('document', document.id) ? 'Demo-origin' : 'Stored record'}</span>
          </div>
          <h3 className="text-base font-semibold"><button className="text-left hover:text-blue-600" onClick={() => setPreviewDocument(document)}>{document.title}</button></h3>
          <MetadataGrid items={[
            { label: 'Publication number', value: document.documentNumber, mono: true },
            { label: 'Issuer / assignee as recorded', value: document.issuer },
            { label: 'Publication date', value: document.publicationDate, mono: true },
            { label: 'Declared file metadata', value: `${document.format} / ${document.fileSize}` },
          ]} />
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{document.summary}</p>
          <div className="flex flex-wrap gap-2">
            {document.relatedProducts.map(product => <button key={product} className="text-xs text-blue-600 dark:text-blue-400 hover:underline" onClick={() => onSelectProduct(product)}>{product}</button>)}
            {document.relatedIngredients.map(ingredient => <button key={ingredient} className="text-xs text-purple-600 dark:text-purple-400 hover:underline" onClick={() => onSelectIngredient(ingredient)}>{ingredient}</button>)}
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 pt-3">
            {source ? <a href={source} target="_blank" rel="noopener noreferrer" className="fx-button"><ExternalLink size={15} />Recorded source</a> : <span className="text-xs text-slate-500">Source not recorded</span>}
            <button className="fx-button fx-button-primary" onClick={() => setPreviewDocument(document)}><Eye size={15} />Record details</button>
          </footer>
        </article>;
      })}
    </div>
    <DocumentViewerModal document={previewDocument} onClose={() => setPreviewDocument(null)} onSelectProduct={onSelectProduct} onSelectIngredient={onSelectIngredient} />
  </div>;
};
