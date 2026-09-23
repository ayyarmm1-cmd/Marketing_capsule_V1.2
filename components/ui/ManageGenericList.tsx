import React, { useState } from 'react';
import { SettingItem, Department } from '../../types';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import Button from './Button';
import Modal from './Modal';
import Input from './Input';
import Spinner from './Spinner';

interface ManageGenericListProps<T extends SettingItem | Department> {
  title: string;
  items: T[];
  fetchItems: () => void;
  addFunction: (data: { name: string; description?: string; isActive?: boolean }) => Promise<T>;
  updateFunction: (id: string, updates: Partial<T>) => Promise<void>;
  deleteFunction: (id: string) => Promise<void>;
  hasActiveToggle?: boolean; 
  hasDescription?: boolean; 
}

const ManageGenericList = <T extends SettingItem | Department>({
  title, items, fetchItems, addFunction, updateFunction, deleteFunction, hasActiveToggle = false, hasDescription = false
}: ManageGenericListProps<T>) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState(''); 
  const [isLoadingListAction, setIsLoadingListAction] = useState(false);
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();

  const openModal = (item: T | null = null) => {
    setEditingItem(item);
    setNewItemName(item?.name || '');
    setNewItemDescription(item && 'description' in item ? (item.description as string || '') : '');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!newItemName.trim()) {
      addNotification(`${title.slice(0, -1)} name cannot be empty.`, 'error');
      return;
    }
    setIsLoadingListAction(true);
    try {
      if (editingItem) {
        const updatePayload: Partial<T> = { name: newItemName } as Partial<T>;
        if (hasDescription) {
            (updatePayload as any).description = newItemDescription;
        }
        await updateFunction(editingItem.id, updatePayload);
        addNotification(`${title.slice(0, -1)} updated successfully.`, 'success');
      } else {
        const addPayload: { name: string; description?: string; isActive?: boolean} = { name: newItemName };
        if (hasDescription) {
            addPayload.description = newItemDescription;
        }
        if(hasActiveToggle) { 
            addPayload.isActive = true;
        }
        await addFunction(addPayload);
        addNotification(`${title.slice(0, -1)} added successfully.`, 'success');
      }
      fetchItems();
      setIsModalOpen(false);
    } catch (error) {
      addNotification(`Failed to save ${title.slice(0, -1).toLowerCase()}. ${(error as Error).message}`, 'error');
    }
    setIsLoadingListAction(false);
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await showConfirmation({
      title: 'Delete Item',
      message: `Are you sure you want to delete "${name}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });
    if (confirmed) {
      setIsLoadingListAction(true);
      try {
        await deleteFunction(id);
        addNotification(`"${name}" deleted successfully.`, 'success');
        fetchItems();
      } catch (error) {
        addNotification(`Failed to delete "${name}". ${(error as Error).message}`, 'error');
      }
      setIsLoadingListAction(false);
    }
  };
  
  const handleToggleActive = async (item: T) => {
    if (!hasActiveToggle || !('isActive' in item)) return; 
    setIsLoadingListAction(true);
    try {
        const updates = { isActive: !(item as SettingItem).isActive } as unknown as Partial<T>; 
        await updateFunction(item.id, updates);
        addNotification(`Status for "${item.name}" updated.`, 'success');
        fetchItems();
    } catch (error) {
        addNotification(`Failed to update status for "${item.name}". ${(error as Error).message}`, 'error');
    }
    setIsLoadingListAction(false);
  };

  return (
    <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-text-primary dark:text-slate-100">{title}</h3>
        <Button onClick={() => openModal()} variant="primary" size="sm">Add New</Button>
      </div>
      {isLoadingListAction && items.length === 0 ? <Spinner/> : items.length === 0 ? <p className="text-text-secondary dark:text-slate-400">No {title.toLowerCase()} configured yet.</p> : (
        <ul className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-2">
          {items.map(item => (
            <li key={item.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700">
              <div>
                <p className="text-text-primary dark:text-slate-200 font-medium">{item.name}</p>
                {hasDescription && 'description' in item && (item.description as string) && <p className="text-xs text-text-secondary dark:text-slate-400">{item.description as string}</p>}
              </div>
              <div className="flex items-center space-x-2">
                {hasActiveToggle && 'isActive' in item && (
                  <Button 
                    variant={(item as SettingItem).isActive ? 'success' : 'secondary'} 
                    size="sm" 
                    onClick={() => handleToggleActive(item)}
                    className="!px-2 !py-1 text-xs"
                    isLoading={isLoadingListAction}
                  >
                    {(item as SettingItem).isActive ? 'Active' : 'Inactive'}
                  </Button>
                )}
                <Button onClick={() => openModal(item)} variant="ghost" size="sm" className="!px-2 !py-1 text-xs" disabled={isLoadingListAction}>Edit</Button>
                <Button onClick={() => handleDelete(item.id, item.name)} variant="danger" size="sm" className="!px-2 !py-1 text-xs" disabled={isLoadingListAction}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? `Edit ${title.slice(0,-1)}` : `Add New ${title.slice(0,-1)}`}>
        <Input label="Name" value={newItemName} onChange={e => setNewItemName(e.target.value)} required />
        {hasDescription && <Input label="Description (Optional)" as="textarea" rows={2} value={newItemDescription} onChange={e => setNewItemDescription(e.target.value)} />}
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} isLoading={isLoadingListAction}>Save</Button>
        </div>
      </Modal>
    </div>
  );
};

export default ManageGenericList;


