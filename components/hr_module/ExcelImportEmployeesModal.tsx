import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { ParsedEmployeeExcelRow, EmployeeImportResult, UserRole, EmployeeStatus } from '../../types';
import { apiProcessEmployeeImport } from '../../services/api'; 
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { useNotification } from '../../hooks/useNotification';

interface ExcelImportEmployeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const ExcelImportEmployeesModal: React.FC<ExcelImportEmployeesModalProps> = ({ isOpen, onClose, onImportComplete }) => {
  const { addNotification } = useNotification();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<EmployeeImportResult | null>(null);

  const decoratedHeaders = [
    'Employee ID (Optional)', 'Full Name*', 'Login Email*', 'Role*', 'Department Name*', 'Job Title*', 
    'Joining Date (YYYY-MM-DD)*', 'Status*', 'Basic Pay (MMK)*', 'Payment Type*', 
    'Has Login Access (TRUE/FALSE)*', 'Initial Password (if login is TRUE)',
    'Phone', 'Date of Birth (YYYY-MM-DD)', 'Gender', 'Marital Status', 'Nationality', 'Address', 'NRC Number',
    'Annual Leave Days', 'Casual Leave Days', 'Transport Allowance',
    'Emergency Contact Name', 'Emergency Contact Phone', 'Bank Account Number', 'Bank Name'
  ];
  const requiredHeaders = ['Full Name', 'Login Email', 'Role', 'Department Name', 'Job Title', 'Joining Date', 'Status', 'Basic Pay', 'Payment Type', 'Has Login Access'];


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
            'Employee ID (Optional)': 'E_01',
            'Full Name*': 'John Doe',
            'Login Email*': 'john.d@example.com',
            'Role*': 'Staff',
            'Department Name*': 'Digital Marketing',
            'Job Title*': 'SEO Specialist',
            'Joining Date (YYYY-MM-DD)*': '2023-05-15',
            'Status*': 'Active',
            'Basic Pay (MMK)*': 500000,
            'Payment Type*': 'Monthly',
            'Has Login Access (TRUE/FALSE)*': 'TRUE',
            'Initial Password (if login is TRUE)': 'Password123!',
            'Phone': '09123456789',
            'Date of Birth (YYYY-MM-DD)': '1995-02-20',
            'Gender': 'Male',
            'Marital Status': 'Single',
            'Nationality': 'Myanmar',
            'Address': '123 Tech St, Yangon',
            'NRC Number': '12/ABC(N)123456',
            'Annual Leave Days': 10,
            'Casual Leave Days': 6,
            'Transport Allowance': 50000,
            'Emergency Contact Name': 'Jane Doe',
            'Emergency Contact Phone': '09987654321',
            'Bank Account Number': '1234567890123456',
            'Bank Name': 'KBZ Bank'
        },
    ], { header: decoratedHeaders });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "employee_import_template.xlsx");
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
        const workbook = XLSX.read(fileData, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: null }) as any[][];
        
        if (jsonData.length < 2) {
            throw new Error("Excel file must contain a header row and at least one data row.");
        }

        const headers = (jsonData[0] as any[]).map(String);
        const cleanHeader = (h: string) => h.replace(/\*|\s\(.*\)/g, '').trim();
        const cleanActualHeaders = headers.map(cleanHeader);

        const missingRequired = requiredHeaders.filter(rh => !cleanActualHeaders.includes(rh));
        if (missingRequired.length > 0) {
            throw new Error(`Missing required headers: ${missingRequired.join(', ')}.`);
        }
        
        const keyMap: { [key: string]: keyof ParsedEmployeeExcelRow } = {
            'Employee ID': 'employeeId', 'Full Name': 'name', 'Login Email': 'email', 'Role': 'role',
            'Department Name': 'departmentName', 'Job Title': 'jobTitle', 'Joining Date': 'joiningDate',
            'Status': 'employeeStatus', 'Basic Pay': 'basicPay', 'Payment Type': 'paymentType',
            'Has Login Access': 'hasLoginAccess', 'Initial Password': 'initialPassword', 'Phone': 'personalPhone',
            'Date of Birth': 'dateOfBirth', 'Gender': 'gender', 'Marital Status': 'maritalStatus', 'Nationality': 'nationality',
            'Address': 'address', 'NRC Number': 'nrcNumber', 'Annual Leave Days': 'annualLeaveEntitlement',
            'Casual Leave Days': 'casualLeaveEntitlement', 'Transport Allowance': 'transportationAllowance',
            'Emergency Contact Name': 'emergencyContactName', 'Emergency Contact Phone': 'emergencyContactPhone',
            'Bank Account Number': 'bankAccountNumber', 'Bank Name': 'bankName'
        };

        const parsedData: ParsedEmployeeExcelRow[] = jsonData.slice(1).map((rowArray, index) => {
            const rowData: Partial<ParsedEmployeeExcelRow> & { rowIndex: number } = { rowIndex: index + 2 };
            headers.forEach((header, i) => {
                const mappedKey = keyMap[cleanHeader(header)];
                if (mappedKey) {
                    let cellValue = rowArray[i];
                    
                    if (cellValue instanceof Date) {
                        const year = cellValue.getFullYear();
                        const month = String(cellValue.getMonth() + 1).padStart(2, '0');
                        const day = String(cellValue.getDate()).padStart(2, '0');
                        (rowData as any)[mappedKey] = `${year}-${month}-${day}`;
                    } else if (mappedKey === 'hasLoginAccess') {
                        (rowData as any)[mappedKey] = String(cellValue).trim().toUpperCase() === 'TRUE';
                    } else if (typeof cellValue === 'number' && ['basicPay', 'annualLeaveEntitlement', 'casualLeaveEntitlement', 'transportationAllowance'].includes(mappedKey)) {
                         (rowData as any)[mappedKey] = cellValue;
                    } else {
                        (rowData as any)[mappedKey] = cellValue !== undefined && cellValue !== null ? String(cellValue).trim() : undefined;
                    }
                }
            });
            return rowData as ParsedEmployeeExcelRow;
        }).filter(row => row.name);

        if (parsedData.length === 0) throw new Error("No valid data rows found (missing Full Name).");
        
        const results = await apiProcessEmployeeImport(parsedData);
        setImportResults(results);

        const successes = results.employeesAdded + results.employeesUpdated;
        if (successes > 0) {
            let message = `Import complete. ${results.employeesAdded} added, ${results.employeesUpdated} updated.`;
            if (results.warnings && results.warnings.length > 0) {
                message += ` Check summary for ${results.warnings.length} warning(s).`
            }
            if (results.errors.length > 0) {
                message += ` ${results.errors.length} row(s) failed.`
            }
            addNotification(message, results.errors.length > 0 ? "warning" : "success", "Import Finished", 8000);
            onImportComplete();
        } else if (results.errors.length > 0) {
             setError(`Import failed. ${results.errors.length} error(s) occurred. Please check the details below and correct your file.`);
        } else {
             addNotification("No new data to import or update was found in the file.", "info");
        }
    } catch (err) {
      setError(`An error occurred: ${(err as Error).message}`);
    } finally {
        setIsProcessing(false);
    }
  };
  
  const getResultContainerClass = () => {
    if (!importResults) return '';
    if (importResults.errors.length > 0) return 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700';
    if (importResults.warnings && importResults.warnings.length > 0) return 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700';
    return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Employees from Excel" size="xl">
        <div className="space-y-4">
            <div>
            <div className="flex justify-between items-center mb-1">
                <h3 className="text-sm font-medium text-text-secondary">Instructions:</h3>
                <Button type="button" variant="ghost" size="sm" onClick={handleDownloadTemplate}>Download Template</Button>
            </div>
            <ul className="list-disc list-inside text-xs text-text-secondary space-y-1 bg-gray-50 p-3 rounded-md">
                <li>Provide an 'Employee ID' (e.g., E_01) or 'Login Email' to update an existing employee. If neither is found, a new employee is created.</li>
                <li>If 'Employee ID' is blank on a new record, a new ID will be generated.</li>
                <li>Fields marked with * in the template are required for new employees.</li>
                <li>'Has Login Access' must be TRUE or FALSE. If TRUE and 'Initial Password' is blank, a default password will be set.</li>
                <li>For 'Role', use one of: {Object.values(UserRole).join(', ')}.</li>
                <li>For 'Status', use one of: {Object.values(EmployeeStatus).join(', ')}.</li>
            </ul>
            </div>
            <Input type="file" label="Select Excel File" onChange={handleFileChange} accept=".xlsx, .xls" containerClassName="mb-0"/>
            
            {file && <p className="text-xs text-text-secondary">Selected file: {file.name}</p>}
            {error && <p className="text-sm text-status-danger text-center p-2 bg-red-50 rounded">{error}</p>}
            {isProcessing && (
            <div className="flex flex-col items-center justify-center p-4"><Spinner /><p className="mt-2 text-sm text-text-secondary">Processing file...</p></div>
            )}

            {importResults && (
            <div className={`mt-4 p-3 border rounded-md ${getResultContainerClass()}`}>
                <h4 className="font-semibold text-md mb-2">Import Summary:</h4>
                <ul className="list-disc list-inside text-sm space-y-0.5">
                <li>Employees Successfully Added: {importResults.employeesAdded}</li>
                <li>Employees Successfully Updated: {importResults.employeesUpdated}</li>
                {importResults.warnings && importResults.warnings.length > 0 && (
                    <li className="text-yellow-700 dark:text-yellow-400">Warnings: {importResults.warnings.length} (see details)</li>
                )}
                {importResults.errors.length > 0 && <li className="text-red-700">Errors: {importResults.errors.length} (see details)</li>}
                </ul>
                {importResults.warnings && importResults.warnings.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto border-t border-yellow-200 dark:border-yellow-700 pt-2">
                        <p className="font-semibold text-xs text-yellow-700 dark:text-yellow-400">Warnings:</p>
                        {importResults.warnings.map((warn, i) => <p key={`warn-${i}`} className="text-xs text-yellow-600 dark:text-yellow-500">Row {warn.row}: {warn.message}</p>)}
                    </div>
                )}
                {importResults.errors.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto border-t border-red-200 pt-2">
                    <p className="font-semibold text-xs text-red-700">Error Details:</p>
                    {importResults.errors.map((err, i) => <p key={i} className="text-xs text-red-600">Row {err.row}: {err.message}</p>)}
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

export default ExcelImportEmployeesModal;