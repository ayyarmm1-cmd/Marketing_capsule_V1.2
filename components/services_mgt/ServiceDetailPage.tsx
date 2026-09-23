import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Service, ServiceCategory, Permission, CampaignObjectiveSetting } from '../../types';
import { 
    apiGetServiceById, 
    apiGetServiceCategories, 
    apiDeleteService,
    apiGetCampaignObjectiveSettings,
    apiAddCampaignObjectiveSetting,
    apiUpdateCampaignObjectiveSetting,
    apiDeleteCampaignObjectiveSetting
} from '../../services/api';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import AddEditServiceModal from './AddEditServiceModal';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import ManageGenericList from '../ui/ManageGenericList';

const KPICard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <div className="bg-white dark:bg-slate-700 p-4 rounded-lg shadow">
        <p className="text-sm text-text-secondary dark:text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-primary-action">{value}</p>
    </div>
);

const ServiceDetailPage: React.FC = () => {
    const { serviceId } = useParams<{ serviceId: string }>();
    const { hasPermission } = useAuth();
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();
    const navigate = useNavigate();

    const [service, setService] = useState<Service | null>(null);
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [campaignObjectives, setCampaignObjectives] = useState<CampaignObjectiveSetting[]>([]);
    const [isLoadingObjectives, setIsLoadingObjectives] = useState(false);

    const canManage = hasPermission(Permission.MANAGE_SERVICES);

    const fetchData = useCallback(async () => {
        if (!serviceId) return;
        setIsLoading(true);
        try {
            const [fetchedService, fetchedCategories] = await Promise.all([
                apiGetServiceById(serviceId),
                apiGetServiceCategories()
            ]);
            setService(fetchedService);
            setCategories(fetchedCategories);
        } catch (error) {
            addNotification("Failed to load service details.", "error");
            setService(null);
        }
        setIsLoading(false);
    }, [serviceId, addNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const fetchCampaignObjectives = useCallback(async () => {
        if (!service || typeof service.serviceRateMMK !== 'number') return;
        setIsLoadingObjectives(true);
        try {
            const objectives = await apiGetCampaignObjectiveSettings();
            setCampaignObjectives(objectives);
        } catch (error) {
            addNotification("Failed to load campaign objectives.", "error");
        }
        setIsLoadingObjectives(false);
    }, [service, addNotification]);

    useEffect(() => {
        if (service) {
            fetchCampaignObjectives();
        }
    }, [service, fetchCampaignObjectives]);

    const handleModalSuccess = () => {
        setIsEditModalOpen(false);
        fetchData();
    };

    const handleDelete = async () => {
        if (!service) return;
        const confirmed = await showConfirmation({
          title: 'Delete Service',
          message: `Are you sure you want to delete the service "${service.name}"?`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          confirmVariant: 'danger',
        });
        if (confirmed) {
            try {
                await apiDeleteService(service.id);
                addNotification("Service deleted successfully.", "success");
                navigate('/services');
            } catch (error) {
                addNotification(`Failed to delete service: ${(error as Error).message}`, "error");
            }
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
    if (!service) return <div className="text-center p-8 text-red-600">Service not found.</div>;

    const categoryName = categories.find(c => c.id === service.category)?.name || 'N/A';
    const subCategoryName = categories.find(c => c.id === service.category)?.subCategories.find(sc => sc.id === service.subCategory)?.name || 'N/A';
    
    const { totalInternalCost, suggestedPrice, finalPriceWithTax } = (() => {
        const sellingPrice = Number(service.unitPriceMMK) || 0;
        const totalFixedCosts = (service.costItems || []).filter(item => item.type === 'amount').reduce((sum, item) => sum + item.value, 0);
        const totalPercentageCosts = (service.costItems || []).filter(item => item.type === 'percentage').reduce((sum, item) => sum + (sellingPrice * (item.value / 100)), 0);
        const totalCost = totalFixedCosts + totalPercentageCosts;

        const profitMargin = Number(service.profitPercentage) || 0;
        const taxRate = Number(service.taxPercentage) || 0;
        const totalPercentageRateForSuggestion = (service.costItems || []).filter(item => item.type === 'percentage').reduce((sum, item) => sum + item.value, 0) / 100;
        const denominator = 1 - totalPercentageRateForSuggestion - (profitMargin / 100);
        const priceBeforeTax = denominator > 0 ? totalFixedCosts / denominator : Infinity;
        const taxAmount = priceBeforeTax * (taxRate / 100);
        const finalPrice = isFinite(priceBeforeTax) ? priceBeforeTax + taxAmount : Infinity;

        return { totalInternalCost: totalCost, suggestedPrice: priceBeforeTax, finalPriceWithTax: finalPrice };
    })();


    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary dark:text-slate-100">{service.name}</h1>
                        <p className="text-md text-text-secondary dark:text-slate-400">{categoryName} &gt; {subCategoryName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                         <Link to="/services" className="text-sm text-primary-action hover:underline">&larr; Back to Services</Link>
                         {canManage && <Button onClick={() => setIsEditModalOpen(true)} variant="primary" size="sm">Edit Service</Button>}
                         {canManage && <Button onClick={handleDelete} variant="danger" size="sm">Delete</Button>}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Unit Price" value={`${service.unitPriceMMK?.toLocaleString() || 'N/A'} MMK`} />
                <KPICard title="Internal Cost" value={`${totalInternalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} MMK`} />
                <KPICard title="Suggested Price" value={isFinite(suggestedPrice) ? `${suggestedPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })} MMK` : 'N/A'} />
                <KPICard title="Status" value={service.isActive ? 'Active' : 'Inactive'} />
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-semibold text-text-secondary dark:text-slate-300 mb-4 pb-2 border-b dark:border-slate-700">Service Details</h3>
                
                {service.description && <p className="text-text-primary dark:text-slate-200 mb-4 whitespace-pre-wrap">{service.description}</p>}
                
                {service.proposalUrl && (
                    <div className="mb-4">
                        <span className="font-semibold">Proposal Document:</span>
                        <a href={service.proposalUrl} target="_blank" rel="noopener noreferrer" className="text-primary-action hover:underline ml-2 break-all">{service.proposalUrl}</a>
                    </div>
                )}
                
                {service.packages && service.packages.length > 0 && (
                     <div className="mt-4">
                        <h4 className="font-semibold text-text-primary dark:text-slate-200 mb-2">Pricing Packages / Tiers</h4>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-700">
                                        <tr>
                                            <th className="p-2 text-left">Tier Name</th>
                                            <th className="p-2 text-right">Units/USD</th>
                                            <th className="p-2 text-right">Price (MMK)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {service.packages.map((pkg, i) => (
                                            <tr key={i} className="border-b dark:border-slate-700">
                                                <td className="p-2">{pkg.tierName}</td>
                                                <td className="p-2 text-right">{pkg.unitsOrUSD?.toLocaleString()}</td>
                                                <td className="p-2 text-right">{pkg.priceMMK?.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                        </div>
                    </div>
                )}

                 {service.costItems && service.costItems.length > 0 && (
                     <div className="mt-6 pt-4 border-t dark:border-slate-700">
                        <h4 className="font-semibold text-text-primary dark:text-slate-200 mb-2">Internal Cost Breakdown</h4>
                        <div className="overflow-x-auto">
                           <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700">
                                    <tr>
                                        <th className="p-2 text-left">Description</th>
                                        <th className="p-2 text-right">Type</th>
                                        <th className="p-2 text-right">Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {service.costItems.map(item => (
                                        <tr key={item.id} className="border-b dark:border-slate-700">
                                            <td className="p-2">{item.description}</td>
                                            <td className="p-2 text-right capitalize">{item.type}</td>
                                            <td className="p-2 text-right">{item.value.toLocaleString()}{item.type === 'percentage' ? '%' : ' MMK'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {service.termsAndConditions && (
                    <div className="mt-6 pt-4 border-t dark:border-slate-700">
                        <h4 className="font-semibold text-text-primary dark:text-slate-200 mb-2">Terms & Conditions</h4>
                        <pre className="text-sm text-text-secondary dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-700/50 p-4 rounded-md">{service.termsAndConditions}</pre>
                    </div>
                )}

                {typeof service.serviceRateMMK === 'number' && (
                    <div className="mt-6 pt-4 border-t dark:border-slate-700">
                        <h4 className="font-semibold text-text-primary dark:text-slate-200 mb-4">Campaign Objectives</h4>
                        <p className="text-sm text-text-secondary dark:text-slate-400 mb-4">
                            Manage campaign objectives that will be available in the Campaign Objective dropdown when creating Facebook Ads sales, invoices, and quotations.
                        </p>
                        {isLoadingObjectives ? (
                            <div className="flex justify-center py-8">
                                <Spinner />
                            </div>
                        ) : (
                            <ManageGenericList 
                                title="Campaign Objectives" 
                                items={campaignObjectives} 
                                fetchItems={fetchCampaignObjectives} 
                                addFunction={apiAddCampaignObjectiveSetting} 
                                updateFunction={apiUpdateCampaignObjectiveSetting} 
                                deleteFunction={apiDeleteCampaignObjectiveSetting} 
                                hasActiveToggle={true}
                            />
                        )}
                    </div>
                )}
            </div>

            {isEditModalOpen && canManage && (
                <AddEditServiceModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleModalSuccess}
                    service={service}
                    categories={categories}
                />
            )}
        </div>
    );
};

export default ServiceDetailPage;
