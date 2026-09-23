import React, { useState, useEffect, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority, User, Client, Business, Project, TaskList, Quiz, Attachment } from '../../types';
import { apiAddTask, apiUpdateTask, apiGetClients, apiGetBusinesses, apiGetProjects, apiGetQuizzes } from '../../services/api';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import SearchableSelect from '../ui/SearchableSelect';
import MultiSelect from '../ui/MultiSelect';

interface CreateEditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskSaved: () => void;
  editingTask?: Task | null;
  users: User[];
  loggedInUserId: string;
  taskLists: TaskList[];
  parentId?: string; // For creating sub-tasks
  defaultProjectId?: string; // For creating tasks from a project page
  defaultListId?: string;
  defaultClientId?: string;
  defaultBusinessId?: string;
  defaultTaskType?: 'General';
}

type TaskFormData = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdByUserId'>;


const CreateEditTaskModal: React.FC<CreateEditTaskModalProps> = ({ 
    isOpen, onClose, onTaskSaved, editingTask, users, loggedInUserId, taskLists, parentId, defaultProjectId, defaultListId, defaultClientId, defaultBusinessId, defaultTaskType
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [surveys, setSurveys] = useState<Quiz[]>([]);
  // Removed filteredBusinesses - always show all businesses to allow free re-selection


  const getInitialFormData = (): TaskFormData => ({
    title: editingTask?.title || '',
    description: editingTask?.description || '',
    status: editingTask?.status || TaskStatus.TO_DO,
    priority: editingTask?.priority || TaskPriority.MEDIUM,
    dueDate: editingTask?.dueDate ? editingTask.dueDate.split('T')[0] : '',
    assigneeIds: editingTask?.assigneeIds || [],
    relatedSaleId: editingTask?.relatedSaleId || '',
    googleDriveLink: editingTask?.googleDriveLink || '',
    attachments: editingTask?.attachments || [],
    clientId: editingTask?.clientId || defaultClientId || '',
    businessId: editingTask?.businessId || defaultBusinessId || '',
    projectId: editingTask?.projectId || defaultProjectId || '',
    parentId: editingTask?.parentId || parentId || '',
    listId: editingTask?.listId || defaultListId || '',
    surveyId: editingTask?.surveyId || '',
    taskType: editingTask?.taskType || defaultTaskType || 'General',
    contentPosts: editingTask?.contentPosts || [],
  });

  const [formData, setFormData] = useState<TaskFormData>(getInitialFormData());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New states for file management
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [attachmentsToRemove, setAttachmentsToRemove] = useState<Attachment[]>([]);

  useEffect(() => {
    if (isOpen) {
        const fetchDropdownData = async () => {
            try {
                const [fetchedClients, fetchedBusinesses, fetchedProjects, allQuizzes] = await Promise.all([
                    apiGetClients(),
                    apiGetBusinesses(),
                    apiGetProjects(),
                    apiGetQuizzes()
                ]);
                setClients(fetchedClients);
                setBusinesses(fetchedBusinesses);
                setProjects(fetchedProjects);
                setSurveys(allQuizzes.filter(q => q.quizType === 'Survey'));
            } catch (err) {
                console.error("Failed to fetch data for task modal", err);
                setError("Could not load dropdown options.");
            }
        };
        fetchDropdownData();
        setFormData(getInitialFormData());
        setError(null);
        // Reset file states
        setNewFiles([]);
        setAttachmentsToRemove([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingTask, parentId, defaultProjectId, defaultListId, defaultTaskType]);

  // Business options - same as Sales/Project: prioritize linked ones if client is selected
  const businessOptions = useMemo(() => {
    const allBusinessOptions = businesses.map(b => ({ value: b.id, label: `${b.name} (${b.id})` }));
    if (formData.clientId) {
      const client = clients.find(c => c.id === formData.clientId);
      if (client?.linkedBusinessIds?.length) {
        const linked = allBusinessOptions.filter(opt => client!.linkedBusinessIds!.includes(opt.value));
        const other = allBusinessOptions.filter(opt => !client!.linkedBusinessIds!.includes(opt.value));
        return [{ value: '', label: '-- Select Business --' }, ...linked, ...other];
      }
    }
    return [{ value: '', label: '-- Select Business --' }, ...allBusinessOptions];
  }, [businesses, formData.clientId, clients]);

  // Client options - same as Sales/Project: prioritize linked ones if business is selected
  const clientOptions = useMemo(() => {
    const allClientOptions = clients.map(c => ({ value: c.id, label: `${c.name} (${c.id})` }));
    if (formData.businessId) {
      const business = businesses.find(b => b.id === formData.businessId);
      if (business?.linkedClientIds?.length) {
        const linked = allClientOptions.filter(opt => business!.linkedClientIds!.includes(opt.value));
        const other = allClientOptions.filter(opt => !business!.linkedClientIds!.includes(opt.value));
        return [{ value: '', label: '-- Select Client --' }, ...linked, ...other];
      }
    }
    return [{ value: '', label: '-- Select Client --' }, ...allClientOptions];
  }, [clients, formData.businessId, businesses]);

  // Auto-update business when client changes (same as Sales/Project) - only when no project selected
  useEffect(() => {
    if (!formData.projectId && formData.clientId && businesses.length > 0 && clients.length > 0 && !editingTask) {
      const client = clients.find(c => c.id === formData.clientId);
      if (client?.linkedBusinessIds?.length) {
        const firstId = client.linkedBusinessIds[0];
        if (businesses.some(b => b.id === firstId) && formData.businessId !== firstId) {
          setFormData(prev => ({ ...prev, businessId: firstId }));
        }
      } else if (client && !client.linkedBusinessIds?.length && formData.businessId) {
        setFormData(prev => ({ ...prev, businessId: '' }));
      }
    }
  }, [formData.clientId, formData.projectId, clients, businesses, editingTask]);

  // Auto-update client when business changes (same as Sales/Project) - only when no project selected
  useEffect(() => {
    if (!formData.projectId && formData.businessId && businesses.length > 0 && clients.length > 0 && !editingTask) {
      const business = businesses.find(b => b.id === formData.businessId);
      if (business?.linkedClientIds?.length) {
        const firstId = business.linkedClientIds[0];
        if (clients.some(c => c.id === firstId) && formData.clientId !== firstId) {
          setFormData(prev => ({ ...prev, clientId: firstId }));
        }
      } else if (business && !business.linkedClientIds?.length && formData.clientId) {
        setFormData(prev => ({ ...prev, clientId: '' }));
      }
    }
  }, [formData.businessId, formData.projectId, businesses, clients, editingTask]);

  // Auto-fill client/business when project changes
  useEffect(() => {
    if (formData.projectId) {
      const selectedProject = projects.find(p => p.id === formData.projectId);
      if (selectedProject) {
        setFormData(prev => ({
          ...prev,
          clientId: selectedProject.clientId,
          businessId: selectedProject.businessId || '',
        }));
      }
    }
  }, [formData.projectId, projects]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | { target: { name: string, value: string | number | string[] }}) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value as string }));

    if (name === 'clientId') {
        const clientDetails = clients.find(c => c.id === value);
        const currentBusinessStillValid = clientDetails?.linkedBusinessIds?.includes(formData.businessId || '');
        if (!currentBusinessStillValid) {
            setFormData(prev => ({ ...prev, businessId: '' }));
        }
    }
  };
  
  const projectSpecificTaskLists = useMemo(() => {
    if (!formData.projectId) {
        // Show only global lists if no project is selected
        return taskLists.filter(list => !list.projectId && !list.isLocked);
    }
    // Show global lists AND lists for the selected project
    return taskLists.filter(list => (!list.projectId || list.projectId === formData.projectId) && !list.isLocked);
  }, [taskLists, formData.projectId]);


  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
        setError("Title is required.");
        return false;
    }
    if (formData.googleDriveLink && !formData.googleDriveLink.startsWith('https://')) {
        setError("Google Drive link must be a valid URL (e.g., start with https://).");
        return false;
    }
    setError(null);
    return true;
  };
  
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setNewFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const handleRemoveNewFile = (fileToRemove: File) => {
        setNewFiles(prev => prev.filter(file => file !== fileToRemove));
    };

    const handleRemoveExistingAttachment = (attachment: Attachment) => {
        setAttachmentsToRemove(prev => [...prev, attachment]);
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { attachments, ...taskPayload } = formData;

      const finalPayload = Object.fromEntries(
        Object.entries(taskPayload).filter(([_, v]) => v !== undefined && v !== null && v !== '')
      );
      
      if (!finalPayload.assigneeIds) {
          finalPayload.assigneeIds = [];
      }
      if (!finalPayload.hasOwnProperty('description')) {
          finalPayload.description = '';
      }


      if (editingTask && editingTask.id) {
        await apiUpdateTask({ ...finalPayload, id: editingTask.id } as Partial<Task> & {id: string}, loggedInUserId, newFiles, attachmentsToRemove);
      } else {
        const payloadForAdd = {
            ...finalPayload,
            createdByUserId: loggedInUserId
        } as Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;
        await apiAddTask(payloadForAdd, loggedInUserId, newFiles);
      }
      onTaskSaved();
      onClose();
    } catch (apiError) {
      console.error("Failed to save task:", apiError);
      setError((apiError as Error).message || "Failed to save task. Please try again.");
    }
    setIsLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingTask ? "Edit Task" : (parentId ? "Create New Sub-task" : "Create New Task")} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        {parentId && <p className="text-sm text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-900/50 p-2 rounded-md">Creating a sub-task for task: {parentId}</p>}
        
        
        <Input label="Title*" name="title" value={formData.title} onChange={handleChange} required />
        <Input
          as="textarea"
          label="Description"
          name="description"
          id="description"
          value={formData.description || ''}
          onChange={handleChange}
          rows={3}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label="Status" name="status" value={formData.status} onChange={handleChange}
            options={Object.values(TaskStatus).map(s => ({ value: s, label: s }))} />
          <Select label="Priority" name="priority" value={formData.priority} onChange={handleChange}
            options={Object.values(TaskPriority).map(p => ({ value: p, label: p }))} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Due Date" type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} />
            <MultiSelect
                label="Assignees"
                options={users.map(user => ({ value: user.id, label: user.name }))}
                selectedValues={formData.assigneeIds || []}
                onChange={(selectedIds) => handleChange({ target: { name: 'assigneeIds', value: selectedIds }})}
                placeholder="Select assignees..."
                containerClassName="mb-0"
            />
        </div>
        <SearchableSelect 
            label="Task List / Group" 
            value={formData.listId || ''} 
            onChange={value => handleChange({ target: { name: 'listId', value: String(value) }})}
            options={[{value: '', label: 'Uncategorized'}, ...projectSpecificTaskLists.map(l => ({ value: l.id, label: l.title }))]}
            placeholder="-- Select a List --"
        />
        <SearchableSelect 
            label="Related Project (Optional)" 
            value={formData.projectId || ''} 
            onChange={value => handleChange({ target: { name: 'projectId', value: String(value) }})}
            options={[{value: '', label: '-- Select Project --'}, ...projects.map(p => ({ value: p.id, label: `${p.name} (${p.id})` }))]}
            placeholder={projects.length === 0 ? "No projects available" : "-- Search Project --"}
            disabled={!!defaultProjectId}
        />
         <SearchableSelect 
            label="Related Survey (Optional)" 
            value={formData.surveyId || ''} 
            onChange={value => handleChange({ target: { name: 'surveyId', value: String(value) }})}
            options={[{value: '', label: '-- No Survey --'}, ...surveys.map(s => ({ value: s.id, label: `${s.title} (${s.id})` }))]}
            placeholder={surveys.length === 0 ? "No surveys available" : "-- Search Survey --"}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableSelect label="Related Client (Optional)" value={formData.clientId || ''} 
              onChange={value => handleChange({ target: { name: 'clientId', value: String(value) }})}
              options={clientOptions}
              placeholder="-- Search & Select Client --"
              disabled={!!formData.projectId}
            />
            <SearchableSelect label="Related Business (Optional)" value={formData.businessId || ''}
               onChange={value => handleChange({ target: { name: 'businessId', value: String(value) }})}
               options={businessOptions} 
               placeholder="-- Search & Select Business --"
               disabled={!!formData.projectId}
            />
        </div>
        <Input label="Related Sale ID (Optional)" name="relatedSaleId" value={formData.relatedSaleId} onChange={handleChange} placeholder="e.g., SA010724"/>
        <Input label="Google Drive Link (Optional)" name="googleDriveLink" value={formData.googleDriveLink} onChange={handleChange} placeholder="https://docs.google.com/..."/>
        
        <div className="pt-2 border-t dark:border-slate-700">
            <label className="block text-sm font-medium text-text-secondary dark:text-slate-400 mb-1">Attachments</label>
            {/* Existing Attachments */}
            {editingTask?.attachments && editingTask.attachments.length > 0 && (
                <div className="space-y-2 mb-2">
                {editingTask.attachments.filter(att => !attachmentsToRemove.some(rem => rem.url === att.url)).map(att => (
                    <div key={att.url} className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-2 rounded">
                    <span className="text-sm text-text-primary dark:text-slate-200 truncate">{att.name}</span>
                    <Button type="button" variant="danger" size="sm" onClick={() => handleRemoveExistingAttachment(att)}>Remove</Button>
                    </div>
                ))}
                </div>
            )}
            {/* New Files for Upload */}
            {newFiles.length > 0 && (
                <div className="space-y-2 mb-2">
                    {newFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/50 p-2 rounded">
                            <span className="text-sm text-blue-800 dark:text-blue-200 truncate">{file.name}</span>
                            <Button type="button" variant="danger" size="sm" onClick={() => handleRemoveNewFile(file)}>Remove</Button>
                        </div>
                    ))}
                </div>
            )}
            <Input type="file" multiple onChange={handleFileChange} />
        </div>
        
        {error && <p className="text-sm text-status-danger text-center">{error}</p>}

        <div className="pt-2 flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>{editingTask ? "Save Changes" : "Create Task"}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateEditTaskModal;