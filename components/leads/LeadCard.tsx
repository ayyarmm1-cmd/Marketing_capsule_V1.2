
import React from 'react';
import { Link } from 'react-router-dom';
import { Lead, User } from '../../types';

// --- Helper Functions ---

/**
 * Calculates a human-readable "time ago" string from an ISO date string.
 */
function timeAgo(dateString: string): string {
  if (!dateString) return 'just now';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 5) return 'just now';

  let interval = seconds / 31536000;
  if (interval > 1) return `created ${Math.floor(interval)} years ago`;
  interval = seconds / 2592000;
  if (interval > 1) return `created ${Math.floor(interval)} months ago`;
  interval = seconds / 86400;
  if (interval > 1) return `created ${Math.floor(interval)} days ago`;
  interval = seconds / 3600;
  if (interval > 1) return `created ${Math.floor(interval)} hours ago`;
  interval = seconds / 60;
  if (interval > 1) return `created ${Math.floor(interval)} minutes ago`;
  return `created ${Math.floor(seconds)} seconds ago`;
}

/**
 * Generates a consistent Tailwind background color class based on a string (e.g., a name) for assigned user avatars.
 */
const COLORS = ['bg-purple-500', 'bg-indigo-500', 'bg-blue-500', 'bg-pink-500', 'bg-teal-500'];
const getAssignedUserAvatarColor = (name: string): string => {
  if (!name) return COLORS[0];
  const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const index = Math.abs(hash % COLORS.length);
  return COLORS[index];
};

/**
 * Generates a Tailwind background color class based on the lead's priority.
 */
const getPriorityColor = (priority?: 'High' | 'Medium' | 'Low'): string => {
  switch (priority) {
    case 'High':
      return 'bg-red-500';
    case 'Medium':
      return 'bg-yellow-500';
    case 'Low':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
};


// --- Component ---

interface LeadCardProps {
  lead: Lead;
  users: User[];
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, users }) => {

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData("text/plain", lead.id);
  };

  const assignedUser = users.find(u => u.id === lead.assignedTo);
  const leadInitial = lead.name ? lead.name[0].toUpperCase() : 'L';
  const priorityColor = getPriorityColor(lead.priority);
  const borderColor = priorityColor.replace('bg-', 'border-');

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border-l-4 ${borderColor} p-3 flex flex-col justify-between hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group`}
      draggable="true"
      onDragStart={handleDragStart}
    >
      <div className="flex items-center flex-1 min-w-0">
        <div className={`w-10 h-10 rounded-lg ${priorityColor} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
          {leadInitial}
        </div>
        <div className="ml-3 min-w-0">
          <Link to={`/leads/${lead.id}`} className="font-semibold text-sm text-gray-800 dark:text-slate-200 hover:underline truncate block" title={lead.name}>
            {lead.name}
          </Link>
          <p className="text-xs text-gray-600 dark:text-slate-400 mt-0.5 truncate" title={lead.businessName}>
            {lead.businessName}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{timeAgo(lead.createdAt)}</p>
           {assignedUser && (
            <div className="mt-2">
                <div
                title={`Assigned to ${assignedUser.name}`}
                className={`w-5 h-5 rounded-full ${getAssignedUserAvatarColor(assignedUser.name)} flex items-center justify-center text-white font-bold text-[10px]`}
                >
                {assignedUser.name[0].toUpperCase()}
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadCard;
