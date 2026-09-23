import React, { useState, useEffect } from 'react';
import { Business, Client, MYANMAR_STATES, MYANMAR_CITIES_BY_STATE, BusinessTypeSetting } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { useNotification } from '../../hooks/useNotification';
import { apiAddBusiness, apiUpdateBusiness, apiGetBusinessTypeSettings, apiAddClient } from '../../services/api';
import SearchableMultiSelect from '../ui/SearchableMultiSelect';
import { logTiming } from '../../utils/perf';

interface AddBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingClients: Client[];
  existingBusiness?: Business | null;
}

const AddBusinessModal: React.FC<AddBusinessModalProps> = ({ isOpen, onClose, onSuccess, existingClients, existingBusiness }) => {
  const { addNotification } = useNotification();
  const isEditMode = !!existingBusiness;

  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('Myanmar');
  const [businessPageUrl, setBusinessPageUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [facebookPageId, setFacebookPageId] = useState('');
  const [linkOption, setLinkOption] = useState<'none' | 'existing' | 'new'>('none');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [newClientDetails, setNewClientDetails] = useState({
    name: '',
    phone: '',
    email: '',
    viberTelegram: '',
    personalFbLink: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [businessTypes, setBusinessTypes] = useState<BusinessTypeSetting[]>([]);

  const resetForm = () => {
    setName('');
    setIndustry('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCity('');
    setState('');
    setCountry('Myanmar');
    setBusinessPageUrl('');
    setWebsiteUrl('');
    setFacebookPageId('');
    setLinkOption('none');
    setSelectedClientIds([]);
    setNewClientDetails({
      name: '',
      phone: '',
      email: '',
      viberTelegram: '',
      personalFbLink: '',
    });
    setErrors({});
  };

  useEffect(() => {
      if (isOpen) {
          const fetchSettings = async () => {
            const fetchedBusinessTypes = await apiGetBusinessTypeSettings();
            setBusinessTypes(fetchedBusinessTypes.filter(bt => bt.isActive));
          };
          fetchSettings();

          if (existingBusiness) {
              setName(existingBusiness.name);
              setIndustry(existingBusiness.industry || '');
              setPhone(existingBusiness.phone || '');
              setEmail(existingBusiness.email || '');
              setAddress(existingBusiness.address || '');
              setCity(existingBusiness.city || '');
              setState(existingBusiness.state || '');
              setCountry(existingBusiness.country || 'Myanmar');
              setBusinessPageUrl(existingBusiness.businessPageUrl || '');
              setWebsiteUrl(existingBusiness.websiteUrl || '');
              setFacebookPageId(existingBusiness.facebookPageId || '');
              const linked = existingBusiness.linkedClientIds || [];
              if (linked.length > 0) {
                  setLinkOption('existing');
                  setSelectedClientIds([...linked]);
              } else {
                  setLinkOption('none');
                  setSelectedClientIds([]);
              }
          } else {
              resetForm();
          }
      }
  }, [isOpen, existingBusiness]);


  const validate = (): boolean => {
    const newErrors: Record<string,string> = {};
    if (!name.trim()) newErrors.name = "Business name is required.";
    if (phone && !/^\+?\d{7,15}$/.test(phone.trim())) newErrors.phone = "Invalid phone number format.";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Invalid email format.";
    if (linkOption === 'existing' && selectedClientIds.length === 0) {
      newErrors.selectedClientId = "Please select at least one client to link.";
    }
    if (linkOption === 'new' && !newClientDetails.name.trim()) {
      newErrors.newClientName = "Client name is required.";
    }
    if (linkOption === 'new' && newClientDetails.phone && !/^\+?\d{7,15}$/.test(newClientDetails.phone.trim())) {
      newErrors.newClientPhone = "Invalid phone number format.";
    }
    if (linkOption === 'new' && newClientDetails.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newClientDetails.email)) {
      newErrors.newClientEmail = "Invalid email format.";
    }
    // Prevent accidental wipe of existing links when saving other fields
    if (
      isEditMode &&
      linkOption === 'none' &&
      (existingBusiness?.linkedClientIds?.length || 0) > 0
    ) {
      newErrors.selectedClientId = "This business still has linked clients. Choose “Link to an Existing Client” to keep or change them, or remove them intentionally first.";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitStart = performance.now();
    if(!validate()) {
      logTiming('AddBusinessModal.handleSubmit', submitStart, { result: 'validation_error' });
      return;
    }

    setIsLoading(true);

    try {
        if (isEditMode && existingBusiness) {
            const businessUpdateData: Partial<Business> & { id: string } = {
                id: existingBusiness.id, name, industry, phone, email, address, city, state, country, businessPageUrl, websiteUrl, facebookPageId,
            };
            // Only update links when user explicitly chose existing/new linkage — never silently clear
            if (linkOption === 'existing') {
                businessUpdateData.linkedClientIds = selectedClientIds;
            } else if (linkOption === 'none' && (existingBusiness.linkedClientIds || []).length === 0) {
                businessUpdateData.linkedClientIds = [];
            } else if (linkOption === 'none' && (existingBusiness.linkedClientIds || []).length > 0) {
                // Keep existing links unless user confirmed clear via validation path
                businessUpdateData.linkedClientIds = existingBusiness.linkedClientIds;
            }
            const apiStart = performance.now();
            await apiUpdateBusiness(businessUpdateData);
            logTiming('AddBusinessModal.apiUpdateBusiness', apiStart);
            addNotification("Business updated successfully.", "success");
        } else {
            const businessData: Omit<Business, 'id' | 'createdAt' | 'updatedAt'> = {
              name, industry, phone, email, address, city, state, country, businessPageUrl, websiteUrl, facebookPageId,
              linkedClientIds: linkOption === 'existing' ? selectedClientIds : [],
              // FIX: Added missing 'balance' property, initializing to 0 for a new business.
              balance: 0,
            };
            const apiStart = performance.now();
            const createdBusiness = await apiAddBusiness(businessData, false);
            logTiming('AddBusinessModal.apiAddBusiness', apiStart);
            if (linkOption === 'new' && newClientDetails.name.trim()) {
              const clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> = {
                name: newClientDetails.name.trim(),
                phone: newClientDetails.phone || '',
                email: newClientDetails.email || '',
                viberTelegram: newClientDetails.viberTelegram || '',
                personalFbLink: newClientDetails.personalFbLink || '',
                linkedBusinessIds: [createdBusiness.id],
                balance: 0,
              };
              const clientApiStart = performance.now();
              await apiAddClient(clientData);
              logTiming('AddBusinessModal.apiAddClient', clientApiStart);
            }
            addNotification("Business added successfully.", "success");
        }
        onSuccess();
    } catch(error) {
        addNotification(`Failed to save business: ${(error as Error).message}`, "error");
        setErrors({form: "Failed to save business."});
        logTiming('AddBusinessModal.handleSubmit', submitStart, { result: 'error', mode: isEditMode ? 'edit' : 'create' });
    }
    setIsLoading(false);
    logTiming('AddBusinessModal.handleSubmit', submitStart, { result: 'success', mode: isEditMode ? 'edit' : 'create' });
  };
  
  const citiesForSelectedState = state ? MYANMAR_CITIES_BY_STATE[state] || [] : [];
  const handleNewClientDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewClientDetails(prev => ({ ...prev, [name]: value }));
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? "Edit Business" : "Add New Business"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto p-1">
        <Input label="Business Name*" id="businessName" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required />
        <Select label="Industry" id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} options={businessTypes.map(bt => ({value: bt.name, label: bt.name}))} placeholder="-- Select Industry --"/>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Business Phone" id="businessPhone" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone}/>
            <Input label="Business Email" id="businessEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        </div>
        <Input label="Street Address" id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
        <Select label="Country" value={country} onChange={(e) => { setCountry(e.target.value); setState(''); setCity(''); }} options={[{value: 'Myanmar', label: 'Myanmar'}, {value: 'Other', label: 'Other'}]} />
        {country === 'Myanmar' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select label="State/Region (Myanmar)" value={state || ''} onChange={(e) => { setState(e.target.value); setCity(''); }} options={MYANMAR_STATES.map(s => ({value: s, label: s}))} placeholder="-- Select State --"/>
                <Select label="City (Myanmar)" value={city || ''} onChange={(e) => setCity(e.target.value)} options={citiesForSelectedState.map(c => ({value: c, label: c}))} disabled={!state} placeholder="-- Select City --"/>
            </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Business Page URL (Optional)" id="businessPageUrl" value={businessPageUrl} onChange={(e) => setBusinessPageUrl(e.target.value)} />
            <Input label="Facebook Page ID (Optional)" id="facebookPageId" value={facebookPageId} onChange={(e) => setFacebookPageId(e.target.value)} />
        </div>
        <Input label="Website URL (Optional)" id="websiteUrl" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />


        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-text-secondary mb-1">Link to Client</legend>
          <div className="space-y-2">
            <div>
              <input
                type="radio"
                id="linkClientNone"
                name="linkClientOption"
                value="none"
                checked={linkOption === 'none'}
                onChange={() => setLinkOption('none')}
                className="mr-2"
              />
              <label htmlFor="linkClientNone" className="text-sm text-text-primary">No specific client linkage now</label>
            </div>
            <div>
              <input
                type="radio"
                id="linkClientExisting"
                name="linkClientOption"
                value="existing"
                checked={linkOption === 'existing'}
                onChange={() => setLinkOption('existing')}
                className="mr-2"
              />
              <label htmlFor="linkClientExisting" className="text-sm text-text-primary">Link to an Existing Client</label>
            </div>
            {linkOption === 'existing' && (
              <SearchableMultiSelect
                options={existingClients.map(c => ({ value: c.id, label: `${c.name} (${c.id})` }))}
                value={selectedClientIds}
                onChange={(ids) => setSelectedClientIds(ids.map(v => String(v)))}
                placeholder="-- Search and add clients --"
                error={errors.selectedClientId}
                containerClassName="pl-6 mb-0"
              />
            )}
            <div>
              <input
                type="radio"
                id="linkClientNew"
                name="linkClientOption"
                value="new"
                checked={linkOption === 'new'}
                onChange={() => setLinkOption('new')}
                className="mr-2"
              />
              <label htmlFor="linkClientNew" className="text-sm text-text-primary">Create New client for this business</label>
            </div>
            {linkOption === 'new' && (
              <div className="pl-6 space-y-3 mt-2 border-l-2 border-primary-action ml-2">
                <Input
                  name="name"
                  placeholder="Client Name*"
                  value={newClientDetails.name}
                  onChange={handleNewClientDetailsChange}
                  error={errors.newClientName}
                  containerClassName="mb-0 pt-2"
                />
                <Input
                  name="phone"
                  placeholder="Client Phone"
                  value={newClientDetails.phone}
                  onChange={handleNewClientDetailsChange}
                  error={errors.newClientPhone}
                  containerClassName="mb-0"
                />
                <Input
                  name="email"
                  type="email"
                  placeholder="Client Email"
                  value={newClientDetails.email}
                  onChange={handleNewClientDetailsChange}
                  error={errors.newClientEmail}
                  containerClassName="mb-0"
                />
                <Input
                  name="viberTelegram"
                  placeholder="Viber/Telegram No"
                  value={newClientDetails.viberTelegram}
                  onChange={handleNewClientDetailsChange}
                  containerClassName="mb-0"
                />
                <Input
                  name="personalFbLink"
                  placeholder="Personal Facebook URL"
                  value={newClientDetails.personalFbLink}
                  onChange={handleNewClientDetailsChange}
                  containerClassName="mb-0"
                />
              </div>
            )}
          </div>
          {isEditMode && (
            <p className="text-xs text-text-secondary mt-2">You can add or remove linked clients above.</p>
          )}
        </fieldset>

        {errors.form && <p className="text-sm text-status-danger text-center">{errors.form}</p>}
        <div className="pt-2 flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>{isEditMode ? 'Save Changes' : 'Add Business'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddBusinessModal;