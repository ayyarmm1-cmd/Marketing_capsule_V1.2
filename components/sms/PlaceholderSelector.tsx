import React, { useState } from 'react';
import Button from '../ui/Button';

interface PlaceholderSelectorProps {
    onInsert: (placeholder: string) => void;
}

interface PlaceholderGroup {
    category: string;
    placeholders: Array<{ key: string; label: string; description?: string }>;
}

const PLACEHOLDER_GROUPS: PlaceholderGroup[] = [
    {
        category: 'Personal Information',
        placeholders: [
            { key: 'name', label: 'Name', description: 'Full name' },
            { key: 'full_name', label: 'Full Name', description: 'Complete name' },
            { key: 'first_name', label: 'First Name', description: 'Given name' },
            { key: 'last_name', label: 'Last Name', description: 'Family name' },
            { key: 'phone_number', label: 'Phone Number', description: 'Contact number' },
            { key: 'email', label: 'Email', description: 'Email address' },
        ]
    },
    {
        category: 'Financial',
        placeholders: [
            { key: 'invoice_no', label: 'Invoice No', description: 'Invoice number' },
            { key: 'invoice_number', label: 'Invoice Number', description: 'Invoice ID' },
            { key: 'amount', label: 'Amount', description: 'Payment amount' },
            { key: 'total_amount', label: 'Total Amount', description: 'Total payment' },
            { key: 'due_amount', label: 'Due Amount', description: 'Outstanding balance' },
            { key: 'paid_amount', label: 'Paid Amount', description: 'Amount paid' },
            { key: 'payment_date', label: 'Payment Date', description: 'Date of payment' },
            { key: 'due_date', label: 'Due Date', description: 'Payment deadline' },
        ]
    },
    {
        category: 'Business & Sales',
        placeholders: [
            { key: 'client_name', label: 'Client Name', description: 'Client/company name' },
            { key: 'business_name', label: 'Business Name', description: 'Business identifier' },
            { key: 'quotation_no', label: 'Quotation No', description: 'Quotation number' },
            { key: 'quotation_number', label: 'Quotation Number', description: 'Quote ID' },
            { key: 'project_name', label: 'Project Name', description: 'Project identifier' },
            { key: 'service_name', label: 'Service Name', description: 'Service type' },
        ]
    },
    {
        category: 'Dates & Time',
        placeholders: [
            { key: 'date', label: 'Date', description: 'Current date' },
            { key: 'today', label: 'Today', description: 'Today\'s date' },
            { key: 'appointment_date', label: 'Appointment Date', description: 'Scheduled date' },
            { key: 'meeting_date', label: 'Meeting Date', description: 'Meeting date' },
            { key: 'deadline', label: 'Deadline', description: 'Due date' },
        ]
    },
    {
        category: 'Other',
        placeholders: [
            { key: 'message', label: 'Message', description: 'Custom message' },
            { key: 'note', label: 'Note', description: 'Additional note' },
            { key: 'reference', label: 'Reference', description: 'Reference number' },
            { key: 'code', label: 'Code', description: 'Verification/promo code' },
            { key: 'link', label: 'Link', description: 'URL link' },
            { key: 'address', label: 'Address', description: 'Physical address' },
        ]
    }
];

const PlaceholderSelector: React.FC<PlaceholderSelectorProps> = ({ onInsert }) => {
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleInsert = (key: string) => {
        onInsert(`{{${key}}}`);
    };

    const filteredGroups = PLACEHOLDER_GROUPS.map(group => ({
        ...group,
        placeholders: group.placeholders.filter(p => 
            p.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })).filter(group => group.placeholders.length > 0);

    return (
        <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg text-text-primary dark:text-slate-200">Insert Placeholder</h3>
                <button
                    onClick={() => setExpandedCategory(null)}
                    className="text-xs text-text-secondary hover:text-text-primary dark:text-slate-400 dark:hover:text-slate-200"
                >
                    Collapse All
                </button>
            </div>
            
            <div className="mb-3">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search placeholders..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-text-primary dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-action"
                />
            </div>

            <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-2">
                {filteredGroups.map((group) => (
                    <div key={group.category} className="border-b dark:border-slate-700 pb-2 last:border-b-0">
                        <button
                            onClick={() => setExpandedCategory(expandedCategory === group.category ? null : group.category)}
                            className="w-full flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-md transition-colors"
                        >
                            <span className="font-medium text-sm text-text-primary dark:text-slate-200">{group.category}</span>
                            <svg
                                className={`w-4 h-4 text-text-secondary dark:text-slate-400 transition-transform ${
                                    expandedCategory === group.category ? 'rotate-180' : ''
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        
                        {expandedCategory === group.category && (
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                                {group.placeholders.map((placeholder) => (
                                    <button
                                        key={placeholder.key}
                                        onClick={() => handleInsert(placeholder.key)}
                                        className="text-left p-2 text-sm bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600 transition-colors group"
                                        title={placeholder.description || placeholder.label}
                                    >
                                        <div className="font-medium text-text-primary dark:text-slate-200 group-hover:text-primary-action">
                                            {placeholder.label}
                                        </div>
                                        <div className="text-xs text-text-secondary dark:text-slate-400 font-mono mt-1">
                                            {'{{' + placeholder.key + '}}'}
                                        </div>
                                        {placeholder.description && (
                                            <div className="text-xs text-text-secondary dark:text-slate-500 mt-1">
                                                {placeholder.description}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {searchTerm && filteredGroups.length === 0 && (
                <div className="text-center py-4 text-text-secondary dark:text-slate-400 text-sm">
                    No placeholders found matching "{searchTerm}"
                </div>
            )}
        </div>
    );
};

export default PlaceholderSelector;

