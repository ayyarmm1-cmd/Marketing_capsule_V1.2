import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Task, TaskStatus, TaskPriority, User, Project, Permission, TaskList, Quiz, SurveySubmission, FileAnswer, SingleChoiceWithTextAnswer, Attachment } from '../../types';
import { apiGetTaskById, apiGetTasks, apiUpdateTask, apiGetUsers, apiGetProjects, apiDeleteTask, apiGetTaskLists, apiGetQuizById, apiGetSurveySubmissionsForTask } from '../../services/api';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button'; // Added Button
import Select from '../ui/Select'; // Added Select
import CreateEditTaskModal from './CreateEditTaskModal';
import { STATUS_COLORS, PRIORITY_COLORS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import { alert as showAlert } from '../../utils/dialogUtils';
import AddEditProjectModal from '../projects/AddEditProjectModal'; // Added Project Modal
import StatDisplayCard from '../reports/ui/StatDisplayCard'; // Import StatDisplayCard
import ManageTaskListsModal from './ManageTaskListsModal';

const KANBAN_COLUMNS: TaskStatus[] = [TaskStatus.TO_DO, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED];
const STATUS_CHART_COLORS: Record<TaskStatus, string> = {
    [TaskStatus.TO_DO]: '#9CA3AF',
    [TaskStatus.IN_PROGRESS]: '#3B82F6',
    [TaskStatus.COMPLETED]: '#10B981',
};


const KanbanCard: React.FC<{ task: Task; onDragStart: (e: React.DragEvent, taskId: string) => void; }> = ({ task, onDragStart }) => {
    const priorityClass = PRIORITY_COLORS[task.priority] || 'border-gray-400';
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task.id)}
            className={`p-3 bg-container-bg dark:bg-slate-800 rounded-md shadow-sm border-l-4 ${priorityClass} cursor-grab active:cursor-grabbing mb-3 border border-slate-200 dark:border-slate-700`}
        >
            <Link to={`/tasks/${task.id}`} className="font-semibold text-sm text-gray-800 hover:text-primary-action">{task.title}</Link>
            <p className="text-xs text-gray-500 mt-1 truncate">{task.description}</p>
            {task.dueDate && <p className="text-xs text-gray-500 mt-2">Due: {new Date(task.dueDate).toLocaleDateString('en-CA')}</p>}
        </div>
    );
};

const TaskDetailPage: React.FC = () => {
    const { taskId } = useParams<{ taskId: string }>();
    const { user: loggedInUser, hasPermission } = useAuth();
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();
    const navigate = useNavigate();

    const [task, setTask] = useState<Task | null>(null);
    const [parentTask, setParentTask] = useState<Task | null>(null);
    const [isParentDetailsVisible, setIsParentDetailsVisible] = useState(true);
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [taskLists, setTaskLists] = useState<TaskList[]>([]);
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [surveySubmissions, setSurveySubmissions] = useState<SurveySubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubTaskModalOpen, setIsSubTaskModalOpen] = useState(false);
    const [linkedSurvey, setLinkedSurvey] = useState<Quiz | null>(null);

    const fetchTaskData = useCallback(async () => {
        if (!taskId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [fetchedTask, fetchedUsers, allFetchedTasks, fetchedProjects, fetchedTaskLists] = await Promise.all([
                apiGetTaskById(taskId),
                apiGetUsers(),
                apiGetTasks(),
                apiGetProjects(),
                apiGetTaskLists()
            ]);
            setTask(fetchedTask);

            if (fetchedTask && fetchedTask.parentId) {
                const fetchedParentTask = await apiGetTaskById(fetchedTask.parentId);
                setParentTask(fetchedParentTask);
            } else {
                setParentTask(null); // Reset if it's not a subtask
            }

            if (fetchedTask?.surveyId) {
                const [surveyDetails, submissions] = await Promise.all([
                    apiGetQuizById(fetchedTask.surveyId),
                    apiGetSurveySubmissionsForTask(taskId)
                ]);
                setLinkedSurvey(surveyDetails);
                setSurveySubmissions(submissions);
            } else {
                setLinkedSurvey(null);
                setSurveySubmissions([]);
            }

            setUsers(fetchedUsers);
            setAllTasks(allFetchedTasks);
            setProjects(fetchedProjects);
            setTaskLists(fetchedTaskLists);
        } catch (error) {
            console.error("Failed to fetch task details:", error);
            setTask(null); 
        }
        setIsLoading(false);
    }, [taskId]);

    useEffect(() => {
        fetchTaskData();
    }, [fetchTaskData]);
  
    const subTasks = useMemo(() => {
        if (!task) return [];
        return allTasks.filter(t => t.parentId === task.id);
    }, [allTasks, task]);

    const parentProject = useMemo(() => {
        if (!task || !task.projectId) return null;
        return projects.find(p => p.id === task.projectId);
    }, [projects, task]);

    const handleTaskUpdated = () => {
        setIsEditModalOpen(false);
        setIsSubTaskModalOpen(false);
        fetchTaskData();
    };

    const handleCopySurveyUrl = () => {
        if (task && linkedSurvey) {
            const url = `${window.location.origin}/#/take-survey/${linkedSurvey.id}?projectId=${task.projectId}&taskId=${task.id}`;
            navigator.clipboard.writeText(url);
            addNotification("Survey URL copied to clipboard!", "success");
        }
    };

    const handleQuickUpdate = async (field: 'status' | 'priority', value: TaskStatus | TaskPriority) => {
        if (!task || !loggedInUser) return;
        try {
            await apiUpdateTask({ id: task.id, [field]: value }, loggedInUser.id);
            fetchTaskData(); // Refresh
        } catch (error) {
            console.error(`Failed to update task ${field}:`, error);
            await showAlert(`Failed to update ${field}. Please try again.`, 'Error');
        }
    };
  
    const handleDeleteTask = async () => {
        if (!task) return;
        const confirmed = await showConfirmation({
          title: 'Delete Task',
          message: `Are you sure you want to delete task "${task.title}"?`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          confirmVariant: 'danger',
        });
        if (confirmed) {
            try {
                await apiDeleteTask(task.id);
                addNotification("Task deleted successfully.", "success");
                navigate('/tasks');
            } catch (error) {
                addNotification(`Failed to delete task: ${(error as Error).message}`, "error");
            }
        }
    };

    const getAssigneeNames = (assigneeIds?: string[]): string => {
        if (!assigneeIds || assigneeIds.length === 0) return 'Unassigned';
        return assigneeIds.map(id => users.find(u => u.id === id)?.name || 'Unknown User').join(', ');
    };
  
    const getCreatorName = (creatorId?: string): string => {
        if (!creatorId) return 'Unknown';
        return users.find(u => u.id === creatorId)?.name || 'Unknown User';
    };

    const formatDate = (dateString?: string) => dateString ? new Date(dateString).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
    const formatDateSimple = (dateString?: string) => dateString ? new Date(dateString).toLocaleDateString('en-GB') : 'N/A';

    const renderAnswerPreview = (answer: any) => {
        if (answer === null || answer === undefined) {
            return <span className="italic text-slate-500">No answer</span>;
        }
        if (Array.isArray(answer)) {
            if (answer.length === 0) return <span className="italic text-slate-500">No answer</span>;
            // Check if it's an array of FileAnswer objects
            if (typeof answer[0] === 'object' && answer[0] !== null && 'url' in answer[0]) {
                const fileCount = answer.length;
                return `${fileCount} file${fileCount > 1 ? 's' : ''} uploaded`;
            }
            return answer.join(', ');
        }
        if (typeof answer === 'object' && 'choice' in answer) {
            const typedAnswer = answer as SingleChoiceWithTextAnswer;
            return `${typedAnswer.choice}${typedAnswer.text ? ` (${typedAnswer.text})` : ''}`;
        }
        return String(answer);
    };

    if (isLoading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
    if (!task) return <div className="text-center text-text-primary p-8">Task not found. <Link to="/tasks" className="text-primary-action hover:underline">Back to Task List</Link></div>;

    const canEdit = hasPermission(Permission.EDIT_ALL_TASKS) || (hasPermission(Permission.EDIT_TASK) && task.createdByUserId === loggedInUser?.id);
    const canDelete = hasPermission(Permission.DELETE_ALL_TASKS) || (hasPermission(Permission.DELETE_TASK) && task.createdByUserId === loggedInUser?.id);

    return (
        <div className="p-6 bg-container-bg shadow-xl rounded-lg max-w-4xl mx-auto">
            <div className="flex justify-between items-start mb-4 pb-4 border-b">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary break-all">{task.title}</h1>
                    <p className="text-sm text-text-secondary">Task ID: {task.id}</p>
                    {parentProject && (
                        <Link to={`/projects/${parentProject.id}`} className="text-sm text-indigo-600 hover:underline">
                        Part of Project: {parentProject.name}
                        </Link>
                    )}
                </div>
                <div className="flex flex-col items-end space-y-2">
                    {canEdit && 
                        <Button onClick={() => setIsEditModalOpen(true)} variant="primary" size="sm">Edit Task</Button>
                    }
                    {canDelete && 
                        <Button onClick={handleDeleteTask} variant="danger" size="sm">Delete Task</Button>
                    }
                    <Link to="/tasks" className="text-sm text-primary-action hover:underline">&larr; Back to Task List</Link>
                </div>
            </div>

            {parentTask && (
                <div className="mb-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button 
                        onClick={() => setIsParentDetailsVisible(!isParentDetailsVisible)}
                        className="w-full flex justify-between items-center text-left"
                        aria-expanded={isParentDetailsVisible}
                    >
                        <h2 className="text-lg font-semibold text-text-secondary dark:text-slate-300">Parent Task Details</h2>
                        <svg className={`w-5 h-5 transform transition-transform ${isParentDetailsVisible ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {isParentDetailsVisible && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                <p>
                                    <strong className="text-text-secondary dark:text-slate-400 w-28 inline-block">Title:</strong> 
                                    <Link to={`/tasks/${parentTask.id}`} className="font-semibold text-primary-action hover:underline">{parentTask.title}</Link>
                                </p>
                                <p>
                                    <strong className="text-text-secondary dark:text-slate-400 w-28 inline-block">Status:</strong> 
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[parentTask.status]}`}>{parentTask.status}</span>
                                </p>
                                <p>
                                    <strong className="text-text-secondary dark:text-slate-400 w-28 inline-block">Priority:</strong> 
                                    <span className={`font-medium ${PRIORITY_COLORS[parentTask.priority]?.replace('border-', 'text-')}`}>{parentTask.priority}</span>
                                </p>
                                <p>
                                    <strong className="text-text-secondary dark:text-slate-400 w-28 inline-block">Due Date:</strong> 
                                    {formatDateSimple(parentTask.dueDate)}
                                </p>
                                <p className="md:col-span-2">
                                    <strong className="text-text-secondary dark:text-slate-400 w-28 inline-block">Assignees:</strong> 
                                    {getAssigneeNames(parentTask.assigneeIds)}
                                </p>
                                <p>
                                    <strong className="text-text-secondary dark:text-slate-400 w-28 inline-block">Project:</strong> 
                                    {projects.find(p => p.id === parentTask.projectId)?.name || 'N/A'}
                                </p>
                                <p>
                                    <strong className="text-text-secondary dark:text-slate-400 w-28 inline-block">Group:</strong> 
                                    {taskLists.find(l => l.id === parentTask.listId)?.title || 'Uncategorized'}
                                </p>
                            </div>
                            
                            {parentTask.googleDriveLink && (
                                <div>
                                    <strong className="text-sm text-text-secondary dark:text-slate-400 block mb-1">Google Drive Link:</strong> 
                                    <a href={parentTask.googleDriveLink} target="_blank" rel="noopener noreferrer" 
                                    className="text-sm text-primary-action hover:underline break-all bg-white dark:bg-slate-800 p-2 rounded-md block">
                                        {parentTask.googleDriveLink}
                                    </a>
                                </div>
                            )}

                            <div>
                                <strong className="text-sm text-text-secondary dark:text-slate-400 block mb-1">Description:</strong> 
                                <p className="text-sm text-text-primary dark:text-slate-300 whitespace-pre-wrap bg-white dark:bg-slate-800 p-2 rounded-md">{parentTask.description || 'No description.'}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-text-secondary dark:text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-700">
                                <p><strong>Created by:</strong> {getCreatorName(parentTask.createdByUserId)}</p>
                                <p><strong>Created at:</strong> {formatDate(parentTask.createdAt)}</p>
                                <p><strong>Last updated:</strong> {formatDate(parentTask.updatedAt)}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}


            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="md:col-span-2 space-y-4">
                    <div>
                        <h3 className="text-md font-semibold text-text-secondary mb-1">Description</h3>
                        <p className="text-text-primary dark:text-slate-200 whitespace-pre-wrap bg-slate-50 dark:bg-slate-700/50 p-3 rounded-md min-h-[80px]">{task.description || 'No description provided.'}</p>
                    </div>
                    {task.googleDriveLink && (
                        <div>
                            <h3 className="text-md font-semibold text-text-secondary mb-1">Google Drive Link</h3>
                            <a href={task.googleDriveLink} target="_blank" rel="noopener noreferrer" 
                            className="text-primary-action hover:underline break-all bg-slate-50 dark:bg-slate-700/50 p-3 rounded-md block">
                                {task.googleDriveLink}
                            </a>
                        </div>
                    )}
                </div>
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg shadow-sm">
                    <div>
                        <label className="text-xs font-medium text-text-secondary">Status</label>
                        {canEdit ? (
                            <Select value={task.status} onChange={(e) => handleQuickUpdate('status', e.target.value as TaskStatus)}
                            options={Object.values(TaskStatus).map(s => ({value: s, label: s}))}
                            className="w-full text-sm !py-1.5" containerClassName="mb-0" />
                        ) : (
                            <p className={`px-2 py-1 text-xs font-semibold rounded-full inline-block ${STATUS_COLORS[task.status] || 'bg-gray-300'}`}>{task.status}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-xs font-medium text-text-secondary">Priority</label>
                        {canEdit ? (
                            <Select value={task.priority} onChange={(e) => handleQuickUpdate('priority', e.target.value as TaskPriority)}
                            options={Object.values(TaskPriority).map(p => ({value: p, label: p}))}
                            className="w-full text-sm !py-1.5" containerClassName="mb-0" />
                        ) : (
                            <p className={`font-semibold ${(PRIORITY_COLORS[task.priority] || '').replace('border-', 'text-')}`}>{task.priority}</p>
                        )}
                    </div>
                    <p className="text-sm"><strong className="text-text-secondary">Due Date:</strong> {formatDateSimple(task.dueDate)}</p>
                </div>
            </div>
      
            <div className="border-t pt-4 mb-6">
                <h3 className="text-md font-semibold text-text-secondary mb-2">Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <p><strong className="text-text-secondary w-28 inline-block">Assignees:</strong> {getAssigneeNames(task.assigneeIds)}</p>
                    <p><strong className="text-text-secondary w-28 inline-block">Created By:</strong> {getCreatorName(task.createdByUserId)}</p>
                    <p><strong className="text-text-secondary w-28 inline-block">Created At:</strong> {formatDate(task.createdAt)}</p>
                    <p><strong className="text-text-secondary w-28 inline-block">Last Updated:</strong> {formatDate(task.updatedAt)}</p>
                    <p><strong className="text-text-secondary w-28 inline-block">Related Sale ID:</strong> {task.relatedSaleId || 'N/A'}</p>
                </div>
            </div>
            
            <section>
                <h3 className="text-lg font-semibold text-text-secondary dark:text-slate-300 mb-2 pt-4 border-t dark:border-slate-700">Attachments ({task.attachments?.length || 0})</h3>
                {task.attachments && task.attachments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {task.attachments.map(att => (
                        <a key={att.url} href={att.url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border dark:border-slate-600">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                            {att.type.startsWith('image/') ? (
                                <img src={att.url} alt={att.name} className="w-12 h-12 rounded object-cover" />
                            ) : (
                                <div className="w-12 h-12 rounded bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                                {/* Generic file icon */}
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                </div>
                            )}
                            </div>
                            <div className="ml-4 min-w-0">
                            <p className="text-sm font-medium text-primary-action dark:text-blue-400 truncate">{att.name}</p>
                            <p className="text-xs text-text-secondary dark:text-slate-400">{(att.size / 1024).toFixed(1)} KB</p>
                            </div>
                        </div>
                        </a>
                    ))}
                    </div>
                ) : (
                    <p className="text-sm text-text-secondary dark:text-slate-400 italic">No files attached.</p>
                )}
            </section>

            <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-text-secondary">Sub-tasks ({subTasks.length})</h3>
                    <Button size="sm" variant="secondary" onClick={() => setIsSubTaskModalOpen(true)}>+ Add Sub-task</Button>
                </div>
                {subTasks.length > 0 ? (
                    <ul className="space-y-2 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-md">
                        {subTasks.map(st => (
                            <li key={st.id} className="hover:bg-gray-100 rounded">
                                <Link to={`/tasks/${st.id}`} className="flex justify-between items-center p-2">
                                <span className="text-sm text-primary-action hover:underline">{st.title}</span>
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[st.status]}`}>{st.status}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-gray-500 italic">No sub-tasks created yet.</p>}
            </div>

            {/* Survey Section */}
            {linkedSurvey && surveySubmissions.length > 0 && (
                <div className="border-t pt-4 mt-6">
                    <h3 className="text-lg font-semibold text-text-secondary dark:text-slate-300">Survey Submissions ({surveySubmissions.length})</h3>
                    <div className="mt-2 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700">
                        <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                            {surveySubmissions.map(sub => (
                                <Link
                                    to={`/surveys/submission/${sub.id}`}
                                    key={sub.id}
                                    className="block p-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <p className="text-xs text-text-secondary dark:text-slate-400 mb-2">Submitted at: {new Date(sub.submittedAt).toLocaleString('en-GB')}</p>
                                    <ul className="space-y-2">
                                        {sub.answers.slice(0, 3).map(ans => (
                                            <li key={ans.questionId} className="text-sm">
                                                <p className="font-semibold text-text-secondary dark:text-slate-300 truncate">{ans.questionText}</p>
                                                <p className="text-text-primary dark:text-slate-100 pl-2 whitespace-pre-wrap truncate">{renderAnswerPreview(ans.answer)}</p>
                                            </li>
                                        ))}
                                        {sub.answers.length > 3 && <li className="text-xs text-center text-text-secondary dark:text-slate-400 pt-1">...and {sub.answers.length - 3} more answers. Click to view all.</li>}
                                    </ul>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {linkedSurvey && surveySubmissions.length === 0 && (
                 <div className="border-t pt-4 mt-6">
                    <h3 className="text-lg font-semibold text-text-secondary">Survey</h3>
                     <div className="mt-2 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-text-primary dark:text-slate-200">{linkedSurvey.title}</p>
                                <p className="text-xs text-text-secondary dark:text-slate-400">{linkedSurvey.description}</p>
                            </div>
                            <Button onClick={handleCopySurveyUrl} variant="secondary" size="sm">
                                Copy Public URL
                            </Button>
                        </div>
                         <p className="mt-4 text-sm text-text-secondary italic">No submissions received for this task yet.</p>
                     </div>
                </div>
            )}


            {loggedInUser && (
                <>
                    <CreateEditTaskModal
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        onTaskSaved={handleTaskUpdated}
                        editingTask={task}
                        users={users}
                        loggedInUserId={loggedInUser.id}
                        taskLists={taskLists}
                    />
                    <CreateEditTaskModal
                        isOpen={isSubTaskModalOpen}
                        onClose={() => setIsSubTaskModalOpen(false)}
                        onTaskSaved={handleTaskUpdated}
                        users={users}
                        loggedInUserId={loggedInUser.id}
                        parentId={task.id}
                        defaultProjectId={task.projectId || ''}
                        defaultClientId={task.clientId || ''}
                        defaultBusinessId={task.businessId || ''}
                        taskLists={taskLists}
                    />
                </>
            )}
        </div>
    );
};

export default TaskDetailPage;