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
import { alert as showAlert } from '../../utils/dialogUtils';
import ExcelImportEmployeesModal from '../hr_module/ExcelImportEmployeesModal';

type EmployeeFormData = Omit<Employee, 'id' | 'username' | 'department'> & {
    departmentId?: string;
    paymentType?: Employee['paymentType'];
    tempPassword?: string;
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
    paymentType: undefined as EmployeeFormData['paymentType'],
    teams: [],
    employeeId: '',
  };
  const [formData, setFormData] = useState<EmployeeFormData>(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
        setFormData(initialFormState);
        setPassword('');
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
        if (name === 'hasLoginAccess' && !checked) {
            setPassword('');
            setFormData(prev => ({ ...prev, requiresPasswordChange: false }));
        }
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate employee ID is provided
    if (!formData.employeeId || !formData.employeeId.trim()) {
        await showAlert("Employee ID is required.", "Validation Error");
        return;
    }
    
    if (formData.hasLoginAccess) {
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
        await showAlert(`${missingFields.join(', ')} ${missingFields.length === 1 ? 'is' : 'are'} required for users with login access.`, "Validation Error");
        return;
      }
    }
    setIsLoading(true);
    await onAddEmployee({
        ...formData,
        tempPassword: formData.hasLoginAccess ? password : undefined,
    });
    setIsLoading(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Employee" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        <Input label="Employee ID*" name="employeeId" value={formData.employeeId || ''} onChange={handleChange} required />
        <Input label="Full Name*" name="name" value={formData.name || ''} onChange={handleChange} required />
        <Input label={formData.hasLoginAccess ? "Login Email*" : "Contact Email"} type="email" name="email" value={formData.email || ''} onChange={handleChange} required={formData.hasLoginAccess} />

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

        <Select label="Role*" name="role" value={formData.role || ''} onChange={handleChange}
          options={[
            { value: UserRole.OWNER, label: UserRole.OWNER },
            { value: UserRole.ADMIN, label: UserRole.ADMIN },
            { value: UserRole.DEMO_OWNER, label: UserRole.DEMO_OWNER },
            { value: UserRole.TEAM_LEADER, label: UserRole.TEAM_LEADER },
            { value: UserRole.STAFF, label: UserRole.STAFF },
          ]} required placeholder="-- Select Role --" />
        
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
        <Input label="Joining Date*" type="date" name="joiningDate" value={formData.joiningDate || ''} onChange={handleChange} required />
        <Select label="Employee Status*" name="employeeStatus" value={formData.employeeStatus || ''} onChange={handleChange}
          options={Object.values(EmployeeStatus).map(s => ({ value: s, label: s }))} required placeholder="-- Select Employee Status --" />
        <Input label="Basic Pay (MMK)*" type="number" name="basicPay" value={formData.basicPay === undefined ? '' : String(formData.basicPay)} onChange={handleChange} required />

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
  
  type EmployeeFormData = Omit<Employee, 'id' | 'username'> & {
    departmentId: string;
  };
  
  const [formData, setFormData] = useState<Partial<EmployeeFormData>>({
    name: '', email: '', role: UserRole.STAFF, jobTitle: '', joiningDate: '',
    requiresPasswordChange: true, hasLoginAccess: true, employeeStatus: EmployeeStatus.ON_PROBATION,
    basicPay: 0, paymentType: 'Monthly',
    teams: [],
    employeeId: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        ...employee,
        departmentId: departments.find(d => d.name === employee.department)?.id || '',
      });
    }
  }, [employee, departments]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
     if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
         if (name === 'hasLoginAccess' && !checked) {
            setFormData(prev => ({ ...prev, requiresPasswordChange: false }));
        }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    if (!formData.employeeId || !formData.employeeId.trim()) {
      await showAlert("Employee ID is required.", "Validation Error");
      return;
    }
    setIsLoading(true);
    await onUpdateEmployee({ ...formData, id: employee.id } as EmployeeFormData & { id: string });
    setIsLoading(false);
    onClose();
  };

  if (!employee) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Employee: ${employee.name}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        <Input
          label="Employee ID*"
          name="employeeId"
          value={formData.employeeId || ''}
          onChange={handleChange}
          disabled={!canEditEmployeeId}
          required
        />
        <Input label="Full Name*" name="name" value={formData.name || ''} onChange={handleChange} required />
        <Input label="Login Email*" type="email" name="email" value={formData.email || ''} onChange={handleChange} required />
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
        <Select label="Role*" name="role" value={formData.role || ''} onChange={handleChange}
          options={[
            { value: UserRole.OWNER, label: UserRole.OWNER },
            { value: UserRole.ADMIN, label: UserRole.ADMIN },
            { value: UserRole.DEMO_OWNER, label: UserRole.DEMO_OWNER },
            { value: UserRole.TEAM_LEADER, label: UserRole.TEAM_LEADER },
            { value: UserRole.STAFF, label: UserRole.STAFF },
          ]} required />
        
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
        
        <Select label="Department*" name="departmentId" value={formData.departmentId || ''} onChange={handleChange}
          options={departments.map(d => ({ value: d.id, label: d.name }))} required />
        <Input label="Job Title*" name="jobTitle" value={formData.jobTitle || ''} onChange={handleChange} required />
        <Input label="Joining Date" type="date" name="joiningDate" value={formData.joiningDate?.split('T')[0] || ''} onChange={handleChange} />
        <Select label="Employee Status*" name="employeeStatus" value={formData.employeeStatus || ''} onChange={handleChange}
          options={Object.values(EmployeeStatus).map(s => ({ value: s, label: s }))} required />
        <Input label="Basic Pay (MMK)*" type="number" name="basicPay" value={String(formData.basicPay ?? '')} onChange={handleChange} required />
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
      setEmployees(fetchedEmployees);
      setDepartments(fetchedDepartments);
    } catch (error) {
      console.error("Failed to fetch employees or departments:", error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchEmployeesAndDepartments();
  }, [fetchEmployeesAndDepartments]);
  
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
        const departmentMatch = !filterDepartment || emp.departmentId === filterDepartment;
        const statusMatch = !filterStatus || emp.employeeStatus === filterStatus;
        const term = searchTerm.toLowerCase();
        const searchMatch = !term ||
            (emp.name || '').toLowerCase().includes(term) ||
            (emp.employeeId && emp.employeeId.toLowerCase().includes(term)) ||
            (emp.email || '').toLowerCase().includes(term);

        return departmentMatch && statusMatch && searchMatch;
    });
  }, [employees, searchTerm, filterDepartment, filterStatus]);


  const handleAddEmployee = async (employeeDataFromModal: EmployeeFormData) => {
    const departmentName = departments.find(d => d.id === employeeDataFromModal.departmentId)?.name;

    if (!departmentName) {
      await showAlert(`Department with ID ${employeeDataFromModal.departmentId} not found. Cannot add employee.`, "Error");
      return;
    }
    
    const payloadForApi: Omit<Employee, 'id'|'username'> & { tempPassword?: string } = {
      employeeId: employeeDataFromModal.employeeId,
      name: employeeDataFromModal.name,
      email: employeeDataFromModal.email,
      role: employeeDataFromModal.role,
      department: departmentName,
      departmentId: employeeDataFromModal.departmentId,
      jobTitle: employeeDataFromModal.jobTitle,
      joiningDate: employeeDataFromModal.joiningDate,
      requiresPasswordChange: employeeDataFromModal.requiresPasswordChange,
      hasLoginAccess: employeeDataFromModal.hasLoginAccess,
      employeeStatus: employeeDataFromModal.employeeStatus,
      basicPay: Number(employeeDataFromModal.basicPay) || 0,
      paymentType: employeeDataFromModal.paymentType ?? 'Monthly',
      teams: employeeDataFromModal.teams,
    };
    
    await apiAddEmployee({
        ...payloadForApi,
        tempPassword: employeeDataFromModal.hasLoginAccess ? employeeDataFromModal.tempPassword : undefined,
    });

    addNotification("Employee added successfully!", "success");
    fetchEmployeesAndDepartments();
  };

  const handleUpdateEmployee = async (employeeDataFromModal: EmployeeFormData & { id: string }) => {
     const departmentName = departments.find(d => d.id === employeeDataFromModal.departmentId)?.name;

     if (!departmentName) {
        await showAlert(`Department with ID ${employeeDataFromModal.departmentId} not found.`, "Error");
        return;
     }
     
     const { departmentId, ...restFormData } = employeeDataFromModal;

     const payloadForApi: Partial<Employee> & { id: string } = {
        ...restFormData,
        id: employeeDataFromModal.id,
        department: departmentName,
        departmentId: employeeDataFromModal.departmentId,
     };
     
    await apiUpdateEmployee(payloadForApi);
    addNotification("Employee updated successfully!", "success");
    fetchEmployeesAndDepartments();
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
        <h1 className="text-2xl font-semibold text-text-primary">Staff Management</h1>
        <div className="flex items-center space-x-2">
            <Button onClick={() => setIsImportModalOpen(true)} variant="secondary" leftIcon={<UploadIcon />}>Import Excel</Button>
            <Button onClick={() => setIsAddModalOpen(true)} variant="primary">+ Add Employee</Button>
        </div>
      </div>

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