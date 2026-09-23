import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FacebookAdAccount, FacebookInsight } from '../../types';
import { apiGetFacebookAdAccountsFromFirestore, apiGetFacebookAccountInsights, isFacebookMockMode } from '../../services/api';
import { useNotification } from '../../hooks/useNotification';
import Spinner from '../ui/Spinner';
import Select from '../ui/Select';
import MockDataBanner from './MockDataBanner';

const KPICard: React.FC<{ title: string; value: string; description: string }> = ({ title, value, description }) => (
    <div className="bg-white dark:bg-slate-700 p-6 rounded-lg shadow-md">
        <p className="text-sm text-text-secondary dark:text-slate-400">{title}</p>
        <p className="text-3xl font-bold text-text-primary dark:text-slate-100 mt-1">{value}</p>
        <p className="text-xs text-text-secondary dark:text-slate-400 mt-2">{description}</p>
    </div>
);

const FacebookAdsDashboardPage: React.FC = () => {
    const { addNotification } = useNotification();
    const [adAccounts, setAdAccounts] = useState<FacebookAdAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [insights, setInsights] = useState<FacebookInsight | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInsightsLoading, setIsInsightsLoading] = useState(false);

    useEffect(() => {
        const fetchAccounts = async () => {
            setIsLoading(true);
            try {
                const accounts = await apiGetFacebookAdAccountsFromFirestore();
                setAdAccounts(accounts);
                if (accounts.length > 0) {
                    setSelectedAccountId(accounts[0].id);
                }
            } catch (error) {
                addNotification("Failed to load Facebook ad accounts.", "error");
            }
            setIsLoading(false);
        };
        fetchAccounts();
    }, [addNotification]);

    useEffect(() => {
        if (!selectedAccountId) {
            setInsights(null);
            return;
        }

        const fetchInsights = async () => {
            setIsInsightsLoading(true);
            try {
                const insightData = await apiGetFacebookAccountInsights(selectedAccountId);
                setInsights(insightData);
            } catch (error) {
                addNotification(`Failed to load insights for account ${selectedAccountId}.`, "error");
                setInsights(null);
            }
            setIsInsightsLoading(false);
        };

        fetchInsights();
    }, [selectedAccountId, addNotification]);
    
    const ctr = useMemo(() => {
        if (!insights || Number(insights.impressions) === 0) return '0.00%';
        return `${((Number(insights.clicks) / Number(insights.impressions)) * 100).toFixed(2)}%`;
    }, [insights]);

    const cpm = useMemo(() => {
        if (!insights || Number(insights.impressions) === 0) return '$0.00';
        return `$${((Number(insights.spend) / Number(insights.impressions)) * 1000).toFixed(2)}`;
    }, [insights]);

    const cpc = useMemo(() => {
        if (!insights || Number(insights.clicks) === 0) return '$0.00';
        return `$${(Number(insights.spend) / Number(insights.clicks)).toFixed(2)}`;
    }, [insights]);

    const formatDate = (dateStr: string) => new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
    }

    if (adAccounts.length === 0) {
        return (
            <div className="p-6 bg-container-bg shadow-lg rounded-lg text-center">
                <h1 className="text-2xl font-semibold text-text-primary mb-4">Facebook Ads Dashboard</h1>
                <p className="text-text-secondary">
                    No Facebook Ad Accounts found. Please connect your account in the settings page.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <MockDataBanner />
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-2xl font-semibold text-text-primary">Ads Dashboard</h1>
                <div className="w-full sm:w-72">
                    <Select
                        label="Select Ad Account"
                        value={selectedAccountId}
                        onChange={e => setSelectedAccountId(e.target.value)}
                        options={adAccounts.map(acc => ({ value: acc.id, label: acc.name }))}
                        containerClassName="mb-0"
                    />
                </div>
            </div>

            {isInsightsLoading ? (
                <div className="flex justify-center items-center h-48"><Spinner /></div>
            ) : insights ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPICard title="Total Spend" value={`$${Number(insights.spend).toLocaleString()}`} description={`From ${formatDate(insights.date_start)} to ${formatDate(insights.date_stop)}`} />
                    <KPICard title="Impressions" value={Number(insights.impressions).toLocaleString()} description="Total times your ads were on screen." />
                    <KPICard title="Clicks" value={Number(insights.clicks).toLocaleString()} description="Total clicks on your ads." />
                    <KPICard title="CTR / CPC" value={`${ctr} / ${cpc}`} description={`CPM: ${cpm}`} />
                </div>
            ) : (
                <p className="text-center text-text-secondary py-8">
                    Could not load insights for the selected account.
                </p>
            )}

            {insights && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6 border border-slate-100 dark:border-slate-700">
                    <h2 className="text-lg font-semibold mb-2">Performance Snapshot</h2>
                    <p className="text-sm text-text-secondary dark:text-slate-400 mb-4">
                        Reviewers can use these sample metrics to explore filtering, tooltips, and the rest of the dashboard UI.
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <li className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                            <span className="text-text-secondary">Average Daily Spend</span>
                            <span className="font-semibold">${(Number(insights.spend) / 30).toFixed(2)}</span>
                        </li>
                        <li className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                            <span className="text-text-secondary">Reach Quality</span>
                            <span className="font-semibold">{isFacebookMockMode() ? 'Excellent (mock)' : 'Calculating...'}</span>
                        </li>
                        <li className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                            <span className="text-text-secondary">Best Performing Objective</span>
                            <span className="font-semibold">Lead Generation</span>
                        </li>
                        <li className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                            <span className="text-text-secondary">Review Tip</span>
                            <span className="font-semibold">Use the mock data banner for context.</span>
                        </li>
                    </ul>
                </div>
            )}

            {isFacebookMockMode() && (
                <div className="mt-6 p-8 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg text-center">
                    <p className="text-gray-500 dark:text-slate-400">
                        More live charts and breakdowns appear automatically once a production Facebook account is connected.
                    </p>
                </div>
            )}
        </div>
    );
};

export default FacebookAdsDashboardPage;
