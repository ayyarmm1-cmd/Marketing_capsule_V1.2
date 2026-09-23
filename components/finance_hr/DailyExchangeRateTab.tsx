import React, { useState, useEffect, useCallback } from 'react';
import { DailyExchangeRate, User } from '../../types';
import {
    apiGetDailyExchangeRates,
    apiRecordDailyExchangeRate,
    apiUpdateDailyExchangeRate,
    apiDeleteDailyExchangeRate,
    apiGetUsers,
} from '../../services/api';
import { getTodayInYangon } from '../../utils/dateUtils';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Spinner from '../ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';

const AddEditExchangeRateModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (rateData: Omit<DailyExchangeRate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    existingRate?: DailyExchangeRate | null;
}> = ({ isOpen, onClose, onSave, existingRate }) => {
    const [date, setDate] = useState(getTodayInYangon());
    const [rate, setRate] = useState<number | ''>('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (existingRate) {
                setDate(existingRate.date);
                setRate(existingRate.rate);
            } else {
                setDate(getTodayInYangon());
                setRate('');
            }
        }
    }, [isOpen, existingRate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!date || rate === '' || Number(rate) <= 0) {
            alert("Date and a valid Exchange Rate are required.");
            return;
        }
        setIsLoading(true);
        await onSave({
            date,
            rate: Number(rate),
            recordedByUserId: '', // Will be set by the parent component
        });
        setIsLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={existingRate ? "Edit Daily Exchange Rate" : "Add Daily Exchange Rate"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Date*"
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    required
                />
                <Input
                    label="Exchange Rate (MMK/USD)*"
                    type="number"
                    value={rate}
                    onChange={e => setRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    step="0.01"
                    required
                    placeholder="e.g., 4152.00"
                />
                <div className="flex justify-end space-x-2 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="primary" isLoading={isLoading}>
                        {existingRate ? "Save Changes" : "Add Rate"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

const DailyExchangeRateTab: React.FC = () => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();
    const [rates, setRates] = useState<DailyExchangeRate[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRate, setEditingRate] = useState<DailyExchangeRate | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedRates, fetchedUsers] = await Promise.all([
                apiGetDailyExchangeRates(), // Fetch all rates without date filters
                apiGetUsers(),
            ]);
            setRates(fetchedRates);
            setUsers(fetchedUsers);
        } catch (error) {
            console.error("Failed to fetch exchange rates:", error);
            addNotification("Failed to fetch exchange rate data.", "error");
        }
        setIsLoading(false);
    }, [addNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (rate: DailyExchangeRate | null = null) => {
        setEditingRate(rate);
        setIsModalOpen(true);
    };

    const handleSaveRate = async (rateData: Omit<DailyExchangeRate, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (!user) {
            addNotification("Authentication error.", "error");
            return;
        }
        try {
            const dataWithUser = {
                ...rateData,
                recordedByUserId: user.id,
            };
            
            if (editingRate) {
                await apiUpdateDailyExchangeRate({
                    id: editingRate.id,
                    ...dataWithUser,
                });
                addNotification("Exchange rate updated successfully.", "success");
            } else {
                await apiRecordDailyExchangeRate(dataWithUser);
                addNotification("Exchange rate recorded successfully.", "success");
            }
            
            // Wait a bit for Firestore to update, then refresh
            setTimeout(() => {
                fetchData();
            }, 500);
            
            setIsModalOpen(false);
            setEditingRate(null);
        } catch (error) {
            console.error("Error saving exchange rate:", error);
            addNotification(`Failed to save exchange rate: ${(error as Error).message}`, "error");
        }
    };

    const handleDeleteRate = async (rate: DailyExchangeRate) => {
        const confirmed = await showConfirmation({
            title: 'Delete Exchange Rate',
            message: `Are you sure you want to delete the exchange rate for ${formatDate(rate.date)} (${rate.rate} MMK/USD)?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            confirmVariant: 'danger',
        });
        if (confirmed) {
            try {
                await apiDeleteDailyExchangeRate(rate.id);
                addNotification("Exchange rate deleted successfully.", "success");
                fetchData();
            } catch (error) {
                addNotification(`Failed to delete exchange rate: ${(error as Error).message}`, "error");
            }
        }
    };

    const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || userId;
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'Asia/Yangon'
        });
    };
    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: 'Asia/Yangon'
        });
    };

    return (
        <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-text-primary dark:text-slate-200">
                    Daily Exchange Rates
                </h3>
                <Button onClick={() => handleOpenModal()} variant="primary">+ Add Exchange Rate</Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Spinner size="lg" />
                </div>
            ) : rates.length > 0 ? (
                <div className="bg-container-bg dark:bg-slate-800 shadow-md rounded-lg overflow-x-auto border border-slate-200 dark:border-slate-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Recorded At</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Exchange Rate (MMK/USD)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Recorded By</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                            {rates.map(rate => (
                                <tr key={rate.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary dark:text-slate-200">
                                        {formatDate(rate.date)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                        {rate.updatedAt ? formatDateTime(rate.updatedAt) : formatDateTime(rate.createdAt)}
                                        {rate.updatedAt && (
                                            <span className="text-xs text-text-secondary dark:text-slate-500 ml-1">(updated)</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary dark:text-slate-200 text-right font-semibold">
                                        {rate.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                        {getUserName(rate.recordedByUserId)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center space-x-1">
                                        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(rate)}>
                                            Edit
                                        </Button>
                                        <Button variant="danger" size="sm" onClick={() => handleDeleteRate(rate)}>
                                            Delete
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-center text-text-secondary dark:text-slate-400 py-8">
                    No exchange rates recorded yet. Add an exchange rate to get started.
                </p>
            )}

            <AddEditExchangeRateModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingRate(null);
                }}
                onSave={handleSaveRate}
                existingRate={editingRate}
            />
        </div>
    );
};

export default DailyExchangeRateTab;

