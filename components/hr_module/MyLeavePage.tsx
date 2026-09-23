import React, { useState, useEffect, useCallback } from 'react';
import { LeaveRequest, LeaveRequestStatus, LeaveType, Employee, LeaveDuration } from '../../types';
import { apiGetLeaveRequestsForEmployee, apiAddLeaveRequest, apiCancelLeaveRequest, apiGetEmployeeById, apiAddMultipleLeaveRequests, apiDeleteLeaveRequest } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import { STATUS_COLORS } from '../../constants';
import { EmployeeStatus } from '../../types';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';

interface RequestLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<LeaveRequest, 'id' | 'requestedAt' | 'status' | 'employeeId'>) => Promise<void>;
  onMultiSubmit: (data: Omit<LeaveRequest, 'id' | 'requestedAt' | 'status' | 'employeeId'>[]) => Promise<void>;
}

const RequestLeaveModal: React.FC<RequestLeaveModalProps> = ({ isOpen, onClose, onSubmit, onMultiSubmit }) => {
  const [leaveType, setLeaveType] = useState<LeaveType>(LeaveType.OFF_DAY);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState<LeaveDuration>(LeaveDuration.FULL_DAY);
  const [isLoading, setIsLoading] = useState(false);
  
  // For multi-date picker
  const [selectedDates, setSelectedDates] = useState<Map<string, LeaveDuration>>(new Map());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());


  const handleDateSelect = (dateStr: string) => {
    setSelectedDates(prev => {
        const newDates = new Map(prev);
        if (newDates.has(dateStr)) {
            newDates.delete(dateStr);
        } else {
            newDates.set(dateStr, LeaveDuration.FULL_DAY); // Default to full day
        }
        return newDates;
    });
  };

  const handleDurationChangeForDate = (dateStr: string, newDuration: LeaveDuration) => {
    setSelectedDates(prev => {
        const newDates = new Map(prev);
        if (newDates.has(dateStr)) {
            newDates.set(dateStr, newDuration);
        }
        return newDates;
    });
  };


  useEffect(() => {
    if (duration !== LeaveDuration.FULL_DAY) { setEndDate(startDate); }
  }, [duration, startDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (leaveType === LeaveType.OFF_DAY) {
        if (selectedDates.size === 0 || !reason) {
            alert("Please select at least one off-day and provide a reason.");
            setIsLoading(false); return;
        }
        const requests: Omit<LeaveRequest, 'id'|'requestedAt'|'status'|'employeeId'>[] = [];
        selectedDates.forEach((dur, date) => {
            requests.push({ leaveType, startDate: date, endDate: date, reason, duration: dur });
        });
        await onMultiSubmit(requests);
    } else {
        if (!startDate || !endDate || !reason) {
            alert("All fields are required for this leave type.");
            setIsLoading(false); return;
        }
        if (new Date(endDate) < new Date(startDate)) {
            alert("End date cannot be before start date.");
            setIsLoading(false); return;
        }
        await onSubmit({ leaveType, startDate, endDate, reason, duration });
    }
    
    setIsLoading(false);
    // Reset form
    setLeaveType(LeaveType.OFF_DAY); setStartDate(''); setEndDate(''); setReason(''); setDuration(LeaveDuration.FULL_DAY); setSelectedDates(new Map());
    onClose();
  };

  const renderCalendar = () => {
    const date = new Date(calendarYear, calendarMonth, 1);
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const firstDayOfMonth = date.getDay();
    const cells = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        cells.push(<div key={`empty-start-${i}`} className="p-1"></div>);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isSelected = selectedDates.has(dateStr);
        cells.push(
            <div key={day} onClick={() => handleDateSelect(dateStr)}
                className={`p-2 text-center text-sm cursor-pointer rounded-full ${isSelected ? 'bg-primary-action text-white' : 'hover:bg-blue-100'}`}>
                {day}
            </div>
        );
    }
    return (
        <div className="grid grid-cols-7 gap-2">
            <div className="text-center font-semibold text-xs text-gray-500">S</div>
            <div className="text-center font-semibold text-xs text-gray-500">M</div>
            <div className="text-center font-semibold text-xs text-gray-500">T</div>
            <div className="text-center font-semibold text-xs text-gray-500">W</div>
            <div className="text-center font-semibold text-xs text-gray-500">T</div>
            <div className="text-center font-semibold text-xs text-gray-500">F</div>
            <div className="text-center font-semibold text-xs text-gray-500">S</div>
            {cells}
        </div>
    );
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request New Leave" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="Leave Type*" value={leaveType} onChange={e => setLeaveType(e.target.value as LeaveType)}
          options={Object.values(LeaveType).map(lt => ({ value: lt, label: lt }))} required />
        
        {leaveType === LeaveType.OFF_DAY ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <Button type="button" size="sm" onClick={() => { const d = new Date(calendarYear, calendarMonth - 1, 1); setCalendarMonth(d.getMonth()); setCalendarYear(d.getFullYear()); }}>&lt; Prev</Button>
                        <span className="font-semibold">{new Date(calendarYear, calendarMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                        <Button type="button" size="sm" onClick={() => { const d = new Date(calendarYear, calendarMonth + 1, 1); setCalendarMonth(d.getMonth()); setCalendarYear(d.getFullYear()); }}>Next &gt;</Button>
                    </div>
                    {renderCalendar()}
                </div>
                <div>
                    <h4 className="font-semibold text-sm mb-2">Selected Dates ({selectedDates.size})</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-2 bg-container-bg dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                        {[...selectedDates.keys()].sort().map(dateStr => (
                            <div key={dateStr} className="flex justify-between items-center">
                                <span className="text-sm">{dateStr}</span>
                                <Select value={selectedDates.get(dateStr)} 
                                    onChange={e => handleDurationChangeForDate(dateStr, e.target.value as LeaveDuration)}
                                    options={Object.values(LeaveDuration).map(ld => ({value: ld, label: ld}))}
                                    className="!py-1 text-xs" containerClassName="mb-0 w-48"/>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        ) : (
            <>
                <Select label="Duration*" value={duration} onChange={e => setDuration(e.target.value as LeaveDuration)}
                    options={Object.values(LeaveDuration).map(ld => ({ value: ld, label: ld }))} required />
                <Input label="Start Date*" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                <Input label="End Date*" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required disabled={duration !== LeaveDuration.FULL_DAY} containerClassName={duration !== LeaveDuration.FULL_DAY ? 'opacity-50' : ''}/>
            </>
        )}
        
        <div>
            <label htmlFor="reason" className="block text-sm font-medium text-text-secondary mb-1">Reason*</label>
            <textarea id="reason" name="reason" rows={3} value={reason} onChange={e => setReason(e.target.value)} required 
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-action focus:border-primary-action sm:text-sm text-text-primary"
            />
        </div>
        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>Submit Request</Button>
        </div>
      </form>
    </Modal>
  );
};


const MyLeavePage: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());

  const fetchMyLeaveData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const details = await apiGetEmployeeById(user.id);
      setEmployeeDetails(details);
      
      if (details?.employeeId) {
        const requests = await apiGetLeaveRequestsForEmployee(details.employeeId);
        setLeaveRequests(requests);
      } else {
        setLeaveRequests([]);
        if (details) {
            console.warn("Logged in user does not have a custom employee ID.", details);
            addNotification("Your profile is missing an Employee ID, cannot fetch leave data.", "warning");
        }
      }
    } catch (error) { 
        console.error("Failed to fetch leave requests:", error); 
        addNotification("Failed to load your leave data.", "error");
    }
    setIsLoading(false);
  }, [user, addNotification]);

  useEffect(() => { fetchMyLeaveData(); }, [fetchMyLeaveData]);

  const handleRequestSubmit = async (data: Omit<LeaveRequest, 'id' | 'requestedAt' | 'status' | 'employeeId'>) => {
    if (!user || !employeeDetails?.employeeId) return;
    try {
        await apiAddLeaveRequest({ ...data, employeeId: employeeDetails.employeeId }, user.name);
        addNotification("Leave request submitted successfully.", "success");
        fetchMyLeaveData(); // Re-fetch data to ensure list is updated
    } catch (error) {
        addNotification(`Failed to submit request: ${(error as Error).message}`, "error");
        console.error("Failed to submit request:", error);
    }
  };
  
  const handleMultiRequestSubmit = async (data: Omit<LeaveRequest, 'id'|'requestedAt'|'status'|'employeeId'>[]) => {
      if (!user || !employeeDetails?.employeeId) return;
      try {
        const requestsWithEmployeeId = data.map(d => ({ ...d, employeeId: employeeDetails!.employeeId }));
        await apiAddMultipleLeaveRequests(requestsWithEmployeeId, user.name);
        addNotification("Off-day requests submitted successfully.", "success");
        fetchMyLeaveData();
      } catch (error) {
        addNotification(`Failed to submit requests: ${(error as Error).message}`, "error");
      }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!user) return;
    const confirmed = await showConfirmation({
      title: 'Cancel Leave Request',
      message: "Are you sure you want to cancel this leave request?",
      confirmText: 'Cancel Request',
      cancelText: 'No',
      confirmVariant: 'danger',
    });
    if (!confirmed) return;
    try {
      await apiCancelLeaveRequest(requestId, user.id);
      addNotification("Leave request cancelled.", "info");
      fetchMyLeaveData();
    } catch (error) { addNotification((error as Error).message || "Failed to cancel request.", "error"); }
  };
  
  const handleDeleteRequest = async (requestId: string) => {
    if (!user) return;
    const confirmed = await showConfirmation({
      title: 'Delete Leave Request',
      message: "Are you sure you want to permanently delete this leave request? This action cannot be undone.",
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });
    if (!confirmed) return;
    try {
      await apiDeleteLeaveRequest(requestId);
      addNotification("Leave request deleted.", "success");
      fetchMyLeaveData();
    } catch (error) { 
      addNotification((error as Error).message || "Failed to delete request.", "error"); 
    }
  };
  
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GB');

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-semibold text-text-primary">My Leave & Off Day Requests</h1>
        <div className="flex items-center gap-2">
            <Button variant={viewMode === 'list' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('list')}>List View</Button>
            <Button variant={viewMode === 'calendar' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('calendar')}>Calendar View</Button>
            <Button onClick={() => setIsModalOpen(true)} variant="primary">+ Request Leave / Off Day</Button>
        </div>
      </div>

       {employeeDetails && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mb-6">
             <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700"><p className="text-sm text-text-secondary dark:text-slate-400">Annual Leave (Approved Days)</p><p className="text-xl font-bold text-text-primary dark:text-slate-200">{leaveRequests.filter(lr => lr.leaveType === LeaveType.ANNUAL && lr.status === LeaveRequestStatus.APPROVED).length} / {employeeDetails.annualLeaveEntitlement || 'N/A'}</p></div>
             <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700"><p className="text-sm text-text-secondary dark:text-slate-400">Casual Leave (Approved Days)</p><p className="text-xl font-bold text-text-primary dark:text-slate-200">{leaveRequests.filter(lr => lr.leaveType === LeaveType.CASUAL && lr.status === LeaveRequestStatus.APPROVED).length} / {employeeDetails.casualLeaveEntitlement || 'N/A'}</p></div>
        </div>
       )}

      {isLoading ? <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div> : (
        viewMode === 'list' ? (
          leaveRequests.length > 0 ? (
          <div className="bg-container-bg dark:bg-slate-800 shadow-md rounded-lg overflow-x-auto border border-slate-200 dark:border-slate-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Requested</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {leaveRequests.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary dark:text-slate-200">{req.leaveType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">{req.duration}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">{formatDate(req.startDate)}{req.startDate !== req.endDate ? ` - ${formatDate(req.endDate)}` : ''}</td>
                    <td className="px-6 py-4 text-sm text-text-secondary dark:text-slate-400 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[req.status] || 'bg-gray-200 text-gray-700 dark:bg-slate-600 dark:text-slate-200'}`}>{req.status}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">{formatDate(req.requestedAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {(req.status === LeaveRequestStatus.PENDING || req.status === LeaveRequestStatus.APPROVED) && (
                        <Button variant="secondary" size="sm" onClick={() => handleCancelRequest(req.id)}>Cancel</Button>
                      )}
                      {(req.status === LeaveRequestStatus.PENDING || req.status === LeaveRequestStatus.CANCELLED) && (
                        <Button variant="danger" size="sm" onClick={() => handleDeleteRequest(req.id)}>Delete</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-center text-text-secondary py-8">You have not submitted any leave requests yet.</p>
        ) : (
             <LeaveCalendar year={calendarDate.getFullYear()} month={calendarDate.getMonth() + 1} events={leaveRequests.map(r => ({...r, title: `${r.leaveType} (${r.status})`}))} setDate={setCalendarDate} />
        )
      )}
      <RequestLeaveModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleRequestSubmit} onMultiSubmit={handleMultiRequestSubmit} />
    </div>
  );
};

const LeaveCalendar: React.FC<{ year: number; month: number; events: (LeaveRequest & {title: string})[]; setDate: (d: Date) => void; }> = ({ year, month, events, setDate }) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const date = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfMonth = date.getDay();

    const calendarCells = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarCells.push(<div key={`empty-start-${i}`} className="border p-2 bg-gray-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"></div>);
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
            const startDate = new Date(event.startDate); startDate.setHours(0,0,0,0);
            const endDate = new Date(event.endDate); endDate.setHours(23,59,59,999);
            return currentDate >= startDate && currentDate <= endDate;
        });

        calendarCells.push(
            <div key={day} className="border p-2 min-h-[120px] relative border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="font-bold text-sm text-gray-700 dark:text-slate-300">{day}</div>
                <div className="mt-1 space-y-1">
                    {dayEvents.map(event => (
                        <div key={event.id} title={event.title} className={`text-xs p-1 rounded truncate ${leaveTypeColors[event.leaveType] || 'bg-gray-400'} ${event.status === LeaveRequestStatus.PENDING ? 'opacity-70' : ''}`}>
                            {event.leaveType} {event.duration !== LeaveDuration.FULL_DAY ? `(${event.duration.split(' ')[0]})` : ''}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
                <Button size="sm" onClick={() => setDate(new Date(year, month - 2, 1))}>&lt; Prev</Button>
                <h3 className="text-xl font-semibold">{date.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                <Button size="sm" onClick={() => setDate(new Date(year, month, 1))}>Next &gt;</Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-sm mb-2">
                {days.map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {calendarCells}
            </div>
        </div>
    );
};


export default MyLeavePage;