import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Project, Task, TaskStatus, User, Client, Business, Permission, TaskList, TaskPriority, Quiz, SurveySubmission, FileAnswer, SingleChoiceWithTextAnswer } from '../../types'; 
import { apiGetProjectById, apiGetTasks, apiGetUsers, apiGetClientById, apiGetBusinessById, apiUpdateTask, apiDeleteProject, apiGetTaskLists, apiGetQuizById, apiGetSurveySubmissionsForTask } from '../../services/api';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button'; 
import Select from '../ui/Select'; 
import CreateEditTaskModal from '../tasks/CreateEditTaskModal';
import { STATUS_COLORS, PRIORITY_COLORS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import AddEditProjectModal from './AddEditProjectModal'; 
import StatDisplayCard from '../reports/ui/StatDisplayCard'; 
import ManageTaskListsModal from '../tasks/ManageTaskListsModal';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const STATUS_CHART_COLORS: Record<TaskStatus, string> = {
    [TaskStatus.TO_DO]: '#9CA3AF',
    [TaskStatus.IN_PROGRESS]: '#3B82F6',
    [TaskStatus.COMPLETED]: '#10B981',
};

const getPriorityColorClass = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH: return 'bg-red-500';
      case TaskPriority.MEDIUM: return 'bg-amber-500';
      case TaskPriority.LOW: return 'bg-sky-500';
      default: return 'bg-slate-400';
    }
};

const KanbanCard: React.FC<{ 
    task: Task; 
    users: User[];
    onDragStart: (e: React.DragEvent, taskId: string) => void; 
}> = ({ task, users, onDragStart }) => {
    const dueDate = task.dueDate ? new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : null;
    const priorityColorClass = getPriorityColorClass(task.priority);
    const assignees = users.filter(u => task.assigneeIds?.includes(u.id));

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task.id)}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-700 transition-shadow p-4 space-y-3 cursor-grab active:cursor-grabbing"
        >
            <div className="flex items-start justify-between">
                <Link to={`/tasks/${task.id}`} className="font-semibold text-sm text-text-primary dark:text-slate-200 pr-2 hover:text-primary-action dark:hover:text-blue-400">
                    {task.title}
                </Link>
                <span className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${priorityColorClass}`} title={`Priority: ${task.priority}`}></span>
            </div>

            {task.description && (
                <p className="text-xs text-text-secondary dark:text-slate-400">{task.description.substring(0, 100)}{task.description.length > 100 ? '...' : ''}</p>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700/50">
                {dueDate ? (
                    <span className="text-xs font-medium bg-slate-100 dark:bg-slate-700 text-text-secondary dark:text-slate-300 px-2 py-0.5 rounded-full">{dueDate}</span>
                ) : <div />}
                <div className="flex -space-x-2">
                    {assignees.slice(0, 3).map(user => (
                        <div key={user.id} title={user.name} className="w-7 h-7 rounded-full bg-primary-action text-white flex items-center justify-center text-xs font-bold border-2 border-white dark:border-slate-800">
                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                    ))}
                    {assignees.length > 3 && (
                        <div className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-semibold border-2 border-white dark:border-slate-800">
                            +{assignees.length - 3}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const ProjectDetailPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();
    const { hasPermission, user } = useAuth();
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [client, setClient] = useState<Client | null>(null);
    const [business, setBusiness] = useState<Business | null>(null);
    const [taskLists, setTaskLists] = useState<TaskList[]>([]);
    const [linkedSurvey, setLinkedSurvey] = useState<Quiz | null>(null);
    const [surveySubmissions, setSurveySubmissions] = useState<SurveySubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'tasks'>('overview');
    const [draggedOverListId, setDraggedOverListId] = useState<string | null>(null);

    // Modals state
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isManageListsModalOpen, setIsManageListsModalOpen] = useState(false);


    const fetchData = useCallback(async () => {
        if (!projectId) {
            setIsLoading(false);
            return;
        }
        try {
            // No need to set loading true here if it's for a refresh, parent loader handles initial
            const [proj, allTasks, allUsers, fetchedTaskLists] = await Promise.all([
                apiGetProjectById(projectId),
                apiGetTasks(),
                apiGetUsers(),
                apiGetTaskLists()
            ]);

            setProject(proj);
            setTaskLists(fetchedTaskLists);
            if (proj) {
                const projectTasks = allTasks.filter(t => t.projectId === proj.id);
                setTasks(projectTasks);
                setUsers(allUsers);

                if (proj.clientId) apiGetClientById(proj.clientId).then(setClient);
                if (proj.businessId) apiGetBusinessById(proj.businessId).then(setBusiness);
                
                if (proj.surveyId) {
                    apiGetQuizById(proj.surveyId).then(setLinkedSurvey);
                    // Fetch submissions for all tasks in this project
                    const submissionPromises = projectTasks.map(task => apiGetSurveySubmissionsForTask(task.id));
                    const submissionsByTask = await Promise.all(submissionPromises);
                    const allSubmissions = submissionsByTask.flat();
                    setSurveySubmissions(allSubmissions);
                } else {
                    setLinkedSurvey(null);
                    setSurveySubmissions([]); // Clear submissions if no survey
                }
            }
        } catch (error) {
            addNotification("Failed to load project details.", "error");
        } finally {
             if (isLoading) setIsLoading(false); // Only turn off main loader on first load
        }
    }, [projectId, addNotification, isLoading]);

    useEffect(() => {
        setIsLoading(true);
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]); // Depend only on projectId for the initial fetch

    const projectTaskLists = useMemo(() => {
        if (!projectId) return [];
        return taskLists
            .filter(list => list.projectId === projectId)
            .sort((a, b) => a.order - b.order);
    }, [taskLists, projectId]);

    const projectListIds = useMemo(() => new Set(projectTaskLists.map(l => l.id)), [projectTaskLists]);

    const uncategorizedTasks = useMemo(() => {
        return tasks.filter(task => !task.listId || !projectListIds.has(task.listId));
    }, [tasks, projectListIds]);

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData("taskId", taskId);
    };

    const handleDropOnList = async (e: React.DragEvent, newListId: string | null) => {
        if (!user) {
            addNotification("You must be logged in to update tasks.", "error");
            return;
        }
        const taskId = e.dataTransfer.getData("taskId");
        const taskToMove = tasks.find(t => t.id === taskId);
        setDraggedOverListId(null);

        const currentListId = taskToMove?.listId || null;
        const targetListId = newListId || null;

        if (taskToMove && currentListId !== targetListId) {
            try {
                await apiUpdateTask({ id: taskId, listId: newListId || undefined }, user.id);
                addNotification(`Task "${taskToMove.title}" moved to a new group.`, "success");
                fetchData();
            } catch (error) {
                addNotification("Failed to update task group.", "error");
            }
        }
    };
    
    const taskStatusData = useMemo(() => Object.values(TaskStatus).map(status => ({
        name: status,
        value: tasks.filter(t => t.status === status).length
    })).filter(item => item.value > 0), [tasks]);
    
    const handleModalSuccess = () => {
        setIsProjectModalOpen(false);
        setIsTaskModalOpen(false);
        setIsManageListsModalOpen(false);
        fetchData();
    };

    const handleDeleteProject = async () => {
        if (!project) return;
        const confirmed = await showConfirmation({
          title: 'Delete Project',
          message: `Are you sure you want to delete project "${project.name}"? This action cannot be undone.`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          confirmVariant: 'danger',
        });
        if (confirmed) {
            try {
                await apiDeleteProject(project.id);
                addNotification("Project deleted successfully.", "success");
                navigate('/projects');
            } catch (error) {
                addNotification(`Failed to delete project: ${(error as Error).message}`, "error");
            }
        }
    };

    const handleCopySurveyUrl = () => {
        if (project && project.surveyId) {
            const url = `${window.location.origin}/#/take-survey/${project.surveyId}?projectId=${project.id}`;
            navigator.clipboard.writeText(url);
            addNotification("Survey URL copied to clipboard!", "success");
        }
    };

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

    if (isLoading) return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
    if (!project) return <div className="p-8 text-center text-xl text-red-600">Project not found. <Link to="/projects" className="text-primary-action hover:underline">Go back to list</Link></div>;

    const tasksToDo = tasks.filter(t => t.status === TaskStatus.TO_DO).length;
    const tasksInProgress = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
    const tasksCompleted = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;

    return (
        <div className="space-y-6">
            <div className="p-6 bg-container-bg dark:bg-slate-800 shadow-md rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex flex-wrap justify-between items-start mb-2">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">{project.name}</h1>
                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        {hasPermission(Permission.EDIT_PROJECT) && (
                            <Button onClick={() => setIsProjectModalOpen(true)} variant="primary" size="sm">Edit Project</Button>
                        )}
                        {hasPermission(Permission.DELETE_PROJECT) && (
                            <Button onClick={handleDeleteProject} variant="danger" size="sm">Delete Project</Button>
                        )}
                        <Link to="/projects" className="text-sm text-primary-action hover:underline">&larr; Back</Link>
                    </div>
                </div>
                <p className="text-gray-600 dark:text-slate-300 mt-1">{project.description}</p>
                 {project.surveyId && linkedSurvey && (
                    <div className="mt-3 flex items-center gap-4">
                        <Link to={`/surveys/${project.surveyId}`} className="text-sm font-medium text-indigo-600 hover:underline">
                            View Project Survey: {linkedSurvey.title}
                        </Link>
                        <Button onClick={handleCopySurveyUrl} variant="secondary" size="sm" className="!py-1">Copy Public URL</Button>
                    </div>
                )}
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-slate-400">
                    <span><strong>Client:</strong> {client?.name || 'N/A'}</span>
                    <span><strong>Business:</strong> {business?.name || 'N/A'}</span>
                    <span><strong>Status:</strong> <span className={`font-semibold ${(STATUS_COLORS[project.status] || '').replace('bg-', 'text-')}`}>{project.status}</span></span>
                    <span><strong>Start Date:</strong> {project.startDate ? new Date(project.startDate + 'T00:00:00').toLocaleDateString('en-CA') : 'N/A'}</span>
                    <span><strong>End Date:</strong> {project.endDate ? new Date(project.endDate + 'T00:00:00').toLocaleDateString('en-CA') : 'N/A'}</span>
                </div>
            </div>

            <div className="border-b border-gray-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-8">
                    <button onClick={() => setActiveTab('overview')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-primary-action text-primary-action' : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700'}`}>Overview</button>
                    <button onClick={() => setActiveTab('tasks')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'tasks' ? 'border-primary-action text-primary-action' : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700'}`}>Tasks ({tasks.length})</button>
                </nav>
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatDisplayCard title="Total Tasks" value={tasks.length} colorClass="bg-blue-500 text-white" />
                        <StatDisplayCard title="Completed" value={tasksCompleted} colorClass="bg-status-success text-white" />
                        <StatDisplayCard title="Open Tasks" value={tasksToDo + tasksInProgress} colorClass="bg-status-warning text-white" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="p-6 bg-white dark:bg-slate-800 shadow rounded-lg border border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-semibold mb-4">Task Status Distribution</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={taskStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                        {taskStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={STATUS_CHART_COLORS[entry.name as TaskStatus]} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="p-6 bg-white dark:bg-slate-800 shadow rounded-lg border border-slate-200 dark:border-slate-700">
                            <h3 className="text-lg font-semibold mb-4">Team Members</h3>
                            <ul className="space-y-3">
                                {project.memberIds.map(id => {
                                    const member = users.find(u => u.id === id);
                                    return <li key={id} className="text-gray-700 dark:text-slate-200">{member?.name || 'Unknown User'} ({member?.role})</li>
                                })}
                            </ul>
                        </div>
                    </div>
                    
                    {linkedSurvey && surveySubmissions.length > 0 && (
                        <div className="border-t pt-4 mt-6">
                            <h3 className="text-lg font-semibold text-text-secondary dark:text-slate-300">Project Survey Submissions ({surveySubmissions.length})</h3>
                            <p className="text-sm text-text-secondary dark:text-slate-400 mb-2">Showing all submissions from tasks within this project.</p>
                            <div className="mt-2 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700">
                                <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                                    {surveySubmissions.map(sub => (
                                        <Link
                                            to={`/surveys/submission/${sub.id}`}
                                            key={sub.id}
                                            className="block p-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            <p className="text-xs text-text-secondary dark:text-slate-400 mb-2">Submitted for Task {sub.taskId} at: {new Date(sub.submittedAt).toLocaleString('en-GB')}</p>
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
                            <h3 className="text-lg font-semibold text-text-secondary dark:text-slate-300">Project Survey Submissions</h3>
                            <div className="mt-2 p-4 text-center text-text-secondary dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700">
                                No survey responses have been submitted for tasks in this project yet.
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'tasks' && (
                <>
                <div className="text-right mb-4 flex justify-end gap-2">
                     {hasPermission(Permission.CREATE_TASK) && 
                        <Button onClick={() => setIsManageListsModalOpen(true)} variant="secondary" size="sm">Manage Groups</Button>
                    }
                    {hasPermission(Permission.CREATE_TASK) && 
                        <Button onClick={() => setIsTaskModalOpen(true)} variant="primary" size="sm">+ Add Task</Button>
                    }
                </div>
                <div className="flex gap-5 overflow-x-auto pb-4 -mx-6 px-6">
                    {/* Uncategorized Column */}
                    <div 
                        className={`flex-shrink-0 w-80 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl transition-colors ${draggedOverListId === 'uncategorized' ? 'bg-slate-200 dark:bg-slate-800 ring-2 ring-primary-action' : ''}`}
                        onDrop={(e) => handleDropOnList(e, null)}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnter={() => setDraggedOverListId('uncategorized')}
                        onDragLeave={() => setDraggedOverListId(null)}
                    >
                        <h3 className="font-semibold mb-4 text-gray-700 dark:text-slate-300 pb-2 flex justify-between uppercase text-sm tracking-wider">
                            <span>Uncategorized</span>
                            <span className="bg-slate-200 dark:bg-slate-700 text-xs font-normal px-2 py-0.5 rounded-full">{uncategorizedTasks.length}</span>
                        </h3>
                        <div className="space-y-3 min-h-[200px] max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                            {uncategorizedTasks.map(task => (
                                <KanbanCard key={task.id} task={task} users={users} onDragStart={handleDragStart} />
                            ))}
                        </div>
                    </div>

                    {/* Columns for each TaskList */}
                    {projectTaskLists.map(list => {
                        const listTasks = tasks.filter(t => t.listId === list.id);
                        return (
                            <div key={list.id}
                                className={`flex-shrink-0 w-80 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl transition-colors ${draggedOverListId === list.id ? 'bg-slate-200 dark:bg-slate-800 ring-2 ring-primary-action' : ''}`}
                                onDrop={(e) => handleDropOnList(e, list.id)}
                                onDragOver={(e) => e.preventDefault()}
                                onDragEnter={() => setDraggedOverListId(list.id)}
                                onDragLeave={() => setDraggedOverListId(null)}
                            >
                                <h3 className="font-semibold mb-4 text-gray-700 dark:text-slate-300 pb-2 flex justify-between uppercase text-sm tracking-wider">
                                    <span>{list.title}</span>
                                    <span className="bg-slate-200 dark:bg-slate-700 text-xs font-normal px-2 py-0.5 rounded-full">{listTasks.length}</span>
                                </h3>
                                <div className="space-y-3 min-h-[200px] max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                                    {listTasks.map(task => (
                                        <KanbanCard key={task.id} task={task} users={users} onDragStart={handleDragStart} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
                </>
            )}
            
             {isProjectModalOpen && hasPermission(Permission.EDIT_PROJECT) && (
                <AddEditProjectModal
                    isOpen={isProjectModalOpen}
                    onClose={() => setIsProjectModalOpen(false)}
                    onSuccess={handleModalSuccess}
                    existingProject={project}
                />
            )}
            {isTaskModalOpen && user && hasPermission(Permission.CREATE_TASK) && (
                <CreateEditTaskModal
                    isOpen={isTaskModalOpen}
                    onClose={() => setIsTaskModalOpen(false)}
                    onTaskSaved={handleModalSuccess}
                    users={users}
                    loggedInUserId={user.id}
                    defaultProjectId={project.id}
                    taskLists={taskLists}
                />
            )}
            {isManageListsModalOpen && (
                <ManageTaskListsModal
                    isOpen={isManageListsModalOpen}
                    onClose={() => setIsManageListsModalOpen(false)}
                    onSuccess={handleModalSuccess}
                    taskLists={taskLists}
                    projectId={projectId}
                />
            )}
        </div>
    );
};

export default ProjectDetailPage;
