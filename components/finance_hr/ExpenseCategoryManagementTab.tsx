import React, { useState, useEffect, useCallback } from 'react';
import {
  apiGetExpenseCategorySettings,
  apiAddExpenseCategorySetting,
  apiUpdateExpenseCategorySetting,
  apiDeleteExpenseCategorySetting,
} from '../../services/api';
import { ExpenseCategorySetting } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { useNotification } from '../../hooks/useNotification';
import { notifyOperationWithData, notifyWarning } from '../../utils/notificationUtils';
import { useConfirmation } from '../../hooks/useConfirmation';
import FinanceTable from '../finance/shared/FinanceTable';

const ExpenseCategoryManagementTab: React.FC<{ onCategoryUpdate?: () => void }> = ({ onCategoryUpdate }) => {
  const { addNotification } = useNotification();
  const { confirm } = useConfirmation();
  const [categories, setCategories] = useState<ExpenseCategorySetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategorySetting | null>(null);
  const [categoryName, setCategoryName] = useState('');

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const cats = await apiGetExpenseCategorySettings();
      setCategories(cats);
    } catch (error) {
      addNotification((error as Error).message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleOpenModal = (category: ExpenseCategorySetting | null = null) => {
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
          await apiUpdateExpenseCategorySetting(editingCategory.id, { name: categoryName.trim() });
          return { ...editingCategory, name: categoryName.trim() };
        } else {
          return await apiAddExpenseCategorySetting({ name: categoryName.trim(), isActive: true });
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
    if (onCategoryUpdate) {
      onCategoryUpdate();
    }
  };

  const handleToggleActive = async (category: ExpenseCategorySetting) => {
    const newActiveState = !category.isActive;
    await notifyOperationWithData(
      addNotification,
      async () => {
        await apiUpdateExpenseCategorySetting(category.id, { isActive: newActiveState });
        return { ...category, isActive: newActiveState };
      },
      `Category "${category.name}" ${newActiveState ? 'activated' : 'deactivated'} successfully.`,
      'Failed to update category status',
    );
    await loadCategories();
    if (onCategoryUpdate) {
      onCategoryUpdate();
    }
  };

  const handleDelete = async (category: ExpenseCategorySetting) => {
    const confirmed = await confirm(
      `Delete Category "${category.name}"?`,
      `Are you sure you want to delete this category? This action cannot be undone.`,
    );
    if (!confirmed) return;

    await notifyOperationWithData(
      addNotification,
      async () => {
        await apiDeleteExpenseCategorySetting(category.id);
        return true;
      },
      `Category "${category.name}" deleted successfully.`,
      'Failed to delete category',
    );
    await loadCategories();
    if (onCategoryUpdate) {
      onCategoryUpdate();
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Category Name',
      render: (cat: ExpenseCategorySetting) => (
        <span className="font-medium text-text-primary dark:text-slate-200">{cat.name}</span>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (cat: ExpenseCategorySetting) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            cat.isActive
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          {cat.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (cat: ExpenseCategorySetting) => (
        <div className="flex space-x-2">
          <Button
            variant={cat.isActive ? 'success' : 'secondary'}
            size="sm"
            onClick={() => handleToggleActive(cat)}
          >
            {cat.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleOpenModal(cat)}>
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(cat)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-text-primary dark:text-slate-200">Expense Categories</h2>
        <Button onClick={() => handleOpenModal(null)} variant="primary">
          + Add Category
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      ) : (
        <FinanceTable data={categories} columns={columns} rowKey="id" />
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCategory ? 'Edit Category' : 'Add Category'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Category Name"
            value={categoryName}
            onChange={e => setCategoryName(e.target.value)}
            required
            placeholder="e.g., Office Supplies, Travel, Marketing"
          />
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingCategory ? 'Save Changes' : 'Add Category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ExpenseCategoryManagementTab;

