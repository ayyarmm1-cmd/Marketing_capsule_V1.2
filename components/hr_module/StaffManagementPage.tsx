import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Employee, UserRole, EmployeeStatus, Department, Permission } from '../../types';
import { apiGetEmployees, apiAddEmployee, apiUpdateEmployee, apiGetDepartments, apiDeleteEmployee } from '../../services/api';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Spinner from '../ui/Spinner';
import { STATUS_COLORS } from '../../constants';
import { useNotification } from '../../hooks/useNotification';
import { useAuth } from '../../hooks/useAuth';
import { useConfirmation } from '../../hooks/useConfirmation';
import ExcelImportEmployeesModal from '../hr_module/ExcelImportEmployeesModal';

type EmployeeFormData = Omit<Employee, 'id' | 'username' | 'department'> & {
    departmentId?: string;
    paymentType?: Employee['paymentType'];
    tempPassword?: string;
    facePhotoFile?: File | null;
    nrcFrontPhotoFile?: File | null;
    nrcBackPhotoFile?: File | null;
};

const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>;

const AddEmployeeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAddEmployee: (employeeData: EmployeeFormData) => Promise<void>;
  departments: Department[];
}> = ({ isOpen, onClose, onAddEmployee, departments }) => {
  const initialFormState: EmployeeFormData = {
    name: '',
    email: '',
    role: undefined as unknown as UserRole,
    departmentId: '',
    jobTitle: '',
    joiningDate: '',
    requiresPasswordChange: true,
    hasLoginAccess: true,
    employeeStatus: undefined as unknown as EmployeeStatus,
    basicPay: undefined as unknown as number,
    paymentType: undefined,
    gender: undefined,
    maritalStatus: undefined,
    nationality: '',
    address: '',
    nrcNumber: '',
    dateOfBirth: '',
    personalPhone: '',
    annualLeaveEntitlement: undefined,
    casualLeaveEntitlement: undefined,
    emergencyContactName: '',
    emergencyContactPhone: '',
    bankAccountNumber: '',
    bankName: '',
    facePhotoFile: null,
    nrcFrontPhotoFile: null,
    nrcBackPhotoFile: null,
    facePhotoUrl: '',
    nrcFrontPhotoUrl: '',
    nrcBackPhotoUrl: '',
    teams: [],
    employeeId: '',
  };
  const [formData, setFormData] = useState<EmployeeFormData>(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  
  const [facePhotoPreview, setFacePhotoPreview] = useState<string | null>(null);
  const [nrcFrontPhotoPreview, setNrcFrontPhotoPreview] = useState<string | null>(null);
  const [nrcBackPhotoPreview, setNrcBackPhotoPreview] = useState<string | null>(null);
  const { addNotification } = useNotification(); // Use the hook here

  useEffect(() => {
    if (isOpen) {
        setFormData(initialFormState);
        setPassword('');
        setFacePhotoPreview(null);
        setNrcFrontPhotoPreview(null);
        setNrcBackPhotoPreview(null);
    }
  }, [isOpen]);

  useEffect(() => {
    // Cleanup object URLs on unmount
    return () => {
        if (facePhotoPreview) URL.revokeObjectURL(facePhotoPreview);
        if (nrcFrontPhotoPreview) URL.revokeObjectURL(nrcFrontPhotoPreview);
        if (nrcBackPhotoPreview) URL.revokeObjectURL(nrcBackPhotoPreview);
    };
  }, [facePhotoPreview, nrcFrontPhotoPreview, nrcBackPhotoPreview]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
        if (name === 'hasLoginAccess' && !checked) {
            setPassword('');
            setFormData(prev => ({ ...prev, requiresPasswordChange: false, email: '' }));
        }
    } else if (type === 'file') {
        const files = (e.target as HTMLInputElement).files;
        const file = files && files[0] ? files[0] : null;

        if (file && file.size > 5 * 1024 * 1024) { // 5MB limit
            addNotification("File is too large. Please select an image smaller than 5MB.", "error");
            (e.target as HTMLInputElement).value = ''; // Clear the file input
            return;
        }

        setFormData(prev => ({ ...prev, [name]: file }));

        if (name === 'facePhotoFile') {
            if (facePhotoPreview) URL.revokeObjectURL(facePhotoPreview);
            setFacePhotoPreview(file ? URL.createObjectURL(file) : null);
        } else if (name === 'nrcFrontPhotoFile') {
            if (nrcFrontPhotoPreview) URL.revokeObjectURL(nrcFrontPhotoPreview);
            setNrcFrontPhotoPreview(file ? URL.createObjectURL(file) : null);
        } else if (name === 'nrcBackPhotoFile') {
            if (nrcBackPhotoPreview) URL.revokeObjectURL(nrcBackPhotoPreview);
            setNrcBackPhotoPreview(file ? URL.createObjectURL(file) : null);
        }

    } else if (type === 'number') {
        setFormData(prev => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
    }
     else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate employee ID is provided
    if (!formData.employeeId || !formData.employeeId.trim()) {
        addNotification("Employee ID is required.", "warning");
        return;
    }
    
    if (formData.hasLoginAccess) {
        // Check for required fields with proper trimming
        const missingFields: string[] = [];
        const nameValid = typeof formData.name === 'string' && formData.name.trim().length > 0;
        const emailValid = typeof formData.email === 'string' && formData.email.trim().length > 0;
        const departmentValid = typeof formData.departmentId === 'string'
            ? formData.departmentId.trim().length > 0
            : !!formData.departmentId;
        const jobTitleValid = typeof formData.jobTitle === 'string' && formData.jobTitle.trim().length > 0;
        const passwordValid = typeof password === 'string' && password.trim().length > 0;
        const roleValid = !!formData.role;
        const statusValid = !!formData.employeeStatus;
        const joiningDateValid = typeof formData.joiningDate === 'string' && formData.joiningDate.trim().length > 0;
        
        if (!nameValid) missingFields.push('Name');
        if (!emailValid) missingFields.push('Email');
        if (!departmentValid) missingFields.push('Department');
        if (!jobTitleValid) missingFields.push('Job Title');
        if (!roleValid) missingFields.push('Role');
        if (!statusValid) missingFields.push('Employee Status');
        if (!joiningDateValid) missingFields.push('Joining Date');
        if (!passwordValid) missingFields.push('Initial Password');
        
        if (missingFields.length > 0) {
            addNotification(`${missingFields.join(', ')} ${missingFields.length === 1 ? 'is' : 'are'} required for users with login access.`, "warning");
            return;
        }
        // Check Basic Pay - allow 0 as valid value
        const basicPayValue = typeof formData.basicPay === 'string'
            ? (formData.basicPay.trim() === '' ? null : Number(formData.basicPay))
            : formData.basicPay;
        if (basicPayValue === undefined || basicPayValue === null || isNaN(basicPayValue)) {
            addNotification("Basic Pay is required for users with login access.", "warning");
            return;
        }
    } else {
        if (!formData.name.trim()) {
            addNotification("Full Name is required.", "warning");
            return;
        }
        if (!formData.email) {
            formData.email = `no-login-${formData.name.replace(/\s+/g, '.').toLowerCase()}@marketingcapsule.com`;
        }
    }
    
    setIsLoading(true);
    try {
        await onAddEmployee({
            ...formData,
            paymentType: formData.paymentType ?? 'Monthly',
            tempPassword: formData.hasLoginAccess ? password : undefined,
            basicPay: Number(formData.basicPay) || 0,
        });
        onClose(); // Close modal only on success
    } catch (error) {
        // Error is handled and notified by parent function (onAddEmployee)
        // Modal remains open for user to correct data
        console.error("Error during employee addition:", error);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Employee" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        <Input label="Employee ID*" name="employeeId" value={formData.employeeId || ''} onChange={handleChange} required />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Full Name*" name="name" value={formData.name || ''} onChange={handleChange} required />
            <Input
                label={formData.hasLoginAccess ? "Login Email*" : "Contact Email (Optional)"}
                type="email" name="email" value={formData.email || ''} onChange={handleChange} required={formData.hasLoginAccess}
            />
        </div>

        <div className="flex items-center mt-4 mb-2">
            <input type="checkbox" name="hasLoginAccess" id="add_hasLoginAccess"
            checked={formData.hasLoginAccess} onChange={handleChange}
            className="h-4 w-4 text-primary-action border-gray-300 rounded focus:ring-primary-action" />
            <label htmlFor="add_hasLoginAccess" className="ml-2 block text-sm font-medium text-text-primary">
                Grant Login Access to ERP
            </label>
        </div>

        {formData.hasLoginAccess && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Initial Password*" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={formData.hasLoginAccess} />
                <div className="flex items-center pt-6">
                <input type="checkbox" name="requiresPasswordChange" id="add_requiresPasswordChange"
                    checked={formData.requiresPasswordChange} onChange={handleChange}
                    className="h-4 w-4 text-primary-action border-gray-300 rounded focus:ring-primary-action" />
                <label htmlFor="add_requiresPasswordChange" className="ml-2 block text-sm text-text-primary">
                    Require password change on first login
                </label>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
            label={formData.hasLoginAccess ? "Role*" : "Role"}
            name="role"
            value={formData.role || ''}
            onChange={handleChange}
            options={[
                { value: UserRole.OWNER, label: UserRole.OWNER },
                { value: UserRole.ADMIN, label: UserRole.ADMIN },
                { value: UserRole.DEMO_OWNER, label: UserRole.DEMO_OWNER },
                { value: UserRole.TEAM_LEADER, label: UserRole.TEAM_LEADER },
                { value: UserRole.STAFF, label: UserRole.STAFF },
            ]}
            required={formData.hasLoginAccess}
            placeholder="-- Select Role --"
            />
            <Select
            label={formData.hasLoginAccess ? "Employee Status*" : "Employee Status"}
            name="employeeStatus"
            value={formData.employeeStatus || ''}
            onChange={handleChange}
            options={Object.values(EmployeeStatus).map(s => ({ value: s, label: s }))}
            required={formData.hasLoginAccess}
            placeholder="-- Select Employee Status --"
            />
        </div>
        
        {formData.role === UserRole.TEAM_LEADER && (
            <Input
                label="Teams (comma-separated)"
                name="teams"
                value={Array.isArray(formData.teams) ? formData.teams.join(', ') : ''}
                onChange={e => {
                    const teamsArray = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                    setFormData(prev => ({...prev, teams: teamsArray}));
                }}
                placeholder="e.g., Alpha Team, Bravo Team"
            />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
                label={formData.hasLoginAccess ? "Department*" : "Department"}
                name="departmentId"
                value={formData.departmentId || ''}
                onChange={handleChange}
                options={departments.map(d => ({ value: d.id, label: d.name }))}
                required={formData.hasLoginAccess}
                placeholder={departments.length === 0 ? "No departments available" : "-- Select Department --"}
                disabled={departments.length === 0}
            />
            <Input label={formData.hasLoginAccess ? "Job Title*" : "Job Title"} name="jobTitle" value={formData.jobTitle || ''} onChange={handleChange} required={formData.hasLoginAccess} />
        </div>
        
        <Input label="Joining Date*" type="date" name="joiningDate" value={formData.joiningDate || ''} onChange={handleChange} required />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
                label={formData.hasLoginAccess ? "Basic Pay (MMK)*" : "Basic Pay (MMK)"}
                type="number"
                name="basicPay"
                value={formData.basicPay === undefined ? '' : String(formData.basicPay)}
                onChange={handleChange}
                required={formData.hasLoginAccess}
                min="0"
            />
        </div>

        <h3 className="text-lg font-semibold text-text-secondary pt-2 border-b">Personal Information (Optional)</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Date of Birth" type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} />
            <Input label="Personal Phone" name="personalPhone" value={formData.personalPhone} onChange={handleChange} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Gender" name="gender" value={formData.gender || ''} onChange={handleChange}
                options={[{value: '', label: '-- Select --'},{value: 'Male', label: 'Male'}, {value: 'Female', label: 'Female'}, {value: 'Other', label: 'Other'}, {value: 'Prefer not to say', label: 'Prefer not to say'}]} />
            <Select label="Marital Status" name="maritalStatus" value={formData.maritalStatus || ''} onChange={handleChange}
                options={[{value: '', label: '-- Select --'},{value: 'Single', label: 'Single'}, {value: 'Married', label: 'Married'}, {value: 'Divorced', label: 'Widowed'}, {value: 'Other', label: 'Other'}]} />
        </div>
        <Input label="Nationality" name="nationality" value={formData.nationality} onChange={handleChange} />
        <Input label="Address" name="address" value={formData.address} onChange={handleChange} />
        <Input label="NRC Number (Myanmar)" name="nrcNumber" value={formData.nrcNumber} onChange={handleChange} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div>
                <Input label="NRC Front Photo" type="file" name="nrcFrontPhotoFile" onChange={handleChange} accept="image/*" />
                {nrcFrontPhotoPreview && <img src={nrcFrontPhotoPreview} alt="NRC Front Preview" className="mt-2 rounded-md border h-24 object-contain"/>}
            </div>
            <div>
                <Input label="NRC Back Photo" type="file" name="nrcBackPhotoFile" onChange={handleChange} accept="image/*" />
                 {nrcBackPhotoPreview && <img src={nrcBackPhotoPreview} alt="NRC Back Preview" className="mt-2 rounded-md border h-24 object-contain"/>}
            </div>
            <div>
                <Input label="Face Photo" type="file" name="facePhotoFile" onChange={handleChange} accept="image/*" />
                {facePhotoPreview && <img src={facePhotoPreview} alt="Face Photo Preview" className="mt-2 rounded-md border h-24 object-contain"/>}
            </div>
        </div>

        <h3 className="text-lg font-semibold text-text-secondary pt-2 border-b">Contact & Financial (Optional)</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Emergency Contact Name" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} />
            <Input label="Emergency Contact Phone" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Bank Account Number" name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} />
            <Input label="Bank Name" name="bankName" value={formData.bankName} onChange={handleChange} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
                label="Annual Leave Entitlement (days)"
                type="number"
                name="annualLeaveEntitlement"
                value={formData.annualLeaveEntitlement === undefined ? '' : String(formData.annualLeaveEntitlement)}
                onChange={handleChange}
                min="0"
            />
            <Input
                label="Casual Leave Entitlement (days)"
                type="number"
                name="casualLeaveEntitlement"
                value={formData.casualLeaveEntitlement === undefined ? '' : String(formData.casualLeaveEntitlement)}
                onChange={handleChange}
                min="0"
            />
        </div>

        <div className="flex justify-end space-x-2 pt-2 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>Add Employee</Button>
        </div>
      </form>
    </Modal>
  );
};


const EditEmployeeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onUpdateEmployee: (employeeData: EmployeeFormData & { id: string }) => Promise<void>;
  departments: Department[];
}> = ({ isOpen, onClose, employee, onUpdateEmployee, departments }) => {
  const { hasPermission } = useAuth();
  const canEditEmployeeId = hasPermission(Permission.EDIT_STAFF);
  const initialEditModalState: EmployeeFormData = {
    name: '', email: '', role: UserRole.STAFF, departmentId: '', jobTitle: '', joiningDate: '',
    requiresPasswordChange: true, hasLoginAccess: true, employeeStatus: EmployeeStatus.ON_PROBATION,
    basicPay: 0, paymentType: 'Monthly', annualLeaveEntitlement: 10, casualLeaveEntitlement: 6,
    teams: [], dateOfBirth: undefined, personalPhone: undefined, gender: undefined,
    maritalStatus: undefined, nationality: 'Myanmar', address: undefined, nrcNumber: undefined,
    facePhotoUrl: undefined, nrcFrontPhotoUrl: undefined, nrcBackPhotoUrl: undefined,
    emergencyContactName: undefined, emergencyContactPhone: undefined, bankAccountNumber: undefined,
    bankName: undefined, tempPassword: '', facePhotoFile: null, nrcFrontPhotoFile: null,
    nrcBackPhotoFile: null, employeeId: '',
  };
  const [formData, setFormData] = useState<EmployeeFormData>(initialEditModalState);
  const [isLoading, setIsLoading] = useState(false);
  
  const [facePhotoPreview, setFacePhotoPreview] = useState<string | null>(null);
  const [nrcFrontPhotoPreview, setNrcFrontPhotoPreview] = useState<string | null>(null);
  const [nrcBackPhotoPreview, setNrcBackPhotoPreview] = useState<string | null>(null);


  const { addNotification } = useNotification();

  useEffect(() => {
    if (employee) {
      const { id, username, department, ...employeeDataForForm } = employee;
      setFormData({
        ...employeeDataForForm,
        departmentId: employee.departmentId || (departments.find(d => d.name === department)?.id || ''),
        tempPassword: '', facePhotoFile: null, nrcFrontPhotoFile: null, nrcBackPhotoFile: null,
      });
      setFacePhotoPreview(employee.facePhotoUrl || null);
      setNrcFrontPhotoPreview(employee.nrcFrontPhotoUrl || null);
      setNrcBackPhotoPreview(employee.nrcBackPhotoUrl || null);
    } else {
        setFormData(initialEditModalState);
    }
  }, [employee, departments]);

  useEffect(() => {
    return () => {
        if (facePhotoPreview && facePhotoPreview.startsWith('blob:')) URL.revokeObjectURL(facePhotoPreview);
        if (nrcFrontPhotoPreview && nrcFrontPhotoPreview.startsWith('blob:')) URL.revokeObjectURL(nrcFrontPhotoPreview);
        if (nrcBackPhotoPreview && nrcBackPhotoPreview.startsWith('blob:')) URL.revokeObjectURL(nrcBackPhotoPreview);
    };
  }, [facePhotoPreview, nrcFrontPhotoPreview, nrcBackPhotoPreview]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
     if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
         if (name === 'hasLoginAccess' && !checked) {
            setFormData(prev => ({ ...prev, requiresPasswordChange: false }));
        }
    } else if (type === 'file') {
        const files = (e.target as HTMLInputElement).files;
        const file = files && files[0] ? files[0] : null;
        setFormData(prev => ({ ...prev, [name]: file }));

         if (name === 'facePhotoFile') {
            if (facePhotoPreview && facePhotoPreview.startsWith('blob:')) URL.revokeObjectURL(facePhotoPreview);
            setFacePhotoPreview(file ? URL.createObjectURL(file) : employee?.facePhotoUrl || null);
        } else if (name === 'nrcFrontPhotoFile') {
            if (nrcFrontPhotoPreview && nrcFrontPhotoPreview.startsWith('blob:')) URL.revokeObjectURL(nrcFrontPhotoPreview);
            setNrcFrontPhotoPreview(file ? URL.createObjectURL(file) : employee?.nrcFrontPhotoUrl || null);
        } else if (name === 'nrcBackPhotoFile') {
            if (nrcBackPhotoPreview && nrcBackPhotoPreview.startsWith('blob:')) URL.revokeObjectURL(nrcBackPhotoPreview);
            setNrcBackPhotoPreview(file ? URL.createObjectURL(file) : employee?.nrcBackPhotoUrl || null);
        }

    } else if (type === 'number') {
        setFormData(prev => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    if (!formData.name || !formData.departmentId || !formData.jobTitle || !formData.email || formData.basicPay === undefined || formData.basicPay === null) {
        addNotification("Name, Email, Department, Job Title and Basic Pay are required.", "warning");
        return;
    }

    if (!formData.employeeId || !formData.employeeId.trim()) {
        addNotification("Employee ID is required.", "warning");
        return;
    }
    
    setIsLoading(true);
    try {
        const submissionData = { ...formData, id: employee.id } as EmployeeFormData & { id: string };
        await onUpdateEmployee(submissionData);
        onClose(); // Close on success
    } catch (error) {
        // Error handled by parent, modal stays open
        console.error("Error during employee update:", error);
    } finally {
        setIsLoading(false);
    }
  };

  if (!employee) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Employee: ${employee.name}`} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        <Input
          label="Employee ID*"
          name="employeeId"
          value={formData.employeeId || ''}
          onChange={handleChange}
          disabled={!canEditEmployeeId}
          required
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Full Name*" name="name" value={formData.name || ''} onChange={handleChange} required />
            <Input label={formData.hasLoginAccess ? "Login Email*" : "Contact Email*"} type="email" name="email" value={formData.email || ''} onChange={handleChange} required />
        </div>

        <div className="flex items-center mt-4 mb-2">
            <input type="checkbox" name="hasLoginAccess" id="edit_hasLoginAccess"
            checked={!!formData.hasLoginAccess} onChange={handleChange}
            className="h-4 w-4 text-primary-action border-gray-300 rounded focus:ring-primary-action" />
            <label htmlFor="edit_hasLoginAccess" className="ml-2 block text-sm font-medium text-text-primary">
                Grant Login Access to ERP
            </label>
        </div>

        {formData.hasLoginAccess && (
             <div className="flex items-center">
                <input type="checkbox" name="requiresPasswordChange" id="edit_requiresPasswordChange"
                    checked={!!formData.requiresPasswordChange} onChange={handleChange}
                    className="h-4 w-4 text-primary-action border-gray-300 rounded focus:ring-primary-action" />
                <label htmlFor="edit_requiresPasswordChange" className="ml-2 block text-sm text-text-primary">
                    Require password change on next login
                </label>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Role*" name="role" value={formData.role || ''} onChange={handleChange}
            options={[
                { value: UserRole.OWNER, label: UserRole.OWNER },
                { value: UserRole.ADMIN, label: UserRole.ADMIN },
                { value: UserRole.DEMO_OWNER, label: UserRole.DEMO_OWNER },
                { value: UserRole.TEAM_LEADER, label: UserRole.TEAM_LEADER },
                { value: UserRole.STAFF, label: UserRole.STAFF },
            ]} required />
            <Select label="Employee Status*" name="employeeStatus" value={formData.employeeStatus || ''} onChange={handleChange}
            options={Object.values(EmployeeStatus).map(s => ({ value: s, label: s }))} required />
        </div>

        {formData.role === UserRole.TEAM_LEADER && (
            <Input
                label="Teams (comma-separated)"
                name="teams"
                value={Array.isArray(formData.teams) ? formData.teams.join(', ') : ''}
                onChange={e => {
                    const teamsArray = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                    setFormData(prev => ({...prev, teams: teamsArray}));
                }}
                placeholder="e.g., Alpha Team, Bravo Team"
            />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Select
                label="Department*"
                name="departmentId"
                value={formData.departmentId || ''}
                onChange={handleChange}
                options={departments.map(d => ({ value: d.id, label: d.name }))}
                required
                placeholder={departments.length === 0 ? "No departments available" : "-- Select Department --"}
                disabled={departments.length === 0}
            />
            <Input label="Job Title*" name="jobTitle" value={formData.jobTitle || ''} onChange={handleChange} required />
        </div>
         <Input label="Joining Date" type="date" name="joiningDate" value={formData.joiningDate?.split('T')[0] || ''} onChange={handleChange} />


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Basic Pay (MMK)*" type="number" name="basicPay" value={String(formData.basicPay ?? '')} onChange={handleChange} required min="0" />
            <Select label="Payment Type" name="paymentType" value={formData.paymentType || 'Monthly'} onChange={handleChange}
            options={[{value: 'Monthly', label: 'Monthly'}, {value: 'Weekly', label: 'Weekly'}, {value: 'Daily', label: 'Daily'}]} />
        </div>

        <h3 className="text-lg font-semibold text-text-secondary pt-2 border-b">Personal Information</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Date of Birth" type="date" name="dateOfBirth" value={formData.dateOfBirth?.split('T')[0] || ''} onChange={handleChange} />
            <Input label="Personal Phone" name="personalPhone" value={formData.personalPhone || ''} onChange={handleChange} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Gender" name="gender" value={formData.gender || ''} onChange={handleChange}
                options={[{value: '', label: '-- Select --'},{value: 'Male', label: 'Male'}, {value: 'Female', label: 'Female'}, {value: 'Other', label: 'Other'}, {value: 'Prefer not to say', label: 'Prefer not to say'}]} />
            <Select label="Marital Status" name="maritalStatus" value={formData.maritalStatus || ''} onChange={handleChange}
                options={[{value: '', label: '-- Select --'},{value: 'Single', label: 'Single'}, {value: 'Married', label: 'Married'}, {value: 'Divorced', label: 'Widowed'}, {value: 'Other', label: 'Other'}]} />
        </div>
        <Input label="Nationality" name="nationality" value={formData.nationality || ''} onChange={handleChange} />
        <Input label="Address" name="address" value={formData.address || ''} onChange={handleChange} />
        <Input label="NRC Number (Myanmar)" name="nrcNumber" value={formData.nrcNumber || ''} onChange={handleChange} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div>
                <Input label="NRC Front Photo" type="file" name="nrcFrontPhotoFile" onChange={handleChange} accept="image/*" />
                {nrcFrontPhotoPreview && <img src={nrcFrontPhotoPreview} alt="NRC Front Preview" className="mt-2 rounded-md border h-24 object-contain"/>}
            </div>
             <div>
                <Input label="NRC Back Photo" type="file" name="nrcBackPhotoFile" onChange={handleChange} accept="image/*" />
                {nrcBackPhotoPreview && <img src={nrcBackPhotoPreview} alt="NRC Back Preview" className="mt-2 rounded-md border h-24 object-contain"/>}
            </div>
            <div>
                <Input label="Face Photo" type="file" name="facePhotoFile" onChange={handleChange} accept="image/*" />
                {facePhotoPreview && <img src={facePhotoPreview} alt="Face Photo Preview" className="mt-2 rounded-md border h-24 object-contain"/>}
            </div>
        </div>


        <h3 className="text-lg font-semibold text-text-secondary pt-2 border-b">Contact & Financial</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Emergency Contact Name" name="emergencyContactName" value={formData.emergencyContactName || ''} onChange={handleChange} />
            <Input label="Emergency Contact Phone" name="emergencyContactPhone" value={formData.emergencyContactPhone || ''} onChange={handleChange} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Bank Account Number" name="bankAccountNumber" value={formData.bankAccountNumber || ''} onChange={handleChange} />
            <Input label="Bank Name" name="bankName" value={formData.bankName || ''} onChange={handleChange} />
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Annual Leave Entitlement (days)" type="number" name="annualLeaveEntitlement" value={String(formData.annualLeaveEntitlement ?? '')} onChange={handleChange} min="0" />
            <Input label="Casual Leave Entitlement (days)" type="number" name="casualLeaveEntitlement" value={String(formData.casualLeaveEntitlement ?? '')} onChange={handleChange} min="0" />
        </div>

        <div className="flex justify-end space-x-2 pt-2 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>Save Changes</Button>
        </div>
      </form>
    </Modal>
  );
};


const StaffManagementPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const { user: loggedInUser } = useAuth();
  const { showConfirmation } = useConfirmation();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState<EmployeeStatus | ''>('');


  const fetchEmployeesAndDepartments = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedEmployees, fetchedDepartments] = await Promise.all([
          apiGetEmployees(),
          apiGetDepartments()
      ]);
      
      const sortedEmployees = fetchedEmployees.sort((a, b) => {
        const numA = a.employeeId ? parseInt(a.employeeId.split('_')[1], 10) || 0 : 0;
        const numB = b.employeeId ? parseInt(b.employeeId.split('_')[1], 10) || 0 : 0;
        return numB - numA;
      });
      
      setEmployees(sortedEmployees);
      setDepartments(fetchedDepartments);
    } catch (error) {
      console.error("Failed to fetch employees or departments:", error);
      addNotification("Failed to load staff data.", "error");
    }
    setIsLoading(false);
  }, [addNotification]);

  useEffect(() => {
    fetchEmployeesAndDepartments();
  }, [fetchEmployeesAndDepartments]);
  
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
        const departmentMatch = !filterDepartment || emp.departmentId === filterDepartment;
        const statusMatch = !filterStatus || emp.employeeStatus === filterStatus;
        const term = searchTerm.toLowerCase();
        const searchMatch = !searchTerm ||
            (emp.name || '').toLowerCase().includes(term) ||
            (emp.employeeId && emp.employeeId.toLowerCase().includes(term)) ||
            (emp.email || '').toLowerCase().includes(term);

        return departmentMatch && statusMatch && searchMatch;
    });
  }, [employees, searchTerm, filterDepartment, filterStatus]);


  const handleAddEmployee = async (employeeDataFromModal: EmployeeFormData) => {
    const departmentName = departments.find(d => d.id === employeeDataFromModal.departmentId)?.name;

    if (!departmentName && employeeDataFromModal.departmentId) {
      const errorMsg = `Department with ID ${employeeDataFromModal.departmentId} not found. Cannot add employee.`;
      addNotification(errorMsg, "error");
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    const payloadForApi: Omit<Employee, 'id' | 'username'> & {
      tempPassword?: string;
      facePhotoFile?: File | null;
      nrcFrontPhotoFile?: File | null;
      nrcBackPhotoFile?: File | null;
    } = {
      employeeId: employeeDataFromModal.employeeId,
      name: employeeDataFromModal.name, email: employeeDataFromModal.email, role: employeeDataFromModal.role,
      department: departmentName || 'Default Department', departmentId: employeeDataFromModal.departmentId,
      jobTitle: employeeDataFromModal.jobTitle, joiningDate: employeeDataFromModal.joiningDate,
      requiresPasswordChange: employeeDataFromModal.requiresPasswordChange, hasLoginAccess: employeeDataFromModal.hasLoginAccess,
      employeeStatus: employeeDataFromModal.employeeStatus, basicPay: Number(employeeDataFromModal.basicPay) || 0,
      paymentType: employeeDataFromModal.paymentType ?? 'Monthly',
      annualLeaveEntitlement: Number(employeeDataFromModal.annualLeaveEntitlement) || 0,
      casualLeaveEntitlement: Number(employeeDataFromModal.casualLeaveEntitlement) || 0,
      teams: employeeDataFromModal.teams, dateOfBirth: employeeDataFromModal.dateOfBirth, personalPhone: employeeDataFromModal.personalPhone,
      gender: employeeDataFromModal.gender, maritalStatus: employeeDataFromModal.maritalStatus, nationality: employeeDataFromModal.nationality,
      address: employeeDataFromModal.address, nrcNumber: employeeDataFromModal.nrcNumber, facePhotoUrl: employeeDataFromModal.facePhotoUrl,
      nrcFrontPhotoUrl: employeeDataFromModal.nrcFrontPhotoUrl, nrcBackPhotoUrl: employeeDataFromModal.nrcBackPhotoUrl,
      emergencyContactName: employeeDataFromModal.emergencyContactName, emergencyContactPhone: employeeDataFromModal.emergencyContactPhone,
      bankAccountNumber: employeeDataFromModal.bankAccountNumber, bankName: employeeDataFromModal.bankName,
      tempPassword: employeeDataFromModal.tempPassword, facePhotoFile: employeeDataFromModal.facePhotoFile,
      nrcFrontPhotoFile: employeeDataFromModal.nrcFrontPhotoFile, nrcBackPhotoFile: employeeDataFromModal.nrcBackPhotoFile,
    };
    
    try {
        await apiAddEmployee(payloadForApi);
        addNotification("Employee added successfully!", "success");
        fetchEmployeesAndDepartments();
    } catch (error) {
        console.error("Failed to add employee:", error);
        addNotification(`Failed to add employee: ${(error as Error).message}`, "error");
        throw error; // Re-throw to be caught by the modal's handleSubmit
    }
  };

  const handleUpdateEmployee = async (employeeDataFromModal: EmployeeFormData & { id: string }) => {
     const departmentName = departments.find(d => d.id === employeeDataFromModal.departmentId)?.name;

     if (employeeDataFromModal.departmentId && !departmentName) {
        const errorMsg = `Department with ID ${employeeDataFromModal.departmentId} not found. Cannot update employee.`;
        addNotification(errorMsg, "error");
        throw new Error(errorMsg);
     }
     
     const { departmentId, tempPassword, facePhotoFile, nrcFrontPhotoFile, nrcBackPhotoFile, ...restFormData } = employeeDataFromModal;

     const payloadForApi: Partial<Employee> & { id: string; facePhotoFile?: File | null; nrcFrontPhotoFile?: File | null; nrcBackPhotoFile?: File | null; } = {
        ...restFormData, id: employeeDataFromModal.id, department: departmentName || (employeeDataFromModal.departmentId ? 'Error: Dept Name Not Found' : 'Unassigned Department'),
        departmentId: employeeDataFromModal.departmentId || undefined, basicPay: Number(restFormData.basicPay) || 0,
        annualLeaveEntitlement: Number(restFormData.annualLeaveEntitlement) || 0,
        casualLeaveEntitlement: Number(restFormData.casualLeaveEntitlement) || 0, facePhotoFile: facePhotoFile || null,
        nrcFrontPhotoFile: nrcFrontPhotoFile || null, nrcBackPhotoFile: nrcBackPhotoFile || null,
     };
     
    try {
        await apiUpdateEmployee(payloadForApi);
        addNotification("Employee updated successfully!", "success");
        fetchEmployeesAndDepartments();
    } catch(error) {
        console.error("Failed to update employee:", error);
        addNotification(`Failed to update employee: ${(error as Error).message}`, "error");
        throw error;
    }
  };
  
  const handleDeleteEmployee = async (employee: Employee) => {
    if (!loggedInUser) return;
    const confirmed = await showConfirmation({
      title: 'Delete Employee',
      message: `Are you sure you want to PERMANENTLY DELETE employee "${employee.name}"? This will remove their record from the ERP but their login will remain active until manually deleted from the authentication system. This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    });
    if (confirmed) {
        try {
            await apiDeleteEmployee(employee.id, loggedInUser.id);
            addNotification("Employee record deleted successfully from the ERP.", "success");
            if (employee.hasLoginAccess) {
                 addNotification(
                    `IMPORTANT: To fully revoke access, you must now manually delete '${employee.email}' from the Firebase Authentication console.`,
                    "warning",
                    "Manual Action Required",
                    15000 // A long duration for this important message
                );
            }
            fetchEmployeesAndDepartments();
        } catch (error) {
            addNotification(`Failed to delete employee record: ${(error as Error).message}`, "error");
        }
    }
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsEditModalOpen(true);
  };
  
  const handleImportComplete = () => {
    addNotification("Employee import process finished.", "info", "Import Complete");
    fetchEmployeesAndDepartments();
    setIsImportModalOpen(false);
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GB');
  const getDepartmentName = (departmentId?: string) => departments.find(d => d.id === departmentId)?.name || 'N/A';

  const getStatusColorClass = (status: EmployeeStatus) => {
    if (status === EmployeeStatus.ACTIVE) {
      return STATUS_COLORS[EmployeeStatus.ACTIVE] || 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300';
    }
    return STATUS_COLORS[status] || 'bg-gray-200 text-gray-700 dark:bg-slate-600 dark:text-slate-200';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">Staff Management</h1>
        <div className="flex items-center space-x-2">
            <Button onClick={() => setIsImportModalOpen(true)} variant="secondary" leftIcon={<UploadIcon />}>Import Excel</Button>
            <Button onClick={() => setIsAddModalOpen(true)} variant="primary" disabled={departments.length === 0 && !isLoading}>+ Add Employee</Button>
        </div>
      </div>
      {isLoading && departments.length === 0 && <p className="text-xs text-status-warning mb-2 text-right">Loading departments...</p>}
      {!isLoading && departments.length === 0 && <p className="text-xs text-status-warning mb-2 text-right">No departments configured. Please add departments in Settings first.</p>}

      <div className="mb-6 p-4 bg-container-bg dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <Input
                label="Search Staff"
                placeholder="Name, ID, Email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                containerClassName="mb-0"
            />
            <Select
                label="Filter by Department"
                value={filterDepartment}
                onChange={e => setFilterDepartment(e.target.value)}
                options={[{ value: '', label: 'All Departments' }, ...departments.map(d => ({ value: d.id, label: d.name }))]}
                containerClassName="mb-0"
            />
            <Select
                label="Filter by Status"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as EmployeeStatus | '')}
                options={[{ value: '', label: 'All Statuses' }, ...Object.values(EmployeeStatus).map(s => ({ value: s, label: s }))]}
                containerClassName="mb-0"
            />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>
      ) : (
        filteredEmployees.length > 0 ? (
        <div className="bg-container-bg dark:bg-slate-800 shadow-md rounded-lg overflow-x-auto border border-slate-200 dark:border-slate-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Emp. ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Basic Pay (MMK)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Login Access</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Joining Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-slate-200">{emp.employeeId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary dark:text-slate-200">
                    <Link to={`/hr/staff/${emp.id}`} className="text-primary-action hover:underline dark:text-blue-400">{emp.name}</Link>
                  </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">{getDepartmentName(emp.departmentId) || emp.department}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">{emp.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                     <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColorClass(emp.employeeStatus)}`}>
                        {emp.employeeStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-slate-200 text-right">{emp.basicPay.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${emp.hasLoginAccess ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'}`}>
                        {emp.hasLoginAccess ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-slate-400">{formatDate(emp.joiningDate)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(emp)}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteEmployee(emp)} disabled={emp.id === loggedInUser?.id}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        ) : <p className="text-center text-text-secondary py-8">{searchTerm || filterDepartment || filterStatus ? "No employees match your filters." : "No employees found. Add new employees to get started."}</p>
      )}

      <AddEmployeeModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAddEmployee={handleAddEmployee} departments={departments} />
      {editingEmployee && (
        <EditEmployeeModal
            isOpen={isEditModalOpen}
            onClose={() => {setIsEditModalOpen(false); setEditingEmployee(null);}}
            employee={editingEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            departments={departments}
        />
      )}
      {isImportModalOpen && (
        <ExcelImportEmployeesModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            onImportComplete={handleImportComplete}
        />
      )}
    </div>
  );
};

export default StaffManagementPage;