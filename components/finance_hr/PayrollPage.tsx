import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Payslip, Employee, AllowanceItem, DeductionItem } from '../../types';
import { 
    apiGetEmployees, 
    apiGeneratePayslipsForMonth, 
    apiGetPayslipsForMonth, 
    apiUpdatePayslip,
    apiMarkPayslipAsPaid
} from '../../services/api';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import Input from '../ui/Input';
import ViewPayslipModal from '../hr_module/ViewPayslipModal'; // For PDF preview
import { useNotification } from '../../hooks/useNotification';
import { useConfirmation } from '../../hooks/useConfirmation';
import { alert as showAlert } from '../../utils/dialogUtils';

interface GeneratePayslipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (month: string, strategy: 'duplicate' | 'fresh') => Promise<void>;
  currentMonth: string;
}

const KPICard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <div className="bg-container-bg dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
        <p className="text-sm text-text-secondary dark:text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-primary-action dark:text-blue-400">{value}</p>
    </div>
);

const GeneratePayslipsModal: React.FC<GeneratePayslipsModalProps> = ({ isOpen, onClose, onGenerate, currentMonth }) => {
  const [strategy, setStrategy] = useState<'duplicate' | 'fresh'>('duplicate');
  const [monthToGenerate, setMonthToGenerate] = useState(currentMonth);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    await onGenerate(monthToGenerate, strategy);
    setIsLoading(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Bulk Generate Payslips`}>
      <div className="space-y-4">
        <Input type="month" label="Select Month to Generate For" value={monthToGenerate} onChange={(e) => setMonthToGenerate(e.target.value)} />
        <Select label="Generation Strategy" value={strategy} onChange={(e) => setStrategy(e.target.value as 'duplicate' | 'fresh')}
          options={[
            { value: 'duplicate', label: 'Duplicate from Last Month (if available)' },
            { value: 'fresh', label: 'Start Fresh (calculate commissions)' }
          ]}
        />
        <div className="flex justify-end space-x-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isLoading}>Generate</Button>
        </div>
      </div>
    </Modal>
  );
};

interface EditPayslipFormData {
  basicSalary: number;
  commissions: number;
  transportationAllowance: number;
  otherAllowances: AllowanceItem[];
  otherDeductions: DeductionItem[];
}

interface EditPayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  payslip: Payslip | null;
  onSave: (payslipId: string, data: EditPayslipFormData) => Promise<void>;
}

const EditPayslipModal: React.FC<EditPayslipModalProps> = ({ isOpen, onClose, payslip, onSave }) => {
  const [formData, setFormData] = useState<EditPayslipFormData>({
    basicSalary: 0, commissions: 0, transportationAllowance: 0, otherAllowances: [], otherDeductions: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentNetPayable, setCurrentNetPayable] = useState(0);

  useEffect(() => {
    if (payslip) {
      setFormData({
        basicSalary: payslip.basicSalary,
        commissions: payslip.commissions,
        transportationAllowance: payslip.transportationAllowance || 0,
        otherAllowances: payslip.otherAllowances ? [...payslip.otherAllowances.map(oa => ({...oa}))] : [],
        otherDeductions: payslip.otherDeductions ? [...payslip.otherDeductions.map(od => ({...od}))] : [],
      });
    }
  }, [payslip]);

  useEffect(() => {
    const totalOtherAllowances = formData.otherAllowances.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalOtherDeductions = formData.otherDeductions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalAllowances = Number(formData.transportationAllowance || 0) + totalOtherAllowances;
    const totalDeductions = totalOtherDeductions;
    
    setCurrentNetPayable(
        Number(formData.basicSalary || 0) + 
        Number(formData.commissions || 0) + 
        totalAllowances - 
        totalDeductions
    );
  }, [formData]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value === '' ? 0 : parseFloat(value) }));
  };

  const handleDetailedItemChange = (
    type: 'otherAllowances' | 'otherDeductions', 
    index: number, 
    field: 'description' | 'amount', 
    value: string | number
  ) => {
    setFormData(prev => {
      const items = [...prev[type]];
      items[index] = { ...items[index], [field]: field === 'amount' ? (value === '' ? 0 : parseFloat(value as string)) : value };
      return { ...prev, [type]: items };
    });
  };

  const addDetailedItem = (type: 'otherAllowances' | 'otherDeductions') => {
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], { description: '', amount: 0 }]
    }));
  };

  const removeDetailedItem = (type: 'otherAllowances' | 'otherDeductions', index: number) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payslip) return;
    setIsLoading(true);
    await onSave(payslip.id, formData);
    setIsLoading(false);
    onClose();
  };

  if (!payslip) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Payslip: ${payslip.id} (${payslip.month})`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto p-1">
        <Input label="Basic Salary (MMK)" type="number" name="basicSalary" value={String(formData.basicSalary)} onChange={handleInputChange} />
        <Input label="Commissions (MMK)" type="number" name="commissions" value={String(formData.commissions)} onChange={handleInputChange} />
        <Input label="Transportation Allowance (MMK)" type="number" name="transportationAllowance" value={String(formData.transportationAllowance)} onChange={handleInputChange} />

        {/* Other Allowances */}
        <div className="space-y-2 p-3 border rounded-md">
          <h3 className="text-md font-semibold text-text-secondary">Other Allowances</h3>
          {formData.otherAllowances.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input containerClassName="mb-0 flex-grow" placeholder="Description" value={item.description} onChange={(e) => handleDetailedItemChange('otherAllowances', index, 'description', e.target.value)} />
              <Input containerClassName="mb-0 w-32" type="number" placeholder="Amount" value={String(item.amount)} onChange={(e) => handleDetailedItemChange('otherAllowances', index, 'amount', e.target.value)} />
              <Button type="button" variant="danger" size="sm" onClick={() => removeDetailedItem('otherAllowances', index)} className="!p-2 mt-1">X</Button>
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => addDetailedItem('otherAllowances')}>+ Add Allowance</Button>
        </div>

        {/* Other Deductions */}
        <div className="space-y-2 p-3 border rounded-md">
          <h3 className="text-md font-semibold text-text-secondary">Other Deductions</h3>
          {formData.otherDeductions.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input containerClassName="mb-0 flex-grow" placeholder="Description" value={item.description} onChange={(e) => handleDetailedItemChange('otherDeductions', index, 'description', e.target.value)} />
              <Input containerClassName="mb-0 w-32" type="number" placeholder="Amount" value={String(item.amount)} onChange={(e) => handleDetailedItemChange('otherDeductions', index, 'amount', e.target.value)} />
              <Button type="button" variant="danger" size="sm" onClick={() => removeDetailedItem('otherDeductions', index)} className="!p-2 mt-1">X</Button>
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => addDetailedItem('otherDeductions')}>+ Add Deduction</Button>
        </div>
        
        <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-700/50 rounded border border-slate-200 dark:border-slate-700">
          <p className="text-lg font-semibold text-text-primary">Net Payable: {currentNetPayable.toLocaleString()} MMK</p>
        </div>
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>Save Changes</Button>
        </div>
      </form>
    </Modal>
  );
};


const PayrollPage: React.FC = () => {
  const { addNotification } = useNotification();
  const { showConfirmation } = useConfirmation();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPayslip, setEditingPayslip] = useState<Payslip | null>(null);
  const [viewingPayslip, setViewingPayslip] = useState<Payslip | null>(null);
  const [isViewPayslipModalOpen, setIsViewPayslipModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPayrollData = useCallback(async (month: string) => {
    setIsLoading(true);
    try {
      const [fetchedPayslips, fetchedEmployees] = await Promise.all([
        apiGetPayslipsForMonth(month),
        apiGetEmployees()
      ]);
      setPayslips(fetchedPayslips);
      setEmployees(fetchedEmployees);
    } catch (error) {
      console.error("Failed to fetch payroll data:", error);
      addNotification("Failed to fetch payroll data.", 'error');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchPayrollData(selectedMonth);
  }, [selectedMonth, fetchPayrollData]);
  
  const handleGeneratePayslips = async (month: string, strategy: 'duplicate' | 'fresh') => {
    setIsLoading(true);
    try {
      await apiGeneratePayslipsForMonth(month, strategy, employees);
      await fetchPayrollData(month); // Refresh list after generation
      addNotification(`Payslips for ${month} generated successfully using ${strategy} strategy.`, 'success');
    } catch (error) {
        console.error("Error generating payslips:", error);
        addNotification(`Error generating payslips: ${(error as Error).message}`, 'error');
    }
    setIsLoading(false);
  };

  const getEmployeeName = useCallback((employeeId: string) => {
    return employees.find(emp => emp.id === employeeId)?.name || employeeId;
  }, [employees]);
  
  const handleDownloadPDF = (payslip: Payslip) => {
      setViewingPayslip(payslip);
      setIsViewPayslipModalOpen(true);
  };

  const handleOpenEditModal = (payslip: Payslip) => {
    setEditingPayslip(payslip);
    setIsEditModalOpen(true);
  };

  const handleSaveEditedPayslip = async (payslipId: string, data: EditPayslipFormData) => {
    setIsLoading(true);
    try {
        await apiUpdatePayslip(payslipId, data);
        await fetchPayrollData(selectedMonth);
        addNotification("Payslip updated successfully.", 'success');
    } catch (error) {
        console.error("Error updating payslip:", error);
        addNotification(`Error updating payslip: ${(error as Error).message}`, 'error');
    }
    setIsLoading(false);
  };

  const handleMarkAsPaid = async (payslipId: string) => {
    const confirmed = await showConfirmation({
      title: 'Mark Payslip as Paid',
      message: "Are you sure you want to mark this payslip as Paid?",
      confirmText: 'Mark as Paid',
      cancelText: 'Cancel',
      confirmVariant: 'success',
    });
    if (!confirmed) return;
    setIsLoading(true);
    try {
        await apiMarkPayslipAsPaid(payslipId);
        await fetchPayrollData(selectedMonth);
        addNotification("Payslip marked as Paid.", 'success');
    } catch (error) {
        console.error("Error marking payslip as paid:", error);
        addNotification(`Error marking payslip as paid: ${(error as Error).message}`, 'error');
    }
    setIsLoading(false);
  };

    const formatMonthForDisplay = (monthStr: string) => {
        const [year, month] = monthStr.split('-');
        const date = new Date(Number(year), Number(month) - 1, 1);
        return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    };

    const filteredPayslips = useMemo(() => {
        if (!searchTerm) {
        return payslips;
        }
        const lowercasedTerm = searchTerm.toLowerCase();
        return payslips.filter(ps => {
        const employeeName = getEmployeeName(ps.employeeId).toLowerCase();
        const payslipId = ps.id.toLowerCase();
        return employeeName.includes(lowercasedTerm) || payslipId.includes(lowercasedTerm);
        });
    }, [payslips, searchTerm, getEmployeeName]);

    const payrollSummary = useMemo(() => {
        if (!filteredPayslips || filteredPayslips.length === 0) {
            return {
                totalNetPayable: 0,
                totalAllowances: 0,
                totalDeductions: 0,
                employeeCount: 0,
            };
        }

        return filteredPayslips.reduce((acc, payslip) => {
            acc.totalNetPayable += Number(payslip.netPayable) || 0;
            acc.totalAllowances += Number(payslip.allowances) || 0;
            acc.totalDeductions += Number(payslip.deductions) || 0;
            return acc;
        }, {
            totalNetPayable: 0,
            totalAllowances: 0,
            totalDeductions: 0,
            employeeCount: filteredPayslips.length,
        });
    }, [filteredPayslips]);

    const [year, monthNum] = selectedMonth.split('-').map(Number);


  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Payroll</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-end space-x-2">
              <Select
                label="Year"
                value={year}
                onChange={(e) => {
                    const newYear = e.target.value;
                    setSelectedMonth(`${newYear}-${String(monthNum).padStart(2, '0')}`);
                }}
                options={Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).reverse().map(y => ({ value: y, label: y.toString() }))}
                containerClassName="mb-0"
              />
               <Select
                label="Month"
                value={monthNum}
                onChange={(e) => {
                    const newMonth = e.target.value;
                    setSelectedMonth(`${year}-${String(newMonth).padStart(2, '0')}`);
                }}
                options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }))}
                containerClassName="mb-0"
              />
          </div>
          <Button onClick={() => setIsGenerateModalOpen(true)} variant="primary">
            Bulk Generate Payslips
          </Button>
        </div>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard title="Total Net Payable" value={`${payrollSummary.totalNetPayable.toLocaleString()} MMK`} />
          <KPICard title="Employees in Payroll" value={payrollSummary.employeeCount} />
          <KPICard title="Total Allowances" value={`${payrollSummary.totalAllowances.toLocaleString()} MMK`} />
          <KPICard title="Total Deductions" value={`${payrollSummary.totalDeductions.toLocaleString()} MMK`} />
      </div>

       <div className="mb-6 p-4 bg-container-bg dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                  label="Search by Employee Name or Payslip ID"
                  placeholder="e.g., John Doe or PS010725..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  containerClassName="mb-0"
              />
          </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>
      ) : (
        filteredPayslips.length > 0 ? (
        <div className="bg-container-bg dark:bg-slate-800 shadow-md rounded-lg overflow-x-auto border border-slate-200 dark:border-slate-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Payslip ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Month</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Basic (MMK)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Commissions</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Allowances</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Deductions</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Net Payable</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {filteredPayslips.map(ps => (
                <tr key={ps.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-text-primary dark:text-slate-200">{ps.id}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-text-primary dark:text-slate-200">{getEmployeeName(ps.employeeId)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">{ps.month}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400 text-right">{ps.basicSalary.toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400 text-right">{ps.commissions.toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400 text-right">{(ps.allowances || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400 text-right">{(ps.deductions || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-text-primary dark:text-slate-200 text-right">{ps.netPayable.toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                     <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ps.status === 'Paid' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'}`}>
                        {ps.status}
                      </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(ps)}>PDF</Button>
                    {ps.status === 'Generated' && (
                        <>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(ps)}>Edit</Button>
                            <Button variant="success" size="sm" onClick={() => handleMarkAsPaid(ps.id)}>Mark Paid</Button>
                        </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        ) : <p className="text-center text-text-secondary dark:text-slate-400 py-8">{searchTerm ? 'No payslips match your search.' : `No payslips found for ${formatMonthForDisplay(selectedMonth)}. Generate payslips to get started.`}</p>
      )}
      
      <GeneratePayslipsModal 
        isOpen={isGenerateModalOpen} 
        onClose={() => setIsGenerateModalOpen(false)} 
        onGenerate={handleGeneratePayslips}
        currentMonth={selectedMonth}
      />
      <EditPayslipModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingPayslip(null); }}
        payslip={editingPayslip}
        onSave={handleSaveEditedPayslip}
      />
       {viewingPayslip && (
        <ViewPayslipModal
          isOpen={isViewPayslipModalOpen}
          onClose={() => setIsViewPayslipModalOpen(false)}
          payslip={viewingPayslip}
          employee={employees.find(emp => emp.id === viewingPayslip.employeeId) || null}
        />
      )}
    </div>
  );
};

export default PayrollPage;
