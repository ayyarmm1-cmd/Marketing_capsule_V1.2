// components/hr_module/TeamKpiPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { Employee, EmployeeKpiSheet, AssignedKPI, UserRole } from '../../types';
import { apiGetEmployees, apiGetEmployeeKpiSheet, apiCreateOrUpdateEmployeeKpiSheet, apiSendNotification } from '../../services/api';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import SearchableSelect from '../ui/SearchableSelect';

const calculateFinalScore = (kpis: AssignedKPI[]): number => {
    if (!kpis || kpis.length === 0) return 0;

    const totalScore = kpis.reduce((acc, kpi) => {
        const rating = Number(kpi.managerRating) || 0;
        const weight = Number(kpi.weight) || 0;
        if (rating > 0 && weight > 0) {
            // Score for this KPI is (rating / 5) * weight
            return acc + (rating / 5) * weight;
        }
        return acc;
    }, 0);

    return totalScore;
};


const TeamKpiPage: React.FC = () => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const [teamMembers, setTeamMembers] = useState<Employee[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [sheet, setSheet] = useState<EmployeeKpiSheet | null>(null);
    const [editedSheet, setEditedSheet] = useState<EmployeeKpiSheet | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [period, setPeriod] = useState<string>(new Date().toISOString().slice(0, 7));
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

    useEffect(() => {
        setPeriod(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`);
    }, [selectedYear, selectedMonth]);

    useEffect(() => {
        const fetchTeam = async () => {
            if (!user) return;
            const allEmployees = await apiGetEmployees();
            
            if (user.role === UserRole.ADMIN || user.role === UserRole.OWNER) {
                setTeamMembers(allEmployees.filter(emp => emp.id !== user.id));
            } else {
                const myDepartment = (user as Employee).departmentId;
                if (myDepartment) {
                    setTeamMembers(allEmployees.filter(emp => emp.departmentId === myDepartment && emp.id !== user.id));
                } else {
                    setTeamMembers([]);
                }
            }
        };
        fetchTeam();
    }, [user]);

    const fetchKpiSheet = useCallback(async () => {
        if (!selectedEmployeeId || !period) {
            setSheet(null);
            setEditedSheet(null);
            return;
        }
        setIsLoading(true);
        try {
            const sheetId = `${selectedEmployeeId}_${period}`;
            const fetchedSheet = await apiGetEmployeeKpiSheet(sheetId);
            setSheet(fetchedSheet);
            setEditedSheet(fetchedSheet ? JSON.parse(JSON.stringify(fetchedSheet)) : null);
        } catch (error) {
            addNotification("Failed to load employee's KPI sheet.", "error");
            setSheet(null);
            setEditedSheet(null);
        }
        setIsLoading(false);
    }, [selectedEmployeeId, period, addNotification]);

    useEffect(() => {
        fetchKpiSheet();
    }, [fetchKpiSheet]);

    const handleInputChange = (assignmentId: string, field: 'managerRating' | 'managerComments', value: string | number) => {
        if (!editedSheet) return;
        
        const updatedKpis = editedSheet.assignedKpis.map(kpi => {
            if (kpi.assignmentId === assignmentId) {
                return { ...kpi, [field]: value };
            }
            return kpi;
        });

        setEditedSheet({ ...editedSheet, assignedKpis: updatedKpis });
    };

    const handleSaveChanges = async () => {
        if (!editedSheet || !user || !selectedEmployeeId) return;
        setIsSaving(true);

        const finalScore = calculateFinalScore(editedSheet.assignedKpis);
        const sheetWithScore = { 
            ...editedSheet, 
            finalScore,
            lastEvaluatedBy: user.id,
            lastEvaluatedAt: new Date().toISOString(),
            status: 'Completed' as 'Completed',
        };

        try {
            await apiCreateOrUpdateEmployeeKpiSheet(sheetWithScore);
            addNotification("Ratings have been saved and finalized.", "success");

            apiSendNotification(selectedEmployeeId, {
                title: 'KPI Evaluation Completed',
                message: `Your manager has completed your KPI evaluation for ${period}. Please review and acknowledge the results.`,
                type: 'info',
                link: '/my/kpi'
            }).catch(err => console.error("Failed to send completion notification:", err));

            fetchKpiSheet();
        } catch (error) {
            addNotification(`Failed to save ratings: ${(error as Error).message}`, "error");
        }
        setIsSaving(false);
    };

    const isDirty = useMemo(() => {
        return JSON.stringify(sheet) !== JSON.stringify(editedSheet);
    }, [sheet, editedSheet]);

    const finalScore = useMemo(() => {
        if (!editedSheet?.assignedKpis) return 0;
        return calculateFinalScore(editedSheet.assignedKpis);
    }, [editedSheet]);
    
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => ({ value: currentYear - i, label: (currentYear - i).toString() }));
    const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));

    return (
        <div className="p-6 bg-app-bg dark:bg-slate-900 space-y-6">
            <h1 className="text-3xl font-bold text-text-primary dark:text-slate-100">Team Performance Review</h1>

            <div className="flex flex-wrap gap-4 p-4 bg-container-bg dark:bg-slate-800 rounded-lg shadow-md items-end border border-slate-200 dark:border-slate-700">
                <SearchableSelect
                    label="Select Team Member"
                    options={teamMembers.map(tm => ({ value: tm.id, label: `${tm.name} (${tm.employeeId})` }))}
                    value={selectedEmployeeId}
                    onChange={(val) => setSelectedEmployeeId(String(val))}
                    containerClassName="mb-0 flex-grow"
                    placeholder="-- Choose an employee --"
                />
                <div className="flex items-end gap-2">
                    <Select
                        label="Year"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        options={yearOptions}
                        containerClassName="mb-0"
                    />
                    <Select
                        label="Month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        options={monthOptions}
                        containerClassName="mb-0"
                    />
                </div>
            </div>

            {isLoading && selectedEmployeeId ? (
                <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>
            ) : editedSheet ? (
                 <div className="bg-container-bg dark:bg-slate-800 shadow-xl rounded-lg p-6 space-y-6 border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                        <div>
                            <p className="text-sm text-text-secondary dark:text-slate-400">Final Performance Score</p>
                            <p className="text-4xl font-bold text-primary-action">{finalScore.toFixed(2)} / 100</p>
                        </div>
                        {isDirty && editedSheet?.status === 'Pending Manager Review' && (
                            <Button onClick={handleSaveChanges} isLoading={isSaving}>Save & Finalize Ratings</Button>
                        )}
                    </div>
                    
                    <div className="space-y-4">
                        {editedSheet.assignedKpis.map(kpi => (
                            <div key={kpi.assignmentId} className="p-4 border dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-lg text-primary-action dark:text-blue-400">{kpi.name}</h3>
                                        <p className="text-xs text-text-secondary dark:text-slate-400">Target: {kpi.target.toLocaleString()} {kpi.measurementUnit}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-4">
                                        <p className="text-sm font-semibold">Weight: <span className="font-bold text-lg">{kpi.weight}%</span></p>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t dark:border-slate-700">
                                    <div>
                                        <h4 className="font-semibold text-sm text-text-secondary dark:text-slate-300 mb-2">Employee's Self-Evaluation</h4>
                                        <div className="p-3 bg-white dark:bg-slate-800 rounded-md text-sm space-y-2 min-h-[120px]">
                                            <p><strong>Progress Claimed:</strong> {kpi.currentValue || 'Not submitted'}</p>
                                            <p><strong>Comments:</strong> {kpi.selfComments || 'No comments.'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm text-text-secondary dark:text-slate-300 mb-2">Your Evaluation</h4>
                                        <div className="space-y-3">
                                            <Select
                                                label="Rating (1-5)*"
                                                value={String(kpi.managerRating || '')}
                                                onChange={(e) => handleInputChange(kpi.assignmentId, 'managerRating', Number(e.target.value))}
                                                options={[
                                                    { value: '', label: 'Select rating' }, { value: 1, label: '1 - Poor' },
                                                    { value: 2, label: '2 - Needs Improvement' }, { value: 3, label: '3 - Meets Expectations' },
                                                    { value: 4, label: '4 - Exceeds Expectations' }, { value: 5, label: '5 - Outstanding' },
                                                ]}
                                                disabled={sheet?.status === 'Completed'}
                                            />
                                            <Input
                                                as="textarea"
                                                rows={2}
                                                label="Evaluator Comments"
                                                value={kpi.managerComments || ''}
                                                onChange={(e) => handleInputChange(kpi.assignmentId, 'managerComments', e.target.value)}
                                                disabled={sheet?.status === 'Completed'}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : selectedEmployeeId ? (
                <div className="text-center py-16 bg-container-bg dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700">
                    <p className="text-text-secondary dark:text-slate-400">No KPI sheet found for this employee for {period}.</p>
                    <p className="text-sm text-text-secondary dark:text-slate-500 mt-2">You can assign one from the employee's detail page under HR &gt; Staff Management.</p>
                </div>
            ) : (
                 <div className="text-center py-16 bg-container-bg dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700">
                    <p className="text-text-secondary dark:text-slate-400">Please select a team member and a period to view their KPI sheet.</p>
                </div>
            )}
        </div>
    );
};

export default TeamKpiPage;
