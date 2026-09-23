import React, { useState, useEffect, useCallback } from 'react';
import {
  apiGetLoanAgreements,
  apiSaveLoanAgreement,
  apiDeleteLoanAgreement,
  apiRecordLoanPayment,
  apiGetLoanPayments,
} from '../../services/api';
import { LoanAgreement, LoanPayment } from '../../types';
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
import { useConfirmation } from '../../hooks/useConfirmation';
import FinanceTable from './shared/FinanceTable';
import { useSearchFilter } from '../../hooks/useFinanceFilters';

const LoansManagementTab: React.FC = () => {
  const { addNotification } = useNotification();
  const { confirm } = useConfirmation();
  const [loans, setLoans] = useState<LoanAgreement[]>([]);
  const [loanPayments, setLoanPayments] = useState<LoanPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<LoanAgreement | null>(null);
  const [selectedLoanForHistory, setSelectedLoanForHistory] = useState<LoanAgreement | null>(null);
  const [editingLoan, setEditingLoan] = useState<LoanAgreement | null>(null);
  const [loanForm, setLoanForm] = useState({
    lender: '',
    principal: '',
    currency: 'MMK',
    interestRate: '',
    startDate: new Date().toISOString().split('T')[0],
    maturityDate: '',
    paymentFrequency: 'Monthly',
  });
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    principalPaid: '',
    interestPaid: '',
  });

  const { searchTerm, setSearchTerm, filterBySearch } = useSearchFilter<LoanAgreement>();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [loanData, paymentData] = await Promise.all([
        apiGetLoanAgreements(),
        apiGetLoanPayments(),
      ]);
      setLoans(loanData);
      setLoanPayments(paymentData);
    } catch (error) {
      console.error('Error loading loans:', error);
      addNotification((error as Error).message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenLoanModal = (loan: LoanAgreement | null = null) => {
    if (loan) {
      setEditingLoan(loan);
      setLoanForm({
        lender: loan.lender,
        principal: String(loan.principal),
        currency: loan.currency,
        interestRate: String(loan.interestRate),
        startDate: loan.startDate,
        maturityDate: loan.maturityDate,
        paymentFrequency: loan.paymentFrequency,
      });
    } else {
      setEditingLoan(null);
      setLoanForm({
        lender: '',
        principal: '',
        currency: 'MMK',
        interestRate: '',
        startDate: new Date().toISOString().split('T')[0],
        maturityDate: '',
        paymentFrequency: 'Monthly',
      });
    }
    setIsLoanModalOpen(true);
  };

  const handleSaveLoan = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!loanForm.lender || !loanForm.principal || !loanForm.interestRate || !loanForm.startDate || !loanForm.maturityDate) {
      notifyWarning(addNotification, 'Fill in all required fields.');
      return;
    }

    const loanData: Partial<LoanAgreement> & { lender: string; principal: number; currency: string; interestRate: number; startDate: string; maturityDate: string; paymentFrequency: string } = {
      lender: loanForm.lender,
      principal: Number(loanForm.principal),
      currency: loanForm.currency,
      interestRate: Number(loanForm.interestRate),
      startDate: loanForm.startDate,
      maturityDate: loanForm.maturityDate,
      paymentFrequency: loanForm.paymentFrequency,
      ...(editingLoan ? { id: editingLoan.id, outstandingPrincipal: editingLoan.outstandingPrincipal } : {}),
    };

    const loan = await notifyOperationWithData(
      addNotification,
      () => apiSaveLoanAgreement(loanData),
      editingLoan
        ? `Loan "${loanForm.lender}" updated successfully.`
        : `Loan "${loanForm.lender}" added successfully.`,
      'Failed to save loan',
    );

    if (!loan) return;
    await loadData();
    setIsLoanModalOpen(false);
  };

  const handleDeleteLoan = async (loan: LoanAgreement) => {
    const confirmed = await confirm(
      `Delete Loan "${loan.lender}"?`,
      `Are you sure you want to delete this loan agreement? This action cannot be undone.`,
    );
    if (!confirmed) return;

    await notifyOperationWithData(
      addNotification,
      async () => {
        await apiDeleteLoanAgreement(loan.id);
        return true;
      },
      `Loan "${loan.lender}" deleted successfully.`,
      'Failed to delete loan',
    );
    await loadData();
  };

  const handleOpenPaymentModal = (loan?: LoanAgreement) => {
    if (loan) {
      setSelectedLoanForPayment(loan);
    } else if (loans.length > 0) {
      setSelectedLoanForPayment(loans[0]);
    } else {
      notifyWarning(addNotification, 'No loans available. Please add a loan first.');
      return;
    }
    setPaymentForm({
      paymentDate: new Date().toISOString().split('T')[0],
      principalPaid: '',
      interestPaid: '',
    });
    setIsPaymentModalOpen(true);
  };

  const handleOpenPaymentHistory = (loan: LoanAgreement) => {
    setSelectedLoanForHistory(loan);
    setIsPaymentHistoryOpen(true);
  };

  const handleRecordPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedLoanForPayment || !paymentForm.principalPaid) {
      notifyWarning(addNotification, 'Select a loan and enter principal amount.');
      return;
    }

    await notifyOperationWithData(
      addNotification,
      async () => {
        await apiRecordLoanPayment({
          loanId: selectedLoanForPayment.id,
          paymentDate: paymentForm.paymentDate,
          principalPaid: Number(paymentForm.principalPaid),
          interestPaid: Number(paymentForm.interestPaid) || 0,
        });
        return true;
      },
      'Loan payment recorded successfully.',
      'Failed to record loan payment',
    );
    await loadData();
    setIsPaymentModalOpen(false);
    setSelectedLoanForPayment(null);
  };

  const getLoanPayments = (loanId: string): LoanPayment[] => {
    return loanPayments.filter(p => p.loanId === loanId);
  };

  const getLoanName = (loanId: string): string => {
    const loan = loans.find(l => l.id === loanId);
    return loan ? loan.lender : loanId;
  };

  const filteredLoans = filterBySearch(loans, searchTerm, ['lender', 'currency']);

  const columns = [
    {
      key: 'lender',
      label: 'Lender',
      render: (loan: LoanAgreement) => (
        <div>
          <div className="font-semibold text-text-primary dark:text-slate-200">{loan.lender}</div>
          <div className="text-xs text-text-secondary dark:text-slate-400">Frequency: {loan.paymentFrequency}</div>
        </div>
      ),
    },
    {
      key: 'principal',
      label: 'Principal',
      render: (loan: LoanAgreement) => (
        <span className="text-text-primary dark:text-slate-200">
          {loan.principal.toLocaleString()} {loan.currency}
        </span>
      ),
    },
    {
      key: 'outstanding',
      label: 'Outstanding',
      render: (loan: LoanAgreement) => (
        <span className="font-medium text-text-primary dark:text-slate-200">
          {loan.outstandingPrincipal.toLocaleString()} {loan.currency}
        </span>
      ),
    },
    {
      key: 'interestRate',
      label: 'Interest Rate',
      render: (loan: LoanAgreement) => `${loan.interestRate}%`,
    },
    {
      key: 'maturityDate',
      label: 'Maturity Date',
      render: (loan: LoanAgreement) => loan.maturityDate,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (loan: LoanAgreement) => {
        const payments = getLoanPayments(loan.id);
        return (
          <div className="flex space-x-2">
            <Button variant="success" size="sm" onClick={() => handleOpenPaymentModal(loan)}>
              Record Payment
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleOpenPaymentHistory(loan)} title={`View ${payments.length} payment(s)`}>
              History ({payments.length})
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleOpenLoanModal(loan)}>
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => handleDeleteLoan(loan)}>
              Delete
            </Button>
          </div>
        );
      },
    },
  ];

  const totalOutstanding = loans.reduce((sum, loan) => sum + loan.outstandingPrincipal, 0);
  const totalPrincipal = loans.reduce((sum, loan) => sum + loan.principal, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-text-primary dark:text-slate-200">Loans & Borrowings</h2>
          <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">
            Manage loan agreements and track payments
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => handleOpenPaymentModal()} variant="success">
            + Record Payment
          </Button>
          <Button onClick={() => handleOpenLoanModal(null)} variant="primary">
            + Add Loan
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-text-secondary dark:text-slate-400">Total Principal</p>
          <p className="text-2xl font-bold text-primary-action">{totalPrincipal.toLocaleString()} MMK</p>
        </div>
        <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-text-secondary dark:text-slate-400">Outstanding Debt</p>
          <p className="text-2xl font-bold text-text-primary dark:text-slate-200">{totalOutstanding.toLocaleString()} MMK</p>
        </div>
      </div>

      {/* Search Filter */}
      <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
        <Input
          label="Search Loans"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search by lender or currency..."
          containerClassName="mb-0"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      ) : (
        <FinanceTable data={filteredLoans} columns={columns} rowKey="id" />
      )}

      {/* Add/Edit Loan Modal */}
      <Modal isOpen={isLoanModalOpen} onClose={() => setIsLoanModalOpen(false)} title={editingLoan ? 'Edit Loan' : 'Add Loan'} size="md">
        <form onSubmit={handleSaveLoan} className="space-y-4">
          <Input
            label="Lender*"
            value={loanForm.lender}
            onChange={e => setLoanForm({ ...loanForm, lender: e.target.value })}
            required
            placeholder="e.g., UAB Bank, KBZ Bank"
          />
          <Input
            label="Principal Amount*"
            type="number"
            value={loanForm.principal}
            onChange={e => setLoanForm({ ...loanForm, principal: e.target.value })}
            required
            min="0"
            step="0.01"
          />
          <Input
            label="Currency*"
            value={loanForm.currency}
            onChange={e => setLoanForm({ ...loanForm, currency: e.target.value })}
            required
          />
          <Input
            label="Interest Rate (%)*"
            type="number"
            value={loanForm.interestRate}
            onChange={e => setLoanForm({ ...loanForm, interestRate: e.target.value })}
            required
            min="0"
            step="0.01"
          />
          <Input
            label="Start Date*"
            type="date"
            value={loanForm.startDate}
            onChange={e => setLoanForm({ ...loanForm, startDate: e.target.value })}
            required
          />
          <Input
            label="Maturity Date*"
            type="date"
            value={loanForm.maturityDate}
            onChange={e => setLoanForm({ ...loanForm, maturityDate: e.target.value })}
            required
          />
          <Select
            label="Payment Frequency*"
            value={loanForm.paymentFrequency}
            onChange={e => setLoanForm({ ...loanForm, paymentFrequency: e.target.value })}
            options={[
              { value: 'Monthly', label: 'Monthly' },
              { value: 'Quarterly', label: 'Quarterly' },
              { value: 'Semi-Annual', label: 'Semi-Annual' },
              { value: 'Annual', label: 'Annual' },
            ]}
            required
          />
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsLoanModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingLoan ? 'Save Changes' : 'Add Loan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Record Loan Payment" size="md">
        {selectedLoanForPayment ? (
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <Select
              label="Select Loan*"
              value={selectedLoanForPayment.id}
              onChange={e => {
                const loan = loans.find(l => l.id === e.target.value);
                if (loan) setSelectedLoanForPayment(loan);
              }}
              options={loans.map(loan => ({
                value: loan.id,
                label: `${loan.lender} - Outstanding: ${loan.outstandingPrincipal.toLocaleString()} ${loan.currency}`,
              }))}
              required
            />
            <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-md">
              <p className="text-sm font-medium text-text-primary dark:text-slate-200">Loan: {selectedLoanForPayment.lender}</p>
              <p className="text-xs text-text-secondary dark:text-slate-400">
                Outstanding: {selectedLoanForPayment.outstandingPrincipal.toLocaleString()} {selectedLoanForPayment.currency}
              </p>
              <p className="text-xs text-text-secondary dark:text-slate-400">
                Interest Rate: {selectedLoanForPayment.interestRate}%
              </p>
            </div>
            <Input
              label="Payment Date*"
              type="date"
              value={paymentForm.paymentDate}
              onChange={e => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
              required
            />
            <Input
              label="Principal Paid*"
              type="number"
              value={paymentForm.principalPaid}
              onChange={e => setPaymentForm({ ...paymentForm, principalPaid: e.target.value })}
              required
              min="0"
              step="0.01"
              placeholder="Enter principal amount"
            />
            <Input
              label="Interest Paid"
              type="number"
              value={paymentForm.interestPaid}
              onChange={e => setPaymentForm({ ...paymentForm, interestPaid: e.target.value })}
              min="0"
              step="0.01"
              placeholder="Enter interest amount (optional)"
            />
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md text-xs text-text-secondary dark:text-slate-400">
              <p>Total Payment: <span className="font-semibold">
                {(Number(paymentForm.principalPaid) + Number(paymentForm.interestPaid || 0)).toLocaleString()} {selectedLoanForPayment.currency}
              </span></p>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Record Payment
              </Button>
            </div>
          </form>
        ) : (
          <div className="text-center py-4">
            <p className="text-text-secondary">No loans available. Please add a loan first.</p>
            <Button onClick={() => { setIsPaymentModalOpen(false); handleOpenLoanModal(null); }} variant="primary" className="mt-4">
              Add Loan
            </Button>
          </div>
        )}
      </Modal>

      {/* Payment History Modal */}
      <Modal isOpen={isPaymentHistoryOpen} onClose={() => setIsPaymentHistoryOpen(false)} title="Payment History" size="lg">
        {selectedLoanForHistory && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-md">
              <p className="text-sm font-medium text-text-primary dark:text-slate-200">Loan: {selectedLoanForHistory.lender}</p>
              <p className="text-xs text-text-secondary dark:text-slate-400">
                Principal: {selectedLoanForHistory.principal.toLocaleString()} {selectedLoanForHistory.currency}
              </p>
              <p className="text-xs text-text-secondary dark:text-slate-400">
                Outstanding: {selectedLoanForHistory.outstandingPrincipal.toLocaleString()} {selectedLoanForHistory.currency}
              </p>
            </div>
            {getLoanPayments(selectedLoanForHistory.id).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400">Date</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400">Principal</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400">Interest</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {getLoanPayments(selectedLoanForHistory.id).map(payment => (
                      <tr key={payment.id}>
                        <td className="px-4 py-2 text-sm text-text-primary dark:text-slate-200">{payment.paymentDate}</td>
                        <td className="px-4 py-2 text-sm text-right text-text-primary dark:text-slate-200">
                          {payment.principalPaid.toLocaleString()} {selectedLoanForHistory.currency}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-text-secondary dark:text-slate-400">
                          {payment.interestPaid.toLocaleString()} {selectedLoanForHistory.currency}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-text-primary dark:text-slate-200">
                          {(payment.principalPaid + payment.interestPaid).toLocaleString()} {selectedLoanForHistory.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <td className="px-4 py-2 text-sm font-medium text-text-primary dark:text-slate-200">Total</td>
                      <td className="px-4 py-2 text-sm text-right font-medium text-text-primary dark:text-slate-200">
                        {getLoanPayments(selectedLoanForHistory.id).reduce((sum, p) => sum + p.principalPaid, 0).toLocaleString()} {selectedLoanForHistory.currency}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-medium text-text-primary dark:text-slate-200">
                        {getLoanPayments(selectedLoanForHistory.id).reduce((sum, p) => sum + p.interestPaid, 0).toLocaleString()} {selectedLoanForHistory.currency}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-bold text-text-primary dark:text-slate-200">
                        {getLoanPayments(selectedLoanForHistory.id).reduce((sum, p) => sum + p.principalPaid + p.interestPaid, 0).toLocaleString()} {selectedLoanForHistory.currency}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <p>No payments recorded for this loan.</p>
                <Button onClick={() => { setIsPaymentHistoryOpen(false); handleOpenPaymentModal(selectedLoanForHistory); }} variant="primary" className="mt-4">
                  Record First Payment
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LoansManagementTab;

