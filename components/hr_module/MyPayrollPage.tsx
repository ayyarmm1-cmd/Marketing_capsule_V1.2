
import React, { useState, useEffect, useCallback } from 'react';
import { Payslip, Employee } from '../../types';
import { apiGetPayslipsForEmployee, apiGetEmployeeById } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import ViewPayslipModal from './ViewPayslipModal'; // Ensure this path is correct
import { useNotification } from '../../hooks/useNotification'; // Import useNotification

const MyPayrollPage: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification(); // Use notification hook
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const fetchMyPayrollData = useCallback(async () => {
    if (!user) {
      addNotification("User not authenticated. Cannot fetch payroll.", "error", "Authentication Error");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const fetchedEmployee = await apiGetEmployeeById(user.id);
      setEmployee(fetchedEmployee);
      if (fetchedEmployee) {
        const fetchedPayslips = await apiGetPayslipsForEmployee(fetchedEmployee.id); 
        setPayslips(fetchedPayslips);
      } else {
        addNotification("Could not retrieve your employee details to fetch payroll.", "warning", "Data Error");
        setPayslips([]); 
      }
    } catch (error) {
      console.error("Failed to fetch payroll data:", error);
      addNotification(`Failed to load your payroll data: ${(error as Error).message}`, "error", "Loading Error");
      setPayslips([]);
    }
    setIsLoading(false);
  }, [user, addNotification]);

  useEffect(() => {
    fetchMyPayrollData();
  }, [fetchMyPayrollData]);

  const handleViewPayslip = (payslip: Payslip) => {
    setSelectedPayslip(payslip);
    setIsViewModalOpen(true);
  };
  
  const formatDate = (dateString?: string) => dateString ? new Date(dateString).toLocaleDateString('en-GB') : 'N/A';
  const formatMonth = (monthStr: string) => {
      const [year, month] = monthStr.split('-');
      return new Date(parseInt(year), parseInt(month) -1).toLocaleString('default', { month: 'long', year: 'numeric'});
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-semibold text-text-primary">My Payroll</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>
      ) : (
        employee && payslips.length > 0 ? (
          <>
            <div className="mb-6 p-4 bg-container-bg dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700">
              <p className="text-lg font-medium text-text-primary">Employee: {employee.name} ({employee.employeeId})</p>
            </div>
            <div className="bg-container-bg shadow-md rounded-lg overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Payslip ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Payroll Period</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Net Payable (MMK)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Pay Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-container-bg divide-y divide-gray-200">
                  {payslips.map(ps => (
                    <tr key={ps.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-text-primary">{ps.id}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{formatMonth(ps.month)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-text-primary text-right">{ps.netPayable.toLocaleString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ps.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {ps.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{ps.paymentDate ? formatDate(ps.paymentDate) : 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <Button variant="ghost" size="sm" onClick={() => handleViewPayslip(ps)}>View Details</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-center text-text-secondary py-8">
            {employee ? "No payslips found for your account." : "Could not retrieve your employee details or payroll information."}
          </p>
        )
      )}
      {selectedPayslip && employee && (
        <ViewPayslipModal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          payslip={selectedPayslip}
          employee={employee}
        />
      )}
    </div>
  );
};

export default MyPayrollPage;
