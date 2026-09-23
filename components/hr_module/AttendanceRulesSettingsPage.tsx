import React, { useState, useEffect } from 'react';
import { AttendanceRulesSettings, Permission } from '../../types';
import { apiGetAttendanceRulesSettings, apiUpdateAttendanceRulesSettings } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

const AttendanceRulesSettingsPage: React.FC = () => {
    const { hasPermission } = useAuth();
    const { addNotification } = useNotification();
    const [settings, setSettings] = useState<AttendanceRulesSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const fetchedSettings = await apiGetAttendanceRulesSettings();
                setSettings(fetchedSettings);
            } catch (error) {
                console.error('Failed to load attendance rules settings', error);
                addNotification('Unable to load attendance rules settings.', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [addNotification]);

    const handleSave = async () => {
        if (!settings) return;

        setIsSaving(true);
        try {
            await apiUpdateAttendanceRulesSettings(settings);
            addNotification('Attendance rules settings saved successfully.', 'success');
        } catch (error) {
            console.error('Failed to save attendance rules settings', error);
            addNotification('Failed to save attendance rules settings.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (field: keyof AttendanceRulesSettings, value: string | number | boolean) => {
        if (!settings) return;
        setSettings({ ...settings, [field]: value });
    };

    if (!hasPermission(Permission.MANAGE_ATTENDANCE)) {
        return (
            <div className="text-center py-16">
                <h2 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Permission Required</h2>
                <p className="text-text-secondary dark:text-slate-400 mt-2">
                    You need the "Manage Attendance" permission to configure attendance rules.
                </p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="py-20 flex justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="text-center py-16">
                <h2 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Error</h2>
                <p className="text-text-secondary dark:text-slate-400 mt-2">
                    Failed to load attendance rules settings.
                </p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-text-primary">Attendance Rules Settings</h1>
                <Button onClick={handleSave} variant="primary" isLoading={isSaving} disabled={isSaving}>
                    Save Settings
                </Button>
            </div>

            <div className="bg-container-bg dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
                {/* Office Hours Section */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-text-primary border-b border-slate-200 dark:border-slate-700 pb-2">
                        Office Hours
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            type="time"
                            label="Default Start Time"
                            value={settings.defaultStartTime}
                            onChange={(e) => handleChange('defaultStartTime', e.target.value)}
                            containerClassName="mb-0"
                        />
                        <Input
                            type="time"
                            label="Default End Time"
                            value={settings.defaultEndTime}
                            onChange={(e) => handleChange('defaultEndTime', e.target.value)}
                            containerClassName="mb-0"
                        />
                        <Input
                            type="number"
                            label="Default Working Hours per Day"
                            value={settings.defaultWorkingHours}
                            onChange={(e) => handleChange('defaultWorkingHours', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.5"
                            containerClassName="mb-0"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            type="number"
                            label="Working Days per Week"
                            value={settings.workingDaysPerWeek}
                            onChange={(e) => handleChange('workingDaysPerWeek', parseInt(e.target.value) || 0)}
                            min="1"
                            max="7"
                            containerClassName="mb-0"
                        />
                        <Input
                            type="number"
                            label="Half-Day Hours"
                            value={settings.halfDayHours}
                            onChange={(e) => handleChange('halfDayHours', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.5"
                            containerClassName="mb-0"
                        />
                    </div>
                </div>

                {/* Late Policy Section */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-text-primary border-b border-slate-200 dark:border-slate-700 pb-2">
                        Late Policy
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            type="number"
                            label="Late Grace Period (minutes)"
                            value={settings.lateGracePeriodMinutes}
                            onChange={(e) => handleChange('lateGracePeriodMinutes', parseInt(e.target.value) || 0)}
                            min="0"
                            containerClassName="mb-0"
                        />
                        <Input
                            type="number"
                            label="Max Late Minutes (before absence)"
                            value={settings.maxLateMinutes}
                            onChange={(e) => handleChange('maxLateMinutes', parseInt(e.target.value) || 0)}
                            min="0"
                            containerClassName="mb-0"
                        />
                    </div>
                </div>

                {/* Early Leave Policy Section */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-text-primary border-b border-slate-200 dark:border-slate-700 pb-2">
                        Early Leave Policy
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                        <Input
                            type="number"
                            label="Early Leave Grace Period (minutes)"
                            value={settings.earlyLeaveGracePeriodMinutes}
                            onChange={(e) => handleChange('earlyLeaveGracePeriodMinutes', parseInt(e.target.value) || 0)}
                            min="0"
                            containerClassName="mb-0"
                        />
                    </div>
                </div>

                {/* Leave Policy Section */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-text-primary border-b border-slate-200 dark:border-slate-700 pb-2">
                        Leave Policy
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            type="number"
                            label="Max Leave Days per Month"
                            value={settings.maxLeaveDaysPerMonth}
                            onChange={(e) => handleChange('maxLeaveDaysPerMonth', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.5"
                            containerClassName="mb-0"
                        />
                        <Input
                            type="number"
                            label="Max Leave Days per Year"
                            value={settings.maxLeaveDaysPerYear}
                            onChange={(e) => handleChange('maxLeaveDaysPerYear', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.5"
                            containerClassName="mb-0"
                        />
                    </div>
                </div>

                {/* Absence Policy Section */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-text-primary border-b border-slate-200 dark:border-slate-700 pb-2">
                        Absence Policy
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            type="number"
                            label="Max Absence Days per Month"
                            value={settings.maxAbsenceDaysPerMonth}
                            onChange={(e) => handleChange('maxAbsenceDaysPerMonth', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.5"
                            containerClassName="mb-0"
                        />
                        <div className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                id="absenceRequiresAction"
                                checked={settings.absenceRequiresAction}
                                onChange={(e) => handleChange('absenceRequiresAction', e.target.checked)}
                                className="w-5 h-5 text-primary-action rounded border-slate-300 focus:ring-primary-action"
                            />
                            <label htmlFor="absenceRequiresAction" className="text-sm font-medium text-text-primary">
                                Absence Requires HR Action
                            </label>
                        </div>
                    </div>
                </div>

                {/* Overtime Policy Section */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-text-primary border-b border-slate-200 dark:border-slate-700 pb-2">
                        Overtime Policy
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            type="number"
                            label="Overtime Threshold (minutes)"
                            value={settings.overtimeThresholdMinutes}
                            onChange={(e) => handleChange('overtimeThresholdMinutes', parseInt(e.target.value) || 0)}
                            min="0"
                            containerClassName="mb-0"
                        />
                        <Input
                            type="number"
                            label="Minimum Overtime Hours"
                            value={settings.minOvertimeHours}
                            onChange={(e) => handleChange('minOvertimeHours', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.25"
                            containerClassName="mb-0"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceRulesSettingsPage;

