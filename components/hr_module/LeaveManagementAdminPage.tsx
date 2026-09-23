import React, { useState, useEffect, useCallback } from 'react';
import { LeaveRequest, LeaveRequestStatus, User, UserRole, LeaveType, Employee } from '../../types';
import { apiGetAllLeaveRequests, apiUpdateLeaveRequestStatus, apiGetUsers, apiBulkUpdateLeaveRequestStatus } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import { STATUS_COLORS } from '../../constants';
import Modal from '../ui/Modal'; 
import Input from '../ui/Input'; 

interface ReviewLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: LeaveRequest | null;
  onUpdateStatus: (requestId: string, status: LeaveRequestStatus, comments?: string) => Promise<void>;
  employeeName?: string;
}

const ReviewLeaveModal: React.FC<ReviewLeaveModalProps> = ({ isOpen, onClose, request, onUpdateStatus, employeeName }) => {
  const [comments, setComments] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (request) {
      setComments(request.reviewerComments || '');
    }
  }, [request]);

  if (!request) return null;

  const handleAction = async (status: LeaveRequestStatus) => {
    setIsLoading(true);
    await onUpdateStatus(request.id, status, comments);
    setIsLoading(false);
    onClose();
  };
  
  const formatDate = (dateString?: string) => dateString ? new Date(dateString).toLocaleDateString('en-GB') : 'N/A';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Review Leave: ${employeeName} (${request.leaveType})`} size="lg">
        <div className="space-y-3 mb-4 text-sm">
            <p><strong>Employee:</strong> {employeeName}</p>
            <p><strong>Leave Type:</strong> {request.leaveType}</p>
            <p><strong>Duration:</strong> {request.duration}</p>
            <p><strong>Dates:</strong> {formatDate(request.startDate)} to {formatDate(request.endDate)}</p>
            <p><strong>Reason:</strong> {request.reason}</p>
            <p><strong>Requested On:</strong> {formatDate(request.requestedAt)}</p>
            <p><strong>Current Status:</strong> <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[request.status] || ''}`}>{request.status}</span></p>
        </div>
      
        <Input 
            label="Reviewer Comments (Optional)" 
            name="comments" 
            value={comments} 
            onChange={(e) => setComments(e.target.value)} 
            placeholder="e.g., Reason for decline, or wishing well."
            containerClassName="mb-4"
        />
      
        {request.status === LeaveRequestStatus.PENDING && (
            <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="danger" onClick={() => handleAction(LeaveRequestStatus.DECLINED)} isLoading={isLoading} disabled={isLoading}>Decline</Button>
            <Button variant="success" onClick={() => handleAction(LeaveRequestStatus.APPROVED)} isLoading={isLoading} disabled={isLoading}>Approve</Button>
            </div>
        )}
         {request.status !== LeaveRequestStatus.PENDING && (
             <p className="text-sm text-text-secondary mt-4">This request has already been actioned.</p>
         )}
    </Modal>
  );
};

// ... (Rest of your component)
const LeaveManagementAdminPage: React.FC = () => {
  const { user: adminUser } = useAuth();
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState<LeaveRequest | null>(null);

  // New state for filters and bulk actions
  const [filterStatus, setFilterStatus] = useState<LeaveRequestStatus | ''>(LeaveRequestStatus.PENDING);
  const [filterEmployee, setFilterEmployee] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<number>(0); // 0 for All Months
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const fetchAdminLeaveData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [requests, fetchedUsers] = await Promise.all([apiGetAllLeaveRequests(), apiGetUsers()]);
      setAllRequests(requests);
      setUsers(fetchedUsers);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addNotification(`Failed to fetch leave requests: ${errorMessage}`, "error");
      console.error("Failed to fetch admin leave data:", error);
    }
    setIsLoading(false);
  }, [addNotification]);

  useEffect(() => { fetchAdminLeaveData(); }, [fetchAdminLeaveData]);

  const filteredRequests = allRequests.filter(req => {
    const reqDate = new Date(req.startDate);
    const statusMatch = !filterStatus || req.status === filterStatus;
    const employeeMatch = !filterEmployee || req.employeeId === filterEmployee;
    const monthMatch = filterMonth === 0 || (reqDate.getFullYear() === filterYear && (reqDate.getMonth() + 1) === filterMonth);
    return statusMatch && employeeMatch && monthMatch;
  });

  const getEmployeeName = (employeeId: string) => users.find(u => (u as Employee).employeeId === employeeId)?.name || 'Unknown';
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GB');

  const handleUpdateStatus = async (requestId: string, status: LeaveRequestStatus, comments?: string) => {
    if (!adminUser) {
      addNotification("You must be logged in to update leave requests.", "error");
      return;
    }
    try {
      const request = allRequests.find(r => r.id === requestId);
      await apiUpdateLeaveRequestStatus(requestId, status, adminUser.id, comments);
      const statusText = status === LeaveRequestStatus.APPROVED ? 'approved' : status === LeaveRequestStatus.DECLINED ? 'declined' : 'updated';
      addNotification(`Leave request ${statusText} successfully.`, "success");
      fetchAdminLeaveData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addNotification(`Failed to update leave request status: ${errorMessage}`, "error");
      console.error("Failed to update leave request status:", error);
    }
  };
  
  const handleBulkUpdate = async (status: LeaveRequestStatus) => {
    if (!adminUser) {
      addNotification("You must be logged in to update leave requests.", "error");
      return;
    }
    if (selectedRequestIds.length === 0) {
      addNotification("Please select at least one leave request to update.", "warning");
      return;
    }
    const action = status === LeaveRequestStatus.APPROVED ? 'approve' : 'decline';
    const confirmed = await showConfirmation({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Leave Requests`,
      message: `Are you sure you want to ${action} ${selectedRequestIds.length} selected request(s)?`,
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
      cancelText: 'Cancel',
      confirmVariant: action === 'approve' ? 'success' : action === 'decline' ? 'danger' : 'primary',
    });
    if (!confirmed) return;

    try {
        await apiBulkUpdateLeaveRequestStatus(selectedRequestIds, status, adminUser.id);
        addNotification(`${selectedRequestIds.length} leave request(s) ${action}d successfully.`, "success");
        fetchAdminLeaveData();
        setSelectedRequestIds([]);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        addNotification(`Failed to ${action} requests: ${errorMessage}`, "error");
        console.error(`Failed to ${action} requests:`, error);
    }
  };

  const toggleSelection = (requestId: string) => {
    setSelectedRequestIds(prev => prev.includes(requestId) ? prev.filter(id => id !== requestId) : [...prev, requestId]);
  };
  
  const toggleSelectAll = () => {
    if (selectedRequestIds.length === filteredRequests.filter(r => r.status === LeaveRequestStatus.PENDING).length) {
      setSelectedRequestIds([]);
    } else {
      setSelectedRequestIds(filteredRequests.filter(r => r.status === LeaveRequestStatus.PENDING).map(r => r.id));
    }
  };


  const openReviewModal = (request: LeaveRequest) => {
    setReviewingRequest(request);
    setIsReviewModalOpen(true);
  };

  const calendarEvents = allRequests.filter(r => r.status === LeaveRequestStatus.APPROVED).map(r => ({
      ...r,
      title: `${getEmployeeName(r.employeeId)} (${r.leaveType})`,
  }));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100 mb-6">Leave Management (Admin)</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-container-bg dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700">
        <Select label="Filter by Month" value={String(filterMonth)} onChange={e => setFilterMonth(Number(e.target.value))} options={[{value: 0, label: 'All Months'}, ...Array.from({length: 12}, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }))]} />
        <Select label="Filter by Year" value={String(filterYear)} onChange={e => setFilterYear(Number(e.target.value))} options={Array.from({length: 5}, (_, i) => ({ value: new Date().getFullYear() - i, label: String(new Date().getFullYear() - i) }))} />
        <Select label="Filter by Status" value={filterStatus} onChange={e => setFilterStatus(e.target.value as LeaveRequestStatus | '')} options={[{value: '', label: 'All Statuses'}, ...Object.values(LeaveRequestStatus).map(s => ({ value: s, label: s }))]} />
        <Select label="Filter by Employee" value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} options={[{value: '', label: 'All Employees'}, ...users.map(u => ({ value: (u as Employee).employeeId, label: u.name }))]} />
      </div>
      
      <div className="flex justify-between items-center mb-4">
        {selectedRequestIds.length > 0 && (
            <div className="flex items-center gap-2">
                <Button variant="success" size="sm" onClick={() => handleBulkUpdate(LeaveRequestStatus.APPROVED)}>Approve Selected ({selectedRequestIds.length})</Button>
                <Button variant="danger" size="sm" onClick={() => handleBulkUpdate(LeaveRequestStatus.DECLINED)}>Decline Selected ({selectedRequestIds.length})</Button>
            </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
            <Button variant={viewMode === 'list' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('list')}>List View</Button>
            <Button variant={viewMode === 'calendar' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('calendar')}>Calendar View</Button>
        </div>
      </div>

      {isLoading ? <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div> : (
        viewMode === 'list' ? (
          filteredRequests.length > 0 ? (
          <div className="bg-container-bg dark:bg-slate-800 shadow-md rounded-lg overflow-x-auto border border-slate-200 dark:border-slate-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input type="checkbox"
                        checked={selectedRequestIds.length > 0 && selectedRequestIds.length === filteredRequests.filter(r => r.status === LeaveRequestStatus.PENDING).length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-primary-action border-gray-300 rounded focus:ring-primary-action"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                        {req.status === LeaveRequestStatus.PENDING && (
                            <input type="checkbox"
                                checked={selectedRequestIds.includes(req.id)}
                                onChange={() => toggleSelection(req.id)}
                                className="h-4 w-4 text-primary-action border-gray-300 dark:border-slate-600 rounded focus:ring-primary-action bg-white dark:bg-slate-700"
                            />
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-slate-200">{getEmployeeName(req.employeeId)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">{req.leaveType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">{formatDate(req.startDate)} - {formatDate(req.endDate)}</td>
                    <td className="px-6 py-4 text-sm text-text-secondary dark:text-slate-400 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[req.status] || 'bg-gray-200 text-gray-700'}`}>{req.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm"><Button variant="ghost" size="sm" onClick={() => openReviewModal(req)}>{req.status === LeaveRequestStatus.PENDING ? 'Review' : 'View Details'}</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-center text-text-secondary dark:text-slate-400 py-8">No leave requests match your filters.</p>
        ) : (
             <LeaveCalendar year={filterYear} month={filterMonth} events={calendarEvents} />
        )
      )}
      <ReviewLeaveModal isOpen={isReviewModalOpen} onClose={() => {setIsReviewModalOpen(false); setReviewingRequest(null);}} request={reviewingRequest} onUpdateStatus={handleUpdateStatus} employeeName={reviewingRequest ? getEmployeeName(reviewingRequest.employeeId) : ''} />
    </div>
  );
};


const LeaveCalendar: React.FC<{ year: number; month: number; events: (LeaveRequest & {title: string})[] }> = ({ year, month, events }) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const date = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfMonth = date.getDay();

    const calendarCells = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarCells.push(<div key={`empty-start-${i}`} className="border border-slate-200 dark:border-slate-700 p-2 bg-container-bg dark:bg-slate-800"></div>);
    }

    const leaveTypeColors: Record<LeaveType, string> = {
        [LeaveType.ANNUAL]: 'bg-blue-500 text-white',
        [LeaveType.CASUAL]: 'bg-red-500 text-white',
        [LeaveType.UNPAID]: 'bg-gray-500 text-white',
        [LeaveType.OFF_DAY]: 'bg-green-500 text-white',
    };

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day);
        const dayEvents = events.filter(event => {
            const startDate = new Date(event.startDate);
            startDate.setHours(0,0,0,0);
            const endDate = new Date(event.endDate);
            endDate.setHours(23,59,59,999);
            return currentDate >= startDate && currentDate <= endDate;
        });

        calendarCells.push(
            <div key={day} className="border border-slate-200 dark:border-slate-700 p-2 min-h-[120px] bg-container-bg dark:bg-slate-800">
                <div className="font-bold text-sm text-text-primary dark:text-slate-200">{day}</div>
                <div className="mt-1 space-y-1">
                    {dayEvents.map(event => (
                        <div key={event.id} title={event.title} className={`text-xs p-1 rounded truncate ${leaveTypeColors[event.leaveType] || 'bg-gray-400'}`}>
                            {event.title.split('(')[0]}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-sm mb-2 text-text-primary dark:text-slate-200">
                {days.map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {calendarCells}
            </div>
        </div>
    );
};


export default LeaveManagementAdminPage;
