import React, { useState, useEffect, useCallback } from 'react';
import { Lead, LeadStatus, User, MYANMAR_STATES, MYANMAR_CITIES_BY_STATE, BusinessTypeSetting } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { apiAddLead, apiUpdateLead, apiGetBusinessTypeSettings, apiGetLeadSettings } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification'; // New import
import SearchableSelect from '../ui/SearchableSelect'; // New import

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  users: User[];
  editingLead?: Lead | null;
}

const AddLeadModal: React.FC<AddLeadModalProps> = ({ isOpen, onClose, onSuccess, users, editingLead }) => {
  const { user: loggedInUser } = useAuth();
  const { addNotification } = useNotification(); // New hook usage
  
  const [leadSources, setLeadSources] = useState<string[]>([]);
  const [businessTypes, setBusinessTypes] = useState<BusinessTypeSetting[]>([]);

  const getInitialFormData = useCallback((): Partial<Lead> => ({
    name: editingLead?.name || '',
    phone: editingLead?.phone || '',
    email: editingLead?.email || '',
    businessName: editingLead?.businessName || '',
    businessType: editingLead?.businessType || '',
    leadSource: editingLead?.leadSource || '',
    country: editingLead?.country || 'Myanmar',
    state: editingLead?.state || '',
    city: editingLead?.city || '',
    address: editingLead?.address || '',
    assignedTo: editingLead?.assignedTo || loggedInUser?.id || '',
    status: editingLead?.status || LeadStatus.NEW,
    priority: editingLead?.priority || 'Medium',
    notes: editingLead?.notes || '',
    personalFbLink: editingLead?.personalFbLink || '',
    viberTelegram: editingLead?.viberTelegram || '',
    businessPageUrl: editingLead?.businessPageUrl || '',
    websiteUrl: editingLead?.websiteUrl || '',
    facebookPageId: editingLead?.facebookPageId || '',
  }), [editingLead, loggedInUser?.id]);


  const [formData, setFormData] = useState<Partial<Lead>>(getInitialFormData());
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
      const fetchSettings = async () => {
        try {
          const [leadSettings, fetchedBusinessTypes] = await Promise.all([
            apiGetLeadSettings(),
            apiGetBusinessTypeSettings(),
          ]);
          setLeadSources((leadSettings.leadSources || []).filter(Boolean));
          setBusinessTypes(fetchedBusinessTypes.filter(bt => bt.isActive));
        } catch (error) {
          console.error("Failed to fetch lead settings:", error);
          addNotification("Failed to load lead creation options.", "error", "Loading Error");
        }
      };
      fetchSettings();
    }
  }, [isOpen, getInitialFormData, addNotification]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | { target: { name: string, value: string | number } }) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (name === "country" && value !== "Myanmar") {
        setFormData(prev => ({ ...prev, state: '', city: '' }));
    }
  };
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) newErrors.name = "Name is required.";
    if (!formData.phone?.trim()) newErrors.phone = "Phone is required.";
    else if (!/^\+?\d{7,15}$/.test(formData.phone.trim())) newErrors.phone = "Invalid phone number format.";
    if (!formData.businessName?.trim()) newErrors.businessName = "Business name is required.";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Invalid email format.";
    if (!formData.businessType) newErrors.businessType = "Business type is required.";
    if (!formData.leadSource) newErrors.leadSource = "Lead source is required.";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !loggedInUser) return;

    setIsLoading(true);
    try {
        if(editingLead) {
            const updatedLead = await apiUpdateLead({ ...formData, id: editingLead.id });
            addNotification(`Lead "${updatedLead.name}" updated successfully!`, 'success', 'Lead Updated');
        } else {
            const newLeadData = {
                ...formData,
                status: LeadStatus.NEW, 
                assignedTo: formData.assignedTo || loggedInUser.id,
                createdByUserId: loggedInUser.id,
            } as Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>; 

            const addedLead = await apiAddLead(newLeadData);
            addNotification(`Lead "${addedLead.name}" added successfully!`, 'success', 'Lead Added');
        }
      onSuccess();
    } catch (error) {
      console.error("Failed to save lead:", error);
      addNotification(`Failed to save lead. ${(error as Error).message || 'Please try again.'}`, 'error', 'Error Saving Lead');
      setErrors({ form: 'Failed to save lead. Please try again.' });
    }
    setIsLoading(false);
  };
  
  const selectedState = formData.country === 'Myanmar' ? formData.state : '';
  const citiesForSelectedState = selectedState ? MYANMAR_CITIES_BY_STATE[selectedState] || [] : [];


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingLead ? "Edit Lead" : "Add New Lead"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto p-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input name="name" label="Contact Name*" value={formData.name || ''} onChange={handleChange} error={errors.name} required />
          <Input name="phone" label="Phone Number*" value={formData.phone || ''} onChange={handleChange} error={errors.phone} required />
        </div>
        <Input name="email" label="Email" type="email" value={formData.email || ''} onChange={handleChange} error={errors.email} />
        <Input name="businessName" label="Business Name*" value={formData.businessName || ''} onChange={handleChange} error={errors.businessName} required />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select name="businessType" label="Business Type*" value={formData.businessType || ''} onChange={handleChange} options={businessTypes.map(bt => ({value: bt.name, label: bt.name}))} error={errors.businessType} required 
            placeholder={businessTypes.length === 0 ? "Loading types..." : "-- Select Business Type --"}
            disabled={businessTypes.length === 0 && leadSources.length === 0} />
            <Select name="leadSource" label="Lead Source*" value={formData.leadSource || ''} onChange={handleChange} options={leadSources.map(source => ({value: source, label: source}))} error={errors.leadSource} required 
            placeholder={leadSources.length === 0 ? "Loading sources..." : "-- Select Lead Source --"}
            disabled={businessTypes.length === 0 && leadSources.length === 0}/>
        </div>
        
        <Select name="country" label="Country" value={formData.country || ''} onChange={handleChange} options={[{value: 'Myanmar', label: 'Myanmar'}, {value: 'Other', label: 'Other'}]} />

        {formData.country === 'Myanmar' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select name="state" label="State/Region (Myanmar)" value={selectedState || ''} onChange={handleChange} options={MYANMAR_STATES.map(s => ({value: s, label: s}))} disabled={formData.country !== 'Myanmar'} placeholder="-- Select State --"/>
            <Select name="city" label="City (Myanmar)" value={formData.city || ''} onChange={handleChange} options={citiesForSelectedState.map(c => ({value: c, label: c}))} disabled={!selectedState || formData.country !== 'Myanmar'} placeholder="-- Select City --"/>
          </div>
        )}
        
        <Input name="address" label="Address" value={formData.address || ''} onChange={handleChange} />

        <h3 className="text-md font-semibold text-text-secondary dark:text-slate-300 pt-2 border-t dark:border-slate-700">Optional Contact Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="viberTelegram" label="Viber/Telegram No" value={formData.viberTelegram || ''} onChange={handleChange} />
            <Input name="personalFbLink" label="Personal Facebook URL" value={formData.personalFbLink || ''} onChange={handleChange} />
            <Input name="businessPageUrl" label="Business Page URL" value={formData.businessPageUrl || ''} onChange={handleChange} />
            <Input name="facebookPageId" label="Facebook Page ID" value={formData.facebookPageId || ''} onChange={handleChange} />
            <Input name="websiteUrl" label="Website URL" value={formData.websiteUrl || ''} onChange={handleChange} containerClassName="md:col-span-2" />
        </div>


        <h3 className="text-md font-semibold text-text-secondary dark:text-slate-300 pt-2 border-t dark:border-slate-700">Internal Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableSelect 
              label="Assign To" 
              value={formData.assignedTo || ''} 
              onChange={(value) => handleChange({ target: { name: 'assignedTo', value } } as React.ChangeEvent<HTMLSelectElement>)} 
              options={users.map(u => ({value: u.id, label: u.name}))}
              placeholder="-- Search & Select User --"
            />
            <Select name="priority" label="Priority" value={formData.priority || 'Medium'} onChange={handleChange} options={[{value: 'High', label: 'High'}, {value: 'Medium', label: 'Medium'}, {value: 'Low', label: 'Low'}]} />
        </div>

        <Input 
          as="textarea"
          name="notes"
          id="notes"
          label="Notes"
          value={formData.notes || ''}
          onChange={handleChange}
          rows={3}
        />

        {errors.form && <p className="text-sm text-status-danger text-center">{errors.form}</p>}
        
        <div className="pt-2 flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>{editingLead ? 'Save Changes' : 'Add Lead'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddLeadModal;