import React, { useMemo } from 'react';
import { Payment, Client, User, PaymentStatus } from '../../../types';
import { 
    apiGetPayments, apiGetClients, apiGetUsers,
    apiDeletePayment
} from '../../../services/api';
import Button from '../../ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { useNotification } from '../../../hooks/useNotification';
import { useConfirmation } from '../../../hooks/useConfirmation';
import { useFinanceDataMultiple } from '../../../hooks/useFinanceData';
import { useFinanceFilters } from '../../../hooks/useFinanceFilters';
import { formatDate, getClientName } from '../../../utils/financeUtils';
import FinanceFilters from '../shared/FinanceFilters';
import FinanceTable from '../shared/FinanceTable';

const PaymentsTab: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();

  // Use shared data fetching hook
  const { data, isLoading, refetch } = useFinanceDataMultiple({
    payments: apiGetPayments,
    clients: apiGetClients,
    users: apiGetUsers,
  });

  const allPayments = (data.payments as Payment[]) || [];
  const clients = (data.clients as Client[]) || [];
  const users = (data.users as User[]) || [];

  // Use shared filters hook
  const filters = useFinanceFilters<Payment>();



  const handleDeletePayment = async (paymentId: string) => {
      const confirmed = await showConfirmation({
        title: 'Delete Payment',
        message: "Are you sure you want to delete this payment record? This will update client balances and cannot be undone.",
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmVariant: 'danger',
      });
      if (confirmed) {
          try {
              await apiDeletePayment(paymentId);
              addNotification("Payment deleted successfully.", "success");
              refetch();
          } catch (error) {
              addNotification(`Failed to delete payment: ${(error as Error).message}`, "error");
          }
      }
  };

  const filteredPayments = useMemo(() => {
    return allPayments.filter(p => {
      // Date filter
      if (!filters.filterByMonthYear(p.paymentDate)) {
        return false;
      }
      
      // Method filter
      if (!filters.filterByMethod(p.method)) {
        return false;
      }
      
      // Search filter
      if (!filters.filterBySearch(p, [
        'id',
        'receiptNumber',
        'invoiceId',
        'saleRecordId',
        'remark',
        'transactionLast4Digits',
        (item) => item.saleAllocations?.map(a => a.saleRecordId).join(' ') || '',
        (item) => getClientName(item.clientId, clients),
      ])) {
        return false;
      }
      
      return true;
    });
  }, [allPayments, filters, clients]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-text-primary dark:text-slate-200">Manage Payments & Receipts</h2>
      </div>

      <FinanceFilters
        searchTerm={filters.searchTerm}
        onSearchChange={filters.setSearchTerm}
        searchPlaceholder="ID, Client, Invoice/Sale ID, Receipt No..."
        searchLabel="Search Payments"
        showDateFilters={true}
        selectedMonth={filters.selectedMonth}
        selectedYear={filters.selectedYear}
        onMonthChange={filters.setSelectedMonth}
        onYearChange={filters.setSelectedYear}
        monthOptions={filters.monthOptions}
        yearOptions={filters.yearOptions}
        showMethodFilter={false}
        className="mb-6"
      />

      <FinanceTable
        columns={[
          { key: 'receiptNumber', label: 'Receipt No.', render: (p: Payment) => p.receiptNumber || p.id },
          { key: 'client', label: 'Client', render: (p: Payment) => getClientName(p.clientId, clients) },
          { 
            key: 'appliedTo', 
            label: 'Applied To', 
            render: (p: Payment) => {
              if (p.invoiceId) {
                const linkedSales = p.saleAllocations?.map(a => a.saleRecordId).filter(Boolean) || [];
                return linkedSales.length > 0
                  ? `Invoice: ${p.invoiceId} (Sales: ${linkedSales.join(', ')})`
                  : `Invoice: ${p.invoiceId}`;
              }
              if (p.saleAllocations && p.saleAllocations.length > 0) {
                const linkedSales = p.saleAllocations.map(a => a.saleRecordId).filter(Boolean);
                return `Sales: ${linkedSales.join(', ')}`;
              }
              if (p.saleRecordId) return `Sale: ${p.saleRecordId}`;
              return (
                <div>
                  <div>General Payment</div>
                  {p.status === PaymentStatus.APPROVED && (
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      Auto-allocated
                    </div>
                  )}
                </div>
              );
            }
          },
          { key: 'amount', label: 'Amount (MMK)', align: 'right', render: (p: Payment) => p.amountMMK.toLocaleString() },
          { key: 'date', label: 'Date', render: (p: Payment) => formatDate(p.paymentDate) },
          { key: 'method', label: 'Method', render: (p: Payment) => p.method },
          { key: 'remark', label: 'Remark', render: (p: Payment) => <span className="truncate max-w-xs" title={p.remark}>{p.remark || '-'}</span> },
          {
            key: 'actions',
            label: 'Actions',
            render: (p: Payment) => (
              <div className="space-x-1">
                <Button variant="danger" size="sm" onClick={() => handleDeletePayment(p.id)}>Delete</Button>
              </div>
            ),
          },
        ]}
        data={filteredPayments}
        isLoading={isLoading}
        emptyMessage="No client payments found for the selected criteria."
        rowKey="id"
      />
    </div>
  );
};

export default PaymentsTab;
