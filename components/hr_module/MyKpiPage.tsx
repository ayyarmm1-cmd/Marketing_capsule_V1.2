// components/hr_module/MyKpiPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { Employee, EmployeeKpiSheet, AssignedKPI, UserRole } from '../../types';
import { apiGetEmployeeById, apiGetEmployeeKpiSheet, apiCreateOrUpdateEmployeeKpiSheet, apiSendNotification, apiGetUsers } from '../../services/api';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

const getProgressBarColor = (percentage: number) => {
    if (percentage < 40) return 'bg-red-500';
    if (percentage < 75) return 'bg-yellow-500';
    return 'bg-green-500';
};

const MyKpiPage: React.FC = () => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [sheet, setSheet] = useState<EmployeeKpiSheet | null>(null);
    const [editedSheet, setEditedSheet] = useState<EmployeeKpiSheet | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [period, setPeriod] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM format
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [acknowledgementComment, setAcknowledgementComment] = useState('');

    useEffect(() => {
        setPeriod(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`);
    }, [selectedYear, selectedMonth]);

    const fetchKpiData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const empDetails = await apiGetEmployeeById(user.id);
            setEmployee(empDetails);
            if (empDetails) {
                const sheetId = `${empDetails.id}_${period}`;
                const fetchedSheet = await apiGetEmployeeKpiSheet(sheetId);
                setSheet(fetchedSheet);
                setEditedSheet(fetchedSheet ? JSON.parse(JSON.stringify(fetchedSheet)) : null);
            }
        } catch (error) {
            addNotification("Failed to load your KPI data.", "error");
        }
        setIsLoading(false);
    }, [user, period, addNotification]);

    useEffect(() => {
        fetchKpiData();
    }, [fetchKpiData]);

    const handleInputChange = (assignmentId: string, field: 'currentValue' | 'selfComments', value: string | number) => {
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
        if (!editedSheet) return;
        setIsSaving(true);
        try {
            const sheetToSave = { ...editedSheet };
            if (sheetToSave.status === 'Pending') {
                sheetToSave.status = 'In Progress';
            }
            await apiCreateOrUpdateEmployeeKpiSheet(sheetToSave);
            addNotification("Your progress has been saved.", "success");
            fetchKpiData();
        } catch (error) {
            addNotification(`Failed to save changes: ${(error as Error).message}`, "error");
        }
        setIsSaving(false);
    };
    
    const handleSubmitForReview = async () => {
        if (!editedSheet || !employee) return;
        setIsSaving(true);
        try {
            const sheetToSubmit = { ...editedSheet, status: 'Pending Manager Review' as const };
            await apiCreateOrUpdateEmployeeKpiSheet(sheetToSubmit);
            addNotification("Your self-evaluation has been submitted for review.", "success");
            
            if (sheetToSubmit.managerId) {
                apiSendNotification(sheetToSubmit.managerId, {
                    title: 'KPIs Ready for Review',
                    message: `${employee.name} has submitted their KPI self-evaluation for ${period}.`,
                    type: 'info',
                    link: '/hr/team-kpis'
                }).catch(err => console.error("Failed to send manager notification:", err));
            }
            
            fetchKpiData();
        } catch (error) {
            addNotification(`Failed to submit for review: ${(error as Error).message}`, "error");
        }
        setIsSaving(false);
    };

    const handleAcknowledge = async () => {
        if (!editedSheet || !user || !employee) return;
        setIsSaving(true);
        try {
            const acknowledgedSheet = {
                ...editedSheet,
                employeeAcknowledgedAt: new Date().toISOString(),
                employeeAcknowledgementComment: acknowledgementComment,
            };
            await apiCreateOrUpdateEmployeeKpiSheet(acknowledgedSheet);
            addNotification("Results acknowledged successfully.", "success");

            const allUsers = await apiGetUsers();
            const admins = allUsers.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.OWNER);
            for (const admin of admins) {
                apiSendNotification(admin.id, {
                    title: 'KPI Sheet Finalized',
                    message: `${employee.name}'s KPI sheet for ${period} has been acknowledged and is ready for final review.`,
                    type: 'info',
                    link: '/hr/team-kpis'
                }).catch(err => console.error(`Failed to send admin notification to ${admin.id}:`, err));
            }

            fetchKpiData();
        } catch (error) {
            addNotification("Failed to acknowledge results.", "error");
        }
        setIsSaving(false);
    };

    const isDirty = useMemo(() => {
        return JSON.stringify(sheet) !== JSON.stringify(editedSheet);
    }, [sheet, editedSheet]);

    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => ({ value: currentYear - i, label: (currentYear - i).toString() }));
    const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));


    return (
        <div className="p-6 bg-app-bg dark:bg-slate-900 space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary dark:text-slate-100">My Performance Review</h1>
                <div className="flex items-center gap-2">
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
                     {isDirty && (editedSheet?.status === 'Pending' || editedSheet?.status === 'In Progress') && (
                        <>
                            <Button onClick={handleSaveChanges} isLoading={isSaving} variant="secondary">
                                Save Progress
                            </Button>
                            <Button onClick={handleSubmitForReview} isLoading={isSaving}>
                                Save & Submit
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>
            ) : editedSheet ? (
                <div className="bg-container-bg dark:bg-slate-800 shadow-xl rounded-lg p-6 space-y-6 border border-slate-200 dark:border-slate-700">
                    {editedSheet.status === 'Completed' && (
                        <div className="text-center p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                            <p className="text-sm text-text-secondary dark:text-slate-400">Final Performance Score</p>
                            <p className="text-4xl font-bold text-primary-action">{editedSheet.finalScore?.toFixed(2) || 'Not Rated'} / 100</p>
                        </div>
                    )}
                    <div className="space-y-4">
                        {editedSheet.assignedKpis.map(kpi => {
                            const progressValue = Number(kpi.currentValue) || 0;
                            const targetValue = kpi.target;
                            let progressPercent = 0;
                            if(targetValue > 0) {
                                progressPercent = Math.min((progressValue / targetValue) * 100, 100);
                            }
                            if(kpi.measurementUnit === 'Rating (1-5)') {
                                progressPercent = Math.min((progressValue / 5) * 100, 100);
                            }
                            
                            return (
                            <div key={kpi.assignmentId} className="p-4 border dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50 transition-shadow hover:shadow-md">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-lg text-primary-action dark:text-blue-400">{kpi.name}</h3>
                                        <p className="text-xs text-text-secondary dark:text-slate-400">{kpi.description}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-4">
                                        <p className="text-sm font-semibold">Weight: <span className="font-bold text-lg">{kpi.weight}%</span></p>
                                        <p className="text-xs text-text-secondary dark:text-slate-400">Target: {kpi.target.toLocaleString()} {kpi.measurementUnit}</p>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="flex justify-between mb-1 text-xs font-medium text-text-secondary dark:text-slate-400">
                                        <span>Progress</span>
                                        <span>{progressPercent.toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                        <div className={`h-2.5 rounded-full ${getProgressBarColor(progressPercent)} transition-all duration-500`} style={{ width: `${progressPercent}%` }}></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <Input
                                        label="My Current Progress"
                                        type={kpi.measurementUnit === 'Rating (1-5)' || kpi.measurementUnit === '%' ? 'number' : 'text'}
                                        name="currentValue"
                                        value={String(kpi.currentValue || '')}
                                        onChange={(e) => handleInputChange(kpi.assignmentId, 'currentValue', e.target.value)}
                                        placeholder={`Enter progress in ${kpi.measurementUnit}`}
                                        disabled={editedSheet.status === 'Completed' || editedSheet.status === 'Pending Manager Review'}
                                    />
                                    <Input
                                        as="textarea"
                                        rows={2}
                                        label="My Comments/Evidence"
                                        name="selfComments"
                                        value={kpi.selfComments || ''}
                                        onChange={(e) => handleInputChange(kpi.assignmentId, 'selfComments', e.target.value)}
                                        placeholder="Add comments or links to evidence."
                                        disabled={editedSheet.status === 'Completed' || editedSheet.status === 'Pending Manager Review'}
                                    />
                                </div>
                                
                                <div className="mt-4 pt-4 border-t dark:border-slate-700">
                                    <h4 className="font-semibold text-sm text-text-secondary dark:text-slate-300 mb-2">Manager's Feedback</h4>
                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-md text-sm space-y-1">
                                        <p><strong>Rating:</strong> {kpi.managerRating ? `${kpi.managerRating}/5` : 'Not yet rated'}</p>
                                        <p><strong>Comments:</strong> {kpi.managerComments || 'No comments yet.'}</p>
                                    </div>
                                </div>
                            </div>
                        )})}
                    </div>
                    {sheet?.status === 'Completed' && (
                        <div className="mt-6 pt-6 border-t dark:border-slate-700">
                            <h2 className="text-xl font-semibold text-text-primary dark:text-slate-200 mb-3">Result Acknowledgement</h2>
                            {sheet.employeeAcknowledgedAt ? (
                                <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                                    <p className="font-semibold text-green-800 dark:text-green-200">You acknowledged these results on: {new Date(sheet.employeeAcknowledgedAt).toLocaleString()}</p>
                                    <p className="mt-2 text-sm text-green-700 dark:text-green-300"><strong>Your Comment:</strong> {sheet.employeeAcknowledgementComment || <i>No comment was provided.</i>}</p>
                                </div>
                            ) : (
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg space-y-3">
                                    <p className="font-semibold text-yellow-800 dark:text-yellow-200">Action Required: Please review your final results and acknowledge them.</p>
                                    <Input
                                        as="textarea"
                                        rows={3}
                                        label="Comments (Optional)"
                                        value={acknowledgementComment}
                                        onChange={(e) => setAcknowledgementComment(e.target.value)}
                                        placeholder="Add any comments regarding your evaluation results here."
                                    />
                                    <div className="text-right">
                                        <Button onClick={handleAcknowledge} isLoading={isSaving}>Acknowledge Results</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-16 bg-container-bg dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700">
                    <p className="text-text-secondary dark:text-slate-400">No KPI sheet has been assigned to you for {period}.</p>
                    <p className="text-sm text-text-secondary dark:text-slate-500 mt-2">Please contact your team leader if you believe this is an error.</p>
                </div>
            )}
        </div>
    );
};

export default MyKpiPage;
