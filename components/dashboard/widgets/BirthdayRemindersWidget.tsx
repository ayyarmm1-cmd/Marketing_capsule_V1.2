import React, { useState, useEffect, useCallback } from 'react';
import { apiGetEmployees } from '../../../services/api';
import { Employee } from '../../../types';
import { getUpcomingBirthdays } from '../../../utils/dateUtils';
import Spinner from '../../ui/Spinner';

const BirthdayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-pink-500"><path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 19.5v-8.25m18 0A2.25 2.25 0 0 0 18.75 9H5.25A2.25 2.25 0 0 0 3 11.25m18 0v-7.5A2.25 2.25 0 0 0 18.75 1.5H5.25A2.25 2.25 0 0 0 3 3.75v7.5m15-7.5a.75.75 0 0 0-1.5 0v4.5A.75.75 0 0 0 18 11.25h-1.5a.75.75 0 0 0 0-1.5h.75V5.25h-.75a.75.75 0 0 0-.75.75V11.25a2.25 2.25 0 0 0 2.25 2.25h1.5M12 11.25a.75.75 0 0 0-.75-.75H9.75a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 .75-.75Z" /></svg>;

const BirthdayRemindersWidget: React.FC = () => {
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<{ employee: Employee, birthdayThisYear: Date }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBirthdayData = useCallback(async () => {
    setIsLoading(true);
    try {
      const employees = await apiGetEmployees();
      const upcoming = getUpcomingBirthdays(employees, 7); // Check for next 7 days
      setUpcomingBirthdays(upcoming);
    } catch (error) {
      console.error("Failed to fetch employee data for birthday reminders:", error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchBirthdayData();
  }, [fetchBirthdayData]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
  };

  if (isLoading) {
    return (
      <div className="bg-container-bg p-6 rounded-xl shadow-lg h-40 flex justify-center items-center">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="bg-container-bg p-6 rounded-xl shadow-lg">
      <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
        <BirthdayIcon />
        <span className="ml-2">Upcoming Birthdays (Next 7 Days)</span>
      </h3>
      {upcomingBirthdays.length > 0 ? (
        <ul className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
          {upcomingBirthdays.map(({ employee, birthdayThisYear }) => (
            <li key={employee.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-md">
              <span className="text-sm text-text-primary font-medium">{employee.name}</span>
              <span className="text-xs text-pink-600 font-semibold bg-pink-100 px-2 py-1 rounded-full">
                {formatDate(birthdayThisYear)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-secondary text-center py-4">No upcoming birthdays in the next 7 days.</p>
      )}
    </div>
  );
};

export default BirthdayRemindersWidget;