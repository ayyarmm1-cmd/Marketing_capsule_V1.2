import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { apiProcessOpeningBalanceImport, type OpeningBalanceImportProgress } from '../../services/api';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { useNotification } from '../../hooks/useNotification';

interface OpeningBalanceImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface OpeningBalanceRow {
  rowIndex: number;
  businessName: string;
  openingBalance: string;
  businessId?: string;
  clientId?: string;
}

interface OpeningBalanceImportResult {
  businessesUpdated: number;
  clientsUpdated: number;
  pairsUpdated?: number;
  skipped?: number;
  errors: { row: number; message: string }[];
}

const OpeningBalanceImportModal: React.FC<OpeningBalanceImportModalProps> = ({ isOpen, onClose, onImportComplete }) => {
  const { addNotification } = useNotification();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<OpeningBalanceImportResult | null>(null);
  const [importProgress, setImportProgress] = useState<OpeningBalanceImportProgress | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || selectedFile.type === 'application/vnd.ms-excel') {
        setFile(selectedFile);
        setError(null);
        setImportResults(null);
      } else {
        setError("Invalid file type. Please upload an .xlsx or .xls file.");
        setFile(null);
      }
    }
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        "Business ID": "B-0001",
        "Business Name": "John's Tech",
        "Client ID": "CL-0001",
        "Opening Balance": "50000"
      },
      {
        "Business ID": "B-0002",
        "Business Name": "Smith's Cafe",
        "Client ID": "CL-0002",
        "Opening Balance": "25000"
      },
      {
        "Business ID": "B-0003",
        "Business Name": "Stand-alone Corp",
        "Client ID": "",
        "Opening Balance": "100000"
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "opening_balance_import_template.xlsx");
  };

  const handleProcessFile = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }
    setIsProcessing(true);
    setError(null);
    setImportResults(null);

    try {
      const fileData = await file.arrayBuffer();
      const workbook = XLSX.read(fileData, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false }) as any[][];
      
      if (jsonData.length < 2) {
        throw new Error("Excel file must contain a header row and at least one data row.");
      }

      const headers = (jsonData[0] as any[]).map(String).map(h => h.trim());
      
      // Find column indices (IDs are optional but recommended)
      const businessNameIndex = headers.findIndex(h => 
        h.toLowerCase().includes('business') && h.toLowerCase().includes('name')
      );
      const businessIdIndex = headers.findIndex(h =>
        h.toLowerCase().includes('business') && h.toLowerCase().includes('id')
      );
      const clientIdIndex = headers.findIndex(h =>
        h.toLowerCase().includes('client') && h.toLowerCase().includes('id')
      );
      const openingBalanceIndex = headers.findIndex(h => 
        h.toLowerCase().includes('opening') && h.toLowerCase().includes('balance')
      );

      if (openingBalanceIndex === -1) {
        throw new Error("Could not find 'Opening Balance' column in the Excel file.");
      }
      if (businessNameIndex === -1 && businessIdIndex === -1) {
        throw new Error("Could not find either 'Business ID' or 'Business Name' column in the Excel file.");
      }

      const parsedData: OpeningBalanceRow[] = jsonData.slice(1).map((row, index) => {
        const businessName = businessNameIndex !== -1 && row[businessNameIndex] !== undefined && row[businessNameIndex] !== null 
          ? String(row[businessNameIndex]).trim() 
          : '';
        const businessId = businessIdIndex !== -1 && row[businessIdIndex] !== undefined && row[businessIdIndex] !== null
          ? String(row[businessIdIndex]).trim()
          : '';
        const clientId = clientIdIndex !== -1 && row[clientIdIndex] !== undefined && row[clientIdIndex] !== null
          ? String(row[clientIdIndex]).trim()
          : '';
        const openingBalance = row[openingBalanceIndex] !== undefined && row[openingBalanceIndex] !== null 
          ? String(row[openingBalanceIndex]).trim() 
          : '';
        
        return {
          rowIndex: index + 2,
          businessName,
          openingBalance,
          businessId: businessId || undefined,
          clientId: clientId || undefined,
        };
      }).filter(row => (row.businessId || row.businessName) && row.openingBalance);

      if (parsedData.length === 0) {
        throw new Error("No valid data rows found. Ensure rows have Business ID or Business Name and Opening Balance.");
      }

      setImportProgress({ current: 0, total: parsedData.length, label: 'Starting...', remaining: parsedData.length });
      const results = await apiProcessOpeningBalanceImport(parsedData, (p) => setImportProgress(p));
      setImportProgress(null);
      setImportResults(results);

      const successes = results.businessesUpdated + (results.pairsUpdated ?? 0);
      const skipped = results.skipped ?? 0;
      if (successes > 0) {
        const msg = skipped > 0
          ? `Opening balance import complete. ${successes} updated, ${skipped} skipped (no match).`
          : `Opening balance import complete. ${successes} total updates successful.`;
        addNotification(msg, 'success');
        onImportComplete();
      } else if (skipped > 0 && results.errors.length === 0) {
        addNotification(`All ${skipped} row(s) could not be matched. Check Business ID/Name and Client ID.`, "info");
      } else if (results.errors.length > 0) {
        setError(`Import failed for all ${results.errors.length} rows. Please check the errors below.`);
      } else {
        addNotification("No matching businesses found in the file.", "info");
      }
      
    } catch (err) {
      setError(`An unexpected error occurred: ${(err as Error).message}`);
    } finally {
      setIsProcessing(false);
      setImportProgress(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Opening Balances from Excel" size="lg">
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm font-medium text-text-secondary">Instructions:</h3>
            <Button type="button" variant="ghost" size="sm" onClick={handleDownloadTemplate}>Download Template</Button>
          </div>
          <ul className="list-disc list-inside text-xs text-text-secondary space-y-1 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-md">
            <li>This import is for setting opening balances only. Clients and businesses must already exist in the system.</li>
            <li>The Excel file should contain <strong>Business ID</strong>, <strong>Business Name</strong>, optional <strong>Client ID</strong>, and <strong>Opening Balance</strong> columns.</li>
            <li>When <strong>Business ID</strong> is provided, it will be used to match the business. Otherwise, <strong>Business Name</strong> will be used.</li>
            <li>When <strong>Client ID</strong> is provided, opening balance will be applied to that specific client-business pair; if omitted, it will be applied to the business and all its linked clients.</li>
            <li>Rows matching <strong>Business ID + Client ID</strong> that already exist will be <strong>updated</strong> with the new opening balance from the file.</li>
            <li>Opening Balance should be a number (e.g., 50000 or 50000.50).</li>
          </ul>
        </div>

        <Input type="file" label="Select Excel File" onChange={handleFileChange} accept=".xlsx, .xls" containerClassName="mb-0"/>
        {file && <p className="text-xs text-text-secondary">Selected file: {file.name}</p>}
        {error && <p className="text-sm text-status-danger text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">{error}</p>}
        {isProcessing && (
          <div className="space-y-3 p-4">
            <div className="flex flex-col items-center justify-center">
              <Spinner />
              <p className="mt-2 text-sm text-text-secondary dark:text-slate-400">{importProgress?.label ?? 'Processing...'}</p>
            </div>
            {importProgress && importProgress.total > 0 && (
              <>
                <div className="flex justify-between text-xs text-text-secondary dark:text-slate-400">
                  <span>Row {importProgress.current} / {importProgress.total}</span>
                  <span>Remaining: {importProgress.remaining}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {importResults && (
          <div className="mt-4 p-3 border rounded-md bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
            <h4 className="font-semibold text-md mb-2">Import Summary:</h4>
            <ul className="list-disc list-inside text-sm space-y-0.5">
              <li>Businesses Updated: {importResults.businessesUpdated}</li>
              <li>Clients Updated: {importResults.clientsUpdated}</li>
              <li>Client-Business Pairs Updated: {importResults.pairsUpdated ?? 0}</li>
              {(importResults.skipped ?? 0) > 0 && (
                <li>Skipped (no match): {importResults.skipped}</li>
              )}
              {importResults.errors.length > 0 && (
                <li className="text-red-700 dark:text-red-300">Errors: {importResults.errors.length} (see details below)</li>
              )}
            </ul>
            {importResults.errors.length > 0 && (
              <div className="mt-2 max-h-32 overflow-y-auto border-t border-red-200 dark:border-red-800 pt-2">
                <p className="font-semibold text-xs text-red-700 dark:text-red-300">Error Details:</p>
                {importResults.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-600 dark:text-red-400">Row {err.row}: {err.message}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="pt-4 flex justify-end space-x-3 border-t">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isProcessing}>Close</Button>
          <Button type="button" onClick={handleProcessFile} variant="primary" isLoading={isProcessing} disabled={!file || isProcessing}>Process File</Button>
        </div>
      </div>
    </Modal>
  );
};

export default OpeningBalanceImportModal;














