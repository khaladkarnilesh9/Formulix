import React, { useEffect, useState } from 'react';
import { fetchSearch, useServerSearch } from '../../services/searchApi';
import { SearchStatus } from '../../components/common/SearchStatus';
import { DataService } from '../../services/dataService';
import { RegulatoryRecord } from '../../types';
import { StatusIndicator } from '../../components/common/EvidenceBadge';
import { PageHeader, SearchField, MetricStrip, MetadataGrid, RecordDialog, DemoNotice, EmptyState } from '../../components/common/IntelligenceUI';
import { isDemoRecord, sourceHref } from '../../services/presentation';
import { useToast } from '../../components/common/Toast';
import { ShieldCheck, Download, ExternalLink, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface RegulatoryIntelligenceViewProps { onSelectProduct: (id: string) => void; }

export const RegulatoryIntelligenceView: React.FC<RegulatoryIntelligenceViewProps> = ({ onSelectProduct }) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [selectedAuthority, setSelectedAuthority] = useState('All');
  const [selectedRecord, setSelectedRecord] = useState<RegulatoryRecord | null>(null);
  const allRecords = DataService.getRegulatoryRecords();
  const [page, setPage] = useState(1);
  const search = useServerSearch<RegulatoryRecord>('regulatory', { q: searchQuery, country: selectedCountry, regulatoryAuthority: selectedAuthority }, page, 50);
  const records = search.results;
  useEffect(() => { setPage(1); }, [searchQuery, selectedCountry, selectedAuthority]);
  const pages = Math.max(1, Math.ceil(search.count / 50));
  const currentPage = page;
  const visibleRecords = records;
  const today = new Date().toISOString().slice(0, 10);
  const isExpired = (record: RegulatoryRecord) => /^\d{4}-\d{2}-\d{2}$/.test(record.expiryDate) && record.expiryDate < today;
  const countries = [...new Set(allRecords.map(record => record.country))];
  const authorities = [...new Set(allRecords.map(record => record.regulatoryAuthority))];
  const handleExportRegulatory = async () => {
    const allMatching: RegulatoryRecord[] = [];
    try {
      for (let page = 1; ; page++) {
        const batch = await fetchSearch<RegulatoryRecord>({ group: 'regulatory', q: searchQuery, country: selectedCountry, regulatoryAuthority: selectedAuthority, page, page_size: 100 });
        allMatching.push(...batch.results);
        if (!batch.next) break;
      }
    } catch (error) { toast(error instanceof Error ? error.message : 'Export failed', 'warning'); return; }
    const headers = [
      'Registration Number',
      'Product Name',
      'Active Substance',
      'Regulatory Authority',
      'Country',
      'Approval Status',
      'Registration Holder',
      'Approval Date',
      'Expiry Date',
      'Official Gazette Dossier',
    ];

    const rows = allMatching.map((r) => [
      `"${r.registrationNumber}"`,
      `"${r.productName}"`,
      `"${r.activeIngredient}"`,
      `"${r.regulatoryAuthority}"`,
      `"${r.country}"`,
      `"${r.approvalStatus}"`,
      `"${r.registrationHolder}"`,
      `"${r.approvalDate}"`,
      `"${r.expiryDate}"`,
      `"${r.sourceDocument}"`,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `regulatory_registrations_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${allMatching.length} regulatory records to CSV`);
  };

  return <div className="fx-page">
    <SearchStatus search={search} />
    <PageHeader scene="regulatory" title="Regulatory Intelligence" icon={ShieldCheck} description="Jurisdiction-specific registration metadata, validity dates, and source records."
      count={`${search.count} matching records`} actions={<button className="fx-button" onClick={handleExportRegulatory}><Download size={15} />Export records</button>} />
    <MetricStrip items={[{ label: 'Registration references', value: allRecords.length }, { label: 'Jurisdictions represented', value: countries.length },
      { label: 'Recorded approvals', value: allRecords.filter(record => record.approvalStatus === 'Approved').length },
      { label: 'Elapsed expiry dates', value: allRecords.filter(isExpired).length },
      { label: 'Under review', value: allRecords.filter(record => record.approvalStatus === 'Under Review').length }]} />
    <p className="text-xs text-slate-500">Spreadsheet references retain source text. An unverified reference is not an official registration approval.</p>
    <div className="fx-toolbar">
      <SearchField label="Search regulatory records" placeholder="Registration, product, ingredient, or holder" value={searchQuery} onChange={setSearchQuery} />
      <select className="fx-button" aria-label="Regulatory jurisdiction" value={selectedCountry} onChange={event => setSelectedCountry(event.target.value)}><option value="All">All jurisdictions</option>{countries.map(country => <option key={country}>{country}</option>)}</select>
      <select className="fx-button fx-authority-select" aria-label="Regulatory authority" value={selectedAuthority} onChange={event => setSelectedAuthority(event.target.value)}><option value="All">All authorities</option>{authorities.map(authority => <option key={authority}>{authority}</option>)}</select>
    </div>
    {records.length ? <div className="fx-surface overflow-x-auto"><table className="fx-data-table"><thead><tr><th>Registration</th><th>Product / jurisdiction</th><th>Active substance</th><th>Authority / source</th><th>Holder</th><th>Recorded status / validity</th><th>Source</th></tr></thead>
      <tbody>{visibleRecords.map(record => <tr key={record.id}>
        <td><button className="font-mono text-left font-semibold text-blue-600 dark:text-blue-400" onClick={() => setSelectedRecord(record)}>{record.registrationNumber}</button>{isDemoRecord('regulatory', record.id) && <span className="fx-record-origin mt-2">Demo-origin</span>}</td>
        <td><button className="text-left font-semibold" onClick={() => onSelectProduct(record.productId)}>{record.productName}</button><div className="text-xs text-slate-500 mt-1">{record.country}</div></td>
        <td>{record.activeIngredient}</td><td>{record.regulatoryAuthority}<div className="text-[11px] text-slate-500 mt-1">{record.sourceDocument}</div></td>
        <td>{record.registrationHolder}</td><td><StatusIndicator status={record.approvalStatus} /><div className={`mt-2 text-xs ${isExpired(record) ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500'}`}>{isExpired(record) ? 'Expiry elapsed: ' : 'Expiry: '}{record.expiryDate || 'Not recorded'}</div></td>
        <td>{sourceHref(record.officialLink) ? <a href={sourceHref(record.officialLink)} target="_blank" rel="noopener noreferrer" className="fx-button" aria-label={`Open source for ${record.registrationNumber}`} title="Source portal"><ExternalLink size={15} /></a> : <span className="text-xs text-slate-500">Not recorded</span>}</td>
      </tr>)}</tbody></table></div> : search.loading || search.error ? null : <EmptyState title="No matching registration records" />}
    {pages > 1 && <nav aria-label="Registration pagination" className="flex items-center justify-between text-xs">
      <button aria-label="Previous registration page" title="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="p-2 disabled:opacity-40"><ChevronLeft size={18} /></button>
      <span>Page {currentPage} of {pages}</span>
      <button aria-label="Next registration page" title="Next page" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} className="p-2 disabled:opacity-40"><ChevronRight size={18} /></button>
    </nav>}
    <RecordDialog open={!!selectedRecord} title="Registration dossier" onClose={() => setSelectedRecord(null)}>
      {selectedRecord && <div className="space-y-5"><h3 className="text-xl font-semibold">{selectedRecord.productName}</h3>
        {isDemoRecord('regulatory', selectedRecord.id) && <DemoNotice />}
        <MetadataGrid items={[
          { label: 'Registration identifier', value: selectedRecord.registrationNumber, mono: true }, { label: 'Active ingredient', value: selectedRecord.activeIngredient },
          { label: 'Authority', value: selectedRecord.regulatoryAuthority }, { label: 'Jurisdiction', value: selectedRecord.country },
          { label: 'Registration holder', value: selectedRecord.registrationHolder }, { label: 'Recorded approval status', value: selectedRecord.approvalStatus },
          { label: 'Approval date', value: selectedRecord.approvalDate, mono: true }, { label: 'Expiry date', value: selectedRecord.expiryDate, mono: true },
          { label: 'Stored verification date', value: selectedRecord.lastVerifiedDate, mono: true }, { label: 'Supporting reference', value: selectedRecord.sourceDocument },
        ]} />
        <p className="text-xs text-slate-500">Recorded approval is jurisdiction-specific. An elapsed expiry date is not evidence of a current registration.</p>
        <div className="flex flex-wrap gap-2"><button className="fx-button" onClick={() => { onSelectProduct(selectedRecord.productId); setSelectedRecord(null); }}>Product dossier<ArrowUpRight size={14} /></button>
          {sourceHref(selectedRecord.officialLink) && <a href={sourceHref(selectedRecord.officialLink)} target="_blank" rel="noopener noreferrer" className="fx-button">Source portal<ExternalLink size={14} /></a>}
        </div>
      </div>}
    </RecordDialog>
  </div>;
};
