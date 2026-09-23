import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Client, Lead } from '../../types';
import { apiGetClients, apiGetLeads } from '../../services/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import Input from '../ui/Input';
import { SmsRecipient } from './SmsImportModal';
import { useNotification } from '../../hooks/useNotification';

type Entity = Client | Lead;
type EntityType = 'client' | 'lead';

interface SelectRecipientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRecipients: (recipients: SmsRecipient[]) => void;
  existingRecipientPhones: Set<string>;
}

const SelectRecipientsModal: React.FC<SelectRecipientsModalProps> = ({
  isOpen, onClose, onAddRecipients, existingRecipientPhones
}) => {
    const { addNotification } = useNotification();
    const [activeTab, setActiveTab] = useState<'clients' | 'leads'>('clients');
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [clients, setClients] = useState<Client[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                setIsLoading(true);
                try {
                    const [clientData, leadData] = await Promise.all([
                        apiGetClients(),
                        apiGetLeads()
                    ]);
                    setClients(clientData);
                    setLeads(leadData);
                } catch (error) {
                    addNotification("Failed to load CRM data.", "error");
                }
                setIsLoading(false);
            };
            fetchData();
            setSelectedIds(new Set()); // Reset selections when modal opens
        }
    }, [isOpen, addNotification]);

    const filteredData = useMemo(() => {
        const term = searchTerm.toLowerCase();
        let data: Entity[] = [];
        if (activeTab === 'clients') data = clients;
        if (activeTab === 'leads') data = leads;
        
        if (!term) return data;
        return data.filter(item => 
            item.name.toLowerCase().includes(term) ||
            item.id.toLowerCase().includes(term) ||
            item.phone?.includes(term)
        );
    }, [searchTerm, activeTab, clients, leads]);
    
    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };
    
    const toggleSelectAllVisible = () => {
        const visibleIds = new Set(filteredData.filter(item => item.phone && !existingRecipientPhones.has(item.phone)).map(item => item.id));
        const allVisibleSelected = Array.from(visibleIds).every(id => selectedIds.has(id));

        if (allVisibleSelected) {
            // Deselect all visible
            setSelectedIds(prev => {
                const newSet = new Set(prev);
                visibleIds.forEach(id => newSet.delete(id));
                return newSet;
            });
        } else {
            // Select all visible
            setSelectedIds(prev => new Set([...prev, ...visibleIds]));
        }
    };


    const handleSave = () => {
        const allData = [...clients, ...leads];
        const selectedItems = allData.filter(item => selectedIds.has(item.id));
        
        const newRecipients = selectedItems.map(item => {
            const baseRecipient: SmsRecipient = {
                phone_number: item.phone || '',
                name: item.name
            };
            if ('linkedBusinessIds' in item) { // Client
                baseRecipient.client_id = item.id;
            } else { // Lead
                baseRecipient.lead_id = item.id;
            }
            return baseRecipient;
        });
        
        onAddRecipients(newRecipients);
        onClose();
    };
    
    const renderList = (data: Entity[]) => {
        if (data.length === 0) {
            return <p className="text-center text-text-secondary dark:text-slate-400 py-8">No records found.</p>
        }

        return (
            <ul className="space-y-2">
                {data.map(item => {
                    const isExisting = existingRecipientPhones.has(item.phone || '');
                    const isDisabled = isExisting || !item.phone;
                    return (
                        <li key={item.id}>
                            <label className={`flex items-center p-2 rounded-md transition-colors ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer'}`}>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(item.id)}
                                    onChange={() => toggleSelection(item.id)}
                                    disabled={isDisabled}
                                    className="h-4 w-4 text-primary-action rounded"
                                />
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-text-primary dark:text-slate-200">{item.name} <span className="text-xs text-text-secondary dark:text-slate-500">({item.id})</span></p>
                                    <p className="text-xs text-text-secondary dark:text-slate-400">{item.phone || 'No phone number'}</p>
                                </div>
                                {isExisting && <span className="ml-auto text-xs font-semibold text-green-600 dark:text-green-400">Added</span>}
                            </label>
                        </li>
                    )
                })}
            </ul>
        )
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Select Recipients from CRM" size="lg">
            <div className="space-y-4">
                <div className="border-b dark:border-slate-700">
                    <nav className="-mb-px flex space-x-6">
                        <button onClick={() => setActiveTab('clients')} className={`tab-button ${activeTab === 'clients' ? 'tab-active' : 'tab-inactive'}`}>Clients</button>
                        <button onClick={() => setActiveTab('leads')} className={`tab-button ${activeTab === 'leads' ? 'tab-active' : 'tab-inactive'}`}>Leads</button>
                    </nav>
                </div>
                
                <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded-md">
                     <Input
                        placeholder={`Search ${activeTab}...`}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        containerClassName="mb-0"
                    />
                </div>
                
                <div className="flex justify-between items-center px-2">
                    <p className="text-sm text-text-secondary dark:text-slate-400">{selectedIds.size} selected</p>
                    <Button variant="ghost" size="sm" onClick={toggleSelectAllVisible}>Toggle Select All Visible</Button>
                </div>

                <div className="max-h-80 overflow-y-auto custom-scrollbar border dark:border-slate-700 rounded-lg p-2">
                    {isLoading ? <div className="flex justify-center p-8"><Spinner /></div> : renderList(filteredData)}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t dark:border-slate-700">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={selectedIds.size === 0}>Add {selectedIds.size} Selected</Button>
                </div>
            </div>
        </Modal>
    );
};

export default SelectRecipientsModal;
