
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Service, ServiceCategory, Permission } from '../../types';
import { apiGetServices, apiGetServiceCategories, apiDeleteService, apiAddServiceCategory, apiUpdateServiceCategory, apiDeleteServiceCategory } from '../../services/api';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import { useCollapsibleSidebar } from '../../hooks/useCollapsibleSidebar';
import AddEditServiceModal from './AddEditServiceModal';
import Input from '../ui/Input';

// Icons
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const FolderPlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>;

const ManageCategoriesModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  allCategories: ServiceCategory[];
}> = ({ isOpen, onClose, onSave, allCategories }) => {
    const [editingCategory, setEditingCategory] = useState<ServiceCategory | 'new' | null>(null);
    const [categoryName, setCategoryName] = useState('');
    const [subCategories, setSubCategories] = useState<{ id: string, name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();

    const handleStartAdding = () => {
        setCategoryName('');
        setSubCategories([{ id: 'new_0', name: '' }]);
        setEditingCategory('new');
    };

    const handleStartEditing = (category: ServiceCategory) => {
        setCategoryName(category.name);
        setSubCategories([...category.subCategories]);
        setEditingCategory(category);
    };
    
    const handleCancelEdit = () => {
        setEditingCategory(null);
    };
    
    const handleSubCategoryChange = (index: number, value: string) => {
        const newSubs = [...subCategories];
        newSubs[index].name = value;
        setSubCategories(newSubs);
    };

    const addSubCategoryField = () => setSubCategories([...subCategories, { id: `new_${Date.now()}`, name: '' }]);
    
    const removeSubCategoryField = (index: number) => {
        const newSubs = subCategories.filter((_, i) => i !== index);
        setSubCategories(newSubs);
    };
    
    const handleSaveCategory = async () => {
        if (!categoryName.trim()) {
            addNotification("Category Name is required.", "error");
            return;
        }
        setIsLoading(true);
        const finalSubCategories = subCategories
            .filter(s => s.name.trim() !== '')
            .map(s => ({ id: s.id, name: s.name.trim() }));
        
        try {
            if (editingCategory === 'new') {
                await apiAddServiceCategory({ name: categoryName, subCategories: finalSubCategories });
                addNotification("Category added successfully.", "success");
            } else if (editingCategory) {
                await apiUpdateServiceCategory({
                    id: editingCategory.id,
                    name: categoryName,
                    subCategories: finalSubCategories
                });
                addNotification("Category updated successfully.", "success");
            }
            onSave();
            setEditingCategory(null);
        } catch (error) {
            addNotification(`Error saving category: ${(error as Error).message}`, "error");
        }
        setIsLoading(false);
    };

    const handleDeleteCategory = async (category: ServiceCategory) => {
        const confirmed = await showConfirmation({
          title: 'Delete Category',
          message: `Are you sure you want to delete category "${category.name}"? This cannot be undone.`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          confirmVariant: 'danger',
        });
        if (confirmed) {
            setIsLoading(true);
            try {
                await apiDeleteServiceCategory(category.id);
                addNotification("Category deleted successfully.", "success");
                onSave();
            } catch(error){
                addNotification(`Error deleting category: ${(error as Error).message}`, "error");
            }
            setIsLoading(false);
        }
    };

    const renderListView = () => (
        <div>
            <div className="flex justify-end mb-4">
                <Button onClick={handleStartAdding} variant="primary" size="sm"><PlusIcon /> Add New Category</Button>
            </div>
            <ul className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                {allCategories.map(cat => (
                    <li key={cat.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-text-primary dark:text-slate-200">{cat.name}</span>
                            <div className="space-x-2">
                                <Button variant="ghost" size="sm" onClick={() => handleStartEditing(cat)}>Edit</Button>
                                <Button variant="danger" size="sm" onClick={() => handleDeleteCategory(cat)}><TrashIcon/></Button>
                            </div>
                        </div>
                        {cat.subCategories.length > 0 && (
                            <ul className="list-disc list-inside ml-4 mt-2 text-sm text-text-secondary dark:text-slate-400">
                                {cat.subCategories.map(sub => <li key={sub.id}>{sub.name}</li>)}
                            </ul>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
    
    const renderFormView = () => (
        <div className="space-y-4">
            <Input label="Category Name" value={categoryName} onChange={e => setCategoryName(e.target.value)} required />
            <div>
                <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">Sub-Categories</label>
                {subCategories.map((sub, index) => (
                    <div key={sub.id || index} className="flex items-center gap-2 mb-2">
                        <Input value={sub.name} onChange={e => handleSubCategoryChange(index, e.target.value)} placeholder={`Sub-Category ${index + 1}`} containerClassName="flex-grow mb-0"/>
                        <Button type="button" variant="danger" size="sm" onClick={() => removeSubCategoryField(index)} className="!p-2">X</Button>
                    </div>
                ))}
                <Button type="button" variant="ghost" size="sm" onClick={addSubCategoryField}>+ Add Sub-Category</Button>
            </div>
            <div className="flex justify-end space-x-2 pt-2 border-t dark:border-slate-600">
                <Button type="button" variant="secondary" onClick={handleCancelEdit} disabled={isLoading}>Cancel</Button>
                <Button type="button" onClick={handleSaveCategory} isLoading={isLoading}>Save Category</Button>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manage Service Categories" size="lg">
            {editingCategory ? renderFormView() : renderListView()}
        </Modal>
    );
};


const ServicesPage: React.FC = () => {
    const { hasPermission } = useAuth();
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useCollapsibleSidebar('servicesSidebarCollapsed');
    const [services, setServices] = useState<Service[]>([]);
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('all');

    const canManageServices = hasPermission(Permission.MANAGE_SERVICES);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedServices, fetchedCategories] = await Promise.all([
                apiGetServices(),
                apiGetServiceCategories()
            ]);
            setServices(fetchedServices);
            setCategories(fetchedCategories);
        } catch (error) {
            console.error("Failed to fetch services data:", error);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenServiceModal = (service: Service | null = null) => {
        setEditingService(service);
        setIsServiceModalOpen(true);
    };

    const handleServiceSaved = () => {
        setIsServiceModalOpen(false);
        setEditingService(null);
        fetchData();
    };

    const handleCategorySaved = () => {
        fetchData();
    };
    
    const handleDeleteService = async (serviceId: string, serviceName: string) => {
        const confirmed = await showConfirmation({
          title: 'Delete Service',
          message: `Are you sure you want to delete the service "${serviceName}"?`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          confirmVariant: 'danger',
        });
        if (confirmed) {
            try {
                await apiDeleteService(serviceId);
                addNotification("Service deleted successfully.", "success");
                fetchData();
            } catch (error) {
                addNotification(`Failed to delete service: ${(error as Error).message}`, "error");
            }
        }
    };

    const filteredServices = useMemo(() => {
        if (activeCategory === 'all') {
            return services;
        }
        return services.filter(s => s.category === activeCategory);
    }, [services, activeCategory]);

    const categoryTitle = useMemo(() => {
        if (activeCategory === 'all') return 'All Services';
        const category = categories.find(c => c.id === activeCategory);
        return category ? `${category.name}` : 'Services';
    }, [activeCategory, categories]);

    const renderServiceTable = () => (
        filteredServices.length > 0 ? (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Service Name</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Service ID</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Sub-Category</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Price/Rate (MMK)</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Total Cost (MMK)</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Status</th>
                            {canManageServices && <th className="px-4 py-2 text-center text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredServices.map(service => (
                            <tr key={service.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="px-4 py-3 text-sm font-medium text-primary-action dark:text-blue-400 hover:underline">
                                    <Link to={`/services/${service.id}`}>{service.name}</Link>
                                </td>
                                <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400">
                                    {service.id}
                                </td>
                                <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400">
                                  {
                                    categories.find(c => c.id === service.category)
                                      ?.subCategories.find(sc => sc.id === service.subCategory)?.name || 'N/A'
                                  }
                                </td>
                                <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400 text-right">
                                  {(service.unitPriceMMK != null && service.unitPriceMMK !== 0)
                                    ? service.unitPriceMMK.toLocaleString()
                                    : (service.serviceRateMMK != null && service.serviceRateMMK !== 0)
                                      ? service.serviceRateMMK.toLocaleString()
                                      : 'Package Based'}
                                </td>
                                <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400 text-right">
                                  {(service.costItems?.reduce((sum, item) => sum + (item.type === 'amount' ? item.value : 0), 0) || 0).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-sm text-center">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${service.isActive ? 'bg-status-success text-white' : 'bg-status-danger text-white'}`}>
                                        {service.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                {canManageServices && (
                                    <td className="px-4 py-3 text-sm text-center space-x-2">
                                        <Button variant="ghost" size="sm" onClick={() => handleOpenServiceModal(service)}>Edit</Button>
                                        <Button variant="danger" size="sm" onClick={() => handleDeleteService(service.id, service.name)}><TrashIcon /></Button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : <p className="text-sm text-text-secondary dark:text-slate-400 p-4 text-center">No services found for this category.</p>
    );

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
    }

    return (
        <div className="flex flex-col lg:flex-row gap-8 p-4 md:p-6">
            <aside className={`${isSidebarCollapsed ? 'lg:w-16' : 'lg:w-1/4 xl:w-1/5'} transition-all duration-300`}>
                <div className="flex justify-between items-center mb-6">
                    {!isSidebarCollapsed && <h2 className="text-xl font-semibold text-text-primary dark:text-slate-200">Service Menu</h2>}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="hidden lg:flex p-1 rounded-full text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700"
                        title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {isSidebarCollapsed ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15l-7.5-7.5 7.5-7.5" /></svg>
                        )}
                    </button>
                </div>
                <nav className="space-y-2">
                    <button
                        onClick={() => setActiveCategory('all')}
                        className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg ${isSidebarCollapsed ? '' : 'text-left'} font-medium transition-colors duration-150 group
                            ${activeCategory === 'all' 
                                ? 'bg-primary-action text-white shadow-md' 
                                : 'bg-white dark:bg-slate-800 text-text-secondary dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:text-primary-action'
                            }`}
                        title={isSidebarCollapsed ? 'All Services' : ''}
                    >
                        {isSidebarCollapsed ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                            </svg>
                        ) : (
                            'All Services'
                        )}
                    </button>
                    {categories.map(category => (
                         <button
                            key={category.id}
                            onClick={() => setActiveCategory(category.id)}
                            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg ${isSidebarCollapsed ? '' : 'text-left'} font-medium transition-colors duration-150 group
                                ${activeCategory === category.id 
                                    ? 'bg-primary-action text-white shadow-md' 
                                    : 'bg-white dark:bg-slate-800 text-text-secondary dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700 hover:text-primary-action'
                                }`}
                            title={isSidebarCollapsed ? category.name : ''}
                        >
                            {isSidebarCollapsed ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                                </svg>
                            ) : (
                                category.name
                            )}
                        </button>
                    ))}
                </nav>
                 {canManageServices && !isSidebarCollapsed && (
                    <div className="mt-6 pt-4 border-t dark:border-slate-700">
                        <Button onClick={() => setIsCategoryModalOpen(true)} variant="secondary" className="w-full">
                            <FolderPlusIcon /> Manage Categories
                        </Button>
                    </div>
                )}
            </aside>
            <main className="flex-1">
                <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">{categoryTitle}</h1>
                        {canManageServices && (
                            <Button onClick={() => handleOpenServiceModal(null)} variant="primary"><PlusIcon /> Add New Service</Button>
                        )}
                    </div>
                    {isLoading ? <Spinner /> : renderServiceTable()}
                </div>
            </main>
            
            {isServiceModalOpen && canManageServices && (
                <AddEditServiceModal
                    isOpen={isServiceModalOpen}
                    onClose={() => setIsServiceModalOpen(false)}
                    onSave={handleServiceSaved}
                    service={editingService}
                    categories={categories}
                />
            )}
            {isCategoryModalOpen && canManageServices && (
                <ManageCategoriesModal
                    isOpen={isCategoryModalOpen}
                    onClose={() => setIsCategoryModalOpen(false)}
                    onSave={handleCategorySaved}
                    allCategories={categories}
                />
            )}
        </div>
    );
};

export default ServicesPage;
