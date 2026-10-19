import React, { useState } from 'react';
import { SharedRepository, AdminProductRecord } from '../../../data/repositories/sharedRepository';
import { RecordPublishStatus } from '../../../data/schemas/canonicalSchemas';
import { useToast } from '../../../components/common/Toast';
import {
  CheckSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileEdit,
  Eye,
  Check,
  X,
  Archive,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface AdminReviewQueueViewProps {
  onInspectProduct?: (product: AdminProductRecord) => void;
}

export const AdminReviewQueueView: React.FC<AdminReviewQueueViewProps> = ({
  onInspectProduct,
}) => {
  const { toast } = useToast();
  const repo = SharedRepository.getState();
  const [filterStatus, setFilterStatus] = useState<string>('Submitted for Review');

  const pendingItems = repo.products.filter((p) => {
    if (filterStatus === 'All') return true;
    return p.publishStatus === filterStatus;
  });

  const handleApproveAndPublish = (productId: string, brandName: string) => {
    SharedRepository.setProductPublishStatus(productId, 'Published', 'Lead Technical Reviewer');
    toast(`Approved & Published "${brandName}" live to User Portal!`, 'success');
  };

  const handleApproveStaged = (productId: string, brandName: string) => {
    SharedRepository.setProductPublishStatus(productId, 'Approved', 'Senior Regulatory Curator');
    toast(`Approved "${brandName}" (Staged for release)`, 'info');
  };

  const handleSendBackToDraft = (productId: string, brandName: string) => {
    SharedRepository.setProductPublishStatus(productId, 'Draft', 'Senior Reviewer');
    toast(`Returned "${brandName}" to Draft status with revision remarks.`, 'info');
  };

  return (
    <div className="fx-page">
      <div className="fx-page-heading">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <CheckSquare className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Data Review & Publishing Approval Queue
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Two-stage peer review workflow for commercial formulation records before publication to the live public portal.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
          {['Submitted for Review', 'Draft', 'Approved', 'Published', 'All'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Queue Cards */}
      <div className="space-y-4">
        {pendingItems.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              No items in "{filterStatus}" queue
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              All commercial product records have been processed or moved to another stage.
            </p>
          </div>
        ) : (
          pendingItems.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                    {item.brandName}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      item.publishStatus === 'Published'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : item.publishStatus === 'Submitted for Review'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {item.publishStatus}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">v{item.version}</span>
                </div>

                <p className="text-xs text-slate-500">
                  {item.activeIngredient} ({item.strength}) • {item.formulationType} • {item.manufacturerName}
                </p>

                <p className="text-xs text-slate-400 line-clamp-1 italic">
                  "{item.description}"
                </p>

                <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 font-mono">
                  <span>Docket: {item.registrationNumber}</span>
                  <span>Authority: {item.regulatoryAuthority}</span>
                  <span>Updated: {item.updatedAt}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {onInspectProduct && (
                  <button
                    onClick={() => onInspectProduct(item)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </button>
                )}

                {item.publishStatus !== 'Draft' && (
                  <button
                    onClick={() => handleSendBackToDraft(item.id, item.brandName)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100"
                    title="Return to draft for corrections"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Return to Draft</span>
                  </button>
                )}

                {item.publishStatus !== 'Approved' && item.publishStatus !== 'Published' && (
                  <button
                    onClick={() => handleApproveStaged(item.id, item.brandName)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                )}

                {item.publishStatus !== 'Published' && (
                  <button
                    onClick={() => handleApproveAndPublish(item.id, item.brandName)}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Publish Live</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
