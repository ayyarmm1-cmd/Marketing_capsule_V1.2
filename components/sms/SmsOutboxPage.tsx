
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SmsMessage, SmsBatch, SmsStatus, User } from '../../types';
import { apiGetSmsMessages, apiGetSmsBatches, apiGetUsers } from '../../services/api';
import { useNotification } from '../../hooks/useNotification';
import Spinner from '../ui/Spinner';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { STATUS_COLORS } from '../../constants';

const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>;


const SmsOutboxPage: React.FC = () => {
    const { addNotification } = useNotification();
    const [messages, setMessages] = useState<SmsMessage[]>([]);
    const [batches, setBatches] = useState<SmsBatch[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<SmsStatus | ''>('');
    const [activeTab, setActiveTab] = useState<'batches' | 'messages'>('batches');
    const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [messageData, batchData, userData] = await Promise.all([
                apiGetSmsMessages(),
                apiGetSmsBatches(),
                apiGetUsers()
            ]);
            setMessages(messageData);
            setBatches(batchData);
            setUsers(userData);
        } catch (error) {
            addNotification("Failed to fetch SMS outbox data.", "error");
        }
        setIsLoading(false);
    }, [addNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleToggleExpand = (batchId: string) => {
        setExpandedBatchId(prev => (prev === batchId ? null : batchId));
    };

    const filteredMessages = useMemo(() => {
        return messages.filter(msg => {
            const statusMatch = !filterStatus || msg.status === filterStatus;
            const term = searchTerm.toLowerCase();
            const searchMatch = !term ||
                msg.phone.includes(term) ||
                msg.body.toLowerCase().includes(term) ||
                msg.batchId.toLowerCase().includes(term);
            return statusMatch && searchMatch;
        });
    }, [messages, searchTerm, filterStatus]);
    
    const filteredBatches = useMemo(() => {
        return batches.filter(batch => {
            const term = searchTerm.toLowerCase();
            return !term ||
                batch.id.toLowerCase().includes(term) ||
                batch.messageBody.toLowerCase().includes(term);
        });
    }, [batches, searchTerm]);
    
    const formatDate = (dateString?: string) => dateString ? new Date(dateString).toLocaleString('en-GB') : 'N/A';
    const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || userId;

    const renderMessagesTab = () => (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Recipient</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Message Preview</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Created/Scheduled At</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase">Batch ID</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredMessages.map(msg => (
                        <tr key={msg.id}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-text-primary dark:text-slate-200">{msg.phone}</td>
                            <td className="px-4 py-3 text-sm text-text-secondary dark:text-slate-400 max-w-sm truncate" title={msg.body}>{msg.body}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[msg.status] || ''}`}>
                                    {msg.status}
                                </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">{formatDate(msg.createdAt)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400 font-mono">{msg.batchId}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderBatchesTab = () => (
         <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                        <th className="px-2 py-3 w-12 text-left text-xs font-medium"></th>
                        <th className="px-2 py-3 text-left text-xs font-medium">Batch ID</th>
                        <th className="px-2 py-3 text-left text-xs font-medium">Created By</th>
                        <th className="px-2 py-3 text-left text-xs font-medium">Date</th>
                        <th className="px-2 py-3 text-left text-xs font-medium">Message</th>
                        <th className="px-2 py-3 text-left text-xs font-medium w-48">Progress</th>
                        <th className="px-2 py-3 text-left text-xs font-medium">Status</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredBatches.map(batch => {
                        const isExpanded = expandedBatchId === batch.id;
                        const total = batch.totalMessages;
                        const delivered = batch.deliveredCount || 0;
                        const failed = batch.failedCount || 0;
                        const pending = total - delivered - failed;

                        const deliveredPercent = total > 0 ? (delivered / total) * 100 : 0;
                        const failedPercent = total > 0 ? (failed / total) * 100 : 0;
                        
                        return (
                            <React.Fragment key={batch.id}>
                                <tr onClick={() => handleToggleExpand(batch.id)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="px-2 py-3 text-center">
                                        <button className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600">
                                            {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                                        </button>
                                    </td>
                                    <td className="px-2 py-3 text-sm font-mono">{batch.id}</td>
                                    <td className="px-2 py-3 text-sm">{getUserName(batch.createdByUserId)}</td>
                                    <td className="px-2 py-3 text-sm">{formatDate(batch.createdAt)}</td>
                                    <td className="px-2 py-3 text-sm max-w-xs truncate" title={batch.messageBody}>{batch.messageBody}</td>
                                    <td className="px-2 py-3 text-sm">
                                        <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2.5 flex overflow-hidden">
                                            <div className="bg-green-500 h-2.5" style={{ width: `${deliveredPercent}%` }}></div>
                                            <div className="bg-red-500 h-2.5" style={{ width: `${failedPercent}%` }}></div>
                                        </div>
                                        <div className="text-xs text-text-secondary dark:text-slate-400 text-center mt-1">
                                            {delivered}D / {failed}F / {pending}P of {total}
                                        </div>
                                    </td>
                                    <td className="px-2 py-3 text-sm">{batch.status}</td>
                                </tr>
                                {isExpanded && (
                                    <tr>
                                        <td colSpan={7} className="p-0 bg-slate-100 dark:bg-slate-900/50">
                                            <div className="p-4">
                                                <h4 className="font-semibold mb-2 text-sm text-text-secondary dark:text-slate-300">Messages in this Batch:</h4>
                                                <div className="max-h-64 overflow-y-auto custom-scrollbar border rounded-md dark:border-slate-700">
                                                    <table className="min-w-full bg-white dark:bg-slate-800 text-xs">
                                                        <thead className="bg-slate-200 dark:bg-slate-700">
                                                            <tr>
                                                                <th className="p-2 text-left">Recipient</th>
                                                                <th className="p-2 text-left">Status</th>
                                                                <th className="p-2 text-left">Details / Error</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                        {messages.filter(m => m.batchId === batch.id).map(msg => (
                                                            <tr key={msg.id} className="border-t dark:border-slate-700">
                                                                <td className="p-2 font-mono">{msg.phone}</td>
                                                                <td className="p-2"><span className={`px-1.5 py-0.5 text-[0.65rem] font-semibold rounded-full ${STATUS_COLORS[msg.status] || ''}`}>{msg.status}</span></td>
                                                                <td className="p-2 text-red-600 dark:text-red-400">{msg.error || '-'}</td>
                                                            </tr>
                                                        ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="p-6 bg-container-bg dark:bg-slate-800 shadow-lg rounded-xl border border-slate-200 dark:border-slate-700">
            <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100 mb-4">SMS Outbox / History</h1>
            
             <div className="mb-4 border-b border-gray-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('batches')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'batches' ? 'border-primary-action text-primary-action' : 'border-transparent text-text-secondary hover:text-gray-700'}`}>Sent Batches</button>
                    <button onClick={() => setActiveTab('messages')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'messages' ? 'border-primary-action text-primary-action' : 'border-transparent text-text-secondary hover:text-gray-700'}`}>Individual Messages</button>
                </nav>
            </div>


            <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Search..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        containerClassName="mb-0"
                    />
                    {activeTab === 'messages' && (
                        <Select
                            label="Filter by Status"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value as SmsStatus | '')}
                            options={[{ value: '', label: 'All Statuses' }, ...Object.values(SmsStatus).map(s => ({ value: s, label: s }))]}
                            containerClassName="mb-0"
                        />
                    )}
                </div>
            </div>

            {isLoading ? <div className="flex justify-center p-8"><Spinner /></div> : (
                <>
                    {activeTab === 'messages' && (filteredMessages.length > 0 ? renderMessagesTab() : <p className="text-center py-10 text-text-secondary">No messages found.</p>)}
                    {activeTab === 'batches' && (filteredBatches.length > 0 ? renderBatchesTab() : <p className="text-center py-10 text-text-secondary">No batches found.</p>)}
                </>
            )}
        </div>
    );
};

export default SmsOutboxPage;
