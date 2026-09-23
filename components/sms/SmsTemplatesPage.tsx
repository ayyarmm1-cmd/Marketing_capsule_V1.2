import React, { useState, useEffect, useCallback } from 'react';
import { SmsTemplate } from '../../types';
import { apiGetSmsTemplates, apiDeleteSmsTemplate } from '../../services/api';
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import AddEditSmsTemplateModal from './AddEditSmsTemplateModal';
import { useAuth } from '../../hooks/useAuth';
import { Permission } from '../../types';

const SmsTemplatesPage: React.FC = () => {
    const { addNotification } = useNotification();
    const { hasPermission } = useAuth();
    const { showConfirmation } = useConfirmation();
    const [templates, setTemplates] = useState<SmsTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);

    const canManage = hasPermission(Permission.MANAGE_SMS_TEMPLATES);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await apiGetSmsTemplates();
            setTemplates(data);
        } catch (error) {
            addNotification("Failed to fetch SMS templates.", "error");
        }
        setIsLoading(false);
    }, [addNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (template: SmsTemplate | null = null) => {
        if (!canManage) {
            addNotification("You do not have permission to manage templates.", "error");
            return;
        }
        setEditingTemplate(template);
        setIsModalOpen(true);
    };

    const handleModalSuccess = () => {
        fetchData();
        setIsModalOpen(false);
    };

    const handleDelete = async (template: SmsTemplate) => {
        if (!canManage) {
            addNotification("You do not have permission to manage templates.", "error");
            return;
        }
        const confirmed = await showConfirmation({
          title: 'Delete Template',
          message: `Are you sure you want to delete the template "${template.name}"?`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          confirmVariant: 'danger',
        });
        if (confirmed) {
            try {
                await apiDeleteSmsTemplate(template.id);
                addNotification("Template deleted successfully.", "success");
                fetchData();
            } catch (error) {
                addNotification("Failed to delete template.", "error");
            }
        }
    };

    return (
        <div className="p-6 bg-container-bg dark:bg-slate-800 shadow-lg rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">SMS Templates</h1>
                {canManage && (
                    <Button onClick={() => handleOpenModal()} variant="primary">
                        + New Template
                    </Button>
                )}
            </div>

            {isLoading ? <div className="flex justify-center p-8"><Spinner /></div> : (
                templates.length > 0 ? (
                    <div className="space-y-4">
                        {templates.map(template => (
                            <div key={template.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg group">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold text-text-primary dark:text-slate-200">{template.name}</h3>
                                        <p className="text-sm text-text-secondary dark:text-slate-400 mt-1 whitespace-pre-wrap">{template.body}</p>
                                    </div>
                                    <div className="flex-shrink-0 ml-4 space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {canManage && (
                                            <>
                                                <Button variant="ghost" size="sm" onClick={() => handleOpenModal(template)}>Edit</Button>
                                                <Button variant="danger" size="sm" onClick={() => handleDelete(template)}>Delete</Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-text-secondary dark:text-slate-400">No templates created yet.</p>
                        {canManage && <Button onClick={() => handleOpenModal()} className="mt-4">Create Your First Template</Button>}
                    </div>
                )
            )}

            {isModalOpen && canManage && (
                <AddEditSmsTemplateModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleModalSuccess}
                    existingTemplate={editingTemplate}
                />
            )}
        </div>
    );
};

export default SmsTemplatesPage;
