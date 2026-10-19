import { Link } from 'react-router-dom';
import { Box, FlaskConical, Atom, Factory, ShieldCheck, Files } from 'lucide-react';
import { DataService } from '../../services/dataService';
import { userPaths } from '../layout/navigation';
import { getFormulationApiState } from '../../services/formulationApi';

export function CatalogMetrics({ compact = false }: { compact?: boolean }) {
  const metrics = DataService.getDashboardMetrics().kpis;
  const sourceCount = DataService.getActiveIngredientReferences().length;
  const loading = getFormulationApiState() === 'loading';
  const cards = [
    { label: 'Products', value: metrics.totalProducts, detail: 'Catalog listings', icon: Box, tone: 'blue', path: userPaths['product-search'] },
    { label: 'Formulations', value: metrics.totalFormulations, detail: 'Database records', icon: FlaskConical, tone: 'violet', path: userPaths['formulation-explorer'] },
    { label: 'Active Records', value: sourceCount, detail: `${metrics.totalActiveIngredients} chemical registry entries`, icon: Atom, tone: 'emerald', path: userPaths['ingredient-explorer'] },
    { label: 'Companies', value: metrics.totalManufacturers, detail: 'Recorded company names', icon: Factory, tone: 'orange', path: userPaths['manufacturer-directory'] },
    { label: 'Registrations', value: metrics.totalRegistrations, detail: 'Source references', icon: ShieldCheck, tone: 'pink', path: userPaths['regulatory-intelligence'] },
    { label: 'Patent Links', value: metrics.patentLinkedFormulations, detail: 'Recorded associations', icon: Files, tone: 'cyan', path: userPaths['patent-intelligence'] },
  ];
  return <div className={`fx-catalog-metrics ${compact ? 'fx-catalog-metrics-compact' : ''}`} aria-label="Database catalog metrics">
    {cards.map(({ icon: Icon, ...card }) => <Link key={card.label} to={card.path} className="fx-premium-metric" data-tone={card.tone}>
      <span className="fx-premium-metric-icon"><Icon size={24} aria-hidden="true" /></span>
      <span className="fx-premium-metric-copy"><strong aria-busy={loading}>{loading ? <span className="fx-metric-skeleton" aria-label="Loading metric" /> : card.value.toLocaleString()}</strong><span>{card.label}</span><small>{card.detail}</small></span>
    </Link>)}
  </div>;
}
