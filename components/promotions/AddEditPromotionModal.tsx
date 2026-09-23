import React, { useState, useEffect } from 'react';
import { Promotion, Service, ServiceCategory, PromotionType } from '../../types';
import { apiAddPromotion, apiUpdatePromotion } from '../../services/api';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { useNotification } from '../../hooks/useNotification';
import MultiSelect from '../ui/MultiSelect';

interface AddEditPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  promotion: Promotion | null;
  services: Service[];
  categories: ServiceCategory[];
}

const AddEditPromotionModal: React.FC<AddEditPromotionModalProps> = ({ isOpen, onClose, onSuccess, promotion, services, categories }) => {
    const { addNotification } = useNotification();
    const [formData, setFormData] = useState<Partial<Promotion>>({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (promotion) {
            setFormData({
                ...promotion,
                startDate: promotion.startDate.split('T')[0],
                endDate: promotion.endDate.split('T')[0],
            });
        } else {
            setFormData({
                name: '',
                type: PromotionType.PERCENTAGE,
                value: 0,
                buyQuantity: 1,
                getQuantity: 1,
                buyDurationValue: 2,
                getDurationValue: 1,
                durationUnit: 'Weeks',
                appliesTo: 'all_services',
                applicableServiceIds: [],
                applicableCategoryIds: [],
                minPurchaseAmount: 0,
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                isActive: true,
            });
        }
    }, [promotion, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleMultiSelectChange = (name: 'applicableServiceIds' | 'applicableCategoryIds', values: string[]) => {
        setFormData(prev => ({ ...prev, [name]: values }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const payload = {
                ...formData,
                value: Number(formData.value) || 0,
                buyQuantity: Number(formData.buyQuantity) || undefined,
                getQuantity: Number(formData.getQuantity) || undefined,
                buyDurationValue: Number(formData.buyDurationValue) || undefined,
                getDurationValue: Number(formData.getDurationValue) || undefined,
                durationUnit: formData.durationUnit || undefined,
                minPurchaseAmount: Number(formData.minPurchaseAmount) || undefined,
            };

            if (promotion) {
                await apiUpdatePromotion(payload as Promotion);
                addNotification("Promotion updated.", "success");
            } else {
                await apiAddPromotion(payload as Omit<Promotion, 'id'>);
                addNotification("Promotion created.", "success");
            }
            onSuccess();
        } catch (error) {
            addNotification(`Failed to save promotion: ${(error as Error).message}`, "error");
        }
        setIsLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={promotion ? "Edit Promotion" : "Create New Promotion"} size="xl">
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto p-1">
                <Input label="Promotion Name*" name="name" value={formData.name || ''} onChange={handleChange} required />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Start Date" name="startDate" type="date" value={formData.startDate || ''} onChange={handleChange} required />
                    <Input label="End Date" name="endDate" type="date" value={formData.endDate || ''} onChange={handleChange} required />
                </div>

                <Select label="Promotion Type" name="type" value={formData.type} onChange={handleChange} options={Object.values(PromotionType).map(t => ({ value: t, label: t }))} />

                {formData.type === PromotionType.PERCENTAGE && <Input label="Discount Percentage*" type="number" name="value" value={String(formData.value || '')} onChange={handleChange} required />}
                {formData.type === PromotionType.FIXED_AMOUNT && <Input label="Discount Amount (MMK)*" type="number" name="value" value={String(formData.value || '')} onChange={handleChange} required />}
                {formData.type === PromotionType.BOGO_UNITS && (
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Buy Quantity*" type="number" name="buyQuantity" value={String(formData.buyQuantity || '')} onChange={handleChange} required />
                        <Input label="Get Quantity Free*" type="number" name="getQuantity" value={String(formData.getQuantity || '')} onChange={handleChange} required />
                    </div>
                )}
                {formData.type === PromotionType.BOGO_DURATION && (
                    <div className="p-3 border rounded-md bg-slate-50 dark:bg-slate-700/50">
                        <p className="text-sm font-medium text-text-secondary dark:text-slate-400 mb-2">Buy-One-Get-One (Duration) Details</p>
                        <div className="grid grid-cols-3 gap-4">
                            <Input label="Buy (Quantity)*" type="number" name="buyDurationValue" value={String(formData.buyDurationValue || '')} onChange={handleChange} required />
                            <Input label="Get (Quantity)*" type="number" name="getDurationValue" value={String(formData.getDurationValue || '')} onChange={handleChange} required />
                            <Select label="Unit of Time*" name="durationUnit" value={formData.durationUnit} onChange={handleChange} options={[
                                { value: 'Days', label: 'Days' },
                                { value: 'Weeks', label: 'Weeks' },
                                { value: 'Months', label: 'Months' },
                            ]} required containerClassName="mb-0"/>
                        </div>
                        <p className="text-xs text-text-secondary dark:text-slate-400 mt-2">Example: Buy 2 Weeks, Get 1 Week Free.</p>
                    </div>
                )}
                
                <Select label="Applies To" name="appliesTo" value={formData.appliesTo} onChange={handleChange} options={[
                    { value: 'all_services', label: 'All Services' },
                    { value: 'specific_services', label: 'Specific Services' },
                    { value: 'specific_categories', label: 'Specific Categories' },
                ]} />

                {formData.appliesTo === 'specific_services' && (
                    <MultiSelect
                        label="Select Services"
                        options={services.map(s => ({ value: s.id, label: s.name }))}
                        selectedValues={formData.applicableServiceIds || []}
                        onChange={(vals) => handleMultiSelectChange('applicableServiceIds', vals)}
                        placeholder="Choose applicable services..."
                    />
                )}
                {formData.appliesTo === 'specific_categories' && (
                    <MultiSelect
                        label="Select Categories"
                        options={categories.map(c => ({ value: c.id, label: c.name }))}
                        selectedValues={formData.applicableCategoryIds || []}
                        onChange={(vals) => handleMultiSelectChange('applicableCategoryIds', vals)}
                        placeholder="Choose applicable categories..."
                    />
                )}

                <Input label="Minimum Purchase Amount (MMK)" type="number" name="minPurchaseAmount" value={String(formData.minPurchaseAmount || '')} onChange={handleChange} placeholder="Optional"/>
                
                <div className="flex items-center">
                    <input type="checkbox" id="promo-isActive" name="isActive" checked={!!formData.isActive} onChange={handleChange} className="h-4 w-4" />
                    <label htmlFor="promo-isActive" className="ml-2 text-sm">Promotion is Active</label>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button type="submit" variant="primary" isLoading={isLoading}>{promotion ? "Save Changes" : "Create Promotion"}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default AddEditPromotionModal;