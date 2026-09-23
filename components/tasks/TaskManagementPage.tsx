

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Task, TaskStatus, TaskPriority, User, Permission, Project, TaskList, Client, Business, HierarchicalTask } from '../../types';
import { apiGetTasks, apiGetUsers, apiUpdateTask, apiGetProjects, apiDeleteTask, apiGetTaskLists, apiGetClients, apiGetBusinesses } from '../../services/api';
import Button from '../ui/Button';
import CreateEditTaskModal from './CreateEditTaskModal';
import Spinner from '../ui/Spinner';
import Select from '../ui/Select';
import Input from '../ui/Input';
import { STATUS_COLORS, PRIORITY_COLORS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import TaskCard from './TaskCard';
import { useNotification } from '../../hooks/useNotification';
import ManageTaskListsModal from './ManageTaskListsModal'; 
import SearchableSelect from '../ui/SearchableSelect';

// --- ICONS ---
const TableIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>;
const CardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25A2.25 2.25 0 0 1 13.5 8.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>;
const KanbanIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5-13.5h16.5M3.75 6h16.5M3.75 9.75h16.5" /></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>;

// --- TYPES & INTERFACES ---
type ViewMode = 'table' | 'card' | 'kanban' | 'calendar';
interface KanbanColumn { id: TaskStatus; title: string; tasks: Task[]; }
const KANBAN_COLUMNS: TaskStatus[] = [TaskStatus.TO_DO, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED];

// --- Calendar View Component ---
const TaskCalendar: React.FC<{ tasks: Task[], onDateChange: (date: Date) => void, currentDate: Date }> = ({ tasks, onDateChange, currentDate }) => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const cells = [];
    for(let i=0; i < firstDayOfMonth; i++) {
        cells.push(<div key={`empty-${i}`} className="border-t border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"></div>);
    }
    for(let day=1; day<=daysInMonth; day++){
        const cellDate = new Date(year, month, day);
        // FIX: Generate YYYY-MM-DD string from local date parts to avoid timezone conversion issues.
        const y = cellDate.getFullYear();
        const m = String(cellDate.getMonth() + 1).padStart(2, '0');
        const d = String(cellDate.getDate()).padStart(2, '0');
        const cellDateStr = `${y}-${m}-${d}`;

        const dayTasks = tasks.filter(task => task.dueDate === cellDateStr);
        const isToday = cellDate.getTime() === today.getTime();
        cells.push(
            <div key={day} className="border-t border-r border-slate-200 dark:border-slate-700 p-1 min-h-[120px] relative flex flex-col">
                <span className={`font-semibold text-xs self-end ${isToday ? 'bg-primary-action text-white rounded-full w-5 h-5 flex items-center justify-center' : 'text-slate-600 dark:text-slate-300'}`}>{day}</span>
                <div className="flex-grow space-y-1 mt-1 overflow-y-auto custom-scrollbar">
                    {dayTasks.map(task => {
                        const priorityColorClass =
                            task.priority === TaskPriority.HIGH ? 'bg-status-danger' :
                            task.priority === TaskPriority.MEDIUM ? 'bg-status-warning' :
                            'bg-status-info';
                        
                        const completedClass = task.status === TaskStatus.COMPLETED ? 'line-through opacity-70' : '';
                        
                        return (
                            <Link 
                                to={`/tasks/${task.id}`} 
                                key={task.id} 
                                title={task.title} 
                                className={`block text-white text-[10px] p-1 rounded-md overflow-hidden ${priorityColorClass} ${completedClass}`}
                            >
                                <span className="font-semibold truncate block">{task.title}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-lg">
            <div className="grid grid-cols-7 border-l border-b border-slate-200 dark:border-slate-700">
                {daysOfWeek.map(day => <div key={day} className="text-center font-bold text-xs p-2 border-r border-t border-slate-200 dark:border-slate-700">{day}</div>)}
                {cells}
            </div>
        </div>
    );
};


const TaskManagementPage: React.FC = () => {
  const { user: loggedInUser, hasPermission } = useAuth();
  const { addNotification } = useNotification();
  const location = useLocation();
  const isMyTasksView = location.pathname === '/my-tasks';
  
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const taskTypeFilter = queryParams.get('type');

  // --- STATE MANAGEMENT ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Filtering
  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | ''>('');
  const [filterProjectId, setFilterProjectId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAssignee, setFilterAssignee] = useState<string>('');
  const [filterClient, setFilterClient] = useState<string>('');

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [draggedOverColumn, setDraggedOverColumn] = useState<TaskStatus | null>(null);
  const [isManageListsModalOpen, setIsManageListsModalOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const ITEMS_PER_PAGE = 50;
  const [currentPage, setCurrentPage] = useState(1);


  // --- DATA FETCHING ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedTasks, fetchedUsers, fetchedProjects, fetchedTaskLists, fetchedClients, fetchedBusinesses] = await Promise.all([
        apiGetTasks(), apiGetUsers(), apiGetProjects(), apiGetTaskLists(), apiGetClients(), apiGetBusinesses()
      ]);
      setUsers(fetchedUsers);
      setProjects(fetchedProjects);
      setTaskLists(fetchedTaskLists);
      setClients(fetchedClients);
      setBusinesses(fetchedBusinesses);
      setTasks(fetchedTasks);
      setExpandedTasks(new Set(fetchedTasks.filter(t => fetchedTasks.some(child => child.parentId === t.id)).map(t => t.id)));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addNotification(`Failed to load tasks: ${errorMessage}`, "error");
      console.error("Failed to load tasks:", error);
    }
    setIsLoading(false);
  }, [addNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (isMyTasksView && loggedInUser) {
        setFilterAssignee(loggedInUser.id);
    } else {
        setFilterAssignee('');
    }
  }, [isMyTasksView, loggedInUser]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
        const statusMatch = !filterStatus || task.status === filterStatus;
        const priorityMatch = !filterPriority || task.priority === filterPriority;
        const assigneeMatch = !filterAssignee || (task.assigneeIds && task.assigneeIds.includes(filterAssignee));
        const projectMatch = !filterProjectId || task.projectId === filterProjectId;
        const clientMatch = !filterClient || task.clientId === filterClient || task.businessId === filterClient;
      
        const lowerSearchTerm = searchTerm.toLowerCase();
        const searchMatch = !searchTerm || 
          task.title.toLowerCase().includes(lowerSearchTerm) ||
          task.id.toLowerCase().includes(lowerSearchTerm);

        // Task Type Filter
        let typeMatch = task.taskType === 'General' || task.taskType === undefined;

        let myTasksMatch = true;
        if (isMyTasksView && loggedInUser) {
            myTasksMatch = task.assigneeIds?.includes(loggedInUser.id) || task.createdByUserId === loggedInUser.id;
        }
        
        return statusMatch && priorityMatch && assigneeMatch && projectMatch && clientMatch && searchMatch && typeMatch && myTasksMatch;
    });
  }, [tasks, filterStatus, filterPriority, filterAssignee, filterProjectId, filterClient, searchTerm, taskTypeFilter, isMyTasksView, loggedInUser]);
  
  const buildTaskTree = (tasks: Task[]): HierarchicalTask[] => {
    const taskMap = new Map<string, HierarchicalTask>();
    const rootTasks: HierarchicalTask[] = [];

    tasks.forEach(task => {
        taskMap.set(task.id, { ...task, children: [], level: 0 });
    });

    tasks.forEach(task => {
        if (task.parentId && taskMap.has(task.parentId)) {
            const parent = taskMap.get(task.parentId)!;
            const child = taskMap.get(task.id)!;
            child.level = parent.level + 1;
            parent.children.push(child);
        } else {
            rootTasks.push(taskMap.get(task.id)!);
        }
    });
    return rootTasks;
  };
  
  const hierarchicalTasks = useMemo(() => buildTaskTree(filteredTasks), [filteredTasks]);

  const totalPages = Math.max(1, Math.ceil(hierarchicalTasks.length / ITEMS_PER_PAGE));
  const paginatedRootTasks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return hierarchicalTasks.slice(start, start + ITEMS_PER_PAGE);
  }, [hierarchicalTasks, currentPage]);

  useEffect(() => {
    setCurrentPage(p => Math.min(p, totalPages));
  }, [totalPages]);
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterPriority, filterAssignee, filterProjectId, filterClient, searchTerm]);

  const taskKpis = useMemo(() => {
    const completed = filteredTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const inProgress = filteredTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
    const toDo = filteredTasks.filter(t => t.status === TaskStatus.TO_DO).length;
    return { total: filteredTasks.length, completed, inProgress, toDo };
  }, [filteredTasks]);

  // Kanban Columns
  const columns = useMemo((): KanbanColumn[] => 
      KANBAN_COLUMNS.map(status => ({
          id: status,
          title: status,
          tasks: filteredTasks.filter(task => task.status === status),
      })), [filteredTasks]);
  

  const handleModalSuccess = () => {
    fetchData(); 
    setIsModalOpen(false);
    setEditingTask(null);
  };
  
  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus || !loggedInUser) return;
    
    try {
        await apiUpdateTask({ id: taskId, status: newStatus }, loggedInUser.id, [], []);
        addNotification(`Task "${task.title}" status updated to ${newStatus}.`, "success");
        fetchData();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        addNotification(`Failed to update task status: ${errorMessage}`, "error");
        console.error("Failed to update task status:", error);
    }
  };

  const onDragStart = (event: React.DragEvent<HTMLDivElement>, taskId: string) => {
    event.dataTransfer.setData("taskId", taskId);
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const onDragEnter = (status: TaskStatus) => setDraggedOverColumn(status);
  const onDragLeave = () => setDraggedOverColumn(null);
  const onDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: TaskStatus) => {
    const taskId = e.dataTransfer.getData("taskId");
    setDraggedOverColumn(null);
    if (taskId) {
      handleUpdateTaskStatus(taskId, newStatus);
    }
  };

  const handleToggleExpansion = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const getClientOrBusinessName = useCallback((clientId?: string, businessId?: string): string => {
    if (clientId) return clients.find(c => c.id === clientId)?.name || '';
    if (businessId) return businesses.find(b => b.id === businessId)?.name || '';
    return '';
  }, [clients, businesses]);

  const pageTitle = isMyTasksView ? 'My Tasks' : 'Task Management';

  const renderHierarchicalRows = (tasksToRender: HierarchicalTask[]) => {
    const rows: JSX.Element[] = [];
    
    function traverse(task: HierarchicalTask, isVisible: boolean) {
        if (isVisible) {
            const hasChildren = task.children.length > 0;
            const isExpanded = expandedTasks.has(task.id);
            rows.push(
            <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-text-primary dark:text-slate-200">
                    <div style={{ paddingLeft: `${task.level * 20}px` }} className="flex items-center">
                         {hasChildren ? (
                            <button onClick={() => handleToggleExpansion(task.id)} className="mr-1 text-gray-400 p-0.5 rounded-full">
                                {isExpanded ? '▾' : '▸'}
                            </button>
                        ) : <span className="w-5 mr-1 inline-block"></span>}
                        <Link to={`/tasks/${task.id}`} className="hover:underline">{task.title}</Link>
                    </div>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400 truncate max-w-xs">{users.filter(u => task.assigneeIds?.includes(u.id)).map(u => u.name).join(', ') || 'N/A'}</td>
                <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400">{getClientOrBusinessName(task.clientId, task.businessId) || 'N/A'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">{task.dueDate ? new Date(task.dueDate + 'T00:00:00').toLocaleDateString() : 'N/A'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm"><span className={`font-medium ${PRIORITY_COLORS[task.priority]?.replace('border-', 'text-')}`}>{task.priority}</span></td>
                <td className="px-4 py-3 whitespace-nowrap text-sm"><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[task.status]}`}>{task.status}</span></td>
                <td className="px-4 py-3 whitespace-nowrap text-sm space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingTask(task); setIsModalOpen(true); }}>Edit</Button>
                </td>
            </tr>
            );

            if (hasChildren) {
                task.children.forEach(child => traverse(child, isExpanded));
            }
        }
    }
    tasksToRender.forEach(task => traverse(task, true));
    return rows;
  };
  
  const handleMonthChange = (months: number) => {
    setCalendarDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(prev.getMonth() + months, 1);
        return newDate;
    });
  };

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">{pageTitle}</h1>
        <div className="flex items-center gap-2">
            {hasPermission(Permission.CREATE_TASK) && (
            <Button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} variant="primary" size="sm">+ New Task</Button>
            )}
            {hasPermission(Permission.CREATE_TASK) && !isMyTasksView && (
                <Button onClick={() => setIsManageListsModalOpen(true)} variant="secondary" size="sm">Manage Groups</Button>
            )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">Total Tasks</p>
          <p className="text-2xl font-bold text-text-primary dark:text-slate-100">{taskKpis.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">To Do</p>
          <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">{taskKpis.toDo}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">In Progress</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{taskKpis.inProgress}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">Completed</p>
          <p className="text-2xl font-bold text-status-success">{taskKpis.completed}</p>
        </div>
      </div>

      <div className="mb-6 p-4 bg-container-bg dark:bg-slate-800 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <Input placeholder="Search ID or Title..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} containerClassName="mb-0"/>
            <Select label="Status" value={filterStatus} onChange={e => setFilterStatus(e.target.value as TaskStatus | '')} options={[{ value: '', label: 'All Statuses' }, ...Object.values(TaskStatus).map(s => ({ value: s, label: s }))]} containerClassName="mb-0" />
            <Select label="Priority" value={filterPriority} onChange={e => setFilterPriority(e.target.value as TaskPriority | '')} options={[{ value: '', label: 'All Priorities' }, ...Object.values(TaskPriority).map(p => ({ value: p, label: p }))]} containerClassName="mb-0" />
            {!isMyTasksView && hasPermission(Permission.VIEW_ALL_TASKS) && (
              <Select label="Assignee" value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} options={[{ value: '', label: 'All Assignees' }, ...users.map(u => ({ value: u.id, label: u.name }))]} containerClassName="mb-0" />
            )}
        </div>
        <div className="mt-4 pt-4 border-t flex flex-wrap justify-between items-center gap-3">
            <span className="text-sm text-text-secondary">{filteredTasks.length} tasks found</span>
            {viewMode === 'table' && filteredTasks.length > ITEMS_PER_PAGE && (
              <nav className="flex items-center gap-1" aria-label="Pagination">
                <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>Previous</Button>
                <span className="text-sm px-2">Page {currentPage} of {totalPages}</span>
                <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</Button>
              </nav>
            )}
            <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 p-1 rounded-md">
                <Button variant={viewMode === 'table' ? "primary" : "ghost"} onClick={() => setViewMode('table')} size="sm" leftIcon={<TableIcon />} className="!px-3 !py-1.5"/>
                <Button variant={viewMode === 'card' ? "primary" : "ghost"} onClick={() => setViewMode('card')} size="sm" leftIcon={<CardIcon />} className="!px-3 !py-1.5"/>
                <Button variant={viewMode === 'kanban' ? "primary" : "ghost"} onClick={() => setViewMode('kanban')} size="sm" leftIcon={<KanbanIcon />} className="!px-3 !py-1.5"/>
                <Button variant={viewMode === 'calendar' ? "primary" : "ghost"} onClick={() => setViewMode('calendar')} size="sm" leftIcon={<CalendarIcon />} className="!px-3 !py-1.5"/>
            </div>
        </div>
      </div>
      
      {isLoading ? <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div> : 
      !filteredTasks.length ? <p className="text-center text-text-secondary py-8">No tasks match your filters.</p> :
      (() => {
        switch(viewMode) {
          case 'table':
            return (
              <>
                <div className="flex justify-between items-center mb-3 text-sm text-text-secondary dark:text-slate-400">
                  <span>Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, hierarchicalTasks.length)} of {hierarchicalTasks.length} tasks</span>
                </div>
                <div className="bg-container-bg shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-100 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Title</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Assignees</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Client/Business</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Due Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Priority</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {renderHierarchicalRows(paginatedRootTasks)}
                        </tbody>
                    </table>
                </div>
              </>
            );
          case 'card':
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                    {filteredTasks.map(task => (
                        <TaskCard
                            key={task.id} task={task} users={users} projects={projects} clients={clients} businesses={businesses}
                            level={0} hasChildren={false} isExpanded={false} onToggleExpansion={() => {}}
                            onEdit={(t) => { setEditingTask(t); setIsModalOpen(true); }}
                            onDelete={(t) => alert("Delete not implemented in this view")}
                        />
                    ))}
                </div>
            );
          case 'kanban':
            return (
                <div className="flex gap-5 overflow-x-auto pb-4 -mx-6 px-6">
                    {columns.map(column => (
                        <div key={column.id} className={`flex-shrink-0 w-80 p-4 bg-slate-100 dark:bg-slate-900/50 rounded-xl transition-colors ${draggedOverColumn === column.id ? 'bg-slate-200 dark:bg-slate-800' : ''}`}
                             onDragOver={onDragOver} onDrop={(e) => onDrop(e, column.id)} onDragEnter={() => onDragEnter(column.id)} onDragLeave={onDragLeave}>
                            <h3 className="font-semibold mb-4 text-gray-700 dark:text-slate-300 pb-2 flex justify-between uppercase text-sm tracking-wider">
                                <span>{column.title}</span>
                                <span className="bg-slate-200 dark:bg-slate-700 text-xs font-normal px-2 py-0.5 rounded-full">{column.tasks.length}</span>
                            </h3>
                            <div className="space-y-3 min-h-[200px] max-h-[65vh] overflow-y-auto custom-scrollbar pr-1">
                                {column.tasks.map(task => (
                                    <TaskCard
                                        key={task.id} task={task} users={users} projects={projects} clients={clients} businesses={businesses}
                                        level={0} hasChildren={false} isExpanded={false} onToggleExpansion={() => {}}
                                        onEdit={(t) => { setEditingTask(t); setIsModalOpen(true); }}
                                        onDelete={(t) => alert("Delete not implemented in this view")}
                                        onDragStart={onDragStart}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            );
          case 'calendar':
            return (
                 <div>
                    <div className="flex justify-center items-center mb-4 gap-4">
                        <Button onClick={() => handleMonthChange(-1)} variant="secondary">&lt; Prev Month</Button>
                        <h2 className="text-xl font-semibold">{calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                        <Button onClick={() => handleMonthChange(1)} variant="secondary">Next Month &gt;</Button>
                    </div>
                    <TaskCalendar tasks={filteredTasks.filter(t => t.dueDate)} currentDate={calendarDate} onDateChange={setCalendarDate}/>
                </div>
            );
          default:
            return null;
        }
      })()}

      {isModalOpen && loggedInUser && (
        <CreateEditTaskModal
            isOpen={isModalOpen}
            onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
            onTaskSaved={handleModalSuccess}
            users={users}
            loggedInUserId={loggedInUser.id}
            editingTask={editingTask}
            taskLists={taskLists}
            defaultTaskType="General"
        />
      )}
    </div>
  );
};

export default TaskManagementPage;