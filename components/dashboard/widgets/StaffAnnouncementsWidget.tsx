import React from 'react';
import { Employee } from '../../../types';
import { getUpcomingBirthdays, getUpcomingAnniversaries } from '../../../utils/dateUtils';
import { Link } from 'react-router-dom';

const BirthdayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-pink-500"><path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 19.5v-8.25m18 0A2.25 2.25 0 0 0 18.75 9H5.25A2.25 2.25 0 0 0 3 11.25m18 0v-7.5A2.25 2.25 0 0 0 18.75 1.5H5.25A2.25 2.25 0 0 0 3 3.75v7.5m15-7.5a.75.75 0 0 0-1.5 0v4.5A.75.75 0 0 0 18 11.25h-1.5a.75.75 0 0 0 0-1.5h.75V5.25h-.75a.75.75 0 0 0-.75.75V11.25a2.25 2.25 0 0 0 2.25 2.25h1.5M12 11.25a.75.75 0 0 0-.75-.75H9.75a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 .75-.75Z" /></svg>;
const AnniversaryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-indigo-500"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9a9.963 9.963 0 0 1-9-9.75V7.125a9.963 9.963 0 0 1 9-9.75h9a9.963 9.963 0 0 1 9 9.75v1.875m-9-9v1.875m-9 9.75h18" /></svg>;

interface StaffAnnouncementsWidgetProps {
  employees: Employee[];
}

const StaffAnnouncementsWidget: React.FC<StaffAnnouncementsWidgetProps> = ({ employees }) => {
  const upcomingBirthdays = getUpcomingBirthdays(employees, 30);
  const upcomingAnniversaries = getUpcomingAnniversaries(employees, 30);

  const announcements = [
    ...upcomingBirthdays.map(b => ({
      type: 'birthday',
      date: b.birthdayThisYear,
      employee: b.employee,
      detail: `Birthday`,
    })),
    ...upcomingAnniversaries.map(a => ({
      type: 'anniversary',
      date: a.anniversaryThisYear,
      employee: a.employee,
      detail: `${a.yearsOfService} Year${a.yearsOfService > 1 ? 's' : ''} of Service`,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  if (announcements.length === 0) {
    return null;
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg">
      <h3 className="text-lg font-semibold text-text-primary dark:text-slate-200 mb-4">
        Upcoming Staff Anniversaries & Birthdays
      </h3>
      <ul className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-2">
        {announcements.map((announcement, index) => (
          <li key={`${announcement.type}-${announcement.employee.id}-${index}`} className="flex items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <div className="flex-shrink-0 mr-4">
              {announcement.type === 'birthday' ? <BirthdayIcon /> : <AnniversaryIcon />}
            </div>
            <div className="flex-grow">
              <Link to={`/hr/staff/${announcement.employee.id}`} className="text-sm text-text-primary dark:text-slate-200 font-semibold hover:underline">
                {announcement.employee.name}
              </Link>
              <p className="text-xs text-text-secondary dark:text-slate-400">{announcement.detail}</p>
            </div>
            <span className="text-sm font-semibold text-text-secondary dark:text-slate-300">
              {formatDate(announcement.date)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StaffAnnouncementsWidget;
