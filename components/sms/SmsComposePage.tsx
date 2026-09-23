import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { SmsTemplate } from '../../types';
import { apiGetSmsTemplates, apiSendSmsBatch } from '../../services/api';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Input from '../ui/Input';
import SmsImportModal from './SmsImportModal';
import SelectRecipientsModal from './SelectRecipientsModal';
import PlaceholderSelector from './PlaceholderSelector';
import { SmsRecipient } from '../../types';
import Spinner from '../ui/Spinner';
import { useConfirmation } from '../../hooks/useConfirmation'; // New import

const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

const SmsComposePage: React.FC = () => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const { showConfirmation } = useConfirmation(); // New hook
    const [templates, setTemplates] = useState<SmsTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [messageBody, setMessageBody] = useState('');
    const [recipients, setRecipients] = useState<SmsRecipient[]>([]);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
    const [scheduledFor, setScheduledFor] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [customNumbers, setCustomNumbers] = useState('');
    const [messageTextareaRef, setMessageTextareaRef] = useState<HTMLTextAreaElement | null>(null);

    const [sendOption, setSendOption] = useState<'now' | 'later'>('now');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const fetchedTemplates = await apiGetSmsTemplates();
                setTemplates(fetchedTemplates);
            } catch (error) {
                addNotification("Failed to load SMS templates.", "error");
            }
            setIsLoading(false);
        };
        fetchData();
    }, [addNotification]);

    useEffect(() => {
        const template = templates.find(t => t.id === selectedTemplateId);
        if (template) {
            setMessageBody(template.body);
        } else if (!selectedTemplateId) {
            setMessageBody('');
        }
    }, [selectedTemplateId, templates]);

    const handleImport = (importedRecipients: SmsRecipient[]) => {
        setRecipients(prev => {
            const existingPhones = new Set(prev.map(r => r.phone_number));
            const uniqueNewRecipients = importedRecipients.filter(r => !existingPhones.has(r.phone_number));
            return [...prev, ...uniqueNewRecipients];
        });
    };
    
    const handleAddRecipients = (newRecipients: SmsRecipient[]) => {
        setRecipients(prev => {
            const existingPhones = new Set(prev.map(r => r.phone_number));
            const uniqueNewRecipients = newRecipients.filter(
                r => r.phone_number && !existingPhones.has(r.phone_number)
            );
            
            if (uniqueNewRecipients.length > 0) {
                addNotification(`${uniqueNewRecipients.length} new recipient(s) added.`, 'success');
            } else {
                addNotification('No new recipients were added (they might already be in the list or have no phone number).', 'info');
            }
            
            return [...prev, ...uniqueNewRecipients];
        });
        setIsSelectModalOpen(false);
    };

    const handleAddCustomNumbers = () => {
        if (!customNumbers.trim()) return;

        const numbers = customNumbers.split(/[\s,;\n]+/)
            .map(num => num.trim().replace(/[^0-9+]/g, ''))
            .filter(num => num.length > 5);

        if (numbers.length === 0) {
            addNotification("No valid phone numbers found in the text.", "warning");
            return;
        }

        const existingPhones = new Set(recipients.map(r => r.phone_number));
        const uniqueNewNumbers = numbers.filter(num => !existingPhones.has(num));

        const newSmsRecipients: SmsRecipient[] = uniqueNewNumbers.map(num => ({
            phone_number: num,
            name: 'Custom Entry'
        }));

        setRecipients(prev => [...prev, ...newSmsRecipients]);
        addNotification(`${uniqueNewNumbers.length} new custom number(s) added.`, 'success');
        setCustomNumbers('');
    };

    const handleRemoveRecipient = (phoneNumberToRemove: string) => {
        setRecipients(prev => prev.filter(r => r.phone_number !== phoneNumberToRemove));
    };

    const handleInsertPlaceholder = (placeholder: string) => {
        if (!messageTextareaRef) return;
        
        const textarea = messageTextareaRef;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = messageBody;
        
        const newText = text.substring(0, start) + placeholder + text.substring(end);
        setMessageBody(newText);
        
        // Set cursor position after inserted placeholder
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + placeholder.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const handleSend = async () => {
        if (!user) {
            addNotification("You must be logged in to send messages.", "error");
            return;
        }
        if (recipients.length === 0) {
            addNotification("Please add at least one recipient.", "error");
            return;
        }
        if (!messageBody.trim()) {
            addNotification("Message body cannot be empty.", "error");
            return;
        }
        if (sendOption === 'later' && !scheduledFor) {
            addNotification("Please select a date and time to schedule the message.", "error");
            return;
        }
    
        const confirmationMessage = sendOption === 'later' && scheduledFor
            ? `You are about to schedule an SMS to ${recipients.length} recipient(s) for ${new Date(scheduledFor).toLocaleString()}.\n\nAre you sure you want to proceed?`
            : `You are about to send an SMS to ${recipients.length} recipient(s) immediately.\n\nAre you sure you want to proceed?`;
        
        const isConfirmed = await showConfirmation({
            title: "Confirm SMS Batch",
            message: confirmationMessage,
            confirmText: sendOption === 'later' ? "Schedule" : "Send Now",
            confirmVariant: "primary"
        });

        if (isConfirmed) {
            setIsSending(true);
            try {
                const batch = await apiSendSmsBatch(recipients, messageBody, selectedTemplateId || null, sendOption === 'later' ? scheduledFor : null, user.id);
                
                // Check if messages were queued due to Cloud Function unavailability
                if (batch.status === 'Pending' && batch.error?.includes('Cloud Function')) {
                    addNotification(
                        "SMS batch created and queued. Note: Cloud Function is not available. Messages will be processed when the function is deployed. Check SMS Settings for configuration.", 
                        "warning"
                    );
                } else {
                    addNotification("SMS batch created successfully! Messages are being processed.", "success");
                }
                
                setRecipients([]);
                setMessageBody('');
                setSelectedTemplateId('');
                setScheduledFor('');
                setSendOption('now');
            } catch (error: any) {
                const errorMessage = error?.message || 'Unknown error occurred';
                if (errorMessage.includes('SMS Sender ID')) {
                    addNotification(`Configuration Error: ${errorMessage}. Please configure SMS settings first.`, "error");
                } else {
                    addNotification(`Failed to send SMS batch: ${errorMessage}`, "error");
                }
            }
            setIsSending(false);
        }
    };

    const previewMessage = useMemo(() => {
        if (!messageBody) {
            return 'Your message will appear here.';
        }
        if (recipients.length === 0) {
            return messageBody;
        }
        let preview = messageBody;
        const firstRecipient = recipients[0];
        for (const key in firstRecipient) {
            preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), firstRecipient[key]);
        }
        return preview;
    }, [messageBody, recipients]);

    const charCount = messageBody.length;
    const smsParts = Math.ceil(charCount / 160);

    const buttonText = (sendOption === 'later' && scheduledFor)
        ? `Schedule for ${recipients.length} Recipient(s)`
        : `Send to ${recipients.length} Recipient(s)`;

    const isSendDisabled = isSending || 
                           recipients.length === 0 || 
                           !messageBody.trim() || 
                           (sendOption === 'later' && !scheduledFor);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100 mb-6">Compose & Send SMS</h1>
            {isLoading ? <Spinner /> : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 space-y-4">
                    <Select
                        label="Load from Template (Optional)"
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        options={[{ value: '', label: '-- Write a custom message --' }, ...templates.map(t => ({ value: t.id, label: t.name }))]}
                    />
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-text-secondary dark:text-slate-400">
                                Message Body*
                            </label>
                            <span className="text-sm text-text-secondary dark:text-slate-400">
                                {charCount} characters / {smsParts} SMS part(s)
                            </span>
                        </div>
                        <textarea
                            ref={(el) => setMessageTextareaRef(el)}
                            rows={10}
                            value={messageBody}
                            onChange={(e) => setMessageBody(e.target.value)}
                            placeholder="Type your message here. Click on placeholders below to insert them."
                            required
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-text-primary dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-action resize-y"
                        />
                    </div>
                    <PlaceholderSelector onInsert={handleInsertPlaceholder} />
                     <div className="space-y-2">
                        <label className="block text-sm font-medium text-text-secondary dark:text-slate-400">Sending Time</label>
                        <div className="flex items-center space-x-6 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    name="sendOption"
                                    value="now"
                                    checked={sendOption === 'now'}
                                    onChange={() => {
                                        setSendOption('now');
                                        setScheduledFor('');
                                    }}
                                    className="h-4 w-4 text-primary-action focus:ring-primary-action border-gray-300 dark:border-slate-500"
                                />
                                <span className="ml-2 text-sm text-text-primary dark:text-slate-200">Send Now</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    name="sendOption"
                                    value="later"
                                    checked={sendOption === 'later'}
                                    onChange={() => setSendOption('later')}
                                    className="h-4 w-4 text-primary-action focus:ring-primary-action border-gray-300 dark:border-slate-500"
                                />
                                <span className="ml-2 text-sm text-text-primary dark:text-slate-200">Schedule for Later</span>
                            </label>
                        </div>
                        {sendOption === 'later' && (
                            <Input
                                type="datetime-local"
                                value={scheduledFor}
                                onChange={(e) => setScheduledFor(e.target.value)}
                                min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                containerClassName="mt-2"
                            />
                        )}
                    </div>

                    <div className="pt-4 border-t dark:border-slate-700">
                        <Button onClick={handleSend} isLoading={isSending} disabled={isSendDisabled} size="lg">
                            {buttonText}
                        </Button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                        <h3 className="font-semibold text-lg mb-3">Recipients</h3>
                        <div className="space-y-2">
                            <Button onClick={() => setIsSelectModalOpen(true)} variant="secondary" className="w-full">Select from CRM</Button>
                            <Button onClick={() => setIsImportModalOpen(true)} variant="secondary" className="w-full">Import from Excel</Button>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t dark:border-slate-700">
                            <Input
                                as="textarea"
                                label="Add Custom Numbers"
                                rows={3}
                                value={customNumbers}
                                onChange={e => setCustomNumbers(e.target.value)}
                                placeholder="Enter or paste numbers separated by commas, spaces, or new lines."
                            />
                            <Button onClick={handleAddCustomNumbers} variant="secondary" className="w-full mt-2">Add Numbers</Button>
                        </div>
                        
                        <div className="mt-4">
                            <div className="flex justify-between items-baseline">
                                <h4 className="font-semibold text-md text-text-secondary dark:text-slate-300">Recipient List</h4>
                                <span className="text-sm font-bold text-primary-action">{recipients.length} Total</span>
                            </div>
                            <div className="mt-2 p-2 border dark:border-slate-600 rounded-md max-h-48 overflow-y-auto custom-scrollbar">
                                {recipients.length > 0 ? (
                                    <ul className="divide-y dark:divide-slate-600">
                                        {recipients.map(r => (
                                            <li key={r.phone_number} className="flex justify-between items-center py-1.5">
                                                <div className="text-sm">
                                                    <p className="font-medium text-text-primary dark:text-slate-200">{r.name && r.name !== 'Custom Entry' ? r.name : r.phone_number}</p>
                                                    {r.name && r.name !== 'Custom Entry' && <p className="text-xs text-text-secondary dark:text-slate-400">{r.phone_number}</p>}
                                                </div>
                                                <Button variant="danger" size="sm" className="!p-1.5" onClick={() => handleRemoveRecipient(r.phone_number)} aria-label={`Remove ${r.phone_number}`}>
                                                    <TrashIcon />
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-center text-xs text-text-secondary dark:text-slate-400 py-4">No recipients added yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                        <h3 className="font-semibold text-lg mb-3">Preview</h3>
                        <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-md min-h-[150px] text-sm text-text-primary dark:text-slate-200 whitespace-pre-wrap">
                            {previewMessage}
                        </div>
                        <p className="text-xs text-text-secondary dark:text-slate-500 mt-2">Preview is based on the first recipient in your list.</p>
                    </div>
                </div>
            </div>
            )}
             <SmsImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImport}
            />
            <SelectRecipientsModal
                isOpen={isSelectModalOpen}
                onClose={() => setIsSelectModalOpen(false)}
                onAddRecipients={handleAddRecipients}
                existingRecipientPhones={new Set(recipients.map(r => r.phone_number))}
            />
        </div>
    );
};

export default SmsComposePage;