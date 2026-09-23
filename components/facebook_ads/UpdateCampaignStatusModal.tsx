
import React, { useState, useEffect } from 'react';
import { FacebookAdsSaleRecord, FacebookCampaignStatus } from '../../types';
import { apiUpdateSaleRecord } from '../../services/api';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { useNotification } from '../../hooks/useNotification';

interface UpdateCampaignStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  campaign: FacebookAdsSaleRecord;
}

const UpdateCampaignStatusModal: React.FC<UpdateCampaignStatusModalProps> = ({ isOpen, onClose, onSuccess, campaign }) => {
  const { addNotification } = useNotification();
  const [newStatus, setNewStatus] = useState<FacebookCampaignStatus>(FacebookCampaignStatus.COMPLETED);
  const [actualSpendUSD, setActualSpendUSD] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewStatus(FacebookCampaignStatus.COMPLETED);
      setActualSpendUSD(campaign.actualSpendUSD ?? campaign.budgetUSD ?? '');
    }
  }, [isOpen, campaign]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actualSpendUSD === '' || Number(actualSpendUSD) < 0) {
      addNotification("Please enter a valid actual amount spent.", "error");
      return;
    }
    setIsLoading(true);

    try {
      const actualSpend = Number(actualSpendUSD);
      
      const newSubtotal = actualSpend * campaign.serviceRateMMK;
      const discount = (campaign.packageDiscountMMK || 0) + (campaign.manualDiscountMMK || 0);
      const subtotalAfterDiscount = newSubtotal - discount;
      const tax = subtotalAfterDiscount * (campaign.taxPercentage || 0) / 100;
      const otherFees = campaign.otherFeesAmountMMK || 0;
      const newGrandTotal = subtotalAfterDiscount + tax + otherFees;
      
      const updatePayload: Partial<FacebookAdsSaleRecord> & { id: string } = {
        id: campaign.id,
        campaignStatus: newStatus,
        actualSpendUSD: actualSpend,
        subtotalMMK: newSubtotal,
        taxAmountMMK: tax,
        grandTotalMMK: newGrandTotal,
      };

      await apiUpdateSaleRecord(updatePayload as any);
      addNotification("Campaign status updated and balance adjusted successfully.", "success");
      onSuccess();
    } catch (error) {
      addNotification(`Failed to update campaign: ${(error as Error).message}`, "error");
    }
    setIsLoading(false);
  };

  const statusOptions = Object.values(FacebookCampaignStatus)
    .filter(status => status !== FacebookCampaignStatus.ACTIVE)
    .map(status => ({ value: status, label: status }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Update Campaign: ${campaign.campaignName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-text-secondary">
          Updating the status from 'Active' requires recording the final amount spent. This will adjust the client's balance accordingly.
        </p>
        <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-md text-sm">
            <p><strong>Original Budgeted Amount:</strong> ${campaign.budgetUSD.toLocaleString()} USD</p>
            <p><strong>Original Billed Amount:</strong> {campaign.grandTotalMMK.toLocaleString()} MMK</p>
        </div>
        <Select
          label="New Status*"
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value as FacebookCampaignStatus)}
          options={statusOptions}
          required
        />
        <Input
          label="Actual Amount Spent (USD)*"
          type="number"
          step="0.01"
          value={actualSpendUSD}
          onChange={(e) => setActualSpendUSD(e.target.value === '' ? '' : parseFloat(e.target.value))}
          required
        />
        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>Save & Adjust Balance</Button>
        </div>
      </form>
    </Modal>
  );
};

export default UpdateCampaignStatusModal;
