import React, { useEffect, useState } from 'react';
import { LeadSettings, Permission, User } from '../../types';
import { apiGetLeadSettings, apiGetUsers, apiUpdateLeadSettings } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

const LeadSettingsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { addNotification } = useNotification();
  const [settings, setSettings] = useState<LeadSettings | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [newSource, setNewSource] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [fetchedSettings, fetchedUsers] = await Promise.all([
          apiGetLeadSettings(),
          apiGetUsers(),
        ]);
        setSettings(fetchedSettings);
        setUsers(fetchedUsers);
      } catch (error) {
        console.error('Failed to load lead settings', error);
        addNotification('Unable to load lead settings.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [addNotification]);

  const handleAddSource = () => {
    if (!settings || !newSource.trim()) return;
    if (settings.leadSources.includes(newSource.trim())) {
      addNotification('Source already exists.', 'warning');
      return;
    }
    setSettings({ ...settings, leadSources: [...settings.leadSources, newSource.trim()] });
    setNewSource('');
  };

  const handleRemoveSource = (source: string) => {
    if (!settings) return;
    setSettings({ ...settings, leadSources: settings.leadSources.filter((item) => item !== source) });
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const updated = await apiUpdateLeadSettings(settings);
      setSettings(updated);
      addNotification('Lead settings updated.', 'success');
    } catch (error) {
      console.error('Failed to save lead settings', error);
      addNotification('Unable to save lead settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!hasPermission(Permission.MANAGE_LEAD_SETTINGS)) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Permission Required</h2>
        <p className="text-text-secondary dark:text-slate-400 mt-2">
          You need the "Manage Lead Settings" permission to configure automation.
        </p>
      </div>
    );
  }

  if (isLoading || !settings) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-text-secondary dark:text-slate-400">Automation & Defaults</p>
        <h2 className="text-2xl font-bold text-text-primary dark:text-slate-100">Lead Settings</h2>
        <p className="text-text-secondary dark:text-slate-400">Control assignment rules, reminders, and source catalogs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
          <h3 className="text-lg font-semibold text-text-primary dark:text-slate-100">Assignment Rules</h3>
          <Select
            label="Auto Assignment Mode"
            value={settings.autoAssignMode}
            onChange={(e) => setSettings({ ...settings, autoAssignMode: e.target.value as LeadSettings['autoAssignMode'] })}
            options={[
              { value: 'manual', label: 'Manual (owners pick leads)' },
              { value: 'round_robin', label: 'Round Robin (balanced)' },
            ]}
          />
          <Select
            label="Fallback Owner"
            value={settings.defaultOwnerId || ''}
            onChange={(e) => setSettings({ ...settings, defaultOwnerId: e.target.value || undefined })}
            options={[{ value: '', label: 'Unassigned' }, ...users.map((user) => ({ value: user.id, label: user.name }))]}
          />
          <label className="flex items-center gap-3 text-sm text-text-primary dark:text-slate-200">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-primary-action focus:ring-primary-action"
              checked={settings.enableActivityReminders}
              onChange={(e) => setSettings({ ...settings, enableActivityReminders: e.target.checked })}
            />
            Enable no-touch reminders after 5 days of inactivity
          </label>
        </div>

        <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
          <h3 className="text-lg font-semibold text-text-primary dark:text-slate-100">Lead Sources</h3>
          <div className="flex gap-3">
            <Input
              label="New Source"
              placeholder="e.g. Webinar, Referral, Walk-in"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
            />
            <Button variant="primary" className="self-end" onClick={handleAddSource}>
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {settings.leadSources.map((source) => (
              <span
                key={source}
                className="inline-flex items-center gap-2 bg-blue-50 dark:bg-slate-800 text-primary-action px-3 py-1 rounded-full text-sm border border-primary-action/30"
              >
                {source}
                <button
                  type="button"
                  className="text-xs text-primary-action hover:text-red-500"
                  onClick={() => handleRemoveSource(source)}
                  aria-label={`Remove ${source}`}
                >
                  ×
                </button>
              </span>
            ))}
            {settings.leadSources.length === 0 && (
              <p className="text-sm text-text-secondary dark:text-slate-500">No sources defined yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" size="lg" onClick={handleSave} isLoading={isSaving}>
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default LeadSettingsPage;
