import { useEffect, useState, type ReactNode } from 'react';
import { Atom, Database, type LucideIcon } from 'lucide-react';

export type ScientificScene = 'agriculture' | 'formulation' | 'molecular' | 'industry' | 'regulatory' | 'patents' | 'research';

export function ScientificHero({ title, subtitle, category = 'FORMULIX / SCIENTIFIC INTELLIGENCE', scene,
  backgroundImage, icon: Icon = Atom, count, actions }: {
  title: string; subtitle?: string; category?: string; scene: ScientificScene; backgroundImage?: string;
  icon?: LucideIcon; count?: ReactNode; actions?: ReactNode;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => { setImageFailed(false); }, [scene, backgroundImage]);
  return <section className="fx-scientific-hero" data-scene={scene}>
    {!imageFailed && <img src={backgroundImage ?? `/assets/scientific/${scene}.jpg`} alt="" aria-hidden="true"
      className="fx-scientific-hero-image" decoding="async" onError={() => setImageFailed(true)} />}
    <div className="fx-scientific-hero-veil" aria-hidden="true" />
    <div className="fx-scientific-hero-content">
      <span className="fx-hero-category"><Icon size={15} aria-hidden="true" />{category}</span>
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
      {(count !== undefined || actions) && <div className="fx-scientific-hero-actions">
        {count !== undefined && <span className="fx-hero-count"><Database size={14} />{count}</span>}{actions}
      </div>}
    </div>
  </section>;
}
