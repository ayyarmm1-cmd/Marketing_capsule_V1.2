import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Employee } from '../../types';
import { apiProcessAndSaveAttendance } from '../../services/api';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { useNotification } from '../../hooks/useNotification';
import { useAuth } from '../../hooks/useAuth';

// Load PDF.js from CDN (works without npm install, compatible with build)
let pdfjsLib: any = null;
let pdfjsLoading: Promise<any> | null = null;

const loadPdfJs = async (): Promise<any> => {
    if (pdfjsLib) return pdfjsLib;
    
    if (pdfjsLoading) return pdfjsLoading;
    
    pdfjsLoading = new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            reject(new Error('PDF.js can only be loaded in browser'));
            return;
        }

        // Check if already loaded
        if ((window as any).pdfjsLib) {
            pdfjsLib = (window as any).pdfjsLib;
            resolve(pdfjsLib);
            return;
        }

        // Load from CDN
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.js';
        script.onload = () => {
            pdfjsLib = (window as any).pdfjsLib || (window as any).pdfjs;
            if (pdfjsLib) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js';
                resolve(pdfjsLib);
            } else {
                reject(new Error('PDF.js library not found after loading from CDN'));
            }
        };
        script.onerror = () => reject(new Error('Failed to load PDF.js from CDN'));
        document.head.appendChild(script);
    });
    
    return pdfjsLoading;
};

interface ImportAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  allEmployees: Employee[];
}

const ImportAttendanceModal: React.FC<ImportAttendanceModalProps> = ({ isOpen, onClose, onSuccess, allEmployees }) => {
    const { addNotification } = useNotification();
    const { user } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            const isExcel = selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                           selectedFile.type === 'application/vnd.ms-excel' ||
                           selectedFile.name.endsWith('.xlsx') || 
                           selectedFile.name.endsWith('.xls');
            const isPDF = selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf');
            
            if (isExcel || isPDF) {
                setFile(selectedFile);
                setError(null);
            } else {
                setError("Invalid file type. Please upload an .xlsx, .xls, or .pdf file.");
                setFile(null);
            }
        }
    };

    // Helper functions to parse values
    const parseTimeValue = (value: string): number => {
        if (!value || value === '0' || value === '-') return 0;
        const str = String(value).trim();
        if (str.includes(':')) {
            const [hours, minutes] = str.split(':').map(Number);
            return hours + (minutes / 60);
        }
        return parseFloat(str) || 0;
    };

    const parseMinutesValue = (value: string): number => {
        if (!value || value === '0' || value === '-') return 0;
        const str = String(value).trim();
        if (str.includes(':')) {
            const [hours, minutes] = str.split(':').map(Number);
            return (hours * 60) + minutes;
        }
        return parseInt(str, 10) || 0;
    };

    const parseNumericValue = (value: string): number => {
        if (!value || value === '0' || value === '-') return 0;
        return parseFloat(String(value).trim()) || 0;
    };

    // Helper function to parse time string (HH:MM:SS) to minutes since midnight
    const timeToMinutes = (timeStr: string): number => {
        if (!timeStr || timeStr === '-' || timeStr === '') return 0;
        const parts = timeStr.split(':').map(Number);
        if (parts.length >= 2) {
            return parts[0] * 60 + parts[1];
        }
        return 0;
    };

    // Helper function to parse timetable string like "(09:30:00-17:00:00)" to start and end times
    const parseTimetable = (timetableStr: string): { start: number; end: number } => {
        const match = timetableStr.match(/\((\d{2}):(\d{2}):\d{2}-(\d{2}):(\d{2}):\d{2}\)/);
        if (match) {
            const startHour = parseInt(match[1], 10);
            const startMin = parseInt(match[2], 10);
            const endHour = parseInt(match[3], 10);
            const endMin = parseInt(match[4], 10);
            return {
                start: startHour * 60 + startMin,
                end: endHour * 60 + endMin
            };
        }
        return { start: 0, end: 0 };
    };

    // Helper function to calculate hours between two times
    const calculateHours = (checkIn: string, checkOut: string): number => {
        const checkInMin = timeToMinutes(checkIn);
        const checkOutMin = timeToMinutes(checkOut);
        if (checkInMin === 0 || checkOutMin === 0) return 0;
        return (checkOutMin - checkInMin) / 60;
    };

    // Parse PDF and extract attendance data from "Start/End Work Time Report"
    const parsePDFAttendance = async (file: File): Promise<Record<string, any[][]>> => {
        // Load pdfjs-dist dynamically
        const pdfjs = await loadPdfJs();
        if (!pdfjs) {
            throw new Error('Failed to load PDF.js library. Please ensure pdfjs-dist is installed or check your internet connection.');
        }
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        
        const allLines: string[] = [];
        
        // Extract text from all pages with better formatting
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Try to preserve table structure by using item positions
            let lastY = -1;
            let currentLine = '';
            const pageLines: string[] = [];
            
            textContent.items.forEach((item: any) => {
                const y = item.transform[5]; // Y position
                const str = item.str;
                
                // If Y position changed significantly, it's a new line
                if (lastY !== -1 && Math.abs(y - lastY) > 2) {
                    if (currentLine.trim()) {
                        pageLines.push(currentLine.trim());
                    }
                    currentLine = str;
                } else {
                    // Same line, add space if needed
                    if (currentLine && !currentLine.endsWith(' ') && str && !str.startsWith(' ')) {
                        currentLine += ' ';
                    }
                    currentLine += str;
                }
                lastY = y;
            });
            
            if (currentLine.trim()) {
                pageLines.push(currentLine.trim());
            }
            
            allLines.push(...pageLines);
        }
        
        // Debug: Log first 50 lines to help understand PDF structure
        console.log('PDF Parsing Debug - First 50 lines:');
        allLines.slice(0, 50).forEach((line, idx) => {
            console.log(`${idx + 1}: ${line}`);
        });

        // Create employee lookup map by name (this PDF format uses Name, not ID)
        const employeeMapByName = new Map<string, Employee>();
        allEmployees.forEach(emp => {
            if (emp.name) {
                // Store with multiple variations for better matching
                const nameUpper = emp.name.trim().toUpperCase();
                employeeMapByName.set(nameUpper, emp);
                
                // Also store without spaces for matching
                employeeMapByName.set(nameUpper.replace(/\s+/g, ''), emp);
                
                // Store name parts separately (handles titles like "Ma", "U", "Daw", etc.)
                const nameParts = emp.name.trim().split(/\s+/);
                if (nameParts.length > 1) {
                    // Store without title prefix (e.g., "Ma Theingi" -> match "Theingi")
                    if (nameParts.length > 2) {
                        const nameWithoutTitle = nameParts.slice(1).join(' ').toUpperCase();
                        employeeMapByName.set(nameWithoutTitle, emp);
                    }
                    // Store first significant name part (skip common titles)
                    const significantParts = nameParts.filter(p => 
                        !['MA', 'U', 'DAW', 'KO', 'MYA'].includes(p.toUpperCase())
                    );
                    if (significantParts.length > 0) {
                        employeeMapByName.set(significantParts[0].toUpperCase(), emp);
                        if (significantParts.length > 1) {
                            employeeMapByName.set(significantParts[significantParts.length - 1].toUpperCase(), emp);
                        }
                    }
                }
            }
        });

        // Parse the PDF text - format: Department | Name | Date | Shift | Timetable | Check In Time | Check Out Time
        const lines = allLines.map(line => line.trim()).filter(line => line.length > 0);
        
        // Find the header row for "Start/End Work Time Report"
        let headerIndex = -1;
        let deptColIndex = -1;
        let nameColIndex = -1;
        let dateColIndex = -1;
        let shiftColIndex = -1;
        let timetableColIndex = -1;
        let checkInColIndex = -1;
        let checkOutColIndex = -1;

        // Try to find header row - look for "Department", "Name", "Date", "Check In Time"
        for (let i = 0; i < Math.min(100, lines.length); i++) {
            const line = lines[i].toUpperCase();
            const hasDept = line.includes('DEPARTMENT');
            const hasName = line.includes('NAME');
            const hasDate = line.includes('DATE');
            const hasCheckIn = line.includes('CHECK IN') || line.includes('CHECK-IN');
            const hasCheckOut = line.includes('CHECK OUT') || line.includes('CHECK-OUT');
            
            if (hasName && (hasDate || hasCheckIn)) {
                headerIndex = i;
                // Split by multiple spaces (this format uses multiple spaces as delimiter)
                let headerParts: string[] = [];
                
                // Strategy 1: Split by multiple spaces (2+)
                if (lines[i].split(/\s{2,}/).length > 3) {
                    headerParts = lines[i].split(/\s{2,}/).map(h => h.trim().toUpperCase());
                }
                // Strategy 2: Split by tabs
                else if (lines[i].includes('\t')) {
                    headerParts = lines[i].split('\t').map(h => h.trim().toUpperCase());
                }
                // Strategy 3: Split by single space
                else {
                    headerParts = lines[i].split(/\s+/).map(h => h.trim().toUpperCase());
                }
                
                deptColIndex = headerParts.findIndex(h => h.includes('DEPARTMENT'));
                nameColIndex = headerParts.findIndex(h => h.includes('NAME') && !h.includes('TIME'));
                dateColIndex = headerParts.findIndex(h => h.includes('DATE'));
                shiftColIndex = headerParts.findIndex(h => h.includes('SHIFT'));
                timetableColIndex = headerParts.findIndex(h => h.includes('TIMETABLE') || h.includes('TIME') && h.includes('TABLE'));
                checkInColIndex = headerParts.findIndex(h => (h.includes('CHECK') && h.includes('IN')) || h.includes('CHECKIN'));
                checkOutColIndex = headerParts.findIndex(h => (h.includes('CHECK') && h.includes('OUT')) || h.includes('CHECKOUT'));
                
                // If we found Name and Date or Check In, we have a valid header
                if (nameColIndex !== -1 && (dateColIndex !== -1 || checkInColIndex !== -1)) {
                    break;
                }
            }
        }

        if (headerIndex === -1 || nameColIndex === -1) {
            throw new Error("Could not find header row in PDF. Expected columns: Department, Name, Date, Shift, Timetable, Check In Time, Check Out Time");
        }

        // Try to extract report period from PDF (look for date range like "2025-12-01 00:00:00 - 2025-12-27 23:59:59")
        let reportMonth = '';
        let reportYear = '';
        for (let i = 0; i < Math.min(20, lines.length); i++) {
            const dateMatch = lines[i].match(/(\d{4})-(\d{2})-\d{2}/);
            if (dateMatch) {
                reportYear = dateMatch[1];
                reportMonth = dateMatch[2];
                break;
            }
        }

        // Parse daily attendance records and aggregate by employee
        const employeeStats = new Map<string, {
            employee: Employee;
            normalHours: number;
            realHours: number;
            lateMinutes: number;
            earlyLeaveMinutes: number;
            absenceDays: number;
            overtimeHours: number;
            leaveDays: number;
            workedDays: Set<string>; // Track which dates employee worked
        }>();

        // Parse data rows after header
        for (let i = headerIndex + 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line || line.length < 5) continue;
            
            // Skip lines that look like headers, totals, or page numbers
            const upperLine = line.toUpperCase();
            if (upperLine.includes('PAGE') || upperLine.includes('TOTAL') || 
                upperLine.startsWith('---') || upperLine.startsWith('===') ||
                upperLine.includes('START/END WORK TIME REPORT') ||
                (upperLine.includes('DEPARTMENT') && upperLine.includes('NAME') && i < headerIndex + 5)) {
                continue;
            }

            // Split by multiple spaces (this format uses multiple spaces as delimiter)
            let parts: string[] = [];
            if (line.split(/\s{2,}/).length > 3) {
                parts = line.split(/\s{2,}/).map(p => p.trim()).filter(p => p.length > 0);
            } else if (line.includes('\t')) {
                parts = line.split('\t').map(p => p.trim()).filter(p => p.length > 0);
            } else {
                parts = line.split(/\s+/).map(p => p.trim()).filter(p => p.length > 0);
            }
            
            if (parts.length < 4) continue; // Need at least Department, Name, Date, and one time field

            // Extract data based on column indices (with fallbacks)
            const name = (nameColIndex >= 0 && nameColIndex < parts.length) ? parts[nameColIndex] : 
                        (parts.length > 1 ? parts[1] : '');
            const date = (dateColIndex >= 0 && dateColIndex < parts.length) ? parts[dateColIndex] : 
                        (parts.length > 2 ? parts[2] : '');
            const timetableStr = (timetableColIndex >= 0 && timetableColIndex < parts.length) ? parts[timetableColIndex] : 
                                (parts.find(p => p.includes('(') && p.includes(')')) || '');
            const checkIn = (checkInColIndex >= 0 && checkInColIndex < parts.length) ? parts[checkInColIndex] : 
                           (parts.find(p => /^\d{2}:\d{2}:\d{2}$/.test(p)) || '');
            const checkOut = (checkOutColIndex >= 0 && checkOutColIndex < parts.length) ? parts[checkOutColIndex] : 
                            (parts.filter(p => /^\d{2}:\d{2}:\d{2}$/.test(p))[1] || '');

            if (!name || !date) continue;

            // Match employee by name
            const nameUpper = name.trim().toUpperCase();
            let matchedEmployee: Employee | undefined = employeeMapByName.get(nameUpper);
            
            if (!matchedEmployee) {
                // Try without spaces
                matchedEmployee = employeeMapByName.get(nameUpper.replace(/\s+/g, ''));
            }
            
            if (!matchedEmployee && name.includes(' ')) {
                // Try matching with name parts (skip common titles)
                const nameParts = name.trim().split(/\s+/);
                const significantParts = nameParts.filter(p => 
                    !['MA', 'U', 'DAW', 'KO', 'MYA'].includes(p.toUpperCase())
                );
                
                // Try full name without title
                if (significantParts.length > 0) {
                    const nameWithoutTitle = significantParts.join(' ').toUpperCase();
                    matchedEmployee = employeeMapByName.get(nameWithoutTitle);
                }
                
                // Try individual significant parts
                if (!matchedEmployee) {
                    for (const namePart of significantParts) {
                        matchedEmployee = employeeMapByName.get(namePart.toUpperCase());
                        if (matchedEmployee) break;
                    }
                }
            }

            if (!matchedEmployee) {
                console.warn(`Could not match employee: ${name}`);
                continue;
            }

            // Parse timetable
            const timetable = parseTimetable(timetableStr);
            const normalHours = timetable.end > timetable.start ? (timetable.end - timetable.start) / 60 : 0;

            // Calculate actual hours worked
            const actualHours = calculateHours(checkIn, checkOut);

            // Calculate late minutes (if check-in is after timetable start)
            const checkInMin = timeToMinutes(checkIn);
            const lateMinutes = checkInMin > 0 && timetable.start > 0 && checkInMin > timetable.start 
                ? checkInMin - timetable.start 
                : 0;

            // Calculate early leave minutes (if check-out is before timetable end)
            const checkOutMin = timeToMinutes(checkOut);
            const earlyLeaveMinutes = checkOutMin > 0 && timetable.end > 0 && checkOutMin < timetable.end 
                ? timetable.end - checkOutMin 
                : 0;

            // Calculate overtime hours (if check-out is after timetable end)
            const overtimeHours = checkOutMin > 0 && timetable.end > 0 && checkOutMin > timetable.end 
                ? (checkOutMin - timetable.end) / 60 
                : 0;

            // Initialize or update employee stats
            if (!employeeStats.has(matchedEmployee.id)) {
                employeeStats.set(matchedEmployee.id, {
                    employee: matchedEmployee,
                    normalHours: 0,
                    realHours: 0,
                    lateMinutes: 0,
                    earlyLeaveMinutes: 0,
                    absenceDays: 0,
                    overtimeHours: 0,
                    leaveDays: 0,
                    workedDays: new Set()
                });
            }

            const stats = employeeStats.get(matchedEmployee.id)!;
            
            // Only add to stats if we have valid check-in and check-out times
            if (checkIn && checkOut && checkIn !== '-' && checkOut !== '-') {
                stats.normalHours += normalHours;
                stats.realHours += actualHours;
                stats.lateMinutes += lateMinutes;
                stats.earlyLeaveMinutes += earlyLeaveMinutes;
                stats.overtimeHours += overtimeHours;
                stats.workedDays.add(date);
            } else {
                // No check-in/check-out means absence (unless it's a leave day)
                // For now, we'll count it as absence
                stats.absenceDays += 1;
            }
        }

        // Convert aggregated stats to the format expected by the API
        const dataRows: any[][] = [];
        
        // Add date row for API to extract month (format: "Date: YYYY-MM-DD")
        if (reportYear && reportMonth) {
            dataRows.push([`Date: ${reportYear}-${reportMonth}-01`]);
        } else {
            // Fallback to current month if we couldn't extract from PDF
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            dataRows.push([`Date: ${year}-${month}-01`]);
        }
        
        const headerRow: any[] = ['ID', 'Name', 'Payable Hours', 'Actual Hours', 'Late', 'Early', 'Absence', 'Overtime', 'Leave'];
        dataRows.push(headerRow);

        employeeStats.forEach((stats) => {
            // Calculate absence days (this would need to know total working days in month)
            // For now, we'll set it to 0 and let the system calculate if needed
            const row: any[] = [
                stats.employee.employeeId,
                stats.employee.name,
                stats.normalHours.toFixed(2),
                stats.realHours.toFixed(2),
                stats.lateMinutes.toString(),
                stats.earlyLeaveMinutes.toString(),
                stats.absenceDays.toString(),
                stats.overtimeHours.toFixed(2),
                stats.leaveDays.toString(),
            ];
            dataRows.push(row);
        });

        if (dataRows.length <= 1) {
            throw new Error("No employee attendance records were found in the PDF. Please ensure employee names in the PDF match the names in the system.");
        }

        console.log(`Successfully parsed ${dataRows.length - 1} employee record(s) from PDF`);

        return {
            'Statistical Report of Attendance': dataRows
        };
    };

    const handleProcessFile = async () => {
        if (!file) {
            setError("Please select a file first.");
            return;
        }
        if (!user) {
            setError("Authentication error.");
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf');
            let parsedData: Record<string, any[][]>;

            if (isPDF) {
                // Parse PDF file
                parsedData = await parsePDFAttendance(file);
                
                // For PDF, we only have the Statistical Report, so we create empty sheets for the others
                // The API only requires the Statistical Report sheet
                const statisticalReport = parsedData['Statistical Report of Attendance'];
                if (!statisticalReport || statisticalReport.length < 2) {
                    throw new Error("Could not extract attendance data from PDF. Please ensure the PDF contains employee ID, Name, and attendance statistics in a table format.");
                }
                
                // Check if we matched any employees
                const matchedCount = statisticalReport.length - 1; // Subtract header row
                if (matchedCount === 0) {
                    throw new Error("No employees were matched from the PDF. Please ensure the Employee ID and Name in the PDF match the records in the system.");
                }
                
                addNotification(`Successfully extracted ${matchedCount} employee record(s) from PDF.`, "success");
            } else {
                // Parse Excel file
            const fileData = await file.arrayBuffer();
            const workbook = XLSX.read(fileData, { type: 'array' });
            
            const requiredSheets = [
                'Schedule Information Report', 
                'Statistical Report of Attendance', 
                'Att.log report', 
                'Exception Statistic Report'
            ];

            const missingSheets = requiredSheets.filter(sheet => !workbook.SheetNames.includes(sheet));
            if (missingSheets.length > 0) {
                throw new Error(`The uploaded Excel file is missing required sheets: ${missingSheets.join(', ')}.`);
            }

                parsedData = requiredSheets.reduce((acc, sheetName) => {
                const worksheet = workbook.Sheets[sheetName];
                // Use { header: 1, defval: null } to get arrays of arrays, preserving blank cells
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
                acc[sheetName] = jsonData;
                return acc;
            }, {} as Record<string, any[][]>);
            }

            await apiProcessAndSaveAttendance(parsedData, user.id, allEmployees);
            
            onSuccess();
        } catch (err) {
            const errorMessage = (err as Error).message;
            setError(`Processing failed: ${errorMessage}`);
            addNotification(`Import Error: ${errorMessage}`, "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const isPDFFile = file && (file.type === 'application/pdf' || file.name.endsWith('.pdf'));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import Attendance from File">
            <div className="space-y-4">
                <div>
                    <h3 className="text-sm font-medium text-text-secondary">Instructions:</h3>
                    <ul className="list-disc list-inside text-xs text-text-secondary space-y-1 bg-gray-50 dark:bg-slate-700/50 p-3 rounded-md">
                        {isPDFFile ? (
                            <>
                                <li>Upload a PDF file containing attendance data.</li>
                                <li>The PDF should contain a table with columns: ID, Name, Payable Hours, Actual Hours, Late, Early, Absence, Overtime, and Leave.</li>
                                <li>Ensure the 'ID' and 'Name' in the PDF match the 'Employee ID' (e.g., E_01) and 'Name' in the ERP system for accurate matching.</li>
                                <li>The system will automatically match employees by ID first, then by name if ID doesn't match.</li>
                            </>
                        ) : (
                            <>
                        <li>Upload the raw Excel (.xlsx) file exported from the fingerprint attendance machine.</li>
                        <li>The file must contain the following four sheets: "Schedule Information Report", "Statistical Report of Attendance", "Att.log report", and "Exception Statistic Report".</li>
                        <li>Ensure the 'ID' and 'Name' in the Excel file match the 'Employee ID' (e.g., E_01) and 'Name' in the ERP system for accurate matching.</li>
                            </>
                        )}
                    </ul>
                </div>
                
                <Input type="file" label="Select File (Excel or PDF)" onChange={handleFileChange} accept=".xlsx, .xls, .pdf" containerClassName="mb-0"/>
                {file && <p className="text-xs text-text-secondary">Selected file: {file.name}</p>}
                
                {error && <p className="text-sm text-status-danger text-center p-2 bg-red-50 dark:bg-red-900/30 rounded">{error}</p>}
                
                {isProcessing && (
                    <div className="flex flex-col items-center justify-center p-4">
                        <Spinner />
                        <p className="mt-2 text-sm text-text-secondary">Processing file, this may take a moment...</p>
                    </div>
                )}

                <div className="pt-4 flex justify-end space-x-3 border-t dark:border-slate-700">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isProcessing}>Cancel</Button>
                    <Button type="button" onClick={handleProcessFile} variant="primary" isLoading={isProcessing} disabled={!file || isProcessing}>Process & Save</Button>
                </div>
            </div>
        </Modal>
    );
};

export default ImportAttendanceModal;
