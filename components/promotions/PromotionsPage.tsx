import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Promotion, Service, ServiceCategory, Permission } from '../../types';
import { apiGetPromotions, apiDeletePromotion, apiGetServices, apiGetServiceCategories } from '../../services/api';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import AddEditPromotionModal from './AddEditPromotionModal';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import Input from '../ui/Input';

const PromotionsPage: React.FC = () => {
    const { hasPermission } = useAuth();
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const canManagePromotions = hasPermission(Permission.MANAGE_PROMOTIONS);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedPromotions, fetchedServices, fetchedCategories] = await Promise.all([
                apiGetPromotions(),
                apiGetServices(),
                apiGetServiceCategories()
            ]);
            setPromotions(fetchedPromotions);
            setServices(fetchedServices);
            setCategories(fetchedCategories);
        } catch (error) {
            addNotification("Failed to fetch promotions data.", "error");
        }
        setIsLoading(false);
    }, [addNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (promo: Promotion | null = null) => {
        setEditingPromotion(promo);
        setIsModalOpen(true);
    };

    const handleModalSuccess = () => {
        setIsModalOpen(false);
        setEditingPromotion(null);
        fetchData();
    };

    const handleDeletePromotion = async (promotionId: string, promotionName: string) => {
        const confirmed = await showConfirmation({
          title: 'Delete Promotion',
          message: `Are you sure you want to delete the promotion "${promotionName}"?`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          confirmVariant: 'danger',
        });
        if (confirmed) {
            try {
                await apiDeletePromotion(promotionId);
                addNotification("Promotion deleted successfully.", "success");
                fetchData();
            } catch (error) {
                addNotification(`Failed to delete promotion: ${(error as Error).message}`, "error");
            }
        }
    };

    const filteredPromotions = useMemo(() => {
        return promotions.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [promotions, searchTerm]);

    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GB');

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-text-primary">Promotions Management</h1>
                {canManagePromotions && (
                    <Button onClick={() => handleOpenModal()} variant="primary">+ New Promotion</Button>
                )}
            </div>

            <div className="mb-4">
                <Input
                    placeholder="Search promotions by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    containerClassName="mb-0"
                />
            </div>

            <div className="bg-container-bg dark:bg-slate-800 shadow-md rounded-lg overflow-x-auto border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Value</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Validity</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
                            {canManagePromotions && <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredPromotions.map(promo => (
                            <tr key={promo.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                <td className="px-4 py-3 text-sm font-medium text-text-primary dark:text-slate-200">{promo.name}</td>
                                <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400">{promo.type}</td>
                                <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400">
                                    {promo.type === 'Percentage Discount' ? `${promo.value}%` :
                                     promo.type === 'Fixed Amount Discount' ? `${promo.value.toLocaleString()} MMK` :
                                     promo.type === 'Buy X, Get Y Free (Units)' ? `Buy ${promo.buyQuantity}, Get ${promo.getQuantity} Free` :
                                     promo.type === 'Buy X, Get Y Free (Duration)' ? `Buy ${promo.buyDurationValue} ${promo.durationUnit}, Get ${promo.getDurationValue} Free` :
                                     '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400">{formatDate(promo.startDate)} - {formatDate(promo.endDate)}</td>
                                <td className="px-4 py-3 text-sm text-center">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${promo.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                                        {promo.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                {canManagePromotions && (
                                    <td className="px-4 py-3 text-sm text-center space-x-2">
                                        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(promo)}>Edit</Button>
                                        <Button variant="danger" size="sm" onClick={() => handleDeletePromotion(promo.id, promo.name)}>Delete</Button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && canManagePromotions && (
                <AddEditPromotionModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleModalSuccess}
                    promotion={editingPromotion}
                    services={services}
                    categories={categories}
                />
            )}
        </div>
    );
};

export default PromotionsPage;