import React from 'react';
import { Routes, Route } from 'react-router-dom';
// Fix: The linter reports no default export for this module, so changing to a named import.
import { FacebookAdsSettingsPage } from './FacebookAdsSettingsPage';
import FacebookAdsDashboardPage from './FacebookAdsDashboardPage';
import FacebookAdsCampaignsPage from './FacebookAdsCampaignsPage';
import FacebookAdsSpendPage from './FacebookAdsSpendPage';
import FacebookAdsCampaignDetailPage from './FacebookAdsCampaignDetailPage';

const FacebookAdsPage: React.FC = () => {
    return (
        // The sidebar now controls which component is rendered here via the router.
        <Routes>
            <Route path="dashboard" element={<FacebookAdsDashboardPage />} />
            <Route path="campaigns" element={<FacebookAdsCampaignsPage />} />
            <Route path="campaigns/:campaignId" element={<FacebookAdsCampaignDetailPage />} />
            <Route path="spend" element={<FacebookAdsSpendPage />} />
            <Route path="settings" element={<FacebookAdsSettingsPage />} />
        </Routes>
    );
};

export default FacebookAdsPage;