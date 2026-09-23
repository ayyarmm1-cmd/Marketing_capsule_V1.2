import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Project, ProjectStatus, Client, Business, User, UserRole, Quiz } from '../../types';
import { apiAddProject, apiUpdateProject, apiGetClients, apiGetBusinesses, apiGetUsers, apiGetQuizzes } from '../../services/api';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import MultiSelect from '../ui/MultiSelect'; // New import
import { useNotification } from '../../hooks/useNotification';
import SearchableSelect from '../ui/SearchableSelect'; // New import
import { useAuth } from '../../hooks/useAuth';

interface AddEditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingProject?: Project | null;
}

type ProjectFormData = Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'createdByUserId'>;

const AddEditProjectModal: React.FC<AddEditProjectModalProps> = ({ isOpen, onClose, onSuccess, existingProject }) => {
  const { addNotification } = useNotification();
  const { user: loggedInUser } = useAuth();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [surveys, setSurveys] = useState<Quiz[]>([]);

  const getInitialFormData = useCallback((): ProjectFormData => {
    const defaultStartDate = new Date().toISOString().split('T')[0];
    const defaultEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Default 30 days later

    return {
      name: existingProject?.name || '',
      description: existingProject?.description || '',
      status: existingProject?.status || ProjectStatus.PLANNING,
      clientId: existingProject?.clientId || '',
      businessId: existingProject?.businessId || '',
      teamLeadId: existingProject?.teamLeadId || '',
      memberIds: existingProject?.memberIds || [],
      startDate: existingProject?.startDate ? existingProject.startDate.split('T')[0] : defaultStartDate,
      endDate: existingProject?.endDate ? existingProject.endDate.split('T')[0] : defaultEndDate,
      surveyId: existingProject?.surveyId || '',
    };
  }, [existingProject]);

  const [formData, setFormData] = useState<ProjectFormData>(getInitialFormData());
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      const fetchDropdownData = async () => {
        try {
          const [fetchedClients, fetchedBusinesses, fetchedUsers, allQuizzes] = await Promise.all([
            apiGetClients(),
            apiGetBusinesses(),
            apiGetUsers(),
            apiGetQuizzes(),
          ]);
          setClients(fetchedClients);
          setBusinesses(fetchedBusinesses);
          setUsers(fetchedUsers.filter(u => u.role !== UserRole.OWNER)); // Filter out owner perhaps
          setSurveys(allQuizzes.filter(q => q.quizType === 'Survey'));
        } catch (error) {
          addNotification("Failed to load data for project form.", "error");
        }
      };
      fetchDropdownData();
      setFormData(getInitialFormData());
      setErrors({});
    }
  }, [isOpen, existingProject, getInitialFormData, addNotification]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | { target: { name: string, value: string | number }}) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value as string }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Project name is required.";
    if (!formData.businessId) newErrors.businessId = "Business is required.";
    if (formData.startDate && formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      newErrors.endDate = "End date cannot be before start date.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !loggedInUser) return;
    setIsLoading(true);

    try {
        const payload: Partial<ProjectFormData> = { ...formData };

        // Sanitize payload to remove empty optional fields, preventing Firestore errors with `undefined`.
        const finalPayload: Partial<ProjectFormData> = Object.fromEntries(
            Object.entries(payload).filter(([_, v]) => {
                if (Array.isArray(v)) return true; // Keep empty arrays for memberIds
                return v !== undefined && v !== null && v !== '';
            })
        );
        
        // Re-add required fields to ensure they are present, even if validation somehow missed an empty string.
        finalPayload.name = formData.name;
        finalPayload.status = formData.status;
        finalPayload.clientId = formData.clientId;
        finalPayload.startDate = formData.startDate;

        // Ensure description can be set to an empty string to clear the field.
        if (!finalPayload.hasOwnProperty('description')) {
            finalPayload.description = '';
        }
        
        // Ensure memberIds is at least an empty array.
        if (!finalPayload.memberIds) {
            finalPayload.memberIds = [];
        }

        // FIX: apiUpdateProject expects only one argument.
        if (existingProject?.id) {
            await apiUpdateProject({ ...finalPayload, id: existingProject.id });
            addNotification("Project updated successfully!", "success");
        } else {
            // FIX: apiAddProject expects one argument and needs createdByUserId.
            const payloadForAdd = {
                ...finalPayload,
                createdByUserId: loggedInUser.id
            };
            await apiAddProject(payloadForAdd as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>);
            addNotification("Project created successfully!", "success");
        }
        onSuccess();
    } catch (error) {
        addNotification(`Failed to save project: ${(error as Error).message}`, "error");
    }
    setIsLoading(false);
  };
  
  const handleClearClientBusiness = () => setFormData(prev => ({ ...prev, clientId: '', businessId: '' }));

  const businessOptions = useMemo(() => {
    const all = businesses.map(b => ({ value: b.id, label: `${b.name} (${b.id})` }));
    if (formData.clientId) {
      const client = clients.find(c => c.id === formData.clientId);
      if (client?.linkedBusinessIds?.length) return all.filter(opt => client.linkedBusinessIds!.includes(opt.value));
      return [];
    }
    return all;
  }, [businesses, formData.clientId, clients]);

  const clientOptions = useMemo(() => {
    const all = clients.map(c => ({ value: c.id, label: `${c.name} (${c.id})` }));
    if (formData.businessId) {
      const business = businesses.find(b => b.id === formData.businessId);
      if (business?.linkedClientIds?.length) return all.filter(opt => business.linkedClientIds!.includes(opt.value));
      return [];
    }
    return all;
  }, [clients, formData.businessId, businesses]);

  // Auto-update business when client is re-selected (same as Sales)
  useEffect(() => {
    if (formData.clientId && !existingProject && businesses.length > 0 && clients.length > 0) {
      const selectedClient = clients.find(c => c.id === formData.clientId);
      if (selectedClient?.linkedBusinessIds?.length) {
        const firstLinkedBusinessId = selectedClient.linkedBusinessIds[0];
        const businessExists = businesses.some(b => b.id === firstLinkedBusinessId);
        if (businessExists && formData.businessId !== firstLinkedBusinessId) {
          setFormData(prev => ({ ...prev, businessId: firstLinkedBusinessId }));
        }
      } else if (selectedClient && !selectedClient.linkedBusinessIds?.length && formData.businessId) {
        setFormData(prev => ({ ...prev, businessId: '' }));
      }
    }
  }, [formData.clientId, clients, businesses, existingProject]);

  // Auto-update client when business is re-selected (same as Sales)
  useEffect(() => {
    if (formData.businessId && !existingProject && businesses.length > 0 && clients.length > 0) {
      const selectedBusiness = businesses.find(b => b.id === formData.businessId);
      if (selectedBusiness?.linkedClientIds?.length) {
        const firstLinkedClientId = selectedBusiness.linkedClientIds[0];
        const clientExists = clients.some(c => c.id === firstLinkedClientId);
        if (clientExists && formData.clientId !== firstLinkedClientId) {
          setFormData(prev => ({ ...prev, clientId: firstLinkedClientId }));
        }
      } else if (selectedBusiness && !selectedBusiness.linkedClientIds?.length && formData.clientId) {
        setFormData(prev => ({ ...prev, clientId: '' }));
      }
    }
  }, [formData.businessId, businesses, clients, existingProject]);


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingProject ? "Edit Project" : "Create New Project"} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto p-2 custom-scrollbar">
        <Input name="name" label="Project Name*" value={formData.name} onChange={handleChange} error={errors.name} required />
        <Input name="description" label="Description" as="textarea" rows={3} value={formData.description || ''} onChange={handleChange} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select name="status" label="Status*" value={formData.status} onChange={handleChange}
            options={Object.values(ProjectStatus).map(s => ({ value: s, label: s }))} required />
          <SearchableSelect label="Team Lead" value={formData.teamLeadId || ''} 
            onChange={value => handleChange({ target: { name: 'teamLeadId', value: String(value) }})}
            options={[{ value: '', label: '-- Select Team Lead --' }, ...users.map(u => ({ value: u.id, label: u.name }))]} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <SearchableSelect
              label="Business*"
              value={formData.businessId || ''}
              onChange={value => handleChange({ target: { name: 'businessId', value: String(value) }})}
              options={[{ value: '', label: '-- Select Business --' }, ...businessOptions]}
              placeholder="-- Search & Select Business --"
              error={errors.businessId}
              required
            />
            {(formData.clientId || formData.businessId) && (
              <Button type="button" variant="ghost" size="sm" onClick={handleClearClientBusiness} className="mt-1 text-xs">Clear & Reselect</Button>
            )}
          </div>
          <SearchableSelect
            label="Client (Optional)"
            value={formData.clientId || ''}
            onChange={value => handleChange({ target: { name: 'clientId', value: String(value) }})}
            options={[{ value: '', label: '-- Select Client --' }, ...clientOptions]}
            placeholder="-- Search & Select Client --"
            error={errors.clientId}
          />
        </div>
        
        <MultiSelect
            label="Team Members"
            options={users.map(user => ({ value: user.id, label: user.name }))}
            selectedValues={formData.memberIds}
            onChange={(selectedMemberIds) => setFormData(prev => ({...prev, memberIds: selectedMemberIds}))}
            placeholder="Select team members..."
            containerClassName="mb-4"
        />

        <SearchableSelect
            label="Related Survey (Optional)" 
            value={formData.surveyId || ''} 
            onChange={value => handleChange({ target: { name: 'surveyId', value: String(value) }})}
            options={[{value: '', label: '-- No Survey --'}, ...surveys.map(s => ({ value: s.id, label: `${s.title} (${s.id})` }))]}
            placeholder={surveys.length === 0 ? "No surveys available" : "-- Search Survey --"}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input name="startDate" label="Start Date" type="date" value={formData.startDate || ''} onChange={handleChange} error={errors.startDate} />
          <Input name="endDate" label="End Date" type="date" value={formData.endDate || ''} onChange={handleChange} error={errors.endDate} />
        </div>
        
        {errors.form && <p className="text-sm text-status-danger text-center">{errors.form}</p>}
        
        <div className="pt-2 flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>{existingProject ? "Save Changes" : "Create Project"}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddEditProjectModal;