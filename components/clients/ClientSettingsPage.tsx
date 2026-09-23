import React, { useState, useEffect, useCallback } from 'react';
import { BusinessTypeSetting, Permission } from '../../types';
import { 
  apiGetBusinessTypeSettings, 
  apiAddBusinessTypeSetting, 
  apiUpdateBusinessTypeSetting, 
  apiDeleteBusinessTypeSetting 
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import ManageGenericList from '../ui/ManageGenericList';
import Spinner from '../ui/Spinner';

const ClientSettingsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { addNotification } = useNotification();
  const [businessTypes, setBusinessTypes] = useState<BusinessTypeSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPageData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedBusinessTypes = await apiGetBusinessTypeSettings();
      setBusinessTypes(fetchedBusinessTypes);
    } catch (error) {
      console.error('Failed to load business types', error);
      addNotification('Unable to load business types.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  if (!hasPermission(Permission.MANAGE_SYSTEM_LISTS)) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Permission Required</h2>
        <p className="text-text-secondary dark:text-slate-400 mt-2">
          You need the "Manage System Lists" permission to configure business types.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-text-secondary dark:text-slate-400">Configuration</p>
        <h2 className="text-2xl font-bold text-text-primary dark:text-slate-100">Client & Business Settings</h2>
        <p className="text-text-secondary dark:text-slate-400">Manage business types used for clients and businesses.</p>
      </div>

      <ManageGenericList 
        title="Business Types" 
        items={businessTypes} 
        fetchItems={fetchPageData} 
        addFunction={apiAddBusinessTypeSetting} 
        updateFunction={apiUpdateBusinessTypeSetting} 
        deleteFunction={apiDeleteBusinessTypeSetting} 
        hasActiveToggle={true}
      />
    </div>
  );
};

export default ClientSettingsPage;


