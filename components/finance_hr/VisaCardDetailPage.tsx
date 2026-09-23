import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { VisaCard, VisaReload, VisaCardSpend, User, CashAccount } from '../../types';
import {
    apiGetVisaCards,
    apiGetVisaReloadsForPeriod,
    apiGetVisaCardSpends,
    apiRecordVisaCardSpend,
    apiUpdateVisaCardSpend,
    apiDeleteVisaCardSpend,
    apiRecordVisaReload,
    apiGetUsers,
    apiGetCashAccounts,
    apiGetDailyExchangeRateByDate,
} from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import { getTodayInYangon } from '../../utils/dateUtils';

const VisaCardDetailPage: React.FC = () => {
    const { cardId } = useParams<{ cardId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation();

    const [card, setCard] = useState<VisaCard | null>(null);
    const [reloads, setReloads] = useState<VisaReload[]>([]);
    const [spends, setSpends] = useState<VisaCardSpend[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [accounts, setAccounts] = useState<CashAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'spends' | 'reloads'>('spends');
    const [isSpendModalOpen, setIsSpendModalOpen] = useState(false);
    const [isReloadModalOpen, setIsReloadModalOpen] = useState(false);
    const [editingSpend, setEditingSpend] = useState<VisaCardSpend | null>(null);

    // Filter states for Spends
    const [spendSearchTerm, setSpendSearchTerm] = useState('');
    const [spendStartDate, setSpendStartDate] = useState('');
    const [spendEndDate, setSpendEndDate] = useState('');

    // Filter states for Reloads
    const [reloadSearchTerm, setReloadSearchTerm] = useState('');
    const [reloadStartDate, setReloadStartDate] = useState('');
    const [reloadEndDate, setReloadEndDate] = useState('');

    // Spend form state
    const [spendDate, setSpendDate] = useState(getTodayInYangon());
    const [amountUSD, setAmountUSD] = useState<number | ''>('');
    const [amountMMK, setAmountMMK] = useState<number | ''>('');
    const [exchangeRate, setExchangeRate] = useState<number | ''>('');
    const [description, setDescription] = useState('');
    const [isSpendLoading, setIsSpendLoading] = useState(false);
    const [exchangeRateError, setExchangeRateError] = useState<string>('');
    const [isLoadingExchangeRate, setIsLoadingExchangeRate] = useState(false);

    // Reload form state
    const [reloadAmountMMK, setReloadAmountMMK] = useState<number | ''>('');
    const [reloadDate, setReloadDate] = useState(getTodayInYangon());
    const [sourceAccountId, setSourceAccountId] = useState('');
    const [isReloadLoading, setIsReloadLoading] = useState(false);
    const [reloadExchangeRate, setReloadExchangeRate] = useState<number | ''>('');
    const [reloadExchangeRateError, setReloadExchangeRateError] = useState<string>('');
    const [isLoadingReloadExchangeRate, setIsLoadingReloadExchangeRate] = useState(false);

    const fetchData = useCallback(async () => {
        if (!cardId) return;
        setIsLoading(true);
        try {
            const [fetchedCards, fetchedReloads, fetchedSpends, fetchedUsers, fetchedAccounts] = await Promise.all([
                apiGetVisaCards(),
                apiGetVisaReloadsForPeriod('2000-01-01', '2099-12-31', cardId), // Get reloads for this specific card
                apiGetVisaCardSpends(cardId),
                apiGetUsers(),
                apiGetCashAccounts(),
            ]);

            const foundCard = fetchedCards.find(c => c.id === cardId);
            if (!foundCard) {
                addNotification('Visa card not found.', 'error');
                navigate('/finance/visa-cards');
                return;
            }

            setCard(foundCard);
            setReloads(fetchedReloads);
            setSpends(fetchedSpends);
            setUsers(fetchedUsers);
            setAccounts(fetchedAccounts);
        } catch (error) {
            addNotification(`Failed to fetch card data: ${(error as Error).message}`, 'error');
        }
        setIsLoading(false);
    }, [cardId, navigate, addNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Calculate remaining balance
    const cardStats = useMemo(() => {
        const totalReloads = reloads.reduce((sum, r) => sum + r.amountMMK, 0);
        const totalSpends = spends.reduce((sum, s) => sum + s.amountMMK, 0);
        const remainingBalance = totalReloads - totalSpends;
        
        // Calculate USD values
        const totalSpendsUSD = spends.reduce((sum, s) => sum + s.amountUSD, 0);
        // Convert reloads from MMK to USD using average exchange rate from spends, or latest rate, or default 4152
        const averageExchangeRate = spends.length > 0 
            ? spends.reduce((sum, s) => sum + s.exchangeRate, 0) / spends.length
            : (spends.length > 0 ? spends[0].exchangeRate : 4152);
        const totalReloadsUSD = totalReloads / averageExchangeRate;
        const remainingBalanceUSD = totalReloadsUSD - totalSpendsUSD;
        
        // Calculate available limit USD (Monthly Limit - Total Spend USD for current month)
        const monthlyLimitUSD = card?.monthlyLimitUSD || (card?.monthlyLimitMMK ? card.monthlyLimitMMK / 4152 : 0);
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const currentMonthSpends = spends.filter(spend => {
            const spendDate = new Date(spend.spendDate);
            return spendDate.getMonth() + 1 === currentMonth && spendDate.getFullYear() === currentYear;
        });
        const currentMonthSpendUSD = currentMonthSpends.reduce((sum, s) => sum + s.amountUSD, 0);
        const availableLimitUSD = monthlyLimitUSD - currentMonthSpendUSD;
        
        return {
            totalReloads,
            totalSpends,
            remainingBalance,
            totalReloadsUSD,
            totalSpendsUSD,
            remainingBalanceUSD,
            averageExchangeRate,
            availableLimitUSD,
            monthlyLimitUSD,
        };
    }, [reloads, spends, card]);

    // Filtered spends
    const filteredSpends = useMemo(() => {
        let filtered = [...spends];

        // Filter by search term (description)
        if (spendSearchTerm) {
            const searchLower = spendSearchTerm.toLowerCase();
            filtered = filtered.filter(spend =>
                (spend.description || '').toLowerCase().includes(searchLower) ||
                spend.amountUSD.toString().includes(searchLower) ||
                spend.amountMMK.toString().includes(searchLower)
            );
        }

        // Filter by date range
        if (spendStartDate) {
            filtered = filtered.filter(spend => spend.spendDate >= spendStartDate);
        }
        if (spendEndDate) {
            filtered = filtered.filter(spend => spend.spendDate <= spendEndDate);
        }

        // Sort by date descending (most recent first)
        return filtered.sort((a, b) => new Date(b.spendDate).getTime() - new Date(a.spendDate).getTime());
    }, [spends, spendSearchTerm, spendStartDate, spendEndDate]);

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

    // Filtered reloads
    const filteredReloads = useMemo(() => {
        let filtered = [...reloads];

        // Filter by search term (source account name)
        if (reloadSearchTerm) {
            const searchLower = reloadSearchTerm.toLowerCase();
            filtered = filtered.filter(reload => {
                const accountName = reload.sourceAccountId
                    ? (accounts.find(a => a.id === reload.sourceAccountId)?.name || '').toLowerCase()
                    : '';
                const recordedByName = getUserName(reload.recordedByUserId).toLowerCase();
                return accountName.includes(searchLower) ||
                    reload.amountMMK.toString().includes(searchLower) ||
                    recordedByName.includes(searchLower);
            });
        }

        // Filter by date range
        if (reloadStartDate) {
            filtered = filtered.filter(reload => reload.reloadDate >= reloadStartDate);
        }
        if (reloadEndDate) {
            filtered = filtered.filter(reload => reload.reloadDate <= reloadEndDate);
        }

        // Sort by date descending (most recent first)
        return filtered.sort((a, b) => new Date(b.reloadDate).getTime() - new Date(a.reloadDate).getTime());
    }, [reloads, reloadSearchTerm, reloadStartDate, reloadEndDate, accounts, users]);

    // Fetch exchange rate for selected date
    const fetchExchangeRateForDate = useCallback(async (date: string) => {
        if (!date) return;
        setIsLoadingExchangeRate(true);
        setExchangeRateError('');
        try {
            const rateData = await apiGetDailyExchangeRateByDate(date);
            if (rateData) {
                const dailyRate = rateData.rate;
                setExchangeRate(dailyRate);
                // Auto-calculate MMK if USD is already entered
                if (amountUSD !== '' && Number(amountUSD) > 0) {
                    const mmk = Number(amountUSD) * dailyRate;
                    setAmountMMK(mmk);
                } else {
                    // Clear MMK if USD is cleared
                    setAmountMMK('');
                }
            } else {
                setExchangeRate('');
                setAmountMMK('');
                setExchangeRateError(`No exchange rate set for ${formatDate(date)}. Please set the exchange rate in Daily Exchange Rate first.`);
            }
        } catch (error) {
            console.error("Failed to fetch exchange rate:", error);
            setExchangeRateError("Failed to fetch exchange rate. Please try again.");
            setExchangeRate('');
            setAmountMMK('');
        }
        setIsLoadingExchangeRate(false);
    }, [amountUSD]);

    // Handle date change - fetch exchange rate for new date
    const handleSpendDateChange = (value: string) => {
        setSpendDate(value);
        fetchExchangeRateForDate(value);
    };

    // Auto-calculate MMK when USD changes (using exchange rate from Daily Exchange Rate)
    const handleAmountUSDChange = (value: string) => {
        const usd = value === '' ? '' : parseFloat(value);
        setAmountUSD(usd);
        if (usd !== '' && exchangeRate !== '' && Number(usd) > 0 && Number(exchangeRate) > 0) {
            const mmk = Number(usd) * Number(exchangeRate);
            setAmountMMK(mmk);
        } else if (usd === '') {
            setAmountMMK('');
        }
    };

    const handleOpenSpendModal = async (spend: VisaCardSpend | null = null) => {
        setEditingSpend(spend);
        if (spend) {
            setSpendDate(spend.spendDate);
            setAmountUSD(spend.amountUSD);
            setAmountMMK(spend.amountMMK);
            setExchangeRate(spend.exchangeRate);
            setDescription(spend.description || '');
            setExchangeRateError('');
        } else {
            const today = getTodayInYangon();
            setSpendDate(today);
            setAmountUSD('');
            setAmountMMK('');
            setExchangeRate('');
            setDescription('');
            setExchangeRateError('');
            // Fetch exchange rate for today
            await fetchExchangeRateForDate(today);
        }
        setIsSpendModalOpen(true);
    };

    const resetSpendForm = async () => {
        const today = getTodayInYangon();
        setSpendDate(today);
        setAmountUSD('');
        setAmountMMK('');
        setExchangeRate('');
        setDescription('');
        setExchangeRateError('');
        // Fetch exchange rate for today
        await fetchExchangeRateForDate(today);
    };

    const handleSaveSpend = async (e: React.FormEvent, continueAfterSave: boolean = false) => {
        e.preventDefault();
        if (!cardId || !user || amountUSD === '' || amountMMK === '' || exchangeRate === '') {
            addNotification('All fields are required.', 'error');
            return;
        }

        // Validate that exchange rate exists for the selected date and matches
        const rateData = await apiGetDailyExchangeRateByDate(spendDate);
        if (!rateData) {
            setExchangeRateError(`No exchange rate set for ${formatDate(spendDate)}. Please set the exchange rate in Daily Exchange Rate first.`);
            addNotification('Please set the daily exchange rate for this date before recording a spend.', 'error');
            setIsSpendLoading(false);
            return;
        }
        
        // Always use the daily exchange rate for that date (enforce consistency)
        const dailyRate = rateData.rate;
        
        // Validate that the exchange rate matches the daily exchange rate for that date
        const enteredRate = Number(exchangeRate);
        const tolerance = 0.01; // Allow small rounding differences
        
        if (Math.abs(enteredRate - dailyRate) > tolerance) {
            setExchangeRateError(`Exchange rate must match the daily exchange rate for ${formatDate(spendDate)} (${dailyRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MMK/USD).`);
            addNotification(`Exchange rate must match the daily exchange rate: ${dailyRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MMK/USD`, 'error');
            setIsSpendLoading(false);
            return;
        }
        
        // Validate that MMK amount matches USD × daily exchange rate
        const expectedMMK = Number(amountUSD) * dailyRate;
        const enteredMMK = Number(amountMMK);
        if (Math.abs(enteredMMK - expectedMMK) > 0.01) {
            setExchangeRateError(`Amount (MMK) must equal Amount (USD) × Exchange Rate (${expectedMMK.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MMK).`);
            addNotification(`Amount (MMK) must equal ${expectedMMK.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MMK based on the daily exchange rate.`, 'error');
            setIsSpendLoading(false);
            return;
        }

        setIsSpendLoading(true);
        try {
            // Use the daily exchange rate to ensure consistency
            const spendData: any = {
                spendDate,
                amountUSD: Number(amountUSD),
                amountMMK: Number(amountUSD) * dailyRate, // Recalculate to ensure accuracy
                exchangeRate: dailyRate, // Use the daily exchange rate
            };
            
            // Only include description if it's not empty
            if (description && description.trim()) {
                spendData.description = description.trim();
            }
            
            if (editingSpend) {
                await apiUpdateVisaCardSpend({
                    id: editingSpend.id,
                    ...spendData,
                });
                addNotification('Spend record updated successfully.', 'success');
                fetchData();
                setIsSpendModalOpen(false);
                setEditingSpend(null);
            } else {
                await apiRecordVisaCardSpend({
                    cardId,
                    ...spendData,
                    recordedByUserId: user.id,
                });
                addNotification('Spend recorded successfully.', 'success');
                fetchData();
                if (continueAfterSave) {
                    await resetSpendForm();
                } else {
                    setIsSpendModalOpen(false);
                    setEditingSpend(null);
                }
            }
        } catch (error) {
            addNotification(`Failed to save spend: ${(error as Error).message}`, 'error');
        }
        setIsSpendLoading(false);
    };

    const handleDeleteSpend = async (spend: VisaCardSpend) => {
        const confirmed = await showConfirmation({
            title: 'Delete Spend Record',
            message: `Are you sure you want to delete this spend record of ${spend.amountUSD} USD (${spend.amountMMK.toLocaleString()} MMK)?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            confirmVariant: 'danger',
        });
        if (confirmed) {
            try {
                await apiDeleteVisaCardSpend(spend.id);
                addNotification('Spend record deleted successfully.', 'success');
                fetchData();
            } catch (error) {
                addNotification(`Failed to delete spend: ${(error as Error).message}`, 'error');
            }
        }
    };

    const fetchReloadExchangeRate = useCallback(async (date: string) => {
        if (!date) return;
        setIsLoadingReloadExchangeRate(true);
        setReloadExchangeRateError('');
        try {
            const rateData = await apiGetDailyExchangeRateByDate(date);
            if (rateData) {
                setReloadExchangeRate(rateData.rate);
            } else {
                setReloadExchangeRate('');
                setReloadExchangeRateError(`No exchange rate set for ${formatDate(date)}. Please set the exchange rate in Daily Exchange Rate first.`);
            }
        } catch (error) {
            console.error("Failed to fetch exchange rate:", error);
            setReloadExchangeRateError("Failed to fetch exchange rate. Please try again.");
            setReloadExchangeRate('');
        }
        setIsLoadingReloadExchangeRate(false);
    }, []);

    const handleOpenReloadModal = async () => {
        const today = getTodayInYangon();
        setReloadAmountMMK('');
        setReloadDate(today);
        setSourceAccountId(accounts.find(acc => acc.accountType === 'Bank Account' || acc.accountType === 'Mobile Wallet')?.id || '');
        setReloadExchangeRateError('');
        setIsReloadModalOpen(true);
        // Fetch exchange rate for today
        await fetchReloadExchangeRate(today);
    };

    const handleReloadDateChange = (value: string) => {
        setReloadDate(value);
        fetchReloadExchangeRate(value);
    };

    const resetReloadForm = async () => {
        const today = getTodayInYangon();
        setReloadAmountMMK('');
        setReloadDate(today);
        setSourceAccountId(accounts.find(acc => acc.accountType === 'Bank Account' || acc.accountType === 'Mobile Wallet')?.id || '');
        setReloadExchangeRateError('');
        await fetchReloadExchangeRate(today);
    };

    const handleSaveReload = async (e: React.FormEvent, continueAfterSave: boolean = false) => {
        e.preventDefault();
        if (!cardId || !user || reloadAmountMMK === '' || !sourceAccountId) {
            addNotification('Amount and Source Account are required.', 'error');
            return;
        }

        // Validate that exchange rate exists for the selected date
        const rateData = await apiGetDailyExchangeRateByDate(reloadDate);
        if (!rateData) {
                setReloadExchangeRateError(`No exchange rate set for ${formatDate(reloadDate)}. Please set the exchange rate in Daily Exchange Rate first.`);
            addNotification('Please set the daily exchange rate for this date before recording a reload.', 'error');
            return;
        }

        setIsReloadLoading(true);
        try {
            const selectedAccount = accounts.find(acc => acc.id === sourceAccountId);
            await apiRecordVisaReload({
                cardId,
                reloadDate,
                amountMMK: Number(reloadAmountMMK),
                recordedByUserId: user.id,
                sourceAccountId,
                sourceAccountType: selectedAccount?.accountType === 'Bank Account' ? 'Bank Account' : 'Mobile Wallet',
            });
            addNotification('Reload recorded successfully.', 'success');
            fetchData();
            if (continueAfterSave) {
                await resetReloadForm();
            } else {
                setIsReloadModalOpen(false);
            }
        } catch (error) {
            addNotification(`Failed to record reload: ${(error as Error).message}`, 'error');
        }
        setIsReloadLoading(false);
    };

    if (isLoading) {
        return (
            <div className="p-6 flex justify-center items-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!card) {
        return (
            <div className="p-6">
                <p className="text-text-secondary">Card not found.</p>
                <Link to="/finance/visa-cards">
                    <Button variant="secondary" className="mt-4">Back to Visa Cards</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">
                        {card.cardName} (**** {card.last4Digits})
                    </h1>
                    <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">
                        Monthly Limit: {(card.monthlyLimitUSD || (card.monthlyLimitMMK ? card.monthlyLimitMMK / 4152 : 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </p>
                    {(card.phoneNumber || card.email) && (
                        <div className="flex gap-4 mt-2 text-sm text-text-secondary dark:text-slate-400">
                            {card.phoneNumber && (
                                <span className="flex items-center gap-1">
                                    <span className="font-medium">Phone:</span>
                                    <span className="text-text-primary dark:text-slate-200">{card.phoneNumber}</span>
                                </span>
                            )}
                            {card.email && (
                                <span className="flex items-center gap-1">
                                    <span className="font-medium">Email:</span>
                                    <span className="text-text-primary dark:text-slate-200">{card.email}</span>
                                </span>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleOpenReloadModal}>Quick Reload</Button>
                    <Button variant="primary" onClick={() => handleOpenSpendModal()}>+ Record Spend</Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-text-secondary dark:text-slate-400">Total Reloads</p>
                    <p className="text-2xl font-bold text-text-primary dark:text-slate-200">
                        {cardStats.totalReloads.toLocaleString()} <span className="text-lg font-normal">MMK</span>
                    </p>
                    <p className="text-xl font-semibold mt-1 text-text-secondary dark:text-slate-400">
                        {cardStats.totalReloadsUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-base font-normal">USD</span>
                    </p>
                </div>
                <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-text-secondary dark:text-slate-400">Total Spends</p>
                    <p className="text-2xl font-bold text-text-primary dark:text-slate-200">
                        {cardStats.totalSpends.toLocaleString()} <span className="text-lg font-normal">MMK</span>
                    </p>
                    <p className="text-xl font-semibold mt-1 text-text-secondary dark:text-slate-400">
                        {cardStats.totalSpendsUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-base font-normal">USD</span>
                    </p>
                </div>
                <div className={`p-4 rounded-lg shadow border-2 ${
                    cardStats.remainingBalance < 0 
                        ? 'bg-red-50 dark:bg-red-900/30 border-red-400 dark:border-red-600' 
                        : 'bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-600'
                }`}>
                    <p className={`text-sm font-medium ${
                        cardStats.remainingBalance < 0 
                            ? 'text-red-700 dark:text-red-300' 
                            : 'text-green-700 dark:text-green-300'
                    }`}>Remaining Balance</p>
                    <p className={`text-2xl font-bold ${
                        cardStats.remainingBalance < 0 
                            ? 'text-red-800 dark:text-red-200' 
                            : 'text-green-800 dark:text-green-200'
                    }`}>
                        {cardStats.remainingBalance.toLocaleString()} <span className="text-lg font-normal">MMK</span>
                    </p>
                    <p className={`text-xl font-semibold mt-1 ${
                        cardStats.remainingBalanceUSD < 0 
                            ? 'text-red-700 dark:text-red-300' 
                            : 'text-green-700 dark:text-green-300'
                    }`}>
                        {cardStats.remainingBalanceUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-base font-normal">USD</span>
                    </p>
                </div>
                <div className={`p-4 rounded-lg shadow border-2 ${
                    cardStats.availableLimitUSD < 0 
                        ? 'bg-red-50 dark:bg-red-900/30 border-red-400 dark:border-red-600' 
                        : cardStats.availableLimitUSD < cardStats.monthlyLimitUSD * 0.1
                        ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600'
                        : 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600'
                }`}>
                    <p className={`text-sm font-medium ${
                        cardStats.availableLimitUSD < 0 
                            ? 'text-red-700 dark:text-red-300' 
                            : cardStats.availableLimitUSD < cardStats.monthlyLimitUSD * 0.1
                            ? 'text-yellow-700 dark:text-yellow-300'
                            : 'text-blue-700 dark:text-blue-300'
                    }`}>Available Limit (USD)</p>
                    <p className={`text-2xl font-bold ${
                        cardStats.availableLimitUSD < 0 
                            ? 'text-red-800 dark:text-red-200' 
                            : cardStats.availableLimitUSD < cardStats.monthlyLimitUSD * 0.1
                            ? 'text-yellow-800 dark:text-yellow-200'
                            : 'text-blue-800 dark:text-blue-200'
                    }`}>
                        {cardStats.availableLimitUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-lg font-normal">USD</span>
                    </p>
                    <p className={`text-sm mt-1 ${
                        cardStats.availableLimitUSD < 0 
                            ? 'text-red-700 dark:text-red-300' 
                            : cardStats.availableLimitUSD < cardStats.monthlyLimitUSD * 0.1
                            ? 'text-yellow-700 dark:text-yellow-300'
                            : 'text-blue-700 dark:text-blue-300'
                    }`}>
                        Monthly Limit: {cardStats.monthlyLimitUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </p>
                </div>
            </div>

            {/* Card Information Section */}
            <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-text-primary dark:text-slate-100 mb-4">Card Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-text-secondary dark:text-slate-400">Phone Number</p>
                        <p className="text-base font-medium text-text-primary dark:text-slate-200">
                            {card.phoneNumber || <span className="text-text-secondary dark:text-slate-400 italic">Not provided</span>}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-text-secondary dark:text-slate-400">Email</p>
                        <p className="text-base font-medium text-text-primary dark:text-slate-200">
                            {card.email || <span className="text-text-secondary dark:text-slate-400 italic">Not provided</span>}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('spends')}
                        className={`pb-4 px-1 font-medium text-sm ${
                            activeTab === 'spends'
                                ? 'border-b-2 border-primary-action text-primary-action'
                                : 'border-b-2 border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'
                        }`}
                    >
                        Spends
                    </button>
                    <button
                        onClick={() => setActiveTab('reloads')}
                        className={`pb-4 px-1 font-medium text-sm ${
                            activeTab === 'reloads'
                                ? 'border-b-2 border-primary-action text-primary-action'
                                : 'border-b-2 border-transparent text-text-secondary dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500'
                        }`}
                    >
                        Reloads
                    </button>
                </nav>
            </div>

            {/* Spends Table */}
            {activeTab === 'spends' && (
                <div className="space-y-4">
                    {/* Spends Filters */}
                    <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                            <Input
                                label="Search"
                                value={spendSearchTerm}
                                onChange={e => setSpendSearchTerm(e.target.value)}
                                placeholder="Search by description, amount..."
                                containerClassName="lg:col-span-2 mb-0"
                            />
                            <Input
                                label="Start Date"
                                type="date"
                                value={spendStartDate}
                                onChange={e => setSpendStartDate(e.target.value)}
                                containerClassName="mb-0"
                            />
                            <Input
                                label="End Date"
                                type="date"
                                value={spendEndDate}
                                onChange={e => setSpendEndDate(e.target.value)}
                                containerClassName="mb-0"
                            />
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setSpendSearchTerm('');
                                    setSpendStartDate('');
                                    setSpendEndDate('');
                                }}
                                className="w-full"
                            >
                                Show All
                            </Button>
                        </div>
                    </div>

                    <div className="bg-container-bg dark:bg-slate-800 shadow-md rounded-lg overflow-x-auto border border-slate-200 dark:border-slate-700">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Date</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Amount (USD)</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Amount (MMK)</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Exchange Rate</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Description</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Recorded By</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                            {filteredSpends.length > 0 ? (
                                filteredSpends.map(spend => (
                                    <tr key={spend.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-200">
                                            {formatDate(spend.spendDate)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-200 text-right">
                                            {spend.amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-200 text-right">
                                            {spend.amountMMK.toLocaleString()} MMK
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400 text-right">
                                            {spend.exchangeRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400">
                                            {spend.description || '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                            {getUserName(spend.recordedByUserId)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center space-x-1">
                                            <Button variant="ghost" size="sm" onClick={() => handleOpenSpendModal(spend)}>
                                                Edit
                                            </Button>
                                            <Button variant="danger" size="sm" onClick={() => handleDeleteSpend(spend)}>
                                                Delete
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-text-secondary dark:text-slate-400">
                                        No spend records found. Record a spend to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    </div>
                </div>
            )}

            {/* Reloads Table */}
            {activeTab === 'reloads' && (
                <div className="space-y-4">
                    {/* Reloads Filters */}
                    <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                            <Input
                                label="Search"
                                value={reloadSearchTerm}
                                onChange={e => setReloadSearchTerm(e.target.value)}
                                placeholder="Search by account, amount, recorded by..."
                                containerClassName="lg:col-span-2 mb-0"
                            />
                            <Input
                                label="Start Date"
                                type="date"
                                value={reloadStartDate}
                                onChange={e => setReloadStartDate(e.target.value)}
                                containerClassName="mb-0"
                            />
                            <Input
                                label="End Date"
                                type="date"
                                value={reloadEndDate}
                                onChange={e => setReloadEndDate(e.target.value)}
                                containerClassName="mb-0"
                            />
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setReloadSearchTerm('');
                                    setReloadStartDate('');
                                    setReloadEndDate('');
                                }}
                                className="w-full"
                            >
                                Show All
                            </Button>
                        </div>
                    </div>

                    <div className="bg-container-bg dark:bg-slate-800 shadow-md rounded-lg overflow-x-auto border border-slate-200 dark:border-slate-700">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Reload Date</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Amount (MMK)</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Source Account</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Recorded By</th>
                            </tr>
                        </thead>
                        <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                            {filteredReloads.length > 0 ? (
                                filteredReloads.map(reload => (
                                    <tr key={reload.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-200">
                                            {formatDate(reload.reloadDate)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary dark:text-slate-200 text-right">
                                            {reload.amountMMK.toLocaleString()} MMK
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                            {reload.sourceAccountId 
                                                ? accounts.find(a => a.id === reload.sourceAccountId)?.name || reload.sourceAccountId
                                                : '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                                            {getUserName(reload.recordedByUserId)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-text-secondary dark:text-slate-400">
                                        No reload records found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    </div>
                </div>
            )}

            {/* Record Spend Modal */}
            <Modal
                isOpen={isSpendModalOpen}
                onClose={() => {
                    setIsSpendModalOpen(false);
                    setEditingSpend(null);
                }}
                title={editingSpend ? 'Edit Spend Record' : 'Record Visa Card Spend'}
            >
                <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-4">
                    <Input
                        label="Spend Date*"
                        type="date"
                        value={spendDate}
                        onChange={e => handleSpendDateChange(e.target.value)}
                        required
                    />
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
                    <Input
                        label="Amount (USD)*"
                        type="number"
                        value={amountUSD}
                        onChange={e => handleAmountUSDChange(e.target.value)}
                        step="0.01"
                        required
                        disabled={!exchangeRate || exchangeRate === ''}
                    />
                    <Input
                        label="Amount (MMK)*"
                        type="number"
                        value={amountMMK}
                        onChange={e => setAmountMMK(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        step="0.01"
                        required
                        disabled
                        readOnly
                        placeholder="Auto-calculated from USD × Exchange Rate"
                    />
                    <Input
                        label="Exchange Rate (MMK/USD)*"
                        type="number"
                        value={exchangeRate}
                        step="0.01"
                        required
                        disabled
                        readOnly
                        placeholder="From Daily Exchange Rate"
                    />
                    {!editingSpend && exchangeRate && (
                        <div className="text-xs text-text-secondary dark:text-slate-400">
                            Exchange rate from Daily Exchange Rate for {formatDate(spendDate)}
                        </div>
                    )}
                    <Input
                        label="Description"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        as="textarea"
                        rows={2}
                    />
                    <div className="flex justify-end space-x-2 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setIsSpendModalOpen(false);
                                setEditingSpend(null);
                            }}
                        >
                            Cancel
                        </Button>
                        {editingSpend ? (
                            <Button type="button" variant="primary" isLoading={isSpendLoading} onClick={(e) => handleSaveSpend(e, false)}>
                                Save Changes
                            </Button>
                        ) : (
                            <>
                                <Button type="button" variant="secondary" onClick={(e) => handleSaveSpend(e, true)} isLoading={isSpendLoading}>
                                    Save and Add Another
                                </Button>
                                <Button type="button" variant="primary" onClick={(e) => handleSaveSpend(e, false)} isLoading={isSpendLoading}>
                                    Save and Exit
                                </Button>
                            </>
                        )}
                    </div>
                </form>
            </Modal>

            {/* Quick Reload Modal */}
            <Modal
                isOpen={isReloadModalOpen}
                onClose={() => setIsReloadModalOpen(false)}
                title="Quick Reload"
            >
                <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-4">
                    <Input
                        label="Reload Date*"
                        type="date"
                        value={reloadDate}
                        onChange={e => handleReloadDateChange(e.target.value)}
                        required
                    />
                    {isLoadingReloadExchangeRate && (
                        <div className="text-sm text-text-secondary dark:text-slate-400">
                            Loading exchange rate...
                        </div>
                    )}
                    {reloadExchangeRateError && (
                        <div className="text-sm text-status-danger dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                            {reloadExchangeRateError}
                        </div>
                    )}
                    {reloadExchangeRate && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                            <p className="text-sm text-text-secondary dark:text-slate-400">
                                Exchange Rate: <span className="font-semibold text-text-primary dark:text-slate-200">{Number(reloadExchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MMK/USD</span>
                            </p>
                            {reloadAmountMMK !== '' && Number(reloadAmountMMK) > 0 && (
                                <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">
                                    Equivalent: <span className="font-semibold text-text-primary dark:text-slate-200">{(Number(reloadAmountMMK) / Number(reloadExchangeRate)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                                </p>
                            )}
                        </div>
                    )}
                    <Input
                        label="Amount (MMK)*"
                        type="number"
                        value={reloadAmountMMK}
                        onChange={e => setReloadAmountMMK(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        required
                        disabled={!reloadExchangeRate || reloadExchangeRate === ''}
                    />
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
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsReloadModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="button" variant="secondary" onClick={(e) => handleSaveReload(e, true)} isLoading={isReloadLoading}>
                            Save and Add Another
                        </Button>
                        <Button type="button" variant="primary" onClick={(e) => handleSaveReload(e, false)} isLoading={isReloadLoading}>
                            Save and Exit
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default VisaCardDetailPage;





