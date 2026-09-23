import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SmsComposePage from './SmsComposePage';
import SmsOutboxPage from './SmsOutboxPage';
import SmsTemplatesPage from './SmsTemplatesPage';
import SmsSettingsPage from './SmsSettingsPage';

const SmsPage: React.FC = () => {
    return (
        <Routes>
            <Route index element={<Navigate to="compose" replace />} />
            <Route path="compose" element={<SmsComposePage />} />
            <Route path="outbox" element={<SmsOutboxPage />} />
            <Route path="templates" element={<SmsTemplatesPage />} />
            <Route path="settings" element={<SmsSettingsPage />} />
        </Routes>
    );
};

export default SmsPage;
