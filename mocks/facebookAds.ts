import { FacebookAdAccount, FacebookCampaign, FacebookInsight } from '../types';

export const MOCK_FACEBOOK_ACCOUNTS: FacebookAdAccount[] = [
  {
    id: 'act_241105051',
    account_id: '241105051',
    name: 'Marketing Capsule',
    isSynced: true,
    pages: [
      { id: 'page_102', name: 'Marketing Capsule' },
      { id: 'page_103', name: 'Marketing Capsule Academy' },
    ],
  },
  {
    id: 'act_532884221',
    account_id: '532884221',
    name: 'Sample Digital',
    isSynced: true,
    pages: [{ id: 'page_208', name: 'Sample Page' }],
  },
];

const campaignsForAccountA: FacebookCampaign[] = [
  { id: 'campaign_brand_awareness', name: 'Brand Awareness - Yangon', status: 'ACTIVE', objective: 'REACH', daily_budget: '1500' },
  { id: 'campaign_lead_gen', name: 'Lead Gen - Training Center', status: 'ACTIVE', objective: 'LEAD_GENERATION', lifetime_budget: '85000' },
  { id: 'campaign_engagement', name: 'Engagement Boost - Social', status: 'PAUSED', objective: 'POST_ENGAGEMENT', daily_budget: '800' },
];

const campaignsForAccountB: FacebookCampaign[] = [
  { id: 'campaign_billboard', name: 'Digital Billboard Sync', status: 'ACTIVE', objective: 'CONVERSIONS', lifetime_budget: '120000' },
  { id: 'campaign_remarketing', name: 'Remarketing - Alumni', status: 'ARCHIVED', objective: 'REACH', daily_budget: '500' },
];

export const MOCK_FACEBOOK_CAMPAIGNS: Record<string, FacebookCampaign[]> = {
  [MOCK_FACEBOOK_ACCOUNTS[0].id]: campaignsForAccountA,
  [MOCK_FACEBOOK_ACCOUNTS[1].id]: campaignsForAccountB,
};

const generateInsight = (spend: number, impressions: number, clicks: number): FacebookInsight => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 30);
  return {
    date_start: start.toISOString().split('T')[0],
    date_stop: now.toISOString().split('T')[0],
    spend: spend.toFixed(2),
    impressions: impressions.toFixed(0),
    clicks: clicks.toFixed(0),
  };
};

export const MOCK_FACEBOOK_INSIGHTS: Record<string, FacebookInsight> = {
  [MOCK_FACEBOOK_ACCOUNTS[0].id]: generateInsight(4275.32, 186234, 4288),
  [MOCK_FACEBOOK_ACCOUNTS[1].id]: generateInsight(2890.11, 94210, 1822),
};

export const getMockCampaignsForAccount = (accountId: string): FacebookCampaign[] => {
  if (accountId === 'all') {
    return Object.values(MOCK_FACEBOOK_CAMPAIGNS).flat();
  }
  return MOCK_FACEBOOK_CAMPAIGNS[accountId] ?? [];
};

export const getMockCampaignById = (campaignId: string): FacebookCampaign | null => {
  return Object.values(MOCK_FACEBOOK_CAMPAIGNS)
    .flat()
    .find(campaign => campaign.id === campaignId) ?? null;
};

export const getMockInsightForAccount = (accountId: string): FacebookInsight => {
  return (
    MOCK_FACEBOOK_INSIGHTS[accountId] ??
    generateInsight(1500 + Math.random() * 2000, 50000 + Math.random() * 50000, 800 + Math.random() * 500)
  );
};


