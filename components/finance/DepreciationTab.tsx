import React, { useState, useCallback, useEffect } from 'react';
import { apiGetFixedAssets, apiRunDepreciation } from '../../services/api';
import { FixedAsset } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { useNotification } from '../../hooks/useNotification';
import { notifyOperationWithData } from '../../utils/notificationUtils';
import FinanceTable from './shared/FinanceTable';

const DepreciationTab: React.FC = () => {
  const { addNotification } = useNotification();
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [depreciationPeriod, setDepreciationPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const fixedAssets = await apiGetFixedAssets();
      setAssets(fixedAssets);
    } catch (error) {
      addNotification((error as Error).message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  React.useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const activeAssets = assets.filter(a => a.status === 'Active');

  // Initialize selected assets when active assets change
  useEffect(() => {
    setSelectedAssetIds(activeAssets.map(a => a.id));
  }, [assets]);

  const handleOpenConfirmModal = () => {
    if (activeAssets.length === 0) {
      addNotification('No active assets to depreciate.', 'warning');
      return;
    }
    setSelectedAssetIds(activeAssets.map(a => a.id));
    setIsConfirmModalOpen(true);
  };

  const handleToggleAsset = (assetId: string) => {
    setSelectedAssetIds(prev =>
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleSelectAll = () => {
    setSelectedAssetIds(activeAssets.map(a => a.id));
  };

  const handleDeselectAll = () => {
    setSelectedAssetIds([]);
  };

  const handleConfirmDepreciation = async () => {
    if (selectedAssetIds.length === 0) {
      addNotification('Please select at least one asset to depreciate.', 'warning');
      return;
    }

    const updated = await notifyOperationWithData(
      addNotification,
      () => apiRunDepreciation(depreciationPeriod, selectedAssetIds),
      `Depreciation posted for ${selectedAssetIds.length} asset(s) for ${depreciationPeriod}.`,
      'Failed to post depreciation',
    );
    if (!updated) return;
    setAssets(updated);
    setIsConfirmModalOpen(false);
    await loadAssets();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Depreciation</h1>
          <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">
            Calculate and post depreciation for active assets.
          </p>
        </div>
      </div>

      {/* Depreciation Control */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Run Depreciation</h2>
        <div className="flex items-end gap-3">
          <Input
            label="Period (YYYY-MM)*"
            value={depreciationPeriod}
            onChange={e => setDepreciationPeriod(e.target.value)}
            containerClassName="flex-1"
            required
          />
          <Button onClick={handleOpenConfirmModal} variant="primary">
            Post Depreciation
          </Button>
        </div>
        <p className="text-sm text-text-secondary dark:text-slate-400 mt-3">
          This will calculate and post depreciation for all active assets for the selected period.
        </p>
      </div>

      {/* Active Assets for Depreciation */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Active Assets ({activeAssets.length})</h2>
        <FinanceTable
          columns={[
            {
              key: 'asset',
              label: 'Asset',
              render: (asset: FixedAsset) => (
                <div>
                  <div className="font-semibold text-text-primary dark:text-slate-100">{asset.assetCode}</div>
                  <div className="text-xs text-text-secondary dark:text-slate-400">{asset.name}</div>
                </div>
              ),
            },
            {
              key: 'cost',
              label: 'Cost',
              render: (asset: FixedAsset) => asset.cost.toLocaleString() + ' MMK',
            },
            {
              key: 'accumulatedDepreciation',
              label: 'Accum. Depreciation',
              render: (asset: FixedAsset) => asset.accumulatedDepreciation.toLocaleString() + ' MMK',
            },
            {
              key: 'bookValue',
              label: 'Net Book Value',
              render: (asset: FixedAsset) => (
                <span className="font-medium">{asset.bookValue.toLocaleString()} MMK</span>
              ),
            },
            {
              key: 'depreciationMethod',
              label: 'Method',
              render: (asset: FixedAsset) => asset.depreciationMethod,
            },
          ]}
          data={activeAssets}
          isLoading={isLoading}
          emptyMessage="No active assets found."
          rowKey="id"
        />
      </div>

      {/* Confirmation Modal with Asset Selection */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Depreciation"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-text-secondary dark:text-slate-400">
            Select assets to include in depreciation for period <strong>{depreciationPeriod}</strong>:
          </p>

          {/* Select/Deselect All Buttons */}
          <div className="flex gap-2 mb-4">
            <Button size="sm" variant="secondary" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button size="sm" variant="secondary" onClick={handleDeselectAll}>
              Deselect All
            </Button>
            <span className="ml-auto text-sm text-text-secondary dark:text-slate-400 self-center">
              {selectedAssetIds.length} of {activeAssets.length} selected
            </span>
          </div>

          {/* Asset Selection List */}
          <div className="max-h-80 overflow-y-auto border rounded-lg dark:border-slate-700">
            {activeAssets.map(asset => {
              const isSelected = selectedAssetIds.includes(asset.id);
              const monthlyDepreciation = (asset.cost - (asset.salvageValue ?? 0)) / asset.usefulLifeMonths;
              return (
                <label
                  key={asset.id}
                  className={`flex items-center gap-3 p-3 border-b last:border-b-0 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleAsset(asset.id)}
                    className="w-4 h-4 text-primary-action rounded border-slate-300 focus:ring-primary-action"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-text-primary dark:text-slate-100">
                      {asset.assetCode} - {asset.name}
                    </div>
                    <div className="text-xs text-text-secondary dark:text-slate-400">
                      Book Value: {asset.bookValue.toLocaleString()} MMK | Monthly Dep: {monthlyDepreciation.toLocaleString(undefined, { maximumFractionDigits: 0 })} MMK
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t dark:border-slate-700">
            <Button variant="secondary" onClick={() => setIsConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmDepreciation}
              disabled={selectedAssetIds.length === 0}
            >
              Post Depreciation ({selectedAssetIds.length} assets)
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DepreciationTab;




