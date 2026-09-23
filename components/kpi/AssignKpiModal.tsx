import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNotification } from '../../hooks/useNotification';
import { useAuth } from '../../hooks/useAuth';
import { KPI, AssignedKPI, EmployeeKpiSheet, KpiCategory } from '../../types';
import { apiGetKpis, apiCreateOrUpdateEmployeeKpiSheet, apiSendNotification, apiGetKpiCategories } from '../../services/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import Input from '../ui/Input';
import Select from '../ui/Select';

interface KpiDetail {
    target: number | '';
    weight: number | '';
}

interface AssignKpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeId: string;
  period: string;
  existingSheet: EmployeeKpiSheet | null;
}

export const AssignKpiModal: React.FC<AssignKpiModalProps> = ({ isOpen, onClose, onSuccess, employeeId, period, existingSheet }) => {
    const { addNotification } = useNotification();
    const { user } = useAuth();
    const [allKpis, setAllKpis] = useState<KPI[]>([]);
    const [categories, setCategories] = useState<KpiCategory[]>([]);
    const [selectedKpiIds, setSelectedKpiIds] = useState<Set<string>>(new Set());
    const [kpiDetails, setKpiDetails] = useState<Map<string, KpiDetail>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [filterCategoryId, setFilterCategoryId] = useState('all');

    useEffect(() => {
        const fetchData = async () => {
            if (isOpen) {
                setIsLoading(true);
                try {
                    const [kpisFromApi, categoriesFromApi] = await Promise.all([
                        apiGetKpis(),
                        apiGetKpiCategories()
                    ]);
                    setAllKpis(kpisFromApi.filter(kpi => kpi.isActive));
                    setCategories(categoriesFromApi.filter(cat => cat.isActive));

                    if (existingSheet) {
                        const initialSelectedIds = new Set<string>();
                        const initialDetails = new Map<string, KpiDetail>();
                        existingSheet.assignedKpis.forEach(ak => {
                            initialSelectedIds.add(ak.kpiId);
                            initialDetails.set(ak.kpiId, { target: ak.target, weight: ak.weight });
                        });
                        setSelectedKpiIds(initialSelectedIds);
                        setKpiDetails(initialDetails);
                    } else {
                        setSelectedKpiIds(new Set());
                        setKpiDetails(new Map());
                    }
                } catch (error) {
                    addNotification("Failed to load KPIs and Categories.", "error");
                }
                setIsLoading(false);
            }
        };
        fetchData();
    }, [isOpen, existingSheet, addNotification]);
    
    const filteredKpis = useMemo(() => {
        if (filterCategoryId === 'all') return allKpis;
        return allKpis.filter(kpi => kpi.categoryId === filterCategoryId);
    }, [allKpis, filterCategoryId]);

    const totalWeight = useMemo(() => {
        let total = 0;
        selectedKpiIds.forEach(id => {
            total += Number(kpiDetails.get(id)?.weight || 0);
        });
        return total;
    }, [selectedKpiIds, kpiDetails]);

    const handleSelectKpi = (kpiId: string) => {
        setSelectedKpiIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(kpiId)) {
                newSet.delete(kpiId);
                setKpiDetails(prevDetails => {
                    const newDetails = new Map(prevDetails);
                    newDetails.delete(kpiId);
                    return newDetails;
                });
            } else {
                newSet.add(kpiId);
                setKpiDetails(prevDetails => {
                    const newDetails = new Map(prevDetails);
                    if (!newDetails.has(kpiId)) {
                        newDetails.set(kpiId, { target: '', weight: '' });
                    }
                    return newDetails;
                });
            }
            return newSet;
        });
    };

    const handleDetailChange = (kpiId: string, field: keyof KpiDetail, value: string) => {
        setKpiDetails(prev => {
            const newDetails = new Map(prev);
            const currentDetail = newDetails.get(kpiId) || { target: '', weight: '' };
            newDetails.set(kpiId, { ...currentDetail, [field]: value === '' ? '' : Number(value) });
            return newDetails;
        });
    };

    const handleSave = async () => {
        if (!user) {
            addNotification("You must be logged in.", "error");
            return;
        }
        if (totalWeight !== 100) {
            addNotification("Total weight of all KPIs must be exactly 100%.", "error");
            return;
        }

        const assignedKpis: AssignedKPI[] = Array.from(selectedKpiIds).map(kpiId => {
            const kpi = allKpis.find(k => k.id === kpiId)!;
            const details = kpiDetails.get(kpiId)!;
            const existingAssignment = existingSheet?.assignedKpis.find(ak => ak.kpiId === kpiId);
            return {
                assignmentId: existingAssignment?.assignmentId || `${kpiId}_${Date.now()}`,
                kpiId,
                name: kpi.name,
                description: kpi.description,
                measurementUnit: kpi.measurementUnit,
                evaluationType: kpi.evaluationType,
                target: Number(details.target),
                weight: Number(details.weight),
                currentValue: existingAssignment?.currentValue,
                selfComments: existingAssignment?.selfComments,
                managerComments: existingAssignment?.managerComments,
                managerRating: existingAssignment?.managerRating,
                selfRating: existingAssignment?.selfRating,
            };
        });

        setIsSaving(true);
        try {
            const newSheet: EmployeeKpiSheet = {
                id: existingSheet?.id || `${employeeId}_${period}`,
                employeeId,
                managerId: user.id,
                period,
                assignedKpis,
                status: existingSheet?.status || 'Pending',
                selfRatingWeight: existingSheet?.selfRatingWeight || 30,
                managerRatingWeight: existingSheet?.managerRatingWeight || 70,
            };
            await apiCreateOrUpdateEmployeeKpiSheet(newSheet);
            addNotification("KPI sheet saved successfully.", "success");
            
            apiSendNotification(employeeId, {
                title: 'Your KPIs have been set!',
                message: `Your Key Performance Indicators for ${period} have been assigned. You can start tracking your progress.`,
                type: 'info',
                link: '/my/kpi'
            });

            onSuccess();
        } catch (error) {
            addNotification(`Failed to save KPI sheet: ${(error as Error).message}`, "error");
        }
        setIsSaving(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Assign KPIs for ${period}`} size="2xl">
            <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <Select
                        label="Filter by Category"
                        value={filterCategoryId}
                        onChange={e => setFilterCategoryId(e.target.value)}
                        options={[{ value: 'all', label: 'All Categories' }, ...categories.map(c => ({ value: c.id, label: c.name }))]}
                        containerClassName="mb-0 flex-grow"
                    />
                    <div className="text-right ml-4">
                        <p className="text-sm font-medium text-text-secondary dark:text-slate-400">Total Weight</p>
                        <p className={`text-lg font-bold ${totalWeight === 100 ? 'text-green-500' : 'text-red-500'}`}>{totalWeight}%</p>
                    </div>
                </div>

                <div className="max-h-[50vh] overflow-y-auto space-y-3 custom-scrollbar pr-2">
                    {isLoading ? <Spinner /> : filteredKpis.map(kpi => {
                        const isSelected = selectedKpiIds.has(kpi.id);
                        return (
                            <div key={kpi.id} className={`p-3 border rounded-lg transition-all ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700' : 'bg-white dark:bg-slate-800'}`}>
                                <label className="flex items-start cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleSelectKpi(kpi.id)}
                                        className="h-5 w-5 mt-1 text-primary-action rounded"
                                    />
                                    <div className="ml-3 flex-grow">
                                        <p className="font-semibold text-text-primary dark:text-slate-200">{kpi.name}</p>
                                        <p className="text-xs text-text-secondary dark:text-slate-400">{kpi.description}</p>
                                    </div>
                                </label>
                                {isSelected && (
                                    <div className="mt-3 pt-3 border-t dark:border-slate-700 grid grid-cols-2 gap-4">
                                        <Input
                                            label="Target"
                                            type="number"
                                            value={String(kpiDetails.get(kpi.id)?.target || '')}
                                            onChange={e => handleDetailChange(kpi.id, 'target', e.target.value)}
                                            placeholder={`e.g., 100 (${kpi.measurementUnit})`}
                                            containerClassName="mb-0"
                                        />
                                        <Input
                                            label="Weight (%)"
                                            type="number"
                                            value={String(kpiDetails.get(kpi.id)?.weight || '')}
                                            onChange={e => handleDetailChange(kpi.id, 'weight', e.target.value)}
                                            placeholder="e.g., 20"
                                            containerClassName="mb-0"
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t dark:border-slate-700">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} isLoading={isSaving} disabled={totalWeight !== 100}>Save Assignments</Button>
                </div>
            </div>
        </Modal>
    );
};
