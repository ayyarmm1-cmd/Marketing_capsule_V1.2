import React, { useState, useEffect, useCallback } from 'react';
import { Holiday, UserRole } from '../../types';
import { apiGetHolidays, apiAddHoliday, apiUpdateHoliday, apiDeleteHoliday, apiAddMultipleHolidays } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Spinner from '../ui/Spinner';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';

interface HolidayEntry {
  id: number;
  name: string;
  date: string;
  description: string;
}

interface AddEditHolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Holiday, 'id' | 'createdAt' | 'createdByUserId'> | Omit<Holiday, 'id' | 'createdAt' | 'createdByUserId'>[], id?: string) => Promise<void>;
  existingHoliday?: Holiday | null;
}

const AddEditHolidayModal: React.FC<AddEditHolidayModalProps> = ({ isOpen, onClose, onSubmit, existingHoliday }) => {
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  const [holidayEntries, setHolidayEntries] = useState<HolidayEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (existingHoliday) {
        setHolidayEntries([{ 
            id: 1, 
            name: existingHoliday.name, 
            date: existingHoliday.date, 
            description: existingHoliday.description || '' 
        }]);
      } else {
        const today = new Date().toISOString().split('T')[0];
        setHolidayEntries([{ id: Date.now(), name: '', date: today, description: '' }]);
      }
    }
  }, [isOpen, existingHoliday]);

  const handleEntryChange = (id: number, field: keyof Omit<HolidayEntry, 'id'>, value: string) => {
    setHolidayEntries(prev => prev.map(entry => entry.id === id ? { ...entry, [field]: value } : entry));
  };

  const addEntry = () => {
    const today = new Date().toISOString().split('T')[0];
    setHolidayEntries(prev => [...prev, { id: Date.now(), name: '', date: today, description: '' }]);
  };

  const removeEntry = (id: number) => {
    if (holidayEntries.length > 1) {
        setHolidayEntries(prev => prev.filter(entry => entry.id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (existingHoliday) {
        const entry = holidayEntries[0];
        if (!entry.name || !entry.date) {
            addNotification("Holiday Name and Date are required.", "warning");
            setIsLoading(false);
            return;
        }
        await onSubmit({ name: entry.name, date: entry.date, description: entry.description }, existingHoliday.id);
    } else {
        const validEntries = holidayEntries.filter(e => e.name.trim() && e.date.trim());
        if (validEntries.length === 0) {
            addNotification("Please fill out at least one valid holiday entry (Name and Date are required).", "warning");
            setIsLoading(false);
            return;
        }
        const dataToSubmit = validEntries.map(({ id, ...rest }) => rest);
        await onSubmit(dataToSubmit);
    }
    
    setIsLoading(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingHoliday ? "Edit Holiday" : "Add New Holidays"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto p-1 custom-scrollbar">
        {holidayEntries.map((entry, index) => (
          <div key={entry.id} className="p-3 border rounded-md bg-slate-50 dark:bg-slate-700/50 relative">
            {!existingHoliday && holidayEntries.length > 1 && (
              <Button type="button" variant="danger" size="sm" onClick={() => removeEntry(entry.id)} className="!absolute !p-1 h-6 w-6 top-2 right-2">X</Button>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Holiday Name*" value={entry.name} onChange={e => handleEntryChange(entry.id, 'name', e.target.value)} required />
                <Input label="Date*" type="date" value={entry.date} onChange={e => handleEntryChange(entry.id, 'date', e.target.value)} required />
            </div>
            <Input as="textarea" rows={2} label="Description (Optional)" value={entry.description} onChange={e => handleEntryChange(entry.id, 'description', e.target.value)} containerClassName="mt-4" />
          </div>
        ))}

        {!existingHoliday && (
          <Button type="button" variant="ghost" size="sm" onClick={addEntry}>+ Add Another Holiday</Button>
        )}
        
        <div className="flex justify-end space-x-2 pt-2 border-t mt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>{existingHoliday ? "Save Changes" : "Add Holidays"}</Button>
        </div>
      </form>
    </Modal>
  );
};


const HolidayPage: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  const isAdminOrOwner = user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER;
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  const fetchHolidays = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedHolidays = await apiGetHolidays();
      setHolidays(fetchedHolidays);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addNotification(`Failed to fetch holidays: ${errorMessage}`, "error");
      console.error("Failed to fetch holidays:", error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const handleModalSubmit = async (data: Omit<Holiday, 'id' | 'createdAt' | 'createdByUserId'> | Omit<Holiday, 'id' | 'createdAt' | 'createdByUserId'>[], id?: string) => {
    if (!user) return;
    try {
        if (Array.isArray(data)) {
            const holidaysWithUser = data.map(h => ({ ...h, createdByUserId: user.id }));
            await apiAddMultipleHolidays(holidaysWithUser);
            addNotification(`${holidaysWithUser.length} holiday(s) added successfully.`, "success");
        } else if (id) {
            await apiUpdateHoliday({ ...data, id, createdAt: editingHoliday!.createdAt, createdByUserId: editingHoliday!.createdByUserId });
            addNotification(`Holiday "${(data as Omit<Holiday, 'id' | 'createdAt' | 'createdByUserId'>).name}" updated successfully.`, 'success');
        }
        setEditingHoliday(null);
        fetchHolidays();
    } catch (error) {
        addNotification(`Failed to save holiday(s): ${(error as Error).message}`, 'error');
    }
  };

  const handleDeleteHoliday = async (holidayId: string) => {
    const holiday = holidays.find(h => h.id === holidayId);
    const confirmed = await showConfirmation({
      title: 'Delete Holiday',
      message: `Are you sure you want to delete holiday "${holiday?.name || holidayId}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });
    if (confirmed) {
      try {
        await apiDeleteHoliday(holidayId);
        addNotification(`Holiday "${holiday?.name || holidayId}" deleted successfully.`, "success");
        fetchHolidays();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        addNotification(`Failed to delete holiday: ${errorMessage}`, "error");
        console.error("Failed to delete holiday:", error);
      }
    }
  };
  
  const openAddModal = () => {
    setEditingHoliday(null);
    setIsModalOpen(true);
  };
  
  const openEditModal = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setIsModalOpen(true);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // Add timeZone: 'UTC' to ensure date is interpreted as is, not shifted by local timezone
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
  };


  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-semibold text-text-primary">Public Holiday Calendar</h1>
        {isAdminOrOwner && (
          <Button onClick={openAddModal} variant="primary">+ Add Holiday</Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>
      ) : holidays.length > 0 ? (
        <div className="bg-container-bg shadow-md rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Holiday Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Description</th>
                {isAdminOrOwner && <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Actions</th>}
              </tr>
            </thead>
            <tbody className="bg-container-bg divide-y divide-gray-200">
              {holidays.map(hol => (
                <tr key={hol.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{formatDate(hol.date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{hol.name}</td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{hol.description || '-'}</td>
                  {isAdminOrOwner && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(hol)}>Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteHoliday(hol.id)}>Delete</Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-text-secondary py-8">No holidays announced yet.</p>
      )}
      <AddEditHolidayModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingHoliday(null); }}
        onSubmit={handleModalSubmit}
        existingHoliday={editingHoliday}
      />
    </div>
  );
};

export default HolidayPage;