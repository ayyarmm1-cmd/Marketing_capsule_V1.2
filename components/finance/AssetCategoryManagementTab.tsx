import React, { useState, useEffect, useCallback } from 'react';
import {
  apiGetAssetCategorySettings,
  apiAddAssetCategorySetting,
  apiUpdateAssetCategorySetting,
  apiDeleteAssetCategorySetting,
} from '../../services/api';
import { AssetCategorySetting } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { useNotification } from '../../hooks/useNotification';
import { notifyOperationWithData, notifyWarning } from '../../utils/notificationUtils';
import { useConfirmation } from '../../hooks/useConfirmation';
import FinanceTable from './shared/FinanceTable';

const AssetCategoryManagementTab: React.FC = () => {
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  const [categories, setCategories] = useState<AssetCategorySetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AssetCategorySetting | null>(null);
  const [categoryName, setCategoryName] = useState('');

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const cats = await apiGetAssetCategorySettings();
      setCategories(cats.filter(c => c.isActive));
    } catch (error) {
      addNotification((error as Error).message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleOpenModal = (category: AssetCategorySetting | null = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
    } else {
      setEditingCategory(null);
      setCategoryName('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!categoryName.trim()) {
      notifyWarning(addNotification, 'Category name is required.');
      return;
    }

    const saved = await notifyOperationWithData(
      addNotification,
      async () => {
        if (editingCategory) {
          await apiUpdateAssetCategorySetting(editingCategory.id, { name: categoryName.trim() });
          return { ...editingCategory, name: categoryName.trim() };
        } else {
          return await apiAddAssetCategorySetting({ name: categoryName.trim(), isActive: true });
        }
      },
      editingCategory
        ? `Category "${categoryName}" updated successfully.`
        : `Category "${categoryName}" added successfully.`,
      editingCategory ? 'Failed to update category' : 'Failed to add category',
    );

    if (!saved) return;
    await loadCategories();
    setIsModalOpen(false);
    setEditingCategory(null);
    setCategoryName('');
  };

  const handleDelete = async (category: AssetCategorySetting) => {
    const confirmed = await showConfirmation({
      title: `Delete Category "${category.name}"?`,
      message: `Are you sure you want to delete this category? This action cannot be undone.`,
      confirmVariant: 'danger',
    });
    if (!confirmed) return;

    await notifyOperationWithData(
      addNotification,
      async () => {
        await apiDeleteAssetCategorySetting(category.id);
        return true;
      },
      `Category "${category.name}" deleted successfully.`,
      'Failed to delete category',
    );
    await loadCategories();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Category Management</h1>
          <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">
            Organize assets by creating and managing categories.
          </p>
        </div>
        <Button onClick={() => handleOpenModal(null)} variant="primary">
          + Add Category
        </Button>
      </div>

      <FinanceTable
        columns={[
          {
            key: 'name',
            label: 'Category Name',
            render: (category: AssetCategorySetting) => (
              <span className="font-medium text-text-primary dark:text-slate-100">{category.name}</span>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (category: AssetCategorySetting) => (
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  category.isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                }`}
              >
                {category.isActive ? 'Active' : 'Inactive'}
              </span>
            ),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (category: AssetCategorySetting) => (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => handleOpenModal(category)}>
                  Edit
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(category)}>
                  Delete
                </Button>
              </div>
            ),
          },
        ]}
        data={categories}
        isLoading={isLoading}
        emptyMessage="No categories found. Add your first category to get started."
        rowKey="id"
      />

      {/* Add/Edit Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCategory(null);
          setCategoryName('');
        }}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Category Name*"
            value={categoryName}
            onChange={e => setCategoryName(e.target.value)}
            placeholder="Enter category name"
            required
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setEditingCategory(null);
                setCategoryName('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit">{editingCategory ? 'Update' : 'Add'} Category</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AssetCategoryManagementTab;




