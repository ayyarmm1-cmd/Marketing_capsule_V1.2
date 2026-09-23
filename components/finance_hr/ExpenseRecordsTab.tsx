import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Expense, ExpenseCategorySetting, User, UserRole, Permission, CashAccount } from '../../types';
import { 
    apiGetExpenses, apiAddExpense, apiGetExpenseCategorySettings, 
    apiGetUsers, apiUpdateExpense, apiDeleteExpense, apiGetCashAccounts
} from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import Modal from '../ui/Modal';

interface AddEditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expenseCategories: ExpenseCategorySetting[];
  instructors: User[];
  accounts: CashAccount[];
  existingExpense?: Expense | null;
}

const AddEditExpenseModal: React.FC<AddEditExpenseModalProps> = ({ 
    isOpen, onClose, onSuccess, expenseCategories, instructors, accounts, existingExpense
}) => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();

  const getInitialState = useCallback(() => {
    const defaultCategory = expenseCategories.length > 0 ? expenseCategories[0].name : '';
    return {
      expenseDate: existingExpense?.expenseDate || new Date().toISOString().split('T')[0],
      category: existingExpense?.category || defaultCategory,
      description: existingExpense?.description || '',
      amountMMK: existingExpense?.amountMMK || '',
      selectedInstructorId: existingExpense?.instructorId || '',
      sourceAccountId: existingExpense?.sourceAccountId || '',
    };
  }, [existingExpense, expenseCategories]);

  const [formData, setFormData] = useState(getInitialState());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialState());
    }
  }, [isOpen, getInitialState]);
  
  const isInstructorPaymentCategory = useMemo(() => formData.category === "Instructor Payment", [formData.category]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
        const newState = { ...prev, [name]: value };

        // If category changed, handle side-effects
        if (name === 'category') {
            if (value !== 'Instructor Payment') {
                newState.selectedInstructorId = '';
            }
        }

        return newState;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.description || formData.amountMMK === '' || Number(formData.amountMMK) <= 0) {
      addNotification("Category, Description, and a valid Amount are required.", "error");
      return;
    }
    if (!formData.sourceAccountId) {
      addNotification("Source Account is required.", "error");
      return;
    }
    if (isInstructorPaymentCategory && !formData.selectedInstructorId) {
      addNotification("For Instructor Payment, an instructor is required.", "error");
      return;
    }

    setIsLoading(true);
    const selectedAccount = accounts.find(acc => acc.id === formData.sourceAccountId);
    const expensePayload: Omit<Expense, 'id' | 'recordedByUserId' | 'receiptPhotoUrl' | 'createdAt' | 'updatedAt'> = {
      expenseDate: formData.expenseDate,
      category: formData.category,
      description: formData.description,
      amountMMK: Number(formData.amountMMK),
      sourceAccountId: formData.sourceAccountId,
      sourceAccountType: selectedAccount?.accountType === 'Bank Account' ? 'Bank Account' : selectedAccount?.accountType === 'Mobile Wallet' ? 'Mobile Wallet' : undefined,
      ...(isInstructorPaymentCategory && {
        instructorId: formData.selectedInstructorId,
      })
    };

    try {
      if (existingExpense) {
        await apiUpdateExpense({ ...expensePayload, id: existingExpense.id });
        addNotification("Expense updated successfully.", "success");
      } else {
        if (!user) throw new Error("User not authenticated.");
        await apiAddExpense({ ...expensePayload, recordedByUserId: user.id });
        addNotification("Expense added successfully.", "success");
      }
      onSuccess();
    } catch (error) {
      addNotification(`Failed to save expense: ${(error as Error).message}`, "error");
    }
    setIsLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingExpense ? "Edit Expense" : "Add New Expense"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto p-1">
        <Input label="Expense Date*" type="date" name="expenseDate" value={formData.expenseDate} onChange={handleChange} required />
        <Select label="Category*" name="category" value={formData.category} onChange={handleChange}
          options={expenseCategories.map(cat => ({ value: cat.name, label: cat.name }))} required />
        
        {isInstructorPaymentCategory && (
            <>
                <Select label="Instructor*" name="selectedInstructorId" value={formData.selectedInstructorId} onChange={handleChange}
                    options={instructors.map(i => ({ value: i.id, label: i.name }))} required placeholder="-- Select Instructor --" />
            </>
        )}

        <Input label="Description*" name="description" value={formData.description} onChange={handleChange} required />
        <Input label="Amount (MMK)*" name="amountMMK" type="number" value={String(formData.amountMMK)} onChange={handleChange} required min="0.01" step="any"/>
        <Select
          label="Source Account*"
          name="sourceAccountId"
          value={formData.sourceAccountId}
          onChange={handleChange}
          required
          options={[
            { value: '', label: '-- Select Account --' },
            ...accounts
              .filter(acc => acc.accountType === 'Bank Account' || acc.accountType === 'Mobile Wallet' || acc.accountType === 'Cash')
              .map(acc => {
                // Show bank name for Bank Accounts, wallet provider for Mobile Wallets, name for Cash
                const displayName = acc.accountType === 'Bank Account' 
                  ? (acc.bankName || acc.name)
                  : acc.accountType === 'Mobile Wallet'
                  ? (acc.walletProvider || acc.name)
                  : acc.name;
                // Get last 4 digits of account number or phone number (not applicable for Cash)
                const last4Digits = acc.accountType === 'Bank Account' 
                  ? (acc.accountNumber ? acc.accountNumber.slice(-4) : '')
                  : acc.accountType === 'Mobile Wallet'
                  ? (acc.phoneNumber ? acc.phoneNumber.slice(-4) : '')
                  : '';
                const digitsDisplay = last4Digits ? ` (****${last4Digits})` : '';
                // For Cash accounts, just show the name without the extra formatting
                const label = acc.accountType === 'Cash' 
                  ? acc.name
                  : `${acc.name} - ${displayName}${digitsDisplay}`;
                return { 
                  value: acc.id, 
                  label: label
                };
              }),
          ]}
        />
        <p className="text-xs text-text-secondary">Receipt photo upload not implemented in this version.</p>
        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>{existingExpense ? "Save Changes" : "Add Expense"}</Button>
        </div>
      </form>
    </Modal>
  );
};

const ExpenseRecordsTab: React.FC<{ onCategoryUpdate?: () => void }> = ({ onCategoryUpdate }) => {
  const { user, hasPermission } = useAuth();
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategorySetting[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    setFilterStartDate(firstDay);
    setFilterEndDate(lastDay);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedExpenses, fetchedCategories, fetchedUsers, fetchedAccounts] = await Promise.all([
        apiGetExpenses(), apiGetExpenseCategorySettings(), apiGetUsers(), apiGetCashAccounts(),
      ]);
      setExpenses(fetchedExpenses);
      setExpenseCategories(fetchedCategories.filter(cat => cat.isActive));
      setAccounts(fetchedAccounts);
      setUsers(fetchedUsers);
    } catch (error) {
      addNotification("Failed to fetch expense data.", "error");
    }
    setIsLoading(false);
  }, [addNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reload categories when they're updated from parent
  useEffect(() => {
    if (onCategoryUpdate) {
      apiGetExpenseCategorySettings().then(cats => {
        setExpenseCategories(cats.filter(cat => cat.isActive));
      });
    }
  }, [onCategoryUpdate]);

  const handleModalSuccess = () => {
    fetchData();
    setIsModalOpen(false);
    setEditingExpense(null);
  };
  
  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleDeleteExpense = async (expense: Expense) => {
    const confirmed = await showConfirmation({
      title: 'Delete Expense',
      message: `Are you sure you want to delete the expense: "${expense.description}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });
    if (confirmed) {
      try {
        await apiDeleteExpense(expense.id);
        addNotification("Expense deleted successfully.", "success");
        fetchData();
      } catch (error) {
        addNotification(`Failed to delete expense: ${(error as Error).message}`, "error");
      }
    }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GB');
  const getInstructorName = (id?: string) => users.find(u => u.id === id)?.name || id || '-';
  
  const instructorUsers = useMemo(() => 
      users.filter(u => u.role === UserRole.STAFF || u.role === UserRole.TEAM_LEADER || u.role === UserRole.ADMIN),
  [users]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const categoryMatch = !filterCategory || exp.category === filterCategory;
      const date = new Date(exp.expenseDate);
      const startDate = filterStartDate ? new Date(filterStartDate) : null;
      const endDate = filterEndDate ? new Date(filterEndDate) : null;
      if(startDate) startDate.setHours(0,0,0,0);
      if(endDate) endDate.setHours(23,59,59,999);
      const dateMatch = (!startDate || date >= startDate) && (!endDate || date <= endDate);
      return categoryMatch && dateMatch;
    });
  }, [expenses, filterCategory, filterStartDate, filterEndDate]);

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + exp.amountMMK, 0);
  }, [filteredExpenses]);

  const canManage = hasPermission(Permission.MANAGE_EXPENSES);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-text-primary dark:text-slate-200">Expense Records</h2>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="ghost" size="sm" title="Refresh">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
          {canManage && <Button onClick={() => { setEditingExpense(null); setIsModalOpen(true); }} variant="primary">+ Add Expense</Button>}
        </div>
      </div>
      
      <div className="p-4 bg-container-bg dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-text-secondary dark:text-slate-400">Total Expenses (Filtered)</p>
          <p className="text-3xl font-bold text-primary-action">{totalAmount.toLocaleString()} MMK</p>
      </div>

      <div className="p-4 bg-container-bg dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <Select label="Filter by Category" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                options={[{value: '', label: 'All Categories'}, ...expenseCategories.map(c => ({value: c.name, label: c.name}))]}
                containerClassName="mb-0" />
            <Input label="Start Date" type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} containerClassName="mb-0" />
            <Input label="End Date" type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} containerClassName="mb-0" />
        </div>
      </div>

      {isLoading ? <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div> : (
        filteredExpenses.length > 0 ? (
        <div className="bg-container-bg dark:bg-slate-800 shadow-md rounded-lg overflow-x-auto border border-slate-200 dark:border-slate-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Amount (MMK)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Instructor</th>
                {canManage && <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Actions</th>}
              </tr>
            </thead>
            <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {filteredExpenses.map(exp => (
                <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">{formatDate(exp.expenseDate)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-200">{exp.category}</td>
                  <td className="px-4 py-3 text-sm text-text-primary dark:text-slate-200">{exp.description}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-200 text-right font-medium">{exp.amountMMK.toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">{getInstructorName(exp.instructorId)}</td>
                   {canManage && (
                    <td className="px-4 py-3 whitespace-nowrap text-sm space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEditExpense(exp)}>Edit</Button>
                        <Button variant="danger" size="sm" onClick={() => handleDeleteExpense(exp)}>Delete</Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        ) : <p className="text-center text-text-secondary py-8">No expenses recorded for the selected period.</p>
      )}
      {isModalOpen && canManage && (
        <AddEditExpenseModal 
          isOpen={isModalOpen} 
          onClose={() => { setIsModalOpen(false); setEditingExpense(null); }} 
          onSuccess={handleModalSuccess}
          expenseCategories={expenseCategories} 
          instructors={instructorUsers}
          courses={[]}
          batches={[]}
          accounts={accounts}
          existingExpense={editingExpense}
        />
      )}
    </div>
  );
};

export default ExpenseRecordsTab;




