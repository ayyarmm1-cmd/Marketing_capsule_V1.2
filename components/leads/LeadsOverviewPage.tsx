import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom'; 
import { Lead, LeadStatus, KanbanColumn, User, UserRole, LEAD_STATUS_COLUMNS, Permission } from '../../types'; // Added Permission
import { apiUpdateLead, apiGetUsers, apiConvertLeadToClientAndBusiness, apiDeleteLead, apiGetLeads } from '../../services/api';
import Button from '../ui/Button';
import RefreshButton from '../ui/RefreshButton';
import AddLeadModal from './AddLeadModal';
import LeadCard from './LeadCard';
import ConfirmConvertLeadModal from './ConfirmConvertLeadModal';
import Spinner from '../ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import Select from '../ui/Select';
import Input from '../ui/Input';
import { STATUS_COLORS, PRIORITY_COLORS } from '../../constants'; 
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation'; // New import
import { subscribeRefreshData } from '../../utils/refreshDataBus';

type ViewMode = 'kanban' | 'table'; 

const LeadsOverviewPage: React.FC = () => {
  const { user, hasPermission } = useAuth(); // Added hasPermission
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation(); // New hook
  const [leads, setLeads] = useState<Lead[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDateRange, setFilterDateRange] = useState<{ start?: string, end?: string }>({});
  const [filterTeamMember, setFilterTeamMember] = useState<string>('');
  
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban'); 
  const [draggedOverColumn, setDraggedOverColumn] = useState<LeadStatus | null>(null);
  const ITEMS_PER_PAGE = 50;
  const [currentPage, setCurrentPage] = useState(1);


  const isAdminOrOwnerOrLeader = user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER || user?.role === UserRole.TEAM_LEADER;
  const canCreateLead = hasPermission(Permission.CREATE_LEAD);
  
  const canEditThisLead = (lead: Lead) => hasPermission(Permission.EDIT_ALL_LEADS) || (hasPermission(Permission.EDIT_LEAD) && lead.createdByUserId === user?.id);
  const canDeleteThisLead = (lead: Lead) => hasPermission(Permission.DELETE_ALL_LEADS) || (hasPermission(Permission.DELETE_LEAD) && lead.createdByUserId === user?.id);


  const fetchLeads = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedLeads, fetchedUsers] = await Promise.all([
        apiGetLeads(),
        apiGetUsers(),
      ]);
      let userFilteredLeads = fetchedLeads;
      if (user && !hasPermission(Permission.VIEW_ALL_LEADS)) {
        userFilteredLeads = fetchedLeads.filter(lead => lead.assignedTo === user.id || lead.createdByUserId === user.id);
      }
      setLeads(userFilteredLeads);
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Failed to load leads:", error);
      addNotification("Failed to load leads.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [user, hasPermission, addNotification]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    return subscribeRefreshData(() => fetchLeads());
  }, [fetchLeads]);


  const filteredLeads = React.useMemo(() => {
    return leads.filter(lead => {
        const nameMatch = lead.name.toLowerCase().includes(searchTerm.toLowerCase());
        const phoneMatch = lead.phone.includes(searchTerm);
        const businessNameMatch = lead.businessName.toLowerCase().includes(searchTerm.toLowerCase());
        const idMatch = lead.id.toLowerCase().includes(searchTerm.toLowerCase());
        const searchMatch = !searchTerm || nameMatch || phoneMatch || businessNameMatch || idMatch;

        const assignedMatch = !filterTeamMember || lead.assignedTo === filterTeamMember;
        
        const leadDate = new Date(lead.createdAt);
        const startDate = filterDateRange.start ? new Date(filterDateRange.start) : null;
        const endDate = filterDateRange.end ? new Date(filterDateRange.end) : null;
        if(startDate) startDate.setHours(0,0,0,0);
        if(endDate) endDate.setHours(23,59,59,999);

        const dateMatch = (!startDate || leadDate >= startDate) && (!endDate || leadDate <= endDate);

        return searchMatch && assignedMatch && dateMatch;
    });
  }, [leads, searchTerm, filterTeamMember, filterDateRange]);


  useEffect(() => {
    const newColumns: KanbanColumn[] = LEAD_STATUS_COLUMNS.map(status => ({
      id: status,
      title: status,
      leads: filteredLeads.filter(lead => lead.status === status),
    }));
    setColumns(newColumns);
  }, [filteredLeads]);


  const handleModalSuccess = () => {
    setIsModalOpen(false);
    setEditingLead(null);
    fetchLeads();
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
    const leadToUpdate = leads.find(l => l.id === leadId);
    if (!leadToUpdate || leadToUpdate.status === newStatus) return; 

    if (!canEditThisLead(leadToUpdate)) {
        addNotification("You do not have permission to edit this lead's status.", "error");
        return;
    }

    if (newStatus === LeadStatus.CLOSED_WON) {
        if (!hasPermission(Permission.CONVERT_LEAD)){
            addNotification("You do not have permission to convert leads.", "error");
            return;
        }
      setLeadToConvert(leadToUpdate);
      setIsConvertModalOpen(true);
    } else {
      try {
        await apiUpdateLead({ ...leadToUpdate, status: newStatus, id: leadId });
        addNotification("Lead status updated.", "success");
        fetchLeads();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        addNotification(`Failed to update lead status: ${errorMessage}`, "error");
        console.error("Failed to update lead status:", error);
      }
    }
  };
  
  const handleConfirmConvert = async (lead: Lead, clientName: string, businessName: string) => {
    if (!user || !hasPermission(Permission.CONVERT_LEAD)) {
        addNotification("You do not have permission to convert leads.", "error");
        return;
    }
    try {
      const { client, business } = await apiConvertLeadToClientAndBusiness(lead.id, clientName, businessName, user.id);
      addNotification(`Converted to Client: ${client.id} & Business: ${business.id}`, "success");
      fetchLeads();
    } catch (error) {
      console.error("Failed to convert lead:", error);
      addNotification(`Failed to convert lead: ${(error as Error).message}`, "error");
    }
    setIsConvertModalOpen(false);
    setLeadToConvert(null);
  };
  
  const handleEditLead = (lead: Lead) => {
    if (!canEditThisLead(lead)) {
      addNotification("You do not have permission to edit this lead.", "error");
      return;
    }
    setEditingLead(lead);
    setIsModalOpen(true);
  };

  const handleDeleteLead = async (lead: Lead) => {
    if (!canDeleteThisLead(lead)) {
      addNotification("You do not have permission to delete this lead.", "error");
      return;
    }
    const isConfirmed = await showConfirmation({
      title: "Confirm Deletion",
      message: `Are you sure you want to delete lead "${lead.name}"? This action cannot be undone.`,
      confirmText: "Delete",
      confirmVariant: "danger",
    });

    if (isConfirmed) {
      try {
        await apiDeleteLead(lead.id);
        addNotification("Lead deleted successfully.", "success");
        fetchLeads();
      } catch (error) {
        addNotification(`Failed to delete lead: ${(error as Error).message}`, "error");
      }
    }
  };


  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); 
  };
  
  const onDragEnter = (event: React.DragEvent<HTMLDivElement>, status: LeadStatus) => {
    event.preventDefault();
    setDraggedOverColumn(status);
  };

  const onDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDraggedOverColumn(null);
  };


  const onDrop = (event: React.DragEvent<HTMLDivElement>, newStatus: LeadStatus) => {
    event.preventDefault();
    const leadId = event.dataTransfer.getData("text/plain");
    setDraggedOverColumn(null); 
    if (leadId) {
      handleUpdateLeadStatus(leadId, newStatus);
    }
  };
  
  const totalLeads = filteredLeads.length;
  const wonLeads = filteredLeads.filter(l => l.status === LeadStatus.CLOSED_WON).length;
  const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : "0.0";
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / ITEMS_PER_PAGE));
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLeads.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLeads, currentPage]);

  useEffect(() => {
    setCurrentPage(p => Math.min(p, totalPages));
  }, [totalPages]);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterTeamMember, filterDateRange]);

  const getAssigneeName = (assigneeId?: string) => users.find(u => u.id === assigneeId)?.name || 'N/A';
  const formatDateSimple = (dateString?: string) => dateString ? new Date(dateString).toLocaleDateString('en-GB') : 'N/A';


  const renderLeadTable = () => (
    <div className="bg-container-bg dark:bg-slate-800 shadow-md rounded-lg overflow-x-auto border border-slate-200 dark:border-slate-700">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        <thead className="bg-slate-50 dark:bg-slate-700/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-slate-400 uppercase tracking-wider">ID</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Business</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Priority</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Assigned To</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Created At</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
          {paginatedLeads.map(lead => (
            <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">{lead.id}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary-action">
                <Link to={`/leads/${lead.id}`} className="hover:underline">{lead.name}</Link>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-300">{lead.businessName}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                <span className={`px-2 py-0.5 text-[0.7rem] font-semibold rounded-full ${STATUS_COLORS[lead.status] || 'bg-gray-200 text-gray-700'}`}>
                  {lead.status}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                 <span className={`font-medium ${PRIORITY_COLORS[lead.priority || 'Low']?.replace('border-', 'text-') || 'text-slate-600 dark:text-slate-300'}`}>
                    {lead.priority || 'Low'}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-300">{getAssigneeName(lead.assignedTo)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">{formatDateSimple(lead.createdAt)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm space-x-1">
                {canEditThisLead(lead) && <Button variant="ghost" size="sm" onClick={() => handleEditLead(lead)}>Edit</Button>}
                {canDeleteThisLead(lead) && <Button variant="danger" size="sm" onClick={() => handleDeleteLead(lead)}>Delete</Button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );


  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 p-5 bg-container-bg dark:bg-slate-800 shadow-md rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div> 
                <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Leads Pipeline</h1>
                <p className="text-sm text-text-secondary dark:text-slate-400">Manage and track your sales leads.</p>
            </div>
            <div className="flex items-center space-x-6">
                <RefreshButton onRefresh={fetchLeads} />
                {canCreateLead && (
                    <Button onClick={() => { setEditingLead(null); setIsModalOpen(true); }} variant="primary" size="lg" leftIcon={<PlusIcon />}>
                        Add Lead
                    </Button>
                )}
            </div>
        </div>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
            <p className="text-sm text-text-secondary dark:text-slate-400">Total Leads</p>
            <p className="text-2xl font-bold text-text-primary dark:text-slate-100">{totalLeads}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
            <p className="text-sm text-text-secondary dark:text-slate-400">Closed Won</p>
            <p className="text-2xl font-bold text-status-success">{wonLeads}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
            <p className="text-sm text-text-secondary dark:text-slate-400">Conversion Rate</p>
            <p className="text-2xl font-bold text-primary-action">{conversionRate}%</p>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 mb-3">
                <Input 
                    placeholder="Search ID, Name, Phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    containerClassName="mb-0"
                    className="text-sm"
                />
                <Input 
                    type="date"
                    label="Start Date"
                    value={filterDateRange.start || ''}
                    onChange={(e) => setFilterDateRange(prev => ({...prev, start: e.target.value}))}
                    containerClassName="mb-0 text-sm"
                />
                <Input 
                    type="date"
                    label="End Date"
                    value={filterDateRange.end || ''}
                    onChange={(e) => setFilterDateRange(prev => ({...prev, end: e.target.value}))}
                    containerClassName="mb-0 text-sm"
                />
                {/* Filter by team member only if user has permission to view all leads, or is admin/owner/leader */}
                {(hasPermission(Permission.VIEW_ALL_LEADS) || isAdminOrOwnerOrLeader) && (
                    <Select
                        label="Filter by Team Member"
                        options={[{value: '', label: 'All Members'}, ...users.map(u => ({ value: u.id, label: u.name }))]}
                        value={filterTeamMember}
                        onChange={(e) => setFilterTeamMember(e.target.value)}
                        containerClassName="mb-0 text-sm"
                    />
                )}
            </div>
            <div className="flex justify-end items-center mt-2">
                 <span className="text-xs text-text-secondary dark:text-slate-400 mr-3">View As:</span>
                 <Button 
                    variant={viewMode === 'kanban' ? 'primary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setViewMode('kanban')} 
                    className="!px-3 !py-1.5"
                    leftIcon={<GridIcon />}
                    aria-label="Kanban View"
                >
                    Kanban
                </Button>
                <Button 
                    variant={viewMode === 'table' ? 'primary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setViewMode('table')} 
                    className="!px-3 !py-1.5 ml-2"
                    leftIcon={<TableIcon />}
                    aria-label="Table View"
                >
                    Table
                </Button>
            </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex justify-center items-center"><Spinner size="lg" /></div>
      ) : viewMode === 'kanban' ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 pb-4">
          {columns.map(column => (
            <div 
              key={column.id} 
              id={column.id} 
              className={`bg-slate-100 dark:bg-slate-900/50 rounded-xl shadow-sm p-4 min-w-[280px] h-full flex flex-col transition-colors duration-200 ${draggedOverColumn === column.id ? 'bg-slate-200 dark:bg-slate-800 ring-2 ring-primary-action' : ''}`}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, column.id)}
              onDragEnter={(e) => onDragEnter(e, column.id)}
              onDragLeave={onDragLeave}
            >
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 px-1 sticky top-0 bg-slate-100 dark:bg-slate-900/50 py-2 flex justify-between items-center uppercase tracking-wider">
                <span>{column.title}</span>
                <span className="text-xs font-normal bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full">{column.leads.length}</span>
              </h2>
              <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar"> 
                {column.leads.length > 0 ? column.leads.map(lead => (
                  <LeadCard 
                    key={lead.id} 
                    lead={lead} 
                    users={users}
                  />
                )) : (
                  <div className="text-center py-10">
                    <NoLeadsIcon className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-600 mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">No leads in this stage.</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Drag & drop leads here</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        filteredLeads.length > 0 ? (
          <>
            {/* Pagination bar - table view only */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              <div className="text-sm text-text-secondary dark:text-slate-400">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredLeads.length)} of {filteredLeads.length} leads
              </div>
              {filteredLeads.length > ITEMS_PER_PAGE && (
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
            {renderLeadTable()}
          </>
        ) : <p className="text-center text-text-secondary dark:text-slate-400 py-8">No leads found matching your criteria.</p>
      )}

      <AddLeadModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingLead(null); }}
        onSuccess={handleModalSuccess}
        users={users}
        editingLead={editingLead}
      />
      {leadToConvert && (
        <ConfirmConvertLeadModal
            isOpen={isConvertModalOpen}
            onClose={() => { setIsConvertModalOpen(false); setLeadToConvert(null); }}
            lead={leadToConvert}
            onConfirm={handleConfirmConvert}
        />
      )}
    </div>
  );
};

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const NoLeadsIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" /></svg>;
const GridIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25A2.25 2.25 0 0 1 13.5 8.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>;
const TableIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;


export default LeadsOverviewPage;