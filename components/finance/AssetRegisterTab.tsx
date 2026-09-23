import React, { useState, useEffect, useCallback } from 'react';
import { apiGetFixedAssets, apiAddFixedAsset, apiDisposeFixedAsset, apiDeleteFixedAssets } from '../../services/api';
import { DepreciationMethod, FixedAsset } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import { prompt as showPrompt } from '../../utils/dialogUtils';
import { notifyOperationWithData, notifyWarning } from '../../utils/notificationUtils';
import FinanceTable from './shared/FinanceTable';

interface AssetRegisterTabProps {
  categories: { name: string }[];
  onAssetAdded: () => void;
}

const depreciationOptions = Object.values(DepreciationMethod).map(method => ({
  label: method,
  value: method,
}));

const AssetRegisterTab: React.FC<AssetRegisterTabProps> = ({ categories, onAssetAdded }) => {
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [assetForm, setAssetForm] = useState({
    assetCode: '',
    name: '',
    category: categories.length > 0 ? categories[0].name : '',
    acquisitionDate: new Date().toISOString().split('T')[0],
    cost: 0,
    usefulLifeMonths: 36,
    salvageValue: 0,
    depreciationMethod: DepreciationMethod.STRAIGHT_LINE,
  });

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

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  useEffect(() => {
    if (categories.length > 0 && !assetForm.category) {
      setAssetForm(prev => ({ ...prev, category: categories[0].name }));
    }
  }, [categories, assetForm.category]);

  const handleAddAsset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!assetForm.assetCode || !assetForm.name || !assetForm.cost) {
      notifyWarning(addNotification, 'Provide asset code, name and cost.');
      return;
    }
    const asset = await notifyOperationWithData(
      addNotification,
      () =>
        apiAddFixedAsset({
          ...assetForm,
          cost: Number(assetForm.cost),
          salvageValue: Number(assetForm.salvageValue),
        }),
      `Asset "${assetForm.assetCode} - ${assetForm.name}" capitalized successfully.`,
      'Failed to capitalize asset',
    );
    if (!asset) return;
    await loadAssets();
    onAssetAdded();
    setAssetForm({
      assetCode: '',
      name: '',
      category: categories.length > 0 ? categories[0].name : '',
      acquisitionDate: new Date().toISOString().split('T')[0],
      cost: 0,
      usefulLifeMonths: 36,
      salvageValue: 0,
      depreciationMethod: DepreciationMethod.STRAIGHT_LINE,
    });
    setIsAssetModalOpen(false);
  };

  const handleDisposal = async (assetId: string) => {
    const assetToDispose = assets.find(a => a.id === assetId);
    const proceedsInput = await showPrompt('Enter sale proceeds for disposal', '0', 'Dispose Asset');
    if (proceedsInput === null) return;
    const proceeds = Number(proceedsInput);
    if (Number.isNaN(proceeds)) {
      notifyWarning(addNotification, 'Please enter a valid numeric amount for proceeds.');
      return;
    }
    const asset = await notifyOperationWithData(
      addNotification,
      () =>
        apiDisposeFixedAsset(assetId, new Date().toISOString().split('T')[0], proceeds),
      `Asset "${assetToDispose?.assetCode || assetId}" disposed. Gain/loss recognized.`,
      'Failed to dispose asset',
    );
    if (!asset) return;
    await loadAssets();
  };

  // Selection handlers
  const handleToggleSelect = (assetId: string) => {
    setSelectedAssetIds(prev =>
      prev.includes(assetId) ? prev.filter(id => id !== assetId) : [...prev, assetId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAssetIds.length === assets.length) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(assets.map(a => a.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedAssetIds.length === 0) {
      notifyWarning(addNotification, 'Please select at least one asset to delete.');
      return;
    }

    const confirmed = await showConfirmation({
      title: `Delete ${selectedAssetIds.length} Asset(s)?`,
      message: `Are you sure you want to delete ${selectedAssetIds.length} selected asset(s)? This action cannot be undone.`,
      confirmVariant: 'danger',
    });
    if (!confirmed) return;

    await notifyOperationWithData(
      addNotification,
      async () => {
        await apiDeleteFixedAssets(selectedAssetIds);
        return true;
      },
      `${selectedAssetIds.length} asset(s) deleted successfully.`,
      'Failed to delete assets',
    );
    setSelectedAssetIds([]);
    await loadAssets();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Asset Register</h1>
          <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">
            Track and manage fixed assets from acquisition to disposal.
          </p>
        </div>
        <div className="flex gap-2">
          {selectedAssetIds.length > 0 && (
            <Button onClick={handleDeleteSelected} variant="danger">
              Delete ({selectedAssetIds.length})
            </Button>
          )}
          <Button onClick={() => setIsAssetModalOpen(true)} variant="primary">
            + Capitalize Asset
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">Total Assets</p>
          <p className="text-2xl font-bold text-text-primary dark:text-slate-100">{assets.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">Active Assets</p>
          <p className="text-2xl font-bold text-text-primary dark:text-slate-100">
            {assets.filter(a => a.status === 'Active').length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">Net Book Value</p>
          <p className="text-2xl font-bold text-text-primary dark:text-slate-100">
            {assets.reduce((sum, asset) => sum + asset.bookValue, 0).toLocaleString()} MMK
          </p>
        </div>
      </div>

      {/* Assets Table */}
      <FinanceTable
        columns={[
          {
            key: 'select',
            label: (
              <input
                type="checkbox"
                checked={assets.length > 0 && selectedAssetIds.length === assets.length}
                onChange={handleSelectAll}
                className="w-4 h-4 text-primary-action rounded border-slate-300 focus:ring-primary-action"
              />
            ) as unknown as string,
            render: (asset: FixedAsset) => (
              <input
                type="checkbox"
                checked={selectedAssetIds.includes(asset.id)}
                onChange={() => handleToggleSelect(asset.id)}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 text-primary-action rounded border-slate-300 focus:ring-primary-action"
              />
            ),
          },
          {
            key: 'asset',
            label: 'Asset',
            render: (asset: FixedAsset) => (
              <div>
                <div className="font-semibold text-text-primary dark:text-slate-100">{asset.assetCode}</div>
                <div className="text-xs text-text-secondary dark:text-slate-400">{asset.name}</div>
                <div className="text-xs text-text-secondary dark:text-slate-400">{asset.category}</div>
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
            key: 'status',
            label: 'Status',
            render: (asset: FixedAsset) => (
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  asset.status === 'Active'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                }`}
              >
                {asset.status}
              </span>
            ),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (asset: FixedAsset) => (
              <Button
                size="sm"
                variant="secondary"
                disabled={asset.status !== 'Active'}
                onClick={() => handleDisposal(asset.id)}
              >
                Dispose
              </Button>
            ),
          },
        ]}
        data={assets}
        isLoading={isLoading}
        emptyMessage="No fixed assets recorded yet. Capitalize your first asset to get started."
        rowKey="id"
      />

      {/* Capitalize Asset Modal */}
      <Modal isOpen={isAssetModalOpen} onClose={() => setIsAssetModalOpen(false)} title="Capitalize Asset" size="lg">
        <form onSubmit={handleAddAsset} className="space-y-4">
          <Input
            label="Asset Code*"
            value={assetForm.assetCode}
            onChange={e => setAssetForm({ ...assetForm, assetCode: e.target.value })}
            required
          />
          <Input
            label="Asset Name*"
            value={assetForm.name}
            onChange={e => setAssetForm({ ...assetForm, name: e.target.value })}
            required
          />
          <Select
            label="Category*"
            value={assetForm.category}
            onChange={e => setAssetForm({ ...assetForm, category: e.target.value })}
            options={categories.map(cat => ({ label: cat.name, value: cat.name }))}
            required
          />
          <Input
            label="Acquisition Date*"
            type="date"
            value={assetForm.acquisitionDate}
            onChange={e => setAssetForm({ ...assetForm, acquisitionDate: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Cost (MMK)*"
              type="number"
              value={assetForm.cost}
              onChange={e => setAssetForm({ ...assetForm, cost: Number(e.target.value) })}
              required
              min="0"
              step="0.01"
            />
            <Input
              label="Salvage Value (MMK)"
              type="number"
              value={assetForm.salvageValue}
              onChange={e => setAssetForm({ ...assetForm, salvageValue: Number(e.target.value) })}
              min="0"
              step="0.01"
            />
          </div>
          <Input
            label="Useful Life (months)*"
            type="number"
            value={assetForm.usefulLifeMonths}
            onChange={e => setAssetForm({ ...assetForm, usefulLifeMonths: Number(e.target.value) })}
            required
            min="1"
          />
          <Select
            label="Depreciation Method*"
            value={assetForm.depreciationMethod}
            onChange={e =>
              setAssetForm({ ...assetForm, depreciationMethod: e.target.value as DepreciationMethod })
            }
            options={depreciationOptions}
            required
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsAssetModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Asset</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AssetRegisterTab;




