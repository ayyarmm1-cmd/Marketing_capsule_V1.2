
import React from 'react';
import { Holiday } from '../../../types';
import { Link } from 'react-router-dom';

const HolidayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-500"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-red-400"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>;


interface UpcomingHolidaysWidgetProps {
  holidays: Holiday[];
}

const UpcomingHolidaysWidget: React.FC<UpcomingHolidaysWidgetProps> = ({ holidays }) => {
  
  const formatRelativeDate = (dateString: string) => {
    const holidayDate = new Date(dateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (holidayDate.getTime() === today.getTime()) {
      return { relative: 'Today', full: today.toLocaleDateString('en-GB', { weekday: 'long' }) };
    }
    if (holidayDate.getTime() === tomorrow.getTime()) {
      return { relative: 'Tomorrow', full: tomorrow.toLocaleDateString('en-GB', { weekday: 'long' }) };
    }
    
    const diffTime = holidayDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 1 && diffDays <= 7) {
        return { relative: `in ${diffDays} days`, full: holidayDate.toLocaleDateString('en-GB', { weekday: 'long' }) };
    }

    return { 
        relative: holidayDate.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }), 
        full: holidayDate.toLocaleDateString('en-GB', { weekday: 'long' }) 
    };
  };

  return (
    <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-text-primary dark:text-slate-200 flex items-center">
            <HolidayIcon />
            <span className="ml-2">Upcoming Holidays</span>
        </h3>
        <Link to="/hr/holidays" className="text-sm text-primary-action dark:text-blue-400 hover:underline">
            View Calendar
        </Link>
      </div>
      {holidays.length > 0 ? (
        <ul className="space-y-3">
          {holidays.map((holiday) => {
            const { relative, full } = formatRelativeDate(holiday.date);
            const day = new Date(holiday.date + 'T00:00:00').getDate();

            return (
              <li key={holiday.id} className="flex items-center p-3 bg-red-50/50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-300 dark:border-red-600">
                <div className="flex flex-col items-center justify-center w-12 h-12 bg-white dark:bg-slate-700 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 text-red-500 mr-4">
                    <span className="text-xs font-bold uppercase">{new Date(holiday.date + 'T00:00:00').toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-xl font-bold">{day}</span>
                </div>
                <div className="flex-grow">
                  <p className="text-sm text-text-primary dark:text-slate-200 font-semibold">{holiday.name}</p>
                  <p className="text-xs text-text-secondary dark:text-slate-400">{holiday.description || full}</p>
                </div>
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {relative}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="text-center py-6">
            <CalendarIcon />
            <p className="text-sm text-text-secondary dark:text-slate-400 mt-2">No upcoming holidays in the next 30 days.</p>
        </div>
      )}
    </div>
  );
};

export default UpcomingHolidaysWidget;
