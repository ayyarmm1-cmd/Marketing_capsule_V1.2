import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../ui/Button';

const KpiRatingReminderBanner: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const today = new Date();
        const dayOfMonth = today.getDate();
        const deadline = 28;
        const daysToShowBeforeDeadline = 5;
        const startDay = deadline - daysToShowBeforeDeadline + 1; // Show from the 24th

        const dismissedKey = `kpiRatingReminderDismissed_${today.getFullYear()}_${today.getMonth()}`;
        const wasDismissed = sessionStorage.getItem(dismissedKey);

        // Show the banner if it hasn't been dismissed this month and the day is within the 5-day window before the deadline.
        if (!wasDismissed && dayOfMonth >= startDay && dayOfMonth <= deadline) {
            setIsVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        const today = new Date();
        const dismissedKey = `kpiRatingReminderDismissed_${today.getFullYear()}_${today.getMonth()}`;
        sessionStorage.setItem(dismissedKey, 'true');
        setIsVisible(false);
    };

    if (!isVisible) {
        return null;
    }

    const today = new Date();
    const deadlineDate = new Date(today.getFullYear(), today.getMonth(), 28);
    // Ensure we are comparing dates only, not times
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);

    const daysLeft = Math.round((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    let reminderText = `The deadline for rating your team's KPIs is on the 28th of this month. Please complete your evaluations.`;
    if (daysLeft === 0) {
        reminderText = `The deadline for team KPI rating is today! Please complete your evaluations.`;
    } else if (daysLeft === 1) {
        reminderText = `The deadline for team KPI rating is tomorrow. Please complete your evaluations.`;
    } else if (daysLeft > 1) {
        reminderText = `The deadline for team KPI rating is in ${daysLeft} days on the 28th. Please complete your evaluations.`;
    }


    return (
        <div 
            className="bg-purple-100 dark:bg-purple-900/50 border-l-4 border-purple-500 text-purple-800 dark:text-purple-200 p-4 rounded-md shadow-lg mb-6 flex items-center justify-between"
            role="alert"
        >
            <div>
                <p className="font-bold">KPI Team Rating Reminder</p>
                <p className="text-sm">{reminderText}</p>
            </div>
            <div className="flex items-center space-x-4">
                <Link to="/hr/team-kpis">
                    <Button variant="ghost" size="sm" className="!text-purple-600 dark:!text-purple-300 hover:!bg-purple-200 dark:hover:!bg-purple-800">
                        Go to Team KPIs
                    </Button>
                </Link>
                <button
                    onClick={handleDismiss}
                    className="p-1 rounded-md hover:bg-purple-200 dark:hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
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

export default KpiRatingReminderBanner;