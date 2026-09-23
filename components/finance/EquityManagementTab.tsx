import React, { useState, useEffect, useCallback } from 'react';
import {
  apiGetEquityEvents,
  apiRecordEquityEvent,
} from '../../services/api';
import { EquityEvent } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { useNotification } from '../../hooks/useNotification';
import {
  notifyOperationWithData,
  notifyWarning,
} from '../../utils/notificationUtils';
import FinanceTable from './shared/FinanceTable';
import { useDateRangeFilters } from '../../hooks/useFinanceFilters';

const EquityManagementTab: React.FC = () => {
  const { addNotification } = useNotification();
  const [equityEvents, setEquityEvents] = useState<EquityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [equityForm, setEquityForm] = useState({
    eventDate: new Date().toISOString().split('T')[0],
    type: 'Issuance' as EquityEvent['type'],
    amount: '',
    currency: 'MMK',
    description: '',
  });

  const { startDate, endDate, setStartDate, setEndDate, filterByDateRange } = useDateRangeFilters();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const equityData = await apiGetEquityEvents();
      setEquityEvents(equityData);
    } catch (error) {
      console.error('Error loading equity events:', error);
      addNotification((error as Error).message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Initialize date range to current month
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    setStartDate(firstDay);
    setEndDate(lastDay);
  }, [setStartDate, setEndDate]);

  const handleOpenModal = () => {
    setEquityForm({
      eventDate: new Date().toISOString().split('T')[0],
      type: 'Issuance',
      amount: '',
      currency: 'MMK',
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleSaveEquityEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!equityForm.amount) {
      notifyWarning(addNotification, 'Enter an amount for the equity event.');
      return;
    }

    const record = await notifyOperationWithData(
      addNotification,
      () => apiRecordEquityEvent({
        eventDate: equityForm.eventDate,
        type: equityForm.type,
        amount: Number(equityForm.amount),
        currency: equityForm.currency,
        description: equityForm.description || undefined,
      }),
      `Equity transaction (${equityForm.type}) logged successfully.`,
      'Failed to log equity transaction',
    );

    if (!record) return;
    await loadData();
    setIsModalOpen(false);
  };

  const filteredEvents = equityEvents.filter(event => filterByDateRange(event.eventDate));

  const columns = [
    {
      key: 'eventDate',
      label: 'Date',
      render: (event: EquityEvent) => event.eventDate,
    },
    {
      key: 'type',
      label: 'Type',
      render: (event: EquityEvent) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            event.type === 'Issuance'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : event.type === 'Dividend'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          {event.type}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (event: EquityEvent) => (
        <span className="font-medium text-text-primary dark:text-slate-200">
          {event.amount.toLocaleString()} {event.currency}
        </span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (event: EquityEvent) => event.description || '-',
    },
  ];

  const totalIssuance = filteredEvents
    .filter(e => e.type === 'Issuance')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalDividends = filteredEvents
    .filter(e => e.type === 'Dividend')
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-text-primary dark:text-slate-200">Equity Transactions</h2>
          <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">
            Track share issuances, dividends, and other equity movements
          </p>
        </div>
        <Button onClick={handleOpenModal} variant="primary">
          + Log Equity Event
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-text-secondary dark:text-slate-400">Total Issuance</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalIssuance.toLocaleString()} MMK</p>
        </div>
        <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-text-secondary dark:text-slate-400">Total Dividends</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalDividends.toLocaleString()} MMK</p>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            containerClassName="mb-0"
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            containerClassName="mb-0"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      ) : (
        <FinanceTable data={filteredEvents} columns={columns} rowKey="id" />
      )}

      {/* Log Equity Event Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Equity Event" size="md">
        <form onSubmit={handleSaveEquityEvent} className="space-y-4">
          <Select
            label="Event Type*"
            value={equityForm.type}
            onChange={e => setEquityForm({ ...equityForm, type: e.target.value as EquityEvent['type'] })}
            options={[
              { label: 'Share Issuance', value: 'Issuance' },
              { label: 'Dividend', value: 'Dividend' },
              { label: 'Retained Earnings', value: 'RetainedEarnings' },
              { label: 'Adjustment', value: 'Adjustment' },
            ]}
            required
          />
          <Input
            label="Event Date*"
            type="date"
            value={equityForm.eventDate}
            onChange={e => setEquityForm({ ...equityForm, eventDate: e.target.value })}
            required
          />
          <Input
            label="Amount*"
            type="number"
            value={equityForm.amount}
            onChange={e => setEquityForm({ ...equityForm, amount: e.target.value })}
            required
            min="0"
            step="0.01"
          />
          <Input
            label="Currency*"
            value={equityForm.currency}
            onChange={e => setEquityForm({ ...equityForm, currency: e.target.value })}
            required
          />
          <Input
            label="Description"
            value={equityForm.description}
            onChange={e => setEquityForm({ ...equityForm, description: e.target.value })}
            as="textarea"
            rows={3}
            placeholder="Optional description or notes..."
          />
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Log Event
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EquityManagementTab;

