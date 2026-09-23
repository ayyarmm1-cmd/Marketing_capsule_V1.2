import React, { useState, useEffect, useRef } from 'react';
import { SmsTemplate } from '../../types';
import { apiAddSmsTemplate, apiUpdateSmsTemplate } from '../../services/api';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useNotification } from '../../hooks/useNotification';
import PlaceholderSelector from './PlaceholderSelector';

interface AddEditSmsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingTemplate: SmsTemplate | null;
}

const AddEditSmsTemplateModal: React.FC<AddEditSmsTemplateModalProps> = ({ isOpen, onClose, onSuccess, existingTemplate }) => {
    const { addNotification } = useNotification();
    const [name, setName] = useState('');
    const [body, setBody] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        if (existingTemplate) {
            setName(existingTemplate.name);
            setBody(existingTemplate.body);
        } else {
            setName('');
            setBody('');
        }
    }, [existingTemplate]);

    const handleInsertPlaceholder = (placeholder: string) => {
        if (!textareaRef.current) return;
        
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = body;
        
        const newText = text.substring(0, start) + placeholder + text.substring(end);
        setBody(newText);
        
        // Set cursor position after inserted placeholder
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + placeholder.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !body.trim()) {
            addNotification("Template Name and Message Body are required.", "error");
            return;
        }
        setIsLoading(true);
        try {
            const payload = { name, body };
            if (existingTemplate) {
                await apiUpdateSmsTemplate({ ...payload, id: existingTemplate.id });
                addNotification("Template updated successfully.", "success");
            } else {
                await apiAddSmsTemplate(payload);
                addNotification("Template created successfully.", "success");
            }
            onSuccess();
        } catch (error) {
            addNotification("Failed to save template.", "error");
        }
        setIsLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={existingTemplate ? "Edit SMS Template" : "Create New SMS Template"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Template Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g., Invoice Reminder, Birthday Wish"
                    required
                />
                <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-2">
                        Message Body*
                    </label>
                    <textarea
                        ref={textareaRef}
                        rows={5}
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        placeholder="Write your message here. Click on placeholders below to insert them."
                        required
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-text-primary dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-action resize-y"
                    />
                    <p className="text-xs text-text-secondary dark:text-slate-400 mt-1">
                        Use placeholders like {'{{name}}'} or {'{{invoice_no}}'}. These can be replaced with data from an Excel import.
                    </p>
                </div>
                <PlaceholderSelector onInsert={handleInsertPlaceholder} />
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button type="submit" isLoading={isLoading}>{existingTemplate ? 'Save Changes' : 'Create Template'}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default AddEditSmsTemplateModal;