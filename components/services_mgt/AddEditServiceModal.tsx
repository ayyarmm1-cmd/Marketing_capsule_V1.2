import React, { useState, useEffect, useMemo } from 'react';
import { Service, ServiceCategory, PackageTier, ServiceCostItem } from '../../types';
import { apiAddService, apiUpdateService } from '../../services/api';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
interface AddEditServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  service: Service | null;
  categories: ServiceCategory[];
}

const AddEditServiceModal: React.FC<AddEditServiceModalProps> = ({ isOpen, onClose, onSave, service, categories }) => {
    const getInitialState = () => {
        const defaultCategory = categories.length > 0 ? categories[0].id : '';
        const defaultSubCategory = categories.length > 0 && categories[0].subCategories.length > 0 ? categories[0].subCategories[0].id : '';
        return {
            id: service?.id || '',
            name: service?.name || '',
            category: service?.category || defaultCategory,
            subCategory: service?.subCategory || defaultSubCategory,
            description: service?.description || '',
            unitPriceMMK: service?.unitPriceMMK,
            serviceRateMMK: service?.serviceRateMMK,
            packages: service?.packages || [],
            isActive: service ? service.isActive : true,
            createsProject: service ? service.createsProject : false,
            termsAndConditions: service?.termsAndConditions || '',
            proposalUrl: service?.proposalUrl || '',
            costItems: service?.costItems || [],
            taxPercentage: service?.taxPercentage,
            profitPercentage: service?.profitPercentage,
        };
    };

    const [formData, setFormData] = useState(getInitialState());
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setFormData(getInitialState());
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [service, isOpen, categories]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({...prev, [name]: checked}));
            return;
        }

        let processedValue: string | number | undefined = value;
        if (type === 'number') {
            processedValue = value === '' ? undefined : Number(value);
        }

        if (name === 'category') {
            const newCategoryDetails = categories.find(c => c.id === value);
            const firstSubCategory = newCategoryDetails?.subCategories[0]?.id || '';
            setFormData(prev => ({
                ...prev,
                category: value,
                subCategory: firstSubCategory,
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: processedValue }));
        }
    };

    const handlePackageChange = (index: number, field: keyof PackageTier, value: any) => {
        const newPackages = [...formData.packages];
        const updatedPackage = { ...newPackages[index] };
        
        const numericFields: (keyof PackageTier)[] = ['unitsOrUSD', 'priceMMK'];
        if (numericFields.includes(field)) {
            (updatedPackage as any)[field] = value === '' ? undefined : Number(value);
        } else {
            (updatedPackage as any)[field] = value;
        }
        
        newPackages[index] = updatedPackage;
        setFormData(prev => ({ ...prev, packages: newPackages }));
    };

    const addPackageRow = () => {
        const newPackage: PackageTier = { tierName: '', unitsOrUSD: undefined, priceMMK: undefined };
        setFormData(prev => ({
            ...prev,
            packages: [...prev.packages, newPackage]
        }));
    };
    
    const removePackageRow = (index: number) => {
        setFormData(prev => ({
            ...prev,
            packages: prev.packages.filter((_, i) => i !== index)
        }));
    };

    const handleCostItemChange = (index: number, field: keyof ServiceCostItem, value: string | number) => {
        const newCostItems = [...(formData.costItems || [])];
        const itemToUpdate = { ...newCostItems[index] };

        if (field === 'value') {
            (itemToUpdate as any)[field] = value === '' ? 0 : Number(value);
        } else {
            (itemToUpdate as any)[field] = value;
        }
        
        newCostItems[index] = itemToUpdate;
        setFormData(prev => ({ ...prev, costItems: newCostItems }));
    };

    const addCostItemRow = () => {
        setFormData(prev => ({
            ...prev,
            costItems: [...(prev.costItems || []), { id: `cost-${Date.now()}`, description: '', type: 'amount', value: 0 }]
        }));
    };

    const removeCostItemRow = (index: number) => {
        setFormData(prev => ({
            ...prev,
            costItems: (prev.costItems || []).filter((_, i) => i !== index)
        }));
    };
    
    const { totalInternalCost, suggestedPrice, finalPriceWithTax } = useMemo(() => {
        const sellingPrice = Number(formData.unitPriceMMK) || 0;
        
        const totalFixedCosts = (formData.costItems || [])
            .filter(item => item.type === 'amount')
            .reduce((sum, item) => sum + item.value, 0);

        const totalPercentageCosts = (formData.costItems || [])
            .filter(item => item.type === 'percentage')
            .reduce((sum, item) => sum + (sellingPrice * (item.value / 100)), 0);

        const totalCost = totalFixedCosts + totalPercentageCosts;

        const profitMargin = Number(formData.profitPercentage) || 0;
        const taxRate = Number(formData.taxPercentage) || 0;
        
        const totalFixedCostsForSuggestion = (formData.costItems || []).filter(item => item.type === 'amount').reduce((sum, item) => sum + item.value, 0);
        const totalPercentageRateForSuggestion = (formData.costItems || []).filter(item => item.type === 'percentage').reduce((sum, item) => sum + item.value, 0) / 100;

        const denominator = 1 - totalPercentageRateForSuggestion - (profitMargin / 100);
        const priceBeforeTax = denominator > 0 ? totalFixedCostsForSuggestion / denominator : Infinity;

        const taxAmount = priceBeforeTax * (taxRate / 100);
        const finalPrice = isFinite(priceBeforeTax) ? priceBeforeTax + taxAmount : Infinity;

        return {
            totalInternalCost: totalCost,
            suggestedPrice: priceBeforeTax,
            finalPriceWithTax: finalPrice,
        };
    }, [formData.costItems, formData.profitPercentage, formData.taxPercentage, formData.unitPriceMMK]);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const dataToSubmit: any = { ...formData };
        if (dataToSubmit.unitPriceMMK === undefined || dataToSubmit.unitPriceMMK === '') delete dataToSubmit.unitPriceMMK;
        if (dataToSubmit.serviceRateMMK === undefined || dataToSubmit.serviceRateMMK === '') delete dataToSubmit.serviceRateMMK;
        if (dataToSubmit.taxPercentage === undefined || dataToSubmit.taxPercentage === '') delete dataToSubmit.taxPercentage;
        if (dataToSubmit.profitPercentage === undefined || dataToSubmit.profitPercentage === '') delete dataToSubmit.profitPercentage;
        if (!dataToSubmit.proposalUrl) delete dataToSubmit.proposalUrl;

        try {
            if (service) {
                await apiUpdateService(dataToSubmit as Service);
            } else {
                const { id, ...newServiceData } = dataToSubmit;
                await apiAddService(newServiceData);
            }
            onSave();
        } catch (error) {
            alert(`Error saving service: ${(error as Error).message}`);
        }
        setIsLoading(false);
    };

    const selectedCategoryDetails = categories.find(c => c.id === formData.category);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={service ? "Edit Service" : "Add New Service"} size="3xl">
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
                <Input name="name" label="Service Name" value={formData.name} onChange={handleChange} required />
                <Select label="Category" name="category" value={formData.category} onChange={handleChange} options={categories.map(c => ({value: c.id, label: c.name}))} required />
                {selectedCategoryDetails && selectedCategoryDetails.subCategories.length > 0 && (
                    <Select label="Sub-Category" name="subCategory" value={formData.subCategory} onChange={handleChange} options={selectedCategoryDetails.subCategories.map(sc => ({value: sc.id, label: sc.name}))} />
                )}
                <Input as="textarea" rows={3} name="description" label="Description" value={formData.description} onChange={handleChange} />
                <Input name="proposalUrl" label="Proposal URL (Optional)" value={formData.proposalUrl || ''} onChange={handleChange} placeholder="https://docs.google.com/..." />
                <Input as="textarea" rows={5} name="termsAndConditions" label="Terms & Conditions" value={formData.termsAndConditions || ''} onChange={handleChange} placeholder="Enter terms specific to this service..."/>
                
                 <div className="grid grid-cols-2 gap-4">
                    <Input name="unitPriceMMK" label="Unit Price (MMK)" type="number" value={String(formData.unitPriceMMK ?? '')} onChange={handleChange} placeholder="For general services"/>
                    <Input name="serviceRateMMK" label="Service Rate (MMK)" type="number" value={String(formData.serviceRateMMK ?? '')} onChange={handleChange} placeholder="For Ads (per USD)"/>
                </div>

                <div className="space-y-4 pt-4 border-t dark:border-slate-700">
                        <h3 className="text-lg font-semibold text-text-secondary dark:text-slate-300">Pricing Tiers / Packages</h3>
                        {formData.packages.map((pkg, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end p-2 border rounded-md bg-slate-50 dark:bg-slate-700/50 dark:border-slate-600">
                                <Input label="Tier Name (Optional)" value={pkg.tierName || ''} onChange={e => handlePackageChange(index, 'tierName', e.target.value)} containerClassName="md:col-span-2 mb-0" />
                                <Input label="Quantity / Units*" type="number" value={String(pkg.unitsOrUSD ?? '')} onChange={e => handlePackageChange(index, 'unitsOrUSD', e.target.value)} containerClassName="mb-0" required/>
                                <Input label="Special Price (MMK)*" type="number" value={String(pkg.priceMMK ?? '')} onChange={e => handlePackageChange(index, 'priceMMK', e.target.value)} containerClassName="mb-0" required/>
                                <Button type="button" variant="danger" size="sm" onClick={() => removePackageRow(index)} className="self-end mb-0 !px-3 !py-2" aria-label="Remove Tier">X</Button>
                            </div>
                        ))}
                        <Button type="button" variant="ghost" size="sm" onClick={addPackageRow}>+ Add Tier</Button>
                    </div>
                 <div className="space-y-4 pt-4 mt-4 border-t dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-text-secondary dark:text-slate-300">Internal Costs & Pricing</h3>
                    {(formData.costItems || []).map((item, index) => (
                        <div key={item.id} className="grid grid-cols-1 md:grid-cols-10 gap-2 items-end p-2 border rounded-md bg-slate-50 dark:bg-slate-700/50 dark:border-slate-600">
                            <Input label="Cost Description" value={item.description} onChange={e => handleCostItemChange(index, 'description', e.target.value)} containerClassName="md:col-span-5 mb-0" />
                            <Select label="Type" value={item.type} onChange={e => handleCostItemChange(index, 'type', e.target.value)} options={[{value: 'amount', label: 'Amount'}, {value: 'percentage', label: 'Percentage'}]} containerClassName="md:col-span-2 mb-0"/>
                            <Input label={`Value ${item.type === 'amount' ? '(MMK)' : '(%)'}`} type="number" value={String(item.value)} onChange={e => handleCostItemChange(index, 'value', e.target.value)} containerClassName="md:col-span-2 mb-0" />
                            <Button type="button" variant="danger" size="sm" onClick={() => removeCostItemRow(index)} className="self-end mb-0 !px-3 !py-2">X</Button>
                        </div>
                    ))}
                    <Button type="button" variant="ghost" size="sm" onClick={addCostItemRow}>+ Add Cost Item</Button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input name="profitPercentage" label="Desired Profit Margin (%)" type="number" value={String(formData.profitPercentage ?? '')} onChange={handleChange} placeholder="e.g., 20 for 20%"/>
                        <Input name="taxPercentage" label="Tax (%)" type="number" value={String(formData.taxPercentage ?? '')} onChange={handleChange} placeholder="e.g., 5 for 5%"/>
                    </div>
                    
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md text-sm space-y-1">
                        <div className="flex justify-between"><span>Total Internal Cost (based on Unit Price):</span> <span className="font-semibold">{totalInternalCost.toLocaleString(undefined, {maximumFractionDigits: 0})} MMK</span></div>
                        <div className="flex justify-between"><span>Suggested Price (before tax):</span> <span className="font-semibold">{isFinite(suggestedPrice) ? suggestedPrice.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' MMK' : 'Profit margin too high'}</span></div>
                        <div className="flex justify-between"><span>Suggested Selling Price with Tax:</span> <span className="font-bold text-lg">{isFinite(finalPriceWithTax) ? finalPriceWithTax.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' MMK' : '-'}</span></div>
                        <p className="text-xs text-blue-600 dark:text-blue-300 pt-2">Note: Set the final price in the 'Unit Price' or 'Packages' section. This is a suggestion based on fixed costs and desired profit margin.</p>
                    </div>
                </div>
                
                 <div className="flex items-center gap-6">
                    <label className="flex items-center">
                        <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="h-4 w-4 text-primary-action rounded"/>
                        <span className="ml-2 text-sm">Service is Active</span>
                    </label>
                    <label className="flex items-center">
                        <input type="checkbox" name="createsProject" checked={!!formData.createsProject} onChange={handleChange} className="h-4 w-4 text-primary-action rounded"/>
                        <span className="ml-2 text-sm">Creates Project on Sale</span>
                    </label>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" isLoading={isLoading}>{service ? "Save Changes" : "Add Service"}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default AddEditServiceModal;
