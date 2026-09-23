import React, { useEffect, useState, useMemo } from 'react';
import { BalanceAdjustmentType, Client, Business, Service, User } from '../../../types';
import { apiCreateBalanceAdjustment } from '../../../services/api';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import Button from '../../ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { useNotification } from '../../../hooks/useNotification';
import SearchableSelect from '../../ui/SearchableSelect';
import { getTodayInYangon } from '../../../utils/dateUtils';

interface RecordBalanceAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clients: Client[];
  businesses: Business[];
  users: User[];
  services: Service[];
}

const RecordBalanceAdjustmentModal: React.FC<RecordBalanceAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clients,
  businesses,
  users,
  services,
}) => {
  const { user } = useAuth();
  const { addNotification } = useNotification();

  const [clientId, setClientId] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [type, setType] = useState<BalanceAdjustmentType>(BalanceAdjustmentType.DECREASE);
  const [amountMMK, setAmountMMK] = useState<number | ''>('');
  const [adjustmentDate, setAdjustmentDate] = useState(getTodayInYangon());
  const [serviceId, setServiceId] = useState('');
  const [totalUSD, setTotalUSD] = useState<number | ''>('');
  const [rate, setRate] = useState<number | ''>('');
  const [employeeId, setEmployeeId] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  const handleClearClientBusiness = () => { setClientId(''); setBusinessId(''); setForceUpdate(prev => prev + 1); };

  const businessOptions = useMemo(() => {
    const all = businesses.map(b => ({ value: b.id, label: `${b.name || 'Unnamed'} (${b.id})` }));
    if (clientId) {
      const client = clients.find(c => c.id === clientId);
      if (client?.linkedBusinessIds?.length) {
        return all.filter(opt => client.linkedBusinessIds!.includes(opt.value));
      }
      return [];
    }
    return all;
  }, [businesses, clients, clientId, forceUpdate]);

  const clientOptions = useMemo(() => {
    const all = clients.map(c => ({ value: c.id, label: `${c.name || 'Unnamed'} (${c.id})` }));
    if (businessId) {
      const business = businesses.find(b => b.id === businessId);
      if (business?.linkedClientIds?.length) {
        return all.filter(opt => business.linkedClientIds!.includes(opt.value));
      }
      return [];
    }
    return all;
  }, [clients, businesses, businessId, forceUpdate]);

  useEffect(() => {
    if (!isOpen) return;
    setClientId('');
    setBusinessId('');
    setType(BalanceAdjustmentType.DECREASE);
    setAmountMMK('');
    setAdjustmentDate(getTodayInYangon());
    setServiceId('');
    setTotalUSD('');
    setRate('');
    setEmployeeId('');
    setReason('');
    setDescription('');
    setIsSaving(false);
    setForceUpdate(0);
  }, [isOpen]);

  const handleBusinessChange = (value: string | number) => {
    const nextBusinessId = String(value);
    setBusinessId(nextBusinessId);
    setForceUpdate(prev => prev + 1);
    if (!nextBusinessId) {
      if (clientId) setClientId('');
      return;
    }
    const selectedBusiness = businesses.find(b => b.id === nextBusinessId);
    if (selectedBusiness?.linkedClientIds?.length) {
      const firstLinkedClientId = selectedBusiness.linkedClientIds[0];
      if (clientId !== firstLinkedClientId) {
        setClientId(firstLinkedClientId);
      }
    } else if (clientId) {
      setClientId('');
    }
  };

  const handleClientChange = (value: string | number) => {
    const nextClientId = String(value);
    setClientId(nextClientId);
    setForceUpdate(prev => prev + 1);
    if (!nextClientId) {
      if (businessId) setBusinessId('');
      return;
    }
    const selectedClient = clients.find(c => c.id === nextClientId);
    if (selectedClient?.linkedBusinessIds?.length) {
      const firstLinkedBusinessId = selectedClient.linkedBusinessIds[0];
      if (businessId !== firstLinkedBusinessId) {
        setBusinessId(firstLinkedBusinessId);
      }
    } else if (businessId) {
      setBusinessId('');
    }
  };

  const resetForm = () => {
    setClientId('');
    setBusinessId('');
    setType(BalanceAdjustmentType.DECREASE);
    setAmountMMK('');
    setAdjustmentDate(getTodayInYangon());
    setServiceId('');
    setTotalUSD('');
    setRate('');
    setEmployeeId('');
    setReason('');
    setDescription('');
  };

  useEffect(() => {
    if (!businessId) return;
    const selectedBusiness = businesses.find(b => b.id === businessId);
    if (selectedBusiness?.linkedClientIds?.length) {
      const firstLinkedClientId = selectedBusiness.linkedClientIds[0];
      if (clientId !== firstLinkedClientId) {
        setClientId(firstLinkedClientId);
      }
    } else if (clientId) {
      setClientId('');
    }
  }, [businessId, businesses]);

  useEffect(() => {
    if (!clientId) return;
    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient?.linkedBusinessIds?.length) {
      const firstLinkedBusinessId = selectedClient.linkedBusinessIds[0];
      if (businessId !== firstLinkedBusinessId) {
        setBusinessId(firstLinkedBusinessId);
      }
    } else if (businessId) {
      setBusinessId('');
    }
  }, [clientId, clients]);

  const selectedService = useMemo(
    () => services.find(s => s.id === serviceId) || null,
    [services, serviceId]
  );
  const isAdsService = useMemo(() => {
    if (!selectedService) return false;
    const name = selectedService.name.toLowerCase();
    return name.includes('facebook') || name.includes('tiktok') || name.includes('tik tok');
  }, [selectedService]);

  useEffect(() => {
    if (isAdsService && totalUSD && rate) {
      setAmountMMK(Number(totalUSD) * Number(rate));
    }
  }, [isAdsService, totalUSD, rate]);

  const handleSubmit = async (continueAfterSave: boolean) => {
    if (!user) return;
    if (!clientId || !businessId) {
      addNotification('Please select both client and business.', 'error');
      return;
    }
    if (!amountMMK || Number(amountMMK) <= 0) {
      addNotification('Amount must be greater than 0.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await apiCreateBalanceAdjustment({
        clientId,
        businessId,
        type,
        amountMMK: Number(amountMMK),
        adjustmentDate,
        serviceId: serviceId || undefined,
        totalUSD: isAdsService && totalUSD ? Number(totalUSD) : undefined,
        rate: isAdsService && rate ? Number(rate) : undefined,
        employeeId: employeeId || undefined,
        reason: reason.trim() || undefined,
        description: description.trim() || undefined,
        recordedByUserId: user.id,
      });
      addNotification('Balance adjustment recorded.', 'success');
      onSuccess();
      if (continueAfterSave) {
        resetForm();
        return;
      }
    } catch (error) {
      addNotification(`Failed to record adjustment: ${(error as Error).message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Balance Adjustment">
      <div className="space-y-4">
        <div>
          <SearchableSelect
            label="Business*"
            value={businessId}
            onChange={handleBusinessChange}
            options={businessOptions}
            placeholder="-- Search & Select Business --"
            required
          />
          {(clientId || businessId) && (
            <Button type="button" variant="ghost" size="sm" onClick={handleClearClientBusiness} className="mt-1 text-xs">
              Clear & Reselect
            </Button>
          )}
        </div>
        <SearchableSelect
          label="Client*"
          value={clientId}
          onChange={handleClientChange}
          options={clientOptions}
          placeholder="-- Search & Select Client --"
          required
        />
        <Select
          label="Adjustment Type"
          value={type}
          onChange={(e) => setType(e.target.value as BalanceAdjustmentType)}
          options={[
            { value: BalanceAdjustmentType.DECREASE, label: 'Decrease Balance' },
            { value: BalanceAdjustmentType.INCREASE, label: 'Increase Balance' },
          ]}
        />
        {isAdsService ? (
          <>
            <Input
              label="Budget (USD)"
              type="number"
              value={totalUSD}
              onChange={(e) => setTotalUSD(e.target.value === '' ? '' : Number(e.target.value))}
              min="0.01"
              step="0.01"
            />
            <Input
              label="Rate (MMK/USD)"
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value === '' ? '' : Number(e.target.value))}
              min="1"
              step="1"
            />
            <Input
              label="Amount (MMK)"
              type="number"
              value={amountMMK}
              disabled
              containerClassName="opacity-75"
            />
          </>
        ) : (
          <Input
            label="Amount (MMK)"
            type="number"
            value={amountMMK}
            onChange={(e) => setAmountMMK(e.target.value ? Number(e.target.value) : '')}
            min="0"
          />
        )}
        <Input
          label="Adjustment Date"
          type="date"
          value={adjustmentDate}
          onChange={(e) => setAdjustmentDate(e.target.value)}
        />
        <Select
          label="Service (Optional)"
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          options={[
            { value: '', label: '-- No Service --' },
            ...services.map(s => ({ value: s.id, label: s.name })),
          ]}
        />
        <Select
          label="Employee (Optional)"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          options={[
            { value: '', label: '-- No Employee --' },
            ...users.map(u => ({ value: u.id, label: u.name })),
          ]}
        />
        <Input
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional"
        />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => handleSubmit(true)} isLoading={isSaving}>
            Save and Add Another
          </Button>
          <Button variant="primary" onClick={() => handleSubmit(false)} isLoading={isSaving}>
            Save and Exit
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RecordBalanceAdjustmentModal;

