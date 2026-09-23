import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { ParsedPOSProductExcelRow, POSProductImportResult } from '../../types';
import { apiProcessPOSProductImport } from '../../services/api';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { useNotification } from '../../hooks/useNotification';

interface InventoryExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const InventoryExcelImportModal: React.FC<InventoryExcelImportModalProps> = ({ isOpen, onClose, onImportComplete }) => {
  const { addNotification } = useNotification();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<POSProductImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const fileName = selectedFile.name.toLowerCase();
      const fileExtension = fileName.split('.').pop();
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/vnd.ms-excel.sheet.macroEnabled.12',
        'application/octet-stream'
      ];
      
      if (validTypes.includes(selectedFile.type) || fileExtension === 'xlsx' || fileExtension === 'xls') {
        setFile(selectedFile);
        setError(null);
        setImportResults(null);
      } else {
        setError(`Invalid file type. Please upload an .xlsx or .xls file.`);
        setFile(null);
      }
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'Product Name*',
      'SKU (Optional)',
      'Price MMK*',
      'Cost MMK (Optional)',
      'Stock Quantity*',
      'Min Stock Quantity (Optional)',
      'Category (Optional)',
      'Colour of Frame*',
      'Colour of Glass*',
      'Description (Optional)'
    ];
    
    const ws = XLSX.utils.json_to_sheet([
      {
        "Product Name*": "Sunglasses",
        "SKU (Optional)": "SUN-001",
        "Price MMK*": "5000",
        "Cost MMK (Optional)": "3000",
        "Stock Quantity*": "10",
        "Min Stock Quantity (Optional)": "5",
        "Category (Optional)": "Eyewear",
        "Colour of Frame*": "Black",
        "Colour of Glass*": "Clear",
        "Description (Optional)": "Classic black frame with clear glass"
      },
      {
        "Product Name*": "Sunglasses",
        "SKU (Optional)": "SUN-002",
        "Price MMK*": "5000",
        "Cost MMK (Optional)": "3000",
        "Stock Quantity*": "15",
        "Min Stock Quantity (Optional)": "5",
        "Category (Optional)": "Eyewear",
        "Colour of Frame*": "Black",
        "Colour of Glass*": "Blue",
        "Description (Optional)": "Classic black frame with blue glass"
      },
      {
        "Product Name*": "Sunglasses",
        "SKU (Optional)": "SUN-003",
        "Price MMK*": "5500",
        "Cost MMK (Optional)": "3200",
        "Stock Quantity*": "8",
        "Min Stock Quantity (Optional)": "5",
        "Category (Optional)": "Eyewear",
        "Colour of Frame*": "Brown",
        "Colour of Glass*": "Green",
        "Description (Optional)": "Brown frame with green glass"
      }
    ], { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "pos_inventory_import_template.xlsx");
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
      
      const headerIndexMap = new Map<string, number>();
      headers.forEach((header, index) => {
        const cleanH = cleanHeader(header);
        headerIndexMap.set(cleanH, index);
        headerIndexMap.set(header.trim(), index);
      });

      // Check for required headers
      const requiredHeaders = ['Product Name', 'Price MMK', 'Stock Quantity', 'Colour of Frame', 'Colour of Glass'];
      const missingRequired = requiredHeaders.filter(rh => {
        const found = Array.from(headerIndexMap.keys()).some(key => 
          cleanHeader(key).toLowerCase() === rh.toLowerCase()
        );
        return !found;
      });
      
      if (missingRequired.length > 0) {
        throw new Error(`Missing required columns: ${missingRequired.join(', ')}. Found columns: ${headers.join(', ')}`);
      }
      
      const cleanKeyMap: { [key: string]: keyof ParsedPOSProductExcelRow } = {
        'Product Name': 'productName',
        'SKU': 'sku',
        'Price MMK': 'priceMMK',
        'Cost MMK': 'costMMK',
        'Stock Quantity': 'stockQuantity',
        'Min Stock Quantity': 'minStockQuantity',
        'Category': 'category',
        'Colour of Frame': 'colourOfFrame',
        'Colour of Glass': 'colourOfGlass',
        'Description': 'description'
      };

      const parsedData: ParsedPOSProductExcelRow[] = jsonData.slice(1).map((row, index) => {
        const rowData: any = {};
        
        Object.entries(cleanKeyMap).forEach(([cleanHeaderName, mappedKey]) => {
          let columnIndex = headerIndexMap.get(cleanHeaderName);
          
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
            if (value !== undefined && value !== null && value !== '') {
              const stringValue = String(value).trim();
              if (stringValue !== '') {
                rowData[mappedKey] = stringValue;
              }
            }
          }
        });
        
        rowData.rowIndex = index + 2;
        return rowData as ParsedPOSProductExcelRow;
      }).filter(row => row.productName && row.productName.trim() !== '' && row.colourOfFrame && row.colourOfGlass);

      if (parsedData.length === 0) {
        throw new Error("No valid data rows found. Ensure rows have Product Name, Colour of Frame, and Colour of Glass.");
      }
      
      const results = await apiProcessPOSProductImport(parsedData);
      setImportResults(results);

      const successes = results.productsAdded + results.productsUpdated + results.variantsAdded;
      if (successes > 0) {
        addNotification(`Import complete. ${successes} total operations successful.`, 'success');
        onImportComplete();
      } else if (results.errors.length > 0) {
        setError(`Import failed for all ${results.errors.length} rows. Please check the errors below.`);
      } else {
        addNotification("No new data to import was found in the file.", "info");
      }
      
    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error('Excel import error:', err);
      setError(`Error: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Products from Excel" size="lg">
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm font-medium text-text-secondary">Instructions:</h3>
            <Button type="button" variant="ghost" size="sm" onClick={handleDownloadTemplate}>Download Template</Button>
          </div>
          <ul className="list-disc list-inside text-xs text-text-secondary space-y-1 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-md">
            <li><strong>Required columns:</strong> Product Name*, Price MMK*, Stock Quantity*, Colour of Frame*, Colour of Glass*</li>
            <li><strong>Optional columns:</strong> SKU, Cost MMK, Min Stock Quantity, Category, Description</li>
            <li><strong>Variants:</strong> Each row with the same Product Name but different Frame/Glass colours will create variants of the same product.</li>
            <li><strong>Column Order:</strong> Columns can be in any order - the system matches by header name.</li>
            <li>If a product with the same name already exists, new variants will be added to it.</li>
            <li>If a variant with the same Frame/Glass combination exists, the stock quantity will be updated.</li>
          </ul>
        </div>

        <Input type="file" label="Select Excel File" onChange={handleFileChange} accept=".xlsx, .xls" containerClassName="mb-0"/>
        {file && <p className="text-xs text-text-secondary">Selected file: {file.name}</p>}
        {error && <p className="text-sm text-status-danger text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">{error}</p>}
        {isProcessing && (
          <div className="flex flex-col items-center justify-center p-4">
            <Spinner />
            <p className="mt-2 text-sm text-text-secondary">Processing file, please wait...</p>
          </div>
        )}

        {importResults && (
          <div className="mt-4 p-3 border rounded-md bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
            <h4 className="font-semibold text-md mb-2">Import Summary:</h4>
            <ul className="list-disc list-inside text-sm space-y-0.5">
              <li>Products Added: {importResults.productsAdded}</li>
              <li>Products Updated: {importResults.productsUpdated}</li>
              <li>Variants Added: {importResults.variantsAdded}</li>
              {importResults.errors.length > 0 && (
                <li className="text-red-700 dark:text-red-400">Errors: {importResults.errors.length} (see details below)</li>
              )}
            </ul>
            {importResults.errors.length > 0 && (
              <div className="mt-2 max-h-32 overflow-y-auto border-t border-red-200 dark:border-red-800 pt-2">
                <p className="font-semibold text-xs text-red-700 dark:text-red-400">Error Details:</p>
                {importResults.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-600 dark:text-red-500">Row {err.row}: {err.message}</p>
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

export default InventoryExcelImportModal;







