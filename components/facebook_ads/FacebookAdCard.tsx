import React from 'react';
import { Link } from 'react-router-dom';
import { FacebookCampaign } from '../../types';
import { STATUS_COLORS } from '../../constants';
import { FacebookCampaignStatus } from '../../types';

interface FacebookAdCardProps {
    campaign: FacebookCampaign;
    onDragStart?: (event: React.DragEvent<HTMLDivElement>, campaignId: string) => void;
}

const mapApiStatusToDisplayStatus = (apiStatus: FacebookCampaign['status']): FacebookCampaignStatus => {
    switch (apiStatus) {
        case 'ACTIVE':
            return FacebookCampaignStatus.ACTIVE;
        case 'PAUSED':
            return FacebookCampaignStatus.OFF;
        case 'ARCHIVED':
            return FacebookCampaignStatus.COMPLETED;
        case 'DELETED':
            return FacebookCampaignStatus.DELETED;
        default:
            return FacebookCampaignStatus.NOT_DELIVERING;
    }
}

const FacebookAdCard: React.FC<FacebookAdCardProps> = ({ campaign, onDragStart }) => {

    const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
        if (onDragStart) {
            event.dataTransfer.setData("campaignId", campaign.id);
            onDragStart(event, campaign.id);
        }
    };
    
    const displayStatus = mapApiStatusToDisplayStatus(campaign.status);
    const budget = campaign.daily_budget ? `${Number(campaign.daily_budget) / 100} / day` : campaign.lifetime_budget ? `${Number(campaign.lifetime_budget) / 100} lifetime` : 'N/A';

    return (
        <div
            className="bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-grab active:cursor-grabbing group border border-slate-200 dark:border-slate-700 flex flex-col"
            draggable={!!onDragStart}
            onDragStart={handleDragStart}
        >
            <div className="p-4 flex-grow">
                <div className="flex justify-between items-start">
                    <span className={`px-2 py-0.5 text-[0.7rem] font-semibold rounded-full ${STATUS_COLORS[displayStatus] || 'bg-gray-200 text-gray-700'}`}>
                        {displayStatus}
                    </span>
                    <span className="text-xs text-text-secondary dark:text-slate-400 font-mono">
                        {campaign.id}
                    </span>
                </div>
                <h3 className="font-semibold text-md text-gray-800 dark:text-slate-200 mt-2 truncate" title={campaign.name}>
                    {campaign.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1 truncate" title={campaign.objective}>
                    Objective: {campaign.objective}
                </p>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-lg space-y-2 text-xs">
                <div className="flex justify-between">
                    <span className="text-text-secondary dark:text-slate-400">Budget:</span>
                    <span className="font-medium text-text-primary dark:text-slate-200">{budget}</span>
                </div>
            </div>
        </div>
    );
};

export default FacebookAdCard;
