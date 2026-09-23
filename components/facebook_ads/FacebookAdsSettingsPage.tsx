import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Business, FacebookAdAccount, FacebookPage, CampaignObjectiveSetting } from '../../types';
import { 
    apiGetBusinesses, 
    apiUpdateBusiness,
    apiGetFacebookAdAccountsFromFirestore,
    apiFetchAndStoreFacebookData,
    apiDisconnectFacebookIntegration,
    apiUpdateFacebookAdAccountSyncStatus,
    isFacebookMockMode,
    apiGetCampaignObjectiveSettings,
    apiAddCampaignObjectiveSetting,
    apiUpdateCampaignObjectiveSetting,
    apiDeleteCampaignObjectiveSetting
} from '../../services/api';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import Modal from '../ui/Modal';
import SearchableSelect from '../ui/SearchableSelect';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import FacebookLoginButton from './FacebookLoginButton';
import { useAuth } from '../../hooks/useAuth';
import MockDataBanner from './MockDataBanner';
import ManageGenericList from '../ui/ManageGenericList';

// Define the structure of the Facebook login response for type safety
interface FBLoginResponse {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse?: {
    accessToken: string;
    expiresIn: number;
    signedRequest: string;
    userID: string;
  };
}

// Fix: Changed to a named export to resolve the "no default export" error.
export const FacebookAdsSettingsPage: React.FC = () => {
    const { addNotification } = useNotification();
    const { user } = useAuth();
    const { showConfirmation } = useConfirmation();
    const mockMode = isFacebookMockMode();
    const [connectedAccounts, setConnectedAccounts] = useState<FacebookAdAccount[]>([]);
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [isLinkingPage, setIsLinkingPage] = useState<FacebookPage | null>(null);
    const [selectedBusinessForLink, setSelectedBusinessForLink] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);
    const [campaignObjectives, setCampaignObjectives] = useState<CampaignObjectiveSetting[]>([]);
    const [isLoadingObjectives, setIsLoadingObjectives] = useState(false);

    const fetchData = useCallback(async (showLoading = true) => {
        if(showLoading) setIsLoading(true);
        try {
            const [fBusinesses, fAccounts] = await Promise.all([
                apiGetBusinesses(),
                apiGetFacebookAdAccountsFromFirestore()
            ]);
            setBusinesses(fBusinesses);
            setConnectedAccounts(fAccounts);
        } catch(e) {
            addNotification("Failed to load Facebook Ads settings data.", "error");
        }
        if(showLoading) setIsLoading(false);
    }, [addNotification]);

    const fetchCampaignObjectives = useCallback(async () => {
        setIsLoadingObjectives(true);
        try {
            const objectives = await apiGetCampaignObjectiveSettings();
            setCampaignObjectives(objectives);
        } catch (error) {
            addNotification("Failed to load campaign objectives.", "error");
        }
        setIsLoadingObjectives(false);
    }, [addNotification]);

    useEffect(() => {
        fetchCampaignObjectives();
    }, [fetchCampaignObjectives]);
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleLoginSuccess = useCallback(async (response: FBLoginResponse) => {
        if (!response.authResponse?.accessToken) {
            addNotification("Facebook login failed: No access token received.", "error");
            return;
        }
        setIsConnecting(true);
        try {
            await apiFetchAndStoreFacebookData();
            addNotification("Account connected and data fetched successfully.", "success", "Connection Successful");
            await fetchData(false); 
        } catch (error) {
            addNotification(`Error connecting account: ${(error as Error).message}`, "error");
        }
        setIsConnecting(false);
    }, [addNotification, fetchData]);
    
    const handleLoginFailure = useCallback(() => {
        addNotification("Facebook login was not successful. Please try again.", "warning");
    }, [addNotification]);

    const handleDisconnect = async () => {
        const confirmed = await showConfirmation({
          title: 'Disconnect Facebook',
          message: `Are you sure you want to disconnect your Facebook account? This will remove all linked accounts and pages from the ERP.`,
          confirmText: 'Disconnect',
          cancelText: 'Cancel',
          confirmVariant: 'danger',
        });
        if (confirmed) {
            setIsConnecting(true);
            try {
                await apiDisconnectFacebookIntegration();
                addNotification("Facebook account disconnected successfully.", "success");
                setConnectedAccounts([]);
            } catch(error) {
                addNotification(`Failed to disconnect account: ${(error as Error).message}`, "error");
            }
            setIsConnecting(false);
        }
    };

    const handleLinkPage = async () => {
        if (!isLinkingPage || !selectedBusinessForLink) return;
        
        setIsLoading(true); // Use main loader for this action
        try {
            await apiUpdateBusiness({ id: selectedBusinessForLink, facebookPageId: isLinkingPage.id });
            addNotification(`Page '${isLinkingPage.name}' successfully linked to business.`, "success");
            await fetchData(false);
            setIsLinkingPage(null);
            setSelectedBusinessForLink('');
        } catch (error) {
            addNotification(`Failed to link page: ${(error as Error).message}`, "error");
        }
        setIsLoading(false);
    };

    const handleUnlinkPage = async (businessId: string) => {
        if (!businessId) return;
         const confirmed = await showConfirmation({
           title: 'Unlink Page',
           message: "Are you sure you want to unlink this page from the business record?",
           confirmText: 'Unlink',
           cancelText: 'Cancel',
           confirmVariant: 'danger',
         });
         if (confirmed) {
            setIsLoading(true);
            try {
                await apiUpdateBusiness({ id: businessId, facebookPageId: '' }); 
                addNotification(`Page successfully unlinked.`, "success");
                await fetchData(false);
            } catch (error) {
                addNotification(`Failed to unlink page: ${(error as Error).message}`, "error");
            }
            setIsLoading(false);
         }
    };
    
    const handleToggleSync = async (accountId: string, isSynced: boolean) => {
        if (!user) return;
        
        // Optimistic UI update
        setConnectedAccounts(prev => prev.map(acc => 
            acc.id === accountId ? { ...acc, isSynced } : acc
        ));

        try {
            await apiUpdateFacebookAdAccountSyncStatus(user.id, accountId, isSynced);
            addNotification(`Sync status for account ${accountId} updated.`, "success");
        } catch (error) {
            addNotification(`Failed to update sync status: ${(error as Error).message}`, "error");
            // Revert UI on error
            setConnectedAccounts(prev => prev.map(acc => 
                acc.id === accountId ? { ...acc, isSynced: !isSynced } : acc
            ));
        }
    };

    const allPagesWithAccount = useMemo(() => 
        connectedAccounts.flatMap(acc => 
            acc.pages.map(page => ({
                ...page,
                adAccountName: acc.name,
                adAccountId: acc.id
            }))
        ), [connectedAccounts]);

    // Fix: Memoize the options array to improve performance and resolve a potential type inference issue.
    const unlinkedBusinessesForSelect = useMemo(() => 
        businesses
            .filter(b => !b.facebookPageId)
            .map(b => ({ value: b.id, label: `${b.name} (${b.id})` })),
        [businesses]
    );

    return (
        <div className="space-y-8 bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
            <MockDataBanner />
            <div>
                <h2 className="text-xl font-semibold text-text-primary dark:text-slate-100">Facebook Account Connection</h2>
                <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">Connect your Facebook account to allow the ERP to access your ad accounts and pages. This is required to sync campaigns and performance data.</p>
                {mockMode && (
                    <div className="mt-3 text-xs text-text-secondary dark:text-slate-400">
                        Review mode is enabled, so sample ad accounts are already connected. Use the controls below to show how syncing and linking works without a live Facebook login.
                    </div>
                )}
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border dark:border-slate-600">
                <h3 className="font-semibold text-text-primary dark:text-slate-200 mb-2">Connection Status</h3>
                {isLoading ? <Spinner/> : isConnecting ? (
                    <div className="flex items-center space-x-2">
                        <Spinner size="sm"/>
                        <span className="text-sm text-text-secondary">Connecting...</span>
                    </div>
                ) : connectedAccounts.length > 0 ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            <span className="text-sm font-semibold text-green-700 dark:text-green-300">Account Connected ({connectedAccounts.length} Ad Account(s) found)</span>
                        </div>
                        <Button variant="danger" size="sm" onClick={handleDisconnect}>Disconnect</Button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                         <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">{mockMode ? 'Demo Connection Active' : 'Not Connected'}</span>
                         {mockMode ? (
                            <Button size="sm" onClick={() => fetchData(false)}>Reload Demo Data</Button>
                         ) : (
                            <FacebookLoginButton onLoginSuccess={handleLoginSuccess} onLoginFailure={handleLoginFailure} />
                         )}
                    </div>
                )}
            </div>
            
            {connectedAccounts.length > 0 && (
                <div className="pt-8 border-t dark:border-slate-700">
                    <h2 className="text-xl font-semibold text-text-primary dark:text-slate-100">Manage Ad Accounts</h2>
                    <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">Select which Ad Accounts you want to sync with the ERP.</p>
                    <div className="space-y-2 mt-4">
                        {connectedAccounts.map(account => (
                            <div key={account.id} className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                <div>
                                    <p className="font-semibold text-text-primary dark:text-slate-200">{account.name}</p>
                                    <p className="text-xs text-text-secondary dark:text-slate-400 font-mono">{account.id}</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={account.isSynced ?? true} onChange={() => handleToggleSync(account.id, !(account.isSynced ?? true))} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="pt-8 border-t dark:border-slate-700">
                 <h2 className="text-xl font-semibold text-text-primary dark:text-slate-100">Page-to-Business Linking</h2>
                 <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">Match Facebook Pages to your client records in the ERP to enable automatic campaign assignment.</p>
            </div>

            <div className="bg-container-bg dark:bg-slate-800 shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-text-secondary dark:text-slate-400">Page Name</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-text-secondary dark:text-slate-400">Page ID</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-text-secondary dark:text-slate-400">Ad Account</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-text-secondary dark:text-slate-400">Linked Business</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-text-secondary dark:text-slate-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {allPagesWithAccount.map(page => {
                            const linkedBusiness = businesses.find(b => b.facebookPageId === page.id);
                            return (
                                <tr key={page.id}>
                                    <td className="px-4 py-3 text-sm font-medium text-text-primary dark:text-slate-200">{page.name}</td>
                                    <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400 font-mono">{page.id}</td>
                                    <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400">{page.adAccountName}</td>
                                    <td className="px-4 py-3 text-sm text-text-primary dark:text-slate-300">
                                        {linkedBusiness ? (
                                            <Link to={`/businesses/${linkedBusiness.id}`} className="text-primary-action hover:underline">{linkedBusiness.name}</Link>
                                        ) : (
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Unassigned</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center">
                                        {linkedBusiness ? (
                                            <Button variant="secondary" size="sm" onClick={() => handleUnlinkPage(linkedBusiness.id)}>Unlink</Button>
                                        ) : (
                                            <Button variant="primary" size="sm" onClick={() => { setIsLinkingPage(page); setSelectedBusinessForLink(''); }}>Link to Business</Button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

             {isLinkingPage && (
                <Modal isOpen={!!isLinkingPage} onClose={() => setIsLinkingPage(null)} title={`Link Page: ${isLinkingPage.name}`}>
                    <div className="space-y-4">
                        <p>Select the business record from your ERP that corresponds to this Facebook page.</p>
                        <SearchableSelect
                            label="Select Business"
                            options={unlinkedBusinessesForSelect}
                            value={selectedBusinessForLink}
                            onChange={(value) => setSelectedBusinessForLink(String(value))}
                            placeholder="-- Search for a business --"
                        />
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="secondary" onClick={() => setIsLinkingPage(null)}>Cancel</Button>
                            <Button onClick={handleLinkPage} disabled={!selectedBusinessForLink}>Link Page</Button>
                        </div>
                    </div>
                </Modal>
            )}

            <div className="pt-8 border-t dark:border-slate-700">
                <h2 className="text-xl font-semibold text-text-primary dark:text-slate-100 mb-4">Campaign Objectives</h2>
                <p className="text-sm text-text-secondary dark:text-slate-400 mb-4">Manage campaign objectives that will be available in the Campaign Objective dropdown when creating Facebook Ads sales, invoices, and quotations.</p>
                {isLoadingObjectives ? (
                    <div className="flex justify-center py-8">
                        <Spinner />
                    </div>
                ) : (
                    <ManageGenericList 
                        title="Campaign Objectives" 
                        items={campaignObjectives} 
                        fetchItems={fetchCampaignObjectives} 
                        addFunction={apiAddCampaignObjectiveSetting} 
                        updateFunction={apiUpdateCampaignObjectiveSetting} 
                        deleteFunction={apiDeleteCampaignObjectiveSetting} 
                        hasActiveToggle={true}
                    />
                )}
            </div>
        </div>
    );
};
