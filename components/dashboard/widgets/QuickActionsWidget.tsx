
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { Permission } from '../../../types';

interface ActionItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const ActionItem: React.FC<ActionItemProps> = ({ to, label, icon }) => (
  <Link to={to} className="flex items-center p-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors group">
    <div className="p-2 bg-primary-action text-white rounded-md mr-3 group-hover:bg-blue-700">
      {icon}
    </div>
    <span className="text-sm font-medium text-text-primary group-hover:text-primary-action">{label}</span>
  </Link>
);

// Icons
const AddLeadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766Z" /></svg>;
const CreateTaskIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const MyProfileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h3m-3 0V3m0 3v3m0 0h3m-3 0H9m12 6a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const MyLeaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-3.75h.008v.008H12v-.008Z" /></svg>;
const ViewSalesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>;

const QuickActionsWidget: React.FC = () => {
  const { hasPermission } = useAuth();
  const actions = [];

  if (hasPermission(Permission.CREATE_LEAD)) {
    actions.push({ to: "/leads", label: "Add New Lead", icon: <AddLeadIcon /> });
  }
  if (hasPermission(Permission.CREATE_TASK)) {
    actions.push({ to: "/tasks", label: "Create Task", icon: <CreateTaskIcon /> });
  }
  if (hasPermission(Permission.CREATE_SALE_RECORD)) {
     actions.push({ to: "/sales", label: "Record New Sale", icon: <ViewSalesIcon /> });
  }
   if (hasPermission(Permission.VIEW_OWN_PROFILE)) {
    actions.push({ to: "/profile", label: "My Profile", icon: <MyProfileIcon /> });
  }
  if (hasPermission(Permission.CREATE_LEAVE_REQUEST)) {
    actions.push({ to: "/hr/my-leave", label: "Request Leave", icon: <MyLeaveIcon /> });
  }
  if (hasPermission(Permission.MANAGE_SETTINGS)) {
    actions.push({ to: "/settings", label: "System Settings", icon: <SettingsIcon /> });
  }


  if (actions.length === 0) {
    return (
        <div className="bg-container-bg p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold text-text-primary mb-4">Quick Actions</h3>
            <p className="text-text-secondary">No specific quick actions available for your role.</p>
        </div>
    );
  }

  return (
    <div className="bg-container-bg p-6 rounded-xl shadow-lg">
      <h3 className="text-xl font-semibold text-text-primary mb-4">Quick Actions</h3>
      <div className="space-y-3">
        {actions.map(action => (
          <ActionItem key={action.to} to={action.to} label={action.label} icon={action.icon} />
        ))}
      </div>
    </div>
  );
};

export default QuickActionsWidget;
