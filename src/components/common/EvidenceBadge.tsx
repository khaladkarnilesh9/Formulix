import React from 'react';
import { VerificationEvidence, RegistrationStatus } from '../../types';
import { ShieldCheck, FileCheck, BookOpen, AlertCircle, Sparkles } from 'lucide-react';

interface EvidenceBadgeProps {
  evidence: VerificationEvidence;
  size?: 'sm' | 'md';
}

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({ evidence, size = 'sm' }) => {
  const isSmall = size === 'sm';

  switch (evidence) {
    case 'Regulatory verified':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400 ${
            isSmall ? 'text-xs' : 'text-sm'
          }`}
          title="Stored evidence classification: Regulatory verified. This label alone is not independent source verification."
        >
          <ShieldCheck className={isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          <span>Recorded regulatory evidence</span>
        </span>
      );

    case 'Manufacturer disclosed':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium text-blue-700 dark:text-blue-400 ${
            isSmall ? 'text-xs' : 'text-sm'
          }`}
          title="Stored evidence classification: Manufacturer disclosed. Consult the recorded source."
        >
          <FileCheck className={isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          <span>Recorded manufacturer evidence</span>
        </span>
      );

    case 'Patent disclosed':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium text-purple-700 dark:text-purple-400 ${
            isSmall ? 'text-xs' : 'text-sm'
          }`}
          title="Stored evidence classification: Patent disclosed. Consult the recorded publication."
        >
          <BookOpen className={isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          <span>Recorded patent evidence</span>
        </span>
      );

    case 'Literature reported':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400 ${
            isSmall ? 'text-xs' : 'text-sm'
          }`}
          title="Stored evidence classification: Literature reported. Consult the recorded publication."
        >
          <BookOpen className={isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          <span>Recorded literature evidence</span>
        </span>
      );

    case 'Synthetic demo data':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400 ${
            isSmall ? 'text-xs' : 'text-sm'
          }`}
          title="Synthetic model data provided for demonstration purposes"
        >
          <Sparkles className={isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          <span>Demo Synthetic Model</span>
        </span>
      );
    case 'Imported unverified':
    default:
      return <span className={`inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400 ${isSmall ? 'text-xs' : 'text-sm'}`} title="Source-reported values have not been independently verified">
        <AlertCircle className={isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span>{evidence === 'Imported unverified' ? 'Imported / unverified' : 'Unverified evidence'}</span>
      </span>;
  }
};

interface StatusIndicatorProps {
  status: RegistrationStatus;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  let dotColor = 'bg-slate-400';
  let textColor = 'text-slate-600 dark:text-slate-300';

  if (status === 'Approved' || status === 'Active') {
    dotColor = 'bg-emerald-500';
    textColor = 'text-emerald-700 dark:text-emerald-400';
  } else if (status === 'Under Review' || status === 'Conditional') {
    dotColor = 'bg-amber-500';
    textColor = 'text-amber-700 dark:text-amber-400';
  } else if (status === 'Withdrawn') {
    dotColor = 'bg-rose-500';
    textColor = 'text-rose-700 dark:text-rose-400';
  }

  return (
    <span data-status={status} className={`fx-status-badge inline-flex items-center gap-1.5 text-xs font-medium ${textColor}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{status}</span>
    </span>
  );
};
