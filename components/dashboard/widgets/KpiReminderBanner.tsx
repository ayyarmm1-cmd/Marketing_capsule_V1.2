import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../ui/Button';

const KpiReminderBanner: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const today = new Date();
        const dayOfMonth = today.getDate();
        const deadline = 25;
        const daysToShowBeforeDeadline = 5;
        const startDay = deadline - daysToShowBeforeDeadline + 1; // Show from the 21st

        const dismissedKey = `kpiReminderDismissed_${today.getFullYear()}_${today.getMonth()}`;
        const wasDismissed = sessionStorage.getItem(dismissedKey);

        // Show only between the start day (e.g., 21st) and the deadline (25th)
        if (!wasDismissed && dayOfMonth >= startDay && dayOfMonth <= deadline) {
            setIsVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        const today = new Date();
        const dismissedKey = `kpiReminderDismissed_${today.getFullYear()}_${today.getMonth()}`;
        sessionStorage.setItem(dismissedKey, 'true');
        setIsVisible(false);
    };

    if (!isVisible) {
        return null;
    }

    const today = new Date();
    const deadlineDate = new Date(today.getFullYear(), today.getMonth(), 25);
    // Ensure we are comparing dates only, not times
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);

    const daysLeft = Math.round((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    let reminderText = `The deadline for self-evaluation is on the 25th of this month. Please update your progress.`;
    if (daysLeft === 0) {
        reminderText = `The deadline for self-evaluation is today! Please update your progress.`;
    } else if (daysLeft === 1) {
        reminderText = `The deadline for self-evaluation is tomorrow. Please update your progress.`;
    } else if (daysLeft > 1) {
        reminderText = `The deadline for self-evaluation is in ${daysLeft} days on the 25th. Please update your progress.`;
    }


    return (
        <div 
            className="bg-indigo-100 dark:bg-indigo-900/50 border-l-4 border-indigo-500 text-indigo-800 dark:text-indigo-200 p-4 rounded-md shadow-lg mb-6 flex items-center justify-between"
            role="alert"
        >
            <div>
                <p className="font-bold">KPI Self-Evaluation Reminder</p>
                <p className="text-sm">{reminderText}</p>
            </div>
            <div className="flex items-center space-x-4">
                <Link to="/my/kpi">
                    <Button variant="ghost" size="sm" className="!text-indigo-600 dark:!text-indigo-300 hover:!bg-indigo-200 dark:hover:!bg-indigo-800">
                        Go to My KPIs
                    </Button>
                </Link>
                <button
                    onClick={handleDismiss}
                    className="p-1 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Dismiss reminder"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default KpiReminderBanner;