import React from 'react';
import { Link } from 'react-router-dom';
import { Task, User, Project, Client, Business } from '../../types';
import { PRIORITY_COLORS } from '../../constants';
import Button from '../ui/Button';

const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>;
const ProjectIcon = (props: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-3 h-3 ${props.className || ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>;
const ClientIcon = (props: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-4 h-4 ${props.className || ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.75-5.25T21 12a9 9 0 1 0-9 9 9.094 9.094 0 0 0 5.25-1.23m0 0L11.25 11.25m0 0L8.25 15l7.5-7.5" /></svg>;


interface TaskCardProps {
  task: Task;
  users: User[];
  projects: Project[];
  clients: Client[];
  businesses: Business[];
  level: number;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggleExpansion: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>, taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, users, projects, clients, businesses, level, hasChildren, isExpanded, onToggleExpansion, onEdit, onDelete, onDragStart }) => {
  const getAssigneeInitials = (assigneeIds?: string[]): {initials: string, name: string}[] => {
    if (!assigneeIds || assigneeIds.length === 0) return [];
    return assigneeIds.map(id => {
      const user = users.find(u => u.id === id);
      return {
          initials: user ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?',
          name: user?.name || 'Unknown User'
      }
    }).slice(0, 3);
  };

  const formatDate = (dateString?: string) => dateString ? new Date(dateString + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : null;
  
  const priorityClass = PRIORITY_COLORS[task.priority]?.replace('border-', 'bg-') || 'bg-gray-400';
  const projectName = task.projectId && projects ? (projects.find(p => p.id === task.projectId)?.name) : null;
  const clientOrBusinessName = task.clientId ? clients.find(c => c.id === task.clientId)?.name : (task.businessId ? businesses.find(b => b.id === task.businessId)?.name : null);
  const clientLink = task.clientId ? `/clients/${task.clientId}` : null;
  const businessLink = task.businessId ? `/businesses/${task.businessId}` : null;
  const clientOrBusinessLink = clientLink || businessLink;
  const dueDate = formatDate(task.dueDate);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (onDragStart) {
      onDragStart(e, task.id);
    }
  };

  return (
    <div 
      style={{ marginLeft: `${level * 20}px`, transition: 'margin-left 0.2s ease-in-out' }}
      className="group"
      draggable={!!onDragStart}
      onDragStart={handleDragStart}
    >
        <div className="bg-container-bg dark:bg-slate-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col justify-between border-l-4 border-primary-action relative cursor-grab active:cursor-grabbing">
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Button variant="secondary" size="sm" className="!p-2" onClick={(e) => { e.stopPropagation(); onEdit(task); }} aria-label="Edit task"><EditIcon /></Button>
                <Button variant="danger" size="sm" className="!p-2" onClick={(e) => { e.stopPropagation(); onDelete(task); }} aria-label="Delete task"><DeleteIcon /></Button>
            </div>
            <div className="p-4">
                <div className="flex items-center justify-between items-start mb-2">
                    <div className="flex items-center min-w-0">
                        {hasChildren ? (
                            <button onClick={(e) => {e.stopPropagation(); onToggleExpansion();}} className="mr-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-0.5 rounded-full" aria-label={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}>
                                <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        ) : (
                             <span className="w-5 mr-1 inline-block text-center text-gray-400">
                                {level > 0 ? '•' : ''}
                            </span>
                        )}
                        <Link to={`/tasks/${task.id}`} className="text-md font-semibold text-text-primary dark:text-slate-200 hover:text-primary-action leading-tight break-words truncate" title={task.title}>
                            {task.title}
                        </Link>
                    </div>
                </div>
                
                {(projectName || clientOrBusinessName) &&
                    <div className="flex flex-wrap gap-x-3 gap-y-1 items-center mb-2">
                        {projectName && (
                            <Link to={`/projects/${task.projectId}`} onClick={(e) => e.stopPropagation()} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium inline-flex items-center hover:underline">
                                <ProjectIcon className="inline-block mr-1 align-text-bottom" />
                                <span>{projectName}</span>
                            </Link>
                        )}
                        {clientOrBusinessName && clientOrBusinessLink && (
                            <Link to={clientOrBusinessLink} onClick={(e) => e.stopPropagation()} className="text-xs text-slate-600 dark:text-slate-400 font-medium inline-flex items-center hover:underline">
                                <ClientIcon className="inline-block mr-1 align-text-bottom" />
                                <span>{clientOrBusinessName}</span>
                            </Link>
                        )}
                    </div>
                }

                {task.description && (
                    <p className="text-xs text-text-secondary dark:text-slate-400 mt-2 mb-3 max-h-16 overflow-y-auto text-clip custom-scrollbar">
                        {task.description.substring(0,120)}{task.description.length > 120 ? '...' : ''}
                    </p>
                )}
            </div>

            <div className="mt-auto p-3 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-b-lg">
                <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                    {getAssigneeInitials(task.assigneeIds).map((assignee, index) => (
                        <div key={index} title={assignee.name} className="w-7 h-7 rounded-full bg-primary-action text-white flex items-center justify-center text-xs font-semibold border-2 border-white dark:border-slate-800">
                        {assignee.initials}
                        </div>
                    ))}
                    { (task.assigneeIds?.length || 0) > 3 && 
                        <div className="w-7 h-7 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-xs font-semibold border-2 border-white dark:border-slate-800">
                        +{(task.assigneeIds?.length || 0) - 3}
                        </div>
                    }
                    {(!task.assigneeIds || task.assigneeIds.length === 0) && (
                        <div className="w-7 h-7 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-xs font-semibold border-2 border-white dark:border-slate-800" title="Unassigned">
                            ?
                        </div>
                    )}
                    </div>
                    {dueDate && <span className="text-xs text-text-secondary dark:text-slate-400">{dueDate}</span>}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-white text-[10px] font-bold ${priorityClass}`}>
                    {task.priority}
                </span>
            </div>
        </div>
    </div>
  );
};

export default TaskCard;