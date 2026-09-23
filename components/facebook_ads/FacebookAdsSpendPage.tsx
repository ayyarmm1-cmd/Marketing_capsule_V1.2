
import React, { useState, useEffect, useCallback } from 'react';
import { FacebookAdAccount, FacebookInsight, ExpenseCategorySetting } from '../../types';
import { apiGetFacebookAdAccountsFromFirestore, apiGetFacebookAccountInsights, apiGetExpenseCategorySettings, apiAddExpense, isFacebookMockMode } from '../../services/api';
import { useNotification } from '../../hooks/useNotification';
import Spinner from '../ui/Spinner';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import MockDataBanner from './MockDataBanner';

const RecordSpendModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    insight: FacebookInsight | null;
    adAccountName: string;
    expenseCategories: ExpenseCategorySetting[];
}> = ({ isOpen, onClose, onSuccess, insight, adAccountName, expenseCategories }) => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const [exchangeRate, setExchangeRate] = useState<number | ''>('');
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    
    if (!insight) return null;

    const spendUSD = Number(insight.spend);
    const spendMMK = spendUSD * Number(exchangeRate || 0);
    const description = `Facebook Ad Spend for "${adAccountName}" from ${insight.date_start} to ${insight.date_stop}. Original spend: $${spendUSD.toLocaleString()} USD.`;
    
    const handleSubmit = async () => {
        if (!exchangeRate || exchangeRate <= 0 || !user) {
            addNotification("Please enter a valid exchange rate.", "error");
            return;
        }
        setIsLoading(true);
        try {
            const adSpendCategory = "Facebook Ad Spend";
            // Ensure the category exists or is handled gracefully
            if (!expenseCategories.some(cat => cat.name === adSpendCategory)) {
                // This is a soft-fail, we can proceed but warn the user.
                addNotification(`Expense category "${adSpendCategory}" not found. Please add it in Settings for better tracking.`, "warning", "Category Missing", 7000);
            }
            
            await apiAddExpense({
                expenseDate: expenseDate,
                category: adSpendCategory,
                description: description,
                amountMMK: spendMMK,
                recordedByUserId: user.id,
            });
            
            addNotification("Ad spend successfully recorded as an expense.", "success");
            onSuccess();
        } catch (error) {
            addNotification(`Failed to record expense: ${(error as Error).message}`, "error");
        }
        setIsLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Record Ad Spend as Expense">
            <div className="space-y-4">
                <p className="text-sm">This will create a permanent expense record in the finance module.</p>
                <Input label="Description" value={description} as="textarea" rows={3} disabled />
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Spend (USD)" value={`$${spendUSD.toLocaleString()}`} disabled />
                    <Input label="Exchange Rate (USD to MMK)*" type="number" value={String(exchangeRate)} onChange={e => setExchangeRate(Number(e.target.value))} required />
                </div>
                <Input label="Total Expense (MMK)" value={`${spendMMK.toLocaleString()} MMK`} disabled className="font-bold"/>
                <Input label="Expense Date" type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} isLoading={isLoading}>Record Expense</Button>
                </div>
            </div>
        </Modal>
    );
};


const FacebookAdsSpendPage: React.FC = () => {
    const { addNotification } = useNotification();
    const [adAccounts, setAdAccounts] = useState<FacebookAdAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [insight, setInsight] = useState<FacebookInsight | null>(null);
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategorySetting[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInsightLoading, setIsInsightLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [accounts, categories] = await Promise.all([
                apiGetFacebookAdAccountsFromFirestore(),
                apiGetExpenseCategorySettings()
            ]);
            setAdAccounts(accounts);
            setExpenseCategories(categories);
            if (accounts.length > 0) {
                setSelectedAccountId(accounts[0].id);
            }
        } catch (error) {
            addNotification("Failed to load initial data.", "error");
        }
        setIsLoading(false);
    }, [addNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFetchSpend = async () => {
        if (!selectedAccountId || !startDate || !endDate) {
            addNotification("Please select an ad account and a date range.", "warning");
            return;
        }
        setIsInsightLoading(true);
        setInsight(null);
        try {
            // NOTE: The placeholder API doesn't use the date range, but a real one would.
            const insightData = await apiGetFacebookAccountInsights(selectedAccountId);
            setInsight(insightData);
        } catch (error) {
            addNotification(`Failed to load insights for account ${selectedAccountId}.`, "error");
        }
        setIsInsightLoading(false);
    };
    
    const handleModalSuccess = () => {
        setIsModalOpen(false);
        setInsight(null); // Clear fetched insight after recording
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
    }

    if (adAccounts.length === 0) {
        return (
            <div className="p-6 bg-container-bg shadow-lg rounded-lg text-center">
                <h1 className="text-2xl font-semibold text-text-primary mb-4">Account Spend</h1>
                <p className="text-text-secondary">
                    No Facebook Ad Accounts found. Please connect your account in the settings page.
                </p>
            </div>
        );
    }

    const selectedAdAccount = adAccounts.find(acc => acc.id === selectedAccountId);

    return (
        <div className="space-y-6">
            <MockDataBanner />
            <h1 className="text-2xl font-semibold text-text-primary">Record Ad Account Spend</h1>
            {isFacebookMockMode() && (
                <p className="text-sm text-text-secondary dark:text-slate-400">
                    This flow demonstrates how Facebook spend can be tied back to ERP expenses. Use the mock accounts below to step through the experience reviewers expect.
                </p>
            )}
            
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <Select
                    label="Select Ad Account"
                    value={selectedAccountId}
                    onChange={e => setSelectedAccountId(e.target.value)}
                    options={adAccounts.map(acc => ({ value: acc.id, label: acc.name }))}
                    containerClassName="mb-0"
                />
                <Input label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} containerClassName="mb-0" />
                <Input label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} containerClassName="mb-0" />
                <Button onClick={handleFetchSpend} isLoading={isInsightLoading}>Fetch Spend</Button>
            </div>

            {isInsightLoading ? (
                <div className="flex justify-center p-8"><Spinner /></div>
            ) : insight ? (
                <div className="p-6 bg-white dark:bg-slate-700 rounded-lg shadow">
                    <h2 className="text-lg font-semibold">Spend for {selectedAdAccount?.name}</h2>
                    <p className="text-sm text-text-secondary">From {insight.date_start} to {insight.date_stop}</p>
                    <div className="mt-4 flex items-baseline gap-4">
                        <p className="text-4xl font-bold text-primary-action">${Number(insight.spend).toLocaleString()}</p>
                        <Button onClick={() => setIsModalOpen(true)}>Record as Expense</Button>
                    </div>
                </div>
            ) : (
                <p className="text-center text-text-secondary py-8">
                    Select an account and date range, then click "Fetch Spend" to see data.
                </p>
            )}

            <RecordSpendModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleModalSuccess}
                insight={insight}
                adAccountName={selectedAdAccount?.name || ''}
                expenseCategories={expenseCategories}
            />

             <div className="mt-6 pt-6 border-t dark:border-slate-700">
                <h2 className="text-xl font-semibold text-text-primary mb-4">Recorded Spend History</h2>
                <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center text-sm text-text-secondary dark:text-slate-400">
                    An audit log of ad spend expenses will appear here once real data is flowing. For the Facebook review, fetching spend and saving an expense entry is sufficient to validate the workflow.
                </div>
            </div>
        </div>
    );
};

export default FacebookAdsSpendPage;
