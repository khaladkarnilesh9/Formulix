import { useState } from 'react';
import { Database, RotateCcw, LogIn, LogOut } from 'lucide-react';
import { getDatabaseCatalog, getFormulationApiState, getFormulationApiError, refreshFormulationApi, staffSignIn, staffSignOut } from '../../services/formulationApi';
import { RecordDialog } from './IntelligenceUI';

export function CatalogStatus() {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const state = getFormulationApiState();
  const catalog = getDatabaseCatalog();
  const privateAccess = catalog.session?.canPreview || catalog.staffPreview;
  const emptyPublic = state === 'ready' && !privateAccess && !catalog.formulations.length && !catalog.products.length;
  const close = () => { if (!busy) { setOpen(false); setPassword(''); setError(''); } };
  return <>
  <div role="status" data-state={state} data-private={privateAccess ? 'true' : 'false'} className="fx-catalog-status flex flex-wrap items-center justify-between gap-2 mb-4 text-xs text-slate-500">
    <span className="fx-catalog-indicator flex items-center gap-2"><Database size={14} />{state === 'loading' ? 'Loading Django catalog...' : state === 'unavailable' ? getFormulationApiError() : getDatabaseCatalog().staffPreview ? 'Staff preview / includes unpublished records' : 'Published Django catalog'}</span>
    <div className="flex items-center gap-2">
      {!privateAccess && <button type="button" onClick={() => { setOpen(true); setError(''); }} className="flex items-center gap-1.5 text-blue-600"><LogIn size={14} />Staff Sign In</button>}
      {privateAccess && <span>Signed in{catalog.session?.username ? ` as ${catalog.session.username}` : ''}</span>}
      {privateAccess && <button type="button" title="Sign out" aria-label="Sign out of staff preview" disabled={busy} className="p-2" onClick={async () => {
        setBusy(true); setError('');
        try { await staffSignOut(); }
        catch (problem) { setError(problem instanceof Error ? problem.message : 'Sign-out failed'); }
        finally { setBusy(false); }
      }}><LogOut size={15} /></button>}
      <a href="/django-admin/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">Django Admin</a>
      <button type="button" aria-label="Refresh database catalog" title="Refresh database catalog" onClick={() => { void refreshFormulationApi(true); }} className="p-2"><RotateCcw size={15} /></button>
    </div>
  </div>
  {!open && error && <p role="alert" className="text-sm text-red-600 mb-4">{error}</p>}
  {emptyPublic && <div className="flex flex-wrap items-center justify-between gap-3 border-l-2 border-amber-500 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 mb-4 text-sm">
    <p>No published records. Imported drafts are private and available to authorized staff.</p>
    <button type="button" onClick={() => setOpen(true)} className="fx-button text-blue-600"><LogIn size={15} />View Uploaded Drafts</button>
  </div>}
  <RecordDialog open={open} title="Staff Sign In" onClose={close}>
    <form className="space-y-4" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError('');
      try { await staffSignIn(username, password); setPassword(''); setOpen(false); }
      catch (problem) { setError(problem instanceof Error ? problem.message : 'Sign-in failed'); }
      finally { setBusy(false); }
    }}>
      <label className="block text-sm">Username<input name="username" autoComplete="username" required value={username} onChange={event => setUsername(event.target.value)} className="block w-full border rounded-md px-3 py-2 mt-1 bg-transparent" /></label>
      <label className="block text-sm">Password<input name="password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} className="block w-full border rounded-md px-3 py-2 mt-1 bg-transparent" /></label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="fx-button fx-button-primary"><LogIn size={15} />{busy ? 'Signing in...' : 'Sign In'}</button>
    </form>
  </RecordDialog>
  </>;
}
