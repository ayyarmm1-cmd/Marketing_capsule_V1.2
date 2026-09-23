
import React from 'react';
import { Payslip, Employee } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

interface ViewPayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  payslip: Payslip | null;
  employee: Employee | null; 
}

const ViewPayslipModal: React.FC<ViewPayslipModalProps> = ({ isOpen, onClose, payslip, employee }) => {
  if (!isOpen || !payslip || !employee) return null;

  const formatDate = (dateString?: string) => dateString ? new Date(dateString).toLocaleDateString('en-GB') : 'N/A';
  const formatMonthYear = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const firstDay = `01-${date.toLocaleString('default', { month: 'short' })}-${year}`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    return `${firstDay} to ${lastDay}-${date.toLocaleString('default', { month: 'short' })}-${year}`;
  };
  
  const totalOtherAllowances = payslip.otherAllowances?.reduce((sum, item) => sum + item.amount, 0) || 0;
  const totalEarnings = payslip.basicSalary + payslip.commissions + (payslip.transportationAllowance || 0) + totalOtherAllowances;
  const totalDeductions = payslip.otherDeductions?.reduce((sum, item) => sum + item.amount, 0) || 0;
  // Net payable is already calculated on the payslip object by the API
  // const netPay = totalEarnings - totalDeductions; // This should match payslip.netPayable

  const handleDownload = () => {
    alert(`Mock Download PDF for Payslip ID: ${payslip.id}`);
    // In a real app, this would trigger PDF generation
  };

  const styles = {
    table: "min-w-full border-collapse border border-gray-400",
    th: "border border-gray-300 px-2 py-1 text-left text-sm font-semibold bg-gray-100",
    td: "border border-gray-300 px-2 py-1 text-sm",
    tdAmount: "border border-gray-300 px-2 py-1 text-sm text-right",
    sectionTitle: "bg-gray-200 font-bold p-2 text-sm text-center",
    bold: "font-bold",
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Payslip Details" size="lg">
      <div className="p-2 payslip-container font-sans text-gray-800">
        <h1 className="text-3xl font-bold text-center mb-6">PAYSLIP</h1>
        
        <div className="grid grid-cols-2 gap-x-8 mb-4 text-sm">
          <div>
            <p><span className={styles.bold}>ID:</span> {employee.employeeId}</p>
            <p><span className={styles.bold}>Name:</span> {employee.name}</p>
            <p><span className={styles.bold}>Designation:</span> {employee.jobTitle}</p>
            <p><span className={styles.bold}>Department:</span> {employee.department}</p>
            <p><span className={styles.bold}>Date of Joining:</span> {formatDate(employee.joiningDate)}</p>
          </div>
          <div className="text-right">
            <p><span className={styles.bold}>Period:</span> {formatMonthYear(payslip.month)}</p>
            <p><span className={styles.bold}>Pay Date:</span> {payslip.paymentDate ? formatDate(payslip.paymentDate) : 'N/A (Generated)'}</p>
            {payslip.status === 'Paid' && <p className="text-green-600 font-bold text-lg mt-2">PAID</p>}
          </div>
        </div>

        {/* Earnings Table */}
        <table className={`${styles.table} mb-6`}>
          <thead>
            <tr>
              <th className={`${styles.th} ${styles.sectionTitle}`} colSpan={3}>Earnings</th>
            </tr>
            <tr>
              <th className={styles.th}>Description</th>
              <th className={styles.th}>Amount (MMK)</th>
              <th className={styles.th}>Remark</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={styles.td}>Basic Pay</td>
              <td className={styles.tdAmount}>{payslip.basicSalary.toLocaleString()}</td>
              <td className={styles.td}></td>
            </tr>
            <tr>
              <td className={styles.td}>Sales Commission</td>
              <td className={styles.tdAmount}>{payslip.commissions.toLocaleString()}</td>
              <td className={styles.td}></td>
            </tr>
            {payslip.transportationAllowance && payslip.transportationAllowance > 0 ? (
                <tr>
                    <td className={styles.td}>Transportation Allowance</td>
                    <td className={styles.tdAmount}>{payslip.transportationAllowance.toLocaleString()}</td>
                    <td className={styles.td}></td>
                </tr>
            ) : null}
            {payslip.otherAllowances?.map((item, index) => (
              <tr key={`allowance-${index}`}>
                <td className={styles.td}>{item.description}</td>
                <td className={styles.tdAmount}>{item.amount.toLocaleString()}</td>
                <td className={styles.td}></td>
              </tr>
            ))}
             <tr>
              <td className={`${styles.td} ${styles.bold}`}>Total Earnings (MMK)</td>
              <td className={`${styles.tdAmount} ${styles.bold}`}>{totalEarnings.toLocaleString()}</td>
              <td className={styles.td}></td>
            </tr>
          </tbody>
        </table>

        {/* Deductions Table */}
        <table className={`${styles.table} mb-6`}>
          <thead>
            <tr>
              <th className={`${styles.th} ${styles.sectionTitle}`} colSpan={3}>Deductions</th>
            </tr>
             <tr>
              <th className={styles.th}>Description</th>
              <th className={styles.th}>Amount (MMK)</th>
              <th className={styles.th}>Remark</th>
            </tr>
          </thead>
          <tbody>
            {payslip.otherDeductions?.length ? payslip.otherDeductions.map((item, index) => (
              <tr key={`deduction-${index}`}>
                <td className={styles.td}>{item.description}</td>
                <td className={styles.tdAmount}>{item.amount.toLocaleString()}</td>
                <td className={styles.td}></td> {/* Remarks for deductions if needed */}
              </tr>
            )) : (
                <tr>
                    <td className={styles.td}>No Specific Deductions</td>
                    <td className={styles.tdAmount}>0</td>
                    <td className={styles.td}></td>
                </tr>
            )}
            <tr>
              <td className={`${styles.td} ${styles.bold}`}>Total Deductions (MMK)</td>
              <td className={`${styles.tdAmount} ${styles.bold}`}>{totalDeductions.toLocaleString()}</td>
              <td className={styles.td}></td>
            </tr>
          </tbody>
        </table>
        
        {/* Net Pay */}
        <table className={`${styles.table} mb-8`}>
            <tbody>
                <tr>
                    <td className={`${styles.td} ${styles.bold} text-lg w-2/3`}>NET PAY (MMK)</td>
                    <td className={`${styles.tdAmount} ${styles.bold} text-lg`}>{payslip.netPayable.toLocaleString()}</td>
                </tr>
            </tbody>
        </table>


        <div className="grid grid-cols-2 gap-8 pt-10 text-sm">
          <div>
            <p className="mb-12">Approved By:</p>
            <p className="border-t border-gray-400 pt-1">HR / Management</p>
          </div>
          <div className="text-right">
            <p className="mb-12">Employee Signature:</p>
            <p className="border-t border-gray-400 pt-1">{employee.name}</p>
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={handleDownload} variant="primary">Download PDF</Button>
      </div>
    </Modal>
  );
};

export default ViewPayslipModal;
