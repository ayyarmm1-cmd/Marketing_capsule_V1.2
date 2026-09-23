import React, { useState, useEffect, useMemo } from 'react';
import { TaskList } from '../../types';
import { apiAddTaskList, apiUpdateTaskList, apiDeleteTaskList } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface ManageTaskListsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  taskLists: TaskList[];
  projectId?: string;
}

const ManageTaskListsModal: React.FC<ManageTaskListsModalProps> = ({ isOpen, onClose, onSuccess, taskLists, projectId }) => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  const [lists, setLists] = useState<TaskList[]>([]);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [listName, setListName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLists(taskLists);
      setEditingListId(null);
      setListName('');
    }
  }, [isOpen, taskLists]);

  const handleStartEditing = (list: TaskList) => {
    setEditingListId(list.id);
    setListName(list.title);
  };

  const handleCancelEdit = () => {
    setEditingListId(null);
    setListName('');
  };

  const handleSave = async () => {
    if (!listName.trim() || !user) return;
    setIsLoading(true);
    try {
      if (editingListId) {
        // Update
        await apiUpdateTaskList({ id: editingListId, title: listName });
        addNotification('Task group updated successfully.', 'success');
      } else {
        // Add new
        const newOrder = lists.length > 0 ? Math.max(...lists.map(l => l.order)) + 1 : 0;
        await apiAddTaskList({ title: listName, createdByUserId: user.id, isLocked: false, order: newOrder, projectId });
        addNotification('Task group added successfully.', 'success');
      }
      onSuccess();
      handleCancelEdit();
    } catch (error) {
      addNotification(`Error: ${(error as Error).message}`, 'error');
    }
    setIsLoading(false);
  };

  const handleDelete = async (list: TaskList) => {
    const confirmed = await showConfirmation({
      title: 'Delete Task Group',
      message: `Are you sure you want to delete the group "${list.title}"? Tasks in this group will become uncategorized.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });
    if (confirmed) {
      setIsLoading(true);
      try {
        await apiDeleteTaskList(list.id);
        addNotification('Task group deleted.', 'success');
        onSuccess();
      } catch (error) {
        addNotification(`Error deleting group: ${(error as Error).message}`, 'error');
      }
      setIsLoading(false);
    }
  };
  
  const listsToDisplay = useMemo(() => {
    return lists.filter(list => list.projectId === projectId);
  }, [lists, projectId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Task Groups">
      <div className="space-y-4">
        {/* Form for adding/editing */}
        <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
          <h4 className="font-semibold mb-2">{editingListId ? 'Edit Group Name' : 'Add New Group'}</h4>
          <div className="flex items-center gap-2">
            <Input
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Enter group name"
              containerClassName="mb-0 flex-grow"
            />
            <Button onClick={handleSave} isLoading={isLoading}>{editingListId ? 'Save' : 'Add'}</Button>
            {editingListId && <Button variant="secondary" onClick={handleCancelEdit}>Cancel</Button>}
          </div>
        </div>
        
        {/* List of existing groups */}
        <h4 className="font-semibold text-text-secondary dark:text-slate-400">Existing Groups</h4>
        <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2 pr-2">
          {listsToDisplay.length > 0 ? listsToDisplay.map(list => (
            <div key={list.id} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-700 rounded-md">
              <span className="text-sm text-text-primary dark:text-slate-200">{list.title}</span>
              {!list.isLocked && (
                <div className="space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleStartEditing(list)}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(list)}>Delete</Button>
                </div>
              )}
               {list.isLocked && (
                <span className="text-xs text-text-secondary dark:text-slate-400 italic">Locked</span>
               )}
            </div>
          )) : (
            <p className="text-sm text-center text-text-secondary dark:text-slate-400 py-4">No custom groups created yet for this project.</p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ManageTaskListsModal;