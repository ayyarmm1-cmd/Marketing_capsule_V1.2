import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CashAccount, AccountType, PaymentMethodSetting } from '../../types';
import {
  apiGetCashAccounts,
  apiAddCashAccount,
  apiUpdateCashAccount,
  apiDeleteCashAccount,
  apiGetPaymentMethodSettings,
  apiDeletePaymentMethodSetting,
} from '../../services/api';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import { formatDateForDisplay } from '../../utils/dateUtils';

// Add/Edit Account Modal (handles both CashAccount and legacy PaymentMethodSetting)
const AddEditAccountModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  existingAccount?: CashAccount | null;
  existingPaymentMethod?: PaymentMethodSetting | null;
}> = ({ isOpen, onClose, onSave, existingAccount, existingPaymentMethod }) => {
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  const [formData, setFormData] = useState({
    name: '',
    accountType: 'Bank Account' as AccountType,
    currency: 'MMK',
    balance: 0,
    initialBalance: '',
    institution: '',
    accountNumber: '',
    bankName: '',
    walletProvider: '',
    phoneNumber: '',
    isActive: true,
    showInPublic: false,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [qrCodePreview, setQrCodePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (existingAccount) {
      setFormData({
        name: existingAccount.name,
        accountType: existingAccount.accountType || 'Bank Account',
        currency: existingAccount.currency,
        balance: existingAccount.balance,
        initialBalance: (existingAccount.initialBalance || existingAccount.balance || 0).toString(),
        institution: existingAccount.institution || '',
        accountNumber: existingAccount.accountNumber || '',
        bankName: existingAccount.bankName || '',
        walletProvider: existingAccount.walletProvider || '',
        phoneNumber: existingAccount.phoneNumber || '',
        isActive: existingAccount.isActive ?? true,
        showInPublic: existingAccount.showInPublic ?? false,
      });
      setLogoPreview(existingAccount.logoUrl || null);
      setQrCodePreview(existingAccount.qrCodeUrl || null);
    } else if (existingPaymentMethod) {
      // Convert legacy payment method to account form
      setFormData({
        name: existingPaymentMethod.name,
        accountType: 'Mobile Wallet' as AccountType, // Default to Mobile Wallet for legacy methods
        currency: 'MMK',
        balance: 0,
        institution: '',
        accountNumber: existingPaymentMethod.accountNumber || '',
        bankName: '',
        walletProvider: '',
        phoneNumber: '',
        isActive: existingPaymentMethod.isActive,
        showInPublic: existingPaymentMethod.showInPublic ?? false,
      });
      setLogoPreview(existingPaymentMethod.logoUrl || null);
      setQrCodePreview(existingPaymentMethod.qrCodeUrl || null);
    } else {
      setFormData({
        name: '',
        accountType: 'Bank Account',
        currency: 'MMK',
        balance: 0,
        initialBalance: '',
        institution: '',
        accountNumber: '',
        bankName: '',
        walletProvider: '',
        phoneNumber: '',
        isActive: true,
        showInPublic: false,
      });
      setLogoPreview(null);
      setQrCodePreview(null);
    }
    setLogoFile(null);
    setQrCodeFile(null);
  }, [existingAccount, existingPaymentMethod, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'qr') => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > 2 * 1024 * 1024) {
      addNotification('Image file is too large. Max 2MB.', 'error');
      return;
    }

    if (type === 'logo') {
      setLogoFile(file);
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setLogoPreview(file ? URL.createObjectURL(file) : existingAccount?.logoUrl || existingPaymentMethod?.logoUrl || null);
    } else {
      setQrCodeFile(file);
      if (qrCodePreview) URL.revokeObjectURL(qrCodePreview);
      setQrCodePreview(file ? URL.createObjectURL(file) : existingAccount?.qrCodeUrl || existingPaymentMethod?.qrCodeUrl || null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      addNotification('Account name is required.', 'error');
      return;
    }
    // Validation for account types
    if (formData.accountType === 'Bank Account' && !formData.bankName) {
      addNotification('Bank name is required for bank accounts.', 'error');
      return;
    }
    if (formData.accountType === 'Mobile Wallet' && !formData.walletProvider) {
      addNotification('Wallet provider is required for mobile wallets.', 'error');
      return;
    }
    // For Cash accounts, no additional validation needed

    setIsLoading(true);
    try {
      const filesPayload = { logoFile, qrCodeFile };

      if (existingAccount) {
        const accountData: Partial<CashAccount> & { id: string } = {
          id: existingAccount.id,
          name: formData.name,
          accountType: formData.accountType,
          currency: formData.currency,
          institution: formData.institution || undefined,
          accountNumber: formData.accountNumber || undefined,
          bankName: formData.accountType === 'Bank Account' ? formData.bankName : undefined,
          walletProvider: formData.accountType === 'Mobile Wallet' ? formData.walletProvider : undefined,
          phoneNumber: formData.accountType === 'Mobile Wallet' ? formData.phoneNumber : undefined,
          isActive: formData.isActive,
          showInPublic: formData.showInPublic,
        };
        
        // Add initialBalance if provided
        const initialBalanceValue = formData.initialBalance ? parseFloat(formData.initialBalance) : 0;
        if (!isNaN(initialBalanceValue)) {
          accountData.initialBalance = initialBalanceValue;
        }
        
        await apiUpdateCashAccount(accountData, filesPayload);
        addNotification('Account updated successfully.', 'success');
      } else if (existingPaymentMethod) {
        // Convert legacy payment method to cash account
        const accountData: Omit<CashAccount, 'id' | 'createdAt' | 'updatedAt' | 'totalInflow' | 'totalOutflow' | 'logoUrl' | 'qrCodeUrl'> = {
          name: formData.name,
          accountType: formData.accountType,
          currency: formData.currency,
          balance: formData.balance,
          institution: formData.institution || undefined,
          accountNumber: formData.accountNumber || undefined,
          bankName: formData.accountType === 'Bank Account' ? formData.bankName : undefined,
          walletProvider: formData.accountType === 'Mobile Wallet' ? formData.walletProvider : undefined,
          phoneNumber: formData.accountType === 'Mobile Wallet' ? formData.phoneNumber : undefined,
          isActive: formData.isActive,
          showInPublic: formData.showInPublic,
        };
        // Preserve existing logo and QR code URLs if no new files are uploaded
        const existingUrls = {
          logoUrl: (!filesPayload.logoFile && existingPaymentMethod.logoUrl) ? existingPaymentMethod.logoUrl : undefined,
          qrCodeUrl: (!filesPayload.qrCodeFile && existingPaymentMethod.qrCodeUrl) ? existingPaymentMethod.qrCodeUrl : undefined,
        };
        await apiAddCashAccount(accountData, filesPayload, existingUrls);
        // Delete the legacy payment method
        await apiDeletePaymentMethodSetting(existingPaymentMethod.id);
        addNotification('Payment method converted to account successfully.', 'success');
      } else {
        const accountData: Omit<CashAccount, 'id' | 'createdAt' | 'updatedAt' | 'totalInflow' | 'totalOutflow' | 'logoUrl' | 'qrCodeUrl'> = {
          name: formData.name,
          accountType: formData.accountType,
          currency: formData.currency,
          balance: formData.balance,
          institution: formData.institution || undefined,
          accountNumber: formData.accountNumber || undefined,
          bankName: formData.accountType === 'Bank Account' ? formData.bankName : undefined,
          walletProvider: formData.accountType === 'Mobile Wallet' ? formData.walletProvider : undefined,
          phoneNumber: formData.accountType === 'Mobile Wallet' ? formData.phoneNumber : undefined,
          isActive: formData.isActive,
          showInPublic: formData.showInPublic,
        };
        await apiAddCashAccount(accountData, filesPayload);
        addNotification('Account added successfully.', 'success');
      }
      onClose();
      // Call onSave after closing modal to ensure state updates properly
      setTimeout(() => {
        onSave();
      }, 100);
    } catch (error) {
      addNotification(`Failed to save account: ${(error as Error).message}`, 'error');
    }
    setIsLoading(false);
  };

  const getModalTitle = () => {
    if (existingAccount) return 'Edit Account';
    if (existingPaymentMethod) return 'Convert to Account';
    return 'Register New Account';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getModalTitle()} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Account Name*"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <Select
          label="Account Type*"
          value={formData.accountType}
          onChange={e => setFormData({ ...formData, accountType: e.target.value as AccountType })}
          options={[
            { label: 'Bank Account', value: 'Bank Account' },
            { label: 'Mobile Wallet', value: 'Mobile Wallet' },
            { label: 'Cash', value: 'Cash' },
          ]}
          required
        />

        {formData.accountType === 'Bank Account' && (
          <>
            <Input
              label="Bank Name*"
              value={formData.bankName}
              onChange={e => setFormData({ ...formData, bankName: e.target.value })}
              required
            />
            <Input
              label="Account Number"
              value={formData.accountNumber}
              onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
            />
          </>
        )}

        {formData.accountType === 'Mobile Wallet' && (
          <>
            <Input
              label="Wallet Provider* (e.g., Wave Pay, KBZ Pay)"
              value={formData.walletProvider}
              onChange={e => setFormData({ ...formData, walletProvider: e.target.value })}
              required
            />
            <Input
              label="Phone Number"
              value={formData.phoneNumber}
              onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
            />
          </>
        )}

        <Input
          label="Institution (Optional)"
          value={formData.institution}
          onChange={e => setFormData({ ...formData, institution: e.target.value })}
        />

        <Select
          label="Currency*"
          value={formData.currency}
          onChange={e => setFormData({ ...formData, currency: e.target.value })}
          options={[
            { label: 'MMK', value: 'MMK' },
            { label: 'USD', value: 'USD' },
          ]}
          required
        />

        {existingAccount ? (
          <Input
            label="Initial Balance"
            type="number"
            value={formData.initialBalance}
            onChange={e => setFormData({ ...formData, initialBalance: e.target.value })}
            placeholder="0"
            helpText="Set the initial/starting balance for this account"
          />
        ) : (
          <Input
            label="Initial Balance"
            type="number"
            value={formData.balance}
            onChange={e => setFormData({ ...formData, balance: Number(e.target.value) })}
            step="0.01"
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div>
            <Input label="Logo Image (Optional)" type="file" onChange={e => handleFileChange(e, 'logo')} accept="image/*" />
            {logoPreview && <img src={logoPreview} alt="Logo Preview" className="mt-2 h-16 w-auto object-contain border p-1 rounded" />}
          </div>
          <div>
            <Input label={formData.name === 'KBZ Pay (Quick Pay)' ? 'Instruction Image (Landscape)' : 'QR Code Image (Optional)'} type="file" onChange={e => handleFileChange(e, 'qr')} accept="image/*" />
            {qrCodePreview && <img src={qrCodePreview} alt="QR Preview" className="mt-2 h-16 w-auto object-contain border p-1 rounded" />}
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
            className="h-4 w-4"
          />
          <label htmlFor="isActive" className="ml-2 text-sm text-text-primary dark:text-slate-200">Active (can be used for payments)</label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="showInPublic"
            checked={formData.showInPublic}
            onChange={e => setFormData({ ...formData, showInPublic: e.target.checked })}
            className="h-4 w-4"
          />
          <label htmlFor="showInPublic" className="ml-2 text-sm text-text-primary dark:text-slate-200">Show on Public Payment Page</label>
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>
            {existingAccount ? 'Save Changes' : existingPaymentMethod ? 'Convert to Account' : 'Register Account'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};


const AccountManagementTab: React.FC = () => {
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CashAccount | null>(null);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethodSetting | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedAccounts, fetchedPaymentMethods] = await Promise.all([
        apiGetCashAccounts(),
        apiGetPaymentMethodSettings(),
      ]);
      setAccounts(fetchedAccounts);
      setPaymentMethods(fetchedPaymentMethods);
    } catch (error) {
      addNotification((error as Error).message, 'error');
    }
    setIsLoading(false);
  }, [addNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);



  const handleOpenModal = (account?: CashAccount | null, paymentMethod?: PaymentMethodSetting | null) => {
    setEditingAccount(account || null);
    setEditingPaymentMethod(paymentMethod || null);
    setIsModalOpen(true);
  };

  const handleDeleteAccount = async (accountId: string, accountName: string) => {
    const confirmed = await showConfirmation({
      title: 'Delete Account',
      message: `Are you sure you want to delete "${accountName}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });
    if (confirmed) {
      try {
        await apiDeleteCashAccount(accountId);
        addNotification(`"${accountName}" deleted successfully.`, 'success');
        loadData();
      } catch (error) {
        addNotification(`Failed to delete "${accountName}": ${(error as Error).message}`, 'error');
      }
    }
  };

  const handleDeletePaymentMethod = async (methodId: string, methodName: string) => {
    const confirmed = await showConfirmation({
      title: 'Delete Payment Method',
      message: `Are you sure you want to delete "${methodName}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });
    if (confirmed) {
      try {
        await apiDeletePaymentMethodSetting(methodId);
        addNotification(`"${methodName}" deleted successfully.`, 'success');
        loadData();
      } catch (error) {
        addNotification(`Failed to delete "${methodName}": ${(error as Error).message}`, 'error');
      }
    }
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center">
        <Button onClick={() => handleOpenModal()} variant="primary" size="sm">+ Register New Account</Button>
      </div>
      {accounts.length === 0 && paymentMethods.length === 0 ? (
        <p className="text-text-secondary dark:text-slate-400">No accounts registered yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Display Cash Accounts */}
          {accounts.map(account => (
            <div key={account.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 border border-slate-200 dark:border-slate-700 dark:shadow-xl">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  {account.logoUrl && <img src={account.logoUrl} alt={account.name} className="h-8 w-auto object-contain" />}
                  <div>
                    <p className="text-xs text-text-secondary dark:text-slate-400">{account.accountType}</p>
                    <p className="text-lg font-semibold text-text-primary dark:text-slate-100">{account.name}</p>
                    {account.bankName && <p className="text-sm text-text-secondary dark:text-slate-400">{account.bankName}</p>}
                    {account.walletProvider && <p className="text-sm text-text-secondary dark:text-slate-400">{account.walletProvider}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {account.showInPublic && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      Public
                    </span>
                  )}
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${account.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'}`}>
                    {account.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <p className="text-2xl font-bold mt-2 text-text-primary dark:text-slate-100">
                {((account.initialBalance || 0) + (account.totalInflow || 0) - (account.totalOutflow || 0)).toLocaleString()} {account.currency}
              </p>
              <p className="text-xs text-text-secondary dark:text-slate-400 mt-1">Current Balance</p>
              {account.accountNumber && <p className="text-xs text-text-secondary dark:text-slate-400 mt-1">Account #: {account.accountNumber}</p>}
              {account.phoneNumber && <p className="text-xs text-text-secondary dark:text-slate-400 mt-1">Phone: {account.phoneNumber}</p>}
              {account.lastActivityDate && (
                <p className="text-xs text-text-secondary dark:text-slate-400 mt-1">Last Activity: {formatDateForDisplay(account.lastActivityDate)}</p>
              )}
              <div className="flex gap-2 mt-4">
                <Link to={`/finance/cash/accounts/${account.id}`} className="flex-1">
                  <Button variant="primary" size="sm" className="w-full !px-2 !py-1 text-xs">View Details</Button>
                </Link>
                <Button onClick={() => handleOpenModal(account)} variant="secondary" size="sm" className="!px-2 !py-1 text-xs">Edit Account</Button>
                <Button onClick={() => handleDeleteAccount(account.id, account.name)} variant="danger" size="sm" className="!px-2 !py-1 text-xs">Delete</Button>
              </div>
            </div>
          ))}
          
          {/* Display Legacy Payment Methods (can be edited/converted) */}
          {paymentMethods.map(method => (
            <div key={method.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 border-2 border-amber-300 dark:border-amber-600 dark:shadow-xl">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  {method.logoUrl && <img src={method.logoUrl} alt={method.name} className="h-8 w-auto object-contain" />}
                  <div>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Legacy Payment Method</p>
                    <p className="text-lg font-semibold text-text-primary dark:text-slate-100">{method.name}</p>
                    {method.accountNumber && <p className="text-sm text-text-secondary dark:text-slate-400 font-mono">{method.accountNumber}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {method.showInPublic && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      Public
                    </span>
                  )}
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${method.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'}`}>
                    {method.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 italic">Needs to be converted to proper account type</p>
              {method.qrCodeUrl && (
                <div className="mt-2">
                  <img src={method.qrCodeUrl} alt="QR Code" className="h-24 w-auto object-contain mx-auto border p-1 rounded" />
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <Button onClick={() => handleOpenModal(null, method)} variant="primary" size="sm" className="!px-2 !py-1 text-xs">Convert to Account</Button>
                <Button onClick={() => handleDeletePaymentMethod(method.id, method.name)} variant="danger" size="sm" className="!px-2 !py-1 text-xs">Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AddEditAccountModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAccount(null);
          setEditingPaymentMethod(null);
        }}
        onSave={loadData}
        existingAccount={editingAccount}
        existingPaymentMethod={editingPaymentMethod}
      />
    </div>
  );
};

export default AccountManagementTab;

