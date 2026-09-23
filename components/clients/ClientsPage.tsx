

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Client, Business, UserRole, ClientOrBusiness, Permission } from '../../types';
import { apiGetClients, apiGetBusinesses, apiDeleteClient, apiDeleteBusiness, apiRepairAllClientBusinessLinks } from '../../services/api';
import Button from '../ui/Button';
import RefreshButton from '../ui/RefreshButton';
import Input from '../ui/Input';
import AddClientModal from './AddClientModal';
import AddBusinessModal from './AddBusinessModal';
import ExcelImportModal from './ExcelImportModal';
import OpeningBalanceImportModal from './OpeningBalanceImportModal';
import Spinner from '../ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import { CLIENT_ID_INTERNAL, BUSINESS_ID_INTERNAL } from '../../constants';

type ViewMode = 'table' | 'grid';
type ActiveTab = 'clients' | 'businesses';

// Add a _type property for unified search results
type SearchResultItem = (Client & { _type: 'client' }) | (Business & { _type: 'business' });

interface ClientsPageProps {
  defaultTab?: ActiveTab;
}

const ClientsPage: React.FC<ClientsPageProps> = ({ defaultTab = 'clients' }) => {
  const { user, hasPermission } = useAuth();
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const location = useLocation();
  
  // Use defaultTab prop as the source of truth for active tab
  const [activeTab, setActiveTab] = useState<ActiveTab>(defaultTab);
  
  // Update active tab when defaultTab prop changes
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);
  
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isAddBusinessModalOpen, setIsAddBusinessModalOpen] = useState(false);

  // Pagination state
  const ITEMS_PER_PAGE = 50;
  const [currentPage, setCurrentPage] = useState(1);
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [isOpeningBalanceImportModalOpen, setIsOpeningBalanceImportModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClientOrBusiness | null>(null);
  const [isRepairingLinks, setIsRepairingLinks] = useState(false);
  const autoRepairRanRef = React.useRef(false);
  const isRepairingLinksRef = React.useRef(false);

  // Permissions
  const canViewFullList = hasPermission(Permission.VIEW_ALL_CLIENTS_BUSINESSES);
  const canAddClient = hasPermission(Permission.CREATE_CLIENT);
  const canAddBusiness = hasPermission(Permission.CREATE_BUSINESS);
  const canEditClient = hasPermission(Permission.EDIT_CLIENT);
  const canDeleteClient = hasPermission(Permission.DELETE_CLIENT);
  const canEditBusiness = hasPermission(Permission.EDIT_BUSINESS);
  const canDeleteBusiness = hasPermission(Permission.DELETE_BUSINESS);

  const runLinkRepair = useCallback(async (source: 'auto' | 'manual') => {
    if (isRepairingLinksRef.current) return;
    isRepairingLinksRef.current = true;
    setIsRepairingLinks(true);
    try {
      const result = await apiRepairAllClientBusinessLinks();
      if (result.linksCreated > 0) {
        addNotification(
          `Restored ${result.linksCreated} missing client–business link(s) (sales: ${result.pairsFromSales}, balances: ${result.pairsFromBalances}, one-sided: ${result.pairsFromOneSided}).`,
          'success'
        );
        const [fetchedClients, fetchedBusinesses] = await Promise.all([apiGetClients(), apiGetBusinesses()]);
        const sortByIdDesc = (a: { id: string }, b: { id: string }) => {
          const numA = parseInt(a.id.slice(1), 10);
          const numB = parseInt(b.id.slice(1), 10);
          return numB - numA;
        };
        setClients(fetchedClients.sort(sortByIdDesc));
        setBusinesses(fetchedBusinesses.sort(sortByIdDesc));
      } else if (source === 'manual') {
        addNotification('All client–business links look consistent. No repairs needed.', 'info');
      }
    } catch (error) {
      addNotification(`Failed to repair links: ${(error as Error).message}`, 'error');
    } finally {
      isRepairingLinksRef.current = false;
      setIsRepairingLinks(false);
    }
  }, [addNotification]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedClients, fetchedBusinesses] = await Promise.all([
        apiGetClients(),
        apiGetBusinesses(),
      ]);

      // Custom sort function to handle alphanumeric IDs like 'CL-0001', 'CL-0010'
      const sortByIdDesc = (a: { id: string }, b: { id: string }) => {
        const numA = parseInt(a.id.slice(1), 10);
        const numB = parseInt(b.id.slice(1), 10);
        return numB - numA;
      };

      setClients(fetchedClients.sort(sortByIdDesc));
      setBusinesses(fetchedBusinesses.sort(sortByIdDesc));

      // Auto full repair once per session (sales + balances + one-sided arrays)
      if (!autoRepairRanRef.current && canEditBusiness) {
        autoRepairRanRef.current = true;
        void runLinkRepair('auto');
      }
      
    } catch (error) {
      console.error("Failed to fetch data:", error);
      addNotification("Failed to load client and business data.", "error");
    }
    setIsLoading(false);
  }, [addNotification, canEditBusiness, runLinkRepair]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleModalSuccess = () => {
    fetchData();
    setIsAddClientModalOpen(false);
    setIsAddBusinessModalOpen(false);
    setEditingItem(null);
  };

  const handleImportComplete = () => {
    fetchData();
    setIsExcelImportModalOpen(false);
  };

  const handleOpeningBalanceImportComplete = () => {
    fetchData();
    setIsOpeningBalanceImportModalOpen(false);
  };
  
  const handleRowClick = (itemId: string, itemType?: 'client' | 'business') => {
    // Determine the path prefix directly for clarity and robustness
    let pathPrefix = 'businesses'; // Default to businesses

    // If an explicit itemType is provided, use it
    if (itemType === 'client') {
      pathPrefix = 'clients';
    } else if (itemType === 'business') {
      pathPrefix = 'businesses';
    } 
    // Otherwise, fallback to the active tab
    else if (activeTab === 'clients') {
      pathPrefix = 'clients';
    }

    navigate(`/${pathPrefix}/${itemId}`);
  };

  const handleEdit = (item: ClientOrBusiness) => {
    setEditingItem(item);
    if (activeTab === 'clients') {
        setIsAddClientModalOpen(true);
    } else {
        setIsAddBusinessModalOpen(true);
    }
  };

  const handleDelete = async (item: ClientOrBusiness) => {
    const type = activeTab === 'clients' ? 'client' : 'business';
    const businessMessage = type === 'business'
      ? `Are you sure you want to delete this business: "${item.name}"? This will permanently delete all sales, invoices, payments, credit notes, refunds, and other transactions for this business, remove pair balances, unlink from clients, and sync client balances. This cannot be undone.`
      : `Are you sure you want to delete this client: "${item.name}"? This will also unlink it from associated records and cannot be undone.`;
    const confirmed = await showConfirmation({
      title: `Delete ${type === 'client' ? 'Client' : 'Business'}`,
      message: businessMessage,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });
    if (confirmed) {
        try {
            if (type === 'client') {
                if (!canDeleteClient) { addNotification("Permission denied.", "error"); return; }
                await apiDeleteClient(item.id);
            } else {
                if (!canDeleteBusiness) { addNotification("Permission denied.", "error"); return; }
                await apiDeleteBusiness(item.id);
            }
            addNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully.`, 'success');
            fetchData();
        } catch (error) {
            addNotification(`Failed to delete ${type}: ${(error as Error).message}`, 'error');
        }
    }
  };


  const filteredData: ClientOrBusiness[] | SearchResultItem[] = React.useMemo(() => {
    if (canViewFullList) {
      const data = activeTab === 'clients' ? clients : businesses;
      if (!searchTerm) return data;
      return data.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.phone && item.phone.includes(searchTerm))
      );
    } else {
      if (!searchTerm.trim()) return [];
      
      const allItems: SearchResultItem[] = [
        ...clients.map(c => ({ ...c, _type: 'client' as const })),
        ...businesses.map(b => ({ ...b, _type: 'business' as const }))
      ];
      
      return allItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.phone && item.phone.includes(searchTerm.toLowerCase()))
      );
    }
  }, [activeTab, clients, businesses, searchTerm, canViewFullList]);

  // Reset page when filters or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const totalCount = activeTab === 'clients' 
    ? clients.length 
    : businesses.length;

  // Maps for resolving linked ID -> name for display
  const businessIdToName = useMemo(() => new Map(businesses.map(b => [b.id, b.name])), [businesses]);
  const clientIdToName = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

  const getLinkedBusinessNames = (linkedIds: string[] | undefined): string => {
    if (!linkedIds?.length) return '—';
    const names = linkedIds.map(id => businessIdToName.get(id) || id).filter(Boolean);
    return names.length ? names.join(', ') : '—';
  };
  const getLinkedClientNames = (linkedIds: string[] | undefined): string => {
    if (!linkedIds?.length) return '—';
    const names = linkedIds.map(id => clientIdToName.get(id) || id).filter(Boolean);
    return names.length ? names.join(', ') : '—';
  };

  const handleExport = useCallback(() => {
    const data = filteredData as ClientOrBusiness[];
    if (data.length === 0) {
      addNotification(`No ${activeTab} to export.`, 'info');
      return;
    }
    if (activeTab === 'clients') {
      const rows = (data as Client[]).map(c => ({
        'Client ID': c.id,
        Name: c.name ?? '',
        Type: 'Client',
        Phone: c.phone ?? '',
        Email: c.email ?? '',
        'Linked Business IDs': (c.linkedBusinessIds ?? []).join(', '),
        'Linked Businesses': getLinkedBusinessNames(c.linkedBusinessIds),
        'Balance (MMK)': (c.balance ?? 0).toLocaleString(),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Clients');
      XLSX.writeFile(wb, `clients_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else {
      const rows = (data as Business[]).map(b => ({
        'Business ID': b.id,
        Name: b.name ?? '',
        Phone: b.phone ?? '',
        Email: b.email ?? '',
        'Linked Client IDs': (b.linkedClientIds ?? []).join(', '),
        'Linked Clients': getLinkedClientNames(b.linkedClientIds),
        'Balance (MMK)': (b.balance ?? 0).toLocaleString(),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Businesses');
      XLSX.writeFile(wb, `businesses_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
    addNotification(`Exported ${data.length} ${activeTab} to .xlsx.`, 'success');
  }, [activeTab, filteredData, getLinkedBusinessNames, getLinkedClientNames, addNotification]);

  const renderTable = (data: ClientOrBusiness[] | SearchResultItem[]) => {
    // Calculate min width based on active tab
    const minTableWidth = activeTab === 'clients' ? '1470px' : '1670px';
    return (
    <div className="overflow-x-auto bg-container-bg dark:bg-slate-800 shadow-md rounded-lg border border-slate-200 dark:border-slate-700" style={{ overflowX: 'auto', overflowY: 'visible' }}>
      <table className="divide-y divide-gray-200 dark:divide-slate-700" style={{ width: '100%', minWidth: minTableWidth, tableLayout: 'fixed' }}>
        <thead className="bg-slate-50 dark:bg-slate-700/50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider" style={{ width: '100px', minWidth: '100px' }}>ID</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider" style={{ width: '200px', minWidth: '200px' }}>Name</th>
            {activeTab === 'clients' && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider" style={{ width: '100px', minWidth: '100px' }}>Type</th>}
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider" style={{ width: '150px', minWidth: '150px' }}>Phone</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider" style={{ width: '200px', minWidth: '200px' }}>Email</th>
            {activeTab === 'businesses' && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider" style={{ width: '150px', minWidth: '150px' }}>Balance (MMK)</th>}
            {activeTab === 'clients' && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider" style={{ width: '220px', minWidth: '220px' }}>Linked Businesses</th>}
            {activeTab === 'businesses' && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider" style={{ width: '220px', minWidth: '220px' }}>Linked Clients</th>}
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider" style={{ width: '150px', minWidth: '150px' }}>Actions</th>
          </tr>
        </thead>
        <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
          {data.map(item => {
            const isInternal = item.id === CLIENT_ID_INTERNAL || item.id === BUSINESS_ID_INTERNAL || item.customerCode === 'INTERNAL';
            return (
            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer" onClick={() => handleRowClick(item.id, (item as SearchResultItem)._type)}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-slate-200">{item.id}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary dark:text-slate-200">
                <div className="flex items-center gap-2">
                  <span>{item.name}</span>
                  {isInternal && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                      INTERNAL
                    </span>
                  )}
                </div>
              </td>
              {activeTab === 'clients' && (
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400" style={{ width: '100px', minWidth: '100px' }}>
                  <span className="capitalize">Client</span>
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400" style={{ width: '150px', minWidth: '150px' }}>{item.phone || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400" style={{ width: '200px', minWidth: '200px' }}>{item.email || '-'}</td>
              {activeTab === 'businesses' && (
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400 text-right" style={{ width: '150px', minWidth: '150px' }}>
                  {((item as Business).balance ?? 0).toLocaleString()}
                </td>
              )}
              {activeTab === 'clients' && (
                <td className="px-6 py-4 text-sm text-text-secondary dark:text-slate-400" style={{ width: '220px', minWidth: '220px', maxWidth: '220px' }} title={getLinkedBusinessNames((item as Client).linkedBusinessIds)}>
                  <span className="line-clamp-2">{getLinkedBusinessNames((item as Client).linkedBusinessIds)}</span>
                </td>
              )}
              {activeTab === 'businesses' && (
                <td className="px-6 py-4 text-sm text-text-secondary dark:text-slate-400" style={{ width: '220px', minWidth: '220px', maxWidth: '220px' }} title={getLinkedClientNames((item as Business).linkedClientIds)}>
                  <span className="line-clamp-2">{getLinkedClientNames((item as Business).linkedClientIds)}</span>
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-1" style={{ width: '150px', minWidth: '150px' }}>
                 { ((activeTab === 'clients' && canEditClient) || (activeTab === 'businesses' && canEditBusiness)) &&
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(item as ClientOrBusiness); }}>Edit</Button>
                 }
                 { ((activeTab === 'clients' && canDeleteClient) || (activeTab === 'businesses' && canDeleteBusiness)) &&
                    <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(item as ClientOrBusiness); }}>Delete</Button>
                 }
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      {data.length === 0 && searchTerm && <p className="text-center py-8 text-text-secondary dark:text-slate-400">No results found for "{searchTerm}".</p>}
      {data.length === 0 && !searchTerm && canViewFullList && <p className="text-center py-8 text-text-secondary dark:text-slate-400">No {activeTab} found.</p>}
    </div>
  );
  };

  const renderGrid = (data: ClientOrBusiness[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {data.map(item => {
        const isInternal = item.id === CLIENT_ID_INTERNAL || item.id === BUSINESS_ID_INTERNAL || item.customerCode === 'INTERNAL';
        return (
        <div key={item.id} className="bg-container-bg dark:bg-slate-800 shadow-md rounded-xl p-5 hover:shadow-lg transition-shadow cursor-pointer relative group border border-slate-200 dark:border-slate-700" onClick={() => handleRowClick(item.id)}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-semibold text-text-primary dark:text-slate-100 truncate flex-1">{item.name}</h3>
            {isInternal && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 ml-2 flex-shrink-0">
                INTERNAL
              </span>
            )}
          </div>
          <p className="text-sm text-primary-action font-medium mb-2">{item.id}</p>
          <p className="text-sm text-text-secondary dark:text-slate-400 mb-1 truncate"><PhoneIcon /> {item.phone || 'N/A'}</p>
          <p className="text-sm text-text-secondary dark:text-slate-400 mb-3 truncate"><EmailIcon /> {item.email || 'N/A'}</p>
          {activeTab === 'clients' && (
            <p className="text-xs text-text-secondary dark:text-slate-400" title={getLinkedBusinessNames((item as Client).linkedBusinessIds)}>
              Businesses: {getLinkedBusinessNames((item as Client).linkedBusinessIds)}
            </p>
          )}
          {activeTab === 'businesses' && (
            <p className="text-xs text-text-secondary dark:text-slate-400" title={getLinkedClientNames((item as Business).linkedClientIds)}>
              Clients: {getLinkedClientNames((item as Business).linkedClientIds)}
            </p>
          )}
          <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            { ((activeTab === 'clients' && canEditClient) || (activeTab === 'businesses' && canEditBusiness)) &&
                <Button variant="secondary" size="sm" className="!p-2" onClick={(e) => { e.stopPropagation(); handleEdit(item as ClientOrBusiness); }}><EditIcon/></Button>
            }
            { ((activeTab === 'clients' && canDeleteClient) || (activeTab === 'businesses' && canDeleteBusiness)) &&
                <Button variant="danger" size="sm" className="!p-2" onClick={(e) => { e.stopPropagation(); handleDelete(item as ClientOrBusiness); }}><DeleteIcon/></Button>
            }
          </div>
        </div>
        );
      })}
      {data.length === 0 && <p className="col-span-full text-center py-8 text-text-secondary dark:text-slate-400">No {activeTab} found.</p>}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 p-4 bg-container-bg dark:bg-slate-800 shadow-md rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">{activeTab === 'clients' ? 'Clients' : 'Businesses'}</h1>
          {canViewFullList && (
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-text-secondary dark:text-slate-400">Total {activeTab === 'clients' ? 'Clients' : 'Businesses'}</p>
                <p className="text-2xl font-bold text-primary-action">{totalCount}</p>
              </div>
              {activeTab === 'clients' && canAddClient && (
                <Button onClick={() => { setEditingItem(null); setIsAddClientModalOpen(true); }} variant="primary">+ Add Client</Button>
              )}
              {activeTab === 'businesses' && canAddBusiness && (
                <Button onClick={() => { setEditingItem(null); setIsAddBusinessModalOpen(true); }} variant="primary">+ Add Business</Button>
              )}
              {(canEditBusiness || canEditClient) && (
                <Button
                  onClick={() => void runLinkRepair('manual')}
                  variant="secondary"
                  isLoading={isRepairingLinks}
                  title="Scan sales & balances and restore missing client–business links"
                >
                  Repair Links
                </Button>
              )}
              <Button 
                  onClick={() => setIsExcelImportModalOpen(true)} 
                  variant="secondary"
                  leftIcon={<UploadIcon />}
              >
                  Import Excel
              </Button>
              <Button 
                  onClick={() => setIsOpeningBalanceImportModalOpen(true)} 
                  variant="secondary"
                  leftIcon={<UploadIcon />}
              >
                  Import Opening Balance
              </Button>
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex-grow max-w-lg">
                <Input
                    placeholder={`Search ${activeTab === 'clients' ? 'Clients' : 'Businesses'} by ID, Name, Phone...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    containerClassName="mb-0"
                />
            </div>
            {canViewFullList && (
              <div className="flex items-center space-x-2">
                  <button onClick={() => setViewMode('table')} className={`p-2 rounded ${viewMode === 'table' ? 'bg-primary-action text-white' : 'bg-gray-200 dark:bg-slate-600 text-text-secondary dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-500'}`} title="Table View">
                      <TableIcon />
                  </button>
                  <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary-action text-white' : 'bg-gray-200 dark:bg-slate-600 text-text-secondary dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-500'}`} title="Grid View">
                      <GridIcon />
                  </button>
                  <Button variant="ghost" size="sm" leftIcon={<DownloadIcon />} onClick={handleExport}>Export .xlsx</Button>
              </div>
            )}
        </div>
      </div>


      {isLoading ? (
        <div className="flex-1 flex justify-center items-center"><Spinner size="lg" /></div>
      ) : (
        <>
          {filteredData.length > 0 && (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              <div className="text-sm text-text-secondary dark:text-slate-400">
                {filteredData.length > 0
                  ? `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} of ${filteredData.length} entries`
                  : 'No entries'}
              </div>
              {filteredData.length > ITEMS_PER_PAGE && (
                <nav className="flex items-center gap-1" aria-label="Pagination">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1 mx-2">
                    {(() => {
                      const pages: (number | 'ellipsis')[] = [];
                      const showPages = 5;
                      let start = Math.max(1, currentPage - Math.floor(showPages / 2));
                      const end = Math.min(totalPages, start + showPages - 1);
                      if (end - start + 1 < showPages) start = Math.max(1, end - showPages + 1);
                      if (start > 1) pages.push(1, 'ellipsis');
                      for (let i = start; i <= end; i++) pages.push(i);
                      if (end < totalPages) pages.push('ellipsis', totalPages);
                      return pages.map((p, idx) =>
                        p === 'ellipsis' ? (
                          <span key={`e-${idx}`} className="px-2 text-text-secondary">...</span>
                        ) : (
                          <Button
                            key={p}
                            variant={currentPage === p ? 'primary' : 'secondary'}
                            size="sm"
                            className="min-w-[2rem]"
                            onClick={() => setCurrentPage(p)}
                          >
                            {p}
                          </Button>
                        )
                      );
                    })()}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </nav>
              )}
            </div>
          )}
          {canViewFullList ? (
            viewMode === 'table' ? renderTable(paginatedData as ClientOrBusiness[]) : renderGrid(paginatedData as ClientOrBusiness[])
          ) : (
            searchTerm.trim() ? renderTable(paginatedData as SearchResultItem[]) : <p className="text-center text-text-secondary dark:text-slate-400 py-8">Please use the search bar to find specific clients or businesses.</p>
          )}
        </>
      )}

      {isAddClientModalOpen && (
        <AddClientModal
          isOpen={isAddClientModalOpen}
          onClose={() => { setIsAddClientModalOpen(false); setEditingItem(null); }}
          onSuccess={handleModalSuccess}
          existingBusinesses={businesses}
          existingClient={activeTab === 'clients' ? editingItem as Client : null}
        />
      )}
      {isAddBusinessModalOpen && (
        <AddBusinessModal
            isOpen={isAddBusinessModalOpen}
            onClose={() => { setIsAddBusinessModalOpen(false); setEditingItem(null); }}
            onSuccess={handleModalSuccess}
            existingClients={clients}
            existingBusiness={activeTab === 'businesses' ? editingItem as Business : null}
        />
      )}
      {isExcelImportModalOpen && (
        <ExcelImportModal
            isOpen={isExcelImportModalOpen}
            onClose={() => setIsExcelImportModalOpen(false)}
            onImportComplete={handleImportComplete}
        />
      )}
      {isOpeningBalanceImportModalOpen && (
        <OpeningBalanceImportModal
            isOpen={isOpeningBalanceImportModalOpen}
            onClose={() => setIsOpeningBalanceImportModalOpen(false)}
            onImportComplete={handleOpeningBalanceImportComplete}
        />
      )}
    </div>
  );
};

const PhoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 inline-block mr-1 align-text-bottom"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102A1.125 1.125 0 0 0 5.89 2.25H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>;
const EmailIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 inline-block mr-1 align-text-bottom"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>;
const TableIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const GridIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25A2.25 2.25 0 0 1 13.5 8.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>;

export default ClientsPage;