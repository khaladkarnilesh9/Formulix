import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { DataService, useSharedRepositoryListener } from '../../services/dataService';
import { useToast } from '../../components/common/Toast';
import { PageHeader, SearchField, IntelligenceTabs, DemoNotice, EmptyState, MetadataGrid } from '../../components/common/IntelligenceUI';
import type { ResearchNote } from '../../types';
import { Bookmark, FileText, Clock, Plus, Trash2, Edit2, Save, X, ArrowRight, Download } from 'lucide-react';

interface WorkspaceViewProps {
  onSelectProduct: (productId: string) => void;
  onSelectFormulation: (formId: string) => void;
  onSelectManufacturer: (mfgId: string) => void;
  initialTab?: 'saved' | 'notes' | 'activity';
}
export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  onSelectProduct, onSelectFormulation, onSelectManufacturer, initialTab = 'saved',
}) => {
  useSharedRepositoryListener();
  const { toast } = useToast();
  const {
    savedProductIds, toggleSavedProduct, savedFormulationIds, toggleSavedFormulation,
    bookmarkedManufacturerIds, toggleBookmarkedManufacturer, researchNotes, addNote, updateNote,
    deleteNote, recentActivities, savedIngredients, toggleSavedIngredient, savedBrands, toggleSavedBrand,
  } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteCategory, setNoteCategory] = useState('Formulation R&D');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');
  const matches = (...values: string[]) => values.join(' ').toLowerCase().includes(query.trim().toLowerCase());
  const allProducts = savedProductIds.map(DataService.getProductById).filter(record => record !== undefined);
  const allFormulations = savedFormulationIds.map(DataService.getFormulationById).filter(record => record !== undefined);
  const allManufacturers = bookmarkedManufacturerIds.map(DataService.getManufacturerById).filter(record => record !== undefined);
  const products = allProducts.filter(record => matches(record.brandName, record.activeIngredient, record.casNumber));
  const formulations = allFormulations.filter(record => matches(record.name, record.intendedApplication, record.formulationType));
  const manufacturers = allManufacturers.filter(record => matches(record.name, record.country));
  const notes = researchNotes.filter(note => matches(note.title, note.content, ...note.tags) && (category === 'All' || note.category === category));
  const activities = recentActivities.filter(activity => matches(activity.targetName, activity.action, activity.targetType));
  const ingredients = savedIngredients.filter(record => matches(record.name, record.recordKind));
  const brands=savedBrands.filter(record=>matches(record.brandName,record.companyName));
  const savedCount = allProducts.length + allFormulations.length + allManufacturers.length + savedIngredients.length + savedBrands.length;
  const categories = [...new Set(['Formulation R&D', 'Patent Intelligence', 'Green Chemistry', 'Regulatory Compliance', ...researchNotes.map(note => note.category)])];
  const edit = (note?: ResearchNote) => {
    setEditingId(note?.id ?? null); setTitle(note?.title ?? ''); setContent(note?.content ?? '');
    setTags(note?.tags.join(', ') ?? ''); setNoteCategory(note?.category ?? 'Formulation R&D');
    setError(''); setEditorOpen(true);
  };
  const save = () => {
    if (!title.trim()) { setError('A note title is required.'); return; }
    const list = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    if (editingId) updateNote(editingId, title.trim(), content, list);
    else addNote(title.trim(), content, noteCategory, list);
    setEditorOpen(false); setEditingId(null); toast(editingId ? 'Research note updated' : 'Research note saved');
  };
  const exportNotes = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'formulix-research-notes.json';
    anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Research notes exported');
  };

  return <div className="fx-page">
    <PageHeader scene="research" title={activeTab === 'saved' ? 'Saved Intelligence' : activeTab === 'notes' ? 'Research Notes' : 'Workspace Activity'}
      icon={activeTab === 'saved' ? Bookmark : activeTab === 'notes' ? FileText : Clock}
      count={activeTab === 'saved' ? `${savedCount} saved records` : activeTab === 'notes' ? `${researchNotes.length} notes` : `${recentActivities.length} activities`} />
    <IntelligenceTabs value={activeTab} onChange={tab => { setActiveTab(tab); setQuery(''); setCategory('All'); }}
      label="Research workspace" tabs={[
        { value: 'saved', label: 'Saved items', count: savedCount },
        { value: 'notes', label: 'Research notes', count: researchNotes.length },
        { value: 'activity', label: 'Activity', count: recentActivities.length },
      ]} />
    <div className="fx-toolbar">
      <SearchField value={query} onChange={setQuery} label="Search workspace" placeholder={activeTab === 'notes' ? 'Search title, observations or tags' : 'Search saved records or activity'} />
      {activeTab === 'notes' && <>
        <select className="fx-select" aria-label="Filter note category" value={category} onChange={event => setCategory(event.target.value)}><option value="All">All categories</option>{categories.map(value => <option key={value}>{value}</option>)}</select>
        <button className="fx-button" onClick={exportNotes} disabled={!notes.length}><Download size={16} />Export</button>
        <button className="fx-button fx-button-primary" onClick={() => edit()}><Plus size={16} />New Research Note</button>
      </>}
    </div>

    {activeTab === 'saved' && <div className="space-y-6">
      {!products.length && !formulations.length && !manufacturers.length && !ingredients.length && !brands.length && <EmptyState title="No matching saved records" />}
      {!!brands.length&&<section><h3 className="fx-section-title">Brands <span>{brands.length}</span></h3><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{brands.map(brand=><article className="fx-card space-y-3" key={brand.key}>
        <div className="flex items-start justify-between gap-3"><Link className="font-semibold text-blue-600" to={`/brands?brand=${encodeURIComponent(brand.key)}&brandName=${encodeURIComponent(brand.brandName)}&company=${encodeURIComponent(brand.companyName)}`}>{brand.brandName}</Link><button className="fx-icon-button" title="Remove saved brand" aria-label={`Remove ${brand.brandName}`} onClick={()=>toggleSavedBrand(brand)}><Trash2 size={16}/></button></div><p className="text-xs text-slate-500">{brand.companyName}</p>
      </article>)}</div></section>}
      {!!ingredients.length && <section><h3 className="fx-section-title">Ingredients <span>{ingredients.length}</span></h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{ingredients.map(record => <article className="fx-card space-y-3" key={record.id}>
          <div className="flex items-start justify-between gap-3"><Link className="font-semibold text-blue-600" to={`/ingredients?ingredient=${encodeURIComponent(record.id)}`}>{record.name}</Link>
            <button className="fx-icon-button" title="Remove saved ingredient" aria-label={`Remove ${record.name}`} onClick={() => toggleSavedIngredient(record)}><Trash2 size={16}/></button></div>
          <p className="text-xs text-slate-500">{record.recordKind}</p>
        </article>)}</div>
      </section>}
      {!!products.length && <section><h3 className="fx-section-title">Commercial products <span>{products.length}</span></h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{products.map(product => <article className="fx-card space-y-3" key={product.id}>
          <div className="flex items-start justify-between gap-3"><h4 className="font-semibold"><button className="text-left hover:text-blue-600" onClick={() => onSelectProduct(product.id)}>{product.brandName}</button></h4><button className="fx-icon-button" title="Remove saved product" aria-label={`Remove ${product.brandName}`} onClick={() => toggleSavedProduct(product.id, product.brandName)}><Trash2 size={16} /></button></div>
          <p className="text-sm text-slate-500">{product.genericName}</p>
          <MetadataGrid items={[{ label: 'Active ingredient', value: product.activeIngredient }, { label: 'Strength', value: product.strength }, { label: 'CAS number', value: product.casNumber, mono: true }, { label: 'Jurisdiction', value: product.country }]} />
          <button className="fx-button" onClick={() => onSelectProduct(product.id)}>View specifications<ArrowRight size={15} /></button>
        </article>)}</div>
      </section>}
      {!!formulations.length && <section><h3 className="fx-section-title">Formulations <span>{formulations.length}</span></h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{formulations.map(form => <article className="fx-card space-y-3" key={form.id}>
          <div className="flex items-start justify-between gap-3"><h4 className="font-semibold"><button className="text-left hover:text-blue-600" onClick={() => onSelectFormulation(form.id)}>{form.name}</button></h4><button className="fx-icon-button" title="Remove saved formulation" aria-label={`Remove ${form.name}`} onClick={() => toggleSavedFormulation(form.id, form.name)}><Trash2 size={16} /></button></div>
          <p className="text-sm text-slate-500">{form.intendedApplication}</p>
          <MetadataGrid items={[{ label: 'Formulation type', value: form.formulationType }, { label: 'Evidence label as recorded', value: form.verificationEvidence }]} />
          <button className="fx-button" onClick={() => onSelectFormulation(form.id)}>Open workbench<ArrowRight size={15} /></button>
        </article>)}</div>
      </section>}
      {!!manufacturers.length && <section><h3 className="fx-section-title">Manufacturers <span>{manufacturers.length}</span></h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{manufacturers.map(manufacturer => <article className="fx-card space-y-3" key={manufacturer.id}>
          <div className="flex items-start justify-between gap-3"><h4 className="font-semibold"><button className="text-left hover:text-blue-600" onClick={() => onSelectManufacturer(manufacturer.id)}>{manufacturer.name}</button></h4><button className="fx-icon-button" title="Remove saved manufacturer" aria-label={`Remove ${manufacturer.name}`} onClick={() => toggleBookmarkedManufacturer(manufacturer.id, manufacturer.name)}><Trash2 size={16} /></button></div>
          <p className="text-sm text-slate-500">{manufacturer.country}</p><button className="fx-button" onClick={() => onSelectManufacturer(manufacturer.id)}>Company profile<ArrowRight size={15} /></button>
        </article>)}</div>
      </section>}
    </div>}

    {activeTab === 'notes' && <>
      {editorOpen && <section className="fx-card space-y-4" aria-label={editingId ? 'Edit research note' : 'New research note'}>
        <div className="flex items-center justify-between"><h3 className="font-semibold">{editingId ? 'Edit research note' : 'New research note'}</h3><button title="Close note editor" className="fx-icon-button" onClick={() => setEditorOpen(false)}><X size={18} /></button></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="fx-field">Title<input autoFocus aria-invalid={Boolean(error)} aria-describedby={error ? 'note-error' : undefined} value={title} onChange={event => { setTitle(event.target.value); setError(''); }} /></label>
          <label className="fx-field">Category<select disabled={Boolean(editingId)} value={noteCategory} onChange={event => setNoteCategory(event.target.value)}>{categories.map(value => <option key={value}>{value}</option>)}</select></label>
        </div>
        <label className="fx-field">Research observations<textarea aria-label="Research observations" rows={7} value={content} onChange={event => setContent(event.target.value)} /></label>
        <label className="fx-field">Tags<input value={tags} onChange={event => setTags(event.target.value)} /></label>
        {error && <p id="note-error" role="alert" className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2"><button className="fx-button" onClick={() => setEditorOpen(false)}>Cancel</button><button className="fx-button fx-button-primary" onClick={save}><Save size={16} />{editingId ? 'Update Note' : 'Save to Workspace'}</button></div>
      </section>}
      {!notes.length && !editorOpen && <EmptyState title="No matching research notes" />}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{notes.map(note => <article className="fx-card space-y-3" key={note.id}>
        <header className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span className="font-semibold text-blue-600 dark:text-blue-400">{note.category}</span><time>{note.updatedAt}</time></header>
        <h3 className="font-semibold">{note.title}</h3><p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">{note.content}</p>
        <div className="flex flex-wrap gap-2">{note.tags.map((tag, index) => <button className="fx-tag" key={`${tag}-${index}`} onClick={() => setQuery(tag)}>#{tag}</button>)}</div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-3">
          <button className="fx-icon-button" title="Edit Note" aria-label={`Edit ${note.title}`} onClick={() => edit(note)}><Edit2 size={16} /></button>
          <button className="fx-icon-button" title="Delete Note" aria-label={`Delete ${note.title}`} onClick={() => { if (window.confirm(`Delete "${note.title}"?`)) { deleteNote(note.id); toast('Deleted note'); } }}><Trash2 size={16} /></button>
        </footer>
      </article>)}</div>
    </>}

    {activeTab === 'activity' && <section className="space-y-3">
      {!activities.length && <EmptyState title="No matching activity" />}
      {activities.map(activity => <article key={activity.id} className="fx-activity-row">
        <Clock size={17} className="text-blue-500 shrink-0" /><div className="min-w-0 flex-1"><h3 className="font-medium">{activity.targetName}</h3><p className="text-xs text-slate-500">{activity.action} / {activity.targetType}</p></div><time className="text-xs text-slate-500">{activity.timestamp}</time>
      </article>)}
    </section>}
  </div>;
};
