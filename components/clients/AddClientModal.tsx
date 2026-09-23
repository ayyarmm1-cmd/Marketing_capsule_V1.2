import React, { useState, useEffect } from 'react';
import { Client, Business, MYANMAR_CITIES_BY_STATE, MYANMAR_STATES, BusinessTypeSetting } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { useNotification } from '../../hooks/useNotification';
import { apiAddClient, apiUpdateClient, apiGetBusinessTypeSettings } from '../../services/api';
import SearchableMultiSelect from '../ui/SearchableMultiSelect';
import { logTiming } from '../../utils/perf';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingBusinesses: Business[];
  existingClient?: Client | null;
}

const AddClientModal: React.FC<AddClientModalProps> = ({ isOpen, onClose, onSuccess, existingBusinesses, existingClient }) => {
  const { addNotification } = useNotification();
  const isEditMode = !!existingClient;

  // Client fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [personalFbLink, setPersonalFbLink] = useState('');
  const [viberTelegram, setViberTelegram] = useState('');

  // Business linking fields
  const [linkOption, setLinkOption] = useState<'none' | 'existing' | 'new'>('none');
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);
  
  // State for the full new business form
  const [newBusinessDetails, setNewBusinessDetails] = useState({
    name: '',
    industry: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: 'Myanmar',
    businessPageUrl: '',
    websiteUrl: '',
    facebookPageId: '',
  });
  const [businessTypes, setBusinessTypes] = useState<BusinessTypeSetting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string,string>>({});

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setPersonalFbLink('');
    setViberTelegram('');
    setLinkOption('none');
    setSelectedBusinessIds([]);
    setNewBusinessDetails({
        name: '', industry: '', phone: '', email: '', address: '', city: '',
        state: '', country: 'Myanmar', businessPageUrl: '', websiteUrl: '', facebookPageId: '',
    });
    setErrors({});
  }

  useEffect(() => {
    if (isOpen) {
        const fetchSettings = async () => {
            const fetchedBusinessTypes = await apiGetBusinessTypeSettings();
            setBusinessTypes(fetchedBusinessTypes.filter(bt => bt.isActive));
        };
        fetchSettings();
        if (existingClient) {
            setName(existingClient.name);
            setPhone(existingClient.phone || '');
            setEmail(existingClient.email || '');
            setPersonalFbLink(existingClient.personalFbLink || '');
            setViberTelegram(existingClient.viberTelegram || '');
            const linked = existingClient.linkedBusinessIds || [];
            if (linked.length > 0) {
                setLinkOption('existing');
                setSelectedBusinessIds([...linked]);
            } else {
                setLinkOption('none');
                setSelectedBusinessIds([]);
            }
        } else {
            resetForm();
        }
    }
  }, [isOpen, existingClient]);


  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Client name is required.";
    if (phone.trim() && !/^\+?\d{7,15}$/.test(phone.trim())) {
      newErrors.phone = "Invalid phone number format.";
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Invalid email format.";
    if (linkOption === 'existing' && selectedBusinessIds.length === 0) newErrors.selectedBusinessIds = "Please select at least one business.";
    if (linkOption === 'new' && !newBusinessDetails.name.trim()) newErrors.newBusinessName = "New business name is required.";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitStart = performance.now();
    if (!validate()) return;

    setIsLoading(true);
    try {
        if (isEditMode && existingClient) {
            const clientUpdateData: Partial<Client> & { id: string } = {
                id: existingClient.id, name, phone, email, personalFbLink, viberTelegram,
                linkedBusinessIds: linkOption === 'existing' ? selectedBusinessIds : (existingClient.linkedBusinessIds || []),
            };
            if (linkOption === 'none') clientUpdateData.linkedBusinessIds = [];
            const apiStart = performance.now();
            await apiUpdateClient(clientUpdateData);
            logTiming('AddClientModal.apiUpdateClient', apiStart);
            addNotification("Client updated successfully.", "success");
        } else {
            const clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> = {
              name, phone, email, personalFbLink, viberTelegram,
              linkedBusinessIds: linkOption === 'existing' ? selectedBusinessIds : [],
              // FIX: Added missing 'balance' property, initializing to 0 for a new client.
              balance: 0,
            };
            const apiStart = performance.now();
            await apiAddClient(
                clientData, 
                linkOption === 'new' ? newBusinessDetails : undefined
            );
            logTiming('AddClientModal.apiAddClient', apiStart);
            addNotification("Client added successfully.", "success");
        }
        onSuccess();
    } catch(error) {
        addNotification(`Failed to save client: ${(error as Error).message}`, "error");
        setErrors({form: `Failed to save client.`});
        logTiming('AddClientModal.handleSubmit', submitStart, { result: 'error', mode: isEditMode ? 'edit' : 'create' });
    }
    setIsLoading(false);
    logTiming('AddClientModal.handleSubmit', submitStart, { result: 'success', mode: isEditMode ? 'edit' : 'create' });
  };
  
  const handleNewBusinessDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setNewBusinessDetails(prev => ({...prev, [name]: value}));
  };

  const citiesForSelectedState = newBusinessDetails.state ? MYANMAR_CITIES_BY_STATE[newBusinessDetails.state] || [] : [];


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? "Edit Client" : "Add New Client"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto p-1">
        <Input label="Client Name*" id="clientName" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required />
        <Input label="Phone Number (Optional)" id="clientPhone" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
        <Input label="Email" id="clientEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <Input label="Viber/Telegram No (Optional)" id="viberTelegram" value={viberTelegram} onChange={(e) => setViberTelegram(e.target.value)} />
        <Input label="Personal Facebook URL (Optional)" id="personalFbLink" value={personalFbLink} onChange={(e) => setPersonalFbLink(e.target.value)} />


        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-text-secondary mb-1">Link to Business</legend>
          <div className="space-y-2">
            <div>
              <input type="radio" id="linkNone" name="linkOption" value="none" checked={linkOption === 'none'} onChange={() => setLinkOption('none')} className="mr-2"/>
              <label htmlFor="linkNone" className="text-sm text-text-primary">No specific business linkage now</label>
            </div>
            <div>
              <input type="radio" id="linkExisting" name="linkOption" value="existing" checked={linkOption === 'existing'} onChange={() => setLinkOption('existing')} className="mr-2"/>
              <label htmlFor="linkExisting" className="text-sm text-text-primary">Link to an Existing Business</label>
            </div>
            {linkOption === 'existing' && (
              <SearchableMultiSelect
                options={existingBusinesses.map(b => ({ value: b.id, label: `${b.name} (${b.id})` }))}
                value={selectedBusinessIds}
                onChange={(ids) => setSelectedBusinessIds(ids.map(v => String(v)))}
                placeholder="-- Search and add businesses --"
                error={errors.selectedBusinessIds}
                containerClassName="pl-6 mb-0"
              />
            )}
            <div>
              <input type="radio" id="linkNew" name="linkOption" value="new" checked={linkOption === 'new'} onChange={() => setLinkOption('new')} className="mr-2"/>
              <label htmlFor="linkNew" className="text-sm text-text-primary">Create New Business for this Client</label>
            </div>
            {linkOption === 'new' && (
              <div className="pl-6 space-y-3 mt-2 border-l-2 border-primary-action ml-2">
                  <Input name="name" placeholder="Business Name*" value={newBusinessDetails.name} onChange={handleNewBusinessDetailsChange} error={errors.newBusinessName} containerClassName="mb-0 pt-2"/>
                  <Select name="industry" label="Industry" value={newBusinessDetails.industry} onChange={handleNewBusinessDetailsChange} options={businessTypes.map(bt => ({value: bt.name, label: bt.name}))} placeholder="-- Select Industry --" containerClassName="mb-0"/>
                  <Input name="phone" placeholder="Business Phone" value={newBusinessDetails.phone} onChange={handleNewBusinessDetailsChange} containerClassName="mb-0"/>
                  <Input name="email" type="email" placeholder="Business Email" value={newBusinessDetails.email} onChange={handleNewBusinessDetailsChange} containerClassName="mb-0"/>
                  <Input name="address" placeholder="Street Address" value={newBusinessDetails.address} onChange={handleNewBusinessDetailsChange} containerClassName="mb-0"/>
                  <Select label="Country" value={newBusinessDetails.country} onChange={(e) => setNewBusinessDetails(prev => ({ ...prev, country: e.target.value, state: '', city: '' }))} options={[{value: 'Myanmar', label: 'Myanmar'}, {value: 'Other', label: 'Other'}]} containerClassName="mb-0"/>
                  {newBusinessDetails.country === 'Myanmar' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select label="State/Region" value={newBusinessDetails.state || ''} onChange={(e) => setNewBusinessDetails(prev => ({...prev, state: e.target.value, city: ''}))} options={MYANMAR_STATES.map(s => ({value: s, label: s}))} placeholder="-- Select State --" containerClassName="mb-0"/>
                        <Select label="City" value={newBusinessDetails.city || ''} onChange={(e) => setNewBusinessDetails(prev => ({...prev, city: e.target.value}))} options={citiesForSelectedState.map(c => ({value: c, label: c}))} disabled={!newBusinessDetails.state} placeholder="-- Select City --" containerClassName="mb-0"/>
                    </div>
                  )}
                  <Input name="businessPageUrl" placeholder="Business Page URL" value={newBusinessDetails.businessPageUrl} onChange={handleNewBusinessDetailsChange} containerClassName="mb-0"/>
                  <Input name="facebookPageId" placeholder="Facebook Page ID" value={newBusinessDetails.facebookPageId} onChange={handleNewBusinessDetailsChange} containerClassName="mb-0"/>
                  <Input name="websiteUrl" placeholder="Website URL" value={newBusinessDetails.websiteUrl} onChange={handleNewBusinessDetailsChange} containerClassName="mb-0"/>
              </div>
            )}
          </div>
          {isEditMode && (
            <p className="text-xs text-text-secondary mt-2">You can add or remove linked businesses above.</p>
          )}
        </fieldset>

        {errors.form && <p className="text-sm text-status-danger text-center">{errors.form}</p>}
        
        <div className="pt-2 flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>{isEditMode ? 'Save Changes' : 'Add Client'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddClientModal;