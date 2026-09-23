import React, { useState, useEffect } from 'react';
import { useNotification } from '../../hooks/useNotification';
import { SmsSettings } from '../../types';
import { apiGetSmsSettings, apiUpdateSmsSettings } from '../../services/api';
import Spinner from '../ui/Spinner';
import Input from '../ui/Input';
import Button from '../ui/Button';

const SmsSettingsPage: React.FC = () => {
    const { addNotification } = useNotification();
    const [settings, setSettings] = useState<Partial<SmsSettings>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            try {
                const data = await apiGetSmsSettings();
                if (data) {
                    setSettings(data);
                } else {
                    // Set default state without credentials
                    setSettings({
                        provider: 'SMSPoh',
                        apiUrl: 'https://v3.smspoh.com/api/rest/send',
                        senderId: 'Marketing Capsule',
                        apiKey: '',
                        apiSecret: ''
                    });
                }
            } catch (error) {
                addNotification("Failed to load SMS settings.", "error");
            }
            setIsLoading(false);
        };
        fetchSettings();
    }, [addNotification]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await apiUpdateSmsSettings(settings as SmsSettings);
            addNotification("SMS settings saved successfully.", "success");
        } catch (error) {
            addNotification("Failed to save settings.", "error");
        }
        setIsSaving(false);
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Spinner /></div>;
    }

    return (
        <div className="p-6 bg-container-bg dark:bg-slate-800 shadow-lg rounded-xl border border-slate-200 dark:border-slate-700">
            <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100 mb-4">SMS Provider Settings</h1>
            <p className="text-text-secondary dark:text-slate-400 mb-6">
                Configure your SMSPoh V3 provider details here. The system's backend will use these credentials to securely send messages.
            </p>
            <form onSubmit={handleSave} className="space-y-4 max-w-lg">
                <Input
                    label="Provider Name"
                    name="provider"
                    value={settings.provider || ''}
                    onChange={handleChange}
                    placeholder="e.g., SMSPoh"
                />
                <Input
                    label="API Endpoint URL (SMSPoh V3)"
                    name="apiUrl"
                    value={settings.apiUrl || ''}
                    onChange={handleChange}
                    placeholder="https://v3.smspoh.com/api/rest/send"
                />
                <Input
                    label="Sender ID / 'From' Number"
                    name="senderId"
                    value={settings.senderId || ''}
                    onChange={handleChange}
                    placeholder="e.g., Marketing Capsule"
                />
                <Input
                    label="API Key"
                    name="apiKey"
                    type="password"
                    value={settings.apiKey || ''}
                    onChange={handleChange}
                    placeholder="Enter your SMSPoh API Key"
                />
                <Input
                    label="API Secret"
                    name="apiSecret"
                    type="password"
                    value={settings.apiSecret || ''}
                    onChange={handleChange}
                    placeholder="Enter your SMSPoh API Secret"
                />
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-500/50 rounded-md text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-semibold mb-1">Note:</p>
                    <p>Your API credentials are stored securely in Firestore. The system will use these to authenticate with SMSPoh API.</p>
                </div>
                <div className="pt-4">
                    <Button type="submit" isLoading={isSaving}>Save Settings</Button>
                </div>
            </form>
        </div>
    );
};

export default SmsSettingsPage;