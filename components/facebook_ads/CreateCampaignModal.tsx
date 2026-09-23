import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { useNotification } from '../../hooks/useNotification';
import { apiCreateFacebookCampaign } from '../../services/api';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  adAccountId: string;
}

const campaignObjectives = [
    { value: 'LINK_CLICKS', label: 'Link Clicks' },
    { value: 'POST_ENGAGEMENT', label: 'Post Engagement' },
    { value: 'CONVERSIONS', label: 'Conversions' },
    { value: 'LEAD_GENERATION', label: 'Lead Generation' },
    { value: 'REACH', label: 'Reach' },
];

const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({ isOpen, onClose, onSuccess, adAccountId }) => {
    const { addNotification } = useNotification();
    const [name, setName] = useState('');
    const [objective, setObjective] = useState('LINK_CLICKS');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            addNotification("Campaign name is required.", "error");
            return;
        }
        setIsLoading(true);
        try {
            await apiCreateFacebookCampaign(adAccountId, { name, objective });
            addNotification("Draft campaign created successfully on Facebook.", "success");
            onSuccess();
        } catch (error) {
            addNotification(`Failed to create campaign: ${(error as Error).message}`, "error");
        }
        setIsLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Draft Campaign">
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-text-secondary">
                    This will create a new, paused (draft) campaign in your selected ad account.
                </p>
                <Input
                    label="Campaign Name*"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                />
                <Select
                    label="Campaign Objective*"
                    value={objective}
                    onChange={e => setObjective(e.target.value)}
                    options={campaignObjectives}
                    required
                />
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isLoading}>
                        Create Draft Campaign
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateCampaignModal;
