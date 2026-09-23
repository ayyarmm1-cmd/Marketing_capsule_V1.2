import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { useNotification } from '../../hooks/useNotification';

export interface SmsRecipient {
    phone_number: string;
    [key: string]: string; // Allows for arbitrary columns like 'name', 'invoice_no'
}

interface SmsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (recipients: SmsRecipient[]) => void;
}

const SmsImportModal: React.FC<SmsImportModalProps> = ({ isOpen, onClose, onImport }) => {
    const { addNotification } = useNotification();
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const handleDownloadTemplate = () => {
        // FIX: Explicitly type the data array to avoid potential type inference errors.
        const data: SmsRecipient[] = [
            { phone_number: '959123456789', name: 'John Doe', invoice_no: 'INV-001', due_date: '2024-08-15' },
            { phone_number: '959987654321', name: 'Jane Smith', invoice_no: 'INV-002', due_date: '2024-08-20' },
        ];
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Recipients");
        XLSX.writeFile(wb, "sms_recipient_template.xlsx");
    };

    const handleProcessFile = async () => {
        if (!file) {
            setError("Please select a file.");
            return;
        }
        setIsProcessing(true);
        setError(null);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

            if (jsonData.length === 0) {
                throw new Error("The Excel file is empty.");
            }

            const firstRow = jsonData[0];
            if (!('phone_number' in firstRow)) {
                throw new Error("The Excel file must contain a 'phone_number' column.");
            }

            const recipients: SmsRecipient[] = jsonData.map((row, index) => {
                if (!row.phone_number) {
                    throw new Error(`Row ${index + 2} is missing a phone number.`);
                }
                const cleanedRow: SmsRecipient = { phone_number: String(row.phone_number).trim() };
                Object.keys(row).forEach(key => {
                    if (key !== 'phone_number') {
                        cleanedRow[key] = row[key] !== null && row[key] !== undefined ? String(row[key]) : '';
                    }
                });
                return cleanedRow;
            });

            onImport(recipients);
            addNotification(`${recipients.length} recipients imported successfully.`, "success");
            onClose();

        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import SMS Recipients from Excel">
            <div className="space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <h3 className="text-sm font-medium text-text-secondary">Instructions:</h3>
                        <Button type="button" variant="ghost" size="sm" onClick={handleDownloadTemplate}>Download Template</Button>
                    </div>
                    <ul className="list-disc list-inside text-xs text-text-secondary space-y-1 bg-gray-50 p-3 rounded-md">
                        <li>Your Excel file must have a column named `phone_number`.</li>
                        <li>You can include other columns like `name`, `invoice_no`, etc.</li>
                        {/* FIX: Correctly render curly braces in JSX by wrapping them in a string literal. */}
                        <li>The column names will be used for placeholders in your message (e.g., {'{{name}}'}).</li>
                    </ul>
                </div>

                <Input type="file" label="Select Excel File" onChange={handleFileChange} accept=".xlsx, .xls" containerClassName="mb-0" />
                {file && <p className="text-xs text-text-secondary">Selected file: {file.name}</p>}
                
                {error && <p className="text-sm text-status-danger">{error}</p>}
                
                {isProcessing && (
                    <div className="flex flex-col items-center p-4"><Spinner /><p className="mt-2 text-sm">Processing...</p></div>
                )}

                <div className="pt-4 flex justify-end gap-2 border-t">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isProcessing}>Cancel</Button>
                    <Button type="button" onClick={handleProcessFile} isLoading={isProcessing} disabled={!file}>Import Recipients</Button>
                </div>
            </div>
        </Modal>
    );
};

export default SmsImportModal;