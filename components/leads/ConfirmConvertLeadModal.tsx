
import React, { useState, useEffect } from 'react';
import { Lead } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface ConfirmConvertLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onConfirm: (lead: Lead, clientName: string, businessName: string) => Promise<void>;
}

const ConfirmConvertLeadModal: React.FC<ConfirmConvertLeadModalProps> = ({ isOpen, onClose, lead, onConfirm }) => {
  const [clientName, setClientName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (lead) {
      setClientName(lead.name); // Default client name from lead name
      setBusinessName(lead.businessName); // Default business name from lead
    }
  }, [lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !businessName.trim()) {
      // Validation is handled by form required fields
      return;
    }
    setIsLoading(true);
    await onConfirm(lead, clientName, businessName);
    setIsLoading(false);
    // onClose will be called by parent after successful confirmation logic
  };

  if (!lead) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Convert Lead to Client" size="md">
      <form onSubmit={handleSubmit}>
        <p className="text-text-secondary mb-4">
          You are about to convert the lead <strong className="text-text-primary">{lead.name} ({lead.businessName})</strong> to a new Client and Business.
        </p>
        
        <Input
          label="Client Name"
          id="clientName"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          required
          className="mb-4"
        />
        <Input
          label="Business Name"
          id="businessName"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          required
          className="mb-4"
        />
        
        <div className="mt-6 flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="success" isLoading={isLoading}>
            Convert & Create Client
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ConfirmConvertLeadModal;
