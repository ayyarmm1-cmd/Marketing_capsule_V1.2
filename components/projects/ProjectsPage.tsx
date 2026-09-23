import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Project, ProjectStatus, Client, User, Permission, Task, TaskStatus } from '../../types';
import { apiGetProjects, apiGetClients, apiGetUsers, apiDeleteProject, apiGetTasks } from '../../services/api';
import ProjectCard from './ProjectCard';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import AddEditProjectModal from './AddEditProjectModal';
import { STATUS_COLORS } from '../../constants';

type ViewMode = 'card' | 'table' | 'calendar';

const TableIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>;
const CardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>;

// --- Reusable Calendar View Component ---
interface CalendarEvent {
  id: string;
  startDate: string;
  endDate: string;
  title: string;
  link?: string;
  colorClass: string;
}

const CalendarComponent: React.FC<{
    events: CalendarEvent[];
}> = ({ events }) => {
    const [view, setView] = useState<'month' | 'week' | 'day'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());

    const goToPrevious = () => {
        if (view === 'month') setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
        if (view === 'week') setCurrentDate(prev => new Date(prev.setDate(prev.getDate() - 7)));
        if (view === 'day') setCurrentDate(prev => new Date(prev.setDate(prev.getDate() - 1)));
    };
    const goToNext = () => {
        if (view === 'month') setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
        if (view === 'week') setCurrentDate(prev => new Date(prev.setDate(prev.getDate() + 7)));
        if (view === 'day') setCurrentDate(prev => new Date(prev.setDate(prev.getDate() + 1)));
    };
    const goToToday = () => setCurrentDate(new Date());

    const renderHeader = () => {
        let title = '';
        if (view === 'month') title = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (view === 'day') title = currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        if (view === 'week') {
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);
            title = `${startOfWeek.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }

        return (
            <div className="flex justify-between items-center mb-4 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                    <Button size="sm" onClick={goToPrevious}>&lt;</Button>
                    <Button size="sm" onClick={goToNext}>&gt;</Button>
                    <Button size="sm" variant="secondary" onClick={goToToday}>Today</Button>
                </div>
                <h3 className="text-xl font-semibold text-text-primary dark:text-slate-100">{title}</h3>
                <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 p-1 rounded-md">
                    <Button size="sm" variant={view === 'month' ? 'primary' : 'ghost'} onClick={() => setView('month')} className="!px-3 !py-1">Month</Button>
                    <Button size="sm" variant={view === 'week' ? 'primary' : 'ghost'} onClick={() => setView('week')} className="!px-3 !py-1">Week</Button>
                    <Button size="sm" variant={view === 'day' ? 'primary' : 'ghost'} onClick={() => setView('day')} className="!px-3 !py-1">Day</Button>
                </div>
            </div>
        );
    };
    
    const renderMonthView = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const cells = [];
        for (let i = 0; i < firstDayOfMonth; i++) cells.push(<div key={`empty-start-${i}`} className="border p-2 bg-gray-50 dark:bg-slate-800/50"></div>);
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            date.setHours(0,0,0,0);
            const dayEvents = events.filter(e => new Date(e.startDate+'T00:00:00') <= date && new Date(e.endDate+'T00:00:00') >= date);
            cells.push(
                <div key={day} className="border p-2 min-h-[120px] relative bg-white dark:bg-slate-800">
                    <div className="font-bold text-sm text-gray-700 dark:text-slate-300">{day}</div>
                    <div className="mt-1 space-y-1">{dayEvents.map(e => <Link to={e.link || '#'} key={e.id}><div className={`text-xs p-1 rounded truncate ${e.colorClass}`}>{e.title}</div></Link>)}</div>
                </div>
            );
        }
        return <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 border dark:border-slate-700">{cells}</div>;
    };
    
    const renderWeekView = () => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const days = Array.from({length: 7}, (_, i) => new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i));
        return (
            <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 border dark:border-slate-700">
                {days.map(day => {
                    day.setHours(0,0,0,0);
                    const dayEvents = events.filter(e => new Date(e.startDate+'T00:00:00') <= day && new Date(e.endDate+'T00:00:00') >= day);
                    return (
                        <div key={day.toISOString()} className="p-2 min-h-[200px] bg-white dark:bg-slate-800">
                             <div className="font-bold text-sm text-center pb-2 border-b">{day.toLocaleDateString('default', {weekday: 'short'})} {day.getDate()}</div>
                             <div className="mt-2 space-y-1">{dayEvents.map(e => <Link to={e.link || '#'} key={e.id}><div className={`text-xs p-1 rounded truncate ${e.colorClass}`}>{e.title}</div></Link>)}</div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderDayView = () => {
        const day = new Date(currentDate);
        day.setHours(0,0,0,0);
        const dayEvents = events.filter(e => new Date(e.startDate+'T00:00:00') <= day && new Date(e.endDate+'T00:00:00') >= day);
        return (
            <div className="p-4 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg">
                <div className="mt-2 space-y-2">
                    {dayEvents.length > 0 ? dayEvents.map(e => (
                        <Link to={e.link || '#'} key={e.id} className={`block p-3 rounded ${e.colorClass}`}>{e.title}</Link>
                    )) : <p className="text-center text-text-secondary dark:text-slate-400 py-8">No projects scheduled for this day.</p>}
                </div>
            </div>
        );
    };


    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-700">
            {renderHeader()}
            {view === 'month' && renderMonthView()}
            {view === 'week' && renderWeekView()}
            {view === 'day' && renderDayView()}
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
const ProjectsPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | ''>('');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const ITEMS_PER_PAGE = 50;
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedProjects, fetchedClients, fetchedUsers, fetchedTasks] = await Promise.all([
        apiGetProjects(), apiGetClients(), apiGetUsers(), apiGetTasks(),
      ]);
      
      let viewableProjects = fetchedProjects;
      if (user && !hasPermission(Permission.VIEW_ALL_PROJECTS)) {
        viewableProjects = fetchedProjects.filter(p => p.memberIds.includes(user.id) || p.teamLeadId === user.id);
      }
      setProjects(viewableProjects);
      setTasks(fetchedTasks);
      setClients(fetchedClients);
      setUsers(fetchedUsers);
    } catch (error) {
      addNotification("Failed to load project data.", "error");
    }
    setIsLoading(false);
  }, [addNotification, user, hasPermission]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleModalSuccess = () => {
    fetchData();
    setIsModalOpen(false);
    setEditingProject(null);
  };
  
  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };
  const handleDeleteProject = async (project: Project) => {
    const confirmed = await showConfirmation({
      title: 'Delete Project',
      message: `Are you sure you want to delete project "${project.name}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });
    if (confirmed) {
      try {
        await apiDeleteProject(project.id);
        addNotification(`Project "${project.name}" deleted successfully.`, "success");
        fetchData();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        addNotification(`Failed to delete project: ${errorMessage}`, "error");
        console.error("Failed to delete project:", error);
      }
    }
  };

  const filteredProjects = useMemo(() => {
    const calculatedProjects = projects.map(project => {
        const projectTasks = tasks.filter(t => t.projectId === project.id);
        const completedTasks = projectTasks.filter(t => t.status === TaskStatus.COMPLETED);
        const progress = projectTasks.length > 0 ? Math.round((completedTasks.length / projectTasks.length) * 100) : 0;
        return { ...project, progress };
    });
    return calculatedProjects.filter(p => 
        (!filterStatus || p.status === filterStatus) &&
        (!searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [projects, tasks, filterStatus, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / ITEMS_PER_PAGE));
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProjects.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProjects, currentPage]);

  useEffect(() => {
    setCurrentPage(p => Math.min(p, totalPages));
  }, [totalPages]);
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm]);

  const projectKpis = useMemo(() => {
    const byStatus = filteredProjects.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return { total: filteredProjects.length, byStatus };
  }, [filteredProjects]);
  
  const calendarEvents = useMemo(() => {
    return filteredProjects
        .filter(p => p.startDate && p.endDate)
        .map(p => ({
            id: p.id,
            startDate: p.startDate!,
            endDate: p.endDate!,
            title: p.name,
            link: `/projects/${p.id}`,
            colorClass: 'bg-indigo-500 text-white',
        }));
    }, [filteredProjects]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Projects Dashboard</h1>
        {hasPermission(Permission.CREATE_PROJECT) && (
          <Button onClick={() => { setEditingProject(null); setIsModalOpen(true); }} variant="primary">+ New Project</Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">Total Projects</p>
          <p className="text-2xl font-bold text-text-primary dark:text-slate-100">{projectKpis.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">Active</p>
          <p className="text-2xl font-bold text-status-success">{(projectKpis.byStatus[ProjectStatus.ACTIVE] || 0)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <p className="text-sm text-text-secondary dark:text-slate-400">Completed</p>
          <p className="text-2xl font-bold text-text-primary dark:text-slate-100">{(projectKpis.byStatus[ProjectStatus.COMPLETED] || 0)}</p>
        </div>
      </div>

      <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <Input label="Search Projects" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <Select label="Filter by Status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as ProjectStatus | '')}
            options={[{ value: '', label: 'All Statuses' }, ...Object.values(ProjectStatus).map(s => ({ value: s, label: s }))]} />
        </div>
        <div className="mt-4 flex justify-end">
            <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 p-1 rounded-md">
                <Button variant={viewMode === 'card' ? 'primary' : 'ghost'} onClick={() => setViewMode('card')} size="sm" leftIcon={<CardIcon />} className="!px-3 !py-1.5" aria-label="Card View"/>
                <Button variant={viewMode === 'table' ? 'primary' : 'ghost'} onClick={() => setViewMode('table')} size="sm" leftIcon={<TableIcon />} className="!px-3 !py-1.5" aria-label="Table View"/>
                <Button variant={viewMode === 'calendar' ? 'primary' : 'ghost'} onClick={() => setViewMode('calendar')} size="sm" leftIcon={<CalendarIcon />} className="!px-3 !py-1.5" aria-label="Calendar View"/>
            </div>
        </div>
      </div>

      {/* Pagination bar */}
      {!isLoading && filteredProjects.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div className="text-sm text-text-secondary dark:text-slate-400">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredProjects.length)} of {filteredProjects.length} projects
          </div>
          {filteredProjects.length > ITEMS_PER_PAGE && (
            <nav className="flex items-center gap-1" aria-label="Pagination">
              <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>Previous</Button>
              <div className="flex items-center gap-1 mx-2">
                {(() => {
                  const pages: (number | 'ellipsis')[] = [];
                  const showPages = 5;
                  if (totalPages <= 9) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    let start = Math.max(1, currentPage - Math.floor(showPages / 2));
                    const end = Math.min(totalPages, start + showPages - 1);
                    if (end - start + 1 < showPages) start = Math.max(1, end - showPages + 1);
                    if (start > 1) pages.push(1, 'ellipsis');
                    for (let i = start; i <= end; i++) pages.push(i);
                    if (end < totalPages) pages.push('ellipsis', totalPages);
                  }
                  return pages.map((p, idx) =>
                    p === 'ellipsis' ? <span key={`e-${idx}`} className="px-2 text-text-secondary">...</span> : (
                      <Button key={p} variant={currentPage === p ? 'primary' : 'secondary'} size="sm" className="min-w-[2rem]" onClick={() => setCurrentPage(p)}>{p}</Button>
                    )
                  );
                })()}
              </div>
              <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</Button>
            </nav>
          )}
        </div>
      )}

      {isLoading ? <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div> : 
       filteredProjects.length === 0 ? <p className="text-center text-text-secondary py-8">No projects found.</p> :
       viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {paginatedProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              clientName={clients.find(c=>c.id === project.clientId)?.name}
              team={users.filter(u => project.memberIds.includes(u.id))}
              onEdit={handleEditProject}
              onDelete={handleDeleteProject}
            />
          ))}
        </div>
       ) : viewMode === 'table' ? (
        <div className="bg-container-bg dark:bg-slate-800 shadow-md rounded-lg overflow-x-auto border border-slate-200 dark:border-slate-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Project</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Progress</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">End Date</th>
                    </tr>
                </thead>
                <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                    {paginatedProjects.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3"><Link to={`/projects/${p.id}`} className="text-primary-action dark:text-blue-400 font-medium hover:underline">{p.name}</Link></td>
                            <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[p.status] || 'bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-200'}`}>{p.status}</span></td>
                            <td className="px-4 py-3"><div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5"><div className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full" style={{ width: `${p.progress}%` }}></div></div></td>
                            <td className="px-4 py-3 text-text-secondary dark:text-slate-400">{p.endDate ? new Date(p.endDate).toLocaleDateString() : 'N/A'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
       ) : (
        <CalendarComponent events={calendarEvents} />
       )
      }

      {isModalOpen && (hasPermission(Permission.CREATE_PROJECT) || hasPermission(Permission.EDIT_PROJECT)) && (
        <AddEditProjectModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingProject(null); }}
          onSuccess={handleModalSuccess}
          existingProject={editingProject}
        />
      )}
    </div>
  );
};

export default ProjectsPage;
