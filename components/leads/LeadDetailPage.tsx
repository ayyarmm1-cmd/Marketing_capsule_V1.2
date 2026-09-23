import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Lead, User, LeadActivity, LeadActivityType, Permission, LeadStatus } from '../../types'; // Added LeadActivity, LeadActivityType
import { apiGetLeadById, apiGetUsers, apiGetActivitiesForLead, apiAddLeadActivity, apiDeleteLead, apiConvertLeadToClientAndBusiness } from '../../services/api'; // Added activity APIs
import Spinner from '../ui/Spinner';
import Button from '../ui/Button'; // Added Button
import Select from '../ui/Select'; // Added Select
import { STATUS_COLORS, PRIORITY_COLORS } from '../../constants';
import { useAuth } from '../../hooks/useAuth'; // Added useAuth
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import AddLeadModal from './AddLeadModal';
import ConfirmConvertLeadModal from './ConfirmConvertLeadModal';
import { formatDateTimeForDisplay } from '../../utils/dateUtils';

// LeadDetailPage component
const DetailItem: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div>
    <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
    <p className="text-md text-gray-800 dark:text-slate-100 break-words">{value || 'N/A'}</p>
  </div>
);

const LeadDetailPage: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const { user: loggedInUser, hasPermission } = useAuth(); // Get logged-in user for adding activities
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  const navigate = useNavigate();

  const [lead, setLead] = useState<Lead | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]); // New state for activities
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details'); // State for tabs

  // State for new activity form
  const [newActivityType, setNewActivityType] = useState<LeadActivityType>(LeadActivityType.NOTE);
  const [newActivityNotes, setNewActivityNotes] = useState('');
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  
  // State for modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);


  const fetchLeadDetailsAndActivities = useCallback(async () => {
    if (!leadId) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setLead(null); 
    setActivities([]); 
    try {
        const [fetchedLead, fetchedUsers] = await Promise.all([
            apiGetLeadById(leadId),
            apiGetUsers(),
        ]);
        
        setLead(fetchedLead);
        setUsers(fetchedUsers);

        if (fetchedLead) {
            try {
                const fetchedActivities = await apiGetActivitiesForLead(leadId);
                setActivities(fetchedActivities);
            } catch (activityError) {
                console.error("Failed to fetch lead activities:", activityError);
                addNotification("Could not load lead activities.", "warning");
            }
        }
    } catch (error) {
        console.error("Failed to fetch lead details:", error);
        addNotification("Failed to load lead details.", "error");
        setLead(null);
    } finally {
        setIsLoading(false);
    }
  }, [leadId, addNotification]);

  useEffect(() => {
    fetchLeadDetailsAndActivities();
  }, [fetchLeadDetailsAndActivities]);

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId || !newActivityNotes.trim() || !loggedInUser) return;
    setIsAddingActivity(true);
    try {
      await apiAddLeadActivity({
        leadId,
        type: newActivityType,
        notes: newActivityNotes,
        userId: loggedInUser.id,
      });
      setNewActivityNotes('');
      setNewActivityType(LeadActivityType.NOTE);
      addNotification("Activity logged successfully.", "success");
      fetchLeadDetailsAndActivities(); // Refresh activities
    } catch (error) {
      console.error("Failed to add activity:", error);
      addNotification("Failed to add activity.", "error");
    }
    setIsAddingActivity(false);
  };
  
  const handleDeleteLead = async () => {
    if (!lead) return;
    const confirmed = await showConfirmation({
      title: 'Delete Lead',
      message: `Are you sure you want to delete lead "${lead.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });
    if (confirmed) {
        try {
            await apiDeleteLead(lead.id);
            addNotification("Lead deleted successfully.", "success");
            navigate('/leads');
        } catch(error) {
            addNotification(`Failed to delete lead: ${(error as Error).message}`, "error");
        }
    }
  };
  
  const handleConfirmConvert = async (leadToConvert: Lead, clientName: string, businessName: string) => {
    if (!loggedInUser) return;
    try {
      const { client, business } = await apiConvertLeadToClientAndBusiness(leadToConvert.id, clientName, businessName, loggedInUser.id);
      addNotification(`Converted to Client: ${client.id} & Business: ${business.id}`, "success");
      setIsConvertModalOpen(false);
      fetchLeadDetailsAndActivities();
    } catch (error) {
      addNotification(`Failed to convert lead: ${(error as Error).message}`, "error");
    }
  };


  const getAssigneeName = (assigneeId?: string): string => {
    if (!assigneeId) return 'Unassigned';
    return users.find(u => u.id === assigneeId)?.name || 'Unknown User';
  };
  
  const getUserName = (userId: string): string => users.find(u => u.id === userId)?.name || 'Unknown User';


  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return formatDateTimeForDisplay(dateString);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  if (!lead) {
    return (
      <div className="text-center p-10 bg-container-bg dark:bg-slate-800 rounded-lg">
        <h2 className="text-2xl font-semibold text-status-danger mb-4">Lead Not Found</h2>
        <p className="text-text-secondary dark:text-slate-400 mb-6">The lead you are looking for does not exist or could not be loaded.</p>
        <Link to="/leads" className="text-primary-action hover:underline">
          &larr; Back to Leads Pipeline
        </Link>
      </div>
    );
  }

  const priorityClass = PRIORITY_COLORS[lead.priority || 'Low'] || 'border-gray-300';
  const statusClass = STATUS_COLORS[lead.status] || 'bg-gray-300 text-gray-800';
  const canEdit = hasPermission(Permission.EDIT_ALL_LEADS) || (hasPermission(Permission.EDIT_LEAD) && lead.createdByUserId === loggedInUser?.id);
  const canDelete = hasPermission(Permission.DELETE_ALL_LEADS) || (hasPermission(Permission.DELETE_LEAD) && lead.createdByUserId === loggedInUser?.id);
  const canConvert = hasPermission(Permission.CONVERT_LEAD);


  return (
    <div className="p-4 md:p-6 bg-container-bg dark:bg-slate-800 shadow-xl rounded-lg max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-6 pb-4 border-b border-gray-200 dark:border-slate-700 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary dark:text-slate-100">{lead.name}</h1>
          <p className="text-sm text-text-secondary dark:text-slate-400">Lead ID: {lead.id}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
            {canEdit && <Button onClick={() => setIsEditModalOpen(true)} variant="primary" size="sm">Edit</Button>}
            {canConvert && lead.status !== LeadStatus.CLOSED_WON && <Button onClick={() => setIsConvertModalOpen(true)} variant="success" size="sm">Convert</Button>}
            {canDelete && <Button onClick={handleDeleteLead} variant="danger" size="sm">Delete</Button>}
            <Link to="/leads/overview" className="text-sm text-primary-action hover:underline">
            &larr; Back to Pipeline
            </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button onClick={() => setActiveTab('details')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'details' ? 'border-primary-action text-primary-action' : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'}`}>
            Lead Details
          </button>
          <button onClick={() => setActiveTab('activity')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'activity' ? 'border-primary-action text-primary-action' : 'border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'}`}>
            Activity Timeline ({activities.length})
          </button>
        </nav>
      </div>

      {activeTab === 'details' && (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className={`p-4 rounded-lg shadow border-l-4 bg-white dark:bg-slate-700/50 ${(priorityClass || "border-gray-300").replace('text-', 'border-')}`}>
                <p className="text-xs text-text-secondary dark:text-slate-400 uppercase">Priority</p>
                <p className={`text-lg font-semibold ${(priorityClass || "border-gray-300").replace('border-', 'text-')}`}>{lead.priority || 'N/A'}</p>
                </div>
                <div className={`p-4 rounded-lg shadow ${statusClass}`}>
                <p className="text-xs uppercase">Status</p>
                <p className="text-lg font-semibold">{lead.status}</p>
                </div>
                <div className="p-4 rounded-lg shadow bg-gray-50 dark:bg-slate-700/50">
                <p className="text-xs text-text-secondary dark:text-slate-400 uppercase">Assigned To</p>
                <p className="text-lg font-semibold text-text-primary dark:text-slate-200">{getAssigneeName(lead.assignedTo)}</p>
                </div>
            </div>

            <div className="space-y-6">
                <section>
                <h2 className="text-xl font-semibold text-text-secondary dark:text-slate-300 mb-3">Contact Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DetailItem label="Phone Number" value={lead.phone} />
                    <DetailItem label="Email Address" value={lead.email} />
                    <DetailItem label="Viber/Telegram" value={lead.viberTelegram} />
                    <DetailItem label="Personal Facebook" value={lead.personalFbLink} />
                </div>
                </section>

                <section>
                <h2 className="text-xl font-semibold text-text-secondary dark:text-slate-300 mb-3 pt-4 border-t dark:border-slate-700">Business Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DetailItem label="Business Name" value={lead.businessName} />
                    <DetailItem label="Business Type" value={lead.businessType} />
                    <DetailItem label="Business Page URL" value={lead.businessPageUrl} />
                    <DetailItem label="Website URL" value={lead.websiteUrl} />
                    <DetailItem label="Country" value={lead.country} />
                    <DetailItem label="State/Region" value={lead.state} />
                    <DetailItem label="City" value={lead.city} />
                    <DetailItem label="Address" value={lead.address} />
                </div>
                </section>
                
                <section>
                <h2 className="text-xl font-semibold text-text-secondary dark:text-slate-300 mb-3 pt-4 border-t dark:border-slate-700">Lead Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DetailItem label="Lead Source" value={lead.leadSource} />
                    <DetailItem label="Created By" value={getUserName(lead.createdByUserId)} />
                    <DetailItem label="Created At" value={formatDate(lead.createdAt)} />
                    <DetailItem label="Last Updated" value={formatDate(lead.updatedAt)} />
                </div>
                </section>

                {lead.notes && (
                <section>
                    <h2 className="text-xl font-semibold text-text-secondary dark:text-slate-300 mb-3 pt-4 border-t dark:border-slate-700">Notes</h2>
                    <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-md whitespace-pre-wrap text-text-primary dark:text-slate-200">
                    {lead.notes}
                    </div>
                </section>
                )}
            </div>
        </>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-6">
          <form onSubmit={handleAddActivity} className="space-y-3 p-4 border bg-slate-50 dark:bg-slate-900/50 dark:border-slate-700 rounded-lg shadow-sm">
             <h3 className="text-lg font-medium text-text-primary dark:text-slate-200">Log New Activity</h3>
            <Select
              label="Activity Type"
              value={newActivityType}
              onChange={(e) => setNewActivityType(e.target.value as LeadActivityType)}
              options={Object.values(LeadActivityType)
                .filter(type => type !== LeadActivityType.STATUS_CHANGE && type !== LeadActivityType.CONVERSION)
                .map(type => ({ value: type, label: type }))}
              containerClassName="mb-0"
            />
            <div>
                <label htmlFor="newActivityNotes" className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">Notes/Details*</label>
                <textarea
                    id="newActivityNotes"
                    value={newActivityNotes}
                    onChange={(e) => setNewActivityNotes(e.target.value)}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-action focus:border-primary-action sm:text-sm text-text-primary dark:text-slate-100 bg-white dark:bg-slate-700"
                    required
                />
            </div>
            <Button type="submit" variant="primary" size="sm" isLoading={isAddingActivity}>Add Activity</Button>
          </form>

          {activities.length > 0 ? (
            <ul className="space-y-4">
              {activities.map(activity => (
                <li key={activity.id} className="p-4 border dark:border-slate-700 rounded-lg shadow-sm bg-white dark:bg-slate-700">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-sm font-semibold ${activity.type === LeadActivityType.STATUS_CHANGE ? 'text-blue-600 dark:text-blue-400' : 'text-text-primary dark:text-slate-200'}`}>
                      {activity.type}
                    </span>
                    <span className="text-xs text-text-secondary dark:text-slate-400">{formatDate(activity.timestamp)}</span>
                  </div>
                  <p className="text-sm text-text-primary dark:text-slate-300 whitespace-pre-wrap mb-1">{activity.notes}</p>
                  <p className="text-xs text-text-secondary dark:text-slate-400">By: {getUserName(activity.userId)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-text-secondary dark:text-slate-400 py-4">No activities recorded for this lead yet.</p>
          )}
        </div>
      )}

        {isEditModalOpen && (
            <AddLeadModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={() => { setIsEditModalOpen(false); fetchLeadDetailsAndActivities(); }}
                users={users}
                editingLead={lead}
            />
        )}
        {isConvertModalOpen && (
            <ConfirmConvertLeadModal
                isOpen={isConvertModalOpen}
                onClose={() => setIsConvertModalOpen(false)}
                lead={lead}
                onConfirm={handleConfirmConvert}
            />
        )}

    </div>
  );
};

export default LeadDetailPage;
