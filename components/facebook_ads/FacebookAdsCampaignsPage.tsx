import React, { useState, useEffect, useMemo } from 'react';
import { FacebookAdAccount, FacebookCampaign, FacebookCampaignStatus, FacebookInsight } from '../../types';
import { apiGetFacebookAdAccountsFromFirestore, apiGetFacebookCampaigns, apiGetFacebookAccountInsights, isFacebookMockMode } from '../../services/api';
import { useNotification } from '../../hooks/useNotification';
import Spinner from '../ui/Spinner';
import Select from '../ui/Select';
import { STATUS_COLORS } from '../../constants';
import Button from '../ui/Button';
import { Link } from 'react-router-dom';
import MockDataBanner from './MockDataBanner';

// --- Reusable KPICard Component ---
const KPICard: React.FC<{ title: string; value: string | number; description?: string; icon: React.ReactNode; }> = ({ title, value, description, icon }) => (
    <div className="bg-white dark:bg-slate-700 p-4 rounded-lg shadow-md">
        <div className="flex items-center">
            <div className="p-3 rounded-full bg-primary-action text-white mr-4">
                {icon}
            </div>
            <div>
                <p className="text-sm text-text-secondary dark:text-slate-400">{title}</p>
                <p className="text-2xl font-bold text-text-primary dark:text-slate-100">{value}</p>
            </div>
        </div>
        {description && <p className="text-xs text-text-secondary dark:text-slate-400 mt-2">{description}</p>}
    </div>
);

// Icons for KPI Cards
const CampaignIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const SpendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>;


const mapApiStatusToDisplayStatus = (apiStatus: FacebookCampaign['status']): FacebookCampaignStatus => {
    switch (apiStatus) {
        case 'ACTIVE': return FacebookCampaignStatus.ACTIVE;
        case 'PAUSED': return FacebookCampaignStatus.OFF;
        case 'ARCHIVED': return FacebookCampaignStatus.COMPLETED;
        case 'DELETED': return FacebookCampaignStatus.DELETED;
        default: return FacebookCampaignStatus.NOT_DELIVERING;
    }
}

const FacebookAdsCampaignsPage: React.FC = () => {
    const { addNotification } = useNotification();
    const [adAccounts, setAdAccounts] = useState<FacebookAdAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [campaigns, setCampaigns] = useState<FacebookCampaign[]>([]);
    const [insights, setInsights] = useState<FacebookInsight | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDataLoading, setIsDataLoading] = useState(false);
    
    const [statusFilter, setStatusFilter] = useState<FacebookCampaignStatus | 'All'>('All');

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
            setCampaigns([]);
            setInsights(null);
            return;
        }

        const fetchDataForAccount = async () => {
            setIsDataLoading(true);
            try {
                const [campaignData, insightData] = await Promise.all([
                    apiGetFacebookCampaigns(selectedAccountId),
                    apiGetFacebookAccountInsights(selectedAccountId)
                ]);
                setCampaigns(campaignData);
                setInsights(insightData);
            } catch (error) {
                addNotification(`Failed to load data for account ${selectedAccountId}.`, "error");
                setCampaigns([]);
                setInsights(null);
            }
            setIsDataLoading(false);
        };

        fetchDataForAccount();
    }, [selectedAccountId, addNotification]);

    const filteredCampaigns = useMemo(() => {
        if (statusFilter === 'All') {
            return campaigns;
        }
        return campaigns.filter(c => mapApiStatusToDisplayStatus(c.status) === statusFilter);
    }, [campaigns, statusFilter]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
    }

    if (adAccounts.length === 0) {
        return (
            <div className="p-6 bg-container-bg shadow-lg rounded-lg text-center">
                <h1 className="text-2xl font-semibold text-text-primary mb-4">View Campaigns</h1>
                <p className="text-text-secondary">
                    No Facebook Ad Accounts found. Please connect your account in the settings page.
                </p>
            </div>
        );
    }
    
    const getBudgetDisplay = (campaign: FacebookCampaign): string => {
        if (campaign.daily_budget) {
            return `$${(Number(campaign.daily_budget) / 100).toLocaleString()} / day`;
        }
        if (campaign.lifetime_budget) {
            return `$${(Number(campaign.lifetime_budget) / 100).toLocaleString()} lifetime`;
        }
        return 'N/A';
    };

    const filterOptions: (FacebookCampaignStatus | 'All')[] = [
        'All',
        FacebookCampaignStatus.ACTIVE,
        FacebookCampaignStatus.OFF,
        FacebookCampaignStatus.COMPLETED,
        FacebookCampaignStatus.DELETED
    ];

    const mockMode = isFacebookMockMode();

    return (
        <div className="space-y-6">
            <MockDataBanner />
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-2xl font-semibold text-text-primary">View Campaigns</h1>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard title="Total Campaigns" value={isDataLoading ? '-' : campaigns.length} icon={<CampaignIcon />} />
                <KPICard title="Active Campaigns" value={isDataLoading ? '-' : campaigns.filter(c => c.status === 'ACTIVE').length} icon={<CampaignIcon />} />
                <KPICard title="Paused/Archived" value={isDataLoading ? '-' : campaigns.filter(c => c.status !== 'ACTIVE').length} icon={<CampaignIcon />} />
                <KPICard title="Spend (30d)" value={isDataLoading ? '-' : insights ? `$${Number(insights.spend).toLocaleString()}` : 'N/A'} icon={<SpendIcon />} />
            </div>

            {/* Filter Buttons */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-text-secondary dark:text-slate-300 mr-2">Filter by Status:</span>
                    {filterOptions.map(status => (
                        <Button 
                            key={status}
                            variant={statusFilter === status ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setStatusFilter(status)}
                        >
                            {status}
                        </Button>
                    ))}
                </div>
            </div>


            {mockMode && (
                <div className="rounded-lg border border-blue-100 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-900/20 p-4 text-sm text-blue-900 dark:text-blue-100">
                    Use the status filter below to simulate segmenting campaigns during review. You can open any campaign to see a detailed mock record.
                </div>
            )}

            {isDataLoading ? (
                 <div className="flex justify-center items-center h-48"><Spinner /></div>
            ) : (
                <div className="bg-container-bg shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Campaign Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Objective</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Budget</th>
                            </tr>
                        </thead>
                        <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredCampaigns.map(campaign => {
                                const displayStatus = mapApiStatusToDisplayStatus(campaign.status);
                                return (
                                <tr key={campaign.id}>
                                    <td className="px-4 py-3 text-sm font-medium text-primary-action dark:text-blue-400 hover:underline">
                                        <Link to={`/facebook-ads/campaigns/${campaign.id}`}>{campaign.name}</Link>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className={`px-2 py-0.5 text-[0.7rem] font-semibold rounded-full ${STATUS_COLORS[displayStatus] || 'bg-gray-200 text-gray-700'}`}>
                                            {displayStatus}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400">{campaign.objective}</td>
                                    <td className="px-4 py-3 text-sm text-text-primary dark:text-slate-300 text-right font-mono">{getBudgetDisplay(campaign)}</td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredCampaigns.length === 0 && (
                        <p className="text-center text-text-secondary dark:text-slate-400 py-8">
                            No campaigns found for the selected filter. {mockMode && 'Try switching to "All" to continue testing.'}
                        </p>
                    )}
                </div>
            )}

            {mockMode && (
                <div className="text-sm text-text-secondary dark:text-slate-400">
                    Need to demonstrate additional scenarios? Duplicate this page and adjust the mock fixtures in <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">/mocks/facebookAds.ts</code>.
                </div>
            )}
        </div>
    );
};

export default FacebookAdsCampaignsPage;