import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { VisaCard, VisaReload, User, CashAccount } from '../../types';
import { apiGetVisaCards, apiGetVisaReloadsForPeriod, apiRecordVisaReload, apiGetUsers, apiUpdateVisaReload, apiDeleteVisaReload, apiGetCashAccounts, apiGetDailyExchangeRateByDate } from '../../services/api';
import { getTodayInYangon, getDateInYangonTimezone } from '../../utils/dateUtils';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import { alert as showAlert } from '../../utils/dialogUtils';

const AddEditReloadModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (reloadData: Partial<Omit<VisaReload, 'id' | 'recordedByUserId'>> & { id?: string }) => Promise<void>;
  cards: VisaCard[];
  accounts: CashAccount[];
  existingReload?: VisaReload | null;
}> = ({ isOpen, onClose, onSave, cards, accounts, existingReload }) => {
  const [cardId, setCardId] = useState('');
  const [amountMMK, setAmountMMK] = useState<number | ''>('');
  const [reloadDate, setReloadDate] = useState(getTodayInYangon());
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | ''>('');
  const [exchangeRateError, setExchangeRateError] = useState<string>('');
  const [isLoadingExchangeRate, setIsLoadingExchangeRate] = useState(false);

  const fetchExchangeRate = useCallback(async (date: string) => {
    if (!date) return;
    setIsLoadingExchangeRate(true);
    setExchangeRateError('');
    try {
      const rateData = await apiGetDailyExchangeRateByDate(date);
      if (rateData) {
        setExchangeRate(rateData.rate);
      } else {
        setExchangeRate('');
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('en-GB', { timeZone: 'Asia/Yangon' });
        setExchangeRateError(`No exchange rate set for ${formattedDate}. Please set the exchange rate in Daily Exchange Rate first.`);
      }
    } catch (error) {
      console.error("Failed to fetch exchange rate:", error);
      setExchangeRateError("Failed to fetch exchange rate. Please try again.");
      setExchangeRate('');
    }
    setIsLoadingExchangeRate(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (existingReload) {
        setCardId(existingReload.cardId);
        setAmountMMK(existingReload.amountMMK);
        setReloadDate(existingReload.reloadDate);
        setSourceAccountId(existingReload.sourceAccountId || '');
        fetchExchangeRate(existingReload.reloadDate);
      } else {
        const today = getTodayInYangon();
        setCardId(cards[0]?.id || '');
        setAmountMMK('');
        setReloadDate(today);
        setSourceAccountId(accounts.find(acc => acc.accountType === 'Bank Account' || acc.accountType === 'Mobile Wallet')?.id || '');
        setExchangeRateError('');
        fetchExchangeRate(today);
      }
    }
  }, [isOpen, existingReload, cards, accounts, fetchExchangeRate]);

  const handleDateChange = (value: string) => {
    setReloadDate(value);
    fetchExchangeRate(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardId || amountMMK === '' || Number(amountMMK) <= 0) {
      await showAlert("Card and a valid Amount (MMK) are required.", "Validation Error");
      return;
    }
    if (!sourceAccountId) {
      await showAlert("Source Account (Bank/Mobile Wallet) is required.", "Validation Error");
      return;
    }
    
    // Validate that exchange rate exists for the selected date
    if (!existingReload) {
      const rateData = await apiGetDailyExchangeRateByDate(reloadDate);
      if (!rateData) {
        const dateObj = new Date(reloadDate);
        const formattedDate = dateObj.toLocaleDateString('en-GB', { timeZone: 'Asia/Yangon' });
        setExchangeRateError(`No exchange rate set for ${formattedDate}. Please set the exchange rate in Daily Exchange Rate first.`);
        await showAlert('Please set the daily exchange rate for this date before recording a reload.', "Validation Error");
        return;
      }
    }
    
    const selectedAccount = accounts.find(acc => acc.id === sourceAccountId);
    setIsLoading(true);
    await onSave({ 
      id: existingReload?.id, 
      cardId, 
      reloadDate, 
      amountMMK: Number(amountMMK) || 0,
      sourceAccountId,
      sourceAccountType: selectedAccount?.accountType === 'Bank Account' ? 'Bank Account' : 'Mobile Wallet'
    });
    setIsLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingReload ? 'Edit Reload Record' : 'Record Visa Reload'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="Select Card*" value={cardId} onChange={e => setCardId(e.target.value)}
          options={cards.map(c => ({ value: c.id, label: `${c.cardName} (**** ${c.last4Digits})` }))} required />
        <Input label="Reload Date*" type="date" value={reloadDate} onChange={e => handleDateChange(e.target.value)} required />
        {isLoadingExchangeRate && (
          <div className="text-sm text-text-secondary dark:text-slate-400">
            Loading exchange rate...
          </div>
        )}
        {exchangeRateError && (
          <div className="text-sm text-status-danger dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
            {exchangeRateError}
          </div>
        )}
        {exchangeRate && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <p className="text-sm text-text-secondary dark:text-slate-400">
              Exchange Rate: <span className="font-semibold text-text-primary dark:text-slate-200">{Number(exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MMK/USD</span>
            </p>
            {amountMMK !== '' && Number(amountMMK) > 0 && (
              <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">
                Equivalent: <span className="font-semibold text-text-primary dark:text-slate-200">{(Number(amountMMK) / Number(exchangeRate)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
              </p>
            )}
          </div>
        )}
        <Input label="Amount (MMK)*" type="number" value={amountMMK} onChange={e => setAmountMMK(e.target.value === '' ? '' : parseFloat(e.target.value))} required disabled={!exchangeRate || exchangeRate === ''} />
        <Select
          label="Source Account*"
          value={sourceAccountId}
          onChange={e => setSourceAccountId(e.target.value)}
          options={[
            { value: '', label: '-- Select Account --' },
            ...accounts
              .filter(acc => acc.accountType === 'Bank Account' || acc.accountType === 'Mobile Wallet' || acc.accountType === 'Cash')
              .map(acc => {
                const displayName = acc.accountType === 'Bank Account' 
                  ? (acc.bankName || acc.name)
                  : acc.accountType === 'Mobile Wallet'
                  ? (acc.walletProvider || acc.name)
                  : acc.name;
                const last4Digits = acc.accountType === 'Bank Account' 
                  ? (acc.accountNumber ? acc.accountNumber.slice(-4) : '')
                  : acc.accountType === 'Mobile Wallet'
                  ? (acc.phoneNumber ? acc.phoneNumber.slice(-4) : '')
                  : '';
                const digitsDisplay = last4Digits ? ` (****${last4Digits})` : '';
                const label = acc.accountType === 'Cash' 
                  ? acc.name
                  : `${acc.name} - ${displayName}${digitsDisplay}`;
                return { 
                  value: acc.id, 
                  label: label
                };
              }),
          ]}
          required
        />
        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>{existingReload ? "Save Changes" : "Record Reload"}</Button>
        </div>
      </form>
    </Modal>
  );
};


const CardReloadsTab: React.FC = () => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();
    const [cards, setCards] = useState<VisaCard[]>([]);
    const [reloads, setReloads] = useState<VisaReload[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [accounts, setAccounts] = useState<CashAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReload, setEditingReload] = useState<VisaReload | null>(null);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedCardId, setSelectedCardId] = useState<string>('');

    useEffect(() => {
        const today = new Date();
        // Use Yangon timezone for date calculations
        const formatter = new Intl.DateTimeFormat('en-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'Asia/Yangon',
        });
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        setStartDate(formatter.format(firstDay));
        setEndDate(formatter.format(lastDay));
    }, []);

    const fetchData = useCallback(async () => {
        if (!startDate || !endDate) return;
        setIsLoading(true);
        try {
            const [fetchedCards, fetchedUsers, fetchedReloads, fetchedAccounts] = await Promise.all([
                apiGetVisaCards(),
                apiGetUsers(),
                apiGetVisaReloadsForPeriod(startDate, endDate),
                apiGetCashAccounts()
            ]);
            setCards(fetchedCards);
            setUsers(fetchedUsers);
            setReloads(fetchedReloads);
            setAccounts(fetchedAccounts);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            addNotification("Failed to fetch card reload data.", "error");
        }
        setIsLoading(false);
    }, [startDate, endDate, addNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (reload: VisaReload | null = null) => {
        setEditingReload(reload);
        setIsModalOpen(true);
    };

    const handleSaveReload = async (reloadData: Partial<Omit<VisaReload, 'id' | 'recordedByUserId'>> & { id?: string }) => {
        if (!user) {
            addNotification("Authentication error.", "error");
            return;
        }
        try {
            if (reloadData.id) {
                await apiUpdateVisaReload(reloadData as VisaReload);
                addNotification("Reload record updated.", "success");
            } else {
                const { id, ...dataForCreation } = reloadData; // Destructure to remove undefined id
                await apiRecordVisaReload({ ...dataForCreation, recordedByUserId: user.id } as Omit<VisaReload, 'id'>);
                addNotification("Reload recorded successfully.", "success");
            }
            fetchData();
            setIsModalOpen(false);
        } catch (error) {
            addNotification(`Failed to save reload: ${(error as Error).message}`, "error");
        }
    };

    const handleDeleteReload = async (reload: VisaReload) => {
        const confirmed = await showConfirmation({
          title: 'Delete Reload',
          message: `Are you sure you want to delete this reload of ${reload.amountMMK.toLocaleString()} MMK on ${formatDate(reload.reloadDate)}?`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          confirmVariant: 'danger',
        });
        if (confirmed) {
            try {
                await apiDeleteVisaReload(reload.id);
                addNotification("Reload record deleted.", "success");
                fetchData();
            } catch (error) {
                addNotification(`Failed to delete reload: ${(error as Error).message}`, "error");
            }
        }
    };
    
    const getCardInfo = (cardId: string) => {
        const card = cards.find(c => c.id === cardId);
        return card ? `${card.cardName} (**** ${card.last4Digits})` : cardId;
    };

    const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || userId;

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'Asia/Yangon'
        });
    };

    const filteredReloads = useMemo(() => {
        if (!selectedCardId) {
            return reloads;
        }
        return reloads.filter(reload => reload.cardId === selectedCardId);
    }, [reloads, selectedCardId]);

    const totalReloadsAmount = filteredReloads.reduce((sum, reload) => sum + reload.amountMMK, 0);
    
    const cardOptions = [{ value: '', label: 'All Cards' }, ...cards.map(c => ({ value: c.id, label: `${c.cardName} (**** ${c.last4Digits})` }))];

    return (
        <div className="space-y-4 pt-4">
             <div className="text-right">
                <Button onClick={() => handleOpenModal()} variant="primary">+ Record Reload</Button>
            </div>
            
            <div className="p-4 bg-container-bg dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <Input label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} containerClassName="mb-0" />
                    <Input label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} containerClassName="mb-0" />
                    <Select
                        label="Filter by Card"
                        value={selectedCardId}
                        onChange={e => setSelectedCardId(e.target.value)}
                        options={cardOptions}
                        containerClassName="mb-0"
                    />
                    <div className="bg-container-bg dark:bg-slate-800 p-3 rounded-md text-center border border-slate-200 dark:border-slate-700">
                        <p className="text-sm text-text-secondary dark:text-slate-400">Total Reloads in Period</p>
                        <p className="text-xl font-bold text-primary-action">{totalReloadsAmount.toLocaleString()} MMK</p>
                    </div>
                </div>
            </div>

            {isLoading ? <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div> : (
                filteredReloads.length > 0 ? (
                <div className="bg-container-bg dark:bg-slate-800 shadow-md rounded-lg overflow-x-auto border border-slate-200 dark:border-slate-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Reload Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Card</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Amount (MMK)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Recorded By</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                        {filteredReloads.sort((a,b) => new Date(b.reloadDate).getTime() - new Date(a.reloadDate).getTime()).map(reload => (
                            <tr key={reload.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary dark:text-slate-200">{formatDate(reload.reloadDate)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-slate-200">{getCardInfo(reload.cardId)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400 text-right">{reload.amountMMK.toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">{getUserName(reload.recordedByUserId)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center space-x-1">
                                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(reload)}>Edit</Button>
                                    <Button variant="danger" size="sm" onClick={() => handleDeleteReload(reload)}>Delete</Button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
                ) : <p className="text-center text-text-secondary dark:text-slate-400 py-8">No reloads recorded for this period.</p>
            )}
             <AddEditReloadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveReload} cards={cards} accounts={accounts} existingReload={editingReload} />
        </div>
    );
};

export default CardReloadsTab;