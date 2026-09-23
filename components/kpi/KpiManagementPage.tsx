

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import { useCollapsibleSidebar } from '../../hooks/useCollapsibleSidebar';
import { KPI, User, KpiCategory, KPIEvaluationType } from '../../types';
import { 
    apiGetKpis, 
    apiAddKpi, 
    apiUpdateKpi, 
    apiGetUsers,
    apiGetKpiCategories,
    apiAddKpiCategory,
    apiUpdateKpiCategory,
    apiDeleteKpiCategory
} from '../../services/api';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import SearchableSelect from '../ui/SearchableSelect';

const FolderPlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>;


const AddEditKpiModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Omit<KPI, 'id' | 'createdByUserId' | 'createdAt'>> & { id?: string }) => Promise<void>;
    kpi: KPI | null;
    users: User[];
    categories: KpiCategory[];
}> = ({ isOpen, onClose, onSave, kpi, users, categories }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [measurementUnit, setMeasurementUnit] = useState<KPI['measurementUnit']>('Count');
    const [kpiType, setKpiType] = useState<'Department' | 'Personal'>('Personal');
    const [evaluationType, setEvaluationType] = useState<KPIEvaluationType>('Self & Manager');
    const [categoryId, setCategoryId] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [ownerId, setOwnerId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (kpi) {
            setName(kpi.name);
            setDescription(kpi.description);
            setMeasurementUnit(kpi.measurementUnit);
            setKpiType(kpi.kpiType || 'Personal');
            setEvaluationType(kpi.evaluationType || 'Self & Manager');
            setCategoryId(kpi.categoryId || '');
            setIsActive(kpi.isActive);
            setOwnerId(kpi.ownerId || '');
        } else {
            setName('');
            setDescription('');
            setMeasurementUnit('Count');
            setKpiType('Personal');
            setEvaluationType('Self & Manager');
            setCategoryId('');
            setIsActive(true);
            setOwnerId('');
        }
    }, [kpi]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !description.trim()) {
            alert("Name and Description are required.");
            return;
        }
        setIsLoading(true);
        const saveData: Partial<Omit<KPI, 'id' | 'createdByUserId' | 'createdAt'>> & { id?: string } = {
            name,
            description,
            measurementUnit,
            kpiType,
            evaluationType,
            categoryId: categoryId || null,
            isActive,
            ownerId: ownerId || null,
        };
        if (kpi?.id) {
            saveData.id = kpi.id;
        }
        await onSave(saveData);
        setIsLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={kpi ? "Edit KPI" : "Add New KPI"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="KPI Name*" value={name} onChange={e => setName(e.target.value)} required />
                <Input as="textarea" rows={3} label="Description*" value={description} onChange={e => setDescription(e.target.value)} required />
                 <Select
                    label="Evaluation Type*"
                    value={evaluationType}
                    onChange={e => setEvaluationType(e.target.value as KPIEvaluationType)}
                    options={[
                        { value: 'Self & Manager', label: 'Self & Manager Evaluation' },
                        { value: 'Manager Only', label: 'Manager Only Evaluation' },
                    ]}
                    required
                />
                <Select
                    label="KPI Type*"
                    value={kpiType}
                    onChange={e => setKpiType(e.target.value as 'Department' | 'Personal')}
                    options={[
                        { value: 'Personal', label: 'Personal (Individual Goal)' },
                        { value: 'Department', label: 'Department (Shared Goal)' },
                    ]}
                    required
                />
                <Select
                    label="Measurement Unit*"
                    value={measurementUnit}
                    onChange={e => setMeasurementUnit(e.target.value as KPI['measurementUnit'])}
                    options={[
                        { value: 'Count', label: 'Count (e.g., number of sales)' },
                        { value: 'MMK', label: 'Currency (MMK)' },
                        { value: 'USD', label: 'Currency (USD)' },
                        { value: '%', label: 'Percentage (%)' },
                        { value: 'Rating (1-5)', label: 'Rating (1-5)' },
                    ]}
                    required
                />
                <Select
                    label="Category"
                    name="categoryId"
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    options={categories.map(c => ({ value: c.id, label: c.name }))}
                    placeholder="-- Select Category --"
                />
                 <SearchableSelect
                    label="KPI Owner (Optional)"
                    options={[{ value: '', label: 'No Specific Owner' }, ...users.map(u => ({ value: u.id, label: u.name }))]}
                    value={ownerId}
                    onChange={value => setOwnerId(String(value))}
                    placeholder="-- Select an owner --"
                />
                <div className="flex items-center">
                    <input type="checkbox" id="kpi-isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4" />
                    <label htmlFor="kpi-isActive" className="ml-2 text-sm">KPI is Active</label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button type="submit" isLoading={isLoading}>Save KPI</Button>
                </div>
            </form>
        </Modal>
    );
};


const ManageCategoriesModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    allCategories: KpiCategory[];
}> = ({ isOpen, onClose, onSave, allCategories }) => {
    const [editingCategory, setEditingCategory] = useState<KpiCategory | 'new' | null>(null);
    const [categoryName, setCategoryName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();

    const handleStartAdding = () => {
        setCategoryName('');
        setEditingCategory('new');
    };

    const handleStartEditing = (category: KpiCategory) => {
        setCategoryName(category.name);
        setEditingCategory(category);
    };

    const handleCancelEdit = () => setEditingCategory(null);

    const handleSaveCategory = async () => {
        if (!categoryName.trim()) {
            addNotification("Category Name is required.", "error");
            return;
        }
        setIsLoading(true);
        try {
            if (editingCategory === 'new') {
                await apiAddKpiCategory({ name: categoryName, isActive: true });
                addNotification("Category added successfully.", "success");
            } else if (editingCategory) {
                await apiUpdateKpiCategory(editingCategory.id, { name: categoryName });
                addNotification("Category updated successfully.", "success");
            }
            onSave();
            setEditingCategory(null);
        } catch (error) {
            addNotification(`Error saving category: ${(error as Error).message}`, "error");
        }
        setIsLoading(false);
    };

    const handleDeleteCategory = async (category: KpiCategory) => {
        const confirmed = await showConfirmation({
          title: 'Delete Category',
          message: `Are you sure you want to delete category "${category.name}"? KPIs in this category will become uncategorized.`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          confirmVariant: 'danger',
        });
        if (confirmed) {
            setIsLoading(true);
            try {
                await apiDeleteKpiCategory(category.id);
                addNotification("Category deleted.", "success");
                onSave();
            } catch (error) {
                addNotification(`Error deleting category: ${(error as Error).message}`, "error");
            }
            setIsLoading(false);
        }
    };
    
     const handleToggleActive = async (category: KpiCategory) => {
        setIsLoading(true);
        try {
            await apiUpdateKpiCategory(category.id, { isActive: !category.isActive });
            addNotification(`Status for "${category.name}" updated.`, "success");
            onSave();
        } catch (error) {
            addNotification(`Failed to update status.`, "error");
        }
        setIsLoading(false);
    };

    const renderListView = () => (
        <div>
            <div className="flex justify-end mb-4">
                <Button onClick={handleStartAdding} variant="primary" size="sm"><PlusIcon /> Add Category</Button>
            </div>
            <ul className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                {allCategories.map(cat => (
                    <li key={cat.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md flex justify-between items-center">
                        <span className="font-semibold text-text-primary dark:text-slate-200">{cat.name}</span>
                        <div className="space-x-2">
                             <Button variant={cat.isActive ? 'success' : 'secondary'} size="sm" onClick={() => handleToggleActive(cat)} className="!px-2 !py-1 text-xs">{cat.isActive ? 'Active' : 'Inactive'}</Button>
                            <Button variant="ghost" size="sm" onClick={() => handleStartEditing(cat)}>Edit</Button>
                            <Button variant="danger" size="sm" onClick={() => handleDeleteCategory(cat)}><TrashIcon/></Button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );

    const renderFormView = () => (
        <div className="space-y-4">
            <Input label="Category Name" value={categoryName} onChange={e => setCategoryName(e.target.value)} required />
            <div className="flex justify-end space-x-2 pt-2 border-t dark:border-slate-600">
                <Button type="button" variant="secondary" onClick={handleCancelEdit} disabled={isLoading}>Cancel</Button>
                <Button type="button" onClick={handleSaveCategory} isLoading={isLoading}>Save Category</Button>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manage KPI Categories" size="lg">
            {editingCategory ? renderFormView() : renderListView()}
        </Modal>
    );
};


const KpiManagementPage: React.FC = () => {
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useCollapsibleSidebar('kpiManagementSidebarCollapsed');
    const [kpis, setKpis] = useState<KPI[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [categories, setCategories] = useState<KpiCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingKpi, setEditingKpi] = useState<KPI | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);


    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [kpisData, usersData, categoriesData] = await Promise.all([apiGetKpis(), apiGetUsers(), apiGetKpiCategories()]);
            setKpis(kpisData);
            setUsers(usersData);
            setCategories(categoriesData);
        } catch (error) {
            addNotification("Failed to fetch KPI library data.", "error");
        }
        setIsLoading(false);
    }, [addNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async (data: Partial<Omit<KPI, 'id' | 'createdByUserId' | 'createdAt'>> & { id?: string }) => {
        try {
            if (data.id) {
                await apiUpdateKpi(data.id, data);
                addNotification("KPI updated successfully.", "success");
            } else {
                await apiAddKpi(data as Omit<KPI, 'id' | 'createdByUserId' | 'createdAt'>);
                addNotification("New KPI added to the library.", "success");
            }
            fetchData();
            setIsModalOpen(false);
        } catch (error) {
            addNotification(`Failed to save KPI: ${(error as Error).message}`, "error");
        }
    };

    const handleToggleActive = async (kpi: KPI) => {
        try {
            await apiUpdateKpi(kpi.id, { isActive: !kpi.isActive });
            addNotification(`KPI '${kpi.name}' status changed.`, "success");
            fetchData();
        } catch (error) {
            addNotification("Failed to update KPI status.", "error");
        }
    };
    
    const filteredKpis = useMemo(() => {
        if (activeCategory === 'all') {
            return kpis;
        }
        return kpis.filter(kpi => kpi.categoryId === activeCategory);
    }, [kpis, activeCategory]);

    const categoryTitle = useMemo(() => {
        if (activeCategory === 'all') return 'All KPIs';
        return categories.find(c => c.id === activeCategory)?.name || 'KPIs';
    }, [activeCategory, categories]);
    
    if (isLoading && kpis.length === 0) {
        return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
    }

    return (
         <div className="flex flex-col lg:flex-row gap-8 p-4 md:p-6">
            <aside className={`${isSidebarCollapsed ? 'lg:w-16' : 'lg:w-1/4 xl:w-1/5'} transition-all duration-300`}>
                <div className="flex justify-between items-center mb-6">
                    {!isSidebarCollapsed && <h2 className="text-xl font-semibold text-text-primary dark:text-slate-200">KPI Categories</h2>}
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
                        title={isSidebarCollapsed ? 'All KPIs' : ''}
                    >
                        {isSidebarCollapsed ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                            </svg>
                        ) : (
                            'All KPIs'
                        )}
                    </button>
                    {categories.filter(c=>c.isActive).map(category => (
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
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                                </svg>
                            ) : (
                                category.name
                            )}
                        </button>
                    ))}
                </nav>
                {!isSidebarCollapsed && (
                <div className="mt-6 pt-4 border-t dark:border-slate-700">
                    <Button onClick={() => setIsCategoryModalOpen(true)} variant="secondary" className="w-full">
                        <FolderPlusIcon /> Manage Categories
                    </Button>
                </div>
                )}
            </aside>
            <main className="flex-1">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">{categoryTitle}</h1>
                        <Button onClick={() => { setEditingKpi(null); setIsModalOpen(true); }} variant="primary"><PlusIcon /> Add New KPI</Button>
                    </div>
                    {isLoading ? <Spinner /> : (
                         filteredKpis.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase">Name</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase">Description</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase">Type</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase">Evaluation Type</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase">Owner</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium uppercase">Status</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {filteredKpis.map(kpi => (
                                            <tr key={kpi.id}>
                                                <td className="px-4 py-3 text-sm font-medium">{kpi.name}</td>
                                                <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400 max-w-md truncate" title={kpi.description}>{kpi.description}</td>
                                                <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400">{kpi.kpiType || 'Personal'}</td>
                                                <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400">{kpi.evaluationType || 'Self & Manager'}</td>
                                                <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400">{users.find(u => u.id === kpi.ownerId)?.name || 'N/A'}</td>
                                                <td className="px-4 py-3 text-center text-sm">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${kpi.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {kpi.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center space-x-2">
                                                    <Button size="sm" variant="ghost" onClick={() => { setEditingKpi(kpi); setIsModalOpen(true); }}>Edit</Button>
                                                    <Button size="sm" variant="secondary" onClick={() => handleToggleActive(kpi)}>
                                                        {kpi.isActive ? 'Deactivate' : 'Activate'}
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                         ) : <p className="text-sm text-text-secondary dark:text-slate-400 p-4 text-center">No KPIs found for this category.</p>
                    )}
                </div>
            </main>
            
            <AddEditKpiModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                kpi={editingKpi}
                users={users}
                categories={categories.filter(c => c.isActive)}
            />
             <ManageCategoriesModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                onSave={fetchData}
                allCategories={categories}
            />
        </div>
    );
};

export default KpiManagementPage;