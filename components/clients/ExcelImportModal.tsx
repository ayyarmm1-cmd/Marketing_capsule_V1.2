import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { ParsedExcelRow, ImportResult } from '../../types';
import { apiProcessClientBusinessImport } from '../../services/api';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { useNotification } from '../../hooks/useNotification';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ isOpen, onClose, onImportComplete }) => {
  const { addNotification } = useNotification();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);

  const decoratedHeaders = [
    'Client ID (Optional)', 'Business ID (Optional)',
    'Client Name (Optional)', 'Client Phone (Optional)', 'Client Email (Optional)', 'Client FB URL (Optional)', 'Client Viber/Telegram (Optional)',
    'Client Address (Optional)', 'Client City (Optional)', 'Client State (Optional)', 'Client Country (Optional)', 'Client Customer Code (Optional)',
    'Client Opening Balance (Optional)', 'Client Custom Facebook Ads Rate MMK (Optional)',
    'Business Name*', 'Business Industry (Optional)', 'Business Phone (Optional)', 'Business Email (Optional)', 'Business Address (Optional)',
    'Business City (Optional)', 'Business State (Optional)', 'Business Country (Optional)', 'Business Customer Code (Optional)', 'Business Facebook Page ID (Optional)',
    'Business Opening Balance (Optional)', 'Business Custom Facebook Ads Rate MMK (Optional)',
    'Business Page URL (Optional)', 'Business Website URL (Optional)'
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const fileName = selectedFile.name.toLowerCase();
      const fileExtension = fileName.split('.').pop();
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/vnd.ms-excel.sheet.macroEnabled.12',
        'application/octet-stream' // Google Sheets exports sometimes use this
      ];
      
      // Check by MIME type or file extension
      if (validTypes.includes(selectedFile.type) || fileExtension === 'xlsx' || fileExtension === 'xls') {
        setFile(selectedFile);
        setError(null);
        setImportResults(null);
      } else {
        setError(`Invalid file type. Please upload an .xlsx or .xls file. Detected type: ${selectedFile.type || 'unknown'}, Extension: ${fileExtension || 'none'}`);
        setFile(null);
      }
    }
  };

  const handleDownloadTemplate = () => {
    // Minimal template with only required and commonly used columns
    const minimalHeaders = [
      'Business Name*',
      'Client Name (Optional)',
      'Client Phone (Optional)',
      'Business Phone (Optional)',
      'Business Industry (Optional)'
    ];
    
    const ws = XLSX.utils.json_to_sheet([
        {
            "Business Name*": "John's Tech",
            "Client Name (Optional)": "John Doe",
            "Client Phone (Optional)": "959123456789",
            "Business Phone (Optional)": "959987654321",
            "Business Industry (Optional)": "IT Services"
        },
        { 
            "Business Name*": "Smith's Cafe",
            "Client Name (Optional)": "Jane Smith",
            "Client Phone (Optional)": "959111222333"
        },
        { 
            "Business Name*": "Stand-alone Corp",
            "Business Phone (Optional)": "959555444333"
        },
        { 
            "Business Name*": "Business Without Client Name"
        }
    ], { header: minimalHeaders });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "client_business_import_template.xlsx");
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
        
        const cleanHeader = (h: string) => h.replace(/\*|\s\(.*\)/g, '').trim();
        
        // Debug: Log headers for troubleshooting
        console.log('Detected headers:', headers);
        
        // Create a map of header names to column indices (flexible - matches by name regardless of position)
        const headerIndexMap = new Map<string, number>();
        headers.forEach((header, index) => {
            const cleanH = cleanHeader(header);
            headerIndexMap.set(cleanH, index);
            // Also store original header for better matching
            headerIndexMap.set(header.trim(), index);
        });

        // Check for required header: Business Name (try multiple variations)
        const requiredHeaderVariations = ['Business Name', 'Business Name*', 'business name', 'business name*'];
        let foundRequiredHeader = false;
        let foundHeaderName = '';
        
        for (const variation of requiredHeaderVariations) {
            if (headerIndexMap.has(variation) || headerIndexMap.has(cleanHeader(variation))) {
                foundRequiredHeader = true;
                foundHeaderName = variation;
                break;
            }
        }
        
        if (!foundRequiredHeader) {
            throw new Error(`Required column "Business Name*" not found. Found columns: ${headers.join(', ')}. Please ensure your Excel file has a "Business Name*" column.`);
        }
        
        const cleanKeyMap: { [key: string]: keyof ParsedExcelRow } = {
            'Client ID': 'clientId', 'Business ID': 'businessId',
            'Client Name': 'clientName', 'Client Phone': 'clientPhone', 'Client Email': 'clientEmail',
            'Client FB URL': 'personalFbLink', 'Client Viber/Telegram': 'viberTelegram',
            'Client Address': 'clientAddress', 'Client City': 'clientCity', 'Client State': 'clientState', 'Client Country': 'clientCountry', 'Client Customer Code': 'clientCustomerCode',
            'Client Opening Balance': 'clientOpeningBalance', 'Client Custom Facebook Ads Rate MMK': 'clientCustomFacebookAdsRateMMK',
            'Business Name': 'businessName', 'Business Industry': 'businessIndustry',
            'Business Phone': 'businessPhone', 'Business Email': 'businessEmail', 'Business Address': 'businessAddress',
            'Business City': 'businessCity', 'Business State': 'businessState', 'Business Country': 'businessCountry', 'Business Customer Code': 'businessCustomerCode', 'Business Facebook Page ID': 'businessFacebookPageId',
            'Business Opening Balance': 'businessOpeningBalance', 'Business Custom Facebook Ads Rate MMK': 'businessCustomFacebookAdsRateMMK',
            'Business Page URL': 'businessPageUrl', 'Business Website URL': 'websiteUrl'
        };

        const parsedData: ParsedExcelRow[] = jsonData.slice(1).map((row, index) => {
            const rowData: any = {};
            
            // Match headers by name (not position) - allows flexible column order and missing optional columns
            Object.entries(cleanKeyMap).forEach(([cleanHeaderName, mappedKey]) => {
                // Try exact match first
                let columnIndex = headerIndexMap.get(cleanHeaderName);
                
                // If not found, try case-insensitive match
                if (columnIndex === undefined) {
                    for (const [header, idx] of headerIndexMap.entries()) {
                        if (cleanHeader(header).toLowerCase() === cleanHeaderName.toLowerCase()) {
                            columnIndex = idx;
                            break;
                        }
                    }
                }
                
                if (columnIndex !== undefined && columnIndex < row.length) {
                    const value = row[columnIndex];
                    // Handle various empty value types
                    if (value !== undefined && value !== null && value !== '') {
                        const stringValue = String(value).trim();
                        if (stringValue !== '') {
                            rowData[mappedKey] = stringValue;
                        }
                    }
                }
            });
            
            // Auto-set client name to "N/A" if empty
            if (rowData.clientName === undefined || rowData.clientName === '' || rowData.clientName === null) {
                rowData.clientName = 'N/A';
            }
            rowData.rowIndex = index + 2;
            return rowData as ParsedExcelRow;
        }).filter(row => row.businessName && row.businessName.trim() !== ''); // Only require business name now

        if (parsedData.length === 0) {
            throw new Error("No valid data rows found. Ensure rows have at least a Business Name.");
        }
        
        const results = await apiProcessClientBusinessImport(parsedData);
        setImportResults(results);

        const successes = results.clientsAdded + results.businessesAdded + results.clientsUpdated + results.businessesUpdated + results.linksCreated;
        if (successes > 0) {
            addNotification(`Import complete. ${successes} total operations successful.`, 'success');
            onImportComplete(); // Refresh parent page only on success
        } else if (results.errors.length > 0) {
             setError(`Import failed for all ${results.errors.length} rows. Please check the errors below.`);
        } else {
             addNotification("No new data to import or update was found in the file.", "info");
        }
        
    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error('Excel import error:', err);
      setError(`Error: ${errorMessage}. Please check that your file is saved as .xlsx format and contains the required "Business Name*" column.`);
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Clients & Businesses from Excel" size="lg">
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm font-medium text-text-secondary">Instructions:</h3>
            <Button type="button" variant="ghost" size="sm" onClick={handleDownloadTemplate}>Download Template</Button>
          </div>
          <ul className="list-disc list-inside text-xs text-text-secondary space-y-1 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-md">
            <li><strong>Required:</strong> <strong>Business Name*</strong> column is mandatory.</li>
            <li><strong>Flexible:</strong> You can delete any optional columns you don't need. Only include columns you want to import.</li>
            <li><strong>Column Order:</strong> Columns can be in any order - the system matches by header name.</li>
            <li>If <strong>Client Name</strong> is empty or missing, it will automatically be set to "N/A".</li>
            <li>All other columns are optional - include only what you need.</li>
            <li>If Client and Business info are in the same row, they will be automatically linked.</li>
            <li>Optional 'Client ID' or 'Business ID' columns can be used to update existing records.</li>
            <li><strong>Client ID format:</strong> Must be in format <strong>CL-0001</strong> (CL- followed by 4 digits).</li>
            <li><strong>Business ID format:</strong> Must be in format <strong>B-0001</strong> (B- followed by 4 digits).</li>
            <li>The system updates the ID counters based on the highest ID found in your file to prevent collisions.</li>
          </ul>
        </div>

        <Input type="file" label="Select Excel File" onChange={handleFileChange} accept=".xlsx, .xls" containerClassName="mb-0"/>
        {file && <p className="text-xs text-text-secondary">Selected file: {file.name}</p>}
        {error && <p className="text-sm text-status-danger text-center p-2 bg-red-50 rounded">{error}</p>}
        {isProcessing && (
          <div className="flex flex-col items-center justify-center p-4">
            <Spinner />
            <p className="mt-2 text-sm text-text-secondary">Processing file, please wait...</p>
          </div>
        )}

        {importResults && (
          <div className="mt-4 p-3 border rounded-md bg-green-50 text-green-700">
            <h4 className="font-semibold text-md mb-2">Import Summary:</h4>
            <ul className="list-disc list-inside text-sm space-y-0.5">
              <li>Clients Added: {importResults.clientsAdded}</li>
              <li>Businesses Added: {importResults.businessesAdded}</li>
              <li>Clients Updated: {importResults.clientsUpdated}</li>
              <li>Businesses Updated: {importResults.businessesUpdated}</li>
              <li>Links Created/Updated: {importResults.linksCreated}</li>
              {importResults.errors.length > 0 && (
                <li className="text-red-700">Errors: {importResults.errors.length} (see details below)</li>
              )}
            </ul>
            {importResults.errors.length > 0 && (
              <div className="mt-2 max-h-32 overflow-y-auto border-t border-red-200 pt-2">
                <p className="font-semibold text-xs text-red-700">Error Details:</p>
                {importResults.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-600">Row {err.row}: {err.message}</p>
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

export default ExcelImportModal;