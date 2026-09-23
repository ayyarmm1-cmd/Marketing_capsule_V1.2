import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Holiday, LeaveRequest, LeaveRequestStatus, Employee, UserRole } from '../../types';
import {
  apiGetHolidays,
  apiGetAllLeaveRequests,
  apiGetUsers,
  apiAddHoliday,
  apiUpdateHoliday,
  apiDeleteHoliday,
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import RefreshButton from '../ui/RefreshButton';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';

type CalendarView = 'month' | 'week';

interface CalendarEvent {
  id: string;
  startDate: string;
  endDate: string;
  title: string;
  subtitle?: string;
  type: 'holiday' | 'leave';
  leaveType?: string;
  colorClass: string;
  raw?: Holiday | LeaveRequest;
}

const LEAVE_COLORS: Record<string, string> = {
  'Annual Leave': 'bg-emerald-500/90 text-white',
  'Casual Leave': 'bg-sky-500/90 text-white',
  'Unpaid Leave': 'bg-slate-500/90 text-white',
  'Off Day': 'bg-amber-500/90 text-white',
};

const HolidayCalendarPage: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  const canManageHolidays = user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER;

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [users, setUsers] = useState<(Employee & { employeeId?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [filterType, setFilterType] = useState<'all' | 'holidays' | 'leave'>('all');
  const [filterEmployee, setFilterEmployee] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState<CalendarEvent[] | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedHolidays, fetchedLeave, fetchedUsers] = await Promise.all([
        apiGetHolidays(),
        apiGetAllLeaveRequests(),
        apiGetUsers(),
      ]);
      setHolidays(fetchedHolidays);
      setLeaveRequests(fetchedLeave);
      setUsers(fetchedUsers as (Employee & { employeeId?: string })[]);
    } catch (error) {
      addNotification(`Failed to load calendar: ${(error as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getEmployeeName = useCallback(
    (employeeId: string) => users.find((u) => (u as Employee).employeeId === employeeId)?.name || 'Unknown',
    [users]
  );

  const calendarEvents = useMemo((): CalendarEvent[] => {
    const events: CalendarEvent[] = [];

    if (filterType === 'leave' || filterType === 'all') {
      const approved = leaveRequests.filter((r) => r.status === LeaveRequestStatus.APPROVED);
      approved.forEach((req) => {
        if (filterEmployee && req.employeeId !== filterEmployee) return;
        const name = getEmployeeName(req.employeeId);
        const colorClass = LEAVE_COLORS[req.leaveType] || 'bg-slate-500/90 text-white';
        const start = new Date(req.startDate + 'T00:00:00');
        const end = new Date(req.endDate + 'T23:59:59');
        const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
        for (let d = 0; d < days; d++) {
          const dte = new Date(start);
          dte.setDate(start.getDate() + d);
          const dateStr = dte.toISOString().slice(0, 10);
          events.push({
            id: `${req.id}-${dateStr}`,
            startDate: dateStr,
            endDate: dateStr,
            title: `${name} (${req.leaveType})`,
            subtitle: req.reason,
            type: 'leave',
            leaveType: req.leaveType,
            colorClass,
            raw: req,
          });
        }
      });
    }

    if (filterType === 'holidays' || filterType === 'all') {
      holidays.forEach((h) => {
        events.push({
          id: h.id,
          startDate: h.date,
          endDate: h.date,
          title: h.name,
          subtitle: h.description,
          type: 'holiday',
          colorClass: 'bg-rose-500/90 text-white',
          raw: h,
        });
      });
    }

    return events;
  }, [holidays, leaveRequests, users, filterType, filterEmployee, getEmployeeName]);

  const goPrev = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (view === 'month') next.setMonth(prev.getMonth() - 1);
      else next.setDate(prev.getDate() - 7);
      return next;
    });
  };

  const goNext = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (view === 'month') next.setMonth(prev.getMonth() + 1);
      else next.setDate(prev.getDate() + 7);
      return next;
    });
  };

  const goToday = () => setCurrentDate(new Date());

  const getEventsForDay = (date: Date): CalendarEvent[] => {
    date.setHours(0, 0, 0, 0);
    const dateStr = date.toISOString().slice(0, 10);
    return calendarEvents.filter((e) => {
      const start = new Date(e.startDate + 'T00:00:00');
      const end = new Date(e.endDate + 'T00:00:00');
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    });
  };

  const handleDayClick = (date: Date, dayEvents: CalendarEvent[]) => {
    setSelectedDateEvents(dayEvents.length > 0 ? dayEvents : null);
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cells: React.ReactNode[] = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push(
        <div key={`empty-${i}`} className="min-h-[100px] p-2 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700" />
      );
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const dayEvents = getEventsForDay(date);
      const isToday = date.getTime() === today.getTime();
      cells.push(
        <div
          key={day}
          onClick={() => handleDayClick(date, dayEvents)}
          className={`min-h-[100px] p-2 border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
            isToday ? 'ring-2 ring-primary-action ring-inset' : ''
          }`}
        >
          <div
            className={`text-sm font-semibold mb-1 ${
              isToday ? 'bg-primary-action text-white w-7 h-7 rounded-full flex items-center justify-center' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {day}
          </div>
          <div className="space-y-1 overflow-hidden">
            {dayEvents.slice(0, 3).map((e) => (
              <div
                key={e.id}
                className={`text-[10px] px-1.5 py-0.5 rounded truncate ${e.colorClass}`}
                title={e.subtitle || e.title}
              >
                {e.title}
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-[10px] text-slate-500">+{dayEvents.length - 3} more</div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div
            key={d}
            className="bg-slate-100 dark:bg-slate-700 py-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase"
          >
            {d}
          </div>
        ))}
        {cells}
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
        {days.map((day) => {
          day.setHours(0, 0, 0, 0);
          const dayEvents = getEventsForDay(day);
          const isToday = day.getTime() === today.getTime();
          return (
            <div
              key={day.toISOString()}
              onClick={() => handleDayClick(day, dayEvents)}
              className={`min-h-[280px] p-3 bg-white dark:bg-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                isToday ? 'ring-2 ring-primary-action ring-inset' : ''
              }`}
            >
              <div
                className={`text-sm font-bold mb-2 ${
                  isToday ? 'bg-primary-action text-white w-8 h-8 rounded-full flex items-center justify-center' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {day.getDate()}
              </div>
              <div className="text-xs text-slate-500 mb-2">
                {day.toLocaleDateString('default', { weekday: 'short' })}
              </div>
              <div className="space-y-1.5">
                {dayEvents.map((e) => (
                  <div
                    key={e.id}
                    className={`text-xs px-2 py-1 rounded ${e.colorClass} truncate`}
                    title={e.subtitle || e.title}
                  >
                    {e.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const headerTitle =
    view === 'month'
      ? currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })
      : (() => {
          const start = new Date(currentDate);
          start.setDate(start.getDate() - start.getDay());
          const end = new Date(start);
          end.setDate(end.getDate() + 6);
          return `${start.toLocaleDateString('default', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        })();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Holiday & Leave Calendar</h1>
          <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">
            Company holidays and employee leave at a glance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton onClick={fetchData} isLoading={isLoading} />
          {canManageHolidays && (
            <>
              <Button onClick={() => setIsManageModalOpen(true)} variant="secondary">Manage Holidays</Button>
              <Button onClick={() => { setEditingHoliday(null); setIsAddModalOpen(true); }} variant="primary">
                + Add Holiday
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters & View Controls */}
      <div className="flex flex-wrap gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">View:</span>
          <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
            <Button
              variant={view === 'month' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setView('month')}
              className="!rounded-none"
            >
              Month
            </Button>
            <Button
              variant={view === 'week' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setView('week')}
              className="!rounded-none"
            >
              Week
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Show:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'holidays' | 'leave')}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm px-3 py-1.5"
          >
            <option value="all">Holidays & Leave</option>
            <option value="holidays">Holidays Only</option>
            <option value="leave">Leave Only</option>
          </select>
        </div>
        {filterType !== 'holidays' && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Employee:</span>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm px-3 py-1.5 min-w-[140px]"
            >
              <option value="">All Employees</option>
              {users.map((u) => (
                <option key={u.id} value={(u as Employee).employeeId}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="sm" onClick={goPrev}>‹</Button>
          <Button variant="ghost" size="sm" onClick={goToday}>Today</Button>
          <Button variant="secondary" size="sm" onClick={goNext}>›</Button>
        </div>
        <h2 className="text-lg font-semibold text-text-primary dark:text-slate-100 min-w-[200px] text-center">
          {headerTitle}
        </h2>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-rose-500/90" />
          <span className="text-slate-600 dark:text-slate-400">Company Holiday</span>
        </div>
        {Object.entries(LEAVE_COLORS).map(([type, cls]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded ${cls}`} />
            <span className="text-slate-600 dark:text-slate-400">{type}</span>
          </div>
        ))}
      </div>

      {/* Calendar */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {view === 'month' ? renderMonthView() : renderWeekView()}
        </div>
      )}

      {/* Selected Day Details Modal */}
      {selectedDateEvents !== null && (
        <Modal
          isOpen={!!selectedDateEvents}
          onClose={() => setSelectedDateEvents(null)}
          title={selectedDateEvents.length > 0 ? new Date(selectedDateEvents[0].startDate + 'T00:00:00').toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Day Details'}
        >
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {selectedDateEvents.map((e) => (
              <div key={e.id} className={`p-3 rounded-lg ${e.colorClass}`}>
                <div className="font-medium">{e.title}</div>
                {e.subtitle && <div className="text-sm opacity-90 mt-0.5">{e.subtitle}</div>}
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Add/Edit Holiday Modal */}
      {isAddModalOpen && (
        <AddEditHolidayModal
          isOpen={isAddModalOpen}
          onClose={() => { setIsAddModalOpen(false); setEditingHoliday(null); }}
          onSuccess={() => {
            setIsAddModalOpen(false);
            setEditingHoliday(null);
            fetchData();
          }}
          existingHoliday={editingHoliday}
          user={user}
        />
      )}

      {/* Manage Holidays Modal */}
      {isManageModalOpen && canManageHolidays && (
        <ManageHolidaysModal
          holidays={holidays}
          onClose={() => setIsManageModalOpen(false)}
          onEdit={(h) => { setIsManageModalOpen(false); setEditingHoliday(h); setIsAddModalOpen(true); }}
          onDelete={async (h) => {
            const ok = await showConfirmation({
              title: 'Delete Holiday',
              message: `Delete "${h.name}" (${h.date})?`,
              confirmText: 'Delete',
              cancelText: 'Cancel',
              confirmVariant: 'danger',
            });
            if (ok) {
              try {
                await apiDeleteHoliday(h.id);
                addNotification('Holiday deleted.', 'success');
                fetchData();
              } catch (err) {
                addNotification(`Failed: ${(err as Error).message}`, 'error');
              }
            }
          }}
        />
      )}
    </div>
  );
};

interface ManageHolidaysModalProps {
  holidays: Holiday[];
  onClose: () => void;
  onEdit: (h: Holiday) => void;
  onDelete: (h: Holiday) => void;
}

const ManageHolidaysModal: React.FC<ManageHolidaysModalProps> = ({ holidays, onClose, onEdit, onDelete }) => (
  <Modal isOpen={true} title="Manage Holidays" onClose={onClose} size="lg">
    <div className="max-h-96 overflow-y-auto">
      {holidays.length === 0 ? (
        <p className="text-center text-slate-500 py-8">No holidays.</p>
      ) : (
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Date</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Description</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {holidays.map((h) => (
              <tr key={h.id}>
                <td className="px-4 py-2 text-sm">{new Date(h.date).toLocaleDateString('en-GB')}</td>
                <td className="px-4 py-2 text-sm font-medium">{h.name}</td>
                <td className="px-4 py-2 text-sm text-slate-500">{h.description || '-'}</td>
                <td className="px-4 py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(h)}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => onDelete(h)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </Modal>
);

interface AddEditHolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingHoliday: Holiday | null;
  user: { id: string } | null;
}

const AddEditHolidayModal: React.FC<AddEditHolidayModalProps> = ({ isOpen, onClose, onSuccess, existingHoliday, user }) => {
  const { addNotification } = useNotification();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (existingHoliday) {
        setName(existingHoliday.name);
        setDate(existingHoliday.date);
        setDescription(existingHoliday.description || '');
      } else {
        setName('');
        setDate(new Date().toISOString().slice(0, 10));
        setDescription('');
      }
    }
  }, [isOpen, existingHoliday]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) {
      addNotification('Name and date are required.', 'warning');
      return;
    }
    if (!user) return;
    setIsLoading(true);
    try {
      if (existingHoliday) {
        await apiUpdateHoliday({
          id: existingHoliday.id,
          name: name.trim(),
          date,
          description: description.trim() || undefined,
          createdAt: existingHoliday.createdAt,
          createdByUserId: existingHoliday.createdByUserId,
        });
        addNotification('Holiday updated.', 'success');
      } else {
        await apiAddHoliday({
          name: name.trim(),
          date,
          description: description.trim() || undefined,
          createdByUserId: user.id,
        });
        addNotification('Holiday added.', 'success');
      }
      onSuccess();
    } catch (err) {
      addNotification(`Failed: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingHoliday ? 'Edit Holiday' : 'Add Holiday'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Name *" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Date *" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <Input as="textarea" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>{existingHoliday ? 'Save' : 'Add'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default HolidayCalendarPage;
