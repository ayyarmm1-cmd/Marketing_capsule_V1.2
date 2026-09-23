import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
    FacebookCampaign, 
    FacebookAdsSaleRecord, 
    Client, 
    Business, 
    FacebookInsight,
    FacebookCampaignStatus
} from '../../types';
import { 
    apiGetFacebookCampaignById, 
    apiGetSaleRecordByFacebookCampaignId, 
    apiGetClientById, 
    apiGetBusinessById,
    apiGetFacebookAccountInsights
} from '../../services/api';
import { useNotification } from '../../hooks/useNotification';
import Spinner from '../ui/Spinner';
import { STATUS_COLORS } from '../../constants';
import Button from '../ui/Button';
import MockDataBanner from './MockDataBanner';
import { isFacebookMockMode } from '../../services/api';

// --- Reusable Components ---
const KPICard: React.FC<{ title: string; value: string; description?: string; }> = ({ title, value, description }) => (
    <div className="bg-white dark:bg-slate-700/50 p-4 rounded-lg shadow-md border dark:border-slate-600">
        <p className="text-sm text-text-secondary dark:text-slate-400">{title}</p>
        <p className="text-3xl font-bold text-text-primary dark:text-slate-100 mt-1">{value}</p>
        {description && <p className="text-xs text-text-secondary dark:text-slate-400 mt-2">{description}</p>}
    </div>
);

const DetailItem: React.FC<{ label: string; children: React.ReactNode; }> = ({ label, children }) => (
    <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <div className="text-md text-slate-800 dark:text-slate-200 break-words">{children}</div>
    </div>
);

const mapApiStatusToDisplayStatus = (apiStatus: FacebookCampaign['status']): FacebookCampaignStatus => {
    switch (apiStatus) {
        case 'ACTIVE': return FacebookCampaignStatus.ACTIVE;
        case 'PAUSED': return FacebookCampaignStatus.OFF;
        case 'ARCHIVED': return FacebookCampaignStatus.COMPLETED;
        case 'DELETED': return FacebookCampaignStatus.DELETED;
        default: return FacebookCampaignStatus.NOT_DELIVERING;
    }
};

// --- Main Page Component ---
const FacebookAdsCampaignDetailPage: React.FC = () => {
    const { campaignId } = useParams<{ campaignId: string }>();
    const { addNotification } = useNotification();
    const [campaign, setCampaign] = useState<FacebookCampaign | null>(null);
    const [saleRecord, setSaleRecord] = useState<FacebookAdsSaleRecord | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [business, setBusiness] = useState<Business | null>(null);
    const [insight, setInsight] = useState<FacebookInsight | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!campaignId) {
            addNotification("No campaign ID provided.", "error");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const fetchedCampaign = await apiGetFacebookCampaignById(campaignId);
            setCampaign(fetchedCampaign);

            if (fetchedCampaign) {
                // Fetch insight with a mock account ID as it's not available in the campaign data
                apiGetFacebookAccountInsights('mock_account_id').then(setInsight);
                
                // Try to find a linked sale record
                const fetchedSaleRecord = await apiGetSaleRecordByFacebookCampaignId(campaignId);
                setSaleRecord(fetchedSaleRecord);

                if (fetchedSaleRecord) {
                    apiGetClientById(fetchedSaleRecord.clientId).then(setClient);
                    if (fetchedSaleRecord.businessId) {
                        apiGetBusinessById(fetchedSaleRecord.businessId).then(setBusiness);
                    }
                }
            } else {
                addNotification("Campaign not found.", "error");
            }
        } catch (error) {
            addNotification("Failed to load campaign details.", "error");
        }
        setIsLoading(false);
    }, [campaignId, addNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const ctr = useMemo(() => {
        if (!insight || !insight.clicks || !insight.impressions || Number(insight.impressions) === 0) {
            return '0.00%';
        }
        const clicks = Number(insight.clicks);
        const impressions = Number(insight.impressions);
        return `${((clicks / impressions) * 100).toFixed(2)}%`;
    }, [insight]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
    }

    if (!campaign) {
        return <div className="text-center text-text-primary p-8">Campaign not found.</div>;
    }
    
    const displayStatus = mapApiStatusToDisplayStatus(campaign.status);
    const getBudgetDisplay = (campaign: FacebookCampaign): string => {
        if (campaign.daily_budget) return `$${(Number(campaign.daily_budget) / 100).toLocaleString()} / day`;
        if (campaign.lifetime_budget) return `$${(Number(campaign.lifetime_budget) / 100).toLocaleString()} lifetime`;
        return 'N/A';
    };

    return (
        <div className="space-y-6">
            <MockDataBanner />
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">{campaign.name}</h1>
                        <div className="flex items-center gap-4 mt-2">
                             <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[displayStatus] || 'bg-gray-200'}`}>
                                {displayStatus}
                            </span>
                             <p className="text-sm text-text-secondary dark:text-slate-400 font-mono">ID: {campaign.id}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <a href={`https://www.facebook.com/adsmanager/manage/campaigns?act=${'mock_account_id'}&campaign_id=${campaign.id.replace('campaign_','')}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="secondary" size="sm">View on Facebook</Button>
                        </a>
                        {saleRecord && <Link to={`/sales/${saleRecord.id}`}><Button variant="primary" size="sm">View ERP Sale Record</Button></Link>}
                        <Link to="/facebook-ads/campaigns" className="text-sm text-primary-action hover:underline self-center">&larr; Back</Link>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard title="Spend (Last 30d)" value={insight ? `$${Number(insight.spend).toLocaleString()}` : '-'} />
                <KPICard title="Impressions" value={insight ? Number(insight.impressions).toLocaleString() : '-'} />
                <KPICard title="Clicks" value={insight ? Number(insight.clicks).toLocaleString() : '-'} />
                <KPICard title="Click-Through Rate" value={ctr} />
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                 <h2 className="text-xl font-semibold text-text-secondary dark:text-slate-300 mb-4 pb-2 border-b dark:border-slate-700">Campaign Details</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                     <DetailItem label="Objective">
                        <span className="font-medium">{campaign.objective}</span>
                     </DetailItem>
                     <DetailItem label="Budget">
                        <span className="font-medium font-mono">{getBudgetDisplay(campaign)}</span>
                     </DetailItem>
                     <DetailItem label="Linked ERP Client">
                        {client ? <Link to={`/clients/${client.id}`} className="font-medium text-primary-action hover:underline">{client.name}</Link> : <span className="italic text-slate-500">Not Linked</span>}
                     </DetailItem>
                     <DetailItem label="Linked ERP Business">
                        {business ? <Link to={`/businesses/${business.id}`} className="font-medium text-primary-action hover:underline">{business.name}</Link> : <span className="italic text-slate-500">Not Linked</span>}
                     </DetailItem>
                 </div>
                {isFacebookMockMode() && (
                    <p className="mt-4 text-sm text-text-secondary dark:text-slate-400">
                        This campaign is powered by mock data so reviewers can trace the journey from Facebook to ERP sales records without needing access to a production ad account.
                    </p>
                )}
            </div>
        </div>
    );
};

export default FacebookAdsCampaignDetailPage;